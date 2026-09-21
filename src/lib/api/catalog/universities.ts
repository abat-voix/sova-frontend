import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type { University, UniversityMapPoint } from "@/types/university";

export const universitiesPageSize = 20;

export function getUniversities(page: number, search = "") {
  const query = buildQuery({
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

export function getUniversityMapPoints(search = "") {
  const query = buildQuery({ search: search.trim() });

  return getJson<UniversityMapPoint[]>(
    query
      ? `${apiEndpoints.catalog.universities.map}?${query}`
      : apiEndpoints.catalog.universities.map,
  );
}
