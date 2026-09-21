"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Building2, LoaderCircle, Play, Plus, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BoardDetails } from "@/components/interactions/board-details";
import { NewInteractionDialog } from "@/components/interactions/new-interaction-dialog";
import { StartProcessDialog } from "@/components/interactions/start-process-dialog";
import { WorkflowGantt } from "@/components/interactions/workflow-gantt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { getInteractions } from "@/lib/api/interactions/interactions";
import {
  boardQueryKey,
  getWorkflowBoard,
  getWorkflowInstances,
} from "@/lib/api/processes/board";
import {
  findBoardSelection,
  type BoardSelection,
} from "@/lib/workflow/board-to-gantt";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Interaction, WorkflowAudience } from "@/types/workflow-board";

const copy = {
  ru: {
    boardError: "Не удалось загрузить процесс.",
    clearSearch: "Очистить поиск",
    details: "Детали",
    interactionsCount: "взаимодействий",
    listError: "Не удалось загрузить список взаимодействий.",
    loadMore: "Подгрузить",
    create: "Новое",
    loading: "Загружаем взаимодействия…",
    loadingBoard: "Загружаем процесс…",
    loadingMore: "Загружаем…",
    noInteraction: "Выберите взаимодействие слева.",
    noProcess: "По этому взаимодействию процесс ещё не запущен.",
    noResults: "По вашему запросу ничего не найдено.",
    process: "Процесс",
    responsible: "Ответственный",
    retry: "Повторить",
    searchLabel: "Поиск взаимодействий",
    searchPlaceholder: "Вуз, клиент или ответственный",
    startProcess: "Запустить процесс",
    title: "Взаимодействия",
    description:
      "Путь взаимодействия с вузом: этапы, действия, сроки и результаты.",
    unassigned: "не назначен",
    unnamed: "Без названия",
  },
  en: {
    boardError: "The process could not be loaded.",
    clearSearch: "Clear search",
    create: "New",
    details: "Details",
    interactionsCount: "interactions",
    listError: "The interaction list could not be loaded.",
    loadMore: "Load more",
    loading: "Loading interactions…",
    loadingBoard: "Loading the process…",
    loadingMore: "Loading…",
    noInteraction: "Pick an interaction on the left.",
    noProcess: "No process has been started for this interaction yet.",
    noResults: "Nothing matched your search.",
    process: "Process",
    responsible: "Responsible",
    retry: "Retry",
    searchLabel: "Search interactions",
    searchPlaceholder: "University, client, or responsible",
    startProcess: "Start a process",
    title: "Interactions",
    description:
      "The path of work with a university: stages, actions, dates, and results.",
    unassigned: "unassigned",
    unnamed: "Untitled",
  },
} as const;

function interactionTitle(interaction: Interaction, fallback: string) {
  return (
    interaction.university?.name ??
    interaction.b2c_client?.full_name ??
    fallback
  );
}

