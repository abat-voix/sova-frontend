import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContactPersonUpdateFeature } from "@/components/action-features/contact-person-update-feature";
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

describe("contact person update feature", () => {
  it("prefills a linked contact and executes the update feature", async () => {
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
      if (url.includes("/features/contact_person.update/execute/")) {
        expect(init?.method).toBe("POST");
        return json({
          execution: {},
          target: {
            type: "contact_person",
            id: "contact-1",
            data: { full_name: "Иван Сидоров" },
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
          <ContactPersonUpdateFeature
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
    expect(screen.getByLabelText("ФИО *")).toHaveProperty(
      "value",
      "Иван Петров",
    );

    fireEvent.change(screen.getByLabelText("ФИО *"), {
      target: { value: "Иван Сидоров" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Сохранить изменения" }),
    );

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/features/contact_person.update/execute/"),
      );
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        contact_person: "contact-1",
        full_name: "Иван Сидоров",
        position: "Менеджер",
        email: "old@example.test",
        phone: "+79990000000",
      });
      expect(call?.[1]?.headers).toMatchObject({
        "x-csrftoken": "csrf-token",
      });
    });
    expect(
      await screen.findByText(/Обновлён контакт: Иван Сидоров/),
    ).toBeTruthy();
  });
});
