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

import { OrganizationsWorkspace } from "@/components/organizations/organizations-workspace";
import { LocaleProvider } from "@/providers/locale-provider";
import { kamPermissions } from "@/test/fixtures/permissions";
import type { Organization } from "@/types/organization";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    csrfToken: "csrf",
    user: {
      id: 1,
      isSuperuser: false,
      permissions: kamPermissions,
      role: "kam",
    },
  }),
}));

vi.mock("@/components/organizations/organizations-map", () => ({
  OrganizationsMap: ({
    onSelect,
  }: {
    onSelect: (organizationId: string) => void;
  }) => (
    <button onClick={() => onSelect("organization-1")} type="button">
      Выбрать университет на карте
    </button>
  ),
}));

const organization = (id: string, name: string): Organization => ({
  id,
  name,
  inn: null,
  external_code: null,
  has_interactions: false,
  email: "",
  phone: "",
  is_active: true,
  created_at: "2026-09-20T17:18:08.681266+03:00",
  updated_at: "2026-09-20T17:18:08.681272+03:00",
  organization_type: "education",
  legal_address: null,
  actual_address: {
    country_code: "RU",
    region: "",
    city: "Тюмень",
    street: "",
    house: "",
    office: "",
    postal_code: "",
    lat: null,
    lon: null,
  },
  actual_same_as_legal: false,
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OrganizationsWorkspace", () => {
  it("loads and shows contact people for the organization selected on the map", async () => {
    const selectedOrganization = organization(
      "organization-1",
      "Тюменский университет",
    );
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      let body: unknown;

      if (url.pathname === "/api/catalog/organizations/map/") {
        body = [
          {
            id: selectedOrganization.id,
            lat: "57.15",
            lon: "65.53",
            has_interactions: false,
          },
        ];
      } else if (
        url.pathname === "/api/catalog/organizations/organization-1/"
      ) {
        body = selectedOrganization;
      } else if (url.pathname === "/api/catalog/organization-contacts/") {
        body = {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: "affiliation-1",
              contact: {
                id: "contact-1",
                full_name: "Анна Смирнова",
                email: "anna@example.test",
                phone: "+7 900 000-00-00",
                telegram: "",
                is_active: true,
              },
              position: "Проректор",
              preferred_channels: [],
              created_at: "2026-09-20T17:18:08.681266+03:00",
              updated_at: "2026-09-20T17:18:08.681272+03:00",
            },
          ],
        };
      } else {
        body = { count: 0, next: null, previous: null, results: [] };
      }

      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <OrganizationsWorkspace />
        </LocaleProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Карта" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Выбрать университет на карте",
      }),
    );

    expect(await screen.findByText("Анна Смирнова")).toBeInTheDocument();
    expect(screen.getByText("Проректор")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "anna@example.test" }),
    ).toHaveAttribute("href", "mailto:anna@example.test");
    expect(screen.queryByText("Контакты не указаны")).not.toBeInTheDocument();

    await waitFor(() => {
      const contactUrl = fetchMock.mock.calls
        .map(([input]) => new URL(String(input), "http://localhost"))
        .find((url) => url.pathname === "/api/catalog/organization-contacts/");

      expect(contactUrl?.searchParams.get("organization__ids")).toBe(
        "organization-1",
      );
    });
  });

  it("opens the organization card in a drawer from the list", async () => {
    const selectedOrganization = {
      ...organization("organization-1", "Тюменский университет"),
      rank: 3,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const body =
        url.pathname === "/api/catalog/organizations/"
          ? {
              count: 1,
              next: null,
              previous: null,
              results: [selectedOrganization],
            }
          : url.pathname === "/api/catalog/organizations/organization-1/"
            ? selectedOrganization
            : { count: 0, next: null, previous: null, results: [] };

      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <OrganizationsWorkspace />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Список" }));
    const name = await screen.findByText("Тюменский университет");
    // Тип организации — чип сразу после места, под кнопкой карточки
    expect(
      within(name.closest("article")!).getByText("Вуз"),
    ).toBeInTheDocument();
    fireEvent.click(name.closest("button")!);

    const drawer = await screen.findByRole("dialog");
    expect(
      await within(drawer).findByRole("heading", {
        name: "Тюменский университет",
      }),
    ).toBeInTheDocument();
    expect(within(drawer).getByText("3 место")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input]) =>
            new URL(String(input), "http://localhost").searchParams.get(
              "organization__ids",
            ) === "organization-1",
        ),
      ).toBe(true),
    );
  });

  it("loads the next page when the user clicks the load-more button", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const isSecondPage =
        new URL(url, "http://localhost").searchParams.get("page") === "2";
      const body = isSecondPage
        ? {
            count: 3,
            next: null,
            previous: "/api/catalog/organizations/?page=1&page_size=20",
            results: [organization("3", "Третий университет")],
          }
        : {
            count: 3,
            next: "/api/catalog/organizations/?page=2&page_size=20",
            previous: null,
            results: [
              organization("1", "Первый университет"),
              organization("2", "Второй университет"),
            ],
          };

      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <OrganizationsWorkspace />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Список" }));

    expect(await screen.findByText("Первый университет")).toBeInTheDocument();
    expect(screen.getByText("3 организаций")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Подгрузить" }));

    expect(await screen.findByText("Третий университет")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Подгрузить" })).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/catalog/organizations/?page=2&page_size=20",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("sends the debounced search value to the organizations endpoint", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const search = url.searchParams.get("search");
      const results = search
        ? [organization("1", "Тюменский университет")]
        : [organization("2", "Первый университет")];

      return new Response(
        JSON.stringify({
          count: results.length,
          next: null,
          previous: null,
          results,
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <OrganizationsWorkspace />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Список" }));

    expect(await screen.findByText("Первый университет")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Поиск организаций" }),
      {
        target: { value: "  Тюмень  " },
      },
    );

    expect(
      await screen.findByText("Тюменский университет"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/catalog/organizations/?page=1&page_size=20&search=%D0%A2%D1%8E%D0%BC%D0%B5%D0%BD%D1%8C",
        expect.objectContaining({ credentials: "include" }),
      ),
    );
  });

  it("shows all organizations by default and filters by interactions and activity", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            count: 1,
            next: null,
            previous: null,
            results: [organization("1", "Первый университет")],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <OrganizationsWorkspace />
        </LocaleProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Список" }));

    expect(await screen.findByText("Первый университет")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog/organizations/?page=1&page_size=20",
      expect.objectContaining({ credentials: "include" }),
    );

    fireEvent.click(
      within(screen.getByRole("group", { name: "Взаимодействия" })).getByRole(
        "button",
        { name: "Есть" },
      ),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/catalog/organizations/?has_interactions=true&page=1&page_size=20",
        expect.objectContaining({ credentials: "include" }),
      ),
    );

    fireEvent.click(
      within(screen.getByRole("group", { name: "Активность" })).getByRole(
        "button",
        { name: "Неактивные" },
      ),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/catalog/organizations/?has_interactions=true&is_active=false&page=1&page_size=20",
        expect.objectContaining({ credentials: "include" }),
      ),
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Тип" }), {
      target: { value: "company" },
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/catalog/organizations/?has_interactions=true&is_active=false&organization_type=company&page=1&page_size=20",
        expect.objectContaining({ credentials: "include" }),
      ),
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Тип" }), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Топ-10" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/catalog/organizations/?has_rank=true&rank_max=10&has_interactions=true&is_active=false&ordering=rank&page=1&page_size=20",
        expect.objectContaining({ credentials: "include" }),
      ),
    );
  });
});
