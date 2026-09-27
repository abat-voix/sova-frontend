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

import { B2CClientsWorkspace } from "@/components/b2c-clients/b2c-clients-workspace";
import { LocaleProvider } from "@/providers/locale-provider";
import { kamPermissions } from "@/test/fixtures/permissions";
import type { B2CClient } from "@/types/catalog";

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

const company: B2CClient = {
  id: "b1",
  full_name: "ООО «Ромашка»",
  inn: "7700000000",
  email: "info@romashka.ru",
  phone: "+7 900 000-00-02",
  kind: "legal_entity",
  is_active: true,
  created_at: "2026-09-01T10:00:00+03:00",
  updated_at: "2026-09-02T10:00:00+03:00",
};

function stubCatalog() {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      urls.push(url);

      const body = url.startsWith("/api/catalog/b2c-clients/b1/")
        ? company
        : url.startsWith("/api/catalog/b2c-clients/?")
          ? { count: 1, next: null, previous: null, results: [company] }
          : { count: 0, next: null, previous: null, results: [] };

      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }),
  );

  return urls;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <B2CClientsWorkspace />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("B2CClientsWorkspace", () => {
  it("shows client cards with the total count", async () => {
    stubCatalog();
    renderWorkspace();

    expect(await screen.findByText("ООО «Ромашка»")).toBeInTheDocument();
    expect(screen.getByText("1 клиентов")).toBeInTheDocument();
    expect(screen.getByText("info@romashka.ru")).toBeInTheDocument();
  });

  it("filters the list by the client type", async () => {
    const urls = stubCatalog();
    renderWorkspace();
    await screen.findByText("ООО «Ромашка»");

    fireEvent.click(screen.getByRole("button", { name: "Физлицо" }));

    await waitFor(() =>
      expect(
        urls.some(
          (url) =>
            url.startsWith("/api/catalog/b2c-clients/?") &&
            new URL(url, "http://localhost").searchParams.get("kind") ===
              "individual",
        ),
      ).toBe(true),
    );
  });

  it("opens the client card with its contact people", async () => {
    const urls = stubCatalog();
    renderWorkspace();

    fireEvent.click(await screen.findByText("ООО «Ромашка»"));

    const drawer = await screen.findByRole("dialog");
    expect(
      within(drawer).getByRole("heading", { name: "ООО «Ромашка»" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(urls.some((url) => url.includes("b2c_client__ids=b1"))).toBe(true),
    );
  });
});
