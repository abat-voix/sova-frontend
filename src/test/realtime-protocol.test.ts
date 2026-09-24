import { describe, expect, it } from "vitest";

import { parseRealtimeEvent } from "@/lib/realtime/protocol";

const base = {
  version: 1,
  id: "0199f5db-2778-7000-8000-000000000001",
  occurred_at: "2026-09-24T12:00:00.000Z",
};

describe("parseRealtimeEvent", () => {
  it("parses a message event and permits additive fields", () => {
    const result = parseRealtimeEvent({
      ...base,
      type: "messaging.message_created",
      future_field: true,
      data: {
        conversation_id: "0199f5db-2778-7000-8000-000000000002",
        message: {
          id: "0199f5db-2778-7000-8000-000000000003",
          conversation: "0199f5db-2778-7000-8000-000000000002",
          sender: { id: 1, email: "user@example.com", full_name: "User" },
          text: "hello",
          link: "",
          created_at: "2026-09-24T12:00:00.000Z",
        },
      },
    });

    expect(result.kind).toBe("event");
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
