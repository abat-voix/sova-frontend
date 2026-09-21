"use client";

import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import type { GanttStatic, Task } from "dhtmlx-gantt";

import styles from "@/components/interactions/workflow-gantt.module.css";
import {
  actualBarGeometry,
  buildGanttData,
  type ActionState,
  type BoardSelection,
  type BoardTask,
  type StageState,
} from "@/lib/workflow/board-to-gantt";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import type { WorkflowBoard } from "@/types/workflow-board";

const copy = {
  ru: {
    error: "Не удалось загрузить диаграмму.",
    loading: "Загружаем диаграмму…",
    name: "Наименование",
    states: {
      completed: "Завершено",
      in_progress: "В работе",
      overdue: "Просрочено",
      pending: "Ожидает",
      unknown: "—",
      waiting_transition: "Ждёт перехода",
    },
    status: "Статус",
    undated: "без даты",
  },
  en: {
    error: "The timeline could not be loaded.",
    loading: "Loading timeline…",
    name: "Name",
    states: {
      completed: "Completed",
      in_progress: "In progress",
      overdue: "Overdue",
      pending: "Pending",
      unknown: "—",
      waiting_transition: "Awaiting transition",
    },
    status: "Status",
    undated: "no dates",
  },
} as const;

/** Масштаб шкалы времени. Управляется тулбаром рабочего стола. */
export type GanttScale = "day" | "week" | "month";

export type WorkflowGanttHandle = {
  /** Проматывает шкалу к сегодняшнему дню. */
  showToday: () => void;
};

type WorkflowGanttProps = {
  board: WorkflowBoard;
  className?: string;
  onSelect: (selection: BoardSelection) => void;
  ref?: Ref<WorkflowGanttHandle>;
  scale: GanttScale;
  /** Таблица со списком действий слева от шкалы. */
  showGrid: boolean;
};

const dayMs = 24 * 60 * 60 * 1000;

/** Высота полосы: подпись сверху, полоса факта — снизу (высота задана в CSS). */
const barHeight = 30;

const scalePresets: Record<
  GanttScale,
  { minColumnWidth: number; scales: GanttStatic["config"]["scales"] }
> = {
  day: {
    minColumnWidth: 32,
    scales: [
      { unit: "month", step: 1, format: "%F %Y" },
      { unit: "day", step: 1, format: "%d" },
    ],
  },
  week: {
    minColumnWidth: 44,
    scales: [
      { unit: "month", step: 1, format: "%F %Y" },
      { unit: "week", step: 1, format: "%d" },
    ],
  },
  month: {
    minColumnWidth: 68,
    scales: [
      { unit: "year", step: 1, format: "%Y" },
      { unit: "month", step: 1, format: "%M" },
    ],
  },
};

const escapes: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

