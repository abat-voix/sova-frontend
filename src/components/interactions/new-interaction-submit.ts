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
  /** Ответственный назначен — повтор его не дублирует. */
  responsibleAssigned: boolean;
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
  let responsibleAssigned = false;

  if (plan.interaction) {
    try {
      const interaction = await createInteraction(plan.interaction, csrfToken);
      interactionId = interaction.id;
    } catch (error) {
      return { createdIds, error, interactionId: null, responsibleAssigned };
    }
  }

  if (interactionId === null) {
    return {
      createdIds,
      error: new Error("missing-interaction"),
      interactionId,
      responsibleAssigned,
    };
  }

  if (plan.responsibleId !== null) {
    try {
      await assignResponsible(interactionId, plan.responsibleId, csrfToken);
      responsibleAssigned = true;
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

  return { createdIds, error: firstError, interactionId, responsibleAssigned };
}
