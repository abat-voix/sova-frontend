import { describe, expect, it } from "vitest";

import { actionInstanceToBoardAction } from "@/lib/workflow/action-instance-to-board";
import { actionInstanceFixture as base } from "@/test/fixtures/action-instance";

describe("actionInstanceToBoardAction", () => {
  it("takes the board name from the snapshot", () => {
    expect(actionInstanceToBoardAction(base).name).toBe("Подписать договор");
  });

  it("carries every field the board panel reads", () => {
    const boardAction = actionInstanceToBoardAction(base);

    expect(boardAction).toEqual({
      id: "act-1",
      action: { id: "def-1", name: "Подписать договор" },
      name: "Подписать договор",
      status: "in_progress",
      is_optional: false,
      is_trigger_only: false,
      is_triggered: true,
      execution_no: 1,
      planned_start: null,
      planned_end: "2026-09-21T18:00:00+03:00",
      actual_start: null,
      actual_end: null,
      is_overdue: false,
      responsible: { id: 12, full_name: "Кам Камов" },
      result: null,
      attachments_count: 0,
      available_outcomes: base.available_outcomes,
      available_features: base.available_features,
      feature_executions: base.feature_executions,
      interaction: base.interaction,
    });
  });

  it("keeps a recorded result as it is", () => {
    const result = {
      outcome_name: "Выполнено",
      comment: "Подписан 20 сентября",
      created_at: "2026-09-20T10:00:00+03:00",
      created_by: null,
    };

    expect(
      actionInstanceToBoardAction({ ...base, result, status: "completed" })
        .result,
    ).toEqual(result);
  });
});
