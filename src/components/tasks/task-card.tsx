"use client";

import { Building2, CalendarClock, Layers, User } from "lucide-react";

import { interactionTitle } from "@/components/interactions/interaction-list";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { resolveActionState } from "@/lib/workflow/board-to-gantt";
import { formatMoment } from "@/lib/workflow/format-moment";
import { useLocale } from "@/providers/locale-provider";
import type { ActionInstance } from "@/types/action-instance";
import type { BoardOutcome } from "@/types/workflow-board";

const copy = {
  ru: {
    attempt: "Попытка",
    noDates: "без срока",
    optional: "Необязательное",
    overdue: "Просрочено",
    unnamed: "Без названия",
    waitingTransition: "Ждёт перехода",
  },
  en: {
    attempt: "Attempt",
    noDates: "no deadline",
    optional: "Optional",
    overdue: "Overdue",
    unnamed: "Untitled",
    waitingTransition: "Awaiting transition",
  },
} as const;

type TaskCardProps = {
  action: ActionInstance;
  /** Задача открыта в панели деталей или указана в query param. */
  isSelected?: boolean;
  /** Открыть детали. Что именно открыть — решает рабочий стол. */
  onOpen: () => void;
  onOutcome: (outcome: BoardOutcome) => void;
  /** Ответственный нужен только в режиме «Все»: в «Моих» это всегда сам пользователь. */
  showResponsible: boolean;
};

export function TaskCard({
  action,
  isSelected,
  onOpen,
  onOutcome,
  showResponsible,
}: TaskCardProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const state = resolveActionState(action);
  const isWaiting = state === "waiting_transition";

  return (
    <article
      className={cn(
        "bg-card relative rounded-lg border p-3 shadow-sm",
        state === "overdue" && "border-[var(--atmr-brand-orange)]",
        isWaiting && "opacity-60",
        isSelected &&
          "border-[var(--atmr-accent-primary)] ring-2 ring-[var(--atmr-accent-primary)]",
      )}
    >
      {/*
        Подложка вместо onClick на самой карточке: внутри уже есть кнопки
        исходов, а вложенные интерактивные элементы ломают клавиатуру и
        скринридер. Кнопки исходов лежат выше по z-порядку и до подложки
        клик не доводят.
      */}
      {/*
        Подсветка висит на подложке, а не на самой карточке: у карточки уже
        есть `bg-card`, и `hover:bg-*` на ней проигрывает по каскаду. Подложка
        накрывает карточку целиком, поэтому её фон и читается как подсветка.
      */}
      <button
        aria-label={action.action_name_snapshot}
        className="focus-visible:ring-ring absolute inset-0 z-0 cursor-pointer rounded-lg transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--atmr-accent-primary)_10%,transparent)] focus-visible:ring-2 focus-visible:outline-none"
        onClick={onOpen}
        type="button"
      />

      <p className="text-sm leading-5 font-medium">
        {action.action_name_snapshot}
      </p>

      <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
        <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">
          {interactionTitle(action.interaction, text.unnamed)}
        </span>
      </p>
      <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
        <Layers aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{action.stage_name_snapshot}</span>
      </p>
      <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
        <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
        {formatMoment(action.planned_end, locale) ?? text.noDates}
      </p>
      {showResponsible && action.responsible ? (
        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          <User aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{action.responsible.full_name}</span>
        </p>
      ) : null}

      {state === "overdue" ||
      isWaiting ||
      action.is_optional ||
      action.execution_no > 1 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {state === "overdue" ? (
            <StatusChip tone="accent">{text.overdue}</StatusChip>
          ) : null}
          {isWaiting ? <StatusChip>{text.waitingTransition}</StatusChip> : null}
          {action.is_optional ? <StatusChip>{text.optional}</StatusChip> : null}
          {action.execution_no > 1 ? (
            <StatusChip>
              {text.attempt} {action.execution_no}
            </StatusChip>
          ) : null}
        </div>
      ) : null}

      {action.result ? (
        <div className="mt-2 border-t pt-2">
          <p className="text-xs font-medium">{action.result.outcome_name}</p>
          {action.result.comment ? (
            <p className="text-muted-foreground mt-1 text-xs">
              {action.result.comment}
            </p>
          ) : null}
        </div>
      ) : null}

      {action.available_outcomes.length > 0 ? (
        <div className="relative z-10 mt-3 flex flex-wrap gap-1.5 border-t pt-3">
          {action.available_outcomes.map((outcome) => (
            <Button
              key={outcome.id}
              onClick={() => onOutcome(outcome)}
              size="s"
              type="button"
              variant="outline"
            >
              {outcome.name}
            </Button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
