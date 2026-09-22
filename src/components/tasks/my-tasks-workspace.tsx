"use client";

import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { BoardDetailsDrawer } from "@/components/interactions/board-details-drawer";
import {
  InteractionList,
  interactionTitle,
} from "@/components/interactions/interaction-list";
import { NewInteractionDialog } from "@/components/interactions/new-interaction-dialog";
import { CompleteActionDialog } from "@/components/tasks/complete-action-dialog";
import { TaskColumn } from "@/components/tasks/task-column";
import { Button } from "@/components/ui/button";
import { useCompleteAction } from "@/hooks/use-complete-action";
import { usePersistedFlag } from "@/hooks/use-persisted-flag";
import type { ActionInstanceScope } from "@/lib/api/processes/action-instances";
import { cn } from "@/lib/utils";
import { actionInstanceToBoardAction } from "@/lib/workflow/action-instance-to-board";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { ActionInstance } from "@/types/action-instance";
import type { BoardOutcome, Interaction } from "@/types/workflow-board";

const collapsedStorageKey = "sova-tasks-list-collapsed";
const completedWindowDays = 30;

const copy = {
  ru: {
    allInteractions: "Все взаимодействия",
    collapseList: "Свернуть список",
    columns: {
      completed: "Завершено",
      in_progress: "В работе",
      pending: "Ожидает",
    },
    create: "Новое",
    expandList: "Развернуть список",
    lastDays: "за 30 дней",
    scope: "Охват",
    scopeAll: "Все",
    scopeMine: "Мои",
    wholeTime: "за всё время",
  },
  en: {
    allInteractions: "All interactions",
    collapseList: "Collapse the list",
    columns: {
      completed: "Completed",
      in_progress: "In progress",
      pending: "Pending",
    },
    create: "New",
    expandList: "Expand the list",
    lastDays: "last 30 days",
    scope: "Scope",
    scopeAll: "All",
    scopeMine: "Mine",
    wholeTime: "all time",
  },
} as const;

/** `ГГГГ-ММ-ДД` — формат, который принимает `actual_end__gte`. */
function isoDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return date.toISOString().slice(0, 10);
}

