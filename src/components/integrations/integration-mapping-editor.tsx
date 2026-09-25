"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { flattenJsonPaths } from "@/lib/integrations/json-paths";
import type {
  CreateIntegrationMappingDto,
  IntegrationEntityMetadata,
  IntegrationMapping,
  IntegrationMappingPreview,
  IntegrationMappingPreviewDto,
  IntegrationMappingRule,
  IntegrationSystem,
} from "@/types/integration";

type Props = {
  entities: IntegrationEntityMetadata[];
  isSaving: boolean;
  mapping: IntegrationMapping | null;
  onCancel: () => void;
  onPreview: (
    payload: IntegrationMappingPreviewDto,
  ) => Promise<IntegrationMappingPreview>;
  onSave: (payload: CreateIntegrationMappingDto) => Promise<void>;
  systems: IntegrationSystem[];
};

type FormState = CreateIntegrationMappingDto & { samplePayload: string };

const emptyRule: IntegrationMappingRule = {
  sourcePath: "",
  targetField: "",
  required: false,
  defaultValue: null,
};

const baseSchema = z.object({
  name: z.string().trim().min(1, "Укажите название."),
  system: z.string().min(1, "Выберите систему."),
  eventType: z.string().trim().min(1, "Укажите event_type."),
  direction: z.enum(["incoming", "outgoing"]),
  entity: z.string().min(1, "Выберите сущность CRM."),
  isActive: z.boolean(),
  rules: z.array(
    z.object({
      sourcePath: z.string(),
      targetField: z.string(),
      required: z.boolean(),
      defaultValue: z.unknown().nullable(),
    }),
  ),
  samplePayload: z.string(),
});

function initialForm(mapping: IntegrationMapping | null): FormState {
  return {
    name: mapping?.name ?? "",
    system: mapping?.system ?? "",
    eventType: mapping?.eventType ?? "",
    direction: mapping?.direction ?? "incoming",
    entity: mapping?.entity ?? "",
    isActive: mapping?.isActive ?? false,
    rules: mapping?.rules.map((rule) => ({ ...rule })) ?? [],
    samplePayload:
      '{\n  "student": {\n    "id": "123",\n    "email": "student@example.test"\n  }\n}',
  };
}

