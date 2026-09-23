"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { ConversationList } from "@/components/messaging/conversation-list";
import { MessageThread } from "@/components/messaging/message-thread";
import { Button } from "@/components/ui/button";
import type { AuthenticatedUser } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Conversation } from "@/types/messaging";

type MessengerPanelProps = {
  csrfToken: string;
  currentUser: AuthenticatedUser;
  onClose: () => void;
};

/**
 * Содержимое мессенджера: список диалогов либо открытая переписка. Одна и та
 * же панель монтируется и в сдвигающей колонке на широком экране, и в
 * оверлее на узком — раскладку выбирает вызывающий компонент (CrmShell).
 */
export function MessengerPanel({
  csrfToken,
  currentUser,
  onClose,
}: MessengerPanelProps) {
  const { t } = useLocale();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold" id="messenger-panel-title">
          {t("messengerTitle")}
        </h2>
        <Button
          aria-label={t("closeMessenger")}
          colorScheme="neutral"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 px-4 py-3">
        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            csrfToken={csrfToken}
            currentUserId={currentUser.id}
            key={selectedConversation.id}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <ConversationList
            csrfToken={csrfToken}
            currentUser={currentUser}
            onSelect={setSelectedConversation}
          />
        )}
      </div>
    </div>
  );
}
