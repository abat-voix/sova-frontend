import { describe, expect, it } from "vitest";

import {
  buildCreationPlan,
  draftReducer,
  draftWithResponsible,
  emptyDraft,
  isDraftReady,
  selectedProductIds,
  type DraftAction,
  type InteractionDraft,
} from "@/components/interactions/new-interaction-plan";

const option = (id: string, name: string) => ({ id, name });

function reduce(draft: InteractionDraft, ...actions: DraftAction[]) {
  return actions.reduce(draftReducer, draft);
}

/** Вуз + направление «Д» с программой «П1» (продукты «Т1», «Т2») и «П2». */
function filledDraft() {
  return reduce(
    emptyDraft,
    { option: option("u-1", "Демо-университет"), type: "set-counterparty" },
    { comment: "  Пилот  ", type: "set-comment" },
    { key: "d1", type: "add-direction" },
    { key: "d1", option: option("dir-1", "Д"), type: "set-direction" },
    { directionKey: "d1", key: "p1", type: "add-program" },
    { key: "p1", option: option("prog-1", "П1"), type: "set-program" },
    { key: "t1", programKey: "p1", type: "add-product" },
    { key: "t1", option: option("prod-1", "Т1"), type: "set-product" },
    { key: "t2", programKey: "p1", type: "add-product" },
    { key: "t2", option: option("prod-2", "Т2"), type: "set-product" },
    { directionKey: "d1", key: "p2", type: "add-program" },
    { key: "p2", option: option("prog-2", "П2"), type: "set-program" },
  );
}

describe("buildCreationPlan", () => {
  it("plans the interaction, its directions, and programs with their products", () => {
    const plan = buildCreationPlan(filledDraft());

    expect(plan.interaction).toEqual({
      comment: "Пилот",
      is_active: true,
      organization: "u-1",
    });
    expect(plan.interactionId).toBeNull();
    expect(plan.directions).toEqual([{ directionId: "dir-1", key: "d1" }]);
    expect(plan.programs).toEqual([
      {
        createdId: null,
        key: "p1",
        products: [
          { key: "t1", productId: "prod-1" },
          { key: "t2", productId: "prod-2" },
        ],
        programId: "prog-1",
      },
      { createdId: null, key: "p2", products: [], programId: "prog-2" },
    ]);
  });

  it("turns the chosen responsibles into numeric manager ids", () => {
    const draft = reduce(filledDraft(), {
      options: [option("7", "Ольга Филинова"), option("9", "Иван Петров")],
      type: "set-responsibles",
    });

    expect(buildCreationPlan(draft).responsibleIds).toEqual([7, 9]);
  });

  it("does not assign a responsible twice", () => {
    const draft = reduce(
      filledDraft(),
      {
        options: [option("7", "Ольга Филинова"), option("9", "Иван Петров")],
        type: "set-responsibles",
      },
      {
        assignedResponsibleIds: ["7"],
        createdIds: {},
        interactionId: "id-interaction",
        type: "mark-created",
      },
    );

    expect(buildCreationPlan(draft).responsibleIds).toEqual([9]);
  });

  it("plans no assignment when nobody is chosen", () => {
    expect(buildCreationPlan(filledDraft()).responsibleIds).toEqual([]);
  });

  it("sends b2c_client instead of organization for a B2C counterparty", () => {
    const draft = reduce(
      emptyDraft,
      { kind: "b2c_client", type: "set-counterparty-kind" },
      { option: option("c-1", "Иванов И. И."), type: "set-counterparty" },
    );

    expect(buildCreationPlan(draft).interaction).toEqual({
      b2c_client: "c-1",
      comment: "",
      is_active: true,
    });
  });

  it("omits everything already created so a retry only sends what is missing", () => {
    const draft = reduce(filledDraft(), {
      assignedResponsibleIds: [],
      createdIds: { d1: "id-d1", p1: "id-p1", t1: "id-t1" },
      interactionId: "id-interaction",
      type: "mark-created",
    });

    const plan = buildCreationPlan(draft);

    expect(plan.interaction).toBeNull();
    expect(plan.interactionId).toBe("id-interaction");
    expect(plan.directions).toEqual([]);
    // Программа «П1» создана, но её продукт «Т2» — нет: программу не
    // пересоздаём, а её id нужен продукту.
    expect(plan.programs).toEqual([
      {
        createdId: "id-p1",
        key: "p1",
        products: [{ key: "t2", productId: "prod-2" }],
        programId: null,
      },
      { createdId: null, key: "p2", products: [], programId: "prog-2" },
    ]);
  });

  it("skips a program whose products are all created", () => {
    const draft = reduce(filledDraft(), {
      assignedResponsibleIds: [],
      createdIds: { p1: "id-p1", t1: "id-t1", t2: "id-t2" },
      interactionId: "id-interaction",
      type: "mark-created",
    });

    expect(buildCreationPlan(draft).programs).toEqual([
      { createdId: null, key: "p2", products: [], programId: "prog-2" },
    ]);
  });
});

