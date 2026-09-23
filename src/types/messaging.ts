export type ConversationKind = "direct" | "system";

/** Пользователь во вложенном представлении сообщения/беседы (`UserShortSerializer`). */
export type MessagingUser = {
  id: number;
  email: string;
  full_name: string;
};

export type Message = {
  id: string;
  conversation: string;
  /** `null` — системное сообщение. */
  sender: MessagingUser | null;
  text: string;
  link: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  kind: ConversationKind;
  /** `null` для системной беседы. */
  other_participant: MessagingUser | null;
  last_message: Message | null;
  unread_count: number;
  last_message_at: string | null;
};
