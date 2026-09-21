import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type { ActionInstance } from "@/types/action-instance";
import type { ActionInstanceStatus } from "@/types/workflow-board";

export const tasksPageSize = 20;

/** Охват выборки внутри доступного пользователю; границы доступа задаёт бэкенд. */
export type ActionInstanceScope = "mine" | "all";

export type ActionInstancesParams = {
  /** Нижняя граница даты завершения, `ГГГГ-ММ-ДД`. Только для колонки «Завершено». */
  actualEndGte?: string;
  interactionId?: string | null;
  ordering: string;
  page: number;
  scope: ActionInstanceScope;
  status: ActionInstanceStatus;
};

/**
 * Ключ кеша колонки. `page` не входит: страницами управляет `useInfiniteQuery`.
 */
export function actionInstancesQueryKey(
  params: Omit<ActionInstancesParams, "page">,
) {
  return ["processes", "action-instances", params] as const;
}

export function getActionInstances({
  actualEndGte,
  interactionId,
  ordering,
  page,
  scope,
  status,
}: ActionInstancesParams) {
  const query = buildQuery({
    actual_end__gte: actualEndGte,
    interaction__ids: interactionId ?? undefined,
    ordering,
    page,
    page_size: tasksPageSize,
    scope,
    status,
  });

  return getJson<PaginatedResponse<ActionInstance>>(
    `${apiEndpoints.processes.actionInstances.list}?${query}`,
  );
}
