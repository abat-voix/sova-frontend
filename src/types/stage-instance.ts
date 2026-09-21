import type {
  StageInstanceContextType,
  StageInstanceStatus,
  UserShort,
  WorkflowStageShort,
} from "./workflow-board";

/**
 * Экземпляр этапа процесса — по схемам `StageInstance`, `StageInstanceShort`,
 * `StageRollback` из `docs/SOVA API.yaml`.
 *
 * Экземпляры создаёт и открывает движок; пользователь может только отменить
 * этап в работе — процесс вернётся на предыдущий этап.
 */

/** `StageInstance` — представление для чтения (list/retrieve). */
export type StageInstance = {
  id: string;
  context_type: StageInstanceContextType;
  /**
   * Указывает на `Interaction.id`, `InteractionDirection.id`,
   * `InteractionProgram.id` или `InteractionProduct.id` — по значению
   * `context_type`.
   */
  context_id: string | null;
  status: StageInstanceStatus;
  /** Момент создания экземпляра (отличается от `started_at`). */
  added_at: string;
  /** Момент, когда этап стал доступен. */
  started_at: string | null;
  completed_at: string | null;
  workflow_instance: string;
  stage: WorkflowStageShort;
  /** Пользователь, добавивший этап; null, если он удалён. */
  added_by: UserShort | null;
};

/**
 * `StageInstanceShort` — краткое представление для вложенного использования
 * (например, в `StageRollback`).
 */
export type StageInstanceShort = {
  id: string;
  stage: WorkflowStageShort;
  context_type: StageInstanceContextType;
  context_id: string | null;
};

/** Режим возврата этапа при откате. */
export type RollbackMode = "restart" | "last_only";

/**
 * `StageRollback` — журнал откатов этапов (только чтение).
 *
 * Записи пишет движок при отмене этапа.
 */
export type StageRollback = {
  id: string;
  reason: string;
  mode: RollbackMode;
  created_at: string;
  workflow_instance: string;
  /** Этап, который пользователь отменил. */
  from_stage_instance: StageInstanceShort;
  /** Этап, на который вернулся процесс. */
  to_stage_instance: StageInstanceShort;
  /** Пользователь, выполнивший откат; null, если он удалён. */
  created_by: UserShort | null;
};

/**
 * `CancelStage` — валидация входных данных для отмены этапа.
 *
 * `return_to` нужен, если у отменяемого этапа несколько предшественников;
 * варианты отдаёт доска (`BoardStage.return_options`).
 */
export type CancelStage = {
  mode: RollbackMode;
  reason: string;
  return_to?: string | null;
};

/**
 * `CancelStageResult` — что изменилось в процессе после отмены этапа.
 */
export type CancelStageResult = {
  rollback: StageRollback;
  /** Этап, на который вернулся процесс. */
  returned_stage: StageInstance;
  /**
   * Этапы после этапа возврата, которые снова ожидают и будут выполнены
   * заново.
   */
  reset_stages: StageInstance[];
};
