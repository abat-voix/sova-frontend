import type { ReportJob, ReportJobErrorCode } from "./types";
import { ReportApiError } from "./types";

const FILTER_ERROR_MESSAGES: Record<string, string> = {
  period_order: "Дата начала периода должна быть не позже даты окончания.",
  period_too_long: "Период не может быть длиннее 1830 дней.",
  unknown_ids: "Некоторые значения фильтра не найдены в справочнике.",
  max_length: "В фильтре можно указать не больше 500 значений.",
};

const THROTTLE_MESSAGE =
  "Слишком много незавершённых выгрузок. Дождитесь завершения или отмените существующие.";

export const JOB_ERROR_MESSAGES: Record<
  Exclude<ReportJobErrorCode, "">,
  string
> = {
  too_large: "Отчёт слишком большой для этого формата.",
  pdf_unavailable: "Сервис формирования PDF недоступен.",
  timeout: "Построение отчёта заняло слишком много времени.",
  internal_error: "Внутренняя ошибка при построении отчёта.",
};

export interface FieldErrors {
  [field: string]: string[];
}

/** Extracts DRF-style field errors from a 400 response body. */
export function extractFieldErrors(error: ReportApiError): FieldErrors {
  if (!error.data) return {};
  const fieldErrors: FieldErrors = {};
  for (const [field, value] of Object.entries(error.data)) {
    if (field === "detail" || field === "code") continue;
    if (Array.isArray(value)) {
      fieldErrors[field] = value.map(String);
    }
  }
  return fieldErrors;
}

export function describeApiError(error: unknown): string {
  if (error instanceof ReportApiError) {
    if (error.status === 429 || error.code === "throttled") {
      return THROTTLE_MESSAGE;
    }
    if (error.code && FILTER_ERROR_MESSAGES[error.code]) {
      return FILTER_ERROR_MESSAGES[error.code];
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Неизвестная ошибка.";
}

export function describeJobFailure(job: ReportJob): string {
  if (job.error_code && JOB_ERROR_MESSAGES[job.error_code]) {
    return job.error_message || JOB_ERROR_MESSAGES[job.error_code];
  }
  return job.error_message || "Не удалось построить отчёт.";
}

export function describeDownloadError(status: number, code?: string): string {
  if (status === 409 || code === "not_ready") return "Файл ещё не готов.";
  if (status === 410)
    return "Файл больше недоступен. Сформируйте отчёт заново.";
  if (status === 404) return "Задание не найдено. Оно могло быть удалено.";
  return "Не удалось скачать файл.";
}
