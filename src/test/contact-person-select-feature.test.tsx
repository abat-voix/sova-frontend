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
  affiliationOptions,
  ContactPersonSelectFeature,
} from "@/components/action-features/contact-person-select-feature";
import { LocaleProvider } from "@/providers/locale-provider";
import type { OrganizationAffiliation } from "@/types/contact-person";

const affiliation: OrganizationAffiliation = {
  contact: {
    email: "2@1.ru",
    full_name: "Колоков",
    id: "contact-1",
    is_active: true,
    phone: "89999999912",
    telegram: "",
  },
  created_at: "2026-09-22T00:00:00Z",
  id: "affiliation-1",
  position: "Директор",
  preferred_channels: [],
  products: [],
  updated_at: "2026-09-22T00:00:00Z",
};
const contact = affiliation.contact;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("contact person select options", () => {
  it("offers the person with the position at this organization", () => {
    expect(
      affiliationOptions({
        count: 1,
        next: null,
        previous: null,
        results: [affiliation],
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
      if (url.startsWith("/api/catalog/university-contacts/")) {
        const query = new URL(url, "http://localhost").searchParams;
        expect(query.get("university__ids")).toBe("university-1");
        expect(query.get("contact__is_active")).toBe("true");
        return new Response(
          JSON.stringify({
            count: 1,
            next: null,
            previous: null,
            results: [affiliation],
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

  it("explains that a found contact is already linked", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/contacts/")) {
        return new Response(
          JSON.stringify([
            {
              id: "link-1",
              linked_at: "2026-09-27T12:40:57Z",
              contact_person: { ...contact, position: affiliation.position },
            },
          ]),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      if (url.startsWith("/api/catalog/university-contacts/")) {
        return new Response(
          JSON.stringify({
            count: 1,
            next: null,
            previous: null,
            results: [affiliation],
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
    fireEvent.change(
      await screen.findByRole("searchbox", {
        name: "Контактное лицо: Поиск…",
      }),
      { target: { value: "Кол" } },
    );

    expect(
      await screen.findByText(
        "Все найденные контакты уже привязаны к взаимодействию.",
      ),
    ).toBeTruthy();
  });
});
