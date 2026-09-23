import { useQuery } from "@tanstack/react-query";

import { fetchCatalogOptions, type CatalogKind } from "./catalog";
import { useDebouncedValue } from "./use-debounced-value";

export function useCatalogOptions(kind: CatalogKind, search: string) {
  const debouncedSearch = useDebouncedValue(search, 300);

  return useQuery({
    queryKey: ["reports", "catalog", kind, debouncedSearch],
    queryFn: ({ signal }) => fetchCatalogOptions(kind, debouncedSearch, signal),
    staleTime: 60_000,
  });
}
