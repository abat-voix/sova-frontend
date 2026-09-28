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
  Organization,
  OrganizationMapPoint,
  OrganizationType,
  WriteOrganization,
} from "@/types/organization";

export const organizationsPageSize = 20;

type OrganizationMapResponse =
  OrganizationMapPoint[] | PaginatedResponse<OrganizationMapPoint>;

function normalizeOrganizationMapResponse(
  response: OrganizationMapResponse,
): OrganizationMapPoint[] {
  return Array.isArray(response) ? response : response.results;
}

/** `all` параметр не отправляет: бэкенд отдаёт организации в обоих состояниях. */
function interactionsParam(filter: InteractionsFilter) {
  if (filter === "all") return undefined;

  return filter === "with" ? "true" : "false";
}

export function getOrganizations(
  page: number,
  search = "",
  interactions: InteractionsFilter = "all",
  rank: RankFilter = "all",
  isActive: boolean | null = null,
  organizationType: OrganizationType | null = null,
) {
  const query = buildQuery({
    ...rankParams(rank),
    has_interactions: interactionsParam(interactions),
    is_active: isActive === null ? undefined : String(isActive),
    organization_type: organizationType ?? undefined,
    ordering: rankOrdering(rank),
    page,
    page_size: organizationsPageSize,
    search: search.trim(),
  });

  return getJson<PaginatedResponse<Organization>>(
    `${apiEndpoints.catalog.organizations.list}?${query}`,
  );
}

export function getOrganization(id: string) {
  return getJson<Organization>(apiEndpoints.catalog.organizations.detail(id));
}

export function createOrganization(
  payload: WriteOrganization,
  csrfToken: string,
) {
  return postJson<Organization>(
    apiEndpoints.catalog.organizations.list,
    payload,
    csrfToken,
  );
}

export function updateOrganization(
  id: string,
  payload: WriteOrganization,
  csrfToken: string,
) {
  return patchJson<Organization>(
    apiEndpoints.catalog.organizations.detail(id),
    payload,
    csrfToken,
  );
}

export function getOrganizationMapPoints(
  search = "",
  interactions: InteractionsFilter = "all",
  rank: RankFilter = "all",
  isActive: boolean | null = null,
  organizationType: OrganizationType | null = null,
) {
  const query = buildQuery({
    ...rankParams(rank),
    has_interactions: interactionsParam(interactions),
    is_active: isActive === null ? undefined : String(isActive),
    organization_type: organizationType ?? undefined,
    search: search.trim(),
  });

  return getJson<OrganizationMapResponse>(
    query
      ? `${apiEndpoints.catalog.organizations.map}?${query}`
      : apiEndpoints.catalog.organizations.map,
  ).then(normalizeOrganizationMapResponse);
}
