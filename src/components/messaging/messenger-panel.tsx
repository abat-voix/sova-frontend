"use client";

import { X } from "lucide-react";

import { ConversationList } from "@/components/messaging/conversation-list";
import { MessageThread } from "@/components/messaging/message-thread";
import { Button } from "@/components/ui/button";
import type { AuthenticatedUser } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

type MessengerPanelProps = {
  csrfToken: string;
  currentUser: AuthenticatedUser;
  onClose: () => void;
  onSelectConversation: (conversationId: string | null) => void;
  selectedConversationId: string | null;
};

/**
 * Содержимое мессенджера: список диалогов либо открытая переписка. Одна и та
 * же панель монтируется и в сдвигающей колонке на широком экране, и в
 * оверлее на узком — раскладку выбирает вызывающий компонент (CrmShell).
 *
 * Выбранная беседа управляется снаружи (CrmShell): так кнопка «Открыть чат» из
 * карточки Взаимодействия может выбрать нужный чат, а выбор переживает переключение
 * между десктопным и мобильным вариантом панели.
 */
export function MessengerPanel({
  csrfToken,
  currentUser,
  onClose,
  onSelectConversation,
  selectedConversationId,
}: MessengerPanelProps) {
  const { t } = useLocale();

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
        {selectedConversationId ? (
          <MessageThread
            conversationId={selectedConversationId}
            csrfToken={csrfToken}
            currentUserId={currentUser.id}
            key={selectedConversationId}
            onBack={() => onSelectConversation(null)}
          />
        ) : (
          <ConversationList csrfToken={csrfToken} onSelect={onSelectConversation} />
        )}
      </div>
    </div>
  );
}
