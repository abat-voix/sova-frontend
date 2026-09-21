import type { UserShort } from "./workflow-board";

/**
 * Журнал изменений структуры workflow — по схеме `WorkflowChange` из
 * `docs/SOVA API.yaml`.
 *
 * Только чтение: записи пишет движок при правках workflow-конструктора.
 */
export type WorkflowChange = {
  id: string;
  change_type: string;
  entity_type: string;
  entity_id: string;
  workflow: string;
  /** Пользователь, внёсший изменение; null, если он удалён. */
  created_by: UserShort | null;
  created_at: string;
};
