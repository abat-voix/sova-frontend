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

import { ContactsWorkspace } from "@/components/contacts/contacts-workspace";
import { LocaleProvider } from "@/providers/locale-provider";
import {
  kamPermissions,
  observerPermissions,
} from "@/test/fixtures/permissions";
import type { ContactPerson } from "@/types/contact-person";

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

beforeEach(() => {
  auth.permissions = kamPermissions;
});

const universityContact: ContactPerson = {
  id: "c1",
  full_name: "Анна Иванова",
  email: "anna@example.com",
  phone: "+7 900 000-00-01",
  telegram: "anna_iv",
  is_active: true,
  affiliations: [
    {
      id: "a1",
      type: "university",
      organization: { id: "u1", name: "Тюменский университет" },
      position: "Проректор",
      preferred_channels: ["email"],
      products: [],
    },
    {
      id: "a2",
      type: "vendor",
      organization: { id: "v1", name: "ООО «Базис»" },
      position: "Консультант",
      preferred_channels: [],
      products: [{ id: "p1", name: "Базис Dynamix" }],
    },
  ],
  created_at: "2026-09-01T10:00:00+03:00",
  updated_at: "2026-09-02T10:00:00+03:00",
};

const inactiveContact: ContactPerson = {
  id: "c2",
  full_name: "Борис Петров",
  email: "",
  phone: "",
  telegram: "",
  is_active: false,
  affiliations: [],
  created_at: "2026-09-03T10:00:00+03:00",
  updated_at: "2026-09-03T10:00:00+03:00",
};

type Call = { body: unknown; method: string; url: URL };

/** Каталог контактов; все запросы запоминаются, чтобы проверять параметры и записи. */
function stubCatalog() {
  const calls: Call[] = [];
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ body, method, url });
      const json = (value: unknown, status = 200) =>
        new Response(JSON.stringify(value), {
          headers: { "content-type": "application/json" },
          status,
        });

      if (method === "DELETE") return new Response(null, { status: 204 });
      if (url.pathname === "/api/catalog/contact-persons/c1/") {
        return json({ ...universityContact, ...(body as object) });
      }
      if (url.pathname === "/api/catalog/contact-persons/c2/") {
        return json({ ...inactiveContact, ...(body as object) });
      }
      if (
        url.pathname === "/api/catalog/contact-persons/possible-duplicates/"
      ) {
        return json([]);
      }
      if (
        url.pathname === "/api/catalog/contact-persons/" &&
        method === "POST"
      ) {
        return json(
          {
            ...inactiveContact,
            ...(body as object),
            id: "c9",
            is_active: true,
          },
          201,
        );
      }
      if (url.pathname === "/api/catalog/universities/") {
        return json({
          count: 1,
          next: null,
          previous: null,
          results: [{ id: "u2", name: "МГУ" }],
        });
      }
      if (
        url.pathname === "/api/catalog/university-contacts/" &&
        method === "POST"
      ) {
        return json({ id: "a9" }, 201);
      }

      return json({
        count: 2,
        next: null,
        previous: null,
        results: [universityContact, inactiveContact],
      });
    },
  );
  vi.stubGlobal("fetch", fetchMock);

  return calls;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ContactsWorkspace />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

/** Последний запрос списка: запросы карточки сюда попадать не должны. */
function lastListUrl(calls: Call[]) {
  const listCalls = calls.filter(
    (call) =>
      call.url.pathname === "/api/catalog/contact-persons/" &&
      call.method === "GET",
  );

  return listCalls[listCalls.length - 1].url;
}

async function openCard(name: string) {
  fireEvent.click(await screen.findByText(name));

  return screen.findByRole("dialog");
}

