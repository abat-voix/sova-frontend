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
