import { describe, expect, it } from "vitest";

import {
  actualBarGeometry,
  buildGanttData,
  findBoardSelection,
  resolveActionState,
  type BoardTask,
} from "@/lib/workflow/board-to-gantt";
import type {
  BoardAction,
  BoardContextGroup,
  BoardStage,
  WorkflowBoard,
} from "@/types/workflow-board";

function makeAction(overrides: Partial<BoardAction> = {}): BoardAction {
  return {
    action: { id: "action-def", name: "Найти контакт" },
    actual_end: null,
    actual_start: null,
    attachments_count: 0,
    available_outcomes: [],
    execution_no: 1,
    id: "exec-1",
    is_optional: false,
    is_overdue: false,
    is_triggered: false,
    name: "Найти контакт",
    planned_end: null,
    planned_start: null,
    responsible: null,
    result: null,
    is_trigger_only: false,
    status: "pending",
    ...overrides,
  };
}

function makeStage(overrides: Partial<BoardStage> = {}): BoardStage {
  return {
    actions: [],
    completed_at: null,
    id: "stage-1",
    return_options: [],
    stage: { id: "stage-def", name: "Подготовка и контакт" },
    started_at: null,
    status: "pending",
    ...overrides,
  };
}

function makeBoard(overrides: Partial<WorkflowBoard> = {}): WorkflowBoard {
  return {
    completed_at: null,
    context_groups: [],
    id: "board-1",
    interaction: { b2c_client: null, id: "interaction-1", university: null },
    interaction_stages: [],
    started_at: "2026-09-07T09:00:00Z",
    status: "running",
    workflow: { code: "university", id: "wf-1", name: "Работа с вузом" },
    ...overrides,
  };
}

const now = new Date("2026-09-21T12:00:00Z");

