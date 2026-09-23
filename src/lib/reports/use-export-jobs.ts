import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { createReportExport, fetchReportJob } from "./api";
import {
  addTrackedJobId,
  loadTrackedJobIds,
  removeTrackedJobId,
} from "./storage";
import { ReportApiError } from "./types";
import type { ReportFilters, ReportFormat, ReportJob } from "./types";

const JOB_QUERY_ROOT = ["reports", "job"] as const;

function isJobPending(status: ReportJob["status"]) {
  return status === "queued" || status === "running";
}

export function useExportJobs() {
  const queryClient = useQueryClient();
  const [jobIds, setJobIds] = useState<string[]>(() => loadTrackedJobIds());

  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden) {
        queryClient.invalidateQueries({ queryKey: JOB_QUERY_ROOT });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [queryClient]);

  const results = useQueries({
    queries: jobIds.map((id) => ({
      queryKey: [...JOB_QUERY_ROOT, id],
      queryFn: () => fetchReportJob(id),
      retry: false,
      refetchInterval: (query: {
        state: { data?: ReportJob; dataUpdateCount: number };
      }) => {
        if (typeof document !== "undefined" && document.hidden) return false;
        const data = query.state.data;
        if (!data || !isJobPending(data.status)) return false;
        const attempts = query.state.dataUpdateCount;
        if (attempts <= 3) return 1000;
        return Math.min(1000 * 1.5 ** (attempts - 3), 5000);
      },
    })),
  });

  const removeJob = useCallback(
    (id: string) => {
      setJobIds(removeTrackedJobId(id));
      queryClient.removeQueries({ queryKey: [...JOB_QUERY_ROOT, id] });
    },
    [queryClient],
  );

  useEffect(() => {
    jobIds.forEach((id, index) => {
      const result = results[index];
      if (
        result?.isError &&
        result.error instanceof ReportApiError &&
        (result.error.status === 404 || result.error.status === 410)
      ) {
        removeJob(id);
      }
    });
    // Only re-run when the set of tracked jobs or their query results change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIds, results]);

  const addJob = useCallback(
    (job: ReportJob) => {
      setJobIds(addTrackedJobId(job.id));
      queryClient.setQueryData([...JOB_QUERY_ROOT, job.id], job);
    },
    [queryClient],
  );

  const startExport = useCallback(
    async (filters: ReportFilters, format: ReportFormat) => {
      const job = await createReportExport(filters, format);
      addJob(job);
      return job;
    },
    [addJob],
  );

  const jobs = jobIds.map((id, index) => ({ id, query: results[index] }));

  return { jobs, startExport, removeJob };
}

export type ExportJobEntry = ReturnType<typeof useExportJobs>["jobs"][number];
