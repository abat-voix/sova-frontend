"use client";

import { FileUp } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type {
  IntegrationMapping,
  IntegrationMappingProcessPayload,
  IntegrationMappingProcessResult,
} from "@/types/integration";

type IntegrationMappingProcessDialogProps = {
  entityLabel: string;
  mapping: IntegrationMapping;
  onClose: () => void;
  onProcess: (
    payload: IntegrationMappingProcessPayload,
  ) => Promise<IntegrationMappingProcessResult>;
};

function parsePayload(text: string): IntegrationMappingProcessPayload {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Некорректный JSON.");
  }
  if (!value || typeof value !== "object")
    throw new Error("Payload должен быть JSON-объектом или массивом.");
  return value as IntegrationMappingProcessPayload;
}

/**
 * Ручная загрузка JSON во входящий mapping: объект — одна запись, массив — по записи на элемент
 * (`null` пропускается, элементы обрабатываются независимо).
 */
export function IntegrationMappingProcessDialog({
  entityLabel,
  mapping,
  onClose,
  onProcess,
}: IntegrationMappingProcessDialogProps) {
  const headingId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntegrationMappingProcessResult | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  async function readFile(file: File) {
    setFileName(file.name);
    setText(await file.text());
    setError(null);
    setResult(null);
  }

  async function submit() {
    setError(null);
    setResult(null);
    let payload: IntegrationMappingProcessPayload;
    try {
      payload = parsePayload(text);
    } catch (parseError) {
      setError((parseError as Error).message);
      return;
    }
    setIsProcessing(true);
    try {
      setResult(await onProcess(payload));
    } catch (processError) {
      setError(
        processError instanceof Error
          ? processError.message
          : "Не удалось обработать JSON.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Modal closeLabel="Закрыть" labelledBy={headingId} onClose={onClose}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="border-b px-5 py-4 pr-14">
          <h2 className="text-lg font-medium" id={headingId}>
            Загрузить JSON
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {mapping.name} · {mapping.system.toUpperCase()} ·{" "}
            <code className="text-xs">{mapping.eventType}</code> → {entityLabel}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!mapping.isActive ? (
            <p className="text-muted-foreground text-sm">
              Mapping выключен: загрузка всё равно обработается по его текущим
              правилам.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              colorScheme="neutral"
              onClick={() => fileInputRef.current?.click()}
              size="m"
              type="button"
              variant="outline"
            >
              <FileUp className="size-4" />
              Выбрать файл
            </Button>
            <span className="text-muted-foreground text-sm">
              {fileName ?? ".json или вставьте payload ниже"}
            </span>
            <input
              accept=".json,application/json"
              aria-label="JSON-файл"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file);
                event.target.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
          </div>
          <label className="block space-y-1.5 text-sm">
            <span>Payload</span>
            <textarea
              aria-label="Payload"
              className="border-border bg-background/60 focus-visible:ring-ring min-h-60 w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"
              onChange={(event) => {
                setText(event.target.value);
                setFileName(null);
                setResult(null);
              }}
              placeholder='{"student": {"name": "Иван Петров"}}'
              spellCheck={false}
              value={text}
            />
          </label>

          {result ? (
            <div
              className="space-y-2 rounded-xl border p-4 text-sm"
              role="status"
            >
              {result.status === "processed" ? (
                <p className="font-medium">
                  Обработано записей «{entityLabel}»: {result.created.length}
                </p>
              ) : (
                <p className="font-medium text-[var(--atmr-brand-orange)]">
                  Обработка завершилась с ошибками
                  {result.created.length
                    ? ` (успешно: ${result.created.length})`
                    : ""}
                </p>
              )}
              {result.created.length ? (
                <ul className="list-disc space-y-1 pl-5">
                  {result.created.map((item) => (
                    <li key={item.id}>
                      <code className="text-xs">{item.id}</code>
                    </li>
                  ))}
                </ul>
              ) : null}
              {result.errors.length ? (
                <ul className="list-disc space-y-1 pl-5 text-[var(--atmr-brand-orange)]">
                  {result.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {result.warnings.length ? (
                <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                  {result.warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <p className="text-muted-foreground text-xs">
                Сообщение в журнале: {result.id}
              </p>
            </div>
          ) : null}
        </div>
        <div className="space-y-3 border-t px-5 py-4">
          {error ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              colorScheme="neutral"
              onClick={onClose}
              size="m"
              type="button"
              variant="outline"
            >
              Закрыть
            </Button>
            <Button
              disabled={isProcessing || !text.trim()}
              size="m"
              type="submit"
            >
              {isProcessing ? "Обрабатываем…" : "Обработать"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
