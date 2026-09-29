import { apiEndpoints } from "@/lib/api/endpoints";
import { rankParams, type RankFilter } from "@/lib/api/catalog/rank";
import { buildQuery, getJson, patchJson, postJson } from "@/lib/api/http";
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

/** Запись направления: название и внешний код уникальны без учёта регистра. */
export type DirectionPayload = {
  name: string;
  external_code: string | null;
  is_active: boolean;
};

/** Запись программы: направление у программы ровно одно. */
export type ProgramPayload = {
  name: string;
  direction: string;
  is_active: boolean;
};

/** Запись продукта: вендор необязателен, программы — по id. */
export type ProductPayload = {
  name: string;
  external_code: string | null;
  vendor: string | null;
  programs: string[];
  is_active: boolean;
};

// Удаления нет: запись каталога выключают (`is_active`), а не удаляют

export function createDirection(payload: DirectionPayload, csrfToken: string) {
  return postJson<Direction>(
    apiEndpoints.catalog.directions.list,
    payload,
    csrfToken,
  );
}

export function updateDirection(
  id: string,
  payload: DirectionPayload,
  csrfToken: string,
) {
  return patchJson<Direction>(
    apiEndpoints.catalog.directions.detail(id),
    payload,
    csrfToken,
  );
}

export function createProgram(payload: ProgramPayload, csrfToken: string) {
  return postJson<Program>(
    apiEndpoints.catalog.programs.list,
    payload,
    csrfToken,
  );
}

export function updateProgram(
  id: string,
  payload: ProgramPayload,
  csrfToken: string,
) {
  return patchJson<Program>(
    apiEndpoints.catalog.programs.detail(id),
    payload,
    csrfToken,
  );
}

export function createProduct(payload: ProductPayload, csrfToken: string) {
  return postJson<Product>(
    apiEndpoints.catalog.products.list,
    payload,
    csrfToken,
  );
}

export function updateProduct(
  id: string,
  payload: ProductPayload,
  csrfToken: string,
) {
  return patchJson<Product>(
    apiEndpoints.catalog.products.detail(id),
    payload,
    csrfToken,
  );
}
