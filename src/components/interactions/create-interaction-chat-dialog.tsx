"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MultiEntitySelect } from "@/components/ui/multi-entity-select";
import {
  searchConversationRecipients,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import { ApiError } from "@/lib/api/http";
import {
  conversationsQueryKey,
  createInteractionChat,
} from "@/lib/api/messaging/messaging";
import { useLocale } from "@/providers/locale-provider";
import type { Conversation } from "@/types/messaging";

const copy = {
  ru: {
    cancel: "Отмена",
    create: "Создать чат",
    creating: "Создаём…",
    createError: "Не удалось создать чат.",
    participants: "Участники",
    participantsPlaceholder: "Найти участника…",
    title: "Новый чат Взаимодействия",
  },
  en: {
    cancel: "Cancel",
    create: "Create chat",
    creating: "Creating…",
    createError: "Couldn't create the chat.",
    participants: "Participants",
    participantsPlaceholder: "Find a person…",
    title: "New interaction chat",
  },
} as const;

export function CreateInteractionChatDialog({
  csrfToken,
  interactionId,
  onClose,
  onCreated,
}: {
  csrfToken: string;
  interactionId: string;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const queryClient = useQueryClient();
  const [participants, setParticipants] = useState<LookupOption[]>([]);

  const createMutation = useMutation({
    mutationFn: () =>
      createInteractionChat(
        interactionId,
        participants.map((option) => Number(option.id)),
        csrfToken,
      ),
    onSuccess: (conversation) => {
      queryClient.setQueryData<Conversation[]>(
        conversationsQueryKey(),
        (previous) => [
          conversation,
          ...(previous ?? []).filter((item) => item.id !== conversation.id),
        ],
      );
      onCreated(conversation.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? (error.detail ?? text.createError) : text.createError,
      );
    },
  });

  return (
    <Modal closeLabel={text.cancel} labelledBy="create-interaction-chat-title" onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-5 py-4 pr-14">
          <h2 className="text-lg font-medium" id="create-interaction-chat-title">
            {text.title}
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-2 px-5 py-4">
          <MultiEntitySelect
            id="create-interaction-chat-participants"
            label={text.participants}
            onChange={setParticipants}
            placeholder={text.participantsPlaceholder}
            queryKey={["messaging", "recipients"]}
            search={searchConversationRecipients}
            value={participants}
          />
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button
            colorScheme="neutral"
            onClick={onClose}
            size="m"
            type="button"
            variant="outline"
          >
            {text.cancel}
          </Button>
          <Button
            disabled={participants.length === 0 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            size="m"
            type="button"
          >
            {createMutation.isPending ? text.creating : text.create}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
