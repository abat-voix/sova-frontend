import type { WorkflowStageShort } from "./workflow-board";
import type { WorkflowActionShort } from "./workflow-board";
/**
 * Действия workflow и их исходы — по схемам `WorkflowAction`,
 * `WorkflowActionShort`, `WriteWorkflowAction`, `PatchedWriteWorkflowAction`,
 * `ActionOutcome`, `ActionOutcomeShort`, `WriteActionOutcome`,
 * `PatchedWriteActionOutcome` из `docs/SOVA API.yaml`.
 *
 * Правки пишутся в аудит. Новое действие сразу получает исход «Выполнено» —
 * без исхода его нельзя завершить.
 */

/** `WorkflowAction` — представление для чтения (list/retrieve). */
export type WorkflowAction = {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  /**
   * Плановая длительность, дней. Используется и как план
   * (`planned_end = planned_start + default_duration_days`), и как порог
   * контроля зависания действия. `null` — контроль не ведётся.
   */
  default_duration_days: number | null;
  /** Можно пропустить без исхода. */
  is_optional: boolean;
  /**
   * Действие не стартует при открытии этапа, а запускается переходом по
   * исходу другого действия. Пока не запущено, не мешает закрытию этапа.
   */
  starts_by_transition_only: boolean;
  active: boolean;
  stage: WorkflowStageShort;
  created_at: string;
  updated_at: string;
};

/**
 * `WorkflowActionShort` — краткое представление для вложенного использования.
 *
 * Определён в `workflow-board.ts`; реэкспорт для удобства.
 */
export type { WorkflowActionShort } from "./workflow-board";

/**
 * `WriteWorkflowAction` — валидация входных данных (create/update).
 *
 * `id` в схеме `readOnly` + `required` — при создании не передаётся.
 * `sort_order` и `stage` обязательны.
 */
export type WriteWorkflowAction = {
  id?: string;
  name: string;
  description?: string;
  sort_order: number;
  default_duration_days?: number | null;
  is_optional?: boolean;
  starts_by_transition_only?: boolean;
  active?: boolean;
  stage: string;
};

/** `PatchedWriteWorkflowAction` — тело PATCH-запроса. */
export type PatchedWriteWorkflowAction = Partial<WriteWorkflowAction>;

/** `ActionOutcome` — представление для чтения (list/retrieve). */
export type ActionOutcome = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  comment_required: boolean;
  attachment_required: boolean;
  action: WorkflowActionShort;
  created_at: string;
  updated_at: string;
};

/**
 * `ActionOutcomeShort` — краткое представление для вложенного использования.
 *
 * Определён в `workflow-board.ts`; реэкспорт для удобства.
 */
export type { ActionOutcomeShort } from "./workflow-board";

/** `WriteActionOutcome` — валидация входных данных (create/update). */
export type WriteActionOutcome = {
  id?: string;
  code: string;
  name: string;
  active?: boolean;
  comment_required?: boolean;
  attachment_required?: boolean;
  action: string;
};

/** `PatchedWriteActionOutcome` — тело PATCH-запроса. */
export type PatchedWriteActionOutcome = Partial<WriteActionOutcome>;
