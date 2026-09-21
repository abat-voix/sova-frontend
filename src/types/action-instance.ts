import type {
  ActionInstanceStatus,
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
  stage_instance: string;
  action: WorkflowActionShort;
  /** Исполнитель действия; null, если не назначен. */
  responsible: UserShort | null;
};
