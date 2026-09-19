"use client";

import { useEffect, useRef, useState } from "react";
import type { GanttData, GanttStatic, Link, Task } from "dhtmlx-gantt";

import styles from "@/components/interactions/workflow-gantt.module.css";
import { useLocale } from "@/providers/locale-provider";

type WorkflowStatus = "active" | "completed" | "planned";
type WorkflowTask = Task & { status?: WorkflowStatus };

const copy = {
  ru: {
    name: "Наименование",
    status: "Статус",
    loading: "Загружаем диаграмму…",
    error: "Не удалось загрузить диаграмму.",
    statuses: {
      active: "В работе",
      completed: "Завершён",
      planned: "Запланирован",
    },
    tasks: {
      university: "МГТУ им. Н.Э. Баумана",
      interaction: "Взаимодействие № В-2026-09",
      workflow: "Workflow заключения договора",
      preparation: "Подготовка и контакт",
      approval: "Согласование и документы",
      implementation: "Внедрение и обучение",
      support: "Сопровождение",
      milestone: "Подписание договора",
    },
  },
  en: {
    name: "Name",
    status: "Status",
    loading: "Loading timeline…",
    error: "The timeline could not be loaded.",
    statuses: {
      active: "In progress",
      completed: "Completed",
      planned: "Planned",
    },
    tasks: {
      university: "Bauman Moscow State Technical University",
      interaction: "Interaction № I-2026-09",
      workflow: "Contract workflow",
      preparation: "Preparation and contact",
      approval: "Approval and documents",
      implementation: "Implementation and training",
      support: "Support",
      milestone: "Contract signing",
    },
  },
} as const;

function createDemoData(locale: keyof typeof copy): GanttData {
  const text = copy[locale].tasks;
  const data: WorkflowTask[] = [
    {
      id: 1,
      text: text.university,
      type: "project",
      open: true,
      progress: 0.46,
      status: "active",
    },
    {
      id: 2,
      parent: 1,
      text: text.interaction,
      type: "project",
      open: true,
      progress: 0.46,
      status: "active",
    },
    {
      id: 3,
      parent: 2,
      text: text.workflow,
      type: "project",
      open: true,
      progress: 0.46,
      status: "active",
    },
    {
      id: 4,
      parent: 3,
      text: text.preparation,
      start_date: new Date(2026, 8, 7),
      duration: 14,
      progress: 1,
      status: "completed",
    },
    {
      id: 5,
      parent: 3,
      text: text.approval,
      start_date: new Date(2026, 8, 21),
      duration: 21,
      progress: 0.6,
      status: "active",
    },
    {
      id: 6,
      parent: 3,
      text: text.implementation,
      start_date: new Date(2026, 9, 12),
      duration: 28,
      progress: 0.15,
      status: "active",
    },
    {
      id: 7,
      parent: 3,
      text: text.support,
      start_date: new Date(2026, 10, 9),
      duration: 35,
      progress: 0,
      status: "planned",
    },
    {
      id: 8,
      parent: 3,
      text: text.milestone,
      start_date: new Date(2026, 9, 9),
      type: "milestone",
      status: "planned",
    },
  ];
  const links: Link[] = [
    { id: 1, source: 4, target: 5, type: "0" },
    { id: 2, source: 5, target: 8, type: "0" },
    { id: 3, source: 8, target: 6, type: "0" },
    { id: 4, source: 6, target: 7, type: "0" },
  ];

  return { data, links };
}

export function WorkflowGantt() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    let instance: GanttStatic | null = null;

    async function initialize() {
      try {
        const { Gantt } = await import("dhtmlx-gantt");
        if (!active || !containerRef.current) return;

        const gantt = Gantt.getGanttInstance();
        instance = gantt;
        const text = copy[locale];

        gantt.i18n.setLocale(locale);
        gantt.config.readonly = true;
        gantt.config.grid_width = 430;
        gantt.config.row_height = 44;
        gantt.config.bar_height = 24;
        gantt.config.scale_height = 56;
        gantt.config.min_column_width = 44;
        gantt.config.start_date = new Date(2026, 8, 1);
        gantt.config.end_date = new Date(2026, 11, 31);
        gantt.config.scales = [
          { unit: "month", step: 1, format: "%F %Y" },
          { unit: "week", step: 1, format: "%d" },
        ];
        gantt.config.columns = [
          {
            name: "text",
            label: text.name,
            tree: true,
            width: "*",
            min_width: 230,
          },
          {
            name: "status",
            label: text.status,
            align: "center",
            width: 122,
            template: (task: Task) => {
              const status = task.status as WorkflowStatus | undefined;
              if (!status) return "";

              return `<span class="sova-gantt-status sova-gantt-status--${status}">${text.statuses[status]}</span>`;
            },
          },
        ];
        gantt.templates.task_class = (_start, _end, task) => {
          const status = task.status as WorkflowStatus | undefined;
          return status ? `sova-gantt-task--${status}` : "";
        };
        gantt.templates.grid_row_class = (_start, _end, task) =>
          task.type === "project" ? "sova-gantt-project-row" : "";

        gantt.init(containerRef.current);
        gantt.parse(createDemoData(locale));
        if (active) setState("ready");
      } catch {
        if (active) setState("error");
      }
    }

    void initialize();

    return () => {
      active = false;
      instance?.destructor();
    };
  }, [locale]);

  const text = copy[locale];

  return (
    <section
      aria-busy={state === "loading"}
      aria-label={locale === "ru" ? "План workflow" : "Workflow plan"}
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
