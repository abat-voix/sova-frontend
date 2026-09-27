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
import { useAuth } from "@/providers/auth-provider";
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

/**
 * Привязка Telegram текущего пользователя: кнопка со ссылкой на бота, пока не
 * подключён, и статус с отключением — после. Живёт в блоке пользователя в
 * сайдбаре, как единственное «личное» действие, не привязанное к разделу.
 */
export function TelegramConnect({ collapsed }: { collapsed: boolean }) {
  const { locale } = useLocale();
  const { csrfToken } = useAuth();
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

  // Загрузка/ошибка/бот не настроен на бэкенде — молча ничего не показываем,
  // это необязательный виджет, а не критичная часть навигации.
  if (statusQuery.isPending || statusQuery.isError) return null;
  const status = statusQuery.data;

  if (status.is_connected) {
    if (collapsed) {
      return (
        <span title={text.connected}>
          <StatusChip tone="positive">TG</StatusChip>
        </span>
      );
    }
    return (
      <div className="flex items-center justify-between gap-2">
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

  if (collapsed) {
    return (
      <Button
        asChild
        colorScheme="neutral"
        size="icon"
        title={text.connect}
        variant="outline"
      >
        <a href={status.deep_link} rel="noreferrer" target="_blank">
          <Send aria-hidden="true" className="size-4" />
        </a>
      </Button>
    );
  }

  return (
    <Button
      asChild
      className="w-full"
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
