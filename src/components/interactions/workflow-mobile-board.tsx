"use client";

import { ChevronDown, ChevronUp, Clock3, UserRound } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { resolveActionState } from "@/lib/workflow/board-to-gantt";
import { formatRange } from "@/lib/workflow/format-moment";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import type { BoardSelection } from "@/lib/workflow/board-to-gantt";
import type { BoardStage, WorkflowBoard } from "@/types/workflow-board";

const copy = {
  ru: {
    actual: "Факт",
    completed: "Завершено",
    empty: "В этом этапе пока нет действий.",
    noDates: "Без срока",
    optional: "необязательное",
    planned: "План",
    responsible: "Ответственный",
    unassigned: "не назначен",
    waiting: "Ожидает перехода",
    overdue: "Просрочено",
    inProgress: "В работе",
    pending: "Ожидает",
    unknown: "Неизвестно",
  },
  en: {
    actual: "Actual",
    completed: "Completed",
    empty: "This stage has no actions yet.",
    noDates: "No deadline",
    optional: "optional",
    planned: "Plan",
    responsible: "Responsible",
    unassigned: "unassigned",
    waiting: "Awaiting transition",
    overdue: "Overdue",
    inProgress: "In progress",
    pending: "Pending",
    unknown: "Unknown",
  },
} as const;

type MobileCopy = (typeof copy)[keyof typeof copy];

function statusLabel(
  state: ReturnType<typeof resolveActionState>,
  text: MobileCopy,
) {
  switch (state) {
    case "completed":
      return text.completed;
    case "in_progress":
      return text.inProgress;
    case "overdue":
      return text.overdue;
    case "pending":
      return text.pending;
    case "waiting_transition":
      return text.waiting;
    default:
      return text.unknown;
  }
}

function stageProgress(stage: BoardStage) {
  const completed = stage.actions.filter(
    (action) => action.status === "completed",
  ).length;

  return `${completed}/${stage.actions.length}`;
}

function stageIsActive(stage: BoardStage) {
  return (
    stage.status === "in_progress" ||
    stage.actions.some((action) => {
      const state = resolveActionState(action);
      return state === "in_progress" || state === "overdue";
    })
  );
}

function ActionRow({
  onSelect,
  selection,
  text,
}: {
  onSelect: (selection: BoardSelection) => void;
  selection: Extract<BoardSelection, { kind: "action" }>;
  text: MobileCopy;
}) {
  const { locale } = useLocale();
  const action = selection.action;
  const state = resolveActionState(action);
  const status = statusLabel(state, text);
  const plan = formatRange(
    action.planned_start,
    action.planned_end,
    locale,
    text.noDates,
  );
  const actual = formatRange(
    action.actual_start,
    action.actual_end,
    locale,
    text.noDates,
  );

  return (
    <button
      className="hover:bg-secondary flex w-full items-start gap-2.5 border-b py-3 text-left last:border-b-0"
      onClick={() => onSelect(selection)}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          state === "completed" && "bg-[var(--atmr-positive)]",
          state === "in_progress" && "bg-[#2878ff]",
          state === "overdue" && "bg-[var(--atmr-brand-orange)]",
          !["completed", "in_progress", "overdue"].includes(state) &&
            "bg-muted-foreground/50",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 font-medium">
          {action.name}
        </span>
        <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <Clock3 aria-hidden="true" className="size-3 shrink-0" />
            {text.planned}: {plan}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <UserRound aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">
              {action.responsible?.full_name ?? text.unassigned}
            </span>
          </span>
        </span>
        {action.actual_start || action.actual_end ? (
          <span className="text-muted-foreground mt-1 block text-xs">
            {text.actual}: {actual}
          </span>
        ) : null}
      </span>
      <Badge
        className={cn(
          "shrink-0",
          state === "overdue" &&
            "bg-[var(--atmr-brand-orange)]/12 text-[var(--atmr-brand-orange)]",
          state === "in_progress" && "bg-[#2878ff]/12 text-[#1d5fcf]",
          state === "completed" &&
            "bg-[var(--atmr-positive)]/12 text-[var(--atmr-positive)]",
        )}
        variant="neutral"
      >
        {action.is_optional ? `${status} · ${text.optional}` : status}
      </Badge>
    </button>
  );
}

function StageSection({
  initiallyOpen,
  onSelect,
  stage,
  text,
}: {
  initiallyOpen: boolean;
  onSelect: (selection: BoardSelection) => void;
  stage: BoardStage;
  text: MobileCopy;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const headingId = `mobile-stage-${stage.id}`;
  const panelId = `${headingId}-actions`;

  return (
    <section className="bg-card overflow-hidden rounded-xl border">
      <h3 className="m-0">
        <button
          aria-controls={panelId}
          aria-expanded={isOpen}
          className="flex min-h-14 w-full items-center gap-3 bg-[var(--atmr-background-accent-soft)] px-3 py-2 text-left"
          data-testid={`mobile-stage-toggle-${stage.id}`}
          id={headingId}
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {stage.stage.name}
            </span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              {statusLabel(
                stage.status as ReturnType<typeof resolveActionState>,
                text,
              )}
            </span>
          </span>
          <span className="bg-card text-muted-foreground rounded-full px-2 py-1 text-xs">
            {stageProgress(stage)}
          </span>
          {isOpen ? (
            <ChevronUp aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
          )}
        </button>
      </h3>
      {isOpen ? (
        <div
          className="px-3"
          id={panelId}
          role="region"
          aria-labelledby={headingId}
        >
          {stage.actions.length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">{text.empty}</p>
          ) : (
            stage.actions.map((action) => (
              <ActionRow
                key={action.id}
                onSelect={onSelect}
                selection={{ action, kind: "action" }}
                text={text}
              />
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

export function WorkflowMobileBoard({
  board,
  onSelect,
}: {
  board: WorkflowBoard;
  onSelect: (selection: BoardSelection) => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const sections = useMemo(
    () => [
      { id: "interaction", title: null, stages: board.interaction_stages },
      ...board.context_groups.map((group) => ({
        id: `${group.context_type}:${group.context_id}`,
        title: group.title,
        stages: group.stages,
      })),
    ],
    [board.context_groups, board.interaction_stages],
  );

  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto p-3">
      <div className="space-y-3">
        {sections.map((section) => (
          <Fragment key={section.id}>
            {section.title ? (
              <h2 className="text-muted-foreground px-1 pt-1 text-xs font-medium tracking-[0.08em] uppercase">
                {section.title}
              </h2>
            ) : null}
            <div className="space-y-3">
              {section.stages.map((stage) => (
                <StageSection
                  initiallyOpen={stageIsActive(stage)}
                  key={stage.id}
                  onSelect={onSelect}
                  stage={stage}
                  text={text}
                />
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
