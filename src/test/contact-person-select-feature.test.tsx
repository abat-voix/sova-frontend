import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  contactPersonOptions,
  ContactPersonSelectFeature,
} from "@/components/action-features/contact-person-select-feature";
import { LocaleProvider } from "@/providers/locale-provider";
import type { ContactPerson } from "@/types/contact-person";

const contact: ContactPerson = {
  b2c_client: null,
  created_at: "2026-09-22T00:00:00Z",
  email: "2@1.ru",
  full_name: "Колоков",
  id: "contact-1",
  is_active: true,
  phone: "89999999912",
  position: "Директор",
  university: { id: "university-1", name: "Академия" },
  updated_at: "2026-09-22T00:00:00Z",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("contact person select options", () => {
  it("supports a bare array response from the catalog", () => {
    expect(contactPersonOptions([contact])).toEqual([
      { id: "contact-1", name: "Колоков · Директор" },
    ]);
  });

  it("supports a paginated catalog response", () => {
    expect(
      contactPersonOptions({
        count: 1,
        next: null,
        previous: null,
        results: [contact],
      }),
    ).toEqual([{ id: "contact-1", name: "Колоков · Директор" }]);
  });

  it("executes the new link feature with the selected contact", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/contacts/")) {
        return new Response("[]", {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
      if (url.startsWith("/api/catalog/contact-persons/")) {
        return new Response(
          JSON.stringify({
            count: 1,
            next: null,
            previous: null,
            results: [contact],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      if (url.includes("/features/contact_person.link/execute/")) {
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            execution: {},
            target: { type: "contact_person", id: contact.id },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
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
          <ContactPersonSelectFeature
            actionInstanceId="action-1"
            csrfToken="csrf-token"
            featureCode="contact_person.link"
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

    fireEvent.click(screen.getByRole("combobox", { name: "Контактное лицо" }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Колоков · Директор" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Привязать" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/features/contact_person.link/execute/"),
      );
      expect(call?.[1]?.body).toBe(
        JSON.stringify({ contact_person: contact.id }),
      );
      expect(call?.[1]?.headers).toMatchObject({ "x-csrftoken": "csrf-token" });
    });
  });
});
