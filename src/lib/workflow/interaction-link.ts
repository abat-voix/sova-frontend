import type { BoardSelection } from "@/lib/workflow/board-to-gantt";

/** Что открыть на странице взаимодействий по адресу из уведомления. */
export type InteractionLinkTarget = {
  interactionId: string | null;
  processId: string | null;
  row: { id: string; kind: BoardSelection["kind"] } | null;
};

/**
 * Разбирает `/interactions?interaction=…&process=…&stage=…|action=…`.
 *
 * Формат задаёт бэкенд (`sova.notifications.services.links.interaction_link`).
 * Без взаимодействия процесс и строка доски смысла не имеют и отбрасываются;
 * действие точнее этапа, поэтому при обоих открываем действие.
 */
export function parseInteractionLink(
  params: Pick<URLSearchParams, "get"> | null,
): InteractionLinkTarget {
  const interactionId = params?.get("interaction") || null;
  if (!interactionId) {
    return { interactionId: null, processId: null, row: null };
  }

  const actionId = params?.get("action") || null;
  const stageId = params?.get("stage") || null;

  return {
    interactionId,
    processId: params?.get("process") || null,
    row: actionId
      ? { id: actionId, kind: "action" }
      : stageId
        ? { id: stageId, kind: "stage" }
        : null,
  };
}
