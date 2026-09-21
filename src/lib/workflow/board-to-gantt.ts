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
  /**
   * Фактический интервал действия, если оно запускалось.
   *
   * Отдельно от `start_date`/`end_date`, потому что полоса строки — плановая:
   * факт рисуется накладкой поверх неё и может выходить за её правый край.
   */
  actual?: { start: Date; end: Date };
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
 * Интервал полосы действия — плановый.
 *
 * План задаёт ширину строки, чтобы действие, выполненное за час, не сжималось
 * в невидимую чёрточку. Факт подставляется только когда плана нет вовсе:
 * план у доски привязан к моменту запуска (`planned_end = planned_start +
 * длительность`), так что у не запускавшегося действия дат нет и строка уходит
 * в `unscheduled`.
 */
function resolvePlannedInterval(action: BoardAction, now: Date): Interval {
  const actualStart = toDate(action.actual_start);
  const actualEnd = toDate(action.actual_end);
  const plannedStart = toDate(action.planned_start);
  const plannedEnd = toDate(action.planned_end);

  if (plannedStart) {
    return { end: plannedEnd ?? actualEnd ?? now, start: plannedStart };
  }

  if (actualStart) {
    return { end: actualEnd ?? now, start: actualStart };
  }

  return null;
}

/**
 * Фактический интервал — накладка поверх плановой полосы.
 *
 * У незапущенного действия факта нет: накладку не рисуем, строка остаётся
 * пустой плановой полосой. Незакрытое действие тянется до текущего момента.
 */
function resolveActualInterval(action: BoardAction, now: Date): Interval {
  const actualStart = toDate(action.actual_start);
  if (!actualStart) return null;

  return { end: toDate(action.actual_end) ?? now, start: actualStart };
}

function buildActionRow(
  action: BoardAction,
  parent: string,
  now: Date,
): BoardTask {
  const state = resolveActionState(action);
  const planned = resolvePlannedInterval(action, now);
  const actual = resolveActualInterval(action, now);
  const row: BoardTask = {
    boardAction: action,
    id: action.id,
    parent,
    // Выполнение показывает накладка факта, а не заливка прогресса: иначе
    // завершённое действие заливало бы всю плановую полосу.
    progress: 0,
    rowKind: "action",
    state,
    text: action.name,
  };

  if (actual) row.actual = actual;

  if (!planned) {
    row.unscheduled = true;

    return row;
  }

  row.start_date = planned.start;
  row.end_date =
    planned.end > planned.start ? planned.end : new Date(planned.start);

  return row;
}

/**
 * Геометрия полосы факта внутри плановой — доли её ширины, в процентах.
 *
 * Проценты, а не пиксели: ширина полосы на диаграмме и есть плановый интервал,
 * поэтому масштаб шкалы считать не нужно. Сверху не ограничиваем — у
 * просроченного действия факт выходит за правый край плана, и это как раз то,
 * что показывает просрочку.
 */
export function actualBarGeometry(row: BoardTask) {
  if (!row.actual || !row.start_date || !row.end_date) return null;

  const planned = row.end_date.getTime() - row.start_date.getTime();
  if (planned <= 0) return null;

  const offset = row.actual.start.getTime() - row.start_date.getTime();
  const length = row.actual.end.getTime() - row.actual.start.getTime();

  return {
    left: (Math.max(offset, 0) / planned) * 100,
    width: (length / planned) * 100,
  };
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
