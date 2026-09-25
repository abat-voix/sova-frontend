import { describe, expect, it } from "vitest";

import { parseRealtimeEvent } from "@/lib/realtime/protocol";

const base = {
  version: 1,
  id: "0199f5db-2778-7000-8000-000000000001",
  occurred_at: "2026-09-24T12:00:00.000Z",
};

function messageEvent(messageOverrides: Record<string, unknown> = {}) {
  return {
    ...base,
    type: "messaging.message_created",
    data: {
      conversation_id: "0199f5db-2778-7000-8000-000000000002",
      message: {
        id: "0199f5db-2778-7000-8000-000000000003",
        conversation: "0199f5db-2778-7000-8000-000000000002",
        sender: { id: 1, email: "user@example.com", full_name: "User" },
        text: "hello",
        link: "",
        created_at: "2026-09-24T12:00:00.000Z",
        ...messageOverrides,
      },
    },
  };
}

describe("parseRealtimeEvent", () => {
  it("parses a message event and permits additive fields", () => {
    const result = parseRealtimeEvent({
      ...messageEvent(),
      future_field: true,
    });

    expect(result.kind).toBe("event");
    if (result.kind === "event" && result.event.type === "messaging.message_created") {
      expect(result.event.data.message.attachments).toEqual([]);
    }
  });

  it("parses a complete message attachment", () => {
    const attachment = {
      id: "0199f5db-2778-7000-8000-000000000004",
      original_name: "document.pdf",
      size: 2048,
      content_type: "application/pdf",
      download_url: "/server-provided-download/",
    };
    const result = parseRealtimeEvent(messageEvent({ attachments: [attachment] }));

    expect(result.kind).toBe("event");
    if (result.kind === "event" && result.event.type === "messaging.message_created") {
      expect(result.event.data.message.attachments).toEqual([attachment]);
    }
  });

  it.each([
    { id: "not-a-uuid" },
    { size: -1 },
    { download_url: undefined },
  ])("rejects an invalid attachment: %o", (override) => {
    const attachment = {
      id: "0199f5db-2778-7000-8000-000000000004",
      original_name: "document.pdf",
      size: 2048,
      content_type: "application/pdf",
      download_url: "/server-provided-download/",
      ...override,
    };

    expect(
      parseRealtimeEvent(messageEvent({ attachments: [attachment] })).kind,
    ).toBe("invalid");
  });

  it("distinguishes unsupported versions and types", () => {
    expect(
      parseRealtimeEvent({ ...base, version: 2, type: "future", data: {} }),
    ).toMatchObject({
      kind: "unsupported",
      version: 2,
    });
    expect(
      parseRealtimeEvent({ ...base, type: "future", data: {} }),
    ).toMatchObject({
      kind: "unsupported",
      type: "future",
    });
  });

  it("rejects malformed timestamps and missing payload fields", () => {
    expect(
      parseRealtimeEvent({
        ...base,
        occurred_at: "yesterday",
        type: "messaging.conversation_created",
        data: {},
      }).kind,
    ).toBe("invalid");
  });
});
