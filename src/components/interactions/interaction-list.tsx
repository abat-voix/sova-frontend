"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Eye,
  ListFilter,
  LoaderCircle,
  MessageCircle,
  MoreVertical,
  Pencil,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { ApiError } from "@/lib/api/http";
import {
  getInteractions,
  interactionsInfiniteQueryKey,
  type InteractionCounterpartyFilter,
} from "@/lib/api/interactions/interactions";
import {
  getWorkflowInstancesForInteractions,
  workflowInstancesForInteractionsQueryKey,
} from "@/lib/api/processes/board";
import {
  getInteractionChat,
  interactionChatQueryKey,
} from "@/lib/api/messaging/messaging";
import { isAccessDenied } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import type { Interaction, InteractionShort } from "@/types/workflow-board";

const copy = {
  ru: {
    accessDenied: "Доступ ограничен: список недоступен для вашей роли.",
    actions: "Действия",
    chatCreate: "Создать чат",
    chatError: "Не удалось узнать о чате.",
    chatLoading: "Проверяем чат…",
    chatNoAccess: "Нет доступа к чату этого взаимодействия.",
    chatOpen: "Открыть чат",
    clearSearch: "Очистить поиск",
    completed: "Завершено",
    completedFilter: "Завершённые",
    interactionsCount: "взаимодействий",
    edit: "Редактировать взаимодействие",
    listError: "Не удалось загрузить список взаимодействий.",
    loadMore: "Подгрузить",
    loading: "Загружаем взаимодействия…",
    loadingMore: "Загружаем…",
    noResults: "По вашему запросу ничего не найдено.",
    processFilter: "Статус процесса",
    running: "В работе",
    runningFilter: "В работе",
    allFilter: "Все статусы",
    retry: "Повторить",
    searchLabel: "Поиск взаимодействий",
    searchPlaceholder: "Организация, клиент или ответственный",
    unassigned: "не назначен",
    unnamed: "Без названия",
    view: "Карточка взаимодействия",
  },
  en: {
    accessDenied: "Access restricted: your role can't see this list.",
    actions: "Actions",
    chatCreate: "Create chat",
    chatError: "Couldn't check the chat.",
    chatLoading: "Checking the chat…",
    chatNoAccess: "You don't have access to this interaction's chat.",
    chatOpen: "Open chat",
    clearSearch: "Clear search",
    completed: "Completed",
    completedFilter: "Completed",
    interactionsCount: "interactions",
    edit: "Edit interaction",
    listError: "The interaction list could not be loaded.",
    loadMore: "Load more",
    loading: "Loading interactions…",
    loadingMore: "Loading…",
    noResults: "Nothing matched your search.",
    processFilter: "Process status",
    running: "In progress",
    runningFilter: "In progress",
    allFilter: "All statuses",
    retry: "Retry",
    searchLabel: "Search interactions",
    searchPlaceholder: "Organization, client, or responsible",
    unassigned: "unassigned",
    unnamed: "Untitled",
    view: "Interaction card",
  },
} as const;

type ProcessFilter = "all" | "running" | "completed";

function latestProcessStatuses(
  interactionIds: Set<string>,
  instances: { interaction: { id: string }; status: string }[],
) {
  const statuses = new Map<string, ProcessFilter>();

  for (const instance of instances) {
    const interactionId = instance.interaction.id;
    if (
      !interactionIds.has(interactionId) ||
      statuses.has(interactionId) ||
      (instance.status !== "running" && instance.status !== "completed")
    ) {
      continue;
    }
    statuses.set(interactionId, instance.status);
  }

  return statuses;
}

/** Принимает и полное взаимодействие, и краткое: читаются только контрагенты. */
export function interactionTitle(
  interaction: InteractionShort,
  fallback: string,
) {
  return (
    interaction.organization?.name ??
    interaction.b2c_client?.full_name ??
    fallback
  );
}

/** Имена действующих КАМов через запятую; пустая строка — никто не назначен. */
export function responsibleNames(interaction: Interaction) {
  return interaction.current_responsibles
    .map((responsible) => responsible.manager.full_name)
    .join(", ");
}

