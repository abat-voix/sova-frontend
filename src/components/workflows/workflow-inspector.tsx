"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { WorkflowSingleSelect } from "@/components/workflows/workflow-single-select";
import { apiEndpoints } from "@/lib/api/endpoints";
import type {
  ActionFeatureDefinition,
  ActionOutcomeDefinition,
  StageTransitionDefinition,
  WorkflowActionDefinition,
  WorkflowDefinition,
  WorkflowStageDefinition,
  WorkflowTemplate,
} from "@/types/workflow-definition";

export type WorkflowEditorCommand = {
  body?: Record<string, unknown>;
  method: "delete" | "patch" | "post";
  url: string;
};

export type WorkflowSelection =
  | { kind: "workflow" }
  | { id: string; kind: "stage" | "action" | "stage-transition" };

type InspectorProps = {
  canEdit: boolean;
  definition: WorkflowDefinition;
  isPending: boolean;
  onCommand: (command: WorkflowEditorCommand) => Promise<unknown>;
  onSelectionChange: (selection: WorkflowSelection) => void;
  selection: WorkflowSelection;
};

const fieldClass =
  "bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";
const labelClass = "space-y-1.5 text-sm font-medium";

const featureOptions = [
  ["contact_person.create", "Создать контакт"],
  ["contact_person.select", "Выбрать контакт"],
  ["contact_person.link", "Привязать контакт"],
  ["contact_person.update", "Изменить контакт"],
  ["contact_person.deactivate", "Деактивировать контакт"],
  ["responsible.assign", "Назначить ответственного"],
  ["responsible.unassign", "Снять ответственного"],
  ["interaction_direction.add", "Добавить направление"],
  ["interaction_direction.remove", "Убрать направление"],
  ["interaction_program.add", "Добавить программу"],
  ["interaction_program.remove", "Убрать программу"],
  ["interaction_product.add", "Добавить продукт"],
  ["interaction_product.remove", "Убрать продукт"],
  ["contract.create", "Создать договор"],
  ["contract.update", "Изменить договор"],
  ["contract.sign", "Подписать договор"],
  ["contract.file.upload", "Загрузить файл договора"],
  ["contract.mark_sent", "Отметить отправку договора"],
  ["contract.mark_corrected", "Отметить доработку договора"],
  ["license.create", "Создать лицензию"],
  ["license.update", "Изменить лицензию"],
  ["communication.create", "Создать коммуникацию"],
  ["meeting.create", "Создать встречу"],
  ["installation.create", "Создать установку"],
  ["training.create", "Создать обучение"],
  ["program_update.create", "Создать обновление программы"],
  ["result_check.create", "Создать проверку результата"],
  ["checklist.fill", "Заполнить чек-лист"],
  ["email.send", "Отправить письмо"],
  ["link.attach", "Добавить ссылку"],
  ["reminder.create", "Создать напоминание"],
] as const;

const audienceOptions = [
  { id: "b2b", name: "B2B — вузы" },
  { id: "b2c", name: "B2C — физ/юрлица" },
] as const;

const stageTypeOptions = [
  { id: "interaction", name: "Взаимодействие" },
  { id: "direction", name: "Направление" },
  { id: "program", name: "Программа" },
  { id: "product", name: "Продукт" },
] as const;

const featureSelectOptions = featureOptions.map(([id, name]) => ({ id, name }));

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Checkbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        checked={checked}
        className="size-4"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function SubmitButton({
  isPending,
  label = "Сохранить",
}: {
  isPending: boolean;
  label?: string;
}) {
  return (
    <Button
      colorScheme="accent"
      disabled={isPending}
      size="m"
      type="submit"
      variant="primary"
    >
      {isPending ? (
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <Save aria-hidden="true" className="size-4" />
      )}
      {isPending ? "Сохраняем…" : label}
    </Button>
  );
}

