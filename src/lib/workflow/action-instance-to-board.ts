import type { ActionInstance } from "@/types/action-instance";
import type { BoardAction } from "@/types/workflow-board";

/**
 * Карточка задачи — тот же экземпляр действия, что и строка доски.
 *
 * `ActionInstance` в схеме намеренно повторяет состав `BoardAction`, чтобы
 * список действий по всем процессам показывался теми же карточками. Расходится
 * одно имя: слепок названия зовётся `action_name_snapshot`, а не `name`.
 * Запроса доски ради панели не делаем — всё нужное уже в карточке.
 */
export function actionInstanceToBoardAction(
  instance: ActionInstance,
): BoardAction {
  return {
    id: instance.id,
    action: instance.action,
    name: instance.action_name_snapshot,
    status: instance.status,
    is_optional: instance.is_optional,
    is_trigger_only: instance.is_trigger_only,
    is_triggered: instance.is_triggered,
    execution_no: instance.execution_no,
    planned_start: instance.planned_start,
    planned_end: instance.planned_end,
    actual_start: instance.actual_start,
    actual_end: instance.actual_end,
    is_overdue: instance.is_overdue,
    responsible: instance.responsible,
    result: instance.result,
    attachments_count: instance.attachments_count,
    available_outcomes: instance.available_outcomes,
    available_features: instance.available_features,
    feature_executions: instance.feature_executions,
    interaction: instance.interaction,
  };
}
