"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  IdCard,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  TableProperties,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { BoardDetailsDrawer } from "@/components/interactions/board-details-drawer";
import { InteractionCardDialog } from "@/components/interactions/interaction-card-dialog";
import { InteractionContactsPanel } from "@/components/interactions/interaction-contacts-panel";
import {
  InteractionList,
  interactionTitle,
} from "@/components/interactions/interaction-list";
import { NewInteractionDialog } from "@/components/interactions/new-interaction-dialog";
import { StartProcessDialog } from "@/components/interactions/start-process-dialog";
import {
  GanttScale,
  WorkflowGantt,
  type WorkflowGanttHandle,
} from "@/components/interactions/workflow-gantt";
import { Button } from "@/components/ui/button";
import { usePersistedFlag } from "@/hooks/use-persisted-flag";
import {
  boardQueryKey,
  getWorkflowBoard,
  getWorkflowInstances,
} from "@/lib/api/processes/board";
import {
  findBoardSelection,
  type BoardSelection,
} from "@/lib/workflow/board-to-gantt";
import { parseInteractionLink } from "@/lib/workflow/interaction-link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Interaction, WorkflowAudience } from "@/types/workflow-board";

const copy = {
  ru: {
    boardError: "Не удалось загрузить процесс.",
    collapseList: "Свернуть список",
    create: "Новое",
    expandList: "Развернуть список",
    hideGrid: "Скрыть таблицу",
    loadingBoard: "Загружаем процесс…",
    noInteraction: "Выберите взаимодействие слева.",
    noProcess: "По этому взаимодействию процесс ещё не запущен.",
    process: "Процесс",
    retry: "Повторить",
    scale: "Масштаб",
    scales: { day: "Д", month: "М", week: "Н" },
    scaleTitles: {
      day: "По дням",
      month: "По месяцам",
      week: "По неделям",
    },
    showGrid: "Показать таблицу",
    startProcess: "Запустить процесс",
    today: "Сегодня",
    unnamed: "Без названия",
    viewCard: "Карточка",
  },
  en: {
    boardError: "The process could not be loaded.",
    collapseList: "Collapse the list",
    create: "New",
    expandList: "Expand the list",
    hideGrid: "Hide the table",
    loadingBoard: "Loading the process…",
    noInteraction: "Pick an interaction on the left.",
    noProcess: "No process has been started for this interaction yet.",
    process: "Process",
    retry: "Retry",
    scale: "Scale",
    scales: { day: "D", month: "M", week: "W" },
    scaleTitles: {
      day: "By day",
      month: "By month",
      week: "By week",
    },
    showGrid: "Show the table",
    startProcess: "Start a process",
    today: "Today",
    unnamed: "Untitled",
    viewCard: "Card",
  },
} as const;

const collapsedStorageKey = "sova-interactions-list-collapsed";
const scaleOrder: GanttScale[] = ["day", "week", "month"];

