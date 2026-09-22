"use client";

import { RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/format-date";
import { resolveReportJobError } from "@/lib/reports/report-errors";
import type { ReportExportJobEntry } from "@/lib/reports/use-report-export-jobs";
import { useLocale } from "@/providers/locale-provider";
import type { ReportFilters, ReportFormat, ReportJob } from "@/types/report";

const copy = {
  ru: {
    failed: "Ошибка",
    loading: "Загружаем…",
    queued: "В очереди",
    ready: "Готово",
    remove: "Убрать из списка",
    retried: "Формируется заново",
    retry: "Повторить",
    retryFailed: "Не удалось запустить выгрузку",
    rowsAndSize: (rows: number, size: string) => `${rows} строк · ${size}`,
    running: "Выполняется",
    title: "Мои выгрузки",
    validUntil: (date: string) => `доступно до ${date}`,
  },
  en: {
    failed: "Failed",
    loading: "Loading…",
    queued: "Queued",
    ready: "Ready",
    remove: "Remove from the list",
    retried: "Rebuilding the report",
    retry: "Retry",
    retryFailed: "The export could not be started",
    rowsAndSize: (rows: number, size: string) => `${rows} rows · ${size}`,
    running: "Running",
    title: "My exports",
    validUntil: (date: string) => `available until ${date}`,
  },
} as const;

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ReportDownloadsPanelProps = {
  jobs: ReportExportJobEntry[];
  onRetry: (filters: ReportFilters, format: ReportFormat) => Promise<unknown>;
  removeJob: (id: string) => void;
};

export function ReportDownloadsPanel({
  jobs,
  onRetry,
  removeJob,
}: ReportDownloadsPanelProps) {
  const { locale } = useLocale();
  const text = copy[locale];

  if (jobs.length === 0) return null;

  async function handleRetry(job: ReportJob) {
    try {
      await onRetry(job.spec, job.format);
      toast.success(text.retried);
    } catch {
      toast.error(text.retryFailed);
    }
  }

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <h2 className="text-sm font-medium">{text.title}</h2>
      <ul className="mt-3 space-y-2">
        {jobs.map(({ id, query }) => {
          const job = query.data;

          return (
            <li
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              key={id}
            >
              {!job ? (
                <span className="text-muted-foreground">{text.loading}</span>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="font-medium uppercase">{job.format}</span>
                    <StatusChip
                      tone={
                        job.status === "ready"
                          ? "positive"
                          : job.status === "failed"
                            ? "accent"
                            : "neutral"
                      }
                    >
                      {text[job.status]}
                    </StatusChip>
                    <span className="text-muted-foreground truncate">
                      {job.status === "failed"
                        ? resolveReportJobError(job, locale)
                        : job.status === "ready"
                          ? [
                              text.rowsAndSize(
                                job.rows_count ?? 0,
                                formatBytes(job.file_size),
                              ),
                              job.expires_at
                                ? text.validUntil(
                                    formatDate(job.expires_at, locale) ?? "",
                                  )
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")
                          : ""}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {job.status === "ready" && job.download_url ? (
                      <Button
                        asChild
                        colorScheme="neutral"
                        size="m"
                        variant="ghost"
                      >
                        <a href={job.download_url}>{text.ready}</a>
                      </Button>
                    ) : null}
                    {job.status === "failed" ? (
                      <Button
                        aria-label={text.retry}
                        colorScheme="neutral"
                        onClick={() => handleRetry(job)}
                        size="icon"
                        title={text.retry}
                        type="button"
                        variant="ghost"
                      >
                        <RefreshCw aria-hidden="true" className="size-4" />
                      </Button>
                    ) : null}
                    <Button
                      aria-label={text.remove}
                      colorScheme="neutral"
                      onClick={() => removeJob(id)}
                      size="icon"
                      title={text.remove}
                      type="button"
                      variant="ghost"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