export function MyTasksWorkspace() {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  const text = copy[locale];
  const [selectedInteraction, setSelectedInteraction] =
    useState<Interaction | null>(null);
  const [selectedInteractionId, setSelectedInteractionId] = useState<
    string | null
  >(null);
  const [scope, setScope] = useState<ActionInstanceScope>("mine");
  const [isWholeTime, setIsWholeTime] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pending, setPending] = useState<{
    action: ActionInstance;
    outcome: BoardOutcome;
  } | null>(null);
  const [openedAction, setOpenedAction] = useState<ActionInstance | null>(null);
  const [isListCollapsed, setIsListCollapsed] =
    usePersistedFlag(collapsedStorageKey);

  const mutation = useCompleteAction(csrfToken);

  // Переключатель охвата КАМу ничего не меняет: бэкенд и так отдаёт только
  // доступное ему. Показываем его тем, у кого есть подчинённые.
  const canSwitchScope =
    user?.role === "head" || user?.role === "platform_admin";

  const actualEndGte = useMemo(
    () => (isWholeTime ? undefined : isoDate(completedWindowDays)),
    [isWholeTime],
  );

  const handleSelectInteraction = useCallback((interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setSelectedInteractionId(interaction.id);
  }, []);

  const clearInteraction = useCallback(() => {
    setSelectedInteraction(null);
    setSelectedInteractionId(null);
  }, []);

  /**
   * Исход без требований завершается сразу — форма ради одной кнопки была бы
   * лишним шагом. Исход с требованиями открывает окно.
   */
  const handleOutcome = useCallback(
    (action: ActionInstance, outcome: BoardOutcome) => {
      const needsAttachment =
        outcome.is_attachment_required && action.attachments_count === 0;

      if (outcome.is_comment_required || needsAttachment) {
        setPending({ action, outcome });

        return;
      }

      mutation.mutate({ action, outcome });

      // Панель — снимок открытого действия: карточка сейчас продвинется
      // сама, а панель об этом не узнает и предложит завершить то же
      // действие повторно. Закрываем её сразу, не дожидаясь ответа.
      setOpenedAction((current) =>
        current?.id === action.id ? null : current,
      );
    },
    [mutation],
  );

  const columns = [
    { ordering: "planned_end", status: "pending" as const },
    { ordering: "planned_end", status: "in_progress" as const },
    { ordering: "-actual_end", status: "completed" as const },
  ];

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      {isCreating && user ? (
        <NewInteractionDialog
          csrfToken={csrfToken}
          currentUser={user}
          onClose={() => setIsCreating(false)}
          onCreated={(interactionId) => {
            setIsCreating(false);
            setSelectedInteraction(null);
            setSelectedInteractionId(interactionId);
          }}
        />
      ) : null}

      {pending ? (
        <CompleteActionDialog
          action={pending.action}
          csrfToken={csrfToken}
          onClose={() => setPending(null)}
          outcome={pending.outcome}
        />
      ) : null}

      <aside
        className={cn(
          "bg-card flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm",
          isListCollapsed ? "w-14" : "w-80",
        )}
      >
        <div
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b",
            isListCollapsed ? "justify-center px-0" : "px-2",
          )}
        >
          <Button
            aria-expanded={!isListCollapsed}
            aria-label={isListCollapsed ? text.expandList : text.collapseList}
            colorScheme="neutral"
            onClick={() => setIsListCollapsed(!isListCollapsed)}
            size="icon"
            title={isListCollapsed ? text.expandList : text.collapseList}
            type="button"
            variant="outline"
          >
            {isListCollapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
          </Button>
          {!isListCollapsed && user ? (
            <Button
              className="flex-1"
              onClick={() => setIsCreating(true)}
              size="m"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              {text.create}
            </Button>
          ) : null}
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-2 p-3",
            isListCollapsed && "hidden",
          )}
        >
          <Button
            aria-pressed={selectedInteractionId === null}
            colorScheme={selectedInteractionId === null ? "accent" : "neutral"}
            onClick={clearInteraction}
            size="s"
            type="button"
            variant={selectedInteractionId === null ? "secondary" : "ghost"}
          >
            {text.allInteractions}
          </Button>
          <InteractionList
            onResolve={setSelectedInteraction}
            onSelect={handleSelectInteraction}
            selectedId={selectedInteractionId}
          />
        </div>
      </aside>

      <section className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          {selectedInteraction ? (
            <p className="min-w-0 truncate text-sm font-medium">
              {interactionTitle(selectedInteraction, text.allInteractions)}
            </p>
          ) : null}

          {canSwitchScope ? (
            <div
              aria-label={text.scope}
              className="ml-auto flex items-center gap-0.5 rounded-lg border p-0.5"
              role="group"
            >
              {(["mine", "all"] as const).map((value) => (
                <Button
                  aria-pressed={scope === value}
                  colorScheme={scope === value ? "accent" : "neutral"}
                  key={value}
                  onClick={() => setScope(value)}
                  size="s"
                  type="button"
                  variant={scope === value ? "secondary" : "ghost"}
                >
                  {value === "mine" ? text.scopeMine : text.scopeAll}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto p-3">
            {columns.map(({ ordering, status }) => (
              <TaskColumn
                actualEndGte={status === "completed" ? actualEndGte : undefined}
                interactionId={selectedInteractionId}
                key={status}
                onOpen={setOpenedAction}
                onOutcome={handleOutcome}
                ordering={ordering}
                scope={scope}
                status={status}
                subtitle={
                  status === "completed" ? (
                    <button
                      className="underline-offset-2 hover:underline"
                      onClick={() => setIsWholeTime((whole) => !whole)}
                      type="button"
                    >
                      {isWholeTime ? text.wholeTime : text.lastDays}
                    </button>
                  ) : undefined
                }
                title={text.columns[status]}
              />
            ))}
          </div>

          {openedAction ? (
            <BoardDetailsDrawer
              csrfToken={csrfToken}
              onActionChanged={() => setOpenedAction(null)}
              onClose={() => setOpenedAction(null)}
              selection={{
                kind: "action",
                action: actionInstanceToBoardAction(openedAction),
              }}
              workflowInstanceId={openedAction.workflow_instance}
              interaction={openedAction.interaction}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
