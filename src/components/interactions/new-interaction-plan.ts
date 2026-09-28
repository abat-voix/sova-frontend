/**
 * Черновик нового взаимодействия и план запросов к API.
 *
 * Пользователь заполняет дерево «направление → программы → продукты», но в
 * данных бэкенда дерева нет: `InteractionProgram` не ссылается на
 * `InteractionDirection`, направление программы выводится через
 * `program.direction` каталога. Дерево здесь — только способ ввода; план
 * превращает его в плоский список запросов.
 *
 * Модуль чистый: ключи узлов приходят снаружи, поэтому состояние
 * воспроизводимо и проверяется без DOM.
 */

import type { LookupOption } from "@/lib/api/catalog/lookups";
import type { CreateInteractionPayload } from "@/types/workflow-board";

export type CounterpartyKind = "organization" | "b2c_client";

export type ProductNode = {
  /** id созданного `InteractionProduct`; `null` — ещё не отправлен. */
  createdId: string | null;
  key: string;
  product: LookupOption | null;
};

export type ProgramNode = {
  /** id созданного `InteractionProgram`; нужен продуктам этой программы. */
  createdId: string | null;
  key: string;
  products: ProductNode[];
  program: LookupOption | null;
};

export type DirectionNode = {
  createdId: string | null;
  direction: LookupOption | null;
  key: string;
  programs: ProgramNode[];
};

export type InteractionDraft = {
  comment: string;
  counterparty: LookupOption | null;
  counterpartyKind: CounterpartyKind;
  /** Заполняется после успешного `POST /interactions/`: повтор его не создаёт. */
  createdInteractionId: string | null;
  directions: DirectionNode[];
  isActive: boolean;
  /**
   * Ответственные менеджеры (КАМов может быть несколько). `id` — число
   * пользователя в виде строки: выпадушка работает со строковыми
   * идентификаторами, назначение — с числовым.
   */
  responsibles: LookupOption[];
  /** Уже назначенные из `responsibles` — повтор их не дублирует. */
  assignedResponsibleIds: string[];
};

export const emptyDraft: InteractionDraft = {
  comment: "",
  counterparty: null,
  counterpartyKind: "organization",
  createdInteractionId: null,
  directions: [],
  isActive: true,
  responsibles: [],
  assignedResponsibleIds: [],
};

/**
 * Черновик с уже проставленным ответственным.
 *
 * КАМ ведёт взаимодействие сам и выбирать никого не может, поэтому форма
 * открывается с ним в поле.
 */
export function draftWithResponsible(
  responsible: LookupOption | null,
): InteractionDraft {
  return { ...emptyDraft, responsibles: responsible ? [responsible] : [] };
}

export type DraftAction =
  | { type: "set-counterparty-kind"; kind: CounterpartyKind }
  | { type: "set-counterparty"; option: LookupOption | null }
  | { type: "set-comment"; comment: string }
  | { type: "set-active"; isActive: boolean }
  | { type: "set-responsibles"; options: LookupOption[] }
  | { type: "add-direction"; key: string }
  | { type: "remove-direction"; key: string }
  | { type: "set-direction"; key: string; option: LookupOption | null }
  | { type: "add-program"; directionKey: string; key: string }
  | { type: "remove-program"; key: string }
  | { type: "set-program"; key: string; option: LookupOption | null }
  | { type: "add-product"; programKey: string; key: string }
  | { type: "remove-product"; key: string }
  | { type: "set-product"; key: string; option: LookupOption | null }
  | {
      type: "mark-created";
      createdIds: Record<string, string>;
      interactionId: string | null;
      assignedResponsibleIds: string[];
    };

const emptyProduct = (key: string): ProductNode => ({
  createdId: null,
  key,
  product: null,
});

const emptyProgram = (key: string): ProgramNode => ({
  createdId: null,
  key,
  products: [],
  program: null,
});

const emptyDirection = (key: string): DirectionNode => ({
  createdId: null,
  direction: null,
  key,
  programs: [],
});

function mapPrograms(
  draft: InteractionDraft,
  change: (program: ProgramNode) => ProgramNode,
) {
  return draft.directions.map((direction) => ({
    ...direction,
    programs: direction.programs.map(change),
  }));
}

