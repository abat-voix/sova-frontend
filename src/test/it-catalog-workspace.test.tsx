import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ItCatalogWorkspace } from "@/components/catalog/it-catalog-workspace";
import { LocaleProvider } from "@/providers/locale-provider";
import {
  kamPermissions,
  observerPermissions,
} from "@/test/fixtures/permissions";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    csrfToken: "csrf",
    user: {
      id: 1,
      isSuperuser: false,
      permissions: auth.permissions,
      role: "kam",
    },
  }),
}));

const stamps = {
  created_at: "2026-09-01T10:00:00+03:00",
  updated_at: "2026-09-01T10:00:00+03:00",
};
const direction = {
  id: "d1",
  name: "DevOps",
  external_code: null,
  is_active: true,
  ...stamps,
};
const product = {
  id: "pr1",
  name: "GitLab",
  external_code: "GL",
  is_active: true,
  vendor: null,
  programs: [
    { id: "p1", name: "Основы", direction: { id: "d1", name: "DevOps" } },
  ],
  ...stamps,
};

type Call = { body: unknown; method: string; url: URL };

function stubCatalog() {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ body, method, url });
      const page = (results: unknown[]) => ({
        count: results.length,
        next: null,
        previous: null,
        results,
      });
      const respond = (value: unknown, status = 200) =>
        new Response(JSON.stringify(value), {
          headers: { "content-type": "application/json" },
          status,
        });

      if (method === "POST") return respond({ ...direction, id: "new" }, 201);
      if (method === "PATCH") return respond(product);
      if (url.pathname === "/api/catalog/directions/")
        return respond(page([direction]));
      if (url.pathname === "/api/catalog/directions/d1/")
        return respond(direction);
      if (url.pathname === "/api/catalog/products/")
        return respond(page([product]));
      if (url.pathname === "/api/catalog/products/pr1/")
        return respond(product);
      return respond(page([]));
    }),
  );

  return calls;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ItCatalogWorkspace />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

const writes = (calls: Call[]) => calls.filter((call) => call.method !== "GET");

beforeEach(() => {
  auth.permissions = kamPermissions;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ItCatalogWorkspace editing", () => {
  it("creates a direction", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: "Создать направление" }),
    );
    const form = screen.getByRole("dialog");
    fireEvent.change(within(form).getByLabelText(/Название/), {
      target: { value: "Аналитика" },
    });
    fireEvent.change(within(form).getByLabelText("Внешний код"), {
      target: { value: "AN" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(writes(calls)).toHaveLength(1));
    expect(writes(calls)[0]).toMatchObject({
      body: { external_code: "AN", is_active: true, name: "Аналитика" },
      method: "POST",
    });
    expect(writes(calls)[0].url.pathname).toBe("/api/catalog/directions/");
  });

  it("does not save a program without a direction", async () => {
    stubCatalog();
    renderWorkspace();

    fireEvent.click(await screen.findByRole("button", { name: "Программы" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Создать программу" }),
    );
    const form = screen.getByRole("dialog");
    fireEvent.change(within(form).getByLabelText(/Название/), {
      target: { value: "Основы" },
    });
    const save = within(form).getByRole("button", { name: "Сохранить" });
    expect(save).toBeDisabled();

    fireEvent.click(
      within(form).getByRole("combobox", { name: "Направление" }),
    );
    fireEvent.click(
      await within(form).findByRole("option", { name: /DevOps/ }),
    );

    expect(save).toBeEnabled();
  });

  it("edits a product: programs by direction and deactivation instead of deletion", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    fireEvent.click(await screen.findByRole("button", { name: "Продукты" }));
    fireEvent.click(await screen.findByText("GitLab"));
    const drawer = await screen.findByRole("dialog");
    expect(
      await within(drawer).findByText("DevOps · Основы"),
    ).toBeInTheDocument();
    expect(
      within(drawer).queryByRole("button", { name: "Удалить" }),
    ).toBeNull();

    fireEvent.click(within(drawer).getByRole("button", { name: "Изменить" }));
    const form = screen.getByRole("dialog", { name: "Изменить продукт" });
    const block = within(form).getByRole("listitem", { name: "DevOps" });
    expect(
      within(block).getByRole("button", { name: "Убрать: Основы" }),
    ).toBeInTheDocument();

    fireEvent.click(within(form).getByLabelText("Активно"));
    fireEvent.click(within(form).getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(writes(calls)).toHaveLength(1));
    expect(writes(calls)[0]).toMatchObject({
      body: {
        external_code: "GL",
        is_active: false,
        name: "GitLab",
        programs: ["p1"],
        vendor: null,
      },
      method: "PATCH",
    });
    expect(writes(calls)[0].url.pathname).toBe("/api/catalog/products/pr1/");
  });

  it("hides editing from an observer", async () => {
    auth.permissions = observerPermissions;
    stubCatalog();
    renderWorkspace();

    fireEvent.click(await screen.findByText("DevOps"));
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findByRole("heading", { name: "DevOps" });

    expect(
      screen.queryByRole("button", { name: "Создать направление" }),
    ).toBeNull();
    expect(
      within(drawer).queryByRole("button", { name: "Изменить" }),
    ).toBeNull();
  });
});
