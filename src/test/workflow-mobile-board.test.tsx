import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkflowMobileBoard } from "@/components/interactions/workflow-mobile-board";
import type { BoardSelection } from "@/lib/workflow/board-to-gantt";
import { LocaleProvider } from "@/providers/locale-provider";
import type { WorkflowBoard } from "@/types/workflow-board";

const board: WorkflowBoard = {
  id: "board-1",
  status: "in_progress",
  started_at: "2026-09-01T09:00:00+03:00",
  completed_at: null,
  workflow: { id: "workflow-1", name: "Процесс", code: "process" },
  interaction: { id: "interaction-1", organization: null, b2c_client: null },
  interaction_stages: [
    {
      id: "stage-1",
      stage: { id: "stage-definition-1", name: "Переговоры" },
      status: "in_progress",
      started_at: "2026-09-01T09:00:00+03:00",
      completed_at: null,
      return_options: [],
      actions: [
        {
          id: "action-1",
          action: { id: "action-definition-1", name: "Согласовать договор" },
          name: "Согласовать договор",
          status: "in_progress",
          is_optional: false,
          is_trigger_only: false,
          is_triggered: true,
          execution_no: 1,
          planned_start: "2026-09-10T09:00:00+03:00",
          planned_end: "2026-09-12T18:00:00+03:00",
          actual_start: null,
          actual_end: null,
          is_overdue: false,
          responsible: null,
          result: null,
          attachments_count: 0,
          available_outcomes: [],
          available_features: [],
          feature_executions: [],
        },
      ],
    },
  ],
  context_groups: [
    {
      context_type: "it_program",
      context_id: "program-1",
      title: "Цифровая кафедра",
      parent_id: null,
      stages: [],
    },
  ],
};

function renderBoard(onSelect = vi.fn()) {
  return {
    onSelect,
    ...render(
      <LocaleProvider>
        <WorkflowMobileBoard board={board} onSelect={onSelect} />
      </LocaleProvider>,
    ),
  };
}

describe("WorkflowMobileBoard", () => {
  it("renders active stages and context group headings", () => {
    renderBoard();

    expect(screen.getByText("Переговоры")).toBeInTheDocument();
    expect(screen.getByText("Цифровая кафедра")).toBeInTheDocument();
    expect(screen.getByText("Согласовать договор")).toBeInTheDocument();
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("collapses a stage and selects an action", () => {
    const onSelect = vi.fn<(selection: BoardSelection) => void>();
    renderBoard(onSelect);

    const stageButton = screen.getByTestId("mobile-stage-toggle-stage-1");

    fireEvent.click(stageButton);
    expect(screen.queryByText("Согласовать договор")).not.toBeInTheDocument();

    fireEvent.click(stageButton);
    fireEvent.click(
      screen.getByRole("button", { name: /^Согласовать договор/ }),
    );

    expect(onSelect).toHaveBeenCalledWith({
      kind: "action",
      action: board.interaction_stages[0].actions[0],
    });
  });
});
