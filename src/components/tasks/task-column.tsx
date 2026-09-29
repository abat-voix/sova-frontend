"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import {
  actionInstancesQueryKey,
  getActionInstances,
  type ActionInstanceScope,
} from "@/lib/api/processes/action-instances";
import { useLocale } from "@/providers/locale-provider";
import type { ActionInstance } from "@/types/action-instance";
import type {
  ActionInstanceStatus,
  BoardOutcome,
} from "@/types/workflow-board";

const copy = {
  ru: {
    empty: "Нет задач",
    emptyFiltered: "Нет задач по выбранному взаимодействию",
    error: "Не удалось загрузить задачи.",
    loading: "Загружаем…",
    loadMore: "Показать ещё",
    retry: "Повторить",
  },
  en: {
    empty: "No tasks",
    emptyFiltered: "No tasks for the selected interaction",
    error: "The tasks could not be loaded.",
    loading: "Loading…",
    loadMore: "Show more",
    retry: "Retry",
  },
} as const;

type TaskColumnProps = {
  actualEndGte?: string;
  interactionId: string | null;
  /** Сообщает родителю о загруженных задачах — нужно для выбора по id из query param. */
  onActionsLoaded?: (actions: ActionInstance[]) => void;
  onOpen: (action: ActionInstance) => void;
  onOutcome?: (action: ActionInstance, outcome: BoardOutcome) => void;
  ordering: string;
  scope: ActionInstanceScope;
  /** Id выбранной задачи — открытой в панели или указанной в query param. */
  selectedTaskId?: string | null;
  status: ActionInstanceStatus;
  /** Приписка под заголовком — например, окно дат у завершённых. */
  subtitle?: ReactNode;
  title: string;
};

export function TaskColumn({
  actualEndGte,
  interactionId,
  onActionsLoaded,
  onOpen,
  onOutcome,
  ordering,
  scope,
  selectedTaskId,
  status,
  subtitle,
  title,
}: TaskColumnProps) {
  const { locale } = useLocale();
  const text = copy[locale];

  const query = useInfiniteQuery({
    queryKey: actionInstancesQueryKey({
      actualEndGte,
      interactionId,
      ordering,
      scope,
      status,
    }),
    queryFn: ({ pageParam }) =>
      getActionInstances({
        actualEndGte,
        interactionId,
        ordering,
        page: pageParam,
        scope,
        status,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });

  const actions = query.data?.pages.flatMap((page) => page.results) ?? [];
  const total = query.data?.pages[0]?.count;

  useEffect(() => {
    if (actions.length > 0) {
      onActionsLoaded?.(actions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  return (
    <section
      aria-label={title}
      className="bg-secondary/40 flex min-h-0 w-72 shrink-0 flex-col rounded-xl border"
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          {subtitle ? (
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          ) : null}
        </div>
        {total !== undefined ? (
          <span className="bg-card text-muted-foreground rounded-full px-2 py-0.5 text-xs">
            {total}
          </span>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {query.isPending ? (
          <p className="text-muted-foreground p-2 text-center text-xs">
            {text.loading}
          </p>
        ) : query.isError ? (
          <div className="space-y-2 p-2 text-center">
            <p className="text-muted-foreground text-xs">{text.error}</p>
            <Button
              colorScheme="neutral"
              onClick={() => void query.refetch()}
              size="s"
              type="button"
              variant="outline"
            >
              {text.retry}
            </Button>
          </div>
        ) : actions.length === 0 ? (
          // Пустая колонка при активном фильтре объясняет причину: иначе
          // «Нет задач» читается как «их нет вообще».
          <p className="text-muted-foreground p-2 text-center text-xs">
            {interactionId ? text.emptyFiltered : text.empty}
          </p>
        ) : (
          actions.map((action) => (
            <TaskCard
              action={action}
              isSelected={selectedTaskId === action.id}
              key={action.id}
              onOpen={() => onOpen(action)}
              onOutcome={
                onOutcome ? (outcome) => onOutcome(action, outcome) : undefined
              }
              showResponsible={scope === "all"}
            />
          ))
        )}

        {query.hasNextPage ? (
          <Button
            className="w-full"
            colorScheme="neutral"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
            size="s"
            type="button"
            variant="outline"
          >
            {query.isFetchingNextPage ? text.loading : text.loadMore}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
