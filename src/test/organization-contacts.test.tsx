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
import type { OrganizationRef } from "@/types/contact-person";

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

function renderContacts(organization: OrganizationRef, name = "Академия") {
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
    const calls = stubCatalog("/api/catalog/university-contacts/", [
      {
        contact: person("c1", "Анна Смирнова"),
        id: "a1",
        position: "Проректор",
        preferred_channels: [],
      },
    ]);
    renderContacts({ id: "u1", type: "university" });

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
    expect(removal.url.pathname).toBe("/api/catalog/university-contacts/a1/");
    expect(
      await screen.findByText("Контактные лица не указаны"),
    ).toBeInTheDocument();
  });

  it("creates a new person and links them to the organization", async () => {
    const calls = stubCatalog("/api/catalog/university-contacts/", []);
    renderContacts({ id: "u1", type: "university" });

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
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Телефон" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Добавить" }));

    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === "POST" &&
            call.url.pathname === "/api/catalog/university-contacts/",
        ),
      ).toBe(true),
    );
    const created = calls.find(
      (call) =>
        call.method === "POST" &&
        call.url.pathname === "/api/catalog/contact-persons/",
    )!;
    expect(created.body).toMatchObject({
      full_name: "Пётр Петров",
      telegram: "@petrov_pp",
    });
    const linked = calls.find(
      (call) =>
        call.method === "POST" &&
        call.url.pathname === "/api/catalog/university-contacts/",
    )!;
    expect(linked.body).toEqual({
      contact: "new-person",
      position: "Декан",
      preferred_channels: ["phone"],
      university: "u1",
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
          type: "university",
        },
      ],
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    };
    const calls = stubCatalog(
      "/api/catalog/university-contacts/",
      [],
      [duplicate],
    );
    renderContacts({ id: "u1", type: "university" });

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
            call.url.pathname === "/api/catalog/university-contacts/",
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
    expect(linked.body).toMatchObject({ contact: "c7", university: "u1" });
  });

  it("shows an observer the organization's people without editing actions", async () => {
    auth.permissions = observerPermissions;
    stubCatalog("/api/catalog/university-contacts/", [
      {
        contact: person("c1", "Анна Смирнова"),
        id: "a1",
        position: "Проректор",
        preferred_channels: [],
      },
    ]);
    renderContacts({ id: "u1", type: "university" });

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
