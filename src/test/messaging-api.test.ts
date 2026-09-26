import { afterEach, describe, expect, it, vi } from "vitest";

import { apiEndpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/http";
import {
  addInteractionChatParticipants,
  createInteractionChat,
  deleteMessageAttachment,
  getConversation,
  getInteractionChat,
  sendMessage,
  uploadMessageAttachment,
} from "@/lib/api/messaging/messaging";

afterEach(() => vi.unstubAllGlobals());

describe("messaging attachments API", () => {
  it("uploads FormData without setting content-type", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        id: "0199f5db-2778-7000-8000-000000000004",
        original_name: "document.pdf",
        size: 4,
        content_type: "application/pdf",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["test"], "document.pdf", {
      type: "application/pdf",
    });

    await uploadMessageAttachment(file, "csrf-token");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(apiEndpoints.messaging.attachments.list);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBe(file);
    expect(init?.headers).toEqual({ "x-csrftoken": "csrf-token" });
    expect(
      Object.keys(init?.headers as Record<string, string>).some(
        (name) => name.toLowerCase() === "content-type",
      ),
    ).toBe(false);
  });

  it("deletes a staged attachment using its detail URL and CSRF", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(null, { status: 204 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const id = "0199f5db-2778-7000-8000-000000000004";

    await deleteMessageAttachment(id, "csrf-token");

    expect(fetchMock).toHaveBeenCalledWith(
      apiEndpoints.messaging.attachments.detail(id),
      expect.objectContaining({
        method: "DELETE",
        headers: { "x-csrftoken": "csrf-token" },
      }),
    );
  });

  it("sends text and attachment IDs as JSON", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ id: "message-id" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const payload = {
      text: "hello",
      attachment_ids: ["0199f5db-2778-7000-8000-000000000004"],
    };

    await sendMessage("conversation-id", payload, "csrf-token");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      apiEndpoints.messaging.conversations.messages("conversation-id"),
    );
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        "x-csrftoken": "csrf-token",
      },
    });
    expect(String(url)).not.toContain("/download/");
  });
});

describe("interaction chat API", () => {
  it("fetches the conversation detail by conversation id", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ id: "conversation-id" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getConversation("conversation-id");

    expect(fetchMock).toHaveBeenCalledWith(
      apiEndpoints.messaging.conversations.detail("conversation-id"),
      expect.anything(),
    );
  });

  it("surfaces a 404 (no chat yet) as an ApiError with that status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => new Response(null, { status: 404 })),
    );

    await expect(getInteractionChat("interaction-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("surfaces a 403 (chat exists, no access) as an ApiError with that status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => new Response(null, { status: 403 })),
    );

    try {
      await getInteractionChat("interaction-1");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }
  });

  it("creates the chat with the picked participant ids", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ id: "conversation-id" }, { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createInteractionChat("interaction-1", [1, 2], "csrf-token");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(apiEndpoints.interactions.interactions.chat("interaction-1"));
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ participant_ids: [1, 2] }),
      headers: {
        "content-type": "application/json",
        "x-csrftoken": "csrf-token",
      },
    });
  });

  it("adds participants to an existing interaction chat", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ id: "conversation-id" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await addInteractionChatParticipants("interaction-1", [3], "csrf-token");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      apiEndpoints.interactions.interactions.chatParticipants("interaction-1"),
    );
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ participant_ids: [3] }),
    });
  });
});
