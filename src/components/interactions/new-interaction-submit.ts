/**
 * Выполнение плана создания взаимодействия.
 *
 * Запросов несколько, и упасть может любой, поэтому исполнитель не бросает
 * исключение, а возвращает то, что успел создать: форма помечает принятые узлы
 * и повторяет только недостающее. Откат не делаем — история взаимодействия
 * ценнее аккуратности неудачной попытки.
 */

import {
  assignResponsible,
  createInteraction,
  createInteractionDirection,
  createInteractionProduct,
  createInteractionProgram,
} from "@/lib/api/interactions/interactions";
import type { CreationPlan } from "@/components/interactions/new-interaction-plan";

export type CreationOutcome = {
  /** Ключ узла черновика → id созданной записи. */
  createdIds: Record<string, string>;
  /** Первая ошибка; `null` — план выполнен целиком. */
  error: unknown;
  /** `null` только если не удалось создать само взаимодействие. */
  interactionId: string | null;
  /** id назначенных менеджеров (строкой, как в черновике) — повтор их не дублирует. */
  assignedResponsibleIds: string[];
};

export async function runCreationPlan(
  plan: CreationPlan,
  csrfToken: string,
): Promise<CreationOutcome> {
  const createdIds: Record<string, string> = {};
  let firstError: unknown = null;

  const remember = (error: unknown) => {
    if (firstError === null) firstError = error;
  };

  let interactionId = plan.interactionId;
  const assignedResponsibleIds: string[] = [];

  if (plan.interaction) {
    try {
      const interaction = await createInteraction(plan.interaction, csrfToken);
      interactionId = interaction.id;
    } catch (error) {
      return { assignedResponsibleIds, createdIds, error, interactionId: null };
    }
  }

  if (interactionId === null) {
    return {
      assignedResponsibleIds,
      createdIds,
      error: new Error("missing-interaction"),
      interactionId,
    };
  }

  for (const responsibleId of plan.responsibleIds) {
    try {
      await assignResponsible(interactionId, responsibleId, csrfToken);
      assignedResponsibleIds.push(String(responsibleId));
    } catch (error) {
      // Взаимодействие уже создано — продолжаем, назначение доотправит повтор.
      remember(error);
    }
  }

  for (const direction of plan.directions) {
    try {
      const created = await createInteractionDirection(
        { direction: direction.directionId, interaction: interactionId },
        csrfToken,
      );
      createdIds[direction.key] = created.id;
    } catch (error) {
      // Направления независимы: неудача одного не отменяет остальные.
      remember(error);
    }
  }

  for (const program of plan.programs) {
    let interactionProgramId = program.createdId;

    if (program.programId !== null) {
      try {
        const created = await createInteractionProgram(
          { interaction: interactionId, program: program.programId },
          csrfToken,
        );
        interactionProgramId = created.id;
        createdIds[program.key] = created.id;
      } catch (error) {
        // Без id программы её продукты отправить невозможно — пропускаем ветку.
        remember(error);
        continue;
      }
    }

    for (const product of program.products) {
      try {
        const created = await createInteractionProduct(
          {
            interaction: interactionId,
            interaction_program: interactionProgramId,
            product: product.productId,
          },
          csrfToken,
        );
        createdIds[product.key] = created.id;
      } catch (error) {
        remember(error);
      }
    }
  }

  return {
    assignedResponsibleIds,
    createdIds,
    error: firstError,
    interactionId,
  };
}
