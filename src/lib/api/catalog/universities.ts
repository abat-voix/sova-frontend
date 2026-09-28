import { apiEndpoints } from "@/lib/api/endpoints";
import {
  rankOrdering,
  rankParams,
  type RankFilter,
} from "@/lib/api/catalog/rank";
import { buildQuery, getJson, patchJson, postJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  InteractionsFilter,
  University,
  UniversityMapPoint,
  WriteUniversity,
} from "@/types/university";

export const universitiesPageSize = 20;

type UniversityMapResponse =
  UniversityMapPoint[] | PaginatedResponse<UniversityMapPoint>;

function normalizeUniversityMapResponse(
  response: UniversityMapResponse,
): UniversityMapPoint[] {
  return Array.isArray(response) ? response : response.results;
}

/** `all` параметр не отправляет: бэкенд отдаёт вузы в обоих состояниях. */
function interactionsParam(filter: InteractionsFilter) {
  if (filter === "all") return undefined;

  return filter === "with" ? "true" : "false";
}

export function getUniversities(
  page: number,
  search = "",
  interactions: InteractionsFilter = "all",
  rank: RankFilter = "all",
  isActive: boolean | null = null,
) {
  const query = buildQuery({
    ...rankParams(rank),
    has_interactions: interactionsParam(interactions),
    is_active: isActive === null ? undefined : String(isActive),
    ordering: rankOrdering(rank),
    page,
    page_size: universitiesPageSize,
    search: search.trim(),
  });

  return getJson<PaginatedResponse<University>>(
    `${apiEndpoints.catalog.universities.list}?${query}`,
  );
}

export function getUniversity(id: string) {
  return getJson<University>(apiEndpoints.catalog.universities.detail(id));
}

export function createUniversity(payload: WriteUniversity, csrfToken: string) {
  return postJson<University>(
    apiEndpoints.catalog.universities.list,
    payload,
    csrfToken,
  );
}

export function updateUniversity(
  id: string,
  payload: WriteUniversity,
  csrfToken: string,
) {
  return patchJson<University>(
    apiEndpoints.catalog.universities.detail(id),
    payload,
    csrfToken,
  );
}

export function getUniversityMapPoints(
  search = "",
  interactions: InteractionsFilter = "all",
  rank: RankFilter = "all",
  isActive: boolean | null = null,
) {
  const query = buildQuery({
    ...rankParams(rank),
    has_interactions: interactionsParam(interactions),
    is_active: isActive === null ? undefined : String(isActive),
    search: search.trim(),
  });

  return getJson<UniversityMapResponse>(
    query
      ? `${apiEndpoints.catalog.universities.map}?${query}`
      : apiEndpoints.catalog.universities.map,
  ).then(normalizeUniversityMapResponse);
}