describe("buildGanttData", () => {
  it("marks an action without any dates as unscheduled so the row stays visible", () => {
    const board = makeBoard({
      interaction_stages: [makeStage({ actions: [makeAction()] })],
    });

    const { data } = buildGanttData(board, now);
    const action = data.find((task) => task.id === "exec-1");

    expect(action?.unscheduled).toBe(true);
    expect(action?.start_date).toBeUndefined();
  });

  it("sizes a finished action by the plan and keeps the fact as a separate interval", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({
              actual_end: "2026-09-09T15:00:00Z",
              actual_start: "2026-09-07T09:00:00Z",
              planned_end: "2026-09-17T09:00:00Z",
              planned_start: "2026-09-07T09:00:00Z",
              status: "completed",
            }),
          ],
        }),
      ],
    });

    const { data } = buildGanttData(board, now);
    const action = data.find((task) => task.id === "exec-1");

    expect(action?.unscheduled).toBeUndefined();
    expect(action?.start_date).toEqual(new Date("2026-09-07T09:00:00Z"));
    expect(action?.end_date).toEqual(new Date("2026-09-17T09:00:00Z"));
    expect(action?.actual).toEqual({
      end: new Date("2026-09-09T15:00:00Z"),
      start: new Date("2026-09-07T09:00:00Z"),
    });
  });

  it("keeps the fact of an overdue action outside the planned bar", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({
              actual_end: "2026-09-20T18:00:00Z",
              actual_start: "2026-09-07T09:00:00Z",
              is_overdue: true,
              planned_end: "2026-09-10T09:00:00Z",
              planned_start: "2026-09-07T09:00:00Z",
              status: "completed",
            }),
          ],
        }),
      ],
    });

    const { data } = buildGanttData(board, now);
    const action = data.find((task) => task.id === "exec-1");

    expect(action?.end_date).toEqual(new Date("2026-09-10T09:00:00Z"));
    expect(action?.actual?.end).toEqual(new Date("2026-09-20T18:00:00Z"));
  });

  it("stretches the fact of an action in progress up to the current moment", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({
              actual_start: "2026-09-18T09:00:00Z",
              planned_end: "2026-10-05T09:00:00Z",
              planned_start: "2026-09-18T09:00:00Z",
              status: "in_progress",
            }),
          ],
        }),
      ],
    });

    const { data } = buildGanttData(board, now);
    const action = data.find((task) => task.id === "exec-1");

    expect(action?.end_date).toEqual(new Date("2026-10-05T09:00:00Z"));
    expect(action?.actual).toEqual({
      end: now,
      start: new Date("2026-09-18T09:00:00Z"),
    });
  });

  it("leaves an action that has not started without a fact interval", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({
              planned_end: "2026-10-05T09:00:00Z",
              planned_start: "2026-09-21T09:00:00Z",
            }),
          ],
        }),
      ],
    });

    const { data } = buildGanttData(board, now);

    expect(data.find((task) => task.id === "exec-1")?.actual).toBeUndefined();
  });

  it("draws the bar by the fact when the action has no plan at all", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({
              actual_end: "2026-09-09T15:00:00Z",
              actual_start: "2026-09-07T09:00:00Z",
              status: "completed",
            }),
          ],
        }),
      ],
    });

    const { data } = buildGanttData(board, now);
    const action = data.find((task) => task.id === "exec-1");

    expect(action?.start_date).toEqual(new Date("2026-09-07T09:00:00Z"));
    expect(action?.end_date).toEqual(new Date("2026-09-09T15:00:00Z"));
    expect(action?.actual?.end).toEqual(new Date("2026-09-09T15:00:00Z"));
  });

  it("closes an open-ended plan by the fact instead of the current moment", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({
              actual_end: "2026-09-09T15:00:00Z",
              actual_start: "2026-09-07T09:00:00Z",
              planned_start: "2026-09-07T09:00:00Z",
              status: "completed",
            }),
          ],
        }),
      ],
    });

    const { data } = buildGanttData(board, now);

    expect(data.find((task) => task.id === "exec-1")?.end_date).toEqual(
      new Date("2026-09-09T15:00:00Z"),
    );
  });

  it("does not fill the planned bar with progress — the fact bar shows it", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({
              actual_end: "2026-09-09T15:00:00Z",
              actual_start: "2026-09-07T09:00:00Z",
              planned_end: "2026-09-17T09:00:00Z",
              planned_start: "2026-09-07T09:00:00Z",
              status: "completed",
            }),
          ],
        }),
      ],
    });

    const { data } = buildGanttData(board, now);

    expect(data.find((task) => task.id === "exec-1")?.progress).toBe(0);
  });

  it("falls back to the planned interval when the action has not started", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({
              planned_end: "2026-10-05T09:00:00Z",
              planned_start: "2026-09-21T09:00:00Z",
            }),
          ],
        }),
      ],
    });

    const { data } = buildGanttData(board, now);
    const action = data.find((task) => task.id === "exec-1");

    expect(action?.start_date).toEqual(new Date("2026-09-21T09:00:00Z"));
    expect(action?.end_date).toEqual(new Date("2026-10-05T09:00:00Z"));
  });

  it("keeps the execution id on the action row so commands can address it", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({ actions: [makeAction({ id: "execution-42" })] }),
      ],
    });

    const { data } = buildGanttData(board, now);

    expect(data.some((task) => task.id === "execution-42")).toBe(true);
  });

  it("computes stage progress from the share of completed actions", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({ id: "a", status: "completed" }),
            makeAction({ id: "b", status: "completed" }),
            makeAction({ id: "c", status: "in_progress" }),
            makeAction({ id: "d", status: "pending" }),
          ],
        }),
      ],
    });

    const { data } = buildGanttData(board, now);
    const stage = data.find((task) => task.id === "stage:stage-1");

    expect(stage?.progress).toBe(0.5);
  });

  it("marks a stage unscheduled when none of its actions have dates", () => {
    const board = makeBoard({
      interaction_stages: [
        makeStage({ actions: [makeAction(), makeAction({ id: "exec-2" })] }),
      ],
    });

    const { data } = buildGanttData(board, now);
    const stage = data.find((task) => task.id === "stage:stage-1");

    expect(stage?.unscheduled).toBe(true);
  });

  it("nests a product group under the program group it belongs to", () => {
    const program: BoardContextGroup = {
      context_id: "program-1",
      context_type: "it_program",
      parent_id: null,
      stages: [makeStage({ id: "stage-program" })],
      title: "Программа ИБ",
    };
    const product: BoardContextGroup = {
      context_id: "product-1",
      context_type: "it_product",
      parent_id: "program-1",
      stages: [makeStage({ id: "stage-product" })],
      title: "Kubernetes",
    };

    const { data } = buildGanttData(
      makeBoard({ context_groups: [program, product] }),
      now,
    );

    const productGroup = data.find(
      (task) => task.id === "group:it_product:product-1",
    );
    const programGroup = data.find(
      (task) => task.id === "group:it_program:program-1",
    );

    expect(programGroup?.parent).toBeUndefined();
    expect(productGroup?.parent).toBe("group:it_program:program-1");
    expect(data.find((task) => task.id === "stage:stage-product")?.parent).toBe(
      "group:it_product:product-1",
    );
  });

  it("keeps a group at the top level when its parent is missing from the board", () => {
    const orphan: BoardContextGroup = {
      context_id: "product-9",
      context_type: "it_product",
      parent_id: "program-absent",
      stages: [makeStage({ id: "stage-orphan" })],
      title: "DataLens",
    };

    const { data } = buildGanttData(
      makeBoard({ context_groups: [orphan] }),
      now,
    );

    expect(
      data.find((task) => task.id === "group:it_product:product-9")?.parent,
    ).toBeUndefined();
  });

  it("puts interaction stages before context groups", () => {
    const board = makeBoard({
      context_groups: [
        {
          context_id: "product-1",
          context_type: "it_product",
          parent_id: null,
          stages: [makeStage({ id: "stage-ctx" })],
          title: "Kubernetes",
        },
      ],
      interaction_stages: [makeStage({ id: "stage-main" })],
    });

    const { data } = buildGanttData(board, now);
    const mainIndex = data.findIndex((task) => task.id === "stage:stage-main");
    const groupIndex = data.findIndex(
      (task) => task.id === "group:it_product:product-1",
    );

    expect(mainIndex).toBeLessThan(groupIndex);
  });
});

