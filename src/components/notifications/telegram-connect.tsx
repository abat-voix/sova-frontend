"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  disconnectTelegram,
  getTelegramLinkStatus,
  telegramLinkQueryKey,
} from "@/lib/api/notifications/telegram";
import { useLocale } from "@/providers/locale-provider";

/** Пока ссылка на бота не погашена, статус могут обновить и другой вкладкой, и самим ботом. */
const pollInterval = 5_000;

const copy = {
  ru: {
    connect: "Подключить Telegram",
    connected: "Telegram подключён",
    disconnect: "Отключить",
  },
  en: {
    connect: "Connect Telegram",
    connected: "Telegram connected",
    disconnect: "Disconnect",
  },
} as const;

/** Управление доставкой уведомлений текущего пользователя в Telegram. */
export function TelegramConnect({ csrfToken }: { csrfToken: string }) {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const text = copy[locale];

  const statusQuery = useQuery({
    queryKey: telegramLinkQueryKey(),
    queryFn: getTelegramLinkStatus,
    refetchInterval: (query) =>
      query.state.data?.is_connected ? false : pollInterval,
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectTelegram(csrfToken),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: telegramLinkQueryKey() }),
  });

  // Загрузка/ошибка/бот не настроен на бэкенде — молча ничего не показываем:
  // привязка Telegram не должна мешать работе со списком уведомлений.
  if (statusQuery.isPending || statusQuery.isError) return null;
  const status = statusQuery.data;

  if (status.is_connected) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <StatusChip tone="positive">{text.connected}</StatusChip>
        <Button
          colorScheme="neutral"
          disabled={disconnect.isPending}
          onClick={() => disconnect.mutate()}
          size="s"
          type="button"
          variant="ghost"
        >
          {text.disconnect}
        </Button>
      </div>
    );
  }

  if (!status.deep_link) return null;

  return (
    <Button
      asChild
      className="shrink-0 self-start"
      colorScheme="neutral"
      size="s"
      variant="outline"
    >
      <a href={status.deep_link} rel="noreferrer" target="_blank">
        <Send aria-hidden="true" className="size-3.5" />
        {text.connect}
      </a>
    </Button>
  );
}