describe("selectedProductIds", () => {
  it("collects products across the whole tree, not just one branch", () => {
    const draft = reduce(
      filledDraft(),
      { key: "t3", programKey: "p2", type: "add-product" },
      { key: "t3", option: option("prod-3", "Т3"), type: "set-product" },
    );

    // (interaction, product) уникальна на бэкенде, поэтому исключать надо всё
    // дерево, а не текущую ветку.
    expect(selectedProductIds(draft)).toEqual(["prod-1", "prod-2", "prod-3"]);
  });
});

describe("draftReducer", () => {
  it("drops the programs and products of a removed direction", () => {
    const draft = reduce(filledDraft(), {
      key: "d1",
      type: "remove-direction",
    });

    expect(draft.directions).toEqual([]);
    expect(selectedProductIds(draft)).toEqual([]);
  });

  it("clears the chosen counterparty when the kind changes", () => {
    const draft = reduce(filledDraft(), {
      kind: "b2c_client",
      type: "set-counterparty-kind",
    });

    expect(draft.counterparty).toBeNull();
    expect(draft.counterpartyKind).toBe("b2c_client");
  });

  it("clears the programs of a direction when the direction changes", () => {
    const draft = reduce(filledDraft(), {
      key: "d1",
      option: option("dir-2", "Другое"),
      type: "set-direction",
    });

    // Программа каталога принадлежит своему направлению — прежний выбор
    // перестаёт быть допустимым.
    expect(draft.directions[0].programs).toEqual([]);
  });

  it("clears the products of a program when the program changes", () => {
    const draft = reduce(filledDraft(), {
      key: "p1",
      option: option("prog-9", "Другая"),
      type: "set-program",
    });

    expect(draft.directions[0].programs[0].products).toEqual([]);
  });
});

describe("draftWithResponsible", () => {
  it("opens the form with the responsible already filled in", () => {
    const draft = draftWithResponsible(option("7", "Ольга Филинова"));

    expect(draft.responsibles).toEqual([option("7", "Ольга Филинова")]);
    expect(draft.assignedResponsibleIds).toEqual([]);
  });
});

describe("isDraftReady", () => {
  it("requires a counterparty", () => {
    expect(isDraftReady(emptyDraft)).toBe(false);
  });

  it("does not require a responsible", () => {
    expect(buildCreationPlan(filledDraft()).responsibleIds).toEqual([]);
    expect(isDraftReady(filledDraft())).toBe(true);
  });

  it("requires every added row to be filled in", () => {
    const draft = reduce(filledDraft(), {
      directionKey: "d1",
      key: "p3",
      type: "add-program",
    });

    expect(isDraftReady(draft)).toBe(false);
    expect(isDraftReady(filledDraft())).toBe(true);
  });
});

describe("registry contract", () => {
  const contract = option("contract-1", "Д-1");
  const organization = option("u-2", "Университет из договора");

  it("takes the counterparty from the contract and drops the catalog tree", () => {
    const draft = reduce(filledDraft(), {
      counterparty: organization,
      option: contract,
      type: "set-contract",
    });

    expect(draft.counterparty).toEqual(organization);
    expect(draft.directions).toEqual([]);
    expect(isDraftReady(draft)).toBe(true);

    const plan = buildCreationPlan(draft);
    expect(plan.contractId).toBe("contract-1");
    expect(plan.directions).toEqual([]);
    expect(plan.programs).toEqual([]);
  });

  it("keeps the counterparty when the contract is cleared", () => {
    const draft = reduce(
      emptyDraft,
      { counterparty: organization, option: contract, type: "set-contract" },
      { counterparty: null, option: null, type: "set-contract" },
    );

    expect(draft.contract).toBeNull();
    expect(draft.counterparty).toEqual(organization);
    expect(buildCreationPlan(draft).contractId).toBeNull();
  });

  it("drops the contract when the counterparty kind changes", () => {
    const draft = reduce(
      emptyDraft,
      { counterparty: organization, option: contract, type: "set-contract" },
      { kind: "b2c_client", type: "set-counterparty-kind" },
    );

    expect(draft.contract).toBeNull();
    expect(draft.counterparty).toBeNull();
  });
});
