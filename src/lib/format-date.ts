import type { Locale } from "@/i18n/translations";

const intlLocales: Record<Locale, string> = { en: "en-GB", ru: "ru-RU" };

/**
 * Дата записи справочника — с годом, в отличие от моментов доски процесса:
 * контакт заведён когда угодно, а процесс живёт в пределах года.
 */
export function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return null;

  return new Date(value).toLocaleDateString(intlLocales[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Время сообщения: часы:минуты для сегодняшних, иначе короткая дата без года —
 * в узкой панели мессенджера году всё равно не хватит места.
 */
export function formatMessageTimestamp(value: string, locale: Locale) {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(intlLocales[locale], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(intlLocales[locale], {
    day: "numeric",
    month: "short",
  });
}