export function draftReducer(
  draft: InteractionDraft,
  action: DraftAction,
): InteractionDraft {
  switch (action.type) {
    case "set-counterparty-kind":
      // Вуз и B2C-клиент лежат в разных справочниках, поэтому прежний выбор
      // после смены типа недействителен.
      return {
        ...draft,
        counterparty: null,
        counterpartyKind: action.kind,
      };

    case "set-counterparty":
      return { ...draft, counterparty: action.option };

    case "set-comment":
      return { ...draft, comment: action.comment };

    case "set-active":
      return { ...draft, isActive: action.isActive };

    case "set-responsibles":
      return { ...draft, responsibles: action.options };

    case "add-direction":
      return {
        ...draft,
        directions: [...draft.directions, emptyDirection(action.key)],
      };

    case "remove-direction":
      return {
        ...draft,
        directions: draft.directions.filter(
          (direction) => direction.key !== action.key,
        ),
      };

    case "set-direction":
      return {
        ...draft,
        directions: draft.directions.map((direction) =>
          direction.key === action.key
            ? // Программа принадлежит своему направлению — прежние ветки
              // перестают быть допустимыми.
              { ...direction, direction: action.option, programs: [] }
            : direction,
        ),
      };

    case "add-program":
      return {
        ...draft,
        directions: draft.directions.map((direction) =>
          direction.key === action.directionKey
            ? {
                ...direction,
                programs: [...direction.programs, emptyProgram(action.key)],
              }
            : direction,
        ),
      };

    case "remove-program":
      return {
        ...draft,
        directions: draft.directions.map((direction) => ({
          ...direction,
          programs: direction.programs.filter(
            (program) => program.key !== action.key,
          ),
        })),
      };

    case "set-program":
      return {
        ...draft,
        directions: mapPrograms(draft, (program) =>
          program.key === action.key
            ? // Продукт обязан входить в каталог программы — сбрасываем.
              { ...program, products: [], program: action.option }
            : program,
        ),
      };

    case "add-product":
      return {
        ...draft,
        directions: mapPrograms(draft, (program) =>
          program.key === action.programKey
            ? {
                ...program,
                products: [...program.products, emptyProduct(action.key)],
              }
            : program,
        ),
      };

    case "remove-product":
      return {
        ...draft,
        directions: mapPrograms(draft, (program) => ({
          ...program,
          products: program.products.filter(
            (product) => product.key !== action.key,
          ),
        })),
      };

    case "set-product":
      return {
        ...draft,
        directions: mapPrograms(draft, (program) => ({
          ...program,
          products: program.products.map((product) =>
            product.key === action.key
              ? { ...product, product: action.option }
              : product,
          ),
        })),
      };

    case "mark-created": {
      const { createdIds } = action;
      const created = (node: { createdId: string | null; key: string }) =>
        node.createdId ?? createdIds[node.key] ?? null;

      return {
        ...draft,
        createdInteractionId:
          action.interactionId ?? draft.createdInteractionId,
        assignedResponsibleIds: [
          ...new Set([
            ...draft.assignedResponsibleIds,
            ...action.assignedResponsibleIds,
          ]),
        ],
        directions: draft.directions.map((direction) => ({
          ...direction,
          createdId: created(direction),
          programs: direction.programs.map((program) => ({
            ...program,
            createdId: created(program),
            products: program.products.map((product) => ({
              ...product,
              createdId: created(product),
            })),
          })),
        })),
      };
    }
  }
}

function allPrograms(draft: InteractionDraft) {
  return draft.directions.flatMap((direction) => direction.programs);
}

export function selectedDirectionIds(draft: InteractionDraft) {
  return draft.directions
    .map((direction) => direction.direction?.id)
    .filter((id): id is string => id !== undefined);
}

export function selectedProgramIds(draft: InteractionDraft) {
  return allPrograms(draft)
    .map((program) => program.program?.id)
    .filter((id): id is string => id !== undefined);
}

/**
 * Все продукты дерева: на бэкенде уникальна пара (interaction, product) без
 * программы, поэтому один продукт нельзя привязать к двум программам одного
 * взаимодействия — выпадушка прячет уже выбранные по всему дереву.
 */
export function selectedProductIds(draft: InteractionDraft) {
  return allPrograms(draft)
    .flatMap((program) => program.products)
    .map((product) => product.product?.id)
    .filter((id): id is string => id !== undefined);
}

/** Ключи строк, которые добавили, но не заполнили. */
export function emptyNodeKeys(draft: InteractionDraft) {
  const keys: string[] = [];

  for (const direction of draft.directions) {
    if (!direction.direction) keys.push(direction.key);

    for (const program of direction.programs) {
      if (!program.program) keys.push(program.key);

      for (const product of program.products) {
        if (!product.product) keys.push(product.key);
      }
    }
  }

  return keys;
}

export function isDraftReady(draft: InteractionDraft) {
  return draft.counterparty !== null && emptyNodeKeys(draft).length === 0;
}

export type PlannedProduct = {
  key: string;
  productId: string;
};

export type PlannedProgram = {
  /** id уже созданного `InteractionProgram` — его получают продукты. */
  createdId: string | null;
  key: string;
  products: PlannedProduct[];
  /** `null` — программа уже создана, повторять запрос не нужно. */
  programId: string | null;
};

export type CreationPlan = {
  directions: { directionId: string; key: string }[];
  /** `null` — взаимодействие уже создано (повтор после частичного сбоя). */
  interaction: CreateInteractionPayload | null;
  interactionId: string | null;
  programs: PlannedProgram[];
  /** id менеджеров, которых осталось назначить; уже назначенные исключены. */
  responsibleIds: number[];
};

function interactionPayload(draft: InteractionDraft): CreateInteractionPayload {
  const counterpartyId = draft.counterparty?.id ?? null;

  return {
    comment: draft.comment.trim(),
    is_active: draft.isActive,
    ...(draft.counterpartyKind === "organization"
      ? { organization: counterpartyId }
      : { b2c_client: counterpartyId }),
  };
}

/**
 * Что осталось создать. Повторный вызов после частичного сбоя отдаёт только
 * несозданное — взаимодействие и уже принятые узлы не дублируются.
 */
export function buildCreationPlan(draft: InteractionDraft): CreationPlan {
  const programs: PlannedProgram[] = [];

  for (const program of allPrograms(draft)) {
    if (!program.program) continue;

    const products = program.products
      .filter((product) => product.product && product.createdId === null)
      .map((product) => ({
        key: product.key,
        productId: product.product!.id,
      }));

    // Созданную программу без новых продуктов трогать незачем.
    if (program.createdId !== null && products.length === 0) continue;

    programs.push({
      createdId: program.createdId,
      key: program.key,
      products,
      programId: program.createdId === null ? program.program.id : null,
    });
  }

  return {
    directions: draft.directions
      .filter(
        (direction) => direction.direction && direction.createdId === null,
      )
      .map((direction) => ({
        directionId: direction.direction!.id,
        key: direction.key,
      })),
    interaction:
      draft.createdInteractionId === null ? interactionPayload(draft) : null,
    interactionId: draft.createdInteractionId,
    programs,
    responsibleIds: draft.responsibles
      .filter((option) => !draft.assignedResponsibleIds.includes(option.id))
      .map((option) => Number(option.id)),
  };
}
