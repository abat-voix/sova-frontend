import { apiEndpoints } from "@/lib/api/endpoints";
import { getJson, postJson } from "@/lib/api/http";
import type { Locale } from "@/i18n/translations";
import type {
  ReportFilters,
  ReportFormat,
  ReportJob,
  ReportPreviewParams,
  ReportPreviewResponse,
  ReportSummaryResponse,
} from "@/types/report";

function reportPayload<T extends ReportFilters>(filters: T) {
  return {
    ...filters,
    columns: filters.columns?.length ? filters.columns : undefined,
  };
}

export function getReportPreview(
  params: ReportPreviewParams,
  csrfToken: string,
) {
  return postJson<ReportPreviewResponse>(
    apiEndpoints.reports.interactions.preview,
    reportPayload(params),
    csrfToken,
  );
}

export function getReportSummary(
  filters: ReportFilters,
  csrfToken: string,
  locale: Locale = "ru",
) {
  return postJson<ReportSummaryResponse>(
    apiEndpoints.reports.interactions.summary,
    { ...reportPayload(filters), locale },
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
    { ...reportPayload(filters), format },
    csrfToken,
  );
}

export function getReportJob(id: string) {
  return getJson<ReportJob>(apiEndpoints.reports.exports.detail(id));
}
