"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { columnKey } from "@/lib/catalog-import/column-key";
import type { CatalogImportMappingField } from "@/types/catalog-import";

type Props = {
  fields: CatalogImportMappingField[];
  /** Заголовки выбранного файла; пусто — файл не выбран, сверка не нужна. */
  headers: string[];
  onEdit: () => void;
};

/**
 * Свёрнутый сохранённый маппинг: какие колонки файла идут в какие поля.
 *
 * Если файл уже выбран, колонки, которых в нём нет, помечаются — по ним
 * обязательное поле не загрузится, а необязательное будет пропущено.
 */
export function CatalogImportMappingSummary({
  fields,
  headers,
  onEdit,
}: Props) {
  const headerKeys = new Set(headers.map(columnKey));
  const mapped = fields.filter((field) => field.source_column);
  const unmapped = fields.filter((field) => !field.source_column);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Маппинг сохранён: задано полей {mapped.length} из {fields.length}.
        </p>
        <Button onClick={onEdit} size="m" type="button" variant="outline">
          <Pencil aria-hidden="true" className="size-4" />
          Изменить маппинг
        </Button>
      </div>

      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[16rem_1fr]">
        {mapped.map((field) => {
          const column = field.source_column as string;
          const isMissingInFile =
            headers.length > 0 && !headerKeys.has(columnKey(column));

          return (
            <div className="contents" key={field.target_field}>
              <dt className="text-muted-foreground">
                {field.label}
                {field.required ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span>{column}</span>
                {isMissingInFile ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    нет в файле
                  </span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>

      {unmapped.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          Не заданы (колонки пропускаются):{" "}
          {unmapped.map((field) => field.label).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
