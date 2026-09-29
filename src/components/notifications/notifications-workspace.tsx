"use client";

import Link from "next/link";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bell, CheckCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  isInternalLink,
  KindChip,
  KindIcon,
} from "@/components/notifications/notification-parts";
import { TelegramConnect } from "@/components/notifications/telegram-connect";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  getNotification,
  getNotificationKinds,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKindsQueryKey,
  notificationQueryKey,
  notificationsInfiniteQueryKey,
  notificationsRootQueryKey,
} from "@/lib/api/notifications/notifications";
import type { Locale } from "@/i18n/translations";
import { cn } from "@/lib/utils";
import { formatMoment } from "@/lib/workflow/format-moment";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { AppNotification } from "@/types/notification";

const pageSize = 30;
/** Уведомления приходят без push: вкладка опрашивает бэкенд, как виджет на главной. */
const refetchInterval = 30_000;
const notificationQueryParam = "notification";

const copy = {
  ru: {
    all: "Все",
    back: "К списку",
    clearSearch: "Очистить поиск",
    detailError: "Не удалось загрузить уведомление.",
    empty:
      "Здесь появятся напоминания о сроках, назначениях и системные сообщения.",
    listError: "Не удалось загрузить уведомления.",
    loadMore: "Подгрузить",
    loading: "Загружаем уведомления…",
    loadingMore: "Загружаем…",
    noResults: "По вашему запросу ничего не найдено.",
    noText: "У уведомления нет текста — всё сказано в заголовке.",
    notSelected: "Выберите уведомление слева, чтобы прочитать его целиком.",
    open: "Перейти",
    readAll: "Прочитать все",
    retry: "Повторить",
    searchLabel: "Поиск уведомлений",
    searchPlaceholder: "Заголовок или текст",
    total: "уведомлений",
  },
  en: {
    all: "All",
    back: "Back to the list",
    clearSearch: "Clear search",
    detailError: "The notification could not be loaded.",
    empty:
      "Deadline reminders, assignments, and system messages will show up here.",
    listError: "The notifications could not be loaded.",
    loadMore: "Load more",
    loading: "Loading notifications…",
    loadingMore: "Loading…",
    noResults: "Nothing matched your search.",
    noText: "This notification has no text — the title says it all.",
    notSelected: "Pick a notification on the left to read it in full.",
    open: "Open",
    readAll: "Mark all as read",
    retry: "Retry",
    searchLabel: "Search notifications",
    searchPlaceholder: "Title or text",
    total: "notifications",
  },
} as const;

type CopyText = (typeof copy)[keyof typeof copy];

