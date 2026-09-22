import type { ActionInstance } from "./action-instance";
import type { UserShort } from "./workflow-board";

/**
 * `ActionRollback` — запись журнала об откате действия.
 *
 * `from_action_instance` и `to_action_instance` бэкенд отдаёт развёрнуто:
 * отменённое исполнение и созданное взамен.
 */
export type ActionRollback = {
  id: string;
  reason: string;
  created_at: string;
  /** Пусто, если пользователь удалён. */
  created_by: UserShort | null;
  workflow_instance: string;
  stage_instance: string;
  from_action_instance: ActionInstance;
  to_action_instance: ActionInstance;
};

/** Откат действия: причина обязательна, она попадает в журнал. */
export type CancelActionPayload = {
  reason: string;
};

export type CancelActionResult = {
  /** Новое исполнение, созданное откатом. */
  action_instance: ActionInstance;
  rollback: ActionRollback;
};
