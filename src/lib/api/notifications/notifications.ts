import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson, postJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  AppNotification,
  NotificationKindSummary,
} from "@/types/notification";

export type NotificationsParams = {
  /** `null` — все группы. */
  kind: string | null;
  page: number;
  pageSize: number;
  /** Поиск по заголовку и тексту; пустая строка — без поиска. */
  search?: string;
};

/** Общий префикс ключей: после прочтения сбрасываются и список, и счётчики групп. */
export function notificationsRootQueryKey() {
  return ["notifications"] as const;
}

export function notificationsQueryKey(params: NotificationsParams) {
  return ["notifications", "list", params] as const;
}

export function notificationsInfiniteQueryKey(
  params: Omit<NotificationsParams, "page">,
) {
  return ["notifications", "list", "infinite", params] as const;
}

export function notificationQueryKey(id: string) {
  return ["notifications", "detail", id] as const;
}

export function notificationKindsQueryKey() {
  return ["notifications", "kinds"] as const;
}

export function getNotifications({
  kind,
  page,
  pageSize,
  search = "",
}: NotificationsParams) {
  const query = buildQuery({
    kind: kind ?? undefined,
    page,
    page_size: pageSize,
    search: search.trim(),
  });

  return getJson<PaginatedResponse<AppNotification>>(
    `${apiEndpoints.notifications.inbox.list}?${query}`,
  );
}

export function getNotification(id: string) {
  return getJson<AppNotification>(apiEndpoints.notifications.inbox.detail(id));
}

export function getNotificationKinds() {
  return getJson<NotificationKindSummary[]>(
    apiEndpoints.notifications.inbox.kinds,
  );
}

export function markNotificationRead(id: string, csrfToken: string) {
  return postJson<AppNotification>(
    apiEndpoints.notifications.inbox.read(id),
    {},
    csrfToken,
  );
}

export function markAllNotificationsRead(csrfToken: string) {
  return postJson<{ updated: number }>(
    apiEndpoints.notifications.inbox.readAll,
    {},
    csrfToken,
  );
}
