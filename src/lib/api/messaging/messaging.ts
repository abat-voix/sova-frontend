import { apiEndpoints } from "@/lib/api/endpoints";
import {
  buildQuery,
  deleteJson,
  getJson,
  postFormData,
  postJson,
} from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  Conversation,
  Message,
  StagedMessageAttachment,
} from "@/types/messaging";

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

export type SendMessagePayload = {
  text: string;
  attachment_ids: string[];
};

export function uploadMessageAttachment(file: File, csrfToken: string) {
  const body = new FormData();
  body.append("file", file);

  return postFormData<StagedMessageAttachment>(
    apiEndpoints.messaging.attachments.list,
    body,
    csrfToken,
  );
}

export function deleteMessageAttachment(id: string, csrfToken: string) {
  return deleteJson(apiEndpoints.messaging.attachments.detail(id), csrfToken);
}

export function sendMessage(
  conversationId: string,
  payload: SendMessagePayload,
  csrfToken: string,
) {
  return postJson<Message>(
    apiEndpoints.messaging.conversations.messages(conversationId),
    payload,
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
