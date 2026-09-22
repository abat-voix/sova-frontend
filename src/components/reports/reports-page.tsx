"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/lib/reports/constants";
import { describeApiError } from "@/lib/reports/errors";
import {
  filtersFromSearchParams,
  filtersToSearchParams,
} from "@/lib/reports/query-params";
import { useExportJobs } from "@/lib/reports/use-export-jobs";
import { useReportPreview } from "@/lib/reports/use-report-preview";
import { useReportSummary } from "@/lib/reports/use-report-summary";
import type { ReportFilters } from "@/lib/reports/types";

import { DistributionBars } from "./distribution-bars";
import { DownloadsPanel } from "./downloads-panel";
import { ExportMenu } from "./export-menu";
import { FiltersForm } from "./filters-form";
import { ReportTable } from "./report-table";
import { SummaryCards } from "./summary-cards";

export function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ReportFilters>(() =>
    filtersFromSearchParams(searchParams),
  );
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get("page"));
    return Number.isFinite(p) && p > 0 ? p : 1;
  });

  function updateFilters(next: ReportFilters) {
    setFilters(next);
    setPage(1);
    const params = filtersToSearchParams(next);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function updatePage(next: number) {
    setPage(next);
    const params = filtersToSearchParams(filters, { page: next });
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const previewParams = useMemo(
    () => ({ ...filters, page, page_size: DEFAULT_PAGE_SIZE }),
    [filters, page],
  );

  const previewQuery = useReportPreview(previewParams);
  const summaryQuery = useReportSummary(filters);
  const { jobs, startExport, removeJob } = useExportJobs();

  const availableColumns =
    previewQuery.data?.meta.available_columns ??
    summaryQuery.data?.meta.available_columns ??
    [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">
            Отчёты по взаимодействиям с вузами
          </h1>
          <p className="text-muted-foreground text-sm">
            Предпросмотр, сводка и выгрузка в XLSX / XLS / PDF / JSON
          </p>
        </div>
        <ExportMenu
          filters={filters}
          onExport={startExport}
          rowCount={previewQuery.data?.count}
        />
      </header>

      <FiltersForm
        availableColumns={availableColumns}
        filters={filters}
        onChange={updateFilters}
      />

      {summaryQuery.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {describeApiError(summaryQuery.error)}
        </p>
      )}
      {summaryQuery.data && (
        <>
          <SummaryCards summary={summaryQuery.data} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DistributionBars
              entries={summaryQuery.data.by_responsible}
              title="По ответственным"
            />
            <DistributionBars
              entries={summaryQuery.data.by_university}
              title="По вузам"
            />
            <DistributionBars
              entries={summaryQuery.data.by_process_status}
              title="По статусу процесса"
            />
            <DistributionBars
              entries={summaryQuery.data.by_active_stage}
              title="По актуальному этапу"
            />
          </div>
        </>
      )}

      {previewQuery.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {describeApiError(previewQuery.error)}
        </p>
      )}
      <ReportTable
        data={previewQuery.data}
        isLoading={previewQuery.isLoading}
        onPageChange={updatePage}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
      />

      <DownloadsPanel jobs={jobs} onRetry={startExport} removeJob={removeJob} />
    </div>
  );
}
