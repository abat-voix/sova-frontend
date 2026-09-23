import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrganizationsWorkspace } from "@/components/organizations/organizations-workspace";
import { LocaleProvider } from "@/providers/locale-provider";
import type { University } from "@/types/university";

vi.mock("@/components/organizations/organizations-map", () => ({
  OrganizationsMap: ({
    onSelect,
  }: {
    onSelect: (organizationId: string) => void;
  }) => (
    <button onClick={() => onSelect("university-1")} type="button">
      Выбрать университет на карте
    </button>
  ),
}));

const university = (id: string, name: string): University => ({
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
  lat: null,
  lon: null,
  city: "Тюмень",
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OrganizationsWorkspace", () => {
  it("loads and shows contact people for the university selected on the map", async () => {
    const selectedUniversity = university(
      "university-1",
      "Тюменский университет",
    );
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      let body: unknown;

      if (url.pathname === "/api/catalog/universities/map/") {
        body = [
          {
            id: selectedUniversity.id,
            lat: "57.15",
            lon: "65.53",
            has_interactions: false,
          },
        ];
      } else if (url.pathname === "/api/catalog/universities/university-1/") {
        body = selectedUniversity;
      } else if (url.pathname === "/api/catalog/contact-persons/") {
        body = {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: "contact-1",
              full_name: "Анна Смирнова",
              position: "Проректор",
              email: "anna@example.test",
              phone: "+7 900 000-00-00",
              is_active: true,
              university: {
                id: selectedUniversity.id,
                name: selectedUniversity.name,
              },
              b2c_client: null,
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
        .find((url) => url.pathname === "/api/catalog/contact-persons/");

      expect(contactUrl?.searchParams.get("university__ids")).toBe(
        "university-1",
      );
    });
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
            previous: "/api/catalog/universities/?page=1&page_size=20",
            results: [university("3", "Третий университет")],
          }
        : {
            count: 3,
            next: "/api/catalog/universities/?page=2&page_size=20",
            previous: null,
            results: [
              university("1", "Первый университет"),
              university("2", "Второй университет"),
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
      "/api/catalog/universities/?page=2&page_size=20",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("sends the debounced search value to the universities endpoint", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const search = url.searchParams.get("search");
      const results = search
        ? [university("1", "Тюменский университет")]
        : [university("2", "Первый университет")];

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
      screen.getByRole("searchbox", { name: "Поиск университетов" }),
      {
        target: { value: "  Тюмень  " },
      },
    );

    expect(
      await screen.findByText("Тюменский университет"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/catalog/universities/?page=1&page_size=20&search=%D0%A2%D1%8E%D0%BC%D0%B5%D0%BD%D1%8C",
        expect.objectContaining({ credentials: "include" }),
      ),
    );
  });

  it("asks the endpoint for universities with interactions", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            count: 1,
            next: null,
            previous: null,
            results: [university("1", "Первый университет")],
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

    fireEvent.click(screen.getByRole("button", { name: "Есть" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/catalog/universities/?has_interactions=true&page=1&page_size=20",
        expect.objectContaining({ credentials: "include" }),
      ),
    );
  });
});
