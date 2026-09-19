"use client";

import { WorkflowGantt } from "@/components/interactions/workflow-gantt";
import { useLocale } from "@/providers/locale-provider";

const copy = {
  ru: {
    eyebrow: "Демонстрация компонента",
    title: "Взаимодействия с вузами",
    description:
      "Workflow выбранного взаимодействия показан как иерархический план с этапами, сроками и зависимостями.",
    badge: "DHTMLX Gantt Community",
  },
  en: {
    eyebrow: "Component demo",
    title: "University interactions",
    description:
      "The selected interaction workflow is shown as a hierarchical plan with stages, dates, and dependencies.",
    badge: "DHTMLX Gantt Community",
  },
} as const;

export function InteractionsWorkspace() {
  const { locale } = useLocale();
  const text = copy[locale];

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--atmr-accent-primary)]">
            {text.eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
            {text.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-base leading-7">
            {text.description}
          </p>
        </div>
        <span className="w-fit rounded-full border border-[var(--atmr-border-subtle)] bg-[var(--atmr-background-accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--atmr-accent-primary)]">
          {text.badge}
        </span>
      </div>

      <WorkflowGantt />
    </div>
  );
}