function parseDefault(value: string): unknown | null {
  if (!value.trim()) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function displayDefault(value: unknown | null) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function validateForm(form: FormState, entity?: IntegrationEntityMetadata) {
  const parsed = baseSchema.safeParse(form);
  const errors: string[] = parsed.success
    ? []
    : parsed.error.issues.map((issue) => issue.message);
  let payload: unknown;
  try {
    payload = JSON.parse(form.samplePayload);
  } catch {
    errors.push("Пример payload содержит невалидный JSON.");
  }
  const crmNames = form.rules
    .map((rule) =>
      form.direction === "incoming" ? rule.targetField : rule.sourcePath,
    )
    .filter(Boolean);
  const duplicate = crmNames.find(
    (name, index) => crmNames.indexOf(name) !== index,
  );
  if (duplicate) errors.push(`CRM-поле «${duplicate}» используется дважды.`);
  form.rules.forEach((rule, index) => {
    const externalPath =
      form.direction === "incoming" ? rule.sourcePath : rule.targetField;
    const crmName =
      form.direction === "incoming" ? rule.targetField : rule.sourcePath;
    if (externalPath && !externalPath.startsWith("$."))
      errors.push(`Правило ${index + 1}: путь должен начинаться с $.`);
    if (!crmName) errors.push(`Правило ${index + 1}: выберите поле CRM.`);
    if (rule.required && !externalPath && rule.defaultValue === null)
      errors.push(
        `Правило ${index + 1}: обязательному полю нужен путь или Default.`,
      );
    const crmField = entity?.fields.find((field) => field.name === crmName);
    if (form.direction === "incoming" && crmField?.read_only)
      errors.push(`Поле «${crmName}» доступно только для чтения.`);
  });
  if (form.isActive && form.rules.length === 0)
    errors.push("Активный mapping должен содержать хотя бы одно правило.");
  return { errors: [...new Set(errors)], payload };
}

export function IntegrationMappingEditor({
  entities,
  isSaving,
  mapping,
  onCancel,
  onPreview,
  onSave,
  systems,
}: Props) {
  const [form, setForm] = useState<FormState>(() => initialForm(mapping));
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<IntegrationMappingPreview | null>(
    null,
  );
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [serverError, setServerError] = useState("");
  const initial = useMemo(
    () => JSON.stringify(initialForm(mapping)),
    [mapping],
  );
  const isDirty = JSON.stringify(form) !== initial;
  const entity = entities.find((item) => item.code === form.entity);
  const availableCrmFields =
    entity?.fields.filter(
      (field) => form.direction === "outgoing" || !field.read_only,
    ) ?? [];
  let parsedSample: unknown;
  try {
    parsedSample = JSON.parse(form.samplePayload);
  } catch {
    parsedSample = null;
  }
  const externalFields = flattenJsonPaths(parsedSample);

  useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [isDirty]);

  function updateRule(index: number, patch: Partial<IntegrationMappingRule>) {
    setForm((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    }));
    setPreview(null);
  }

  function payloadForSave(): CreateIntegrationMappingDto {
    return {
      name: form.name,
      system: form.system,
      eventType: form.eventType,
      direction: form.direction,
      entity: form.entity,
      isActive: form.isActive,
      rules: form.rules,
    };
  }

  async function handlePreview() {
    const validation = validateForm(form, entity);
    setErrors(validation.errors);
    setServerError("");
    if (validation.errors.length || validation.payload === undefined) return;
    setIsPreviewing(true);
    try {
      setPreview(
        await onPreview({
          entity: form.entity,
          direction: form.direction,
          rules: form.rules,
          payload: validation.payload,
        }),
      );
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Preview не выполнен.",
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSave() {
    const validation = validateForm(form, entity);
    setErrors(validation.errors);
    setServerError("");
    if (validation.errors.length) return;
    try {
      await onSave(payloadForSave());
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить mapping.",
      );
    }
  }

  function cancel() {
    if (
      !isDirty ||
      window.confirm("Закрыть редактор и потерять несохранённые изменения?")
    )
      onCancel();
  }

  return (
    <section
      className="bg-card rounded-xl border shadow-sm"
      aria-label="Редактор mapping"
    >
      <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-medium">
            {mapping ? "Редактирование mapping" : "Новый mapping"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Настройте преобразование и проверьте его на примере до сохранения.
          </p>
        </div>
        <Button
          colorScheme="neutral"
          onClick={cancel}
          size="m"
          type="button"
          variant="ghost"
        >
          Закрыть
        </Button>
      </header>

      <div className="space-y-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5 text-sm">
            <span>Название</span>
            <Input
              aria-label="Название"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span>Система</span>
            <Select
              aria-label="Система"
              value={form.system}
              onChange={(event) =>
                setForm({ ...form, system: event.target.value })
              }
            >
              <option value="">Выберите систему</option>
              {systems.map((system) => (
                <option key={system.code} value={system.code}>
                  {system.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span>Направление</span>
            <Select
              aria-label="Направление"
              value={form.direction}
              onChange={(event) =>
                setForm({
                  ...form,
                  direction: event.target.value as FormState["direction"],
                  rules: [],
                })
              }
            >
              <option value="incoming">Входящее</option>
              <option value="outgoing">Исходящее</option>
            </Select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span>event_type</span>
            <Input
              aria-label="event_type"
              placeholder="student.enrolled"
              value={form.eventType}
              onChange={(event) =>
                setForm({ ...form, eventType: event.target.value })
              }
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span>Сущность CRM</span>
            <Select
              aria-label="Сущность CRM"
              value={form.entity}
              onChange={(event) =>
                setForm({ ...form, entity: event.target.value, rules: [] })
              }
            >
              <option value="">Выберите сущность</option>
              {entities.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              checked={form.isActive}
              onChange={(event) =>
                setForm({ ...form, isActive: event.target.checked })
              }
              type="checkbox"
            />
            Активен
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span>Пример payload</span>
          <textarea
            aria-label="Пример payload"
            className="border-border bg-background/60 focus-visible:ring-ring min-h-40 w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"
            spellCheck={false}
            value={form.samplePayload}
            onChange={(event) => {
              setForm({ ...form, samplePayload: event.target.value });
              setPreview(null);
            }}
          />
          <span className="text-muted-foreground block text-xs">
            Пример используется только для подсказок и preview, он не
            сохраняется.
          </span>
        </label>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">Правила</h3>
              <p className="text-muted-foreground text-xs">
                {form.direction === "incoming"
                  ? "Поле внешней системы → поле CRM"
                  : "Поле CRM → поле внешней системы"}
              </p>
            </div>
            <Button
              colorScheme="neutral"
              onClick={() =>
                setForm({ ...form, rules: [...form.rules, { ...emptyRule }] })
              }
              size="m"
              type="button"
              variant="outline"
            >
              <Plus className="size-4" />
              Добавить правило
            </Button>
          </div>
          {form.rules.length ? (
            <div className="space-y-3">
              {form.rules.map((rule, index) => (
                <div
                  className="bg-secondary/30 grid gap-3 rounded-lg border p-3 lg:grid-cols-[1fr_1fr_8rem_1fr_2.25rem]"
                  key={index}
                >
                  {form.direction === "incoming" ? (
                    <ExternalSelect
                      label="Поле внешней системы"
                      options={externalFields.map((item) => item.path)}
                      value={rule.sourcePath}
                      onChange={(value) =>
                        updateRule(index, { sourcePath: value })
                      }
                    />
                  ) : (
                    <CrmSelect
                      fields={availableCrmFields}
                      label="Поле CRM"
                      value={rule.sourcePath}
                      onChange={(value) =>
                        updateRule(index, { sourcePath: value })
                      }
                    />
                  )}
                  {form.direction === "incoming" ? (
                    <CrmSelect
                      fields={availableCrmFields}
                      label="Поле CRM"
                      value={rule.targetField}
                      onChange={(value) =>
                        updateRule(index, { targetField: value })
                      }
                    />
                  ) : (
                    <ExternalSelect
                      label="Поле внешней системы"
                      options={externalFields.map((item) => item.path)}
                      value={rule.targetField}
                      onChange={(value) =>
                        updateRule(index, { targetField: value })
                      }
                    />
                  )}
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input
                      aria-label={`Обязательное правило ${index + 1}`}
                      checked={rule.required}
                      onChange={(event) =>
                        updateRule(index, { required: event.target.checked })
                      }
                      type="checkbox"
                    />
                    Обязательное
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span>Default</span>
                    <Input
                      aria-label={`Default ${index + 1}`}
                      value={displayDefault(rule.defaultValue)}
                      onChange={(event) =>
                        updateRule(index, {
                          defaultValue: parseDefault(event.target.value),
                        })
                      }
                    />
                  </label>
                  <Button
                    aria-label={`Удалить правило ${index + 1}`}
                    className="self-end"
                    colorScheme="neutral"
                    onClick={() =>
                      setForm({
                        ...form,
                        rules: form.rules.filter(
                          (_, ruleIndex) => ruleIndex !== index,
                        ),
                      })
                    }
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
              Добавьте первое правило сопоставления.
            </div>
          )}
        </div>

        {errors.length || serverError ? (
          <div
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
            role="alert"
          >
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4" />
              Проверьте настройки
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
              {serverError ? <li>{serverError}</li> : null}
            </ul>
          </div>
        ) : null}

        {preview ? (
          <div
            className="grid gap-3 lg:grid-cols-2"
            data-testid="mapping-preview"
          >
            <div className="rounded-lg border p-3">
              <h3 className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Результат
              </h3>
              <pre className="bg-secondary/50 mt-2 overflow-auto rounded p-3 text-xs">
                {JSON.stringify(preview.result, null, 2)}
              </pre>
            </div>
            <div className="space-y-3">
              <PreviewMessages
                title="Ошибки"
                items={preview.errors}
                tone="error"
              />
              <PreviewMessages
                title="Предупреждения"
                items={preview.warnings}
                tone="warning"
              />
            </div>
          </div>
        ) : null}

        <footer className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button
            colorScheme="neutral"
            onClick={handlePreview}
            size="m"
            type="button"
            variant="outline"
            disabled={isPreviewing || isSaving}
          >
            {isPreviewing ? <Loader2 className="size-4 animate-spin" /> : null}
            Проверить
          </Button>
          <Button
            disabled={isSaving}
            onClick={handleSave}
            size="m"
            type="button"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Сохранить
          </Button>
        </footer>
      </div>
    </section>
  );
}

function CrmSelect({
  fields,
  label,
  onChange,
  value,
}: {
  fields: IntegrationEntityMetadata["fields"];
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span>{label}</span>
      <Select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Выберите поле</option>
        {fields.map((field) => (
          <option key={field.name} value={field.name}>
            {field.label} ({field.name})
          </option>
        ))}
      </Select>
    </label>
  );
}

function ExternalSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span>{label}</span>
      <Select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Выберите путь</option>
        {options.map((path) => (
          <option key={path} value={path}>
            {path}
          </option>
        ))}
      </Select>
    </label>
  );
}

function PreviewMessages({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: "error" | "warning";
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${tone === "error" ? "border-destructive/30" : "border-amber-500/30"}`}
    >
      <h3 className="font-medium">
        {title} · {items.length}
      </h3>
      {items.length ? (
        <ul className="mt-2 list-disc pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-1">Нет</p>
      )}
    </div>
  );
}
