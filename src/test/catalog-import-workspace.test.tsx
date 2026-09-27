import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ csrfToken: "t" }),
}));

import { CatalogImportWorkspace } from "@/components/catalog-import/catalog-import-workspace";

const vendorMapping = [
  {
    target_field: "name",
    label: "Название",
    required: true,
    source_column: "Вендор",
  },
  {
    target_field: "external_code",
    label: "Внешний код",
    required: false,
    source_column: null,
  },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function stubApi(upload: () => Response) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/catalog/import-mappings/by-type/"))
      return json(vendorMapping);
    if (url === "/api/catalog/imports/headers/")
      return json({ headers: ["Вендор", "Код"] });
    if (url === "/api/catalog/imports/" && init?.method === "POST")
      return upload();
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderWorkspace() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CatalogImportWorkspace />
    </QueryClientProvider>,
  );
}

async function chooseType(value: string) {
  fireEvent.change(screen.getByLabelText("Справочник"), {
    target: { value },
  });
  await screen.findByRole("button", { name: "Изменить маппинг" });
}

async function chooseFile() {
  fireEvent.change(screen.getByLabelText("Файл xlsx/xls"), {
    target: { files: [new File(["x"], "vendors.xlsx")] },
  });
  await screen.findByText("Найдено колонок: 2");
}

afterEach(() => vi.unstubAllGlobals());

