import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkflowInspector } from "@/components/workflows/workflow-inspector";
import { LocaleProvider } from "@/providers/locale-provider";
import type { WorkflowDefinition } from "@/types/workflow-definition";

const definition: WorkflowDefinition = {
  workflow: {
    audience: "b2b",
    code: "onboarding",
    created_at: "2026-01-01T00:00:00Z",
    created_by: { full_name: "Руководитель", id: 7 },
    description: "",
    id: "workflow-1",
    is_active: false,
    is_base: false,
    name: "Онбординг",
    stages_count: 1,
    stale_threshold_days: null,
    updated_at: "2026-01-01T00:00:00Z",
  },
  stages: [
    {
      description: "",
      height: null,
      id: "stage-1",
      is_active: true,
      is_final: true,
      is_initial: true,
      is_optional: false,
      name: "Контакт",
      position_x: null,
      position_y: null,
      sort_order: 1,
      type: "interaction",
      width: null,
      workflow: { code: "onboarding", id: "workflow-1", name: "Онбординг" },
    },
  ],
  actions: [
    {
      default_duration_days: 2,
      description: "",
      id: "action-1",
      is_active: true,
      is_optional: false,
      is_trigger_only: false,
      name: "Позвонить",
      sort_order: 1,
      stage: { id: "stage-1", name: "Контакт", workflow: "workflow-1" },
    },
    {
      default_duration_days: null,
      description: "",
      id: "action-2",
      is_active: true,
      is_optional: false,
      is_trigger_only: true,
      name: "Отправить письмо",
      sort_order: 2,
      stage: { id: "stage-1", name: "Контакт", workflow: "workflow-1" },
    },
  ],
  outcomes: [
    {
      action: { id: "action-1", name: "Позвонить" },
      code: "done",
      id: "outcome-1",
      is_active: true,
      is_attachment_required: false,
      is_comment_required: false,
      name: "Выполнено",
    },
  ],
  features: [],
  action_dependencies: [],
  action_transitions: [],
  stage_transitions: [],
};

describe("WorkflowInspector", () => {
  it("creates outcomes, dependencies, transitions and features for an action", async () => {
    const onCommand = vi.fn().mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <WorkflowInspector
            canEdit
            definition={definition}
            isPending={false}
            onCommand={onCommand}
            onSelectionChange={vi.fn()}
            selection={{ id: "action-1", kind: "action" }}
          />
        </LocaleProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Исходы")).toBeInTheDocument();
    expect(screen.getByText("Зависимости")).toBeInTheDocument();
    expect(screen.getByText("Возможности")).toBeInTheDocument();
    expect(screen.getByTestId("workflow-inspector")).toHaveClass(
      "max-h-[36rem]",
      "overflow-y-auto",
    );

    fireEvent.change(screen.getByLabelText("Код нового исхода"), {
      target: { value: "rejected" },
    });
    fireEvent.change(screen.getByLabelText("Название нового исхода"), {
      target: { value: "Отказ" },
    });
    fireEvent.click(screen.getByLabelText("Добавить исход"));

    fireEvent.click(
      screen.getByRole("combobox", { name: "Зависит от действия" }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "Отправить письмо" }),
    );
    fireEvent.click(screen.getByLabelText("Добавить зависимость"));

    fireEvent.click(
      screen.getByRole("combobox", { name: "Переход после «Выполнено»" }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "Отправить письмо" }),
    );
    fireEvent.click(screen.getByLabelText("Добавить возможность"));

    await waitFor(() => expect(onCommand).toHaveBeenCalledTimes(4));
    expect(onCommand).toHaveBeenCalledWith({
      body: { action: "action-1", code: "rejected", name: "Отказ" },
      method: "post",
      url: "/api/workflows/action-outcomes/",
    });
    expect(onCommand).toHaveBeenCalledWith({
      body: {
        action: "action-1",
        depends_on_action: "action-2",
        is_active: true,
      },
      method: "post",
      url: "/api/workflows/action-dependencies/",
    });
    expect(onCommand).toHaveBeenCalledWith({
      body: {
        is_active: true,
        outcome: "outcome-1",
        target_action: "action-2",
      },
      method: "post",
      url: "/api/workflows/action-transitions/",
    });
    expect(onCommand).toHaveBeenCalledWith({
      body: {
        action: "action-1",
        code: "contact_person.create",
        settings: {},
        sort_order: 1,
      },
      method: "post",
      url: "/api/workflows/action-features/",
    });
  });
});
