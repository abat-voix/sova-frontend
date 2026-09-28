import type { BoardSelection } from "@/lib/workflow/board-to-gantt";
import type { InteractionCounterpartyFilter } from "@/lib/api/interactions/interactions";

/** Что открыть на странице взаимодействий по адресу из уведомления. */
export type InteractionLinkTarget = {
  counterpartyFilter: InteractionCounterpartyFilter;
  interactionId: string | null;
  processId: string | null;
  row: { id: string; kind: BoardSelection["kind"] } | null;
};

/**
 * Разбирает ссылку из уведомления либо фильтр контрагента из справочника.
 *
 * Формат задаёт бэкенд (`sova.notifications.services.links.interaction_link`).
 * Без взаимодействия процесс и строка доски смысла не имеют и отбрасываются;
 * действие точнее этапа, поэтому при обоих открываем действие.
 */
export function parseInteractionLink(
  params: Pick<URLSearchParams, "get"> | null,
): InteractionLinkTarget {
  const organizationId = params?.get("organization__ids") || null;
  const b2cClientId = params?.get("b2c_client__ids") || null;
  const counterpartyFilter = organizationId
    ? { id: organizationId, kind: "organization" as const }
    : b2cClientId
      ? { id: b2cClientId, kind: "b2c_client" as const }
      : null;
  const interactionId = params?.get("interaction") || null;
  if (!interactionId) {
    return {
      counterpartyFilter,
      interactionId: null,
      processId: null,
      row: null,
    };
  }

  const actionId = params?.get("action") || null;
  const stageId = params?.get("stage") || null;

  return {
    counterpartyFilter,
    interactionId,
    processId: params?.get("process") || null,
    row: actionId
      ? { id: actionId, kind: "action" }
      : stageId
        ? { id: stageId, kind: "stage" }
        : null,
  };
}
