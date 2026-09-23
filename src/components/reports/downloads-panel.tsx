"use client";

import { RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { describeJobFailure } from "@/lib/reports/errors";
import type {
  ReportFilters,
  ReportFormat,
  ReportJob,
} from "@/lib/reports/types";
import type { ExportJobEntry } from "@/lib/reports/use-export-jobs";

import { JobStatusBadge } from "./job-status-badge";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

interface DownloadsPanelProps {
  jobs: ExportJobEntry[];
  removeJob: (id: string) => void;
  onRetry: (filters: ReportFilters, format: ReportFormat) => Promise<unknown>;
}

export function DownloadsPanel({
  jobs,
  removeJob,
  onRetry,
}: DownloadsPanelProps) {
  if (jobs.length === 0) return null;

  async function handleRetry(job: ReportJob) {
    try {
      await onRetry(job.spec, job.format);
      toast.success("Формируется заново");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось запустить выгрузку",
      );
    }
  }

  return (
    <div className="border-border bg-card/70 rounded-xl border p-4 shadow-sm backdrop-blur-xl">
      <h2 className="text-foreground text-sm font-medium">Мои выгрузки</h2>
      <ul className="mt-3 space-y-2">
        {jobs.map(({ id, query }) => {
          const job = query.data;
          return (
            <li
              className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              key={id}
            >
              {!job && query.isLoading && (
                <span className="text-muted-foreground">Загрузка…</span>
              )}
              {job && (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-foreground font-medium uppercase">
                      {job.format}
                    </span>
                    <JobStatusBadge status={job.status} />
                    <span className="text-muted-foreground truncate">
                      {job.status === "failed"
                        ? describeJobFailure(job)
                        : job.status === "ready"
                          ? `${job.rows_count ?? 0} строк · ${formatBytes(job.file_size)}${
                              job.expires_at
                                ? ` · доступно до ${new Date(job.expires_at).toLocaleString("ru-RU")}`
                                : ""
                            }`
                          : ""}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {job.status === "ready" && job.download_url && (
                      <Button asChild size="m" variant="ghost">
                        <a href={job.download_url}>Скачать</a>
                      </Button>
                    )}
                    {job.status === "failed" && (
                      <Button
                        onClick={() => handleRetry(job)}
                        size="icon"
                        title="Повторить"
                        type="button"
                        variant="ghost"
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => removeJob(id)}
                      size="icon"
                      title="Убрать из списка"
                      type="button"
                      variant="ghost"
                    >
                      <X className="size-4" />
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
