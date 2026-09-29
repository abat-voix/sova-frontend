import { apiEndpoints } from "@/lib/api/endpoints";
import { buildQuery, deleteJson, getJson, postJson } from "@/lib/api/http";
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

export type InteractionCounterpartyFilter = {
  id: string;
  kind: "organization" | "b2c_client";
} | null;

/** Максимум бэкенда (`max_page_size`); карточке взаимодействия хватает одной страницы. */
const compositionPageSize = 200;

function interactionCounterpartyFilterParams(
  counterpartyFilter: InteractionCounterpartyFilter,
) {
  if (!counterpartyFilter) return {};

  return counterpartyFilter.kind === "organization"
    ? { organization__ids: counterpartyFilter.id }
    : { b2c_client__ids: counterpartyFilter.id };
}

export function interactionsQueryKey(
  search: string,
  counterpartyFilter: InteractionCounterpartyFilter = null,
) {
  return [
    "interactions",
    "list",
    "page",
    { counterpartyFilter, search },
  ] as const;
}

export function interactionsInfiniteQueryKey(
  search: string,
  counterpartyFilter: InteractionCounterpartyFilter = null,
) {
  return [
    "interactions",
    "list",
    "infinite",
    { counterpartyFilter, search },
  ] as const;
}

export function interactionDirectionsQueryKey(interactionId: string) {
  return ["interactions", "directions", interactionId] as const;
}

export function interactionProgramsQueryKey(interactionId: string) {
  return ["interactions", "programs", interactionId] as const;
}

export function interactionProductsQueryKey(interactionId: string) {
  return ["interactions", "products", interactionId] as const;
}

export function getInteractions(
  page: number,
  search = "",
  counterpartyFilter: InteractionCounterpartyFilter = null,
  pageSize = interactionsPageSize,
) {
  const query = buildQuery({
    ...interactionCounterpartyFilterParams(counterpartyFilter),
    page,
    page_size: pageSize,
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
 * Удаляет незапущенное взаимодействие (`can_delete`) вместе с составом,
 * контактами, ответственными и чатом; запущенное бэкенд не удалит — 409.
 */
export function deleteInteraction(id: string, csrfToken: string) {
  return deleteJson(
    apiEndpoints.interactions.interactions.detail(id),
    csrfToken,
  );
}

/**
 * Добавляет ответственного менеджера. Отдельный шаг: полем при создании
 * взаимодействия ответственного не задать.
 *
 * КАМов у взаимодействия может быть несколько: действующие остаются;
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

/** Снимает указанного менеджера; остальные КАМы взаимодействия остаются. */
export function unassignResponsible(
  interactionId: string,
  managerId: number,
  csrfToken: string,
) {
  return postJson<InteractionResponsible>(
    apiEndpoints.interactions.interactions.unassignResponsible(interactionId),
    { manager: managerId },
    csrfToken,
  );
}

export function getInteractionDirections(interactionId: string) {
  const query = buildQuery({
    interaction__ids: interactionId,
    page_size: compositionPageSize,
  });

  return getJson<PaginatedResponse<InteractionDirection>>(
    `${apiEndpoints.interactions.interactionDirections.list}?${query}`,
  );
}

export function getInteractionPrograms(interactionId: string) {
  const query = buildQuery({
    interaction__ids: interactionId,
    page_size: compositionPageSize,
  });

  return getJson<PaginatedResponse<InteractionProgram>>(
    `${apiEndpoints.interactions.interactionPrograms.list}?${query}`,
  );
}

export function getInteractionProducts(interactionId: string) {
  const query = buildQuery({
    interaction__ids: interactionId,
    page_size: compositionPageSize,
  });

  return getJson<PaginatedResponse<InteractionProduct>>(
    `${apiEndpoints.interactions.interactionProducts.list}?${query}`,
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
