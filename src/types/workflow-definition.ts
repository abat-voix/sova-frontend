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

export type StageTransitionDefinition = {
  id: string;
  is_active: boolean;
  from_stage: { id: string; name: string; workflow: string };
  to_stage: { id: string; name: string; workflow: string };
};

export type WorkflowDefinition = {
  workflow: WorkflowTemplate;
  stages: WorkflowStageDefinition[];
  actions: WorkflowActionDefinition[];
  outcomes: unknown[];
  stage_transitions: StageTransitionDefinition[];
  action_transitions: unknown[];
  action_dependencies: unknown[];
};

export type WorkflowValidation = {
  valid: boolean;
  errors: { code: string; message: string }[];
};