function DeleteButton({
  disabled,
  label,
  onDelete,
}: {
  disabled: boolean;
  label: string;
  onDelete: () => void;
}) {
  return (
    <Button
      colorScheme="neutral"
      disabled={disabled}
      onClick={onDelete}
      size="m"
      type="button"
      variant="outline"
    >
      <Trash2 aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}

function WorkflowForm({
  canEdit,
  isPending,
  onCommand,
  workflow,
}: {
  canEdit: boolean;
  isPending: boolean;
  onCommand: InspectorProps["onCommand"];
  workflow: WorkflowTemplate;
}) {
  const [form, setForm] = useState({
    audience: workflow.audience,
    code: workflow.code,
    description: workflow.description,
    is_base: workflow.is_base,
    name: workflow.name,
    stale_threshold_days: workflow.stale_threshold_days?.toString() ?? "",
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onCommand({
      body: {
        ...form,
        stale_threshold_days:
          form.stale_threshold_days === ""
            ? null
            : Number(form.stale_threshold_days),
      },
      method: "patch",
      url: apiEndpoints.workflows.workflows.detail(workflow.id),
    });
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Section title="Workflow">
        <label className={labelClass}>
          Название
          <input
            className={fieldClass}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            value={form.name}
          />
        </label>
        <label className={labelClass}>
          Код
          <input
            className={fieldClass}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            value={form.code}
          />
        </label>
        <div className={labelClass}>
          Аудитория
          <WorkflowSingleSelect
            disabled={!canEdit}
            id={`workflow-${workflow.id}-audience`}
            label="Аудитория"
            onChange={(audience) =>
              setForm({ ...form, audience: audience as "b2b" | "b2c" })
            }
            options={audienceOptions}
            placeholder="Выберите аудиторию"
            value={form.audience}
          />
        </div>
        <label className={labelClass}>
          Описание
          <textarea
            className={`${fieldClass} min-h-24 resize-y`}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            value={form.description}
          />
        </label>
        <label className={labelClass}>
          Порог устаревания, дней
          <input
            className={fieldClass}
            disabled={!canEdit}
            min="0"
            onChange={(e) =>
              setForm({ ...form, stale_threshold_days: e.target.value })
            }
            type="number"
            value={form.stale_threshold_days}
          />
        </label>
        <Checkbox
          checked={form.is_base}
          disabled={!canEdit}
          label="Базовый workflow"
          onChange={(is_base) => setForm({ ...form, is_base })}
        />
        {canEdit ? <SubmitButton isPending={isPending} /> : null}
      </Section>
    </form>
  );
}

function StageForm({
  canEdit,
  isPending,
  onCommand,
  onDeleted,
  stage,
}: {
  canEdit: boolean;
  isPending: boolean;
  onCommand: InspectorProps["onCommand"];
  onDeleted: () => void;
  stage: WorkflowStageDefinition;
}) {
  const [form, setForm] = useState({
    description: stage.description,
    is_active: stage.is_active,
    is_final: stage.is_final,
    is_initial: stage.is_initial,
    is_optional: stage.is_optional,
    name: stage.name,
    sort_order: String(stage.sort_order),
    type: stage.type,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onCommand({
      body: { ...form, sort_order: Number(form.sort_order) },
      method: "patch",
      url: apiEndpoints.workflows.stages.detail(stage.id),
    });
  };
  const remove = async () => {
    if (
      !window.confirm(`Удалить этап «${stage.name}» вместе с его действиями?`)
    )
      return;
    await onCommand({
      method: "delete",
      url: apiEndpoints.workflows.stages.detail(stage.id),
    });
    onDeleted();
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Section title="Этап">
        <label className={labelClass}>
          Название
          <input
            className={fieldClass}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            value={form.name}
          />
        </label>
        <div className={labelClass}>
          Тип
          <WorkflowSingleSelect
            disabled={!canEdit}
            id={`workflow-stage-${stage.id}-type`}
            label="Тип этапа"
            onChange={(type) =>
              setForm({ ...form, type: type as typeof form.type })
            }
            options={stageTypeOptions}
            placeholder="Выберите тип"
            value={form.type}
          />
        </div>
        <label className={labelClass}>
          Описание
          <textarea
            className={`${fieldClass} min-h-20 resize-y`}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            value={form.description}
          />
        </label>
        <label className={labelClass}>
          Порядок
          <input
            className={fieldClass}
            disabled={!canEdit}
            min="0"
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            required
            type="number"
            value={form.sort_order}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <Checkbox
            checked={form.is_initial}
            disabled={!canEdit}
            label="Начальный"
            onChange={(is_initial) => setForm({ ...form, is_initial })}
          />
          <Checkbox
            checked={form.is_final}
            disabled={!canEdit}
            label="Финальный"
            onChange={(is_final) => setForm({ ...form, is_final })}
          />
          <Checkbox
            checked={form.is_optional}
            disabled={!canEdit}
            label="Необязательный"
            onChange={(is_optional) => setForm({ ...form, is_optional })}
          />
          <Checkbox
            checked={form.is_active}
            disabled={!canEdit}
            label="Активен"
            onChange={(is_active) => setForm({ ...form, is_active })}
          />
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <SubmitButton isPending={isPending} />
            <DeleteButton
              disabled={isPending}
              label="Удалить этап"
              onDelete={() => void remove()}
            />
          </div>
        ) : null}
      </Section>
    </form>
  );
}

function OutcomeRow({
  canEdit,
  isPending,
  onCommand,
  outcome,
}: {
  canEdit: boolean;
  isPending: boolean;
  onCommand: InspectorProps["onCommand"];
  outcome: ActionOutcomeDefinition;
}) {
  const [form, setForm] = useState({
    code: outcome.code,
    is_active: outcome.is_active,
    is_attachment_required: outcome.is_attachment_required,
    is_comment_required: outcome.is_comment_required,
    name: outcome.name,
  });
  const save = () =>
    onCommand({
      body: form,
      method: "patch",
      url: apiEndpoints.workflows.actionOutcomes.detail(outcome.id),
    });
  const remove = () => {
    if (window.confirm(`Удалить исход «${outcome.name}»?`))
      return onCommand({
        method: "delete",
        url: apiEndpoints.workflows.actionOutcomes.detail(outcome.id),
      });
    return Promise.resolve();
  };
  return (
    <div className="bg-secondary/60 space-y-2 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          aria-label="Код исхода"
          className={fieldClass}
          disabled={!canEdit}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          value={form.code}
        />
        <input
          aria-label="Название исхода"
          className={fieldClass}
          disabled={!canEdit}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          value={form.name}
        />
      </div>
      <div className="space-y-1.5">
        <Checkbox
          checked={form.is_active}
          disabled={!canEdit}
          label="Активен"
          onChange={(is_active) => setForm({ ...form, is_active })}
        />
        <Checkbox
          checked={form.is_comment_required}
          disabled={!canEdit}
          label="Требовать комментарий"
          onChange={(is_comment_required) =>
            setForm({ ...form, is_comment_required })
          }
        />
        <Checkbox
          checked={form.is_attachment_required}
          disabled={!canEdit}
          label="Требовать вложение"
          onChange={(is_attachment_required) =>
            setForm({ ...form, is_attachment_required })
          }
        />
      </div>
      {canEdit ? (
        <div className="flex gap-2">
          <Button
            aria-label="Сохранить исход"
            colorScheme="neutral"
            disabled={isPending}
            onClick={() => void save()}
            size="s"
            type="button"
            variant="outline"
          >
            <Save className="size-3.5" />
          </Button>
          <Button
            aria-label="Удалить исход"
            colorScheme="neutral"
            disabled={isPending}
            onClick={() => void remove()}
            size="s"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FeatureRow({
  canEdit,
  feature,
  isPending,
  onCommand,
}: {
  canEdit: boolean;
  feature: ActionFeatureDefinition;
  isPending: boolean;
  onCommand: InspectorProps["onCommand"];
}) {
  const [form, setForm] = useState({
    code: feature.code,
    is_active: feature.is_active,
    settings: JSON.stringify(feature.settings, null, 2),
    sort_order: String(feature.sort_order),
  });
  const [jsonError, setJsonError] = useState("");
  const save = () => {
    try {
      const settings = JSON.parse(form.settings) as unknown;
      if (!settings || Array.isArray(settings) || typeof settings !== "object")
        throw new Error();
      setJsonError("");
      return onCommand({
        body: {
          code: form.code,
          is_active: form.is_active,
          settings,
          sort_order: Number(form.sort_order),
        },
        method: "patch",
        url: apiEndpoints.workflows.actionFeatures.detail(feature.id),
      });
    } catch {
      setJsonError("Настройки должны быть корректным JSON-объектом.");
      return Promise.resolve();
    }
  };
  return (
    <div className="bg-secondary/60 space-y-2 rounded-lg border p-3">
      <WorkflowSingleSelect
        disabled={!canEdit}
        id={`workflow-feature-${feature.id}-code`}
        label="Тип возможности"
        onChange={(code) => setForm({ ...form, code })}
        options={featureSelectOptions}
        placeholder="Выберите возможность"
        value={form.code}
      />
      <label className="text-xs">
        Порядок
        <input
          className={fieldClass}
          disabled={!canEdit}
          min="1"
          onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          type="number"
          value={form.sort_order}
        />
      </label>
      <label className="text-xs">
        Настройки JSON
        <textarea
          className={`${fieldClass} min-h-24 font-mono text-xs`}
          disabled={!canEdit}
          onChange={(e) => setForm({ ...form, settings: e.target.value })}
          value={form.settings}
        />
      </label>
      {jsonError ? (
        <p className="text-xs text-red-600 dark:text-red-300">{jsonError}</p>
      ) : null}
      <Checkbox
        checked={form.is_active}
        disabled={!canEdit}
        label="Активна"
        onChange={(is_active) => setForm({ ...form, is_active })}
      />
      {canEdit ? (
        <div className="flex gap-2">
          <Button
            aria-label="Сохранить возможность"
            colorScheme="neutral"
            disabled={isPending}
            onClick={() => void save()}
            size="s"
            type="button"
            variant="outline"
          >
            <Save className="size-3.5" />
          </Button>
          <Button
            aria-label="Удалить возможность"
            colorScheme="neutral"
            disabled={isPending}
            onClick={() =>
              window.confirm("Удалить возможность?") &&
              void onCommand({
                method: "delete",
                url: apiEndpoints.workflows.actionFeatures.detail(feature.id),
              })
            }
            size="s"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ActionForm({
  action,
  canEdit,
  definition,
  isPending,
  onCommand,
  onDeleted,
}: {
  action: WorkflowActionDefinition;
  canEdit: boolean;
  definition: WorkflowDefinition;
  isPending: boolean;
  onCommand: InspectorProps["onCommand"];
  onDeleted: () => void;
}) {
  const [form, setForm] = useState({
    default_duration_days: action.default_duration_days?.toString() ?? "",
    description: action.description,
    is_active: action.is_active,
    is_optional: action.is_optional,
    is_trigger_only: action.is_trigger_only,
    name: action.name,
    sort_order: String(action.sort_order),
    stage: action.stage.id,
  });
  const [newOutcome, setNewOutcome] = useState({ code: "", name: "" });
  const [newFeature, setNewFeature] = useState(featureOptions[0][0] as string);
  const [dependencyId, setDependencyId] = useState("");
  const outcomes = definition.outcomes.filter(
    (item) => item.action.id === action.id,
  );
  const features = definition.features.filter(
    (item) => item.action.id === action.id,
  );
  const siblingActions = definition.actions.filter(
    (item) => item.stage.id === action.stage.id && item.id !== action.id,
  );
  const transitionActions = definition.actions.filter(
    (item) => item.stage.id === action.stage.id,
  );
  const availableFeatures = featureOptions.filter(
    ([code]) => !features.some((feature) => feature.code === code),
  );
  const featureToAdd = availableFeatures.some(([code]) => code === newFeature)
    ? newFeature
    : availableFeatures[0]?.[0];
  const dependencies = definition.action_dependencies.filter(
    (item) => item.action.id === action.id,
  );
  const dependencyOptions = siblingActions
    .filter(
      (candidate) =>
        !dependencies.some(
          (item) => item.depends_on_action.id === candidate.id,
        ),
    )
    .map((candidate) => ({ id: candidate.id, name: candidate.name }));
  const availableFeatureOptions = availableFeatures.map(([id, name]) => ({
    id,
    name,
  }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onCommand({
      body: {
        ...form,
        default_duration_days:
          form.default_duration_days === ""
            ? null
            : Number(form.default_duration_days),
        sort_order: Number(form.sort_order),
      },
      method: "patch",
      url: apiEndpoints.workflows.actions.detail(action.id),
    });
  };
  const remove = async () => {
    if (!window.confirm(`Удалить действие «${action.name}»?`)) return;
    await onCommand({
      method: "delete",
      url: apiEndpoints.workflows.actions.detail(action.id),
    });
    onDeleted();
  };
  const addOutcome = () => {
    if (!newOutcome.code.trim() || !newOutcome.name.trim()) return;
    void onCommand({
      body: {
        action: action.id,
        code: newOutcome.code.trim(),
        name: newOutcome.name.trim(),
      },
      method: "post",
      url: apiEndpoints.workflows.actionOutcomes.create,
    }).then(() => setNewOutcome({ code: "", name: "" }));
  };
  const addFeature = () =>
    featureToAdd
      ? void onCommand({
          body: {
            action: action.id,
            code: featureToAdd,
            settings: {},
            sort_order:
              Math.max(0, ...features.map((item) => item.sort_order)) + 1,
          },
          method: "post",
          url: apiEndpoints.workflows.actionFeatures.create,
        })
      : undefined;
  const addDependency = () => {
    if (!dependencyId) return;
    void onCommand({
      body: {
        action: action.id,
        depends_on_action: dependencyId,
        is_active: true,
      },
      method: "post",
      url: apiEndpoints.workflows.actionDependencies.create,
    }).then(() => setDependencyId(""));
  };

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={submit}>
        <Section title="Действие">
          <label className={labelClass}>
            Название
            <input
              className={fieldClass}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              value={form.name}
            />
          </label>
          <label className={labelClass}>
            Описание
            <textarea
              className={`${fieldClass} min-h-20 resize-y`}
              disabled={!canEdit}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              value={form.description}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className={labelClass}>
              Порядок
              <input
                className={fieldClass}
                disabled={!canEdit}
                min="0"
                onChange={(e) =>
                  setForm({ ...form, sort_order: e.target.value })
                }
                required
                type="number"
                value={form.sort_order}
              />
            </label>
            <label className={labelClass}>
              Срок, дней
              <input
                className={fieldClass}
                disabled={!canEdit}
                min="0"
                onChange={(e) =>
                  setForm({ ...form, default_duration_days: e.target.value })
                }
                type="number"
                value={form.default_duration_days}
              />
            </label>
          </div>
          <div className={labelClass}>
            Этап
            <WorkflowSingleSelect
              disabled={!canEdit}
              id={`workflow-action-${action.id}-stage`}
              label="Этап действия"
              onChange={(stage) => setForm({ ...form, stage })}
              options={definition.stages.map((stage) => ({
                id: stage.id,
                name: stage.name,
              }))}
              placeholder="Выберите этап"
              value={form.stage}
            />
          </div>
          <Checkbox
            checked={form.is_optional}
            disabled={!canEdit}
            label="Необязательное"
            onChange={(is_optional) => setForm({ ...form, is_optional })}
          />
          <Checkbox
            checked={form.is_trigger_only}
            disabled={!canEdit}
            label="Запускать только переходом"
            onChange={(is_trigger_only) =>
              setForm({ ...form, is_trigger_only })
            }
          />
          <Checkbox
            checked={form.is_active}
            disabled={!canEdit}
            label="Активно"
            onChange={(is_active) => setForm({ ...form, is_active })}
          />
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <SubmitButton isPending={isPending} />
              <DeleteButton
                disabled={isPending}
                label="Удалить"
                onDelete={() => void remove()}
              />
            </div>
          ) : null}
        </Section>
      </form>

      <Section title="Исходы">
        {outcomes.map((outcome) => (
          <OutcomeRow
            canEdit={canEdit}
            isPending={isPending}
            key={outcome.id}
            onCommand={onCommand}
            outcome={outcome}
          />
        ))}
        {canEdit ? (
          <div className="flex gap-2">
            <input
              aria-label="Код нового исхода"
              className={fieldClass}
              onChange={(e) =>
                setNewOutcome({ ...newOutcome, code: e.target.value })
              }
              placeholder="Код"
              value={newOutcome.code}
            />
            <input
              aria-label="Название нового исхода"
              className={fieldClass}
              onChange={(e) =>
                setNewOutcome({ ...newOutcome, name: e.target.value })
              }
              placeholder="Название"
              value={newOutcome.name}
            />
            <Button
              aria-label="Добавить исход"
              colorScheme="neutral"
              disabled={
                isPending || !newOutcome.code.trim() || !newOutcome.name.trim()
              }
              onClick={addOutcome}
              size="icon"
              type="button"
              variant="outline"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        ) : null}
      </Section>

      <Section title="Переходы по исходам">
        {outcomes.map((outcome) => {
          const transition = definition.action_transitions.find(
            (item) => item.outcome.id === outcome.id,
          );
          return (
            <div className="space-y-1.5" key={outcome.id}>
              <div className="space-y-1.5 text-xs font-medium">
                {outcome.name}
                <WorkflowSingleSelect
                  clearable
                  disabled={!canEdit || isPending}
                  id={`workflow-outcome-${outcome.id}-transition`}
                  label={`Переход после «${outcome.name}»`}
                  onChange={(target) => {
                    if (!target && transition)
                      void onCommand({
                        method: "delete",
                        url: apiEndpoints.workflows.actionTransitions.detail(
                          transition.id,
                        ),
                      });
                    else if (target && transition)
                      void onCommand({
                        body: { target_action: target },
                        method: "patch",
                        url: apiEndpoints.workflows.actionTransitions.detail(
                          transition.id,
                        ),
                      });
                    else if (target)
                      void onCommand({
                        body: {
                          is_active: true,
                          outcome: outcome.id,
                          target_action: target,
                        },
                        method: "post",
                        url: apiEndpoints.workflows.actionTransitions.create,
                      });
                  }}
                  options={transitionActions.map((target) => ({
                    id: target.id,
                    name: target.name,
                  }))}
                  placeholder="Завершить без перехода"
                  value={transition?.target_action.id ?? ""}
                />
              </div>
              {transition ? (
                <Checkbox
                  checked={transition.is_active}
                  disabled={!canEdit || isPending}
                  label="Переход активен"
                  onChange={(is_active) =>
                    void onCommand({
                      body: { is_active },
                      method: "patch",
                      url: apiEndpoints.workflows.actionTransitions.detail(
                        transition.id,
                      ),
                    })
                  }
                />
              ) : null}
            </div>
          );
        })}
      </Section>

      <Section title="Зависимости">
        {dependencies.length ? (
          dependencies.map((dependency) => (
            <div
              className="bg-secondary/60 flex items-center gap-2 rounded-lg border p-2 text-sm"
              key={dependency.id}
            >
              <span className="min-w-0 flex-1 truncate">
                После: {dependency.depends_on_action.name}
              </span>
              <Checkbox
                checked={dependency.is_active}
                disabled={!canEdit || isPending}
                label="Активна"
                onChange={(is_active) =>
                  void onCommand({
                    body: { is_active },
                    method: "patch",
                    url: apiEndpoints.workflows.actionDependencies.detail(
                      dependency.id,
                    ),
                  })
                }
              />
              {canEdit ? (
                <Button
                  aria-label="Удалить зависимость"
                  colorScheme="neutral"
                  disabled={isPending}
                  onClick={() =>
                    void onCommand({
                      method: "delete",
                      url: apiEndpoints.workflows.actionDependencies.detail(
                        dependency.id,
                      ),
                    })
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-xs">
            Действие не зависит от других.
          </p>
        )}
        {canEdit ? (
          <div className="flex gap-2">
            <WorkflowSingleSelect
              clearable
              disabled={isPending}
              id={`workflow-action-${action.id}-dependency`}
              label="Зависит от действия"
              onChange={setDependencyId}
              options={dependencyOptions}
              placement="top"
              placeholder="Выберите действие"
              value={dependencyId}
            />
            <Button
              aria-label="Добавить зависимость"
              colorScheme="neutral"
              disabled={isPending || !dependencyId}
              onClick={addDependency}
              size="icon"
              type="button"
              variant="outline"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        ) : null}
      </Section>

      <Section title="Возможности">
        {features.length ? (
          features.map((feature) => (
            <FeatureRow
              canEdit={canEdit}
              feature={feature}
              isPending={isPending}
              key={feature.id}
              onCommand={onCommand}
            />
          ))
        ) : (
          <p className="text-muted-foreground text-xs">
            Возможности не настроены.
          </p>
        )}
        {canEdit ? (
          <div className="flex gap-2">
            <WorkflowSingleSelect
              disabled={isPending || !featureToAdd}
              id={`workflow-action-${action.id}-new-feature`}
              label="Новая возможность"
              onChange={setNewFeature}
              options={availableFeatureOptions}
              placement="top"
              placeholder="Нет доступных возможностей"
              value={featureToAdd ?? ""}
            />
            <Button
              aria-label="Добавить возможность"
              colorScheme="neutral"
              disabled={isPending || !featureToAdd}
              onClick={addFeature}
              size="icon"
              type="button"
              variant="outline"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Исполняемые сейчас возможности: создать, выбрать и привязать контакт.
          Остальные можно настроить заранее, но runtime вернёт «не реализовано»
          до появления обработчика.
        </p>
      </Section>
    </div>
  );
}

function TransitionForm({
  canEdit,
  isPending,
  onCommand,
  onDeleted,
  transition,
}: {
  canEdit: boolean;
  isPending: boolean;
  onCommand: InspectorProps["onCommand"];
  onDeleted: () => void;
  transition: StageTransitionDefinition;
}) {
  return (
    <Section title="Переход между этапами">
      <p className="text-sm">
        <strong>{transition.from_stage.name}</strong> →{" "}
        <strong>{transition.to_stage.name}</strong>
      </p>
      <Checkbox
        checked={transition.is_active}
        disabled={!canEdit || isPending}
        label="Переход активен"
        onChange={(is_active) =>
          void onCommand({
            body: { is_active },
            method: "patch",
            url: apiEndpoints.workflows.stageTransitions.detail(transition.id),
          })
        }
      />
      {canEdit ? (
        <DeleteButton
          disabled={isPending}
          label="Удалить переход"
          onDelete={() => {
            if (window.confirm("Удалить переход между этапами?"))
              void onCommand({
                method: "delete",
                url: apiEndpoints.workflows.stageTransitions.detail(
                  transition.id,
                ),
              }).then(onDeleted);
          }}
        />
      ) : null}
    </Section>
  );
}

export function WorkflowInspector({
  canEdit,
  definition,
  isPending,
  onCommand,
  onSelectionChange,
  selection,
}: InspectorProps) {
  const stage =
    selection.kind === "stage"
      ? definition.stages.find((item) => item.id === selection.id)
      : undefined;
  const action =
    selection.kind === "action"
      ? definition.actions.find((item) => item.id === selection.id)
      : undefined;
  const transition =
    selection.kind === "stage-transition"
      ? definition.stage_transitions.find((item) => item.id === selection.id)
      : undefined;
  const reset = () => onSelectionChange({ kind: "workflow" });

  return (
    <aside className="bg-card min-h-0 overflow-y-auto border-t p-4 xl:border-t-0 xl:border-l">
      <div className="mb-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Свойства
        </p>
        <h2 className="mt-1 text-lg font-semibold">
          {stage?.name ??
            action?.name ??
            (transition ? "Переход" : definition.workflow.name)}
        </h2>
        {!canEdit ? (
          <p className="text-muted-foreground mt-1 text-xs">
            Только просмотр: редактировать можно собственные workflow.
          </p>
        ) : null}
      </div>
      {stage ? (
        <StageForm
          canEdit={canEdit}
          isPending={isPending}
          key={stage.id}
          onCommand={onCommand}
          onDeleted={reset}
          stage={stage}
        />
      ) : action ? (
        <ActionForm
          action={action}
          canEdit={canEdit}
          definition={definition}
          isPending={isPending}
          key={action.id}
          onCommand={onCommand}
          onDeleted={reset}
        />
      ) : transition ? (
        <TransitionForm
          canEdit={canEdit}
          isPending={isPending}
          key={transition.id}
          onCommand={onCommand}
          onDeleted={reset}
          transition={transition}
        />
      ) : (
        <WorkflowForm
          canEdit={canEdit}
          isPending={isPending}
          key={definition.workflow.id}
          onCommand={onCommand}
          workflow={definition.workflow}
        />
      )}
    </aside>
  );
}
