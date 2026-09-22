"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import { BoardDetails } from "@/components/interactions/board-details";
import { Button } from "@/components/ui/button";
import type { BoardSelection } from "@/lib/workflow/board-to-gantt";
import { useLocale } from "@/providers/locale-provider";

const copy = {
  ru: { action: "Действие", close: "Закрыть детали", stage: "Этап" },
  en: { action: "Action", close: "Close details", stage: "Stage" },
} as const;

type BoardDetailsDrawerProps = {
  csrfToken: string;
  onClose: () => void;
  selection: BoardSelection;
  workflowInstanceId: string;
};

/**
 * Детали выбранной строки справа от диаграммы или колонок. Подложки нет: клик
 * по другой строке переключает содержимое, а не закрывает панель.
 *
 * От `sm` панель занимает место в потоке, а не лежит поверх: иначе её край
 * закрывал бы последние элементы, доскроллить до которых нельзя — прокрутка
 * заканчивается на краю собственного содержимого. На узких экранах она
 * остаётся оверлеем во всю ширину: сужать диаграмму там не до чего.
 */
export function BoardDetailsDrawer({
  csrfToken,
  onClose,
  selection,
  workflowInstanceId,
}: BoardDetailsDrawerProps) {
  const { locale } = useLocale();
  const text = copy[locale];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <aside
      aria-label={selection.kind === "action" ? text.action : text.stage}
      className="bg-card absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l shadow-[var(--atmr-shadow-elevated)] sm:relative sm:inset-auto sm:w-96 sm:shrink-0"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b pr-2 pl-4">
        <p className="text-muted-foreground text-xs font-bold tracking-[0.12em] uppercase">
          {selection.kind === "action" ? text.action : text.stage}
        </p>
        <Button
          aria-label={text.close}
          colorScheme="neutral"
          onClick={onClose}
          size="icon"
          title={text.close}
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <BoardDetails
          csrfToken={csrfToken}
          selection={selection}
          workflowInstanceId={workflowInstanceId}
        />
      </div>
    </aside>
  );
}
