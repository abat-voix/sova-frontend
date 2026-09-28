import { apiEndpoints } from "@/lib/api/endpoints";
import {
  rankOrdering,
  rankParams,
  type RankFilter,
} from "@/lib/api/catalog/rank";
import { buildQuery, getJson, patchJson, postJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type { B2CClient, B2CClientKind, WriteB2CClient } from "@/types/catalog";

export const b2cClientsPageSize = 20;

export type B2CClientsQuery = {
  isActive: boolean | null;
  kind: B2CClientKind | null;
  page: number;
  rank: RankFilter;
  search: string;
};

export function b2cClientsQueryKey(params: Omit<B2CClientsQuery, "page">) {
  return ["catalog", "b2c-clients", "list", params] as const;
}

export function getB2CClients({
  isActive,
  kind,
  page,
  rank,
  search,
}: B2CClientsQuery) {
  const query = buildQuery({
    ...rankParams(rank),
    is_active: isActive === null ? undefined : String(isActive),
    kind: kind ?? undefined,
    ordering: rankOrdering(rank, "full_name"),
    page,
    page_size: b2cClientsPageSize,
    search: search.trim(),
  });

  return getJson<PaginatedResponse<B2CClient>>(
    `${apiEndpoints.catalog.b2cClients.list}?${query}`,
  );
}

export function getB2CClient(id: string) {
  return getJson<B2CClient>(apiEndpoints.catalog.b2cClients.detail(id));
}

export function createB2CClient(payload: WriteB2CClient, csrfToken: string) {
  return postJson<B2CClient>(
    apiEndpoints.catalog.b2cClients.list,
    payload,
    csrfToken,
  );
}

export function updateB2CClient(
  id: string,
  payload: WriteB2CClient,
  csrfToken: string,
) {
  return patchJson<B2CClient>(
    apiEndpoints.catalog.b2cClients.detail(id),
    payload,
    csrfToken,
  );
}
