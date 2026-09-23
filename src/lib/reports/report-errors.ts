import type { Locale } from "@/i18n/translations";
import { ApiError } from "@/lib/api/http";
import type { ReportJob, ReportJobErrorCode } from "@/types/report";

/**
 * Коды ошибок `preview`/`summary`/`exports` → текст, привязанный к полю
 * фильтра.
 */
const requestMessages = {
  ru: {
    period_order: "Дата начала периода должна быть не позже даты окончания.",
    period_too_long: "Период не может быть длиннее 1830 дней.",
    throttled:
      "Слишком много незавершённых выгрузок. Дождитесь завершения или уберите лишние из списка.",
    unknown: "Не удалось выполнить запрос.",
    unknown_ids: "Некоторые значения фильтра не найдены в справочнике.",
    max_length: "В фильтре можно указать не больше 500 значений.",
  },
  en: {
    period_order: "The start date must not be later than the end date.",
    period_too_long: "The period cannot be longer than 1830 days.",
    throttled:
      "Too many unfinished exports. Wait for one to finish or remove some from the list.",
    unknown: "The request could not be completed.",
    unknown_ids: "Some filter values were not found in the catalog.",
    max_length: "A filter can contain at most 500 values.",
  },
} as const;

export function resolveReportRequestError(error: unknown, locale: Locale) {
  const dictionary = requestMessages[locale];
  if (!(error instanceof ApiError)) return dictionary.unknown;

  if (error.status === 429) return dictionary.throttled;

  const code = error.code as keyof typeof dictionary | null;
  if (code && code in dictionary) return dictionary[code];

  return error.detail ?? dictionary.unknown;
}

/** Коды ошибок задания на выгрузку (`ReportJob.error_code`) → текст. */
const jobMessages = {
  ru: {
    internal_error: "Внутренняя ошибка при построении отчёта.",
    pdf_unavailable: "Сервис формирования PDF недоступен.",
    timeout: "Построение отчёта заняло слишком много времени.",
    too_large: "Отчёт слишком большой для этого формата.",
    unknown: "Не удалось построить отчёт.",
  },
  en: {
    internal_error: "An internal error occurred while building the report.",
    pdf_unavailable: "The PDF service is unavailable.",
    timeout: "Building the report took too long.",
    too_large: "The report is too large for this format.",
    unknown: "The report could not be built.",
  },
} as const;

export function resolveReportJobError(job: ReportJob, locale: Locale) {
  const dictionary = jobMessages[locale];
  const code = job.error_code as Exclude<ReportJobErrorCode, ""> | "";

  if (code && code in dictionary) {
    return job.error_message || dictionary[code as keyof typeof dictionary];
  }

  return job.error_message || dictionary.unknown;
}
