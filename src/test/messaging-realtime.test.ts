import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  conversationsQueryKey,
  messagesQueryKey,
} from "@/lib/api/messaging/messaging";
import { syncMessagingEvent } from "@/lib/realtime/messaging-sync";
import type { RealtimeEvent } from "@/lib/realtime/protocol";
import type { PaginatedResponse } from "@/types/api";
import type { Message } from "@/types/messaging";

const conversationId = "0199f5db-2778-7000-8000-000000000002";
const message: Message = {
  id: "0199f5db-2778-7000-8000-000000000003",
  conversation: conversationId,
  sender: null,
  text: "hello",
  link: "",
  created_at: "2026-09-24T12:00:00.000Z",
};
const event: RealtimeEvent = {
  version: 1,
  id: "0199f5db-2778-7000-8000-000000000001",
  type: "messaging.message_created",
  occurred_at: "2026-09-24T12:00:00.000Z",
  data: { conversation_id: conversationId, message },
};

afterEach(() => vi.useRealTimers());

describe("syncMessagingEvent", () => {
  it("adds an event once to an already loaded first page", () => {
    const client = new QueryClient();
    const page: PaginatedResponse<Message> = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
    client.setQueryData(messagesQueryKey(conversationId), page);

    syncMessagingEvent(client, event);
    syncMessagingEvent(client, event);

    expect(
      client.getQueryData<PaginatedResponse<Message>>(
        messagesQueryKey(conversationId),
      ),
    ).toMatchObject({
      count: 1,
      results: [message],
    });
  });

  it("debounces list invalidation during a burst", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    client.setQueryData(conversationsQueryKey(), []);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    for (let index = 0; index < 20; index += 1)
      syncMessagingEvent(client, event);
    await vi.advanceTimersByTimeAsync(150);

    expect(
      invalidate.mock.calls.filter(
        ([filters]) =>
          filters?.queryKey?.[1] === "conversations" &&
          filters.queryKey.length === 2,
      ),
    ).toHaveLength(1);
  });
});
