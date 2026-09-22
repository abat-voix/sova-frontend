import { apiEndpoints } from "@/lib/api/endpoints";
import { getJson, postJson } from "@/lib/api/http";
import type {
  ReportFilters,
  ReportFormat,
  ReportJob,
  ReportPreviewParams,
  ReportPreviewResponse,
  ReportSummaryResponse,
} from "@/types/report";

export function getReportPreview(
  params: ReportPreviewParams,
  csrfToken: string,
) {
  return postJson<ReportPreviewResponse>(
    apiEndpoints.reports.interactions.preview,
    params,
    csrfToken,
  );
}

export function getReportSummary(filters: ReportFilters, csrfToken: string) {
  return postJson<ReportSummaryResponse>(
    apiEndpoints.reports.interactions.summary,
    filters,
    csrfToken,
  );
}

export function createReportExport(
  filters: ReportFilters,
  format: ReportFormat,
  csrfToken: string,
) {
  return postJson<ReportJob>(
    apiEndpoints.reports.interactions.exports,
    { ...filters, format },
    csrfToken,
  );
}

export function getReportJob(id: string) {
  return getJson<ReportJob>(apiEndpoints.reports.exports.detail(id));
}
