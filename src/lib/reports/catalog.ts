import { API_BASE_PATH } from "@/lib/env";

export type CatalogKind =
  "organizations" | "directions" | "programs" | "products" | "responsibles";

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
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  const query = params.toString();
  const url = `${API_BASE_PATH}/catalog/${kind}/${query ? `?${query}` : ""}`;

  const res = await fetch(url, { credentials: "include", signal });
  if (!res.ok) return [];

  const data: CatalogListResponse = await res.json();
  return data.results ?? [];
}