function RequestState({
  label,
  onRetry,
  retryLabel,
}: {
  label: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="bg-card text-muted-foreground flex min-h-40 flex-col items-center justify-center gap-4 rounded-xl border p-6 text-center text-sm">
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
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  const text = copy[locale];
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedInteractionId, setSelectedInteractionId] = useState<
    string | null
  >(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isStartingProcess, setIsStartingProcess] = useState(false);
  // Выбор храним идентификатором: объект из прошлого ответа доски устаревает
  // после каждой команды.
  const [selectedRow, setSelectedRow] = useState<{
    id: string;
    kind: BoardSelection["kind"];
  } | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const interactionsQuery = useInfiniteQuery({
    queryKey: ["interactions", "list", { search: debouncedSearch }],
    queryFn: ({ pageParam }) => getInteractions(pageParam, debouncedSearch),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });

  const instancesQuery = useQuery({
    queryKey: ["processes", "workflow-instances", selectedInteractionId],
    queryFn: () => getWorkflowInstances(selectedInteractionId!),
    enabled: selectedInteractionId !== null,
  });

  const instances = instancesQuery.data?.results ?? [];
  const activeInstanceId = instanceId ?? instances[0]?.id ?? null;

  const boardQuery = useQuery({
    queryKey: boardQueryKey(activeInstanceId ?? ""),
    queryFn: () => getWorkflowBoard(activeInstanceId!),
    enabled: activeInstanceId !== null,
  });

  const interactions = useMemo(
    () => interactionsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [interactionsQuery.data],
  );
  const total = interactionsQuery.data?.pages[0]?.count;

  const selectedInteraction = interactions.find(
    (interaction) => interaction.id === selectedInteractionId,
  );
  // Аудитория шаблона определяется контрагентом: вуз — b2b, клиент — b2c.
  const audience: WorkflowAudience = selectedInteraction?.b2c_client
    ? "b2c"
    : "b2b";

  const selection = useMemo(
    () =>
      boardQuery.data ? findBoardSelection(boardQuery.data, selectedRow) : null,
    [boardQuery.data, selectedRow],
  );

  const handleSelectInteraction = useCallback((id: string) => {
    setSelectedInteractionId(id);
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
            {text.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-base leading-7">
            {text.description}
          </p>
        </div>
        {user ? (
          <Button onClick={() => setIsCreating(true)} size="m" type="button">
            <Plus aria-hidden="true" className="size-4" />
            {text.create}
          </Button>
        ) : null}
      </div>

      {isCreating && user ? (
        <NewInteractionDialog
          csrfToken={csrfToken}
          currentUser={user}
          onClose={() => setIsCreating(false)}
          onCreated={(interactionId) => {
            setIsCreating(false);
            handleSelectInteraction(interactionId);
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

      <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <SearchInput
            aria-label={text.searchLabel}
            clearLabel={text.clearSearch}
            onChange={setSearch}
            placeholder={text.searchPlaceholder}
            value={search}
          />

          {total !== undefined ? (
            <p className="text-muted-foreground text-sm">
              {total} {text.interactionsCount}
            </p>
          ) : null}

          {interactionsQuery.isPending ? (
            <RequestState label={text.loading} />
          ) : interactionsQuery.isError ? (
            <RequestState
              label={text.listError}
              onRetry={() => void interactionsQuery.refetch()}
              retryLabel={text.retry}
            />
          ) : interactions.length === 0 ? (
            <RequestState label={text.noResults} />
          ) : (
            <ul className="space-y-2">
              {interactions.map((interaction) => (
                <li key={interaction.id}>
                  <button
                    aria-pressed={selectedInteractionId === interaction.id}
                    className={cn(
                      "bg-card w-full rounded-xl border p-4 text-left shadow-sm transition-colors",
                      selectedInteractionId === interaction.id
                        ? "border-[var(--atmr-accent-primary)] bg-[var(--atmr-background-accent-soft)]"
                        : "hover:bg-secondary",
                    )}
                    onClick={() => handleSelectInteraction(interaction.id)}
                    type="button"
                  >
                    <span className="flex items-start gap-3">
                      <Building2
                        aria-hidden="true"
                        className="mt-0.5 size-5 shrink-0 text-[var(--atmr-accent-primary)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block leading-5 font-medium">
                          {interactionTitle(interaction, text.unnamed)}
                        </span>
                        <span className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                          <User aria-hidden="true" className="size-3.5" />
                          {interaction.current_responsible?.manager.full_name ??
                            text.unassigned}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="neutral">
                            {interaction.directions_count} ·{" "}
                            {interaction.programs_count} ·{" "}
                            {interaction.products_count}
                          </Badge>
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {interactionsQuery.hasNextPage ? (
            <Button
              colorScheme="neutral"
              disabled={interactionsQuery.isFetchingNextPage}
              onClick={() => void interactionsQuery.fetchNextPage()}
              size="m"
              type="button"
              variant="outline"
            >
              {interactionsQuery.isFetchingNextPage
                ? text.loadingMore
                : text.loadMore}
            </Button>
          ) : null}
        </div>

        <div className="space-y-4">
          {selectedInteractionId === null ? (
            <RequestState label={text.noInteraction} />
          ) : instancesQuery.isPending ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              {text.loadingBoard}
            </p>
          ) : instancesQuery.isError ? (
            <RequestState
              label={text.boardError}
              onRetry={() => void instancesQuery.refetch()}
              retryLabel={text.retry}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {instances.length > 1 ? (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {text.process}
                    </span>
                    <select
                      className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
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
                ) : (
                  <span />
                )}

                <Button
                  onClick={() => setIsStartingProcess(true)}
                  size="m"
                  type="button"
                  variant={instances.length === 0 ? "primary" : "outline"}
                  colorScheme={instances.length === 0 ? "accent" : "neutral"}
                >
                  <Play aria-hidden="true" className="size-4" />
                  {text.startProcess}
                </Button>
              </div>

              {instances.length === 0 ? (
                <RequestState label={text.noProcess} />
              ) : boardQuery.isPending ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                  {text.loadingBoard}
                </p>
              ) : boardQuery.isError ? (
                <RequestState
                  label={text.boardError}
                  onRetry={() => void boardQuery.refetch()}
                  retryLabel={text.retry}
                />
              ) : boardQuery.data ? (
                <>
                  <WorkflowGantt
                    board={boardQuery.data}
                    onSelect={handleSelectRow}
                  />
                  <section
                    aria-label={text.details}
                    className="bg-card rounded-xl border p-5 shadow-sm"
                  >
                    <BoardDetails
                      csrfToken={csrfToken}
                      selection={selection}
                      workflowInstanceId={boardQuery.data.id}
                    />
                  </section>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
