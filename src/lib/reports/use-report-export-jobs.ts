"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { createReportExport, getReportJob } from "@/lib/api/reports/reports";
import { ApiError } from "@/lib/api/http";
import {
  addTrackedJobId,
  loadTrackedJobIds,
  removeTrackedJobId,
} from "@/lib/reports/report-job-storage";
import type { ReportFilters, ReportFormat, ReportJob } from "@/types/report";

const jobQueryRoot = ["reports", "job"] as const;

function isPending(status: ReportJob["status"]) {
  return status === "queued" || status === "running";
}

/**
 * Список выгрузок пользователя и их опрос.
 *
 * Эндпоинта со списком заданий нет — id хранятся в `localStorage`
 * (`report-job-storage.ts`), а статус каждого опрашивается отдельно: первые
 * несколько раз через 1 с, дальше с нарастающим интервалом до 5 с. Опрос
 * останавливается, когда вкладка скрыта, и возобновляется при возврате.
 */
export function useReportExportJobs(csrfToken: string) {
  const queryClient = useQueryClient();
  const [jobIds, setJobIds] = useState<string[]>(() => loadTrackedJobIds());

  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden) {
        queryClient.invalidateQueries({ queryKey: jobQueryRoot });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [queryClient]);

  const results = useQueries({
    queries: jobIds.map((id) => ({
      queryKey: [...jobQueryRoot, id],
      queryFn: () => getReportJob(id),
      retry: false,
      refetchInterval: (query: {
        state: { data?: ReportJob; dataUpdateCount: number };
      }) => {
        if (typeof document !== "undefined" && document.hidden) return false;
        const data = query.state.data;
        if (!data || !isPending(data.status)) return false;
        const attempts = query.state.dataUpdateCount;
        if (attempts <= 3) return 1000;
        return Math.min(1000 * 1.5 ** (attempts - 3), 5000);
      },
    })),
  });

  const removeJob = useCallback(
    (id: string) => {
      setJobIds(removeTrackedJobId(id));
      queryClient.removeQueries({ queryKey: [...jobQueryRoot, id] });
    },
    [queryClient],
  );

  useEffect(() => {
    jobIds.forEach((id, index) => {
      const result = results[index];
      if (
        result?.isError &&
        result.error instanceof ApiError &&
        (result.error.status === 404 || result.error.status === 410)
      ) {
        removeJob(id);
      }
    });
    // Тело эффекта зависит только от набора отслеживаемых заданий и их
    // текущих результатов запроса.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIds, results]);

  const addJob = useCallback(
    (job: ReportJob) => {
      setJobIds(addTrackedJobId(job.id));
      queryClient.setQueryData([...jobQueryRoot, job.id], job);
    },
    [queryClient],
  );

  const startExport = useCallback(
    async (filters: ReportFilters, format: ReportFormat) => {
      const job = await createReportExport(filters, format, csrfToken);
      addJob(job);
      return job;
    },
    [addJob, csrfToken],
  );

  const jobs = jobIds.map((id, index) => ({ id, query: results[index] }));

  return { jobs, removeJob, startExport };
}

export type ReportExportJobEntry = ReturnType<
  typeof useReportExportJobs
>["jobs"][number];
