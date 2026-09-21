/**
 * Типы доски процесса и взаимодействий — по схемам `docs/SOVA API.yaml`.
 *
 * Статусы этапов и действий документированы как `pending | in_progress |
 * completed`, но в схеме это обычная строка (`type: string`). Поэтому храним
 * сырое значение и нормализуем при отображении: незнакомый статус с бэкенда
 * не должен ломать вёрстку.
 */

/**
 * `InteractionProductShort` — краткое представление продукта взаимодействия
 * для вложенного использования (например, в `License`).
 */
export type InteractionProductShort = {
  id: string;
  interaction: string;
  product: ProductShort;
};

/** `ProductShort` — краткое представление продукта каталога. */
export type ProductShort = {
  id: string;
  name: string;
};

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

/** `WriteInteraction`: контрагент ровно один — вуз либо B2C-клиент. */
export type CreateInteractionPayload = {
  comment?: string;
  is_active?: boolean;
  university?: string | null;
  b2c_client?: string | null;
};

/** `WriteInteractionDirection`. */
export type CreateInteractionDirectionPayload = {
  interaction: string;
  direction: string;
};

/** `WriteInteractionProgram`. Направление не дублируется: оно выводится
 * из `program.direction` каталога. */
export type CreateInteractionProgramPayload = {
  interaction: string;
  program: string;
};

/** `WriteInteractionProduct`. */
export type CreateInteractionProductPayload = {
  interaction: string;
  product: string;
  interaction_program?: string | null;
};

/** Развёрнутая ссылка на объект каталога в ответах взаимодействия. */
export type NamedRef = {
  id: string;
  name: string;
};

/** Ответ `assign-responsible`: `Responsible` из схемы. */
export type InteractionResponsible = {
  id: string;
  interaction: string;
  manager: UserShort;
  assigned_by: UserShort | null;
  assigned_at: string;
  unassigned_at: string | null;
};

export type InteractionDirection = {
  id: string;
  interaction: string;
  direction: NamedRef;
  is_active: boolean;
  added_at: string;
};

export type InteractionProgram = {
  id: string;
  interaction: string;
  program: NamedRef;
  is_active: boolean;
  added_at: string;
};

export type InteractionProduct = {
  id: string;
  interaction: string;
  interaction_program: string | null;
  product: NamedRef;
  is_active: boolean;
  added_at: string;
};

export type WorkflowShort = {
  id: string;
  name: string;
  code: string;
};

/** Аудитория шаблона: вузы или физ/юрлица. Должна совпасть с контрагентом. */
export type WorkflowAudience = "b2b" | "b2c";

export type Workflow = {
  id: string;
  name: string;
  code: string;
  audience: WorkflowAudience;
  description: string;
  is_base: boolean;
  active: boolean;
  stages_count: number;
};

/** `WriteWorkflowInstance`: остальные поля движок задаёт сам. */
export type StartWorkflowInstancePayload = {
  workflow: string;
  interaction: string;
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

// workflow-board.ts (добавить)

/**
 * Статусы экземпляров этапов и действий.
 *
 * В OpenAPI описаны как enum, но в схеме — обычная строка. Храним как
 * union, чтобы незнакомое значение с бэкенда не ломало типы, но при этом
 * давало автодополнение для известных.
 */
export type ActionInstanceStatus = "pending" | "in_progress" | "completed";
export type StageInstanceStatus = "pending" | "in_progress" | "completed";

/** Тип контекста этапа: к чему относится этап. */
export type StageInstanceContextType =
  "interaction" | "direction" | "program" | "product";

/**
 * `ActionOutcomeShort` — краткое представление исхода действия
 * для вложенного использования (в `ActionResult`).
 */
export type ActionOutcomeShort = {
  id: string;
  code: string;
  name: string;
};

/**
 * `ActionResult` — результат действия для чтения (list/retrieve).
 *
 * Пишется движком при завершении действия (`complete`); записи не
 * редактируются и не удаляются.
 */
export type ActionResult = {
  id: string;
  action_instance: string;
  outcome: ActionOutcomeShort;
  /** Название исхода на момент фиксации результата. */
  outcome_name_snapshot: string;
  comment?: string;
  created_at: string;
  /** Пользователь, зафиксировавший результат; null, если он удалён. */
  created_by: UserShort | null;
};

/**
 * `WorkflowActionShort` — краткое представление действия workflow.
 */
export type WorkflowActionShort = {
  id: string;
  name: string;
};

/**
 * `WorkflowStageShort` — краткое представление этапа workflow.
 */
export type WorkflowStageShort = {
  id: string;
  name: string;
  workflow: string;
};

/**
 * `AudienceEnum` — аудитория шаблона workflow.
 *
 * Уже есть как `WorkflowAudience`, но для симметрии с OpenAPI заведу алиас.
 */
export type Audience = WorkflowAudience;

/**
 * `WorkflowChange` — запись журнала изменений структуры workflow.
 */
export type WorkflowChange = {
  id: string;
  change_type: string;
  entity_type: string;
  entity_id: string;
  workflow: string;
  created_by: UserShort | null;
  created_at: string;
};
