import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MessageThread } from "@/components/messaging/message-thread";
import { LocaleProvider } from "@/providers/locale-provider";
import type { Conversation, Message } from "@/types/messaging";

const conversation: Conversation = {
  id: "0199f5db-2778-7000-8000-000000000002",
  kind: "direct",
  other_participant: {
    id: 2,
    email: "other@example.com",
    full_name: "Other User",
  },
  interaction_id: null,
  title: null,
  participants: null,
  can_manage_participants: false,
  last_message: null,
  unread_count: 0,
  last_message_at: null,
};

function conversationJsonFor(url: string) {
  if (url === `/api/messaging/conversations/${conversation.id}/`) {
    return Response.json(conversation);
  }
  return null;
}

const stagedAttachment = {
  id: "0199f5db-2778-7000-8000-000000000004",
  original_name: "document.pdf",
  size: 4,
  content_type: "application/pdf",
};

function page(results: Message[] = []) {
  return { count: results.length, next: null, previous: null, results };
}

function sentMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "0199f5db-2778-7000-8000-000000000005",
    conversation: conversation.id,
    sender: { id: 1, email: "me@example.com", full_name: "Me" },
    text: "",
    link: "",
    created_at: "2026-09-25T12:00:00.000Z",
    attachments: [],
    ...overrides,
  };
}

function renderThread(conversationId: string = conversation.id) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <MessageThread
          conversationId={conversationId}
          csrfToken="csrf-token"
          currentUserId={1}
          onBack={vi.fn()}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function isRequest(
  call: Parameters<typeof fetch>,
  fragment: string,
  method: string,
) {
  return (
    String(call[0]).includes(fragment) &&
    ((call[1]?.method ?? "GET") as string) === method
  );
}

beforeEach(() => {
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = () => {};
  }
  vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(() => {});
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
    "0199f5db-2778-7000-8000-000000000099",
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("MessageThread attachments", () => {
  it("uploads immediately, blocks Enter while pending and sends an attachment-only message", async () => {
    let resolveUpload!: (response: Response) => void;
    const uploadResponse = new Promise<Response>((resolve) => {
      resolveUpload = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (conversationJsonFor(url)) return conversationJsonFor(url)!;
      if (url.endsWith("/attachments/") && init?.method === "POST") {
        return uploadResponse;
      }
      if (url.endsWith("/messages/") && init?.method === "POST") {
        return Response.json(sentMessage());
      }
      if (url.includes("/messages/")) return Response.json(page());
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderThread();
    const file = new File(["test"], "document.pdf", {
      type: "application/pdf",
    });
    const fileInput =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) =>
          isRequest(call, "/attachments/", "POST"),
        ),
      ).toBe(true),
    );
    const sendButton = screen.getByRole("button", { name: "Отправить" });
    expect(sendButton).toBeDisabled();
    fireEvent.keyDown(screen.getByPlaceholderText("Напишите сообщение…"), {
      key: "Enter",
    });
    expect(
      fetchMock.mock.calls.some((call) =>
        isRequest(call, "/messages/", "POST"),
      ),
    ).toBe(false);

    await act(async () => {
      resolveUpload(Response.json(stagedAttachment));
      await uploadResponse;
    });
    await waitFor(() => expect(sendButton).toBeEnabled());
    fireEvent.click(sendButton);

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) =>
          isRequest(call, "/messages/", "POST"),
        ),
      ).toBe(true),
    );
    const sendCall = fetchMock.mock.calls.find((call) =>
      isRequest(call, "/messages/", "POST"),
    );
    expect(JSON.parse(String(sendCall?.[1]?.body))).toEqual({
      text: "",
      attachment_ids: [stagedAttachment.id],
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Удалить document.pdf" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("deletes a ready staged attachment", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (conversationJsonFor(url)) return conversationJsonFor(url)!;
      if (url.endsWith("/attachments/") && init?.method === "POST") {
        return Response.json(stagedAttachment);
      }
      if (url.includes("/messages/")) return Response.json(page());
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderThread();
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["test"], "document.pdf")] },
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Удалить document.pdf" }),
    );

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) =>
          isRequest(call, `/attachments/${stagedAttachment.id}/`, "DELETE"),
        ),
      ).toBe(true),
    );
    expect(
      screen.queryByRole("button", { name: "Удалить document.pdf" }),
    ).not.toBeInTheDocument();
  });

  it("shows an upload error and allows retry", async () => {
    let uploadCount = 0;
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (conversationJsonFor(url)) return conversationJsonFor(url)!;
      if (url.endsWith("/attachments/") && init?.method === "POST") {
        uploadCount += 1;
        return uploadCount === 1
          ? Response.json({ detail: "failed" }, { status: 400 })
          : Response.json(stagedAttachment);
      }
      if (url.includes("/messages/")) return Response.json(page());
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderThread();
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["test"], "document.pdf")] },
    });

    expect(
      await screen.findByText("Не удалось загрузить файл"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Повторить загрузку document.pdf" }),
    );

    await waitFor(() => expect(uploadCount).toBe(2));
    expect(
      await screen.findByRole("button", { name: "Удалить document.pdf" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Не удалось загрузить файл")).toBeNull();
  });

  it("preserves text and uploaded files when sending fails", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (conversationJsonFor(url)) return conversationJsonFor(url)!;
      if (url.endsWith("/attachments/") && init?.method === "POST") {
        return Response.json(stagedAttachment);
      }
      if (url.endsWith("/messages/") && init?.method === "POST") {
        return Response.json({ detail: "send failed" }, { status: 400 });
      }
      if (url.includes("/messages/")) return Response.json(page());
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderThread();
    const textarea = screen.getByPlaceholderText("Напишите сообщение…");
    fireEvent.change(textarea, { target: { value: "keep me" } });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(["test"], "document.pdf")] },
    });
    await screen.findByRole("button", { name: "Удалить document.pdf" });

    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) =>
          isRequest(call, "/messages/", "POST"),
        ),
      ).toBe(true),
    );
    expect(textarea).toHaveValue("keep me");
    expect(
      screen.getByRole("button", { name: "Удалить document.pdf" }),
    ).toBeInTheDocument();
  });

  it("renders an attachment-only message using the server download URL", async () => {
    const serverUrl = "/signed/server/download?token=abc";
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (conversationJsonFor(url)) return conversationJsonFor(url)!;
      if (url.includes("/messages/")) {
        return Response.json(
          page([
            sentMessage({
              attachments: [{ ...stagedAttachment, download_url: serverUrl }],
            }),
          ]),
        );
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderThread();

    const link = await screen.findByRole("link", { name: /document\.pdf/ });
    expect(link).toHaveAttribute("href", serverUrl);
    expect(link).toHaveAttribute("download");
  });
});

