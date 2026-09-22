import type { ActionInstance } from "@/types/action-instance";

/** Действие в работе с одним исходом без требований. Основа для вариаций. */
export const actionInstanceFixture = {
  id: "act-1",
  action_name_snapshot: "Подписать договор",
  status: "in_progress",
  planned_start: null,
  planned_end: "2026-09-21T18:00:00+03:00",
  actual_start: null,
  actual_end: null,
  triggered_at: null,
  execution_no: 1,
  is_optional: false,
  is_trigger_only: false,
  is_triggered: true,
  is_overdue: false,
  attachments_count: 0,
  stage_instance: "st-1",
  stage_name_snapshot: "Согласование и документы",
  workflow_instance: "wf-1",
  interaction: {
    id: "in-1",
    university: { id: "u-1", name: "МГУ" },
    b2c_client: null,
  },
  action: { id: "def-1", name: "Подписать договор" },
  responsible: { id: 12, full_name: "Кам Камов" },
  result: null,
  available_outcomes: [
    {
      id: "out-1",
      code: "done",
      name: "Выполнено",
      is_comment_required: false,
      is_attachment_required: false,
    },
  ],
  available_features: [],
  feature_executions: [],
} satisfies ActionInstance;
