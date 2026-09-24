import { apiEndpoints } from "@/lib/api/endpoints";
import {
  buildQuery,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  License,
  PatchedWriteLicense,
  WriteLicense,
} from "@/types/license";

export const licensesPageSize = 20;

export type LicenseStateFilter = "all" | "active" | "superseded";
export type LicenseSignedFilter = "all" | "signed" | "unsigned";

export type LicensesQuery = {
  contractId: string | null;
  ordering: string | null;
  page: number;
  productId: string | null;
  search: string;
  signed: LicenseSignedFilter;
  state: LicenseStateFilter;
  /** Год окончания действия, включительно; пустая строка — без границы. */
  validFrom: string;
  validTo: string;
};

export function licensesQueryKey(params?: LicensesQuery) {
  return params
    ? (["interactions", "licenses", "list", params] as const)
    : (["interactions", "licenses"] as const);
}

export function getLicenses({
  contractId,
  ordering,
  page,
  productId,
  search,
  signed,
  state,
  validFrom,
  validTo,
}: LicensesQuery) {
  const query = buildQuery({
    contract__ids: contractId ?? undefined,
    is_active: state === "all" ? undefined : String(state === "active"),
    is_signed: signed === "all" ? undefined : String(signed === "signed"),
    ordering: ordering ?? undefined,
    page,
    page_size: licensesPageSize,
    product__ids: productId ?? undefined,
    search: search.trim(),
    valid_until_year__gte: validFrom,
    valid_until_year__lte: validTo,
  });

  return getJson<PaginatedResponse<License>>(
    `${apiEndpoints.interactions.licenses.list}?${query}`,
  );
}

export function getLicense(id: string) {
  return getJson<License>(apiEndpoints.interactions.licenses.detail(id));
}

export function createLicense(payload: WriteLicense, csrfToken: string) {
  return postJson<License>(
    apiEndpoints.interactions.licenses.list,
    payload,
    csrfToken,
  );
}

export function updateLicense(
  id: string,
  payload: PatchedWriteLicense,
  csrfToken: string,
) {
  return patchJson<License>(
    apiEndpoints.interactions.licenses.detail(id),
    payload,
    csrfToken,
  );
}

export function deleteLicense(id: string, csrfToken: string) {
  return deleteJson(apiEndpoints.interactions.licenses.detail(id), csrfToken);
}