function writes(calls: Call[], method: string, pathname: string) {
  return calls.filter(
    (call) => call.method === method && call.url.pathname === pathname,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ContactsWorkspace", () => {
  it("shows every organization of a person with the position there", async () => {
    stubCatalog();
    renderWorkspace();

    expect(await screen.findByText("Анна Иванова")).toBeInTheDocument();
    expect(screen.getByText("Тюменский университет")).toBeInTheDocument();
    expect(screen.getByText("ООО «Базис»")).toBeInTheDocument();
    expect(screen.getAllByText(/Проректор/).length).toBeGreaterThan(0);
    expect(screen.getByText("Строки 1–2 из 2")).toBeInTheDocument();
  });

  it("opens the card with affiliations, products, and the Telegram link", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    const drawer = await openCard("Анна Иванова");

    expect(
      within(drawer).getByRole("heading", { name: "Анна Иванова" }),
    ).toBeInTheDocument();
    expect(within(drawer).getByText("Базис Dynamix")).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "@anna_iv" }),
    ).toHaveAttribute("href", "https://t.me/anna_iv");
    await waitFor(() =>
      expect(
        writes(calls, "GET", "/api/catalog/contact-persons/c1/"),
      ).not.toHaveLength(0),
    );
  });

  it("asks the catalog for the reversed order after a second click on a header", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    await screen.findByText("Анна Иванова");
    expect(lastListUrl(calls).searchParams.get("ordering")).toBe("full_name");

    fireEvent.click(screen.getByRole("button", { name: /ФИО/ }));

    await waitFor(() =>
      expect(lastListUrl(calls).searchParams.get("ordering")).toBe(
        "-full_name",
      ),
    );
  });

  it("filters the catalog by activity", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    await screen.findByText("Анна Иванова");
    expect(lastListUrl(calls).searchParams.has("is_active")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Активные" }));

    await waitFor(() =>
      expect(lastListUrl(calls).searchParams.get("is_active")).toBe("true"),
    );
  });

  it("creates a new person", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: "Новый контакт" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/ФИО/), {
      target: { value: "Вера Сидорова" },
    });
    fireEvent.change(within(dialog).getByLabelText("Telegram"), {
      target: { value: "t.me/vera_s" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(
        writes(calls, "POST", "/api/catalog/contact-persons/"),
      ).toHaveLength(1),
    );
    expect(
      writes(calls, "POST", "/api/catalog/contact-persons/")[0].body,
    ).toEqual({
      email: "",
      full_name: "Вера Сидорова",
      phone: "",
      telegram: "t.me/vera_s",
    });
  });

  it("edits the person's own data", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    const drawer = await openCard("Анна Иванова");
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Изменить контакт" }),
    );
    const form = screen.getByRole("dialog", { name: "Изменить контакт" });
    fireEvent.change(within(form).getByLabelText("Телефон"), {
      target: { value: "+7 900 111-11-11" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(
        writes(calls, "PATCH", "/api/catalog/contact-persons/c1/"),
      ).toHaveLength(1),
    );
    expect(
      writes(calls, "PATCH", "/api/catalog/contact-persons/c1/")[0].body,
    ).toMatchObject({
      full_name: "Анна Иванова",
      phone: "+7 900 111-11-11",
    });
  });

  it("deactivates a person only after the consequences are confirmed", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    const drawer = await openCard("Анна Иванова");
    fireEvent.click(within(drawer).getByRole("button", { name: "Выключить" }));
    expect(
      within(drawer).getByText(/связи с организациями удалятся/),
    ).toBeInTheDocument();
    expect(
      writes(calls, "PATCH", "/api/catalog/contact-persons/c1/"),
    ).toHaveLength(0);
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Выключить контакт" }),
    );

    await waitFor(() =>
      expect(
        writes(calls, "PATCH", "/api/catalog/contact-persons/c1/"),
      ).toHaveLength(1),
    );
    expect(
      writes(calls, "PATCH", "/api/catalog/contact-persons/c1/")[0].body,
    ).toEqual({ is_active: false });
  });

  it("turns an inactive person back on", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    const drawer = await openCard("Борис Петров");
    fireEvent.click(within(drawer).getByRole("button", { name: "Включить" }));

    await waitFor(() =>
      expect(
        writes(calls, "PATCH", "/api/catalog/contact-persons/c2/"),
      ).toHaveLength(1),
    );
    expect(
      writes(calls, "PATCH", "/api/catalog/contact-persons/c2/")[0].body,
    ).toEqual({ is_active: true });
  });

  it("removes a person from one organization in the card", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    const drawer = await openCard("Анна Иванова");
    const removeButtons = within(drawer).getAllByRole("button", {
      name: "Удалить из организации",
    });
    fireEvent.click(removeButtons[0]);
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Да, удалить" }),
    );

    await waitFor(() =>
      expect(
        writes(calls, "DELETE", "/api/catalog/university-contacts/a1/"),
      ).toHaveLength(1),
    );
  });

  it("adds the person to one more organization", async () => {
    const calls = stubCatalog();
    renderWorkspace();

    const drawer = await openCard("Анна Иванова");
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Добавить организацию" }),
    );
    const form = screen.getByRole("dialog", { name: "Добавить организацию" });
    fireEvent.click(
      within(form).getByRole("combobox", { name: "Организация" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "МГУ" }));
    fireEvent.change(within(form).getByLabelText("Должность"), {
      target: { value: "Доцент" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Добавить" }));

    await waitFor(() =>
      expect(
        writes(calls, "POST", "/api/catalog/university-contacts/"),
      ).toHaveLength(1),
    );
    expect(
      writes(calls, "POST", "/api/catalog/university-contacts/")[0].body,
    ).toEqual({
      contact: "c1",
      position: "Доцент",
      preferred_channels: [],
      university: "u2",
    });
  });

  it("shows an observer the card without any editing actions", async () => {
    auth.permissions = observerPermissions;
    stubCatalog();
    renderWorkspace();

    const drawer = await openCard("Анна Иванова");

    expect(within(drawer).getByText("Базис Dynamix")).toBeInTheDocument();
    for (const name of [
      "Новый контакт",
      "Изменить контакт",
      "Выключить",
      "Удалить",
      "Добавить организацию",
      "Изменить",
      "Удалить из организации",
    ]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });
});
