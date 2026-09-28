import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

    expect(screen.getAllByText("Ничего не выбрано.")).toHaveLength(2);
    await pick("Направления", /DevOps/);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      await screen.findByRole("button", { name: "Убрать: DevOps" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Показаны программы выбранных направлений."),
    ).toBeInTheDocument();

    await pick("Программы", /DevOps-инженер/);
    await waitFor(() =>
      expect(
        urls.some(
          (url) =>
            url.startsWith("/api/catalog/programs/") &&
            url.includes("direction__ids=d1"),
        ),
      ).toBe(true),
    );

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
});
