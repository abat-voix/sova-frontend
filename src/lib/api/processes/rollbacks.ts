import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson } from "@/lib/api/http";
import type { ActionRollback, StageRollback } from "@/types/action-rollback";
import type { PaginatedResponse } from "@/types/api";

/**
 * Журнал берётся целиком по процессу: фильтра по конкретному действию у
 * эндпоинта нет, поэтому нужные записи панель отбирает у себя. Откатов у
 * одного процесса единицы, страница в сто записей их покрывает.
 */
const rollbacksPageSize = 100;

export function rollbacksQueryKey(workflowInstanceId: string) {
  return ["processes", "rollbacks", workflowInstanceId] as const;
}

function query(workflowInstanceId: string) {
  return buildQuery({
    ordering: "-created_at",
    page_size: rollbacksPageSize,
    workflow_instance__ids: workflowInstanceId,
  });
}

export function getActionRollbacks(workflowInstanceId: string) {
  return getJson<PaginatedResponse<ActionRollback>>(
    `${apiEndpoints.processes.actionRollbacks.list}?${query(workflowInstanceId)}`,
  );
}

export function getStageRollbacks(workflowInstanceId: string) {
  return getJson<PaginatedResponse<StageRollback>>(
    `${apiEndpoints.processes.stageRollbacks.list}?${query(workflowInstanceId)}`,
  );
}
