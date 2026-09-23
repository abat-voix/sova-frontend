import { JOB_STATUS_LABELS } from "@/lib/reports/constants";
import type { ReportJobStatus } from "@/lib/reports/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ReportJobStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-primary/15 text-primary",
  ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  failed: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export function JobStatusBadge({ status }: { status: ReportJobStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {JOB_STATUS_LABELS[status] ?? status}
    </span>
  );
}
