import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContractOperationFeature } from "@/components/action-features/contract-operation-feature";
import { LocaleProvider } from "@/providers/locale-provider";
import type {
  ActionFeatureCode,
  ContractOperationFeatureInitial,
} from "@/types/action-feature";

const initial: ContractOperationFeatureInitial = {
  contracts: [
    {
      id: "contract-1",
      contract_number: "Д-1",
      sent_at: "2026-09-01",
      corrected_at: null,
      signed_at: null,
      file_name: "draft.docx",
      download_url: "/api/interactions/contracts/contract-1/download/",
      files_count: 1,
    },
  ],
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
        <ContractOperationFeature
          actionInstanceId="action-1"
          csrfToken="csrf-token"
          featureCode={featureCode}
          interaction={{
            id: "interaction-1",
            university: { id: "university-1", name: "Академия" },
            b2c_client: null,
          }}
          workflowInstanceId="workflow-1"
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function featureResponse(data: Record<string, unknown>) {
  return json({
    execution: {},
    target: { type: "contract", id: "contract-1", data },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("contract operation feature", () => {
  it("updates the selected contract number", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/contract.update/initial/")) {
        return json(initial);
      }
      if (url.includes("/features/contract.update/execute/")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({ contract: "contract-1", contract_number: "Д-2" }),
        );
        return featureResponse({ contract_number: "Д-2" });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderFeature("contract.update");

    fireEvent.click(await screen.findByRole("combobox", { name: "Договор" }));
    fireEvent.click(await screen.findByRole("option", { name: /Д-1/ }));
    expect(screen.getByText("draft.docx")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Скачать/ })).toHaveAttribute(
      "href",
      "/api/interactions/contracts/contract-1/download/",
    );
    fireEvent.change(screen.getByLabelText("Номер договора"), {
      target: { value: "Д-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Обновлён договор: Д-2")).toBeTruthy();
  });

  it("marks the selected contract as signed", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/contract.sign/initial/"))
        return json(initial);
      if (url.includes("/features/contract.sign/execute/")) {
        expect(init?.body).toBe(
          JSON.stringify({ contract: "contract-1", signed_at: "2026-09-03" }),
        );
        return featureResponse({ contract_number: "Д-1" });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderFeature("contract.sign");

    fireEvent.click(await screen.findByRole("combobox", { name: "Договор" }));
    fireEvent.click(await screen.findByRole("option", { name: /Д-1/ }));
    fireEvent.change(screen.getByLabelText(/Дата подписания/), {
      target: { value: "2026-09-03" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Отметить подписанным" }),
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("/features/contract.sign/execute/"),
        ),
      ).toBe(true);
    });
  });

  it("uploads a contract file as multipart data", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/contract.file.upload/initial/")) {
        return json(initial);
      }
      if (url.includes("/features/contract.file.upload/execute/")) {
        expect(init?.body).toBeInstanceOf(FormData);
        const body = init?.body as FormData;
        expect(body.get("contract")).toBe("contract-1");
        expect((body.get("file") as File).name).toBe("signed.pdf");
        return featureResponse({ contract_number: "Д-1" });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderFeature("contract.file.upload");

    fireEvent.click(await screen.findByRole("combobox", { name: "Договор" }));
    fireEvent.click(await screen.findByRole("option", { name: /Д-1/ }));
    fireEvent.change(screen.getByLabelText(/Файл договора/), {
      target: {
        files: [
          new File(["signed"], "signed.pdf", { type: "application/pdf" }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("/features/contract.file.upload/execute/"),
        ),
      ).toBe(true);
    });
  });
});
