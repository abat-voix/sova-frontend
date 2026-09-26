export type WorkflowTemplate = {
  id: string;
  name: string;
  code: string;
  audience: "b2b" | "b2c";
  description: string;
  stale_threshold_days: number | null;
  is_base: boolean;
  is_active: boolean;
  created_by: { id: number; full_name: string } | null;
  created_at: string;
  updated_at: string;
  stages_count: number;
};

export type WorkflowStageDefinition = {
  id: string;
  name: string;
  type: "interaction" | "direction" | "program" | "product";
  description: string;
  sort_order: number;
  is_initial: boolean;
  is_final: boolean;
  is_optional: boolean;
  is_active: boolean;
  /** Позиция узла на графе редактора. Пусто — позиция ещё не задана вручную. */
  position_x: number | null;
  position_y: number | null;
  /** Размер блока на графе редактора. Пусто — используется размер по умолчанию. */
  width: number | null;
  height: number | null;
  workflow: { id: string; name: string; code: string };
};

export type WorkflowActionDefinition = {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  default_duration_days: number | null;
  is_optional: boolean;
  is_trigger_only: boolean;
  is_active: boolean;
  stage: { id: string; name: string; workflow: string };
};

export type ActionOutcomeDefinition = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  is_comment_required: boolean;
  is_attachment_required: boolean;
  action: { id: string; name: string };
};

export type ActionFeatureDefinition = {
  id: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  settings: Record<string, unknown>;
  action: { id: string; name: string };
};

export type StageTransitionDefinition = {
  id: string;
  is_active: boolean;
  from_stage: { id: string; name: string; workflow: string };
  to_stage: { id: string; name: string; workflow: string };
};

export type ActionTransitionDefinition = {
  id: string;
  is_active: boolean;
  outcome: { id: string; code: string; name: string };
  target_action: { id: string; name: string };
};

export type ActionDependencyDefinition = {
  id: string;
  is_active: boolean;
  action: { id: string; name: string };
  depends_on_action: { id: string; name: string };
};

export type WorkflowDefinition = {
  workflow: WorkflowTemplate;
  stages: WorkflowStageDefinition[];
  actions: WorkflowActionDefinition[];
  features: ActionFeatureDefinition[];
  outcomes: ActionOutcomeDefinition[];
  stage_transitions: StageTransitionDefinition[];
  action_transitions: ActionTransitionDefinition[];
  action_dependencies: ActionDependencyDefinition[];
};

export type WorkflowValidation = {
  valid: boolean;
  errors: { code: string; message: string }[];
};
