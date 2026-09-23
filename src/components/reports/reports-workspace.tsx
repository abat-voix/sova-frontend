"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  DataTable,
  type DataTableColumn,
  type DataTableLabels,
} from "@/components/ui/data-table";
import { MultiEntitySelect } from "@/components/ui/multi-entity-select";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  searchDirections,
  searchManagers,
  searchUniversities,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import { getReportPreview, getReportSummary } from "@/lib/api/reports/reports";
import {
  searchAllPrograms,
  searchAllProducts,
} from "@/lib/api/reports/report-lookups";
import { resolveReportRequestError } from "@/lib/reports/report-errors";
import {
  reportFiltersFromSearchParams,
  reportFiltersToSearchParams,
} from "@/lib/reports/report-query-params";
import { useReportExportJobs } from "@/lib/reports/use-report-export-jobs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type {
  ReportColumn,
  ReportFilters,
  ReportOrdering,
  ReportRow,
} from "@/types/report";

import { ReportDistribution } from "@/components/reports/report-distribution";
import { ReportDownloadsPanel } from "@/components/reports/report-downloads-panel";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { Button } from "@/components/ui/button";
import { usePersistedFlag } from "@/hooks/use-persisted-flag";

const pageSize = 50;
const filtersDebounceMs = 450;
const maxPeriodDays = 1830;
const filtersCollapsedStorageKey = "sova-reports-filters-collapsed";

const orderingOptions: {
  label: { ru: string; en: string };
  value: ReportOrdering;
}[] = [
  { label: { ru: "Сначала новые", en: "Newest first" }, value: "-created_at" },
  { label: { ru: "Сначала старые", en: "Oldest first" }, value: "created_at" },
  { label: { ru: "По вузу", en: "By university" }, value: "university" },
  {
    label: { ru: "По ответственному", en: "By manager" },
    value: "responsible",
  },
];

const copy = {
  ru: {
    title: "Отчёты по взаимодействиям с вузами",
    description: "Предпросмотр, сводка и выгрузка в XLSX / XLS / PDF / JSON.",
    filters: "Фильтры",
    collapseFilters: "Свернуть фильтры",
    expandFilters: "Развернуть фильтры",
    dateFrom: "С даты",
    dateTo: "По дату",
    periodOrder: "Дата начала должна быть не позже даты окончания.",
    periodTooLong: `Период не может быть длиннее ${maxPeriodDays} дней.`,
    universities: "Вузы",
    directions: "Направления",
    programs: "Программы",
    products: "Продукты",
    responsibles: "Ответственные",
    ordering: "Сортировка",
    columns: "Колонки",
    anyColumns: "Все колонки",
    interactionsCount: "Взаимодействия",
    rowsCount: "Строки",
    programsCount: "Программы",
    productsCount: "Продукты",
    byResponsible: "По ответственным",
    byUniversity: "По вузам",
    byProcessStatus: "По статусу процесса",
    byActiveStage: "По актуальному этапу",
    distributionEmpty: "Нет данных",
    tableCaption: "Строки отчёта",
    loading: "Загружаем отчёт…",
    empty: "Нет данных по выбранным фильтрам.",
    error: "Не удалось загрузить отчёт.",
    retry: "Повторить",
    sortAscending: "Сортировать по возрастанию",
    sortDescending: "Сортировать по убыванию",
    sortNone: "Сбросить сортировку",
    previous: "Предыдущая страница",
    next: "Следующая страница",
    pageOf: (page: number, pages: number) => `Страница ${page} из ${pages}`,
    range: (from: number, to: number, count: number) =>
      `Записи ${from}–${to} из ${count}`,
    noValue: "—",
    generatedAt: (date: string) => `сформировано ${date}`,
  },
  en: {
    title: "University interaction reports",
    description: "Preview, summary, and export to XLSX / XLS / PDF / JSON.",
    filters: "Filters",
    collapseFilters: "Collapse filters",
    expandFilters: "Expand filters",
    dateFrom: "From date",
    dateTo: "To date",
    periodOrder: "The start date must not be later than the end date.",
    periodTooLong: `The period cannot be longer than ${maxPeriodDays} days.`,
    universities: "Universities",
    directions: "Directions",
    programs: "Programs",
    products: "Products",
    responsibles: "Managers",
    ordering: "Sorting",
    columns: "Columns",
    anyColumns: "All columns",
    interactionsCount: "Interactions",
    rowsCount: "Rows",
    programsCount: "Programs",
    productsCount: "Products",
    byResponsible: "By manager",
    byUniversity: "By university",
    byProcessStatus: "By process status",
    byActiveStage: "By current stage",
    distributionEmpty: "No data",
    tableCaption: "Report rows",
    loading: "Loading the report…",
    empty: "No data for the selected filters.",
    error: "The report could not be loaded.",
    retry: "Retry",
    sortAscending: "Sort ascending",
    sortDescending: "Sort descending",
    sortNone: "Clear sorting",
    previous: "Previous page",
    next: "Next page",
    pageOf: (page: number, pages: number) => `Page ${page} of ${pages}`,
    range: (from: number, to: number, count: number) =>
      `Rows ${from}–${to} of ${count}`,
    noValue: "—",
    generatedAt: (date: string) => `generated ${date}`,
  },
} as const;

