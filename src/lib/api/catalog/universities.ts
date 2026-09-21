import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  InteractionsFilter,
  University,
  UniversityMapPoint,
} from "@/types/university";

export const universitiesPageSize = 20;

/** `all` параметр не отправляет: бэкенд отдаёт вузы в обоих состояниях. */
function interactionsParam(filter: InteractionsFilter) {
  if (filter === "all") return undefined;

  return filter === "with" ? "true" : "false";
}

export function getUniversities(
  page: number,
  search = "",
  interactions: InteractionsFilter = "all",
) {
  const query = buildQuery({
    has_interactions: interactionsParam(interactions),
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

export function getUniversityMapPoints(
  search = "",
  interactions: InteractionsFilter = "all",
) {
  const query = buildQuery({
    has_interactions: interactionsParam(interactions),
    search: search.trim(),
  });

  return getJson<UniversityMapPoint[]>(
    query
      ? `${apiEndpoints.catalog.universities.map}?${query}`
      : apiEndpoints.catalog.universities.map,
  );
}
