"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";

import {
  WidgetCard,
  WidgetSkeleton,
  WidgetState,
} from "@/components/crm/widget-card";
import {
  KindChip,
  KindIcon,
  notificationHref,
} from "@/components/notifications/notification-parts";
import {
  getNotificationKinds,
  getNotifications,
  markAllNotificationsRead,
  notificationKindsQueryKey,
  notificationsQueryKey,
  notificationsRootQueryKey,
} from "@/lib/api/notifications/notifications";
import type { Locale } from "@/i18n/translations";
import { cn } from "@/lib/utils";
import { formatMoment } from "@/lib/workflow/format-moment";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { AppNotification } from "@/types/notification";

const previewCount = 5;
/** Уведомления приходят без push: виджет опрашивает бэкенд, как счётчик мессенджера. */
const refetchInterval = 30_000;

const copy = {
  ru: {
    all: "Все",
    allNotifications: "Все уведомления",
    empty:
      "Здесь появятся напоминания о сроках, назначениях и системные сообщения.",
    error: "Не удалось загрузить уведомления.",
    readAll: "Прочитать все",
    title: "Уведомления",
    unread: (count: number) => `Непрочитанных: ${count}`,
  },
  en: {
    all: "All",
    allNotifications: "All notifications",
    empty:
      "Deadline reminders, assignments, and system messages will show up here.",
    error: "The notifications could not be loaded.",
    readAll: "Mark all as read",
    title: "Notifications",
    unread: (count: number) => `Unread: ${count}`,
  },
} as const;

export function NotificationsWidget() {
  const { locale } = useLocale();
  const { csrfToken } = useAuth();
  const queryClient = useQueryClient();
  const text = copy[locale];
  const [kind, setKind] = useState<string | null>(null);

  const kindsQuery = useQuery({
    queryKey: notificationKindsQueryKey(),
    queryFn: getNotificationKinds,
    refetchInterval,
  });
  const params = { kind, page: 1, pageSize: previewCount };
  const listQuery = useQuery({
    queryKey: notificationsQueryKey(params),
    queryFn: () => getNotifications(params),
    refetchInterval,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: notificationsRootQueryKey() });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(csrfToken),
    onSuccess: invalidate,
  });

  const kinds = kindsQuery.data ?? [];
  const icons = new Map(kinds.map((item) => [item.value, item.icon]));
  const unreadCount = kinds.reduce((sum, item) => sum + item.unread_count, 0);
  // Пустые группы не показываем: фильтр, который ничего не найдёт, только шумит.
  const visibleKinds = kinds.filter((item) => item.count > 0);
  const notifications = listQuery.data?.results ?? [];

  return (
    <WidgetCard
      action={
        unreadCount > 0 ? (
          <button
            className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50"
            disabled={readAll.isPending}
            onClick={() => readAll.mutate()}
            type="button"
          >
            <CheckCheck aria-hidden="true" className="size-3.5" />
            {text.readAll}
          </button>
        ) : null
      }
      count={kindsQuery.data ? unreadCount : undefined}
      countLabel={text.unread(unreadCount)}
      href="/notifications"
      icon={Bell}
      linkLabel={text.allNotifications}
      title={text.title}
    >
      {visibleKinds.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <KindChip
            isActive={kind === null}
            label={text.all}
            onClick={() => setKind(null)}
          />
          {visibleKinds.map((item) => (
            <KindChip
              isActive={kind === item.value}
              key={item.value}
              label={item.label}
              onClick={() => setKind(item.value)}
              unreadCount={item.unread_count}
            />
          ))}
        </div>
      ) : null}
      {listQuery.isPending ? (
        <WidgetSkeleton />
      ) : listQuery.isError ? (
        <WidgetState label={text.error} />
      ) : notifications.length === 0 ? (
        <WidgetState label={text.empty} />
      ) : (
        notifications.map((notification) => (
          <NotificationItem
            iconName={icons.get(notification.kind)}
            key={notification.id}
            locale={locale}
            notification={notification}
          />
        ))
      )}
    </WidgetCard>
  );
}

function NotificationItem({
  iconName,
  locale,
  notification,
}: {
  iconName: string | undefined;
  locale: Locale;
  notification: AppNotification;
}) {
  // Полный текст и переход к объекту — на вкладке «Уведомления»: там же
  // уведомление отмечается прочитанным.
  return (
    <Link
      className={cn(
        "hover:bg-secondary flex w-full items-start gap-2.5 rounded-lg border border-transparent p-2 text-left transition-colors",
        !notification.is_read && "bg-[var(--atmr-background-accent-soft)]/40",
      )}
      href={notificationHref(notification.id)}
    >
      <KindIcon
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
        name={iconName}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm leading-5",
            notification.is_read ? "font-normal" : "font-medium",
          )}
        >
          {notification.title}
        </span>
        {notification.text ? (
          <span className="text-muted-foreground mt-0.5 line-clamp-2 text-xs whitespace-pre-line">
            {notification.text}
          </span>
        ) : null}
      </span>
      <span className="text-muted-foreground shrink-0 text-xs">
        {formatMoment(notification.created_at, locale)}
      </span>
    </Link>
  );
}
