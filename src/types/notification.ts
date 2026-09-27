/**
 * Уведомление в системе (`/api/notifications/inbox/`).
 *
 * Группы (`kind`) задаёт бэкенд — интерфейс не знает их заранее и строит
 * фильтры из `NotificationKindSummary`.
 */
export type AppNotification = {
  id: string;
  title: string;
  text: string;
  is_read: boolean;
  kind: string;
  kind_label: string;
  /** Адрес объекта в интерфейсе; пустая строка — уведомление без перехода. */
  link: string;
  created_at: string;
};

/** Группа уведомлений со счётчиками текущего пользователя (`inbox/kinds/`). */
export type NotificationKindSummary = {
  value: string;
  label: string;
  /** Имя иконки lucide; незнакомое имя интерфейс заменяет колокольчиком. */
  icon: string;
  count: number;
  unread_count: number;
};

/**
 * Статус привязки Telegram текущего пользователя (`/api/notifications/telegram/`).
 *
 * `deep_link` — одноразовая ссылка `https://t.me/<бот>?start=<токен>`, есть
 * только пока Telegram не подключён; `expires_at` — срок её действия.
 */
export type TelegramLinkStatus = {
  is_connected: boolean;
  deep_link: string | null;
  expires_at: string | null;
};
