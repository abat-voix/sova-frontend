"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { columnKey } from "@/lib/catalog-import/column-key";
import type { CatalogImportMappingField } from "@/types/catalog-import";

type Props = {
  fields: CatalogImportMappingField[];
  /** Заголовки выбранного файла — подсказки для колонок; пусто, если файл не выбран. */
  headers: string[];
  isSaving: boolean;
  /** Ошибки сохранения от бэка: ключи вида `mappings.<target_field>`. */
  serverErrors: Record<string, string[]>;
  onDirtyChange: (dirty: boolean) => void;
  onSave: (mappings: Record<string, string>) => void;
  /** Свернуть без сохранения; нет — отменять нечего (маппинг ещё не настроен). */
  onCancel?: () => void;
};

function initialValues(fields: CatalogImportMappingField[]) {
  return Object.fromEntries(
    fields.map((field) => [field.target_field, field.source_column ?? ""]),
  );
}

/** Обязательные поля заполнены, одна колонка — одно поле (сравнение как на бэке). */
function validate(
  fields: CatalogImportMappingField[],
  values: Record<string, string>,
) {
  const errors: Record<string, string> = {};
  const byColumn = new Map<string, string[]>();
  for (const field of fields) {
    const value = values[field.target_field].trim();
    if (!value) {
      if (field.required) errors[field.target_field] = "Укажите колонку файла.";
      continue;
    }
    const key = columnKey(value);
    byColumn.set(key, [...(byColumn.get(key) ?? []), field.target_field]);
  }
  for (const targets of byColumn.values())
    if (targets.length > 1)
      for (const target of targets)
        errors[target] = "Колонка уже выбрана для другого поля.";
  return errors;
}

/**
 * Маппинг типа справочника: для каждого поля системы — колонка файла.
 *
 * Колонку можно выбрать из заголовков файла или вписать вручную; заголовок,
 * уже выбранный для другого поля, в подсказках не предлагается. Пустое поле —
 * «не задано», такие колонки файла при импорте пропускаются. Форма
 * инициализируется из `fields` один раз: после сохранения или смены типа
 * родитель пересоздаёт редактор через `key`.
 */
export function CatalogImportMappingEditor({
  fields,
  headers,
  isSaving,
  serverErrors,
  onDirtyChange,
  onSave,
  onCancel,
}: Props) {
  const listId = useId();
  const [initial] = useState(() => initialValues(fields));
  const [values, setValues] = useState(initial);
  const [showErrors, setShowErrors] = useState(false);

  const isDirty = fields.some(
    (field) => values[field.target_field] !== initial[field.target_field],
  );
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const errors = validate(fields, values);
  const headerKeys = new Set(headers.map(columnKey));

  /** Заголовки файла, не занятые другими полями: у каждого поля свой список подсказок. */
  function freeHeaders(targetField: string) {
    const taken = new Set(
      fields
        .filter((field) => field.target_field !== targetField)
        .map((field) => columnKey(values[field.target_field]))
        .filter(Boolean),
    );
    return headers.filter((header) => !taken.has(columnKey(header)));
  }

  function submit() {
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    onSave(
      Object.fromEntries(
        fields.map((field) => [
          field.target_field,
          values[field.target_field].trim(),
        ]),
      ),
    );
  }

  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const inputId = `${listId}-${field.target_field}`;
        const optionsId = `${inputId}-options`;
        const value = values[field.target_field];
        const error =
          (showErrors ? errors[field.target_field] : undefined) ??
          serverErrors[`mappings.${field.target_field}`]?.join(" ");
        const isMissingInFile =
          headers.length > 0 &&
          value.trim() !== "" &&
          !headerKeys.has(columnKey(value));

        return (
          <div
            className="grid gap-1 sm:grid-cols-[16rem_1fr] sm:items-start"
            key={field.target_field}
          >
            <label className="pt-2 text-sm font-medium" htmlFor={inputId}>
              {field.label}
              {field.required ? (
                <span className="text-destructive"> *</span>
              ) : null}
            </label>
            <div className="space-y-1">
              <datalist id={optionsId}>
                {freeHeaders(field.target_field).map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </datalist>
              <Input
                id={inputId}
                list={optionsId}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.target_field]: event.target.value,
                  }))
                }
                placeholder="— не задано —"
                value={value}
              />
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
              {!error && isMissingInFile ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Колонки нет в файле.
                </p>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button disabled={isSaving} onClick={submit} type="button">
          {isSaving ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          Сохранить маппинг
        </Button>
        {onCancel ? (
          <Button
            disabled={isSaving}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Отмена
          </Button>
        ) : null}
      </div>
    </div>
  );
}
