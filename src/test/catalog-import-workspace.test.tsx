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

type Api = {
  mapping?: () => Response;
  headers?: () => Response;
  upload?: () => Response;
};

function stubApi({
  mapping = () => json(vendorMapping),
  headers = () => json({ headers: ["Вендор", "Код"] }),
  upload = () => json({}),
}: Api = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/catalog/import-mappings/by-type/"))
      return mapping();
    if (url === "/api/catalog/imports/headers/") return headers();
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

function chooseType(value: string) {
  fireEvent.change(screen.getByLabelText("Справочник"), {
    target: { value },
  });
}

function pickFile(name = "vendors.xlsx") {
  fireEvent.change(screen.getByLabelText("Файл xlsx/xls"), {
    target: { files: [new File(["x"], name)] },
  });
}

/** Справочник, файл и прочитанные заголовки — открыт свёрнутый маппинг. */
async function reachSavedMapping() {
  chooseType("vendor");
  pickFile();
  await screen.findByText("Найдено колонок: 2");
  await screen.findByRole("button", { name: "Изменить маппинг" });
}

afterEach(() => vi.unstubAllGlobals());

describe("CatalogImportWorkspace steps", () => {
  it("opens the steps one after another", async () => {
    stubApi();
    renderWorkspace();

    // Сначала только выбор справочника
    expect(screen.getByText("1. Справочник")).toBeInTheDocument();
    expect(screen.queryByText("2. Файл")).toBeNull();
    expect(screen.queryByText("3. Маппинг колонок")).toBeNull();
    expect(screen.queryByText("4. Загрузка")).toBeNull();

    chooseType("vendor");
    expect(screen.getByText("2. Файл")).toBeInTheDocument();
    expect(screen.queryByText("3. Маппинг колонок")).toBeNull();
    expect(screen.queryByText("4. Загрузка")).toBeNull();

    pickFile();
    expect(await screen.findByText("3. Маппинг колонок")).toBeInTheDocument();
    expect(await screen.findByText("4. Загрузка")).toBeInTheDocument();
  });

  it("does not open the mapping when the file cannot be read", async () => {
    stubApi({
      headers: () =>
        json(
          {
            code: "import_error",
            detail: "Не удалось распознать файл vendors.xlsx как таблицу Excel",
          },
          400,
        ),
    });
    renderWorkspace();
    chooseType("vendor");

    pickFile();

    expect(
      await screen.findByText(/Не удалось распознать файл vendors.xlsx/),
    ).toBeInTheDocument();
    expect(screen.queryByText("3. Маппинг колонок")).toBeNull();
    expect(screen.queryByText("4. Загрузка")).toBeNull();
  });

  it("keeps the upload step closed until a required mapping is saved", async () => {
    stubApi({
      mapping: () =>
        json(vendorMapping.map((field) => ({ ...field, source_column: null }))),
    });
    renderWorkspace();
    chooseType("vendor");
    pickFile();

    // Обязательные поля не заданы — редактор открыт сразу, отменять нечего
    expect(await screen.findByLabelText(/Название/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Отмена" })).toBeNull();
    expect(screen.queryByText("4. Загрузка")).toBeNull();
  });

  it("hides the upload step while the mapping is being edited", async () => {
    stubApi();
    renderWorkspace();
    await reachSavedMapping();

    fireEvent.click(screen.getByRole("button", { name: "Изменить маппинг" }));

    expect(screen.getByLabelText(/Внешний код/)).toBeInTheDocument();
    expect(screen.queryByText("4. Загрузка")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(screen.queryByLabelText(/Внешний код/)).toBeNull();
    expect(screen.getByText("4. Загрузка")).toBeInTheDocument();
  });

  it("collapses the mapping after it is saved and opens the upload step", async () => {
    const fetchMock = stubApi();
    renderWorkspace();
    await reachSavedMapping();
    fireEvent.click(screen.getByRole("button", { name: "Изменить маппинг" }));
    fireEvent.change(screen.getByLabelText(/Внешний код/), {
      target: { value: "Код" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Сохранить маппинг" }));

    expect(
      await screen.findByRole("button", { name: "Изменить маппинг" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Загрузить" })).toBeEnabled();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === "/api/catalog/import-mappings/by-type/vendor/" &&
          init?.method === "PUT",
      ),
    ).toBe(true);
  });

  it("marks collapsed mapping columns that are missing in the chosen file", async () => {
    stubApi({ headers: () => json({ headers: ["Компания"] }) });
    renderWorkspace();
    chooseType("vendor");

    pickFile();

    expect(await screen.findByText("нет в файле")).toBeInTheDocument();
  });

  it("explains that choosing a file only reads the headers", async () => {
    stubApi();
    renderWorkspace();
    chooseType("vendor");

    expect(
      screen.getByText(/читает только заголовки первой строки/),
    ).toBeInTheDocument();
    pickFile();
    expect(await screen.findByText("vendors.xlsx")).toBeInTheDocument();
  });

  it("clears the file input on click so the same file can be chosen again", () => {
    stubApi();
    renderWorkspace();
    chooseType("vendor");
    const input = screen.getByLabelText("Файл xlsx/xls") as HTMLInputElement;
    const setValue = vi.spyOn(input, "value", "set");

    fireEvent.click(input);

    expect(setValue).toHaveBeenCalledWith("");
  });
});

describe("CatalogImportWorkspace upload", () => {
  it("uploads the file and shows counts and warnings", async () => {
    stubApi({
      upload: () =>
        json({
          catalog_type: "vendor",
          created: 2,
          updated: 1,
          warnings: [{ row: 4, message: "проверьте" }],
        }),
    });
    renderWorkspace();
    await reachSavedMapping();

    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));

    expect(
      await screen.findByText("Создано: 2, обновлено: 1"),
    ).toBeInTheDocument();
    expect(screen.getByText("проверьте")).toBeInTheDocument();
  });

  it("shows row errors and the total when there are more than returned", async () => {
    stubApi({
      upload: () =>
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
    });
    renderWorkspace();
    await reachSavedMapping();

    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));

    expect(
      await screen.findByText("Показаны 100 из 150 ошибок."),
    ).toBeInTheDocument();
    expect(screen.getByText("ошибка 99")).toBeInTheDocument();
  });

  it("asks to choose the file again when the browser cannot send it", async () => {
    stubApi({
      upload: () => {
        throw new TypeError("Failed to fetch");
      },
    });
    renderWorkspace();
    await reachSavedMapping();

    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));

    expect(
      await screen.findByText(
        "Файл изменился или недоступен — выберите его заново.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the file and resets the result when the catalog type changes", async () => {
    stubApi({
      upload: () =>
        json({ catalog_type: "vendor", created: 1, updated: 0, warnings: [] }),
    });
    renderWorkspace();
    await reachSavedMapping();
    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));
    await screen.findByText("Создано: 1, обновлено: 0");

    chooseType("product");

    await waitFor(() =>
      expect(screen.queryByText("Создано: 1, обновлено: 0")).toBeNull(),
    );
    expect(screen.getByText("Найдено колонок: 2")).toBeInTheDocument();
    expect(screen.getByText("3. Маппинг колонок")).toBeInTheDocument();
  });
});
