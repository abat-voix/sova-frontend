import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContractCreateFeature } from "@/components/action-features/contract-create-feature";
import { LocaleProvider } from "@/providers/locale-provider";
import type { CreateContractFeatureInitial } from "@/types/action-feature";

const initial: CreateContractFeatureInitial = {
  templates: [{ id: "template-1", name: "Договор" }],
  contacts: [{ id: "contact-1", full_name: "Колоков", position: "Ректор" }],
  document: {
    contract_number: "",
    contract_date: null,
    city: "Москва",
    counterparty: {
      name: "Академия",
      short_name: "",
      inn: "7700000000",
      address: "",
      email: "",
      phone: "",
    },
    signatory: { full_name: "", position: "", basis: "" },
    products: ["Продукт A", "Продукт B"],
    amount: null,
    comment: "",
  },
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("contract create feature", () => {
  it("prefills the modal from the backend and sends the contract JSON", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/contract.create/initial/")) {
        return json(initial);
      }
      if (url.includes("/features/contract.create/execute/")) {
        expect(init?.method).toBe("POST");
        return json({
          execution: {},
          target: {
            type: "contract",
            id: "contract-1",
            data: { contract_number: "Д-7", file_generated: false },
          },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <ContractCreateFeature
            actionInstanceId="action-1"
            csrfToken="csrf-token"
            executionNo={1}
            workflowInstanceId="workflow-1"
          />
        </LocaleProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Заполнить договор" }));

    const name = await screen.findByLabelText("Полное наименование *");
    expect(name).toHaveProperty("value", "Академия");

    fireEvent.change(screen.getByLabelText("Номер договора"), {
      target: { value: "Д-7" },
    });
    fireEvent.change(screen.getByLabelText("Из контактов взаимодействия"), {
      target: { value: "contact-1" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Продукт A" }));
    fireEvent.change(screen.getByLabelText("Сумма, ₽"), {
      target: { value: "1000,50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Создать договор" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/features/contract.create/execute/"),
      );
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        template: "template-1",
        document: {
          ...initial.document,
          contract_number: "Д-7",
          signatory: { full_name: "Колоков", position: "Ректор", basis: "" },
          products: ["Продукт B"],
          amount: "1000.50",
        },
      });
    });
    expect(
      await screen.findByText(/Создан договор: Д-7 · файл пока не сформирован/),
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
