import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InteractionContactsPanel } from "@/components/interactions/interaction-contacts-panel";
import { LocaleProvider } from "@/providers/locale-provider";
import type { InteractionContact } from "@/types/interaction-contact";

const interaction = {
  id: "interaction-1",
  organization: { id: "organization-1", name: "Академия" },
  b2c_client: null,
};

const contacts = [
  { id: "contact-1", full_name: "Первый", position: "Декан" },
  { id: "contact-2", full_name: "Второй", position: "Директор" },
];

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

describe("InteractionContactsPanel", () => {
  it("links a contact from the next search page and then unlinks it", async () => {
    let links: InteractionContact[] = [];
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/interactions/interactions/interaction-1/contacts/") {
        if (method === "GET") return json(links);
        if (method === "POST") {
          const body = JSON.parse(String(init?.body)) as {
            contact_person: string;
          };
          const chosen = contacts.find(
            (contact) => contact.id === body.contact_person,
          )!;
          const link: InteractionContact = {
            id: "link-1",
            contact_person: {
              email: "",
              full_name: chosen.full_name,
              id: chosen.id,
              phone: "",
              position: chosen.position,
              telegram: "",
            },
            linked_at: "2026-09-22T10:00:00Z",
          };
          links = [link];
          return json(link);
        }
      }
      if (
        url ===
        "/api/interactions/interactions/interaction-1/contacts/contact-2/"
      ) {
        links = [];
        return new Response(null, { status: 204 });
      }
      if (url.startsWith("/api/catalog/organization-contacts/")) {
        const query = new URL(url, "http://localhost").searchParams;
        expect(query.get("organization__ids")).toBe("organization-1");
        expect(query.get("contact__is_active")).toBe("true");
        const page = Number(query.get("page"));
        const contact = contacts[page - 1];
        return json({
          count: 2,
          next: page === 1 ? "?page=2" : null,
          previous: null,
          results: [
            {
              contact: {
                email: "",
                full_name: contact.full_name,
                id: contact.id,
                is_active: true,
                phone: "",
                telegram: "",
              },
              id: `affiliation-${contact.id}`,
              position: contact.position,
              preferred_channels: [],
            },
          ],
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
          <InteractionContactsPanel
            csrfToken="csrf-token"
            interaction={interaction}
          />
        </LocaleProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Контакты пока не привязаны."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Привязать контакт" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Контактное лицо" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Показать ещё" }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "Второй · Директор" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Привязать" }));

    expect(await screen.findByText("Второй")).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).endsWith("/interaction-1/contacts/") &&
        init?.method === "POST",
    );
    expect(postCall?.[1]?.body).toBe(
      JSON.stringify({ contact_person: "contact-2" }),
    );
    expect(postCall?.[1]?.headers).toMatchObject({
      "x-csrftoken": "csrf-token",
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Отвязать контакт: Второй" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Контакты пока не привязаны."),
      ).toBeInTheDocument(),
    );
    expect(fetchMock.mock.calls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          "/api/interactions/interactions/interaction-1/contacts/contact-2/",
          expect.objectContaining({ method: "DELETE" }),
        ]),
      ]),
    );
  });
});
