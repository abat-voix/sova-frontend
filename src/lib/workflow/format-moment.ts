import type { Locale } from "@/i18n/translations";

const intlLocales: Record<Locale, string> = { en: "en-GB", ru: "ru-RU" };

/** Момент времени доски: дата и время без года — процесс живёт в пределах года. */
export function formatMoment(value: string | null, locale: Locale) {
  if (!value) return null;

  return new Date(value).toLocaleString(intlLocales[locale], {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

/** Интервал доски. Открытый с любой стороны показываем многоточием. */
export function formatRange(
  from: string | null,
  to: string | null,
  locale: Locale,
  fallback: string,
) {
  const start = formatMoment(from, locale);
  const end = formatMoment(to, locale);

  if (!start && !end) return fallback;
  if (start && !end) return `${start} → …`;
  if (!start && end) return `… → ${end}`;

  return `${start} → ${end}`;
}
