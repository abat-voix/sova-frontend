"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Send, UserPlus } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import { MessageAttachment } from "@/components/messaging/message-attachment";
import {
  MessageDraftAttachment,
  type DraftAttachment,
} from "@/components/messaging/message-draft-attachment";
import { Button } from "@/components/ui/button";
import { MultiEntitySelect } from "@/components/ui/multi-entity-select";
import { MessageMarkdown } from "@/components/messaging/message-markdown";
import {
  searchConversationRecipients,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import { ApiError } from "@/lib/api/http";
import {
  addInteractionChatParticipants,
  conversationQueryKey,
  conversationsQueryKey,
  deleteMessageAttachment,
  getConversation,
  getMessages,
  markConversationRead,
  messagesQueryKey,
  sendMessage,
  unreadCountQueryKey,
  uploadMessageAttachment,
  type SendMessagePayload,
} from "@/lib/api/messaging/messaging";
import { formatMessageTimestamp } from "@/lib/format-date";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import {
  realtimePollingInterval,
  useRealtime,
} from "@/providers/realtime-provider";
import type { PaginatedResponse } from "@/types/api";
import type { Message } from "@/types/messaging";

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
    attach: "Прикрепить файлы",
    uploadError: "Не удалось загрузить файл",
    deleteError: "Не удалось удалить файл",
    attachmentLimit: "Можно прикрепить не более 10 файлов",
    attachmentUnavailable: "Одно из вложений больше недоступно",
    loadError: "Не удалось загрузить сообщения.",
    sendError: "Не удалось отправить сообщение.",
    accessLost: "Доступ к этому чату потерян.",
    addParticipants: "Добавить участников",
    addParticipantsCancel: "Отмена",
    addParticipantsConfirm: "Добавить",
    addParticipantsAdding: "Добавляем…",
    addParticipantsPlaceholder: "Найти участника…",
    addParticipantsError: "Не удалось добавить участников.",
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
    attach: "Attach files",
    uploadError: "Couldn't upload the file",
    deleteError: "Couldn't remove the file",
    attachmentLimit: "You can attach no more than 10 files",
    attachmentUnavailable: "One of the attachments is no longer available",
    loadError: "Couldn't load messages.",
    sendError: "Couldn't send the message.",
    accessLost: "Access to this chat has been lost.",
    addParticipants: "Add participants",
    addParticipantsCancel: "Cancel",
    addParticipantsConfirm: "Add",
    addParticipantsAdding: "Adding…",
    addParticipantsPlaceholder: "Find a person…",
    addParticipantsError: "Couldn't add the participants.",
  },
} as const;

type MessageThreadProps = {
  conversationId: string;
  csrfToken: string;
  currentUserId: number;
  onBack: () => void;
};

