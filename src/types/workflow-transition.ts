import type { ActionOutcomeShort, WorkflowActionShort } from "./workflow-board";

/**
 * Зависимости и переходы действий — по схемам `ActionDependency`,
 * `WriteActionDependency`, `PatchedWriteActionDependency`, `ActionTransition`,
 * `WriteActionTransition`, `PatchedWriteActionTransition` из
 * `docs/SOVA API.yaml`.
 *
 * Правки пишутся в аудит. Граф зависимостей должен оставаться ациклическим —
 * циклы отклоняются с 400.
 */

/** `ActionDependency` — представление для чтения (list/retrieve). */
export type ActionDependency = {
  id: string;
  active: boolean;
  action: WorkflowActionShort;
  depends_on_action: WorkflowActionShort;
  created_at: string;
  updated_at: string;
};

/** `WriteActionDependency` — валидация входных данных (create/update). */
export type WriteActionDependency = {
  id?: string;
  active?: boolean;
  action: string;
  depends_on_action: string;
};

/** `PatchedWriteActionDependency` — тело PATCH-запроса. */
export type PatchedWriteActionDependency = Partial<WriteActionDependency>;

/** `ActionTransition` — представление для чтения (list/retrieve). */
export type ActionTransition = {
  id: string;
  active: boolean;
  outcome: ActionOutcomeShort;
  target_action: WorkflowActionShort;
  created_at: string;
  updated_at: string;
};

/** `WriteActionTransition` — валидация входных данных (create/update). */
export type WriteActionTransition = {
  id?: string;
  active?: boolean;
  outcome: string;
  target_action: string;
};

/** `PatchedWriteActionTransition` — тело PATCH-запроса. */
export type PatchedWriteActionTransition = Partial<WriteActionTransition>;
