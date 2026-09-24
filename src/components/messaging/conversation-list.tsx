"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import {
  searchConversationRecipients,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import { ApiError } from "@/lib/api/http";
import {
  conversationsQueryKey,
  getConversations,
  openDirectConversation,
} from "@/lib/api/messaging/messaging";
import { formatMessageTimestamp } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import {
  realtimePollingInterval,
  useRealtime,
} from "@/providers/realtime-provider";
import type { Conversation } from "@/types/messaging";

const copy = {
  ru: {
    newConversation: "Новый диалог",
    cancel: "Отмена",
    selectUser: "Выберите пользователя",
    selectUserPlaceholder: "Найти пользователя…",
    loading: "Загружаем…",
    empty: "Пока нет диалогов",
    systemConversationTitle: "Системные уведомления",
    noMessagesYet: "Сообщений пока нет",
    openError: "Не удалось открыть диалог.",
  },
  en: {
    newConversation: "New conversation",
    cancel: "Cancel",
    selectUser: "Select a person",
    selectUserPlaceholder: "Find a person…",
    loading: "Loading…",
    empty: "No conversations yet",
    systemConversationTitle: "System notifications",
    noMessagesYet: "No messages yet",
    openError: "Couldn't open the conversation.",
  },
} as const;

type ConversationListProps = {
  csrfToken: string;
  onSelect: (conversation: Conversation) => void;
};

function conversationTitle(
  conversation: Conversation,
  text: { systemConversationTitle: string },
) {
  if (conversation.kind === "system") return text.systemConversationTitle;
  return conversation.other_participant?.full_name ?? "—";
}

function conversationInitial(conversation: Conversation) {
  const name = conversation.other_participant?.full_name;
  return name ? name.trim().charAt(0).toUpperCase() : "С";
}

export function ConversationList({
  csrfToken,
  onSelect,
}: ConversationListProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const { status: realtimeStatus } = useRealtime();
  const [isPickingUser, setIsPickingUser] = useState(false);
  const [pickedUser, setPickedUser] = useState<LookupOption | null>(null);
  const [isOpeningConversation, setIsOpeningConversation] = useState(false);

  const conversationsQuery = useQuery({
    queryKey: conversationsQueryKey(),
    queryFn: getConversations,
    refetchInterval: realtimePollingInterval(realtimeStatus, 15000),
  });

  async function handlePickUser(option: LookupOption | null) {
    setPickedUser(option);
    if (!option) return;

    setIsOpeningConversation(true);
    try {
      const conversation = await openDirectConversation(
        Number(option.id),
        csrfToken,
      );
      queryClient.setQueryData<Conversation[]>(
        conversationsQueryKey(),
        (previous) => [
          conversation,
          ...(previous ?? []).filter((item) => item.id !== conversation.id),
        ],
      );
      setIsPickingUser(false);
      setPickedUser(null);
      onSelect(conversation);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? (error.detail ?? text.openError)
          : text.openError,
      );
    } finally {
      setIsOpeningConversation(false);
    }
  }

  const conversations = [...(conversationsQuery.data ?? [])].sort((a, b) => {
    if (a.kind === "system") return -1;
    if (b.kind === "system") return 1;
    return 0;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-2 pb-3">
        <Button
          colorScheme={isPickingUser ? "neutral" : "accent"}
          disabled={isOpeningConversation}
          onClick={() => {
            setIsPickingUser((open) => !open);
            setPickedUser(null);
          }}
          size="s"
          type="button"
          variant={isPickingUser ? "ghost" : "secondary"}
        >
          {isPickingUser ? (
            text.cancel
          ) : (
            <>
              <MessageSquarePlus aria-hidden="true" className="size-3.5" />
              {text.newConversation}
            </>
          )}
        </Button>
      </div>

      {isPickingUser ? (
        <div className="pb-3">
          <EntitySelect
            id="messenger-new-conversation-user"
            label={text.selectUser}
            onChange={handlePickUser}
            placeholder={text.selectUserPlaceholder}
            queryKey={["messaging", "recipients"]}
            search={searchConversationRecipients}
            value={pickedUser}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {conversationsQuery.isLoading ? (
          <p className="text-muted-foreground px-1 py-6 text-center text-sm">
            {text.loading}
          </p>
        ) : conversations.length === 0 ? (
          <p className="text-muted-foreground px-1 py-6 text-center text-sm">
            {text.empty}
          </p>
        ) : (
          conversations.map((conversation) => (
            <button
              className="hover:bg-secondary flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors"
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  conversation.kind === "system"
                    ? "bg-secondary text-muted-foreground"
                    : "bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]",
                )}
              >
                {conversationInitial(conversation)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {conversationTitle(conversation, text)}
                  </span>
                  {conversation.last_message_at ? (
                    <span className="text-muted-foreground shrink-0 text-[0.6875rem]">
                      {formatMessageTimestamp(
                        conversation.last_message_at,
                        locale,
                      )}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground truncate text-xs">
                    {conversation.last_message?.text ?? text.noMessagesYet}
                  </span>
                  {conversation.unread_count > 0 ? (
                    <span className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--atmr-accent-primary)] text-[0.625rem] font-bold text-[var(--atmr-text-on-accent)]">
                      {conversation.unread_count > 9
                        ? "9+"
                        : conversation.unread_count}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
