import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InteractionCardDialog } from "@/components/interactions/interaction-card-dialog";
import { LocaleProvider } from "@/providers/locale-provider";
import type { Interaction } from "@/types/workflow-board";

const interaction: Interaction = {
  id: "interaction-1",
  comment: "Пилот на осенний семестр",
  is_active: true,
  university: { id: "university-1", name: "Академия" },
  b2c_client: null,
  created_at: "2026-01-10T10:00:00Z",
  updated_at: "2026-02-01T10:00:00Z",
  current_responsible: {
    id: "resp-1",
    manager: { id: 1, full_name: "Иван Иванов" },
    assigned_at: "2026-01-10T10:00:00Z",
  },
  directions_count: 1,
  programs_count: 1,
  products_count: 1,
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function paginated(results: unknown[]) {
  return { count: results.length, next: null, previous: null, results };
}

function renderDialog(fetchMock: typeof fetch, onEdit = vi.fn()) {
  vi.stubGlobal("fetch", fetchMock);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <InteractionCardDialog
          interaction={interaction}
          onClose={vi.fn()}
          onEdit={onEdit}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("InteractionCardDialog", () => {
  it("groups directions, programs, and products into a tree", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.startsWith("/api/interactions/interaction-directions/")) {
        return json(
          paginated([
            {
              id: "id-1",
              interaction: interaction.id,
              direction: { id: "direction-1", name: "IT" },
              is_active: true,
              added_at: "2026-01-10T10:00:00Z",
            },
          ]),
        );
      }
      if (url.startsWith("/api/interactions/interaction-programs/")) {
        return json(
          paginated([
            {
              id: "ip-1",
              interaction: interaction.id,
              program: { id: "program-1", name: "Магистратура" },
              direction: { id: "direction-1", name: "IT" },
              is_active: false,
              added_at: "2026-01-10T10:00:00Z",
            },
          ]),
        );
      }
      if (url.startsWith("/api/interactions/interaction-products/")) {
        return json(
          paginated([
            {
              id: "product-link-1",
              interaction: interaction.id,
              interaction_program: "ip-1",
              product: { id: "product-1", name: "Курс аналитики" },
              is_active: true,
              added_at: "2026-01-10T10:00:00Z",
            },
            {
              id: "product-link-2",
              interaction: interaction.id,
              interaction_program: null,
              product: { id: "product-2", name: "Отдельный продукт" },
              is_active: true,
              added_at: "2026-01-10T10:00:00Z",
            },
          ]),
        );
      }
      if (
        url === `/api/interactions/interactions/${interaction.id}/contacts/`
      ) {
        return json([]);
      }
      if (url.startsWith("/api/interactions/contracts/")) {
        return json(paginated([]));
      }
      if (url.startsWith("/api/interactions/licenses/")) {
        return json(paginated([]));
      }
      if (url.startsWith("/api/processes/action-attachments/")) {
        return json(paginated([]));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDialog(fetchMock);

    expect(await screen.findByText("IT")).toBeInTheDocument();
    expect(screen.getByText("Магистратура")).toBeInTheDocument();
    expect(screen.getByText("Курс аналитики")).toBeInTheDocument();
    expect(screen.getByText("Отдельный продукт")).toBeInTheDocument();
    expect(screen.getByText("Продукты без программы")).toBeInTheDocument();
    // Неактивная программа помечена бейджем.
    expect(screen.getAllByText("Неактивно").length).toBeGreaterThan(0);

    const directionsQuery = fetchMock.mock.calls.find(([input]) =>
      String(input).startsWith("/api/interactions/interaction-directions/"),
    );
    expect(
      new URL(
        String(directionsQuery?.[0]),
        "http://localhost",
      ).searchParams.get("interaction__ids"),
    ).toBe(interaction.id);
  });

  it("shows contacts, contracts, licenses, and attachments read-only", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.startsWith("/api/interactions/interaction-directions/"))
        return json(paginated([]));
      if (url.startsWith("/api/interactions/interaction-programs/"))
        return json(paginated([]));
      if (url.startsWith("/api/interactions/interaction-products/"))
        return json(paginated([]));
      if (
        url === `/api/interactions/interactions/${interaction.id}/contacts/`
      ) {
        return json([
          {
            id: "link-1",
            contact_person: {
              id: "contact-1",
              full_name: "Пётр Петров",
              position: "Декан",
              email: "petrov@example.com",
              phone: "+7 900 000-00-00",
            },
            linked_at: "2026-01-10T10:00:00Z",
          },
        ]);
      }
      if (url.startsWith("/api/interactions/contracts/")) {
        return json(
          paginated([
            {
              id: "contract-1",
              file_name: "contract.pdf",
              download_url: "/api/interactions/contracts/contract-1/download/",
              files_count: 1,
              contract_number: "Д-42",
              sent_at: null,
              corrected_at: null,
              signed_at: "2026-01-05",
              interaction: {
                id: interaction.id,
                university: interaction.university,
                b2c_client: null,
              },
              created_at: "2026-01-01T10:00:00Z",
              updated_at: "2026-01-05T10:00:00Z",
            },
          ]),
        );
      }
      if (url.startsWith("/api/interactions/licenses/")) {
        return json(
          paginated([
            {
              id: "license-1",
              created_at: "2026-01-01T10:00:00Z",
              signed_at: "2026-01-05",
              superseded_at: null,
              valid_until_year: 2030,
              is_signed: true,
              is_active: true,
              contract: { id: "contract-1", contract_number: "Д-42" },
              interaction_product: {
                id: "product-link-1",
                interaction: interaction.id,
                product: { id: "product-1", name: "Курс аналитики" },
              },
              created_by: null,
            },
          ]),
        );
      }
      if (url.startsWith("/api/processes/action-attachments/")) {
        return json(
          paginated([
            {
              id: "attachment-1",
              action_instance: "action-1",
              original_name: "Скан.pdf",
              size: 2048,
              content_type: "application/pdf",
              download_url:
                "/api/processes/action-attachments/attachment-1/download/",
              uploaded_at: "2026-01-06T10:00:00Z",
              uploaded_by: { id: 1, full_name: "Иван Иванов" },
            },
          ]),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const onEdit = vi.fn();

    renderDialog(fetchMock, onEdit);

    expect(await screen.findByText("Пётр Петров")).toBeInTheDocument();
    expect(screen.getByText("Д-42")).toBeInTheDocument();
    expect(screen.getByText("Курс аналитики")).toBeInTheDocument();
    expect(screen.getByText("Скан.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Редактировать" }));
    expect(onEdit).toHaveBeenCalledWith(interaction);
  });

  it("shows a retry button when a section fails to load", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.startsWith("/api/interactions/interaction-directions/"))
        return new Response(null, { status: 500 });
      if (url.startsWith("/api/interactions/interaction-programs/"))
        return json(paginated([]));
      if (url.startsWith("/api/interactions/interaction-products/"))
        return json(paginated([]));
      if (url === `/api/interactions/interactions/${interaction.id}/contacts/`)
        return json([]);
      if (url.startsWith("/api/interactions/contracts/"))
        return json(paginated([]));
      if (url.startsWith("/api/interactions/licenses/"))
        return json(paginated([]));
      if (url.startsWith("/api/processes/action-attachments/"))
        return json(paginated([]));
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDialog(fetchMock);

    expect(
      await screen.findByRole("button", { name: "Повторить" }),
    ).toBeInTheDocument();
  });
});