export function MessageThread({
  conversationId,
  csrfToken,
  currentUserId,
  onBack,
}: MessageThreadProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const { status: realtimeStatus } = useRealtime();
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [isAddingParticipants, setIsAddingParticipants] = useState(false);
  const [participantsToAdd, setParticipantsToAdd] = useState<LookupOption[]>(
    [],
  );
  const attachmentsRef = useRef<DraftAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const queryKey = messagesQueryKey(conversationId);

  const conversationQuery = useQuery({
    queryKey: conversationQueryKey(conversationId),
    queryFn: () => getConversation(conversationId),
    refetchInterval: realtimePollingInterval(realtimeStatus, 15000),
  });
  const conversation = conversationQuery.data;
  const isSystem = conversation?.kind === "system";
  const isInteraction = conversation?.kind === "interaction";

  const messagesQuery = useQuery({
    queryKey,
    queryFn: () => getMessages(conversationId, 1),
    refetchInterval: realtimePollingInterval(realtimeStatus, 5000),
  });

  const addParticipantsMutation = useMutation({
    mutationFn: (participantIds: number[]) =>
      addInteractionChatParticipants(
        conversation!.interaction_id!,
        participantIds,
        csrfToken,
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(conversationQueryKey(conversationId), updated);
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
      setIsAddingParticipants(false);
      setParticipantsToAdd([]);
    },
    onError: () => {
      toast.error(text.addParticipantsError);
    },
  });

  useRealtimeEvent((event) => {
    if (
      event.type === "messaging.conversation_participants_changed" &&
      event.data.conversation_id === conversationId
    ) {
      void queryClient.invalidateQueries({
        queryKey: conversationQueryKey(conversationId),
      });
      return;
    }
    if (
      event.type !== "messaging.message_created" ||
      event.data.conversation_id !== conversationId ||
      event.data.message.sender?.id === currentUserId ||
      document.visibilityState !== "visible"
    )
      return;
    void markConversationRead(conversationId, csrfToken).then(() => {
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey() });
    });
  });

  // Ответы приходят от новых к старым (см. бэкенд) — для чтения переворачиваем.
  const messages = [...(messagesQuery.data?.results ?? [])].reverse();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  useEffect(() => {
    void markConversationRead(conversationId, csrfToken).then(() => {
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey() });
    });
    // Отмечаем беседу прочитанной при каждом открытии — повторный вызов безопасен.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const sendMutation = useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      sendMessage(conversationId, payload, csrfToken),
    onSuccess: (message) => {
      setDraft("");
      attachmentsRef.current = [];
      setAttachments([]);
      queryClient.setQueryData<PaginatedResponse<Message>>(
        queryKey,
        (previous) =>
          previous
            ? previous.results.some((item) => item.id === message.id)
              ? previous
              : {
                  ...previous,
                  count: previous.count + 1,
                  results: [message, ...previous.results],
                }
            : previous,
      );
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey() });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.code === "attachment_not_found"
          ? text.attachmentUnavailable
          : error instanceof ApiError
            ? (error.detail ?? text.sendError)
            : text.sendError,
      );
    },
  });

  const hasUploading = attachments.some((item) => item.status === "uploading");
  const readyAttachments = attachments.filter(
    (item) => item.status === "ready",
  );
  const canSend =
    !sendMutation.isPending &&
    !hasUploading &&
    removingIds.size === 0 &&
    (draft.trim().length > 0 || readyAttachments.length > 0);

  function setAttachmentList(next: DraftAttachment[]) {
    attachmentsRef.current = next;
    setAttachments(next);
  }

  function updateAttachment(
    localId: string,
    updater: (item: DraftAttachment) => DraftAttachment,
  ) {
    const next = attachmentsRef.current.map((item) =>
      item.localId === localId ? updater(item) : item,
    );
    setAttachmentList(next);
  }

  function removeAttachmentFromList(localId: string) {
    setAttachmentList(
      attachmentsRef.current.filter((item) => item.localId !== localId),
    );
  }

  async function uploadAttachment(localId: string, file: File) {
    try {
      const attachment = await uploadMessageAttachment(file, csrfToken);
      const current = attachmentsRef.current.find(
        (item) => item.localId === localId,
      );
      if (!current) {
        try {
          await deleteMessageAttachment(attachment.id, csrfToken);
        } catch {
          toast.error(text.deleteError);
        }
        return;
      }
      updateAttachment(localId, () => ({
        status: "ready",
        localId,
        file,
        attachment,
      }));
    } catch {
      if (attachmentsRef.current.some((item) => item.localId === localId)) {
        updateAttachment(localId, () => ({
          status: "error",
          localId,
          file,
          error: text.uploadError,
        }));
      }
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    const available = Math.max(0, 10 - attachmentsRef.current.length);
    if (selectedFiles.length > available) toast.error(text.attachmentLimit);

    const acceptedFiles = selectedFiles.slice(0, available);
    const newAttachments: DraftAttachment[] = acceptedFiles.map((file) => ({
      status: "uploading",
      localId: crypto.randomUUID(),
      file,
    }));
    if (newAttachments.length === 0) return;
    setAttachmentList([...attachmentsRef.current, ...newAttachments]);
    for (const item of newAttachments) {
      void uploadAttachment(item.localId, item.file);
    }
  }

  async function handleRemoveAttachment(item: DraftAttachment) {
    if (item.status !== "ready") {
      removeAttachmentFromList(item.localId);
      return;
    }

    setRemovingIds((current) => new Set(current).add(item.localId));
    try {
      await deleteMessageAttachment(item.attachment.id, csrfToken);
      removeAttachmentFromList(item.localId);
    } catch {
      toast.error(text.deleteError);
    } finally {
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(item.localId);
        return next;
      });
    }
  }

  function handleRetryAttachment(item: DraftAttachment) {
    updateAttachment(item.localId, () => ({
      status: "uploading",
      localId: item.localId,
      file: item.file,
    }));
    void uploadAttachment(item.localId, item.file);
  }

  function handleSubmit() {
    if (!canSend) return;
    sendMutation.mutate({
      text: draft.trim(),
      attachment_ids: readyAttachments.map((item) => item.attachment.id),
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const participantNames =
    conversation?.participants
      ?.map((participant) => participant.full_name)
      .join(", ") ?? "";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-start gap-2">
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
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">
            {isSystem
              ? text.systemTitle
              : isInteraction
                ? (conversation?.title ?? "—")
                : (conversation?.other_participant?.full_name ?? "—")}
          </h2>
          {isInteraction && participantNames ? (
            <p
              className="text-muted-foreground truncate text-xs"
              title={participantNames}
            >
              {participantNames}
            </p>
          ) : null}
        </div>
        {isInteraction && conversation?.can_manage_participants ? (
          <Button
            aria-label={text.addParticipants}
            aria-pressed={isAddingParticipants}
            colorScheme="neutral"
            onClick={() => setIsAddingParticipants((open) => !open)}
            size="icon"
            title={text.addParticipants}
            type="button"
            variant={isAddingParticipants ? "secondary" : "outline"}
          >
            <UserPlus aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>

      {isAddingParticipants && conversation ? (
        <div className="mb-3 shrink-0 space-y-2 rounded-lg border p-3">
          <MultiEntitySelect
            id="message-thread-add-participants"
            label={text.addParticipants}
            onChange={setParticipantsToAdd}
            placeholder={text.addParticipantsPlaceholder}
            queryKey={["messaging", "recipients", conversationId]}
            search={(term) =>
              searchConversationRecipients(term).then((options) =>
                options.filter(
                  (option) =>
                    !conversation.participants?.some(
                      (participant) => String(participant.id) === option.id,
                    ),
                ),
              )
            }
            value={participantsToAdd}
          />
          <div className="flex justify-end gap-2">
            <Button
              colorScheme="neutral"
              onClick={() => {
                setIsAddingParticipants(false);
                setParticipantsToAdd([]);
              }}
              size="s"
              type="button"
              variant="ghost"
            >
              {text.addParticipantsCancel}
            </Button>
            <Button
              disabled={
                participantsToAdd.length === 0 ||
                addParticipantsMutation.isPending
              }
              onClick={() =>
                addParticipantsMutation.mutate(
                  participantsToAdd.map((option) => Number(option.id)),
                )
              }
              size="s"
              type="button"
            >
              {addParticipantsMutation.isPending
                ? text.addParticipantsAdding
                : text.addParticipantsConfirm}
            </Button>
          </div>
        </div>
      ) : null}

      {conversationQuery.isError ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {text.accessLost}
        </p>
      ) : (
        <>
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
                const messageAttachments = message.attachments ?? [];

                return (
                  <div
                    className={cn(
                      "flex flex-col",
                      isOwn ? "items-end" : "items-start",
                    )}
                    key={message.id}
                  >
                    {isInteraction && !isOwn && message.sender ? (
                      <p className="text-muted-foreground mb-0.5 px-1 text-[0.6875rem] font-medium">
                        {message.sender.full_name}
                      </p>
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        isOwn
                          ? "bg-[var(--atmr-accent-primary)] text-[var(--atmr-text-on-accent)]"
                          : "bg-secondary text-foreground",
                      )}
                    >
                      {message.text ? (
                        <MessageMarkdown text={message.text} />
                      ) : null}
                      {messageAttachments.map((attachment) => (
                        <MessageAttachment
                          attachment={attachment}
                          key={attachment.id}
                          locale={locale}
                        />
                      ))}
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
              {attachments.length > 0 ? (
                <div className="mb-2 space-y-1.5">
                  {attachments.map((item) => (
                    <MessageDraftAttachment
                      isRemoving={removingIds.has(item.localId)}
                      item={item}
                      key={item.localId}
                      locale={locale}
                      onRemove={() => void handleRemoveAttachment(item)}
                      onRetry={() => handleRetryAttachment(item)}
                    />
                  ))}
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <input
                  accept=".png,.jpg,.jpeg,.pdf,.zip,.gz,.gzip,.rar,.doc,.docx,.xls,.xlsx"
                  className="sr-only"
                  disabled={sendMutation.isPending}
                  multiple
                  onChange={handleFilesSelected}
                  ref={fileInputRef}
                  type="file"
                />
                <Button
                  aria-label={text.attach}
                  colorScheme="neutral"
                  disabled={sendMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Paperclip aria-hidden="true" className="size-4" />
                </Button>
                <textarea
                  className="border-input bg-background focus-visible:ring-ring max-h-[7.5rem] min-h-10 flex-1 resize-y rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={text.placeholder}
                  rows={1}
                  value={draft}
                />
                <Button
                  aria-label={text.send}
                  disabled={!canSend}
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
        </>
      )}
    </div>
  );
}