function PanelState({
  label,
  onRetry,
  retryLabel,
}: {
  label: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 px-3 py-8 text-center text-sm">
      <p>{label}</p>
      {onRetry && retryLabel ? (
        <Button
          colorScheme="neutral"
          onClick={onRetry}
          size="s"
          type="button"
          variant="outline"
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Вкладка «Уведомления»: слева заголовки с фильтром по группам и поиском,
 * справа полный текст выбранного уведомления и переход к объекту.
 * Выбранное уведомление живёт в адресе (`?notification=<id>`) — на него
 * ведут ссылки из виджета на главной.
 */
export function NotificationsWorkspace() {
  const { locale, t } = useLocale();
  const { csrfToken } = useAuth();
  const text = copy[locale];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const selectedId = searchParams.get(notificationQueryParam);
  const [kind, setKind] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const selectNotification = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (id) {
        params.set(notificationQueryParam, id);
      } else {
        params.delete(notificationQueryParam);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const kindsQuery = useQuery({
    queryKey: notificationKindsQueryKey(),
    queryFn: getNotificationKinds,
    refetchInterval,
  });
  const listParams = { kind, pageSize, search: debouncedSearch };
  const listQuery = useInfiniteQuery({
    queryKey: notificationsInfiniteQueryKey(listParams),
    queryFn: ({ pageParam }) =>
      getNotifications({ ...listParams, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
    refetchInterval,
  });

  const notifications = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [listQuery.data],
  );
  const total = listQuery.data?.pages[0]?.count;

  // Уведомление по ссылке может не попасть в загруженную страницу списка
  // (старое или отфильтрованное) — тогда запрашиваем его отдельно.
  const fromList = selectedId
    ? notifications.find((item) => item.id === selectedId)
    : undefined;
  const detailQuery = useQuery({
    queryKey: notificationQueryKey(selectedId ?? ""),
    queryFn: () => getNotification(selectedId ?? ""),
    enabled: Boolean(selectedId) && !fromList && !listQuery.isPending,
  });
  const selected = fromList ?? detailQuery.data;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: notificationsRootQueryKey() });
  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id, csrfToken),
    onSuccess: invalidate,
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(csrfToken),
    onSuccess: invalidate,
  });

  // Открытое уведомление считается прочитанным. Ref не даёт отправить
  // запрос повторно, пока список ещё не обновился после первого.
  const markedRef = useRef(new Set<string>());
  const { mutate: markRead } = readOne;
  useEffect(() => {
    if (!selected || selected.is_read || markedRef.current.has(selected.id)) {
      return;
    }
    markedRef.current.add(selected.id);
    markRead(selected.id);
  }, [markRead, selected]);

  const kinds = kindsQuery.data ?? [];
  const icons = new Map(kinds.map((item) => [item.value, item.icon]));
  const unreadCount = kinds.reduce((sum, item) => sum + item.unread_count, 0);
  // Пустые группы не показываем: фильтр, который ничего не найдёт, только шумит.
  const visibleKinds = kinds.filter((item) => item.count > 0);
  const hasFilters = kind !== null || debouncedSearch !== "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.025em] sm:text-3xl">
            {t("notifications")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
            {t("notificationsDescription")}
          </p>
        </div>
        <TelegramConnect csrfToken={csrfToken} />
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <aside
          className={cn(
            "bg-card min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm md:flex md:w-80",
            selectedId ? "hidden" : "flex",
          )}
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
            <p className="text-sm font-medium">
              {total !== undefined ? `${total} ${text.total}` : null}
            </p>
            {unreadCount > 0 ? (
              <Button
                colorScheme="neutral"
                disabled={readAll.isPending}
                onClick={() => readAll.mutate()}
                size="s"
                type="button"
                variant="ghost"
              >
                <CheckCheck aria-hidden="true" className="size-3.5" />
                {text.readAll}
              </Button>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <SearchInput
              aria-label={text.searchLabel}
              clearLabel={text.clearSearch}
              onChange={setSearch}
              placeholder={text.searchPlaceholder}
              value={search}
            />
            {visibleKinds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
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

            <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
              {listQuery.isPending ? (
                <PanelState label={text.loading} />
              ) : listQuery.isError ? (
                <PanelState
                  label={text.listError}
                  onRetry={() => void listQuery.refetch()}
                  retryLabel={text.retry}
                />
              ) : notifications.length === 0 ? (
                <PanelState label={hasFilters ? text.noResults : text.empty} />
              ) : (
                <ul className="space-y-1.5">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <NotificationRow
                        iconName={icons.get(notification.kind)}
                        isSelected={notification.id === selectedId}
                        locale={locale}
                        notification={notification}
                        onSelect={() => selectNotification(notification.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {listQuery.hasNextPage ? (
                <Button
                  className="mt-2 w-full"
                  colorScheme="neutral"
                  disabled={listQuery.isFetchingNextPage}
                  onClick={() => void listQuery.fetchNextPage()}
                  size="s"
                  type="button"
                  variant="outline"
                >
                  {listQuery.isFetchingNextPage
                    ? text.loadingMore
                    : text.loadMore}
                </Button>
              ) : null}
            </div>
          </div>
        </aside>

        <section
          className={cn(
            "bg-card min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm md:flex",
            selectedId ? "flex" : "hidden",
          )}
        >
          <div className="flex h-12 shrink-0 items-center border-b px-3 md:hidden">
            <Button
              colorScheme="neutral"
              onClick={() => selectNotification(null)}
              size="s"
              type="button"
              variant="ghost"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              {text.back}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!selectedId ? (
              <EmptyDetail label={text.notSelected} />
            ) : selected ? (
              <NotificationDetail
                iconName={icons.get(selected.kind)}
                locale={locale}
                notification={selected}
                text={text}
              />
            ) : detailQuery.isError ? (
              <PanelState
                label={text.detailError}
                onRetry={() => void detailQuery.refetch()}
                retryLabel={text.retry}
              />
            ) : (
              <PanelState label={text.loading} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function NotificationRow({
  iconName,
  isSelected,
  locale,
  notification,
  onSelect,
}: {
  iconName: string | undefined;
  isSelected: boolean;
  locale: Locale;
  notification: AppNotification;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
        isSelected
          ? "border-[var(--atmr-accent-primary)] bg-[var(--atmr-background-accent-soft)]"
          : cn(
              "hover:bg-secondary",
              !notification.is_read &&
                "bg-[var(--atmr-background-accent-soft)]/40",
            ),
      )}
      onClick={onSelect}
      type="button"
    >
      <KindIcon
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
        name={iconName}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "line-clamp-2 text-sm leading-5",
            notification.is_read ? "font-normal" : "font-medium",
          )}
        >
          {notification.title}
        </span>
        <span className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          <span className="truncate">{notification.kind_label}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">
            {formatMoment(notification.created_at, locale)}
          </span>
        </span>
      </span>
      {!notification.is_read ? (
        <span
          aria-hidden="true"
          className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--atmr-accent-primary)]"
        />
      ) : null}
    </button>
  );
}

function EmptyDetail({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
        <Bell aria-hidden="true" className="size-6" />
      </span>
      <p className="text-muted-foreground max-w-sm text-sm leading-6">
        {label}
      </p>
    </div>
  );
}

function NotificationDetail({
  iconName,
  locale,
  notification,
  text,
}: {
  iconName: string | undefined;
  locale: Locale;
  notification: AppNotification;
  text: CopyText;
}) {
  return (
    <article className="max-w-3xl space-y-5 p-6">
      <header className="space-y-3">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--atmr-background-accent-soft)] px-2.5 py-0.5 font-medium text-[var(--atmr-accent-primary)]">
            <KindIcon className="size-3.5" name={iconName} />
            {notification.kind_label}
          </span>
          <time dateTime={notification.created_at}>
            {formatMoment(notification.created_at, locale)}
          </time>
        </div>
        <h2 className="text-xl leading-7 font-medium">{notification.title}</h2>
      </header>

      {notification.text ? (
        <p className="text-sm leading-6 whitespace-pre-line">
          {notification.text}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">{text.noText}</p>
      )}

      {isInternalLink(notification.link) ? (
        <Button asChild size="m">
          <Link href={notification.link}>
            {text.open}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      ) : null}
    </article>
  );
}