describe("CatalogImportWorkspace", () => {
  it("uploads the file and shows counts and warnings", async () => {
    stubApi(() =>
      json({
        catalog_type: "vendor",
        created: 2,
        updated: 1,
        warnings: [{ row: 4, message: "проверьте" }],
      }),
    );
    renderWorkspace();
    await chooseType("vendor");
    await chooseFile();

    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));

    expect(
      await screen.findByText("Создано: 2, обновлено: 1"),
    ).toBeInTheDocument();
    expect(screen.getByText("проверьте")).toBeInTheDocument();
  });

  it("shows row errors and the total when there are more than returned", async () => {
    stubApi(() =>
      json(
        {
          code: "import_failed",
          detail: "Импорт отменён, ошибок: 150",
          errors: Array.from({ length: 100 }, (_, index) => ({
            row: index + 2,
            message: `ошибка ${index}`,
          })),
          errors_total: 150,
        },
        400,
      ),
    );
    renderWorkspace();
    await chooseType("vendor");
    await chooseFile();

    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));

    expect(
      await screen.findByText("Показаны 100 из 150 ошибок."),
    ).toBeInTheDocument();
    expect(screen.getByText("ошибка 99")).toBeInTheDocument();
  });

  it("shows the backend reason when the file cannot be read", async () => {
    const fetchMock = stubApi(() => json({}));
    fetchMock.mockImplementationOnce(async () =>
      json(
        {
          code: "import_error",
          detail: "Не удалось распознать файл vendors.xlsx как таблицу Excel",
        },
        400,
      ),
    );
    renderWorkspace();

    fireEvent.change(screen.getByLabelText("Файл xlsx/xls"), {
      target: { files: [new File(["x"], "vendors.xlsx")] },
    });

    expect(
      await screen.findByText(/Не удалось распознать файл vendors.xlsx/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Загрузить" })).toBeDisabled();
  });

  it("blocks upload while the mapping has unsaved changes", async () => {
    stubApi(() => json({}));
    renderWorkspace();
    await chooseType("vendor");
    await chooseFile();

    fireEvent.click(screen.getByRole("button", { name: "Изменить маппинг" }));
    fireEvent.change(screen.getByLabelText(/Внешний код/), {
      target: { value: "Код" },
    });

    expect(screen.getByRole("button", { name: "Загрузить" })).toBeDisabled();
    expect(
      screen.getByText("Сохраните маппинг перед загрузкой."),
    ).toBeInTheDocument();
  });

  it("keeps file headers and resets the result when the catalog type changes", async () => {
    stubApi(() =>
      json({ catalog_type: "vendor", created: 1, updated: 0, warnings: [] }),
    );
    renderWorkspace();
    await chooseType("vendor");
    await chooseFile();
    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));
    await screen.findByText("Создано: 1, обновлено: 0");

    fireEvent.change(screen.getByLabelText("Справочник"), {
      target: { value: "product" },
    });

    await waitFor(() =>
      expect(
        screen.queryByText("Создано: 1, обновлено: 0"),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("Найдено колонок: 2")).toBeInTheDocument();
  });

  it("asks to choose the file again when the browser cannot send it", async () => {
    stubApi(() => {
      throw new TypeError("Failed to fetch");
    });
    renderWorkspace();
    await chooseType("vendor");
    await chooseFile();

    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));

    expect(
      await screen.findByText(
        "Файл изменился или недоступен — выберите его заново.",
      ),
    ).toBeInTheDocument();
  });

  it("clears the file input on click so the same file can be chosen again", () => {
    stubApi(() => json({}));
    renderWorkspace();
    const input = screen.getByLabelText("Файл xlsx/xls") as HTMLInputElement;
    const setValue = vi.spyOn(input, "value", "set");

    fireEvent.click(input);

    expect(setValue).toHaveBeenCalledWith("");
  });

  it("shows a complete saved mapping collapsed and expands it only for editing", async () => {
    stubApi(() => json({}));
    renderWorkspace();
    await chooseType("vendor");

    expect(screen.queryByLabelText(/Внешний код/)).toBeNull();
    expect(screen.getByText("Вендор")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Изменить маппинг" }));
    expect(screen.getByLabelText(/Внешний код/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(screen.queryByLabelText(/Внешний код/)).toBeNull();
    expect(screen.getByRole("button", { name: "Загрузить" })).toBeDisabled();
  });

  it("collapses the mapping after it is saved", async () => {
    const fetchMock = stubApi(() => json({}));
    renderWorkspace();
    await chooseType("vendor");
    await chooseFile();
    fireEvent.click(screen.getByRole("button", { name: "Изменить маппинг" }));
    fireEvent.change(screen.getByLabelText(/Внешний код/), {
      target: { value: "Код" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Сохранить маппинг" }));

    expect(
      await screen.findByRole("button", { name: "Изменить маппинг" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Внешний код/)).toBeNull();
    expect(screen.getByRole("button", { name: "Загрузить" })).toBeEnabled();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === "/api/catalog/import-mappings/by-type/vendor/" &&
          init?.method === "PUT",
      ),
    ).toBe(true);
  });

  it("opens the editor right away when required fields are not mapped", async () => {
    const fetchMock = stubApi(() => json({}));
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/catalog/import-mappings/by-type/"))
        return json(
          vendorMapping.map((field) => ({ ...field, source_column: null })),
        );
      return json({ headers: [] });
    });
    renderWorkspace();

    fireEvent.change(screen.getByLabelText("Справочник"), {
      target: { value: "vendor" },
    });

    expect(await screen.findByLabelText(/Название/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Отмена" })).toBeNull();
  });

  it("marks collapsed mapping columns that are missing in the chosen file", async () => {
    const fetchMock = stubApi(() => json({}));
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/catalog/import-mappings/by-type/"))
        return json(vendorMapping);
      return json({ headers: ["Компания"] });
    });
    renderWorkspace();
    await chooseType("vendor");

    fireEvent.change(screen.getByLabelText("Файл xlsx/xls"), {
      target: { files: [new File(["x"], "vendors.xlsx")] },
    });

    expect(await screen.findByText("нет в файле")).toBeInTheDocument();
  });

  it("makes the file step explicit: file name and what reading headers means", async () => {
    stubApi(() => json({}));
    renderWorkspace();

    expect(
      screen.getByText(/читает только заголовки первой строки/),
    ).toBeInTheDocument();
    await chooseFile();
    expect(screen.getByText("vendors.xlsx")).toBeInTheDocument();
  });
});
