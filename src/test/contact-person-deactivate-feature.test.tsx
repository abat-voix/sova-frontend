import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContactPersonDeactivateFeature } from "@/components/action-features/contact-person-deactivate-feature";
import { LocaleProvider } from "@/providers/locale-provider";

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

describe("contact person deactivate feature", () => {
  it("requires confirmation before deactivating a linked contact", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/contacts/")) {
        return json([
          {
            id: "link-1",
            linked_at: "2026-09-27T10:00:00Z",
            contact_person: {
              id: "contact-1",
              full_name: "Иван Петров",
              position: "Менеджер",
              email: "old@example.test",
              phone: "+79990000000",
            },
          },
        ]);
      }
      if (url.includes("/features/contact_person.deactivate/execute/")) {
        expect(init?.method).toBe("POST");
        return json({
          execution: {},
          target: {
            type: "contact_person",
            id: "contact-1",
            data: { full_name: "Иван Петров" },
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
          <ContactPersonDeactivateFeature
            actionInstanceId="action-1"
            csrfToken="csrf-token"
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

    fireEvent.click(
      await screen.findByRole("combobox", { name: "Контактное лицо" }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "Иван Петров · Менеджер" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Деактивировать контакт" }),
    );
    expect(
      screen.getByText(
        "Контакт станет недоступен для новых привязок во всех взаимодействиях.",
      ),
    ).toBeTruthy();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/features/contact_person.deactivate/execute/"),
      ),
    ).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: "Подтвердить деактивацию" }),
    );
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/features/contact_person.deactivate/execute/"),
      );
      expect(call?.[1]?.body).toBe(
        JSON.stringify({ contact_person: "contact-1" }),
      );
    });
    expect(
      await screen.findByText(/Деактивирован контакт: Иван Петров/),
    ).toBeTruthy();
  });
});
