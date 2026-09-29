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

import { OrganizationContacts } from "@/components/organizations/organization-contacts";
import { LocaleProvider } from "@/providers/locale-provider";
import {
  kamPermissions,
  observerPermissions,
} from "@/test/fixtures/permissions";
import type { ContactOwnerRef } from "@/types/contact-person";

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

const person = (id: string, fullName: string) => ({
  email: `${id}@example.com`,
  full_name: fullName,
  id,
  is_active: true,
  phone: "",
  telegram: "",
});

type Call = { body: unknown; method: string; url: URL };

/** Каталог с одной связью; записи запоминаются для проверок. */
function stubCatalog(
  endpoint: string,
  affiliations: unknown[],
  duplicates: unknown[] = [],
  directory: unknown[] = [],
) {
  const calls: Call[] = [];
  let listed = affiliations;
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ body, method, url });

      if (url.pathname === endpoint && method === "GET") {
        return json({
          count: listed.length,
          next: null,
          previous: null,
          results: listed,
        });
      }
      if (url.pathname.startsWith(endpoint) && method === "DELETE") {
        listed = [];
        return new Response(null, { status: 204 });
      }
      if (url.pathname === endpoint && method === "POST") {
        return json({ id: "new-affiliation" }, 201);
      }
      if (
        url.pathname === "/api/catalog/contact-persons/possible-duplicates/"
      ) {
        return json(duplicates);
      }
      if (
        url.pathname === "/api/catalog/contact-persons/" &&
        method === "GET"
      ) {
        return json({
          count: directory.length,
          next: null,
          previous: null,
          results: directory,
        });
      }
      if (
        url.pathname === "/api/catalog/contact-persons/" &&
        method === "POST"
      ) {
        return json(
          {
            ...person(
              "new-person",
              String((body as { full_name: string }).full_name),
            ),
            affiliations: [],
          },
          201,
        );
      }
      throw new Error(`Unexpected request: ${method} ${url.pathname}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);

  return calls;
}

function renderContacts(organization: ContactOwnerRef, name = "Академия") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <OrganizationContacts
          organization={organization}
          organizationName={name}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OrganizationContacts", () => {
  it("lists the vendor's people with their position and products", async () => {
    const calls = stubCatalog("/api/catalog/vendor-contacts/", [
      {
        contact: person("c1", "Анна Смирнова"),
        id: "a1",
        position: "Консультант",
        preferred_channels: ["telegram"],
        products: [{ id: "p1", name: "RT.DataLake" }],
      },
    ]);

    renderContacts({ id: "v1", type: "vendor" }, "ООО «ТДата»");

    expect(await screen.findByText("Анна Смирнова")).toBeInTheDocument();
    expect(screen.getByText("Консультант")).toBeInTheDocument();
    expect(screen.getByText("RT.DataLake")).toBeInTheDocument();
    expect(calls[0].url.searchParams.get("vendor__ids")).toBe("v1");
  });

  it("removes a person from the organization after confirmation", async () => {
    const calls = stubCatalog("/api/catalog/organization-contacts/", [
      {
        contact: person("c1", "Анна Смирнова"),
        id: "a1",
        position: "Проректор",
        preferred_channels: [],
      },
    ]);
    renderContacts({ id: "u1", type: "organization" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Удалить из организации" }),
    );
    // Первый клик только спрашивает: у вуза удаление отвязывает от взаимодействий
    expect(
      screen.getByText(/отвязан от активных взаимодействий/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Да, удалить" }));

    await waitFor(() =>
      expect(calls.some((call) => call.method === "DELETE")).toBe(true),
    );
    const removal = calls.find((call) => call.method === "DELETE")!;
    expect(removal.url.pathname).toBe("/api/catalog/organization-contacts/a1/");
    expect(
      await screen.findByText("Контактные лица не указаны"),
    ).toBeInTheDocument();
  });

  it("creates a new person and links them to the organization", async () => {
    const calls = stubCatalog("/api/catalog/organization-contacts/", []);
    renderContacts({ id: "u1", type: "organization" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Добавить контакт" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/ФИО/), {
      target: { value: "Пётр Петров" },
    });
    fireEvent.change(within(dialog).getByLabelText("Telegram"), {
      target: { value: "@petrov_pp" },
    });
    fireEvent.change(within(dialog).getByLabelText("Должность"), {
      target: { value: "Декан" },
    });
    // Телефона у человека нет — способ связи «Телефон» выбрать нельзя
    expect(
      within(dialog).getByRole("checkbox", { name: "Телефон" }),
    ).toHaveProperty("disabled", true);
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "Чат в Telegram" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Добавить" }));

    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === "POST" &&
            call.url.pathname === "/api/catalog/organization-contacts/",
        ),
      ).toBe(true),
    );
    // Человек создаётся вместе со связью одним запросом
    expect(
      calls.some(
        (call) =>
          call.method === "POST" &&
          call.url.pathname === "/api/catalog/contact-persons/",
      ),
    ).toBe(false);
    const linked = calls.find(
      (call) =>
        call.method === "POST" &&
        call.url.pathname === "/api/catalog/organization-contacts/",
    )!;
    expect(linked.body).toEqual({
      new_contact: {
        email: "",
        full_name: "Пётр Петров",
        phone: "",
        telegram: "@petrov_pp",
      },
      position: "Декан",
      preferred_channels: ["telegram"],
      organization: "u1",
    });
  });

  it("links an existing person picked from the duplicate hint without creating a new one", async () => {
    const duplicate = {
      ...person("c7", "Иван Иванов"),
      affiliations: [
        {
          id: "x",
          organization: { id: "u9", name: "МГУ" },
          position: "Проректор",
          preferred_channels: [],
          products: [],
          type: "organization",
        },
      ],
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    };
    const calls = stubCatalog(
      "/api/catalog/organization-contacts/",
      [],
      [duplicate],
    );
    renderContacts({ id: "u1", type: "organization" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Добавить контакт" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/ФИО/), {
      target: { value: "Иван Иванов" },
    });

    expect(
      await within(dialog).findByText(/МГУ, Проректор/),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Это он" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Добавить" }));

    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === "POST" &&
            call.url.pathname === "/api/catalog/organization-contacts/",
        ),
      ).toBe(true),
    );
    expect(
      calls.some(
        (call) =>
          call.method === "POST" &&
          call.url.pathname === "/api/catalog/contact-persons/",
      ),
    ).toBe(false);
    const linked = calls.find((call) => call.method === "POST")!;
    expect(linked.body).toMatchObject({ contact: "c7", organization: "u1" });
  });

  it("links an active person picked from the directory, hiding already linked ones", async () => {
    const affiliation = (organizationId: string, name: string) => ({
      id: `x-${organizationId}`,
      organization: { id: organizationId, name },
      position: "",
      preferred_channels: [],
      products: [],
      type: "organization",
    });
    const free = {
      ...person("c7", "Иван Иванов"),
      affiliations: [affiliation("u9", "МГУ")],
    };
    const linked = {
      ...person("c8", "Пётр Петров"),
      affiliations: [affiliation("u1", "Академия")],
    };
    const calls = stubCatalog(
      "/api/catalog/organization-contacts/",
      [],
      [],
      [free, linked],
    );
    renderContacts({ id: "u1", type: "organization" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Добавить контакт" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Из справочника"));
    fireEvent.click(
      within(dialog).getByRole("combobox", { name: "Контактное лицо" }),
    );

    const option = await within(dialog).findByRole("option", {
      name: /Иван Иванов · c7@example.com · МГУ/,
    });
    // Уже связанный с организацией человек не предлагается
    expect(
      within(dialog).queryByRole("option", { name: /Пётр Петров/ }),
    ).toBeNull();
    const search = calls.find(
      (call) =>
        call.method === "GET" &&
        call.url.pathname === "/api/catalog/contact-persons/",
    )!;
    expect(search.url.searchParams.get("is_active")).toBe("true");

    fireEvent.click(option);
    // Выбранный человек остаётся в поле, без плашки
    const picker = within(dialog).getByRole("combobox", {
      name: "Контактное лицо",
    });
    expect(picker).toHaveTextContent("Иван Иванов");
    expect(within(dialog).queryByText("Существующий человек")).toBeNull();

    // Крестик сбрасывает выбор — сохранять некого
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Очистить: Контактное лицо" }),
    );
    expect(
      within(dialog).getByRole("button", { name: "Добавить" }),
    ).toBeDisabled();

    fireEvent.click(picker);
    fireEvent.click(
      await within(dialog).findByRole("option", { name: /Иван Иванов/ }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Добавить" }));

    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === "POST" &&
            call.url.pathname === "/api/catalog/organization-contacts/",
        ),
      ).toBe(true),
    );
    const created = calls.find((call) => call.method === "POST")!;
    expect(created.body).toMatchObject({ contact: "c7", organization: "u1" });
  });

  it("shows the person read-only when editing the affiliation, with a link to Contacts", async () => {
    stubCatalog("/api/catalog/organization-contacts/", [
      {
        contact: person("c1", "Анна Смирнова"),
        id: "a1",
        position: "Проректор",
        preferred_channels: ["email"],
        products: [],
      },
    ]);
    renderContacts({ id: "u1", type: "organization" });

    fireEvent.click(await screen.findByRole("button", { name: "Изменить" }));
    const dialog = screen.getByRole("dialog");
    const details = within(dialog).getByRole("region", {
      name: "Контактное лицо",
    });

    expect(within(details).getByText("Анна Смирнова")).toBeInTheDocument();
    expect(within(details).getByText("c1@example.com")).toBeInTheDocument();
    // Телефона и Telegram нет — видно, почему эти способы связи недоступны
    expect(within(details).getAllByText("не указано")).toHaveLength(2);
    expect(
      within(details).getByRole("link", { name: "Открыть в «Контактах»" }),
    ).toHaveAttribute("href", "/contacts?contact=c1");
    // Данные человека здесь не редактируются
    expect(
      within(dialog).queryByRole("textbox", { name: "Телефон" }),
    ).toBeNull();
    expect(within(dialog).getByLabelText("Должность")).toHaveValue("Проректор");
  });

  it("shows an observer the organization's people without editing actions", async () => {
    auth.permissions = observerPermissions;
    stubCatalog("/api/catalog/organization-contacts/", [
      {
        contact: person("c1", "Анна Смирнова"),
        id: "a1",
        position: "Проректор",
        preferred_channels: [],
      },
    ]);
    renderContacts({ id: "u1", type: "organization" });

    expect(await screen.findByText("Анна Смирнова")).toBeInTheDocument();
    for (const name of [
      "Добавить контакт",
      "Изменить",
      "Удалить из организации",
    ]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });
});