function escapeHtml(value: string) {
  return value.replace(/["&<>]/g, (char) => escapes[char]);
}

function actualBarHtml(row: BoardTask) {
  const box = actualBarGeometry(row);
  if (!box) return "";

  return `<div class="sova-gantt-actual sova-gantt-actual--${row.state}" style="left:${box.left}%;width:${box.width}%"></div>`;
}

/**
 * Окно по умолчанию, когда ни у одного действия ещё нет дат.
 *
 * Факт учитывается наравне с планом: у просроченного действия он выходит за
 * правый край плановой полосы и иначе оказался бы за границей шкалы.
 *
 * Сегодняшний день входит в окно всегда — иначе кнопка «Сегодня» прокручивала
 * бы за пределы шкалы.
 */
function resolveRange(tasks: BoardTask[], now: Date) {
  const dates = tasks.flatMap((task) => {
    const actual = task.actual ? [task.actual.start, task.actual.end] : [];

    return task.unscheduled || !task.start_date
      ? actual
      : [task.start_date, task.end_date ?? task.start_date, ...actual];
  });

  if (dates.length === 0) {
    return {
      end: new Date(now.getTime() + 42 * dayMs),
      start: new Date(now.getTime() - 14 * dayMs),
    };
  }

  const times = [...dates.map((date) => date.getTime()), now.getTime()];

  return {
    end: new Date(Math.max(...times) + 7 * dayMs),
    start: new Date(Math.min(...times) - 7 * dayMs),
  };
}

function applyScale(gantt: GanttStatic, scale: GanttScale) {
  const preset = scalePresets[scale];
  gantt.config.scales = preset.scales;
  gantt.config.min_column_width = preset.minColumnWidth;
}

/** Заливает доску в инстанс, пересчитав окно шкалы под свежие даты. */
function renderBoard(
  gantt: GanttStatic,
  data: ReturnType<typeof buildGanttData>,
) {
  const range = resolveRange(data.data, new Date());
  gantt.config.start_date = range.start;
  gantt.config.end_date = range.end;
  gantt.clearAll();
  gantt.parse(data);
}

/**
 * Попадает ли текущий момент в ячейку шкалы. Расширение `marker` с вертикальной
 * линией «сегодня» в GPL-сборке недоступно, поэтому подсвечиваем саму ячейку.
 */
function isCurrentCell(gantt: GanttStatic, date: Date) {
  const scale = gantt.getScale();
  if (!scale) return false;

  const now = Date.now();
  const next = gantt.date.add(date, scale.step, scale.unit) as Date;

  return date.getTime() <= now && now < next.getTime();
}

export function WorkflowGantt({
  board,
  className,
  onSelect,
  ref,
  scale,
  showGrid,
}: WorkflowGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<GanttStatic | null>(null);
  const { locale } = useLocale();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const text = copy[locale];

  const ganttData = useMemo(() => buildGanttData(board), [board]);

  // Обработчик клика и данные живут в ref: инстанс Gantt создаётся один раз и
  // не должен пересоздаваться из-за новой ссылки на колбэк.
  const dataRef = useRef(ganttData);
  const selectRef = useRef(onSelect);
  const viewRef = useRef({ scale, showGrid });

  useEffect(() => {
    dataRef.current = ganttData;
  }, [ganttData]);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    viewRef.current = { scale, showGrid };
  }, [scale, showGrid]);

  useImperativeHandle(ref, () => ({
    showToday: () => ganttRef.current?.showDate(new Date()),
  }));

  useEffect(() => {
    let active = true;
    let instance: GanttStatic | null = null;

    async function initialize() {
      try {
        const { Gantt } = await import("dhtmlx-gantt");
        if (!active || !containerRef.current) return;

        const gantt = Gantt.getGanttInstance();
        instance = gantt;
        ganttRef.current = gantt;
        const labels = copy[locale];

        gantt.i18n.setLocale(locale);
        gantt.config.readonly = true;
        gantt.config.show_unscheduled = true;
        gantt.config.show_grid = viewRef.current.showGrid;
        gantt.config.grid_width = 350;
        gantt.config.row_height = 44;
        gantt.config.bar_height = barHeight;
        gantt.config.scale_height = 56;
        applyScale(gantt, viewRef.current.scale);
        gantt.config.columns = [
          {
            name: "text",
            label: labels.name,
            tree: true,
            width: "*",
            min_width: 170,
          },
          {
            name: "status",
            label: labels.status,
            align: "center",
            width: 110,
            template: (task: Task) => {
              const row = task as BoardTask;
              if (row.rowKind === "group") return "";

              const stateKey = row.state as ActionState | StageState;
              const label = labels.states[stateKey] ?? labels.states.unknown;

              return `<span class="sova-gantt-status sova-gantt-status--${stateKey}">${label}</span>`;
            },
          },
        ];
        gantt.templates.task_class = (_start, _end, task) => {
          const row = task as BoardTask;

          return `sova-gantt-task--${row.rowKind} sova-gantt-task--${row.state}`;
        };

        // Подпись и полоса факта живут внутри полосы плана. Слой
        // `addTaskLayer` не годится: в dhtmlx-gantt 10 метод удаляется с
        // инстанса (`src/core/data_task_layers.js`), хотя типы его объявляют.
        gantt.templates.task_text = (_start, _end, task) => {
          const row = task as BoardTask;
          const label = escapeHtml(String(row.text ?? ""));

          return row.rowKind === "action"
            ? `${label}${actualBarHtml(row)}`
            : label;
        };
        gantt.templates.grid_row_class = (_start, _end, task) => {
          const row = task as BoardTask;

          return row.rowKind === "action" ? "" : "sova-gantt-project-row";
        };
        gantt.templates.timeline_cell_class = (_task, date) =>
          isCurrentCell(gantt, date) ? "sova-gantt-today" : "";

        gantt.attachEvent("onTaskClick", (id) => {
          const row = gantt.getTask(id) as BoardTask;
          if (row.rowKind === "action" && row.boardAction) {
            selectRef.current({ action: row.boardAction, kind: "action" });
          }
          if (row.rowKind === "stage" && row.boardStage) {
            selectRef.current({ kind: "stage", stage: row.boardStage });
          }

          return true;
        });

        gantt.init(containerRef.current);
        renderBoard(gantt, dataRef.current);
        if (active) setState("ready");
      } catch {
        if (active) setState("error");
      }
    }

    void initialize();

    return () => {
      active = false;
      ganttRef.current = null;
      instance?.destructor();
    };
  }, [locale]);

  // Инстанс появляется асинхронно, поэтому до его готовности эффекты ниже —
  // пустышки: начальные значения берутся из ref прямо при инициализации.
  useEffect(() => {
    const gantt = ganttRef.current;
    if (!gantt) return;

    renderBoard(gantt, ganttData);
  }, [ganttData]);

  useEffect(() => {
    const gantt = ganttRef.current;
    if (!gantt) return;

    applyScale(gantt, scale);
    gantt.config.show_grid = showGrid;
    gantt.render();
  }, [scale, showGrid]);

  // Ширина области меняется без перемонтирования: свернули список, открыли
  // детали, спрятали таблицу. Сам dhtmlx следит только за размером окна.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => ganttRef.current?.setSizes());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      aria-busy={state === "loading"}
      aria-label={locale === "ru" ? "План процесса" : "Workflow plan"}
      className={cn(styles.root, "relative overflow-hidden", className)}
    >
      {state !== "ready" ? (
        <div className="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center bg-[var(--atmr-background-elevated)] text-sm">
          {state === "error" ? text.error : text.loading}
        </div>
      ) : null}
      <div className="h-full w-full" ref={containerRef} />
    </section>
  );
}
