import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchReportPreview } from "./api";
import { useDebouncedValue } from "./use-debounced-value";
import type { PreviewParams } from "./types";

export function useReportPreview(params: PreviewParams) {
  const debounced = useDebouncedValue(params, 450);

  return useQuery({
    queryKey: ["reports", "preview", debounced],
    queryFn: ({ signal }) => fetchReportPreview(debounced, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });
}
