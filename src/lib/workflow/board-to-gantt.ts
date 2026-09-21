/**
 * Превращает доску процесса в данные для Gantt.
 *
 * Здесь нет бизнес-логики движка: порядок строк задаёт бэкенд (массивы доски
 * приходят «по порядку показа»), статусы только переводятся в состояния для
 * отображения. Модуль чистый и не знает ни про DOM, ни про dhtmlx-рантайм —
 * поэтому проверяется тестами без браузера.
 */

import type { Link, Task } from "dhtmlx-gantt";

import type {
  BoardAction,
  BoardContextGroup,
  BoardStage,
  WorkflowBoard,
} from "@/types/workflow-board";

export type ActionState =
  | "completed"
  | "in_progress"
  | "pending"
  | "overdue"
  | "waiting_transition"
  | "unknown";

export type StageState = "completed" | "in_progress" | "pending" | "unknown";

export type BoardRowKind = "group" | "stage" | "action";

export type BoardTask = Task & {
  rowKind: BoardRowKind;
  /** Состояние для подписи и цвета строки. */
  state: ActionState | StageState;
  /** Исходные данные действия — их показывает панель деталей. */
  boardAction?: BoardAction;
  /** Этап, к которому относится строка; по нему отменяют этап. */
  boardStage?: BoardStage;
};

export type BoardGanttData = {
  data: BoardTask[];
  links: Link[];
};

/** Что выбрано на диаграмме: панель деталей показывает либо то, либо другое. */
export type BoardSelection =
  | { kind: "action"; action: BoardAction }
  | { kind: "stage"; stage: BoardStage };

/** Все этапы доски: и общие по взаимодействию, и внутри контекстных групп. */
function allStages(board: WorkflowBoard): BoardStage[] {
  return [
    ...board.interaction_stages,
    ...board.context_groups.flatMap((group) => group.stages),
  ];
}

/**
 * Находит выбранную строку в свежей доске.
 *
 * Выбор хранится идентификатором, а не объектом: после команды доска
 * перезапрашивается, и объект из прошлого ответа уже устарел — у действия могли
 * появиться результат и другие доступные исходы.
 */
export function findBoardSelection(
  board: WorkflowBoard,
  row: { kind: BoardSelection["kind"]; id: string } | null,
): BoardSelection | null {
  if (!row) return null;

  if (row.kind === "stage") {
    const stage = allStages(board).find((candidate) => candidate.id === row.id);

    return stage ? { kind: "stage", stage } : null;
  }

  for (const stage of allStages(board)) {
    const action = stage.actions.find((candidate) => candidate.id === row.id);
    if (action) return { action, kind: "action" };
  }

  return null;
}

function normalizeStatus(status: string): StageState {
  if (
    status === "completed" ||
    status === "in_progress" ||
    status === "pending"
  )
    return status;

  return "unknown";
}

/**
 * Состояние действия для отображения.
 *
 * `overdue` и `waiting_transition` — не статусы бэкенда, а признаки поверх них:
 * просрочку считает бэкенд (`is_overdue`), а ожидание перехода выражено парой
 * `starts_by_transition_only` + `is_triggered`. Своего `BLOCKED` не вычисляем.
 */
export function resolveActionState(action: BoardAction): ActionState {
  if (action.is_overdue) return "overdue";
  if (action.starts_by_transition_only && !action.is_triggered)
    return "waiting_transition";

  return normalizeStatus(action.status);
}

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

type Interval = { start: Date; end: Date } | null;

/**
 * Интервал для полосы действия.
 *
 * Факт приоритетнее плана: план у доски привязан к моменту запуска
 * (`planned_end = planned_start + длительность`), поэтому у действия, которое
 * ещё не запускали, дат нет вовсе — такая строка уходит в `unscheduled`.
 */
function resolveInterval(action: BoardAction, now: Date): Interval {
  const actualStart = toDate(action.actual_start);
  const actualEnd = toDate(action.actual_end);
  const plannedStart = toDate(action.planned_start);
  const plannedEnd = toDate(action.planned_end);

  if (actualStart) {
    return { end: actualEnd ?? plannedEnd ?? now, start: actualStart };
  }

  if (plannedStart) {
    return { end: plannedEnd ?? now, start: plannedStart };
  }

  return null;
}

function buildActionRow(
  action: BoardAction,
  parent: string,
  now: Date,
): BoardTask {
  const state = resolveActionState(action);
  const interval = resolveInterval(action, now);
  const row: BoardTask = {
    boardAction: action,
    id: action.id,
    parent,
    progress: action.status === "completed" ? 1 : 0,
    rowKind: "action",
    state,
    text: action.name,
  };

  if (!interval) {
    row.unscheduled = true;

    return row;
  }

  row.start_date = interval.start;
  row.end_date =
    interval.end > interval.start ? interval.end : new Date(interval.start);

  return row;
}

function stageProgress(actions: BoardAction[]) {
  if (actions.length === 0) return 0;

  const completed = actions.filter(
    (action) => action.status === "completed",
  ).length;

  return completed / actions.length;
}

function buildStageRows(
  stage: BoardStage,
  parent: string | undefined,
  now: Date,
): BoardTask[] {
  const rowId = `stage:${stage.id}`;
  const actionRows = stage.actions.map((action) =>
    buildActionRow(action, rowId, now),
  );
  const stageRow: BoardTask = {
    boardStage: stage,
    id: rowId,
    open: true,
    progress: stageProgress(stage.actions),
    rowKind: "stage",
    state: normalizeStatus(stage.status),
    text: stage.stage.name,
    type: "project",
  };

  if (parent) stageRow.parent = parent;
  if (actionRows.every((row) => row.unscheduled)) stageRow.unscheduled = true;

  return [stageRow, ...actionRows];
}

function groupRowId(group: BoardContextGroup) {
  return `group:${group.context_type}:${group.context_id}`;
}

function buildGroupRows(
  group: BoardContextGroup,
  parent: string | undefined,
  now: Date,
): BoardTask[] {
  const rowId = groupRowId(group);
  const stageRows = group.stages.flatMap((stage) =>
    buildStageRows(stage, rowId, now),
  );
  const groupRow: BoardTask = {
    id: rowId,
    open: true,
    rowKind: "group",
    state: "unknown",
    text: group.title,
    type: "project",
  };

  if (parent) groupRow.parent = parent;
  if (stageRows.every((row) => row.unscheduled)) groupRow.unscheduled = true;

  return [groupRow, ...stageRows];
}

/**
 * Собирает строки доски: сначала этапы всего взаимодействия, затем группы
 * направлений, программ и продуктов. Продукт вкладывается в свою программу,
 * если она пришла в том же ответе.
 */
export function buildGanttData(
  board: WorkflowBoard,
  now: Date = new Date(),
): BoardGanttData {
  const data = board.interaction_stages.flatMap((stage) =>
    buildStageRows(stage, undefined, now),
  );

  const groupsById = new Map(
    board.context_groups.map((group) => [group.context_id, group]),
  );
  const parentOf = (group: BoardContextGroup) => {
    if (!group.parent_id) return undefined;
    const parent = groupsById.get(group.parent_id);

    return parent ? groupRowId(parent) : undefined;
  };

  // Родителя добавляем раньше ребёнка: Gantt строит дерево по ссылке parent.
  const roots = board.context_groups.filter((group) => !parentOf(group));
  const nested = board.context_groups.filter((group) => parentOf(group));

  for (const group of [...roots, ...nested]) {
    data.push(...buildGroupRows(group, parentOf(group), now));
  }

  return { data, links: [] };
}