describe("actualBarGeometry", () => {
  function makeRow(overrides: Partial<BoardTask> = {}): BoardTask {
    return {
      end_date: new Date("2026-09-11T00:00:00Z"),
      id: "exec-1",
      rowKind: "action",
      start_date: new Date("2026-09-01T00:00:00Z"),
      state: "completed",
      text: "Провести встречу",
      ...overrides,
    };
  }

  it("measures the fact as a share of the planned bar", () => {
    const box = actualBarGeometry(
      makeRow({
        actual: {
          end: new Date("2026-09-06T00:00:00Z"),
          start: new Date("2026-09-03T00:00:00Z"),
        },
      }),
    );

    expect(box).toEqual({ left: 20, width: 30 });
  });

  it("lets an overdue fact run past the right edge of the plan", () => {
    const box = actualBarGeometry(
      makeRow({
        actual: {
          end: new Date("2026-09-16T00:00:00Z"),
          start: new Date("2026-09-01T00:00:00Z"),
        },
      }),
    );

    expect(box).toEqual({ left: 0, width: 150 });
  });

  it("clamps a fact that started before the plan to the left edge", () => {
    const box = actualBarGeometry(
      makeRow({
        actual: {
          end: new Date("2026-09-02T00:00:00Z"),
          start: new Date("2026-08-30T00:00:00Z"),
        },
      }),
    );

    expect(box?.left).toBe(0);
  });

  it("keeps a nearly instant fact measurable instead of negative", () => {
    const box = actualBarGeometry(
      makeRow({
        actual: {
          end: new Date("2026-09-03T00:10:00Z"),
          start: new Date("2026-09-03T00:00:00Z"),
        },
      }),
    );

    expect(box?.width).toBeGreaterThan(0);
    expect(box?.width).toBeLessThan(1);
  });

  it("has nothing to draw for an action that has not started", () => {
    expect(actualBarGeometry(makeRow())).toBeNull();
  });

  it("has nothing to draw for an unscheduled row", () => {
    expect(
      actualBarGeometry(
        makeRow({
          actual: {
            end: new Date("2026-09-06T00:00:00Z"),
            start: new Date("2026-09-03T00:00:00Z"),
          },
          end_date: undefined,
          start_date: undefined,
          unscheduled: true,
        }),
      ),
    ).toBeNull();
  });

  it("has nothing to draw when the plan collapses to a single moment", () => {
    expect(
      actualBarGeometry(
        makeRow({
          actual: {
            end: new Date("2026-09-01T00:00:00Z"),
            start: new Date("2026-09-01T00:00:00Z"),
          },
          end_date: new Date("2026-09-01T00:00:00Z"),
        }),
      ),
    ).toBeNull();
  });
});

