import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, getJson, postJson } from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type {
  CreateInteractionDirectionPayload,
  CreateInteractionPayload,
  CreateInteractionProductPayload,
  CreateInteractionProgramPayload,
  Interaction,
  InteractionDirection,
  InteractionProduct,
  InteractionProgram,
  InteractionResponsible,
} from "@/types/workflow-board";

export const interactionsPageSize = 20;

export function interactionsQueryKey(search: string) {
  return ["interactions", "list", { search }] as const;
}

export function getInteractions(page: number, search = "") {
  const query = buildQuery({
    page,
    page_size: interactionsPageSize,
    search: search.trim(),
  });

  return getJson<PaginatedResponse<Interaction>>(
    `${apiEndpoints.interactions.interactions.list}?${query}`,
  );
}

export function createInteraction(
  payload: CreateInteractionPayload,
  csrfToken: string,
) {
  return postJson<Interaction>(
    apiEndpoints.interactions.interactions.list,
    payload,
    csrfToken,
  );
}

/**
 * Назначает ответственного менеджера. Отдельный шаг: полем при создании
 * взаимодействия ответственного не задать.
 *
 * Действующий ответственный, если он был, закрывается и остаётся в истории;
 * повторное назначение того же менеджера возвращает 200 и ничего не меняет.
 */
export function assignResponsible(
  interactionId: string,
  managerId: number,
  csrfToken: string,
) {
  return postJson<InteractionResponsible>(
    apiEndpoints.interactions.interactions.assignResponsible(interactionId),
    { manager: managerId },
    csrfToken,
  );
}

export function createInteractionDirection(
  payload: CreateInteractionDirectionPayload,
  csrfToken: string,
) {
  return postJson<InteractionDirection>(
    apiEndpoints.interactions.interactionDirections.list,
    payload,
    csrfToken,
  );
}

export function createInteractionProgram(
  payload: CreateInteractionProgramPayload,
  csrfToken: string,
) {
  return postJson<InteractionProgram>(
    apiEndpoints.interactions.interactionPrograms.list,
    payload,
    csrfToken,
  );
}

/**
 * `interaction_program` — идентификатор программы **взаимодействия** (ответ
 * `createInteractionProgram`), а не программы каталога. Поэтому продукт
 * отправляется только после своей программы.
 */
export function createInteractionProduct(
  payload: CreateInteractionProductPayload,
  csrfToken: string,
) {
  return postJson<InteractionProduct>(
    apiEndpoints.interactions.interactionProducts.list,
    payload,
    csrfToken,
  );
}
