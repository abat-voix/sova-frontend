export type CatalogType =
  | "organization"
  | "vendor"
  | "direction"
  | "program"
  | "product"
  | "contact_person"
  | "contract_registry"
  // Только маппинг колонок файла «Пользователи»; загрузка — в разделе «Обучение»
  | "learner";

/** Поле системы и колонка файла, из которой оно берётся (`null` — не задана). */
export type CatalogImportMappingField = {
  target_field: string;
  label: string;
  required: boolean;
  source_column: string | null;
};

export type CatalogImportRowMessage = { row: number; message: string };

export type CatalogImportResult = {
  catalog_type: CatalogType;
  created: number;
  updated: number;
  warnings: CatalogImportRowMessage[];
};

/** `import_failed` — ошибки строк, `import_error` — файл целиком. */
export type CatalogImportFailure = {
  code: "import_failed" | "import_error";
  detail: string;
  errors: CatalogImportRowMessage[];
  errorsTotal: number;
};
