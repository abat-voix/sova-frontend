import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateInteractionChatDialog } from "@/components/interactions/create-interaction-chat-dialog";
import { apiEndpoints } from "@/lib/api/endpoints";
import { LocaleProvider } from "@/providers/locale-provider";

function renderDialog(fetchMock: typeof fetch, onCreated = vi.fn()) {
  vi.stubGlobal("fetch", fetchMock);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <CreateInteractionChatDialog
          csrfToken="csrf-token"
          interactionId="interaction-1"
          onClose={vi.fn()}
          onCreated={onCreated}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CreateInteractionChatDialog", () => {
  it("submits the picked participants and reports the created conversation", async () => {
    const onCreated = vi.fn();
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.startsWith(apiEndpoints.messaging.conversations.recipients)) {
        return Response.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 2, full_name: "Other User" }],
        });
      }
      if (
        url === apiEndpoints.interactions.interactions.chat("interaction-1") &&
        init?.method === "POST"
      ) {
        return Response.json({ id: "conversation-1" }, { status: 201 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDialog(fetchMock, onCreated);

    fireEvent.click(screen.getByRole("combobox", { name: "Участники" }));
    fireEvent.click(await screen.findByRole("option", { name: "Other User" }));

    const createButton = screen.getByRole("button", { name: "Создать чат" });
    expect(createButton).toBeEnabled();
    fireEvent.click(createButton);

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("conversation-1"));
    const createCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input) ===
          apiEndpoints.interactions.interactions.chat("interaction-1") &&
        init?.method === "POST",
    );
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      participant_ids: [2],
    });
  });

  it("keeps the selection when creation fails", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.startsWith(apiEndpoints.messaging.conversations.recipients)) {
        return Response.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 2, full_name: "Other User" }],
        });
      }
      if (
        url === apiEndpoints.interactions.interactions.chat("interaction-1") &&
        init?.method === "POST"
      ) {
        return Response.json({ detail: "failed" }, { status: 400 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDialog(fetchMock);

    fireEvent.click(screen.getByRole("combobox", { name: "Участники" }));
    fireEvent.click(await screen.findByRole("option", { name: "Other User" }));
    fireEvent.click(screen.getByRole("button", { name: "Создать чат" }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input) ===
              apiEndpoints.interactions.interactions.chat("interaction-1") &&
            init?.method === "POST",
        ),
      ).toBe(true),
    );
    expect(screen.getByRole("combobox", { name: "Участники" })).toHaveTextContent(
      "Участники · 1",
    );
  });
});