const intlLocales = { en: "en-GB", ru: "ru-RU" } as const;

function daysBetween(from: string, to: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / msPerDay,
  );
}

function formatCell(
  column: ReportColumn,
  row: ReportRow,
  noValue: string,
): string {
  switch (column) {
    case "process_status":
      return (
        (row.process_status ?? []).map((p) => p.label).join(", ") || noValue
      );
    case "active_stages":
      return (row.active_stages ?? []).map((s) => s.name).join(", ") || noValue;
    case "contract_numbers":
      return (row.contract_numbers ?? []).join(", ") || noValue;
    case "contract_signed_at":
      return (row.contract_signed_at ?? []).join(", ") || noValue;
    case "license_valid_until_year":
      return row.license_valid_until_year != null
        ? String(row.license_valid_until_year)
        : noValue;
    default: {
      const value = row[column];
      return value == null || value === "" ? noValue : String(value);
    }
  }
}

function optionsFromIds(ids: string[]): LookupOption[] {
  return ids.map((id) => ({ id, name: id }));
}

export function ReportsWorkspace() {
  const { locale } = useLocale();
  const text = copy[locale];
  const { csrfToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [areFiltersCollapsed, setAreFiltersCollapsed] = usePersistedFlag(
    filtersCollapsedStorageKey,
  );

  const [filters, setFilters] = useState<ReportFilters>(() =>
    reportFiltersFromSearchParams(searchParams),
  );
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get("page"));
    return Number.isFinite(value) && value > 0 ? value : 1;
  });
  const [universities, setUniversities] = useState(() =>
    optionsFromIds(filters.universities),
  );
  const [directions, setDirections] = useState(() =>
    optionsFromIds(filters.directions),
  );
  const [programs, setPrograms] = useState(() =>
    optionsFromIds(filters.programs),
  );
  const [products, setProducts] = useState(() =>
    optionsFromIds(filters.products),
  );
  const [responsibles, setResponsibles] = useState(() =>
    optionsFromIds(filters.responsibles.map(String)),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedFilters(filters),
      filtersDebounceMs,
    );
    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  function pushFilters(nextFilters: ReportFilters, nextPage: number) {
    const params = reportFiltersToSearchParams(nextFilters, {
      page: nextPage > 1 ? nextPage : undefined,
    });
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function updateFilters(next: ReportFilters) {
    setFilters(next);
    setPage(1);
    pushFilters(next, 1);
  }

  function updatePage(next: number) {
    setPage(next);
    pushFilters(filters, next);
  }

  const previewQuery = useQuery({
    queryKey: ["reports", "preview", { ...debouncedFilters, page, pageSize }],
    queryFn: () =>
      getReportPreview(
        { ...debouncedFilters, page, page_size: pageSize },
        csrfToken,
      ),
    placeholderData: keepPreviousData,
  });
  const summaryQuery = useQuery({
    queryKey: ["reports", "summary", debouncedFilters],
    queryFn: () => getReportSummary(debouncedFilters, csrfToken),
    placeholderData: keepPreviousData,
  });
  const { jobs, removeJob, startExport } = useReportExportJobs(csrfToken);

  const availableColumns = useMemo(
    () =>
      previewQuery.data?.meta.available_columns ??
      summaryQuery.data?.meta.available_columns ??
      [],
    [previewQuery.data, summaryQuery.data],
  );
  const columnLabel = useMemo(
    () => new Map(availableColumns.map((c) => [c.key, c.title])),
    [availableColumns],
  );

  const rows = previewQuery.data?.results ?? [];
  const dataColumns = previewQuery.data?.meta.columns ?? [];
  const tableColumns: DataTableColumn<ReportRow>[] = dataColumns.map(
    (column) => ({
      name: column.key,
      render: (row) => formatCell(column.key, row, text.noValue),
      title: column.title,
    }),
  );
  const tableLabels: DataTableLabels = {
    empty: text.empty,
    error: text.error,
    loading: text.loading,
    retry: text.retry,
    sortAscending: text.sortAscending,
    sortDescending: text.sortDescending,
    sortNone: text.sortNone,
  };

  const tooLong =
    !!filters.date_from &&
    !!filters.date_to &&
    daysBetween(filters.date_from, filters.date_to) > maxPeriodDays;
  const wrongOrder =
    !!filters.date_from &&
    !!filters.date_to &&
    filters.date_from > filters.date_to;

  const selectedColumns = filters.columns ?? availableColumns.map((c) => c.key);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
      <aside
        className={cn(
          "bg-card flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm",
          areFiltersCollapsed
            ? "h-12 md:h-auto md:w-14"
            : "max-h-[60svh] md:max-h-none md:w-80",
        )}
      >
        <div
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b",
            areFiltersCollapsed ? "px-2 md:justify-center md:px-0" : "px-2",
          )}
        >
          <Button
            aria-controls="report-filters"
            aria-expanded={!areFiltersCollapsed}
            aria-label={
              areFiltersCollapsed ? text.expandFilters : text.collapseFilters
            }
            colorScheme="neutral"
            onClick={() => setAreFiltersCollapsed(!areFiltersCollapsed)}
            size="icon"
            title={
              areFiltersCollapsed ? text.expandFilters : text.collapseFilters
            }
            type="button"
            variant="outline"
          >
            {areFiltersCollapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
          </Button>
          {!areFiltersCollapsed ? (
            <h2 className="text-sm font-medium">{text.filters}</h2>
          ) : null}
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 space-y-4 overflow-y-auto p-3 pb-64",
            areFiltersCollapsed && "hidden",
          )}
          id="report-filters"
        >
          <div>
            <div className="flex gap-2">
              <label className="flex-1 text-sm">
                <span className="text-muted-foreground mb-1 block">
                  {text.dateFrom}
                </span>
                <input
                  className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                  onChange={(e) =>
                    updateFilters({
                      ...filters,
                      date_from: e.target.value || null,
                    })
                  }
                  type="date"
                  value={filters.date_from ?? ""}
                />
              </label>
              <label className="flex-1 text-sm">
                <span className="text-muted-foreground mb-1 block">
                  {text.dateTo}
                </span>
                <input
                  className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                  onChange={(e) =>
                    updateFilters({
                      ...filters,
                      date_to: e.target.value || null,
                    })
                  }
                  type="date"
                  value={filters.date_to ?? ""}
                />
              </label>
            </div>
            {wrongOrder ? (
              <p className="mt-1 text-sm text-[var(--atmr-accent-primary)]">
                {text.periodOrder}
              </p>
            ) : tooLong ? (
              <p className="mt-1 text-sm text-[var(--atmr-accent-primary)]">
                {text.periodTooLong}
              </p>
            ) : null}
          </div>

          <MultiEntitySelect
            id="report-universities"
            label={text.universities}
            onChange={(options) => {
              setUniversities(options);
              updateFilters({
                ...filters,
                universities: options.map((o) => o.id),
              });
            }}
            placeholder={text.universities}
            queryKey={["reports", "lookup", "universities"]}
            search={searchUniversities}
            value={universities}
          />
          <MultiEntitySelect
            id="report-directions"
            label={text.directions}
            onChange={(options) => {
              setDirections(options);
              updateFilters({
                ...filters,
                directions: options.map((o) => o.id),
              });
            }}
            placeholder={text.directions}
            queryKey={["reports", "lookup", "directions"]}
            search={searchDirections}
            value={directions}
          />
          <MultiEntitySelect
            id="report-programs"
            label={text.programs}
            onChange={(options) => {
              setPrograms(options);
              updateFilters({ ...filters, programs: options.map((o) => o.id) });
            }}
            placeholder={text.programs}
            queryKey={["reports", "lookup", "programs"]}
            search={searchAllPrograms}
            value={programs}
          />
          <MultiEntitySelect
            id="report-products"
            label={text.products}
            onChange={(options) => {
              setProducts(options);
              updateFilters({ ...filters, products: options.map((o) => o.id) });
            }}
            placeholder={text.products}
            queryKey={["reports", "lookup", "products"]}
            search={searchAllProducts}
            value={products}
          />
          <MultiEntitySelect
            id="report-responsibles"
            label={text.responsibles}
            onChange={(options) => {
              setResponsibles(options);
              updateFilters({
                ...filters,
                responsibles: options.map((o) => Number(o.id)),
              });
            }}
            placeholder={text.responsibles}
            queryKey={["reports", "lookup", "responsibles"]}
            search={searchManagers}
            value={responsibles}
          />

          <label className="block text-sm">
            <span className="text-muted-foreground mb-1 block">
              {text.ordering}
            </span>
            <select
              className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
              onChange={(e) =>
                updateFilters({
                  ...filters,
                  ordering: e.target.value as ReportOrdering,
                })
              }
              value={filters.ordering}
            >
              {orderingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label[locale]}
                </option>
              ))}
            </select>
          </label>

          <MultiEntitySelect
            id="report-columns"
            label={text.columns}
            onChange={(options) => {
              updateFilters({
                ...filters,
                columns: options.length
                  ? options.map((o) => o.id as ReportColumn)
                  : null,
              });
            }}
            placeholder={text.anyColumns}
            queryKey={["reports", "columns", availableColumns]}
            search={async (term) =>
              availableColumns
                .filter((c) =>
                  c.title.toLowerCase().includes(term.toLowerCase()),
                )
                .map((c) => ({ id: c.key, name: c.title }))
            }
            value={selectedColumns.map((value) => ({
              id: value,
              name: columnLabel.get(value) ?? value,
            }))}
          />
        </div>
      </aside>

      <section className="bg-card min-h-0 min-w-0 flex-1 overflow-y-auto rounded-xl border p-4 shadow-sm sm:p-6">
        <div className="space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-medium tracking-[-0.025em] sm:text-3xl">
                {text.title}
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
                {text.description}
              </p>
            </div>
            <ReportExportMenu
              filters={filters}
              onExport={startExport}
              rowCount={previewQuery.data?.count}
            />
          </header>

          {summaryQuery.data ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: text.interactionsCount,
                    value: summaryQuery.data.interactions_count,
                  },
                  {
                    label: text.rowsCount,
                    value: summaryQuery.data.rows_count,
                  },
                  {
                    label: text.programsCount,
                    value: summaryQuery.data.programs_count,
                  },
                  {
                    label: text.productsCount,
                    value: summaryQuery.data.products_count,
                  },
                ].map((card) => (
                  <div
                    className="bg-card rounded-xl border p-4 shadow-sm"
                    key={card.label}
                  >
                    <p className="text-muted-foreground text-sm">
                      {card.label}
                    </p>
                    <p className="mt-1 text-2xl font-medium">
                      {card.value.toLocaleString(intlLocales[locale])}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReportDistribution
                  emptyLabel={text.distributionEmpty}
                  entries={summaryQuery.data.by_responsible}
                  title={text.byResponsible}
                />
                <ReportDistribution
                  emptyLabel={text.distributionEmpty}
                  entries={summaryQuery.data.by_university}
                  title={text.byUniversity}
                />
                <ReportDistribution
                  emptyLabel={text.distributionEmpty}
                  entries={summaryQuery.data.by_process_status}
                  title={text.byProcessStatus}
                />
                <ReportDistribution
                  emptyLabel={text.distributionEmpty}
                  entries={summaryQuery.data.by_active_stage}
                  title={text.byActiveStage}
                />
              </div>
            </>
          ) : summaryQuery.isError ? (
            <p className="text-sm text-[var(--atmr-accent-primary)]">
              {resolveReportRequestError(summaryQuery.error, locale)}
            </p>
          ) : null}

          <DataTable
            caption={text.tableCaption}
            columns={tableColumns}
            footer={
              previewQuery.data ? (
                <TablePagination
                  count={previewQuery.data.count}
                  labels={{
                    next: text.next,
                    pageOf: text.pageOf,
                    previous: text.previous,
                    range: text.range,
                  }}
                  onPageChange={updatePage}
                  page={page}
                  pageSize={pageSize}
                />
              ) : null
            }
            getRowId={(row) =>
              [
                row.interaction_id,
                row.interaction_direction_id ?? "",
                row.interaction_program_id ?? "",
                row.interaction_product_id ?? "",
              ].join("|")
            }
            isError={previewQuery.isError}
            isLoading={previewQuery.isPending}
            labels={tableLabels}
            onRetry={() => void previewQuery.refetch()}
            rows={rows}
          />

          {previewQuery.data?.meta.state_note ? (
            <p className={cn("text-muted-foreground text-xs")}>
              {previewQuery.data.meta.state_note} ·{" "}
              {text.generatedAt(
                new Date(previewQuery.data.meta.generated_at).toLocaleString(
                  intlLocales[locale],
                ),
              )}
            </p>
          ) : null}

          <ReportDownloadsPanel
            jobs={jobs}
            onRetry={startExport}
            removeJob={removeJob}
          />
        </div>
      </section>
    </div>
  );
}
