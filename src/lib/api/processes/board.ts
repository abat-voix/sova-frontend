import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson, postFormData, postJson } from "@/lib/api/http";
import type {
  CancelActionPayload,
  CancelActionResult,
} from "@/types/action-rollback";
import type { PaginatedResponse } from "@/types/api";
import type {
  ActionFeatureCode,
  ActionFeaturePayloadMap,
  ExecuteActionFeatureResult,
} from "@/types/action-feature";
import type {
  CancelStagePayload,
  CompleteActionPayload,
  CompleteActionResult,
  StartWorkflowInstancePayload,
  WorkflowBoard,
  WorkflowInstance,
} from "@/types/workflow-board";

export function boardQueryKey(workflowInstanceId: string) {
  return ["processes", "workflow-board", workflowInstanceId] as const;
}

export function workflowInstancesQueryKey(interactionId: string) {
  return ["processes", "workflow-instances", interactionId] as const;
}

export function getWorkflowInstances(interactionId: string) {
  const query = buildQuery({
    interaction__ids: interactionId,
    ordering: "-started_at",
  });

  return getJson<PaginatedResponse<WorkflowInstance>>(
    `${apiEndpoints.processes.workflowInstances.list}?${query}`,
  );
}

/**
 * Запускает процесс: движок создаёт все экземпляры этапов и действий и
 * открывает этапы без входящих связей (Шаг 3 описания движка).
 */
export function startWorkflowInstance(
  payload: StartWorkflowInstancePayload,
  csrfToken: string,
) {
  return postJson<WorkflowInstance>(
    apiEndpoints.processes.workflowInstances.list,
    payload,
    csrfToken,
  );
}

/** Весь путь процесса одним ответом: этапы, действия, доступные исходы. */
export function getWorkflowBoard(workflowInstanceId: string) {
  return getJson<WorkflowBoard>(
    apiEndpoints.processes.workflowInstances.board(workflowInstanceId),
  );
}

/**
 * Завершает действие выбранным исходом. Процесс двигает движок на бэкенде —
 * после успеха доску перезапрашиваем, а не пересобираем у себя.
 */
export function completeAction(
  actionInstanceId: string,
  payload: CompleteActionPayload,
  csrfToken: string,
) {
  return postJson<CompleteActionResult>(
    apiEndpoints.processes.actionInstances.complete(actionInstanceId),
    payload,
    csrfToken,
  );
}

/** Выполняет feature для текущего исполнения действия. Контекст задаёт backend. */
export function executeActionFeature(
  actionInstanceId: string,
  code: ActionFeatureCode,
  payload: ActionFeaturePayloadMap[typeof code],
  csrfToken: string,
) {
  return postJson<ExecuteActionFeatureResult>(
    apiEndpoints.processes.actionInstances.executeFeature(
      actionInstanceId,
      code,
    ),
    payload,
    csrfToken,
  );
}

export function cancelStage(
  stageInstanceId: string,
  payload: CancelStagePayload,
  csrfToken: string,
) {
  return postJson<unknown>(
    apiEndpoints.processes.stageInstances.cancel(stageInstanceId),
    payload,
    csrfToken,
  );
}

/**
 * Откатывает выполненное действие: движок создаёт новое исполнение вместо
 * отменённого.
 *
 * Доступность отката бэкенд проверяет сам — флага в доске нет, поэтому
 * интерфейс показывает кнопку по статусу и разбирает отказ по коду ошибки.
 */
export function cancelAction(
  actionInstanceId: string,
  payload: CancelActionPayload,
  csrfToken: string,
) {
  return postJson<CancelActionResult>(
    apiEndpoints.processes.actionInstances.cancel(actionInstanceId),
    payload,
    csrfToken,
  );
}

/**
 * Загружает файл к исполнению действия.
 *
 * Исход с `is_attachment_required` проверяется на бэкенде при завершении, поэтому
 * файл нужно отправить раньше, чем команду `complete`.
 */
export function uploadActionAttachment(
  actionInstanceId: string,
  file: File,
  csrfToken: string,
) {
  const body = new FormData();
  body.set("action_instance", actionInstanceId);
  body.set("file", file);

  return postFormData<unknown>(
    apiEndpoints.processes.actionAttachments.list,
    body,
    csrfToken,
  );
}
