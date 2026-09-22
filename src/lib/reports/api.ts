import { publicEnv } from "@/lib/env";

import { reportsApi } from "./client";
import type {
  PreviewParams,
  ReportFilters,
  ReportFormat,
  ReportJob,
  ReportPreviewResponse,
  ReportSummaryResponse,
} from "./types";

export function fetchReportPreview(
  params: PreviewParams,
  signal?: AbortSignal,
): Promise<ReportPreviewResponse> {
  return reportsApi<ReportPreviewResponse>("interactions/preview/", {
    body: params,
    signal,
  });
}

export function fetchReportSummary(
  filters: ReportFilters,
  signal?: AbortSignal,
): Promise<ReportSummaryResponse> {
  return reportsApi<ReportSummaryResponse>("interactions/summary/", {
    body: filters,
    signal,
  });
}

export function createReportExport(
  filters: ReportFilters,
  format: ReportFormat,
): Promise<ReportJob> {
  return reportsApi<ReportJob>("interactions/exports/", {
    body: { ...filters, format },
  });
}

export function fetchReportJob(id: string): Promise<ReportJob> {
  return reportsApi<ReportJob>(`exports/${id}/`);
}

export function reportJobDownloadUrl(id: string): string {
  return new URL(
    `exports/${id}/download/`,
    `${publicEnv.NEXT_PUBLIC_API_URL}/api/reports/`,
  ).toString();
}
