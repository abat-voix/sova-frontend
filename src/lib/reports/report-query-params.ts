import {
  emptyReportFilters,
  type ReportColumn,
  type ReportFilters,
  type ReportOrdering,
} from "@/types/report";

const orderings: ReportOrdering[] = [
  "-created_at",
  "created_at",
  "organization",
  "responsible",
];

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseIntList(value: string | null): number[] {
  return parseList(value)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
}

/** Читает фильтры отчёта из query-параметров URL — так на отчёт можно поделиться ссылкой. */
export function reportFiltersFromSearchParams(
  params: URLSearchParams,
): ReportFilters {
  const ordering = params.get("ordering") as ReportOrdering | null;
  const columns = params.get("columns");

  return {
    columns: columns ? (parseList(columns) as ReportColumn[]) : null,
    date_from: params.get("date_from") || null,
    date_to: params.get("date_to") || null,
    directions: parseList(params.get("directions")),
    ordering:
      ordering && orderings.includes(ordering) ? ordering : "-created_at",
    products: parseList(params.get("products")),
    programs: parseList(params.get("programs")),
    responsibles: parseIntList(params.get("responsibles")),
    organizations: parseList(params.get("organizations")),
  };
}

export function reportFiltersToSearchParams(
  filters: ReportFilters,
  extra?: Record<string, string | number | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.organizations.length)
    params.set("organizations", filters.organizations.join(","));
  if (filters.directions.length)
    params.set("directions", filters.directions.join(","));
  if (filters.programs.length)
    params.set("programs", filters.programs.join(","));
  if (filters.products.length)
    params.set("products", filters.products.join(","));
  if (filters.responsibles.length)
    params.set("responsibles", filters.responsibles.join(","));
  if (filters.ordering !== emptyReportFilters.ordering)
    params.set("ordering", filters.ordering);
  if (filters.columns?.length) params.set("columns", filters.columns.join(","));

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) params.set(key, String(value));
    }
  }

  return params;
}
