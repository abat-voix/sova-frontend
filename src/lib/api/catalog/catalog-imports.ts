import { apiEndpoints } from "@/lib/api/endpoints";
import { ApiError, getJson, postFormData, putJson } from "@/lib/api/http";
import type {
  CatalogImportFailure,
  CatalogImportMappingField,
  CatalogImportResult,
  CatalogImportRowMessage,
  CatalogType,
} from "@/types/catalog-import";

export const catalogTypeOptions: { value: CatalogType; label: string }[] = [
  { value: "organization", label: "Организации" },
  { value: "vendor", label: "Вендоры" },
  { value: "direction", label: "Направления" },
  { value: "program", label: "Программы" },
  { value: "product", label: "Продукты" },
  { value: "contact_person", label: "Ответственные от организации" },
  { value: "contract_registry", label: "Реестр договоров" },
];

export const catalogImportMappingQueryKey = (catalogType: CatalogType) =>
  ["catalog", "import-mappings", catalogType] as const;

export function getCatalogImportMapping(catalogType: CatalogType) {
  return getJson<CatalogImportMappingField[]>(
    apiEndpoints.catalog.imports.mappingByType(catalogType),
  );
}

/** Заменяет маппинг типа целиком; пустая колонка — поле не задано. */
export function saveCatalogImportMapping(
  catalogType: CatalogType,
  mappings: Record<string, string>,
  csrfToken: string,
) {
  return putJson<CatalogImportMappingField[]>(
    apiEndpoints.catalog.imports.mappingByType(catalogType),
    { mappings },
    csrfToken,
  );
}

/** Заголовки первой строки файла — их читает бэк тем же кодом, что и импорт. */
export async function readCatalogImportHeaders(file: File, csrfToken: string) {
  const body = new FormData();
  body.set("file", file);
  const response = await postFormData<{ headers: string[] }>(
    apiEndpoints.catalog.imports.headers,
    body,
    csrfToken,
  );
  return response.headers;
}

export function uploadCatalogImport(
  catalogType: CatalogType,
  file: File,
  csrfToken: string,
) {
  const body = new FormData();
  body.set("catalog_type", catalogType);
  body.set("file", file);
  return postFormData<CatalogImportResult>(
    apiEndpoints.catalog.imports.list,
    body,
    csrfToken,
  );
}

/** Ошибка импорта из ответа бэка; прочие ошибки (сеть, 403, валидация полей) — `null`. */
export function readImportFailure(error: unknown): CatalogImportFailure | null {
  if (!(error instanceof ApiError) || !error.body) return null;
  const body = error.body as {
    code?: unknown;
    detail?: unknown;
    errors?: CatalogImportRowMessage[];
    errors_total?: number;
  };
  if (body.code !== "import_failed" && body.code !== "import_error")
    return null;
  return {
    code: body.code,
    detail: typeof body.detail === "string" ? body.detail : "",
    errors: body.errors ?? [],
    errorsTotal: body.errors_total ?? body.errors?.length ?? 0,
  };
}
