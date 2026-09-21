import type {
  ActionInstanceStatus,
  BoardOutcome,
  BoardResult,
  InteractionShort,
  UserShort,
  WorkflowActionShort,
} from "./workflow-board";

/**
 * Экземпляр действия этапа — по схеме `ActionInstance` из
 * `docs/SOVA API.yaml`.
 *
 * Создаёт и меняет экземпляры только движок: действия появляются при запуске
 * процесса, запускаются по зависимостям и переходам, завершаются запросом
 * `complete`. Пользователь может только просматривать и завершать их.
 */
export type ActionInstance = {
  id: string;
  /** Название действия на момент запуска процесса — слепок. */
  action_name_snapshot: string;
  status: ActionInstanceStatus;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  /**
   * Момент запуска переходом по исходу другого действия. Отличает
   * запущенное, но ждущее зависимостей действие от ещё не запущенного.
   */
  triggered_at: string | null;
  /** Номер исполнения; > 1 при повторном выполнении после возврата. */
  execution_no: number;
  /** Не мешает закрыть этап и остаётся доступным после его закрытия. */
  is_optional: boolean;
  /** Запускается переходом по исходу другого действия, а не вместе с этапом. */
  is_trigger_only: boolean;
  is_triggered: boolean;
  /** Считает бэкенд: не выполнено и плановое окончание прошло. */
  is_overdue: boolean;
  attachments_count: number;
  stage_instance: string;
  /**
   * Название этапа из определения workflow. Именно текущее: слепка названия
   * у этапа нет, в отличие от действия.
   */
  stage_name_snapshot: string;
  workflow_instance: string;
  interaction: InteractionShort;
  action: WorkflowActionShort;
  /** Исполнитель действия; null, если не назначен. */
  responsible: UserShort | null;
  /** Пусто, пока действие не выполнено. */
  result: BoardResult | null;
  /** Активные исходы; пусто, если действие не в работе. */
  available_outcomes: BoardOutcome[];
};
