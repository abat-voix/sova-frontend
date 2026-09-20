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

const university = (id: string, name: string): University => ({
  id,
  name,
  inn: null,
  external_code: null,
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

    expect(await screen.findByText("Первый университет")).toBeInTheDocument();
    expect(screen.getByText("3 организаций")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Подгрузить" }));

    expect(await screen.findByText("Третий университет")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Подгрузить" })).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/catalog/universities/?page=2&page_size=20",
      expect.objectContaining({ credentials: "same-origin" }),
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
        expect.objectContaining({ credentials: "same-origin" }),
      ),
    );
  });
});
