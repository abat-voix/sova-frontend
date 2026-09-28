import { apiEndpoints } from "@/lib/api/endpoints";
import { rankParams, type RankFilter } from "@/lib/api/catalog/rank";
import { buildQuery, getJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type { Direction, Product, Program } from "@/types/catalog";

export const itCatalogPageSize = 20;

export type CatalogListQuery = {
  directionId?: string | null;
  hasProducts?: boolean | null;
  isActive?: boolean | null;
  ordering?: string | null;
  page: number;
  programId?: string | null;
  rank?: RankFilter;
  search?: string;
};

function catalogQuery({
  directionId,
  hasProducts,
  isActive,
  ordering,
  page,
  programId,
  rank = "all",
  search,
}: CatalogListQuery) {
  return buildQuery({
    ...rankParams(rank),
    direction__ids: directionId ?? undefined,
    has_products:
      hasProducts === null || hasProducts === undefined
        ? undefined
        : String(hasProducts),
    is_active:
      isActive === null || isActive === undefined
        ? undefined
        : String(isActive),
    ordering: ordering ?? undefined,
    page,
    page_size: itCatalogPageSize,
    program__ids: programId ?? undefined,
    search: search?.trim(),
  });
}

export function getDirections(query: CatalogListQuery) {
  return getJson<PaginatedResponse<Direction>>(
    `${apiEndpoints.catalog.directions.list}?${catalogQuery(query)}`,
  );
}

export function getDirection(id: string) {
  return getJson<Direction>(apiEndpoints.catalog.directions.detail(id));
}

export function getPrograms(query: CatalogListQuery) {
  return getJson<PaginatedResponse<Program>>(
    `${apiEndpoints.catalog.programs.list}?${catalogQuery(query)}`,
  );
}

export function getProgram(id: string) {
  return getJson<Program>(apiEndpoints.catalog.programs.detail(id));
}

export function getProducts(query: CatalogListQuery) {
  return getJson<PaginatedResponse<Product>>(
    `${apiEndpoints.catalog.products.list}?${catalogQuery(query)}`,
  );
}

export function getProduct(id: string) {
  return getJson<Product>(apiEndpoints.catalog.products.detail(id));
}