describe("MessageThread interaction chat", () => {
  const groupConversation: Conversation = {
    id: "0199f5db-2778-7000-8000-000000000010",
    kind: "interaction",
    other_participant: null,
    interaction_id: "interaction-1",
    title: "Чат по взаимодействию",
    participants: [
      { id: 1, email: "me@example.com", full_name: "Me" },
      { id: 2, email: "other@example.com", full_name: "Other User" },
    ],
    can_manage_participants: true,
    last_message: null,
    unread_count: 0,
    last_message_at: null,
  };

  function groupFetchMock() {
    return vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url === `/api/messaging/conversations/${groupConversation.id}/`) {
        return Response.json(groupConversation);
      }
      if (url.includes("/messages/")) {
        return Response.json(
          page([
            sentMessage({
              id: "0199f5db-2778-7000-8000-000000000011",
              conversation: groupConversation.id,
              sender: {
                id: 2,
                email: "other@example.com",
                full_name: "Other User",
              },
              text: "Привет из группы",
            }),
          ]),
        );
      }
      return new Response(null, { status: 204 });
    });
  }

  it("shows the sender's name above incoming group messages", async () => {
    vi.stubGlobal("fetch", groupFetchMock());
    renderThread(groupConversation.id);

    expect(await screen.findByText("Привет из группы")).toBeInTheDocument();
    expect(screen.getByText("Other User")).toBeInTheDocument();
  });

  it("only shows 'Add participants' when can_manage_participants is true", async () => {
    vi.stubGlobal("fetch", groupFetchMock());
    renderThread(groupConversation.id);

    expect(
      await screen.findByRole("button", { name: "Добавить участников" }),
    ).toBeInTheDocument();
  });

  it("hides 'Add participants' when the caller cannot manage them", async () => {
    const restricted = { ...groupConversation, can_manage_participants: false };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const url = String(input);
        if (url === `/api/messaging/conversations/${restricted.id}/`) {
          return Response.json(restricted);
        }
        if (url.includes("/messages/")) return Response.json(page());
        return new Response(null, { status: 204 });
      }),
    );
    renderThread(restricted.id);

    await screen.findByText("Чат по взаимодействию");
    expect(
      screen.queryByRole("button", { name: "Добавить участников" }),
    ).not.toBeInTheDocument();
  });
});
