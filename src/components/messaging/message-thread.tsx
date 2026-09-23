"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MessageMarkdown } from "@/components/messaging/message-markdown";
import { ApiError } from "@/lib/api/http";
import {
  conversationsQueryKey,
  getMessages,
  markConversationRead,
  messagesQueryKey,
  sendMessage,
  unreadCountQueryKey,
} from "@/lib/api/messaging/messaging";
import { formatMessageTimestamp } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import type { PaginatedResponse } from "@/types/api";
import type { Conversation, Message } from "@/types/messaging";

const copy = {
  ru: {
    back: "Назад к диалогам",
    systemTitle: "Системные уведомления",
    systemHint: "Это лента системных уведомлений — ответить в неё нельзя.",
    empty: "Сообщений пока нет",
    placeholder: "Напишите сообщение…",
    markdownHint:
      "Поддерживается Markdown: **жирный**, *курсив*, `код`, списки, ссылки",
    send: "Отправить",
    loadError: "Не удалось загрузить сообщения.",
    sendError: "Не удалось отправить сообщение.",
  },
  en: {
    back: "Back to conversations",
    systemTitle: "System notifications",
    systemHint: "This is a system notifications feed — you can't reply here.",
    empty: "No messages yet",
    placeholder: "Write a message…",
    markdownHint:
      "Markdown supported: **bold**, *italic*, `code`, lists, links",
    send: "Send",
    loadError: "Couldn't load messages.",
    sendError: "Couldn't send the message.",
  },
} as const;

type MessageThreadProps = {
  conversation: Conversation;
  csrfToken: string;
  currentUserId: number;
  onBack: () => void;
};

export function MessageThread({
  conversation,
  csrfToken,
  currentUserId,
  onBack,
}: MessageThreadProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const isSystem = conversation.kind === "system";
  const queryKey = messagesQueryKey(conversation.id);

  const messagesQuery = useQuery({
    queryKey,
    queryFn: () => getMessages(conversation.id, 1),
    refetchInterval: 5000,
  });

  // Ответы приходят от новых к старым (см. бэкенд) — для чтения переворачиваем.
  const messages = [...(messagesQuery.data?.results ?? [])].reverse();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  useEffect(() => {
    void markConversationRead(conversation.id, csrfToken).then(() => {
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey() });
    });
    // Отмечаем беседу прочитанной при каждом открытии — повторный вызов безопасен.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const sendMutation = useMutation({
    mutationFn: (value: string) =>
      sendMessage(conversation.id, value, csrfToken),
    onSuccess: (message) => {
      setDraft("");
      queryClient.setQueryData<PaginatedResponse<Message>>(
        queryKey,
        (previous) =>
          previous
            ? { ...previous, results: [message, ...previous.results] }
            : previous,
      );
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError
          ? (error.detail ?? text.sendError)
          : text.sendError,
      );
    },
  });

  function handleSubmit() {
    const value = draft.trim();
    if (!value || sendMutation.isPending) return;
    sendMutation.mutate(value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <Button
          aria-label={text.back}
          colorScheme="neutral"
          onClick={onBack}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {isSystem
            ? text.systemTitle
            : (conversation.other_participant?.full_name ?? "—")}
        </h2>
      </div>

      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
        ref={listRef}
      >
        {messagesQuery.isLoading ? null : messages.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {text.empty}
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender?.id === currentUserId;

            return (
              <div
                className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                key={message.id}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    isOwn
                      ? "bg-[var(--atmr-accent-primary)] text-[var(--atmr-text-on-accent)]"
                      : "bg-secondary text-foreground",
                  )}
                >
                  <MessageMarkdown text={message.text} />
                  <p className="mt-1 text-[0.625rem] opacity-70">
                    {formatMessageTimestamp(message.created_at, locale)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isSystem ? (
        <p className="text-muted-foreground shrink-0 border-t pt-3 text-xs">
          {text.systemHint}
        </p>
      ) : (
        <div className="shrink-0 border-t pt-3">
          <div className="flex items-end gap-2">
            <textarea
              className="border-input bg-background focus-visible:ring-ring max-h-32 min-h-10 flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={text.placeholder}
              rows={1}
              value={draft}
            />
            <Button
              aria-label={text.send}
              disabled={!draft.trim() || sendMutation.isPending}
              onClick={handleSubmit}
              size="icon"
              type="button"
            >
              <Send aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <p className="text-muted-foreground mt-1.5 text-[0.6875rem]">
            {text.markdownHint}
          </p>
        </div>
      )}
    </div>
  );
}
