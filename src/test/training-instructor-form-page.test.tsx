import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    csrfToken: "csrf",
    user: {
      id: 1,
      isSuperuser: false,
      permissions: ["catalog.read", "catalog.create", "catalog.update"],
      role: "kam",
    },
  }),
}));

import { TrainingInstructorFormPage } from "@/components/training/training-instructor-form-page";
import { LocaleProvider } from "@/providers/locale-provider";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

const page = (results: unknown[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

function stubApi() {
  const created: unknown[] = [];
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      urls.push(url);
      if (url.startsWith("/api/catalog/organizations/"))
        return json(page([{ id: "u1", name: "МГУ" }]));
      if (url.startsWith("/api/catalog/directions/"))
        return json(page([{ id: "d1", name: "DevOps" }]));
      if (url.startsWith("/api/catalog/programs/"))
        return json(page([{ id: "p1", name: "DevOps-инженер" }]));
      if (url === "/api/training/instructors/" && init?.method === "POST") {
        created.push(JSON.parse(String(init.body)));
        return json({ id: "t1", full_name: "Петров Пётр" }, 201);
      }
      return json(page([]));
    }),
  );
  return { created, urls };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <TrainingInstructorFormPage />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

async function pick(combobox: string, option: RegExp) {
  fireEvent.click(screen.getByRole("combobox", { name: combobox }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  navigation.push.mockReset();
});

describe("training instructor form page", () => {
  it("creates an instructor with visible competences and programs of chosen directions", async () => {
    const { created, urls } = stubApi();
    renderPage();

    fireEvent.change(screen.getByLabelText(/Фамилия/), {
      target: { value: "Петров" },
    });
    fireEvent.change(screen.getByLabelText(/^Имя/), {
      target: { value: "Пётр" },
    });
    const submit = screen.getByRole("button", { name: "Сохранить" });
    expect(submit).toBeDisabled();
    await pick("Организация", /МГУ/);

    // Программу без направления выбрать негде
    expect(
      screen.getByText(
        "Сначала добавьте направление, затем выберите его программы.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Программы направления" }),
    ).toBeNull();

    await pick("Добавить направление", /DevOps/);
    const block = await screen.findByRole("listitem", { name: "DevOps" });
    expect(
      within(block).getByText(
        "Программы не выбраны. Для подбора на потоки выберите программы.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(block).getByRole("combobox", { name: "Программы направления" }),
    );
    fireEvent.click(
      await within(block).findByRole("option", { name: /DevOps-инженер/ }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    // Программы ищутся только в своём направлении
    await waitFor(() =>
      expect(
        urls.some(
          (url) =>
            url.startsWith("/api/catalog/programs/") &&
            url.includes("direction__ids=d1"),
        ),
      ).toBe(true),
    );
    expect(
      await within(block).findByRole("button", {
        name: "Убрать: DevOps-инженер",
      }),
    ).toBeInTheDocument();

    // Одно направление дважды не добавить
    fireEvent.click(
      screen.getByRole("combobox", { name: "Добавить направление" }),
    );
    expect(await screen.findByText("Ничего не найдено.")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    fireEvent.click(submit);

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toMatchObject({
      directions: ["d1"],
      first_name: "Пётр",
      last_name: "Петров",
      programs: ["p1"],
      organization: "u1",
    });
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/training/instructors/t1"),
    );
  });

  it("selects every program of a direction across pages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const url = new URL(String(input), "http://localhost");
        if (url.pathname === "/api/catalog/directions/")
          return json(page([{ id: "d1", name: "DevOps" }]));
        if (
          url.pathname === "/api/catalog/programs/" &&
          url.searchParams.get("page_size") === "200"
        ) {
          // Две страницы: «выбрать все» не должно остановиться на первой
          return url.searchParams.get("page") === "1"
            ? json({
                count: 2,
                next: "/api/catalog/programs/?page=2",
                previous: null,
                results: [{ id: "p1", name: "DevOps-инженер" }],
              })
            : json({
                count: 2,
                next: null,
                previous: "/api/catalog/programs/?page=1",
                results: [{ id: "p2", name: "SRE" }],
              });
        }
        return json(page([]));
      }),
    );
    renderPage();

    await pick("Добавить направление", /DevOps/);
    const block = await screen.findByRole("listitem", { name: "DevOps" });
    const selectAll = within(block).getByRole("button", {
      name: "Выбрать все программы: DevOps",
    });
    await waitFor(() => expect(selectAll).toBeEnabled());

    fireEvent.click(selectAll);

    expect(
      within(block).getByRole("button", { name: "Убрать: DevOps-инженер" }),
    ).toBeInTheDocument();
    expect(
      within(block).getByRole("button", { name: "Убрать: SRE" }),
    ).toBeInTheDocument();
    // Всё выбрано — выбирать больше нечего
    expect(selectAll).toBeDisabled();
  });
});
