"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { CatalogImportMappingEditor } from "@/components/catalog-import/catalog-import-mapping-editor";
import { CatalogImportMappingSummary } from "@/components/catalog-import/catalog-import-mapping-summary";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  catalogImportMappingQueryKey,
  catalogTypeOptions,
  getCatalogImportMapping,
  readCatalogImportHeaders,
  readImportFailure,
  saveCatalogImportMapping,
  uploadCatalogImport,
} from "@/lib/api/catalog/catalog-imports";
import { ApiError } from "@/lib/api/http";
import { useAuth } from "@/providers/auth-provider";
import type {
  CatalogImportFailure,
  CatalogImportResult,
  CatalogType,
} from "@/types/catalog-import";

function readableError(error: unknown) {
  const failure = readImportFailure(error);
  if (failure) return failure.detail;
  if (error instanceof ApiError)
    return error.detail ?? "Операция отклонена сервером.";
  return error instanceof Error
    ? error.message
    : "Не удалось выполнить операцию.";
}

/**
 * Ошибка чтения или отправки файла. `TypeError` бросает fetch, когда браузер не
 * может отправить файл — например, его изменили на диске после выбора.
 */
function readableFileError(error: unknown) {
  if (error instanceof TypeError)
    return "Файл изменился или недоступен — выберите его заново.";
  return readableError(error);
}

/**
 * Загрузка справочника из xlsx/xls: тип, файл, маппинг колонок и результат.
 *
 * Заголовки файла читает бэк — тем же кодом, что и импорт, — и они становятся
 * подсказками в маппинге. Пока маппинг не сохранён, загрузка заблокирована:
 * импорт идёт по сохранённому маппингу, а не по форме на экране.
 */
