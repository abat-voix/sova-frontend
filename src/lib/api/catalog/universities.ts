import { apiEndpoints } from "@/lib/api/endpoints";
import type { PaginatedResponse } from "@/types/api";
import type { University, UniversityMapPoint } from "@/types/university";

export const universitiesPageSize = 20;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`University request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getUniversities(page: number, search = "") {
  const searchParams = new URLSearchParams({
    page: String(page),
    page_size: String(universitiesPageSize),
  });
  const normalizedSearch = search.trim();
  if (normalizedSearch) searchParams.set("search", normalizedSearch);

  return getJson<PaginatedResponse<University>>(
    `${apiEndpoints.catalog.universities.list}?${searchParams}`,
  );
}

export function getUniversity(id: string) {
  return getJson<University>(apiEndpoints.catalog.universities.detail(id));
}

export function getUniversityMapPoints(search = "") {
  const normalizedSearch = search.trim();
  if (!normalizedSearch) {
    return getJson<UniversityMapPoint[]>(apiEndpoints.catalog.universities.map);
  }

  const searchParams = new URLSearchParams({ search: normalizedSearch });
  return getJson<UniversityMapPoint[]>(
    `${apiEndpoints.catalog.universities.map}?${searchParams}`,
  );
}
