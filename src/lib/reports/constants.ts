import type { ReportFormat, ReportOrdering } from "./types";

export const MAX_PERIOD_DAYS = 1830;
export const MAX_FILTER_VALUES = 500;
export const MAX_PAGE_SIZE = 200;
export const DEFAULT_PAGE_SIZE = 50;
export const PDF_ROW_LIMIT = 5000;
export const MAX_PENDING_EXPORTS = 5;

export const ORDERING_OPTIONS: { value: ReportOrdering; label: string }[] = [
  { value: "-created_at", label: "Сначала новые" },
  { value: "created_at", label: "Сначала старые" },
  { value: "organization", label: "По организации" },
  { value: "responsible", label: "По ответственному" },
];

export const FORMAT_OPTIONS: { value: ReportFormat; label: string }[] = [
  { value: "xlsx", label: "XLSX" },
  { value: "xls", label: "XLS" },
  { value: "pdf", label: "PDF" },
  { value: "json", label: "JSON" },
];

export const JOB_STATUS_LABELS: Record<string, string> = {
  queued: "В очереди",
  running: "Выполняется",
  ready: "Готово",
  failed: "Ошибка",
};
