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

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/interactions/new-interaction-dialog", () => ({
  // Заглушка формы: проверяем только, что открылась и что делает workspace после неё
  NewInteractionDialog: ({
    onClose,
    onCreated,
    preselectedCounterparty,
  }: {
    onClose: () => void;
    onCreated: (interactionId: string) => void;
    preselectedCounterparty: { name: string };
  }) => (
    <div aria-label="Новое взаимодействие" role="dialog">
      {preselectedCounterparty.name}
      <button onClick={onClose} type="button">
        Отменить форму
      </button>
      <button onClick={() => onCreated("i1")} type="button">
        Создать в форме
      </button>
    </div>
  ),
}));

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
  is_active: true,
  created_at: "2026-09-01T10:00:00+03:00",
  updated_at: "2026-09-02T10:00:00+03:00",
  rank: 2,
  address: { country_code: "", region: "Тюменская область", city: "Тюмень" },
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
    expect(screen.getByText("2 место")).toBeInTheDocument();
  });

  it("filters the list by the ranking and orders it by place", async () => {
    const urls = stubCatalog();
    renderWorkspace();
    await screen.findByText("ООО «Ромашка»");

    fireEvent.click(screen.getByRole("button", { name: "С местом" }));

    await waitFor(() =>
      expect(
        urls.some((url) => {
          const params = new URL(url, "http://localhost").searchParams;
          return (
            url.startsWith("/api/catalog/b2c-clients/?") &&
            params.get("has_rank") === "true" &&
            params.get("ordering") === "rank"
          );
        }),
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

  it("closes the inspector while creating an interaction from it and brings it back after", async () => {
    stubCatalog();
    renderWorkspace();
    fireEvent.click(await screen.findByText("ООО «Ромашка»"));
    const inspector = await screen.findByRole("dialog");
    fireEvent.click(
      await within(inspector).findByRole("button", {
        name: "Создать взаимодействие",
      }),
    );

    // Форма одна на экране — инспектор её не перекрывает
    const form = screen.getByRole("dialog");
    expect(form).toHaveAccessibleName("Новое взаимодействие");
    expect(within(form).getByText("ООО «Ромашка»")).toBeInTheDocument();

    fireEvent.click(
      within(form).getByRole("button", { name: "Отменить форму" }),
    );
    expect(
      await within(await screen.findByRole("dialog")).findByRole("heading", {
        name: "ООО «Ромашка»",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Создать взаимодействие",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Создать в форме" }));
    expect(
      await within(await screen.findByRole("dialog")).findByRole("heading", {
        name: "ООО «Ромашка»",
      }),
    ).toBeInTheDocument();
  });
});