function ListState({
  label,
  onRetry,
  retryLabel,
}: {
  label: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 px-3 py-8 text-center text-sm">
      <p>{label}</p>
      {onRetry && retryLabel ? (
        <Button
          colorScheme="neutral"
          onClick={onRetry}
          size="s"
          type="button"
          variant="outline"
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

type InteractionListProps = {
  counterpartyFilter?: InteractionCounterpartyFilter;
  /**
   * Выбранный снаружи id нашёлся в загруженных данных. Так рабочий стол
   * получает объект взаимодействия, которое выбрали не кликом по списку —
   * например, только что созданное.
   */
  onResolve: (interaction: Interaction) => void;
  onCreateChat?: (interaction: Interaction) => void;
  onEdit?: (interaction: Interaction) => void;
  onOpenChat?: (conversationId: string) => void;
  onSelect: (interaction: Interaction) => void;
  onView?: (interaction: Interaction) => void;
  selectedId: string | null;
};

/** Пункт «Чат»: сам решает, предложить создание чата или открыть существующий. */
function ChatMenuItem({
  interaction,
  onCreateChat,
  onOpenChat,
}: {
  interaction: Interaction;
  onCreateChat: (interaction: Interaction) => void;
  onOpenChat: (conversationId: string) => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const query = useQuery({
    queryKey: interactionChatQueryKey(interaction.id),
    queryFn: () => getInteractionChat(interaction.id),
    retry: false,
  });

  if (query.isPending) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 px-2.5 py-2 text-sm">
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        {text.chatLoading}
      </p>
    );
  }

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <button
          className="hover:bg-secondary flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm"
          onClick={() => onCreateChat(interaction)}
          role="menuitem"
          type="button"
        >
          <MessageCircle aria-hidden="true" className="size-3.5" />
          {text.chatCreate}
        </button>
      );
    }
    if (query.error instanceof ApiError && query.error.status === 403) {
      return (
        <p className="text-muted-foreground px-2.5 py-2 text-xs">
          {text.chatNoAccess}
        </p>
      );
    }
    return (
      <p className="text-muted-foreground px-2.5 py-2 text-xs">
        {text.chatError}
      </p>
    );
  }

  if (!query.data) return null;

  return (
    <button
      className="hover:bg-secondary flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm"
      onClick={() => onOpenChat(query.data.id)}
      role="menuitem"
      type="button"
    >
      <MessageCircle aria-hidden="true" className="size-3.5" />
      {text.chatOpen}
    </button>
  );
}

