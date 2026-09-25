export type ConversationKind = "direct" | "system";

/** Пользователь во вложенном представлении сообщения/беседы (`UserShortSerializer`). */
export type {
  Message,
  MessageAttachment,
  MessagingUser,
  StagedMessageAttachment,
} from "@/lib/realtime/protocol";

import type { Message, MessagingUser } from "@/lib/realtime/protocol";

export type Conversation = {
  id: string;
  kind: ConversationKind;
  /** `null` для системной беседы. */
  other_participant: MessagingUser | null;
  last_message: Message | null;
  unread_count: number;
  last_message_at: string | null;
};
