import { publicEnv } from "@/lib/env";

export type CatalogKind =
  "universities" | "directions" | "programs" | "products" | "responsibles";

export interface CatalogOption {
  id: string;
  label: string;
}

interface CatalogListResponse {
  results: CatalogOption[];
}

/**
 * Contract assumed, not yet confirmed by the backend: GET /api/catalog/{kind}/?search=
 * returning {results: {id, label}[]}. Swap this out once the real catalog
 * endpoints/OpenAPI schema are published.
 */
export async function fetchCatalogOptions(
  kind: CatalogKind,
  search: string,
  signal?: AbortSignal,
): Promise<CatalogOption[]> {
  const url = new URL(
    `${kind}/`,
    `${publicEnv.NEXT_PUBLIC_API_URL}/api/catalog/`,
  );
  if (search.trim()) url.searchParams.set("search", search.trim());

  const res = await fetch(url, { credentials: "include", signal });
  if (!res.ok) return [];

  const data: CatalogListResponse = await res.json();
  return data.results ?? [];
}
