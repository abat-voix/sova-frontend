import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InteractionContractsList } from "@/components/action-features/interaction-contracts-list";
import { LocaleProvider } from "@/providers/locale-provider";
import type { Contract } from "@/types/contract";

function contract(
  id: string,
  contractNumber: string,
  overrides: Partial<Contract> = {},
): Contract {
  return {
    id,
    contract_number: contractNumber,
    sent_at: null,
    corrected_at: null,
    signed_at: null,
    file_name: "",
    download_url: null,
    files_count: 0,
    interaction: {
      id: "interaction-1",
      organization: { id: "organization-1", name: "Академия" },
      b2c_client: null,
    },
    created_at: "2026-09-27T10:00:00Z",
    updated_at: "2026-09-27T10:00:00Z",
    ...overrides,
  };
}

function renderList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <InteractionContractsList interactionId="interaction-1" />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("interaction contracts list", () => {
  it("loads every page and shows statuses and current files", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      expect(url).toContain("interaction__ids=interaction-1");
      if (url.includes("page=2")) {
        return new Response(
          JSON.stringify({
            count: 2,
            next: null,
            previous: "page-1",
            results: [
              contract("contract-2", "Д-2", {
                signed_at: "2026-09-03",
              }),
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          count: 2,
          next: "page-2",
          previous: null,
          results: [
            contract("contract-1", "Д-1", {
              sent_at: "2026-09-01",
              file_name: "contract.pdf",
              download_url: "/api/interactions/contracts/contract-1/download/",
              files_count: 2,
            }),
          ],
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderList();

    expect(await screen.findByText("Д-1")).toBeTruthy();
    expect(await screen.findByText("Д-2")).toBeTruthy();
    expect(screen.getByText("Отправлен")).toBeTruthy();
    expect(screen.getByText("Подписан")).toBeTruthy();
    expect(screen.getByText(/Текущий файл: contract.pdf/)).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: "Скачать текущий файл: Д-1",
      }),
    ).toHaveAttribute(
      "href",
      "/api/interactions/contracts/contract-1/download/",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
