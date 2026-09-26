export type ConversationKind = "direct" | "system" | "interaction";

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
  /** Только для `direct`. */
  other_participant: MessagingUser | null;
  /** Только для `interaction`. */
  interaction_id: string | null;
  /** Только для `interaction`. */
  title: string | null;
  /** Только для `interaction`. */
  participants: MessagingUser[] | null;
  /** Только для `interaction`: можно ли приглашать новых участников. */
  can_manage_participants: boolean;
  last_message: Message | null;
  unread_count: number;
  last_message_at: string | null;
};
