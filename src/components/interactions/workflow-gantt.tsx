"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GanttStatic, Task } from "dhtmlx-gantt";

import styles from "@/components/interactions/workflow-gantt.module.css";
import {
  buildGanttData,
  type ActionState,
  type BoardSelection,
  type BoardTask,
  type StageState,
} from "@/lib/workflow/board-to-gantt";
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

type WorkflowGanttProps = {
  board: WorkflowBoard;
  onSelect: (selection: BoardSelection) => void;
};

const dayMs = 24 * 60 * 60 * 1000;

/** Окно по умолчанию, когда ни у одного действия ещё нет дат. */
function resolveRange(tasks: BoardTask[], now: Date) {
  const dates = tasks.flatMap((task) =>
    task.unscheduled || !task.start_date
      ? []
      : [task.start_date, task.end_date ?? task.start_date],
  );

  if (dates.length === 0) {
    return {
      end: new Date(now.getTime() + 42 * dayMs),
      start: new Date(now.getTime() - 14 * dayMs),
    };
  }

  const times = dates.map((date) => date.getTime());

  return {
    end: new Date(Math.max(...times) + 7 * dayMs),
    start: new Date(Math.min(...times) - 7 * dayMs),
  };
}

export function WorkflowGantt({ board, onSelect }: WorkflowGanttProps) {
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

  useEffect(() => {
    dataRef.current = ganttData;
  }, [ganttData]);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

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
        const range = resolveRange(dataRef.current.data, new Date());

        gantt.i18n.setLocale(locale);
        gantt.config.readonly = true;
        gantt.config.show_unscheduled = true;
        gantt.config.grid_width = 430;
        gantt.config.row_height = 44;
        gantt.config.bar_height = 24;
        gantt.config.scale_height = 56;
        gantt.config.min_column_width = 44;
        gantt.config.start_date = range.start;
        gantt.config.end_date = range.end;
        gantt.config.scales = [
          { unit: "month", step: 1, format: "%F %Y" },
          { unit: "week", step: 1, format: "%d" },
        ];
        gantt.config.columns = [
          {
            name: "text",
            label: labels.name,
            tree: true,
            width: "*",
            min_width: 230,
          },
          {
            name: "status",
            label: labels.status,
            align: "center",
            width: 122,
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

          return `sova-gantt-task--${row.state}`;
        };
        gantt.templates.grid_row_class = (_start, _end, task) => {
          const row = task as BoardTask;

          return row.rowKind === "action" ? "" : "sova-gantt-project-row";
        };

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
        gantt.parse(dataRef.current);
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

  useEffect(() => {
    const gantt = ganttRef.current;
    if (!gantt) return;

    const range = resolveRange(ganttData.data, new Date());
    gantt.config.start_date = range.start;
    gantt.config.end_date = range.end;
    gantt.clearAll();
    gantt.parse(ganttData);
  }, [ganttData]);

  return (
    <section
      aria-busy={state === "loading"}
      aria-label={locale === "ru" ? "План процесса" : "Workflow plan"}
      className={`${styles.root} bg-card relative overflow-hidden rounded-xl border shadow-sm`}
    >
      {state !== "ready" ? (
        <div className="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center bg-[var(--atmr-background-elevated)] text-sm">
          {state === "error" ? text.error : text.loading}
        </div>
      ) : null}
      <div className="h-[38rem] min-h-[32rem] w-full" ref={containerRef} />
    </section>
  );
}
