export type ReportFormat = "xlsx" | "xls" | "pdf" | "json";

export type ReportOrdering =
  "-created_at" | "created_at" | "university" | "responsible";

export type ReportColumn =
  | "university"
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

export type ReportFilters = {
  date_from: string | null;
  date_to: string | null;
  universities: string[];
  directions: string[];
  programs: string[];
  products: string[];
  responsibles: number[];
  ordering: ReportOrdering;
  columns: ReportColumn[] | null;
};

export const emptyReportFilters: ReportFilters = {
  date_from: null,
  date_to: null,
  universities: [],
  directions: [],
  programs: [],
  products: [],
  responsibles: [],
  ordering: "-created_at",
  columns: null,
};

export type ReportPreviewParams = ReportFilters & {
  page: number;
  page_size: number;
};

export type ReportAvailableColumn = {
  key: ReportColumn;
  title: string;
};

export type ReportMeta = {
  report_type: string;
  generated_at: string;
  period_basis: string;
  active_stage_status: string;
  /** Пояснение, на какой момент показано состояние — выводится под таблицей. */
  state_note: string;
  filters: Partial<ReportFilters>;
  columns: ReportAvailableColumn[];
  available_columns: ReportAvailableColumn[];
};

export type ReportProcessStatus = {
  workflow_instance_id: string;
  workflow: string;
  status: string;
  label: string;
};

export type ReportActiveStage = {
  id: string;
  name: string;
  context_type: string;
};

/**
 * Одна строка отчёта — продукт взаимодействия (с программой и направлением).
 * Ключ строки в таблице — комбинация `interaction_id` + `interaction_direction_id`
 * + `interaction_program_id` + `interaction_product_id`.
 */
export type ReportRow = {
  interaction_id: string;
  interaction_direction_id: string | null;
  interaction_program_id: string | null;
  interaction_product_id: string | null;
  university_id: string | null;
  program_id: string | null;
  /** Действующие КАМы взаимодействия по алфавиту. */
  responsible_ids: number[];
  university?: string;
  direction?: string;
  program?: string;
  product?: string;
  process_status?: ReportProcessStatus[];
  active_stages?: ReportActiveStage[];
  /** Имена КАМов в порядке `responsible_ids`. */
  responsible?: string[];
  created_at?: string;
  updated_at?: string;
  contract_numbers?: string[];
  contract_signed_at?: string[];
  license_status?: string;
  license_valid_until_year?: number | null;
};

export type ReportPreviewResponse = {
  count: number;
  page: number;
  page_size: number;
  results: ReportRow[];
  meta: ReportMeta;
};

export type ReportDistributionEntry = {
  id?: string | null;
  status?: string | null;
  stage?: string | null;
  label: string;
  interactions: number;
};

export type ReportSummaryResponse = {
  interactions_count: number;
  rows_count: number;
  programs_count: number;
  products_count: number;
  by_responsible: ReportDistributionEntry[];
  by_university: ReportDistributionEntry[];
  by_process_status: ReportDistributionEntry[];
  by_active_stage: ReportDistributionEntry[];
  metrics: ReportMetric[];
  charts: ReportChart[];
  chart_meta: {
    locale: "ru" | "en";
    granularity: "day" | "week" | "month";
  };
  meta: ReportMeta;
};

export type ReportMetric = {
  id: string;
  label: string;
  value: number;
  display_value: string;
};

export type ReportChartPoint = {
  key: string;
  label: string;
  value: number;
  display_value: string;
};

export type ReportChartItem = Omit<ReportChartPoint, "key"> & {
  key: string | null;
};

export type ReportLineChart = {
  id: string;
  kind: "line";
  title: string;
  description: string;
  value_label: string;
  empty_message: string;
  tone: string;
  points: ReportChartPoint[];
};

export type ReportHorizontalBarChart = {
  id: string;
  kind: "horizontal_bar";
  title: string;
  description: string;
  value_label: string;
  empty_message: string;
  tone: string;
  items: ReportChartItem[];
};

export type ReportChart = ReportLineChart | ReportHorizontalBarChart;

export type ReportJobStatus = "queued" | "running" | "ready" | "failed";

export type ReportJobErrorCode =
  "too_large" | "pdf_unavailable" | "timeout" | "internal_error" | "";

export type ReportJob = {
  id: string;
  report_type: string;
  format: ReportFormat;
  status: ReportJobStatus;
  spec: ReportFilters;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  /** После этого момента скачивание отвечает 410. */
  expires_at: string | null;
  file_size: number | null;
  rows_count: number | null;
  error_code: ReportJobErrorCode;
  error_message: string;
  /** Есть только при `status: "ready"`. */
  download_url: string | null;
};