/** Меню «три точки» карточки взаимодействия: просмотр, редактирование, чат. */
function InteractionCardMenu({
  interaction,
  onCreateChat,
  onEdit,
  onOpenChat,
  onView,
}: {
  interaction: Interaction;
  onCreateChat?: (interaction: Interaction) => void;
  onEdit?: (interaction: Interaction) => void;
  onOpenChat?: (conversationId: string) => void;
  onView?: (interaction: Interaction) => void;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={text.actions}
        colorScheme="neutral"
        onClick={() => setIsOpen((open) => !open)}
        size="icon"
        title={text.actions}
        type="button"
        variant="ghost"
      >
        <MoreVertical aria-hidden="true" className="size-3.5" />
      </Button>

      {isOpen ? (
        <div
          className="bg-card absolute right-0 z-20 mt-1 w-52 rounded-xl border p-1 shadow-lg"
          role="menu"
        >
          {onView ? (
            <button
              className="hover:bg-secondary flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm"
              onClick={() => {
                setIsOpen(false);
                onView(interaction);
              }}
              role="menuitem"
              type="button"
            >
              <Eye aria-hidden="true" className="size-3.5" />
              {text.view}
            </button>
          ) : null}
          {onEdit ? (
            <button
              className="hover:bg-secondary flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm"
              onClick={() => {
                setIsOpen(false);
                onEdit(interaction);
              }}
              role="menuitem"
              type="button"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
              {text.edit}
            </button>
          ) : null}
          {onCreateChat && onOpenChat && isOpen ? (
            <ChatMenuItem
              interaction={interaction}
              onCreateChat={(target) => {
                setIsOpen(false);
                onCreateChat(target);
              }}
              onOpenChat={(conversationId) => {
                setIsOpen(false);
                onOpenChat(conversationId);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Поиск, пагинация и выбор взаимодействия. Запрос живёт здесь: наружу нужен
 * только выбранный элемент.
 */
export function InteractionList({
  counterpartyFilter = null,
  onResolve,
  onCreateChat,
  onEdit,
  onOpenChat,
  onSelect,
  onView,
  selectedId,
}: InteractionListProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [processFilter, setProcessFilter] = useState<ProcessFilter>("all");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const interactionsQuery = useInfiniteQuery({
    queryKey: interactionsInfiniteQueryKey(debouncedSearch, counterpartyFilter),
    queryFn: ({ pageParam }) =>
      getInteractions(pageParam, debouncedSearch, counterpartyFilter),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });

  const interactions = useMemo(
    () => interactionsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [interactionsQuery.data],
  );
  const total = interactionsQuery.data?.pages[0]?.count;
  const interactionIds = useMemo(
    () => interactions.map((interaction) => interaction.id),
    [interactions],
  );
  const interactionIdSet = useMemo(
    () => new Set(interactionIds),
    [interactionIds],
  );
  const workflowInstancesQuery = useQuery({
    queryKey: workflowInstancesForInteractionsQueryKey(interactionIds),
    queryFn: () => getWorkflowInstancesForInteractions(interactionIds),
    enabled: interactionIds.length > 0,
  });
  const processStatusByInteractionId = useMemo(
    () =>
      latestProcessStatuses(
        interactionIdSet,
        workflowInstancesQuery.data?.results ?? [],
      ),
    [interactionIdSet, workflowInstancesQuery.data],
  );
  const filteredInteractions = useMemo(
    () =>
      processFilter === "all"
        ? interactions
        : interactions.filter(
            (interaction) =>
              processStatusByInteractionId.get(interaction.id) ===
              processFilter,
          ),
    [interactions, processFilter, processStatusByInteractionId],
  );
  const selected = selectedId
    ? interactions.find((interaction) => interaction.id === selectedId)
    : undefined;

  useEffect(() => {
    if (selected) onResolve(selected);
  }, [onResolve, selected]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="space-y-2">
        <SearchInput
          aria-label={text.searchLabel}
          clearLabel={text.clearSearch}
          onChange={setSearch}
          placeholder={text.searchPlaceholder}
          value={search}
        />
        <div
          aria-label={text.processFilter}
          className="flex gap-1"
          role="group"
        >
          {(
            [
              ["all", text.allFilter, ListFilter],
              ["running", text.runningFilter, LoaderCircle],
              ["completed", text.completedFilter, CheckCircle2],
            ] as const
          ).map(([filter, label, Icon]) => (
            <Button
              aria-label={label}
              aria-pressed={processFilter === filter}
              className="size-6 min-w-0 p-0"
              colorScheme="neutral"
              key={filter}
              onClick={() => setProcessFilter(filter)}
              size="s"
              title={label}
              type="button"
              variant={processFilter === filter ? "secondary" : "ghost"}
            >
              <Icon aria-hidden="true" className="size-3.5" />
            </Button>
          ))}
        </div>
        {total !== undefined && processFilter === "all" ? (
          <p className="text-muted-foreground px-1 text-xs">
            {total} {text.interactionsCount}
          </p>
        ) : null}
      </div>

      <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
        {interactionsQuery.isPending ? (
          <ListState label={text.loading} />
        ) : isAccessDenied(interactionsQuery.error) ? (
          <ListState label={text.accessDenied} />
        ) : interactionsQuery.isError ? (
          <ListState
            label={text.listError}
            onRetry={() => void interactionsQuery.refetch()}
            retryLabel={text.retry}
          />
        ) : filteredInteractions.length === 0 ? (
          <ListState label={text.noResults} />
        ) : (
          <ul className="space-y-1.5">
            {filteredInteractions.map((interaction) => (
              <li key={interaction.id}>
                <div
                  className={cn(
                    "bg-card flex w-full rounded-lg border p-3 text-left transition-colors",
                    selectedId === interaction.id
                      ? "border-[var(--atmr-accent-primary)] bg-[var(--atmr-background-accent-soft)]"
                      : "hover:bg-secondary",
                  )}
                >
                  <button
                    aria-pressed={selectedId === interaction.id}
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelect(interaction)}
                    type="button"
                  >
                    <span className="flex items-start gap-2.5">
                      <Building2
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-[var(--atmr-accent-primary)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm leading-5 font-medium">
                          {interactionTitle(interaction, text.unnamed)}
                        </span>
                        {interaction.number ? (
                          <span className="text-muted-foreground mt-0.5 block text-xs">
                            № {interaction.number}
                          </span>
                        ) : null}
                        {processStatusByInteractionId.get(interaction.id) ? (
                          <span
                            className={cn(
                              "mt-1.5 flex items-center gap-1 text-xs",
                              processStatusByInteractionId.get(
                                interaction.id,
                              ) === "completed"
                                ? "text-emerald-600"
                                : "text-[var(--atmr-accent-primary)]",
                            )}
                          >
                            {processStatusByInteractionId.get(
                              interaction.id,
                            ) === "completed" ? (
                              <CheckCircle2
                                aria-hidden="true"
                                className="size-3.5 shrink-0"
                              />
                            ) : (
                              <LoaderCircle
                                aria-hidden="true"
                                className="size-3.5 shrink-0"
                              />
                            )}
                            {processStatusByInteractionId.get(
                              interaction.id,
                            ) === "completed"
                              ? text.completed
                              : text.running}
                          </span>
                        ) : null}
                        <span className="mt-1.5 flex items-center gap-2">
                          <span className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1 text-xs">
                            <User
                              aria-hidden="true"
                              className="size-3 shrink-0"
                            />
                            <span className="truncate">
                              {responsibleNames(interaction) || text.unassigned}
                            </span>
                          </span>
                          <Badge variant="neutral">
                            {interaction.directions_count} ·{" "}
                            {interaction.programs_count} ·{" "}
                            {interaction.products_count}
                          </Badge>
                        </span>
                      </span>
                    </span>
                  </button>
                  <span className="-mt-2 -mr-2 flex shrink-0 items-start">
                    <InteractionCardMenu
                      interaction={interaction}
                      onCreateChat={onCreateChat}
                      onEdit={onEdit}
                      onOpenChat={onOpenChat}
                      onView={onView}
                    />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {interactionsQuery.hasNextPage ? (
          <Button
            className="mt-2 w-full"
            colorScheme="neutral"
            disabled={interactionsQuery.isFetchingNextPage}
            onClick={() => void interactionsQuery.fetchNextPage()}
            size="s"
            type="button"
            variant="outline"
          >
            {interactionsQuery.isFetchingNextPage
              ? text.loadingMore
              : text.loadMore}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
