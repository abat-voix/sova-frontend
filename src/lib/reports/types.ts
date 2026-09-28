export type ReportFormat = "xlsx" | "xls" | "pdf" | "json";

export type ReportOrdering =
  "-created_at" | "created_at" | "organization" | "responsible";

export type ReportColumn =
  | "organization"
  | "direction"
  | "program"
  | "product"
  | "process_status"
  | "active_stages"
  | "responsible"
  | "created_at"
  | "updated_at"
  | "contract_numbers"
  | "contract_signed_at"
  | "license_status"
  | "license_valid_until_year";

export interface ReportFilters {
  date_from: string | null;
  date_to: string | null;
  organizations: string[];
  directions: string[];
  programs: string[];
  products: string[];
  responsibles: number[];
  ordering: ReportOrdering;
  columns: ReportColumn[] | null;
}

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  date_from: null,
  date_to: null,
  organizations: [],
  directions: [],
  programs: [],
  products: [],
  responsibles: [],
  ordering: "-created_at",
  columns: null,
};

export interface PreviewParams extends ReportFilters {
  page: number;
  page_size: number;
}

export interface AvailableColumn {
  value: ReportColumn;
  label: string;
}

export interface ReportMeta {
  report_type: string;
  generated_at: string;
  period_basis: string;
  active_stage_status: string;
  state_note: string;
  filters: Partial<ReportFilters>;
  columns: ReportColumn[];
  available_columns: AvailableColumn[];
}

export interface ProcessStatusEntry {
  workflow_instance_id: string;
  workflow: string;
  status: string;
  label: string;
}

export interface ActiveStageEntry {
  id: string;
  name: string;
  context_type: string;
}

export interface ReportRow {
  interaction_id: string;
  interaction_direction_id: string | null;
  interaction_program_id: string | null;
  interaction_product_id: string | null;
  organization_id: string | null;
  program_id: string | null;
  /** Действующие КАМы взаимодействия по алфавиту. */
  responsible_ids: number[];
  organization?: string;
  direction?: string;
  program?: string;
  product?: string;
  process_status?: ProcessStatusEntry[];
  active_stages?: ActiveStageEntry[];
  /** Имена КАМов в порядке `responsible_ids`. */
  responsible?: string[];
  created_at?: string;
  updated_at?: string;
  contract_numbers?: string[];
  contract_signed_at?: string[];
  license_status?: string;
  license_valid_until_year?: number | null;
}

export interface ReportPreviewResponse {
  count: number;
  page: number;
  page_size: number;
  results: ReportRow[];
  meta: ReportMeta;
}

export interface DistributionEntry {
  id?: string | null;
  status?: string | null;
  stage?: string | null;
  label: string;
  interactions: number;
}

export interface ReportSummaryResponse {
  interactions_count: number;
  rows_count: number;
  programs_count: number;
  products_count: number;
  by_responsible: DistributionEntry[];
  by_organization: DistributionEntry[];
  by_process_status: DistributionEntry[];
  by_active_stage: DistributionEntry[];
  meta: ReportMeta;
}

export type ReportJobStatus = "queued" | "running" | "ready" | "failed";

export type ReportJobErrorCode =
  "too_large" | "pdf_unavailable" | "timeout" | "internal_error" | "";

export interface ReportJob {
  id: string;
  report_type: string;
  format: ReportFormat;
  status: ReportJobStatus;
  spec: ReportFilters;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  expires_at: string | null;
  file_size: number | null;
  rows_count: number | null;
  error_code: ReportJobErrorCode;
  error_message: string;
  download_url: string | null;
}

export interface ApiErrorBody {
  detail?: string;
  code?: string;
  [field: string]: unknown;
}

export class ReportApiError extends Error {
  status: number;
  code?: string;
  data: ApiErrorBody | null;

  constructor(status: number, data: ApiErrorBody | null) {
    super(data?.detail ?? `Ошибка запроса (${status})`);
    this.name = "ReportApiError";
    this.status = status;
    this.code = data?.code;
    this.data = data;
  }
}
