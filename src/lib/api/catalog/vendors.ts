import { apiEndpoints } from "@/lib/api/endpoints";
import {
  buildQuery,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type { Vendor, WriteVendor } from "@/types/vendor";

export const vendorsPageSize = 20;

export type VendorsQuery = {
  isActive: boolean | null;
  ordering: string | null;
  page: number;
  search: string;
};

export function vendorsQueryKey(params?: VendorsQuery) {
  return params
    ? (["catalog", "vendors", "list", params] as const)
    : (["catalog", "vendors"] as const);
}

export function getVendors({ isActive, ordering, page, search }: VendorsQuery) {
  const query = buildQuery({
    is_active: isActive === null ? undefined : String(isActive),
    ordering: ordering ?? undefined,
    page,
    page_size: vendorsPageSize,
    search: search.trim(),
  });

  return getJson<PaginatedResponse<Vendor>>(
    `${apiEndpoints.catalog.vendors.list}?${query}`,
  );
}

export function getVendor(id: string) {
  return getJson<Vendor>(apiEndpoints.catalog.vendors.detail(id));
}

export function createVendor(payload: WriteVendor, csrfToken: string) {
  return postJson<Vendor>(
    apiEndpoints.catalog.vendors.list,
    payload,
    csrfToken,
  );
}

export function updateVendor(
  id: string,
  payload: Partial<WriteVendor>,
  csrfToken: string,
) {
  return patchJson<Vendor>(
    apiEndpoints.catalog.vendors.detail(id),
    payload,
    csrfToken,
  );
}

export function deleteVendor(id: string, csrfToken: string) {
  return deleteJson(apiEndpoints.catalog.vendors.detail(id), csrfToken);
}
