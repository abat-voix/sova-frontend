import type { Locale } from "@/i18n/translations";

export function formatFileSize(size: number | null, locale: Locale) {
  if (size === null) return null;

  const units =
    locale === "ru" ? ["Б", "КБ", "МБ", "ГБ"] : ["B", "KB", "MB", "GB"];
  let value = size;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", {
    maximumFractionDigits: unit === 0 ? 0 : 1,
  })} ${units[unit]}`;
}