function BoardState({
  label,
  onRetry,
  retryLabel,
}: {
  label: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-sm">
      <p>{label}</p>
      {onRetry && retryLabel ? (
        <Button
          colorScheme="neutral"
          onClick={onRetry}
          size="m"
          type="button"
          variant="outline"
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function InteractionsWorkspace() {
  const { locale, t } = useLocale();
  const { csrfToken, user } = useAuth();
  const text = copy[locale];
  // Ссылка из уведомления задаёт только начальный выбор: дальше пользователь
  // ходит по странице сам, и адрес за ним не следит.
  const searchParams = useSearchParams();
  const [linked] = useState(() => parseInteractionLink(searchParams));
  // Id — источник правды (взаимодействие можно выбрать и без списка, сразу
  // после создания), объект нужен только для заголовка и аудитории шаблона.
  const [selectedInteractionId, setSelectedInteractionId] = useState<
    string | null
  >(linked.interactionId);
  const [selectedInteraction, setSelectedInteraction] =
    useState<Interaction | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(linked.processId);
  const [isCreating, setIsCreating] = useState(false);
  const [editingInteraction, setEditingInteraction] =
    useState<Interaction | null>(null);
  const [viewingInteraction, setViewingInteraction] =
    useState<Interaction | null>(null);
  const [isStartingProcess, setIsStartingProcess] = useState(false);
  // Рабочий стол виден только авторизованному пользователю, а сессия приходит
  // клиентским запросом — на сервере этот компонент не рендерится.
  const [isListCollapsed, setIsListCollapsed] =
    usePersistedFlag(collapsedStorageKey);
  const [scale, setScale] = useState<GanttScale>("week");
  const [showGrid, setShowGrid] = useState(true);
  const ganttRef = useRef<WorkflowGanttHandle>(null);
  // Выбор храним идентификатором: объект из прошлого ответа доски устаревает
  // после каждой команды.
  const [selectedRow, setSelectedRow] = useState<{
    id: string;
    kind: BoardSelection["kind"];
  } | null>(linked.row);

  const toggleList = useCallback(
    () => setIsListCollapsed(!isListCollapsed),
    [isListCollapsed, setIsListCollapsed],
  );

  const instancesQuery = useQuery({
    queryKey: ["processes", "workflow-instances", selectedInteractionId],
    queryFn: () => getWorkflowInstances(selectedInteractionId!),
    enabled: selectedInteractionId !== null,
  });

  const instances = useMemo(
    () => instancesQuery.data?.results ?? [],
    [instancesQuery.data],
  );
  const activeInstanceId = instanceId ?? instances[0]?.id ?? null;

  const boardQuery = useQuery({
    queryKey: boardQueryKey(activeInstanceId ?? ""),
    queryFn: () => getWorkflowBoard(activeInstanceId!),
    enabled: activeInstanceId !== null,
  });

  // Аудитория шаблона определяется контрагентом: вуз — b2b, клиент — b2c.
  const audience: WorkflowAudience = selectedInteraction?.b2c_client
    ? "b2c"
    : "b2b";

  const selection = useMemo(
    () =>
      boardQuery.data ? findBoardSelection(boardQuery.data, selectedRow) : null,
    [boardQuery.data, selectedRow],
  );

  const handleSelectInteraction = useCallback((interaction: Interaction) => {
    setSelectedInteractionId(interaction.id);
    setSelectedInteraction(interaction);
    setInstanceId(null);
    setSelectedRow(null);
  }, []);

  const handleSelectRow = useCallback((next: BoardSelection) => {
    setSelectedRow(
      next.kind === "action"
        ? { id: next.action.id, kind: "action" }
        : { id: next.stage.id, kind: "stage" },
    );
  }, []);

  const closeDetails = useCallback(() => setSelectedRow(null), []);

  const hasBoard = Boolean(boardQuery.data) && instances.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-medium tracking-[-0.025em] sm:text-3xl">
          {t("interactions")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          {t("interactionsDescription")}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {isCreating && user ? (
          <NewInteractionDialog
            csrfToken={csrfToken}
            currentUser={user}
            onClose={() => setIsCreating(false)}
            onCreated={(interactionId) => {
              setIsCreating(false);
              // Объект придёт из списка, когда обновлённая страница его вернёт.
              setSelectedInteractionId(interactionId);
              setSelectedInteraction(null);
              setInstanceId(null);
              setSelectedRow(null);
            }}
          />
        ) : null}

        {editingInteraction && user ? (
          <NewInteractionDialog
            key={editingInteraction.id}
            csrfToken={csrfToken}
            currentUser={user}
            editInteraction={editingInteraction}
            onClose={() => setEditingInteraction(null)}
            onCreated={() => setEditingInteraction(null)}
            onUpdated={() => setEditingInteraction(null)}
          />
        ) : null}

        {viewingInteraction ? (
          <InteractionCardDialog
            interaction={viewingInteraction}
            key={viewingInteraction.id}
            onClose={() => setViewingInteraction(null)}
            onEdit={(interaction) => {
              setViewingInteraction(null);
              setEditingInteraction(interaction);
            }}
          />
        ) : null}

        {isStartingProcess && selectedInteractionId ? (
          <StartProcessDialog
            audience={audience}
            csrfToken={csrfToken}
            interactionId={selectedInteractionId}
            onClose={() => setIsStartingProcess(false)}
            onStarted={(workflowInstanceId) => {
              setIsStartingProcess(false);
              // Показываем только что запущенный процесс, а не первый в списке.
              setInstanceId(workflowInstanceId);
              setSelectedRow(null);
            }}
          />
        ) : null}

        <aside
          className={cn(
            "bg-card flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm transition-[height,width] duration-200 ease-in-out lg:w-80",
            isListCollapsed
              ? "h-12 lg:h-auto lg:w-14"
              : "h-[min(24rem,45svh)] lg:h-auto",
          )}
        >
          <div
            className={cn(
              "flex h-12 shrink-0 items-center gap-2 border-b",
              isListCollapsed
                ? "justify-between px-2 lg:justify-center lg:px-0"
                : "px-2",
            )}
          >
            <Button
              aria-controls="interactions-list"
              aria-expanded={!isListCollapsed}
              aria-label={isListCollapsed ? text.expandList : text.collapseList}
              colorScheme="neutral"
              onClick={toggleList}
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
            {user ? (
              <Button
                className={cn("flex-1", isListCollapsed && "lg:hidden")}
                onClick={() => setIsCreating(true)}
                size="m"
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                {text.create}
              </Button>
            ) : null}
          </div>

          {/*
          В свёрнутом виде список прячем стилями, а не размонтированием: он
          продолжает отдавать наружу объект выбранного взаимодействия.
        */}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col p-3",
              isListCollapsed && "hidden",
            )}
            id="interactions-list"
          >
            <InteractionList
              onResolve={setSelectedInteraction}
              onEdit={setEditingInteraction}
              onSelect={handleSelectInteraction}
              onView={setViewingInteraction}
              selectedId={selectedInteractionId}
            />
          </div>
        </aside>

        <section className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="flex h-12 shrink-0 flex-wrap items-center gap-2 border-b px-3">
            {selectedInteraction ? (
              <>
                <p className="min-w-0 truncate text-sm font-medium">
                  {interactionTitle(selectedInteraction, text.unnamed)}
                </p>
                <Button
                  colorScheme="neutral"
                  onClick={() => setViewingInteraction(selectedInteraction)}
                  size="s"
                  type="button"
                  variant="outline"
                >
                  <IdCard aria-hidden="true" className="size-3.5" />
                  {text.viewCard}
                </Button>
              </>
            ) : null}

            {instances.length > 1 ? (
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground sr-only sm:not-sr-only">
                  {text.process}
                </span>
                <select
                  className="border-input bg-background h-8 max-w-56 rounded-lg border px-2 text-sm"
                  onChange={(event) => {
                    setInstanceId(event.target.value);
                    setSelectedRow(null);
                  }}
                  value={activeInstanceId ?? ""}
                >
                  {instances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.workflow.name} ·{" "}
                      {new Date(instance.started_at).toLocaleDateString(
                        locale === "ru" ? "ru-RU" : "en-GB",
                      )}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {selectedInteractionId ? (
              <Button
                colorScheme={instances.length === 0 ? "accent" : "neutral"}
                onClick={() => setIsStartingProcess(true)}
                size="s"
                type="button"
                variant={instances.length === 0 ? "primary" : "outline"}
              >
                <Play aria-hidden="true" className="size-3.5" />
                {text.startProcess}
              </Button>
            ) : null}

            <div className="ml-auto flex items-center gap-2">
              <div
                aria-label={text.scale}
                className="flex items-center gap-0.5 rounded-lg border p-0.5"
                role="group"
              >
                {scaleOrder.map((value) => (
                  <Button
                    aria-pressed={scale === value}
                    className="min-w-8 px-2"
                    colorScheme={scale === value ? "accent" : "neutral"}
                    disabled={!hasBoard}
                    key={value}
                    onClick={() => setScale(value)}
                    size="s"
                    title={text.scaleTitles[value]}
                    type="button"
                    variant={scale === value ? "secondary" : "ghost"}
                  >
                    {text.scales[value]}
                  </Button>
                ))}
              </div>

              <Button
                aria-label={text.today}
                colorScheme="neutral"
                disabled={!hasBoard}
                onClick={() => ganttRef.current?.showToday()}
                size="icon"
                title={text.today}
                type="button"
                variant="outline"
              >
                <CalendarDays aria-hidden="true" className="size-4" />
              </Button>

              <Button
                aria-label={showGrid ? text.hideGrid : text.showGrid}
                aria-pressed={showGrid}
                colorScheme={showGrid ? "accent" : "neutral"}
                disabled={!hasBoard}
                onClick={() => setShowGrid((visible) => !visible)}
                size="icon"
                title={showGrid ? text.hideGrid : text.showGrid}
                type="button"
                variant={showGrid ? "secondary" : "outline"}
              >
                <TableProperties aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>

          {selectedInteraction ? (
            <InteractionContactsPanel
              key={selectedInteraction.id}
              csrfToken={csrfToken}
              interaction={selectedInteraction}
            />
          ) : null}

          <div className="relative flex min-h-0 flex-1">
            <div className="relative min-h-0 min-w-0 flex-1">
              {selectedInteractionId === null ? (
                <BoardState label={text.noInteraction} />
              ) : instancesQuery.isPending ? (
                <BoardState label={text.loadingBoard} />
              ) : instancesQuery.isError ? (
                <BoardState
                  label={text.boardError}
                  onRetry={() => void instancesQuery.refetch()}
                  retryLabel={text.retry}
                />
              ) : instances.length === 0 ? (
                <BoardState label={text.noProcess} />
              ) : boardQuery.isPending ? (
                <p className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                  {text.loadingBoard}
                </p>
              ) : boardQuery.isError ? (
                <BoardState
                  label={text.boardError}
                  onRetry={() => void boardQuery.refetch()}
                  retryLabel={text.retry}
                />
              ) : boardQuery.data ? (
                <WorkflowGantt
                  board={boardQuery.data}
                  className="h-full"
                  onSelect={handleSelectRow}
                  ref={ganttRef}
                  scale={scale}
                  showGrid={showGrid}
                />
              ) : null}
            </div>

            {selection && boardQuery.data ? (
              <BoardDetailsDrawer
                csrfToken={csrfToken}
                onClose={closeDetails}
                selection={selection}
                workflowInstanceId={boardQuery.data.id}
                interaction={boardQuery.data.interaction}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
