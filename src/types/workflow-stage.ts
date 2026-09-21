import type {
  StageInstanceContextType,
  WorkflowShort,
  WorkflowStageShort,
} from "./workflow-board";

/**
 * Этапы workflow и связи между ними — по схемам `WorkflowStage`,
 * `WorkflowStageShort`, `WriteWorkflowStage`, `PatchedWriteWorkflowStage`,
 * `StageTransition`, `WriteStageTransition`, `PatchedWriteStageTransition`
 * из `docs/SOVA API.yaml`.
 *
 * Правки пишутся в аудит. Граф связей должен оставаться ациклическим —
 * циклы отклоняются с 400.
 */

/** `WorkflowStage` — представление для чтения (list/retrieve). */
export type WorkflowStage = {
  id: string;
  name: string;
  /**
   * К чему относится этап: ко всему взаимодействию или к каждому его
   * направлению, программе, продукту. Для каждого объекта соответствующего
   * типа создаётся свой экземпляр этапа.
   */
  type: StageInstanceContextType;
  description?: string;
  sort_order: number;
  is_initial: boolean;
  is_final: boolean;
  is_optional: boolean;
  active: boolean;
  workflow: WorkflowShort;
  created_at: string;
  updated_at: string;
};

/**
 * `WorkflowStageShort` — краткое представление для вложенного использования.
 *
 * Определён в `workflow-board.ts`; реэкспорт для удобства.
 */
export type { WorkflowStageShort } from "./workflow-board";

/** `WriteWorkflowStage` — валидация входных данных (create/update). */
export type WriteWorkflowStage = {
  id?: string;
  name: string;
  type?: StageInstanceContextType;
  description?: string;
  sort_order: number;
  is_initial?: boolean;
  is_final?: boolean;
  is_optional?: boolean;
  active?: boolean;
  workflow: string;
};

/** `PatchedWriteWorkflowStage` — тело PATCH-запроса. */
export type PatchedWriteWorkflowStage = Partial<WriteWorkflowStage>;

/** `StageTransition` — представление для чтения (list/retrieve). */
export type StageTransition = {
  id: string;
  active: boolean;
  from_stage: WorkflowStageShort;
  to_stage: WorkflowStageShort;
  created_at: string;
  updated_at: string;
};

/** `WriteStageTransition` — валидация входных данных (create/update). */
export type WriteStageTransition = {
  id?: string;
  active?: boolean;
  from_stage: string;
  to_stage: string;
};

/** `PatchedWriteStageTransition` — тело PATCH-запроса. */
export type PatchedWriteStageTransition = Partial<WriteStageTransition>;
