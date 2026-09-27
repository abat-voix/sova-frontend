"use client";

import { useState } from "react";

import { FileImportFlow } from "@/components/catalog-import/file-import-flow";
import { Select } from "@/components/ui/select";
import {
  catalogTypeOptions,
  uploadCatalogImport,
} from "@/lib/api/catalog/catalog-imports";
import { useAuth } from "@/providers/auth-provider";
import type { CatalogType } from "@/types/catalog-import";

/**
 * Загрузка справочника из xlsx/xls: тип, затем общие шаги файла, маппинга
 * колонок и загрузки (`FileImportFlow`).
 */
export function CatalogImportWorkspace() {
  const { csrfToken } = useAuth();
  const [catalogType, setCatalogType] = useState<CatalogType | "">("");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-medium">Импорт справочников</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Выберите справочник и файл, сопоставьте поля системы с колонками файла
          и загрузите. Колонки, не выбранные ни для одного поля, при загрузке
          пропускаются.
        </p>
      </header>

      <section className="bg-card space-y-2 rounded-xl border p-4">
        <h2 className="text-lg font-medium">1. Справочник</h2>
        <Select
          aria-label="Справочник"
          className="sm:max-w-sm"
          onChange={(event) =>
            setCatalogType(event.target.value as CatalogType | "")
          }
          value={catalogType}
        >
          <option value="">— выберите —</option>
          {catalogTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </section>

      {catalogType !== "" ? (
        <FileImportFlow
          catalogType={catalogType}
          firstStep={2}
          upload={(file) => uploadCatalogImport(catalogType, file, csrfToken)}
        />
      ) : null}
    </div>
  );
}
