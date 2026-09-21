/**
 * Типы доски процесса и взаимодействий — по схемам `docs/SOVA API.yaml`.
 *
 * Статусы этапов и действий документированы как `pending | in_progress |
 * completed`, но в схеме это обычная строка (`type: string`). Поэтому храним
 * сырое значение и нормализуем при отображении: незнакомый статус с бэкенда
 * не должен ломать вёрстку.
 */

export type UserShort = {
  id: number;
  email?: string;
  full_name: string;
};

export type UniversityShort = {
  id: string;
  name: string;
};

export type B2CClientShort = {
  id: string;
  full_name: string;
  kind: string;
};

export type ResponsibleShort = {
  id: string;
  manager: UserShort;
  assigned_at: string;
};

export type InteractionShort = {
  id: string;
  university: UniversityShort | null;
  b2c_client: B2CClientShort | null;
};

export type Interaction = {
  id: string;
  comment?: string;
  is_active?: boolean;
  university: UniversityShort | null;
  b2c_client: B2CClientShort | null;
  created_at: string;
  updated_at: string;
  current_responsible: ResponsibleShort | null;
  directions_count: number;
  programs_count: number;
  products_count: number;
};

export type WorkflowShort = {
  id: string;
  name: string;
  code: string;
};

export type WorkflowInstance = {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  workflow: WorkflowShort;
  interaction: InteractionShort;
  created_by: UserShort | null;
};

/** Ссылка на этап или действие определения workflow. */
export type BoardRef = {
  id: string;
  name: string;
};

export type BoardOutcome = {
  id: string;
  code: string;
  name: string;
  comment_required: boolean;
  attachment_required: boolean;
};

export type BoardResult = {
  outcome_name: string;
  comment: string;
  created_at: string;
  created_by: UserShort | null;
};

/** Этап, на который можно вернуться при отмене этапа. */
export type BoardReturnOption = {
  id: string;
  stage_name: string;
};

export type BoardAction = {
  /** Идентификатор исполнения; по нему завершают действие. */
  id: string;
  action: BoardRef;
  /** Название на момент запуска процесса — приоритетнее названия в шаблоне. */
  name: string;
  status: string;
  is_optional: boolean;
  starts_by_transition_only: boolean;
  is_triggered: boolean;
  execution_no: number;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  is_overdue: boolean;
  responsible: UserShort | null;
  result: BoardResult | null;
  attachments_count: number;
  /** Пусто, если действие не в работе. */
  available_outcomes: BoardOutcome[];
};

export type BoardStage = {
  /** Идентификатор экземпляра этапа; по нему отменяют этап. */
  id: string;
  stage: BoardRef;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  /** Предшественники, если этап в работе; пусто, если отменять нельзя. */
  return_options: BoardReturnOption[];
  /** Последнее исполнение каждого действия этапа. */
  actions: BoardAction[];
};

export type BoardContextType = "it_direction" | "it_program" | "it_product";

export type BoardContextGroup = {
  context_type: BoardContextType | string;
  context_id: string;
  /** Название направления, программы или продукта. */
  title: string;
  parent_id: string | null;
  stages: BoardStage[];
};

export type WorkflowBoard = {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  workflow: WorkflowShort;
  interaction: InteractionShort;
  /** Этапы всего взаимодействия по порядку показа. */
  interaction_stages: BoardStage[];
  context_groups: BoardContextGroup[];
};

export type CompleteActionPayload = {
  outcome: string;
  comment?: string;
};

export type CompleteActionResult = {
  workflow_completed: boolean;
  activated_actions: unknown[];
  opened_stages: unknown[];
  completed_stages: unknown[];
};

export type CancelStageMode = "restart" | "last_only";

export type CancelStagePayload = {
  mode: CancelStageMode;
  reason: string;
  return_to?: string | null;
};
