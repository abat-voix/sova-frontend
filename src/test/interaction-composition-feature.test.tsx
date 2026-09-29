import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InteractionCompositionFeature } from "@/components/action-features/interaction-composition-feature";
import { LocaleProvider } from "@/providers/locale-provider";
import type {
  ActionFeatureCode,
  InteractionCompositionFeatureInitial,
} from "@/types/action-feature";

const initial: InteractionCompositionFeatureInitial = {
  directions: [
    {
      id: "interaction-direction-1",
      catalog_id: "direction-1",
      name: "Разработка",
      related_programs_count: 1,
    },
  ],
  programs: [
    {
      id: "interaction-program-1",
      catalog_id: "program-1",
      name: "Python",
      direction: { id: "direction-1", name: "Разработка" },
      related_products_count: 0,
    },
  ],
  products: [],
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function renderFeature(featureCode: ActionFeatureCode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <InteractionCompositionFeature
          actionInstanceId="action-1"
          csrfToken="csrf-token"
          featureCode={featureCode}
          interaction={{
            id: "interaction-1",
            organization: { id: "organization-1", name: "Академия" },
            b2c_client: null,
          }}
          workflowInstanceId="workflow-1"
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("interaction composition feature", () => {
  it("adds a program only after choosing its direction", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/interaction_program.add/initial/")) {
        return json(initial);
      }
      if (url.startsWith("/api/catalog/programs/")) {
        expect(url).toContain("direction__ids=direction-1");
        return json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: "program-2",
              name: "Go",
              direction: { id: "direction-1", name: "Разработка" },
              is_active: true,
              products_count: 0,
              created_at: "2026-09-27T00:00:00Z",
              updated_at: "2026-09-27T00:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/features/interaction_program.add/execute/")) {
        expect(init?.method).toBe("POST");
        return json({
          execution: {},
          target: {
            type: "interaction_program",
            id: "interaction-program-2",
            data: { name: "Go" },
          },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderFeature("interaction_program.add");

    expect(
      await screen.findByRole("combobox", { name: "Программа" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "Направление" }));
    fireEvent.click(await screen.findByRole("option", { name: "Разработка" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Программа" }));
    fireEvent.click(await screen.findByRole("option", { name: "Go" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/features/interaction_program.add/execute/"),
      );
      expect(call?.[1]?.body).toBe(JSON.stringify({ program: "program-2" }));
    });
    expect(await screen.findByText(/Добавлено: Go/)).toBeTruthy();
  });

  it("adds a product to the selected interaction program", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/interaction_product.add/initial/")) {
        return json(initial);
      }
      if (url.startsWith("/api/catalog/products/")) {
        expect(url).toContain("program__ids=program-1");
        return json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: "product-1",
              name: "IDE",
              is_active: true,
              external_code: null,
              vendor: null,
              programs: [{ id: "program-1", name: "Python" }],
              created_at: "2026-09-27T00:00:00Z",
              updated_at: "2026-09-27T00:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/features/interaction_product.add/execute/")) {
        expect(init?.method).toBe("POST");
        return json({
          execution: {},
          target: {
            type: "interaction_product",
            id: "interaction-product-1",
            data: { name: "IDE" },
          },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderFeature("interaction_product.add");

    fireEvent.click(
      await screen.findByRole("combobox", {
        name: "Программа продукта (необязательно)",
      }),
    );
    fireEvent.click(await screen.findByRole("option", { name: /Python/ }));
    fireEvent.click(screen.getByRole("combobox", { name: "Продукт" }));
    fireEvent.click(await screen.findByRole("option", { name: "IDE" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/features/interaction_product.add/execute/"),
      );
      expect(call?.[1]?.body).toBe(
        JSON.stringify({
          product: "product-1",
          interaction_program: "interaction-program-1",
        }),
      );
    });
  });

  it("requires confirmation before removing a direction", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/interaction_direction.remove/initial/")) {
        return json(initial);
      }
      if (url.includes("/features/interaction_direction.remove/execute/")) {
        expect(init?.method).toBe("POST");
        return json({
          execution: {},
          target: {
            type: "interaction_direction",
            id: "interaction-direction-1",
            data: { name: "Разработка" },
          },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderFeature("interaction_direction.remove");

    fireEvent.click(
      await screen.findByRole("combobox", { name: "Направление" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: /Разработка/ }));
    fireEvent.click(screen.getByRole("button", { name: "Убрать" }));
    expect(
      screen.getByText(
        "Направление станет неактивным. Связанные программы и продукты останутся в составе взаимодействия.",
      ),
    ).toBeTruthy();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes(
          "/features/interaction_direction.remove/execute/",
        ),
      ),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) =>
        String(input).includes(
          "/features/interaction_direction.remove/execute/",
        ),
      );
      expect(call?.[1]?.body).toBe(
        JSON.stringify({ interaction_direction: "interaction-direction-1" }),
      );
    });
  });
});
