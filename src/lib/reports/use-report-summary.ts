import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchReportSummary } from "./api";
import { useDebouncedValue } from "./use-debounced-value";
import type { ReportFilters } from "./types";

export function useReportSummary(filters: ReportFilters) {
  const debounced = useDebouncedValue(filters, 450);

  return useQuery({
    queryKey: ["reports", "summary", debounced],
    queryFn: ({ signal }) => fetchReportSummary(debounced, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });
}
