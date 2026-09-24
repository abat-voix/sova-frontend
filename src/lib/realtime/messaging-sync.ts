import type { QueryClient } from "@tanstack/react-query";

import {
  conversationsQueryKey,
  messagesQueryKey,
  unreadCountQueryKey,
} from "@/lib/api/messaging/messaging";
import type { RealtimeEvent } from "@/lib/realtime/protocol";
import type { PaginatedResponse } from "@/types/api";
import type { Message } from "@/types/messaging";

type PendingInvalidations = {
  timer: ReturnType<typeof setTimeout>;
  messageConversationIds: Set<string>;
};

const pendingInvalidations = new WeakMap<QueryClient, PendingInvalidations>();

function debounceMessagingInvalidation(
  queryClient: QueryClient,
  messageConversationId?: string,
) {
  const current = pendingInvalidations.get(queryClient);
  if (current) {
    if (messageConversationId)
      current.messageConversationIds.add(messageConversationId);
    clearTimeout(current.timer);
  }
  const messageConversationIds = current?.messageConversationIds ?? new Set();
  if (messageConversationId) messageConversationIds.add(messageConversationId);
  const timer = setTimeout(() => {
    pendingInvalidations.delete(queryClient);
    void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey() });
    for (const conversationId of messageConversationIds) {
      void queryClient.invalidateQueries({
        queryKey: messagesQueryKey(conversationId),
      });
    }
  }, 150);
  pendingInvalidations.set(queryClient, { timer, messageConversationIds });
}

export function syncMessagingEvent(
  queryClient: QueryClient,
  event: RealtimeEvent,
) {
  if (event.type === "messaging.message_created") {
    const queryKey = messagesQueryKey(event.data.conversation_id);
    const previous =
      queryClient.getQueryData<PaginatedResponse<Message>>(queryKey);
    if (previous) {
      queryClient.setQueryData<PaginatedResponse<Message>>(queryKey, {
        ...previous,
        count: previous.results.some(
          (item) => item.id === event.data.message.id,
        )
          ? previous.count
          : previous.count + 1,
        results: previous.results.some(
          (item) => item.id === event.data.message.id,
        )
          ? previous.results
          : [event.data.message, ...previous.results],
      });
    } else {
      debounceMessagingInvalidation(queryClient, event.data.conversation_id);
      return;
    }
    debounceMessagingInvalidation(queryClient);
    return;
  }
  if (
    event.type === "messaging.conversation_created" ||
    event.type === "messaging.conversation_read"
  ) {
    debounceMessagingInvalidation(queryClient);
  }
}
