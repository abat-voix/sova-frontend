import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskCard } from "@/components/tasks/task-card";
import { LocaleProvider } from "@/providers/locale-provider";
import { actionInstanceFixture as base } from "@/test/fixtures/action-instance";
import type { ActionInstance } from "@/types/action-instance";

function renderCard(
  action: ActionInstance,
  handlers: { onOpen?: () => void; onOutcome?: () => void } = {},
) {
  const onOpen = handlers.onOpen ?? vi.fn();
  const onOutcome = handlers.onOutcome ?? vi.fn();

  render(
    <LocaleProvider>
      <TaskCard
        action={action}
        onOpen={onOpen}
        onOutcome={onOutcome}
        showResponsible={false}
      />
    </LocaleProvider>,
  );

  return { onOpen, onOutcome };
}

afterEach(cleanup);

describe("TaskCard", () => {
  it("shows the action, the counterparty and the stage", () => {
    renderCard(base);

    expect(screen.getByText("Подписать договор")).toBeInTheDocument();
    expect(screen.getByText("МГУ")).toBeInTheDocument();
    expect(screen.getByText("Согласование и документы")).toBeInTheDocument();
  });

  it("reports the picked outcome instead of completing on its own", () => {
    const { onOpen, onOutcome } = renderCard(base);

    fireEvent.click(screen.getByRole("button", { name: "Выполнено" }));

    expect(onOutcome).toHaveBeenCalledWith(base.available_outcomes[0]);
    // Кнопка исхода лежит поверх подложки: открывать панель она не должна.
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("opens the details when the card itself is clicked", () => {
    const { onOpen } = renderCard(base);

    fireEvent.click(screen.getByRole("button", { name: "Подписать договор" }));

    expect(onOpen).toHaveBeenCalled();
  });

  it("marks an overdue action", () => {
    renderCard({ ...base, is_overdue: true });

    expect(screen.getByText("Просрочено")).toBeInTheDocument();
  });

  it("marks an action that has not been triggered yet", () => {
    renderCard({
      ...base,
      available_outcomes: [],
      is_trigger_only: true,
      is_triggered: false,
      status: "pending",
    });

    expect(screen.getByText("Ждёт перехода")).toBeInTheDocument();
  });

  it("shows the recorded outcome for a completed action", () => {
    renderCard({
      ...base,
      available_outcomes: [],
      result: {
        outcome_name: "Выполнено",
        comment: "Подписан 20 сентября",
        created_at: "2026-09-20T10:00:00+03:00",
        created_by: null,
      },
      status: "completed",
    });

    expect(screen.getByText("Подписан 20 сентября")).toBeInTheDocument();
  });
});
