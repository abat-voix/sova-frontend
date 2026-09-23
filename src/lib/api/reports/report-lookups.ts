/**
 * Справочники для мультиселектов формы отчёта.
 *
 * В отличие от `catalog/lookups.ts`, программы и продукты здесь не привязаны
 * к выбранному направлению/программе — отчёт фильтрует по каталогу целиком.
 */

import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson } from "@/lib/api/http";
import { lookupPageSize, type LookupOption } from "@/lib/api/catalog/lookups";
import type { PaginatedResponse } from "@/types/api";
import type { Product, Program } from "@/types/catalog";

function lookupQuery(search: string) {
  return buildQuery({
    is_active: "true",
    page: 1,
    page_size: lookupPageSize,
    search: search.trim(),
  });
}

export function searchAllPrograms(search: string) {
  return getJson<PaginatedResponse<Program>>(
    `${apiEndpoints.catalog.programs.list}?${lookupQuery(search)}`,
  ).then((page) =>
    page.results.map((program) => ({ id: program.id, name: program.name })),
  );
}

export function searchAllProducts(search: string) {
  return getJson<PaginatedResponse<Product>>(
    `${apiEndpoints.catalog.products.list}?${lookupQuery(search)}`,
  ).then((page) =>
    page.results.map((product): LookupOption => ({
      id: product.id,
      name: product.name,
    })),
  );
}
