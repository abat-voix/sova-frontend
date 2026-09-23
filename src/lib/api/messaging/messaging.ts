import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson, postJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type { Conversation, Message } from "@/types/messaging";

export const messagesPageSize = 50;

export function conversationsQueryKey() {
  return ["messaging", "conversations"] as const;
}

export function unreadCountQueryKey() {
  return ["messaging", "unread-count"] as const;
}

export function messagesQueryKey(conversationId: string) {
  return ["messaging", "conversations", conversationId, "messages"] as const;
}

export function getConversations() {
  return getJson<Conversation[]>(apiEndpoints.messaging.conversations.list);
}

/** Открывает личную беседу с пользователем, создавая её при первом обращении. */
export function openDirectConversation(userId: number, csrfToken: string) {
  return postJson<Conversation>(
    apiEndpoints.messaging.conversations.direct,
    { user: userId },
    csrfToken,
  );
}

/** История беседы, страница `page` — самые новые сообщения на первой странице. */
export function getMessages(conversationId: string, page: number) {
  const query = buildQuery({ page, page_size: messagesPageSize });

  return getJson<PaginatedResponse<Message>>(
    `${apiEndpoints.messaging.conversations.messages(conversationId)}?${query}`,
  );
}

export function sendMessage(
  conversationId: string,
  text: string,
  csrfToken: string,
) {
  return postJson<Message>(
    apiEndpoints.messaging.conversations.messages(conversationId),
    { text },
    csrfToken,
  );
}

export function markConversationRead(
  conversationId: string,
  csrfToken: string,
) {
  return postJson<void>(
    apiEndpoints.messaging.conversations.read(conversationId),
    {},
    csrfToken,
  );
}

export function getUnreadCount() {
  return getJson<{ unread_count: number }>(
    apiEndpoints.messaging.conversations.unreadCount,
  );
}