describe("findBoardSelection", () => {
  const board = makeBoard({
    context_groups: [
      {
        context_id: "product-1",
        context_type: "it_product",
        parent_id: null,
        stages: [
          makeStage({
            actions: [makeAction({ id: "exec-in-group" })],
            id: "stage-ctx",
          }),
        ],
        title: "Kubernetes",
      },
    ],
    interaction_stages: [
      makeStage({
        actions: [makeAction({ id: "exec-main" })],
        id: "stage-main",
      }),
    ],
  });

  it("finds an action inside a context group", () => {
    const selection = findBoardSelection(board, {
      id: "exec-in-group",
      kind: "action",
    });

    expect(selection).toEqual({
      action: expect.objectContaining({ id: "exec-in-group" }),
      kind: "action",
    });
  });

  it("finds a stage of the interaction", () => {
    const selection = findBoardSelection(board, {
      id: "stage-main",
      kind: "stage",
    });

    expect(selection?.kind).toBe("stage");
  });

  it("returns null when the row disappeared from the refreshed board", () => {
    expect(
      findBoardSelection(board, { id: "gone", kind: "action" }),
    ).toBeNull();
  });

  it("re-resolves an action to the object from the current board", () => {
    const refreshed = makeBoard({
      interaction_stages: [
        makeStage({
          actions: [
            makeAction({
              id: "exec-main",
              result: {
                comment: "",
                created_at: "2026-09-21T10:00:00Z",
                created_by: null,
                outcome_name: "Согласовано",
              },
              status: "completed",
            }),
          ],
          id: "stage-main",
        }),
      ],
    });

    const selection = findBoardSelection(refreshed, {
      id: "exec-main",
      kind: "action",
    });

    expect(
      selection?.kind === "action"
        ? selection.action.result?.outcome_name
        : null,
    ).toBe("Согласовано");
  });
});

describe("resolveActionState", () => {
  it("reports a documented status as is", () => {
    expect(resolveActionState(makeAction({ status: "in_progress" }))).toBe(
      "in_progress",
    );
  });

  it("falls back to unknown instead of throwing on an unexpected status", () => {
    expect(resolveActionState(makeAction({ status: "ON_HOLD" }))).toBe(
      "unknown",
    );
  });

  it("reports an overdue action separately from its status", () => {
    expect(
      resolveActionState(
        makeAction({ is_overdue: true, status: "in_progress" }),
      ),
    ).toBe("overdue");
  });

  it("reports an action that waits for a transition", () => {
    expect(
      resolveActionState(
        makeAction({
          is_triggered: false,
          is_trigger_only: true,
          status: "pending",
        }),
      ),
    ).toBe("waiting_transition");
  });

  it("treats a triggered transition-only action as a normal pending one", () => {
    expect(
      resolveActionState(
        makeAction({
          is_triggered: true,
          is_trigger_only: true,
          status: "pending",
        }),
      ),
    ).toBe("pending");
  });

  it("accepts any object carrying the four state fields", () => {
    const actionInstanceShape = {
      is_overdue: false,
      is_trigger_only: true,
      is_triggered: false,
      status: "pending",
    };

    expect(resolveActionState(actionInstanceShape)).toBe("waiting_transition");
  });
});