export function CatalogImportWorkspace() {
  const { csrfToken } = useAuth();
  const queryClient = useQueryClient();
  const [catalogType, setCatalogType] = useState<CatalogType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isMappingDirty, setIsMappingDirty] = useState(false);
  const [isEditingMapping, setIsEditingMapping] = useState(false);
  const [result, setResult] = useState<CatalogImportResult | null>(null);
  const [failure, setFailure] = useState<CatalogImportFailure | null>(null);

  const mapping = useQuery({
    queryKey: catalogImportMappingQueryKey(catalogType as CatalogType),
    queryFn: () => getCatalogImportMapping(catalogType as CatalogType),
    enabled: catalogType !== "",
  });

  const readHeaders = useMutation({
    mutationFn: (selected: File) =>
      readCatalogImportHeaders(selected, csrfToken),
    onSuccess: (loaded) => {
      setHeaders(loaded);
      setFileError(null);
    },
    onError: (error) => {
      setHeaders([]);
      setFileError(readableFileError(error));
    },
  });

  const saveMapping = useMutation({
    mutationFn: (mappings: Record<string, string>) =>
      saveCatalogImportMapping(catalogType as CatalogType, mappings, csrfToken),
    onSuccess: (saved) => {
      queryClient.setQueryData(
        catalogImportMappingQueryKey(catalogType as CatalogType),
        saved,
      );
      closeEditor();
      toast.success("Маппинг сохранён.");
    },
  });

  const upload = useMutation({
    mutationFn: () =>
      uploadCatalogImport(catalogType as CatalogType, file as File, csrfToken),
    onMutate: () => {
      setResult(null);
      setFailure(null);
    },
    onSuccess: setResult,
    onError: (error) =>
      setFailure(
        readImportFailure(error) ?? {
          code: "import_error",
          detail: readableFileError(error),
          errors: [],
          errorsTotal: 0,
        },
      ),
  });

  const onDirtyChange = useCallback(
    (dirty: boolean) => setIsMappingDirty(dirty),
    [],
  );
  const saveErrors =
    saveMapping.error instanceof ApiError ? saveMapping.error.fieldErrors : {};
  // Маппинг с заполненными обязательными полями показывается свёрнутым и
  // раскрывается только для правки; незаполненный — сразу открыт.
  const isMappingComplete =
    mapping.data?.every((field) => !field.required || field.source_column) ??
    false;
  const isEditorOpen = isEditingMapping || !isMappingComplete;
  const hasHeaders =
    file !== null && !readHeaders.isPending && !fileError && headers.length > 0;
  // Шаги открываются по очереди: файл — после выбора справочника, маппинг —
  // когда прочитаны заголовки файла (они нужны для подсказок и сверки колонок),
  // загрузка — когда маппинг сохранён и свёрнут.
  const showFileStep = catalogType !== "";
  const showMappingStep = showFileStep && hasHeaders;
  const showUploadStep = showMappingStep && isMappingComplete && !isEditorOpen;
  const canUpload =
    catalogType !== "" &&
    isMappingComplete &&
    file !== null &&
    !fileError &&
    !readHeaders.isPending &&
    !isMappingDirty &&
    !upload.isPending;

  /** Свернуть редактор: несохранённые правки отбрасываются вместе с ним. */
  function closeEditor() {
    setIsEditingMapping(false);
    setIsMappingDirty(false);
  }

  function resetOutcome() {
    setResult(null);
    setFailure(null);
  }

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
          onChange={(event) => {
            setCatalogType(event.target.value as CatalogType | "");
            setIsEditingMapping(false);
            setIsMappingDirty(false);
            saveMapping.reset();
            resetOutcome();
          }}
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

      {showFileStep ? (
        <section className="bg-card space-y-3 rounded-xl border p-4">
          <h2 className="text-lg font-medium">2. Файл</h2>
          {/*
          Выбор файла ничего не импортирует: файл уходит на бэк только чтобы
          прочитать заголовки первой строки (POST /api/catalog/imports/headers/).
          Бэк читает их тем же кодом, что и импорт, поэтому подсказки в маппинге
          совпадают с тем, что увидит загрузка. Данные — на шаге 4.
        */}
          <label className="border-border hover:bg-muted/40 focus-within:ring-ring flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors focus-within:ring-2">
            <FileSpreadsheet
              aria-hidden="true"
              className="text-muted-foreground size-8"
            />
            <span className="font-medium">
              {file ? file.name : "Выберите файл .xlsx или .xls"}
            </span>
            <span className="text-muted-foreground text-sm">
              {file
                ? "Нажмите, чтобы выбрать другой файл"
                : "Нажмите, чтобы открыть выбор файла"}
            </span>
            <input
              accept=".xlsx,.xls"
              aria-label="Файл xlsx/xls"
              className="sr-only"
              // Иначе повторный выбор того же файла (исправленного в Excel) не вызовет onChange
              onClick={(event) => {
                event.currentTarget.value = "";
              }}
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                resetOutcome();
                if (selected) readHeaders.mutate(selected);
                else {
                  setHeaders([]);
                  setFileError(null);
                }
              }}
              type="file"
            />
          </label>
          {readHeaders.isPending ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Читаем заголовки…
            </p>
          ) : null}
          {!readHeaders.isPending && file && !fileError ? (
            <p className="text-sm">Найдено колонок: {headers.length}</p>
          ) : null}
          {fileError ? (
            <p className="text-destructive text-sm">{fileError}</p>
          ) : null}
          <p className="text-muted-foreground text-sm">
            На этом шаге система читает только заголовки первой строки первого
            листа — данные не загружаются. Заголовки появятся подсказками в
            маппинге, а колонки, которых нет в файле, будут помечены. Сама
            загрузка — на шаге 4.
          </p>
        </section>
      ) : null}

      {showMappingStep ? (
        <section className="bg-card space-y-4 rounded-xl border p-4">
          <h2 className="text-lg font-medium">3. Маппинг колонок</h2>
          {mapping.isLoading ? (
            <Loader2
              aria-hidden="true"
              className="text-muted-foreground size-5 animate-spin"
            />
          ) : null}
          {mapping.isError ? (
            <p className="text-destructive text-sm">
              {readableError(mapping.error)}
            </p>
          ) : null}
          {mapping.data && isEditorOpen ? (
            <CatalogImportMappingEditor
              fields={mapping.data}
              headers={headers}
              isSaving={saveMapping.isPending}
              // Сохранённый маппинг или другой тип — форма заново от ответа бэка
              key={`${catalogType}-${mapping.dataUpdatedAt}`}
              onCancel={isMappingComplete ? closeEditor : undefined}
              onDirtyChange={onDirtyChange}
              onSave={(mappings) => saveMapping.mutate(mappings)}
              serverErrors={saveErrors}
            />
          ) : null}
          {mapping.data && !isEditorOpen ? (
            <CatalogImportMappingSummary
              fields={mapping.data}
              headers={headers}
              onEdit={() => setIsEditingMapping(true)}
            />
          ) : null}
        </section>
      ) : null}

      {showUploadStep ? (
        <section className="bg-card space-y-3 rounded-xl border p-4">
          <h2 className="text-lg font-medium">4. Загрузка</h2>
          <Button
            disabled={!canUpload}
            onClick={() => upload.mutate()}
            type="button"
          >
            {upload.isPending ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Upload aria-hidden="true" className="size-4" />
            )}
            Загрузить
          </Button>

          {result ? (
            <div className="bg-card space-y-2 rounded-xl border p-4">
              <p className="font-medium">
                Создано: {result.created}, обновлено: {result.updated}
              </p>
              {result.warnings.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {result.warnings.map((warning) => (
                    <li key={`${warning.row}-${warning.message}`}>
                      Строка {warning.row}: <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {failure ? (
            <div
              className="border-destructive/30 bg-destructive/5 space-y-2 rounded-xl border p-4"
              role="alert"
            >
              <p className="text-destructive font-medium">{failure.detail}</p>
              {failure.errors.length > 0 ? (
                <>
                  {failure.errorsTotal > failure.errors.length ? (
                    <p className="text-sm">
                      Показаны {failure.errors.length} из {failure.errorsTotal}{" "}
                      ошибок.
                    </p>
                  ) : null}
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="w-24 py-1 text-left font-medium">
                          Строка
                        </th>
                        <th className="py-1 text-left font-medium">Ошибка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failure.errors.map((error) => (
                        <tr
                          className="border-t"
                          key={`${error.row}-${error.message}`}
                        >
                          <td className="py-1">{error.row}</td>
                          <td className="py-1">{error.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
