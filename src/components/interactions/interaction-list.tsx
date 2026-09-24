"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Building2, Eye, Pencil, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  getInteractions,
  interactionsInfiniteQueryKey,
} from "@/lib/api/interactions/interactions";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import type { Interaction, InteractionShort } from "@/types/workflow-board";

const copy = {
  ru: {
    clearSearch: "Очистить поиск",
    interactionsCount: "взаимодействий",
    edit: "Редактировать взаимодействие",
    listError: "Не удалось загрузить список взаимодействий.",
    loadMore: "Подгрузить",
    loading: "Загружаем взаимодействия…",
    loadingMore: "Загружаем…",
    noResults: "По вашему запросу ничего не найдено.",
    retry: "Повторить",
    searchLabel: "Поиск взаимодействий",
    searchPlaceholder: "Вуз, клиент или ответственный",
    unassigned: "не назначен",
    unnamed: "Без названия",
    view: "Карточка взаимодействия",
  },
  en: {
    clearSearch: "Clear search",
    interactionsCount: "interactions",
    edit: "Edit interaction",
    listError: "The interaction list could not be loaded.",
    loadMore: "Load more",
    loading: "Loading interactions…",
    loadingMore: "Loading…",
    noResults: "Nothing matched your search.",
    retry: "Retry",
    searchLabel: "Search interactions",
    searchPlaceholder: "University, client, or responsible",
    unassigned: "unassigned",
    unnamed: "Untitled",
    view: "Interaction card",
  },
} as const;

/** Принимает и полное взаимодействие, и краткое: читаются только контрагенты. */
export function interactionTitle(
  interaction: InteractionShort,
  fallback: string,
) {
  return (
    interaction.university?.name ??
    interaction.b2c_client?.full_name ??
    fallback
  );
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
  /**
   * Выбранный снаружи id нашёлся в загруженных данных. Так рабочий стол
   * получает объект взаимодействия, которое выбрали не кликом по списку —
   * например, только что созданное.
   */
  onResolve: (interaction: Interaction) => void;
  onEdit?: (interaction: Interaction) => void;
  onSelect: (interaction: Interaction) => void;
  onView?: (interaction: Interaction) => void;
  selectedId: string | null;
};

/**
 * Поиск, пагинация и выбор взаимодействия. Запрос живёт здесь: наружу нужен
 * только выбранный элемент.
 */
export function InteractionList({
  onResolve,
  onEdit,
  onSelect,
  onView,
  selectedId,
}: InteractionListProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const interactionsQuery = useInfiniteQuery({
    queryKey: interactionsInfiniteQueryKey(debouncedSearch),
    queryFn: ({ pageParam }) => getInteractions(pageParam, debouncedSearch),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });

  const interactions = useMemo(
    () => interactionsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [interactionsQuery.data],
  );
  const total = interactionsQuery.data?.pages[0]?.count;
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
        {total !== undefined ? (
          <p className="text-muted-foreground px-1 text-xs">
            {total} {text.interactionsCount}
          </p>
        ) : null}
      </div>

      <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
        {interactionsQuery.isPending ? (
          <ListState label={text.loading} />
        ) : interactionsQuery.isError ? (
          <ListState
            label={text.listError}
            onRetry={() => void interactionsQuery.refetch()}
            retryLabel={text.retry}
          />
        ) : interactions.length === 0 ? (
          <ListState label={text.noResults} />
        ) : (
          <ul className="space-y-1.5">
            {interactions.map((interaction) => (
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
                        <span className="mt-1.5 flex items-center gap-2">
                          <span className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1 text-xs">
                            <User
                              aria-hidden="true"
                              className="size-3 shrink-0"
                            />
                            <span className="truncate">
                              {interaction.current_responsible?.manager
                                .full_name ?? text.unassigned}
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
                    {onView ? (
                      <Button
                        aria-label={text.view}
                        colorScheme="neutral"
                        onClick={() => onView(interaction)}
                        size="icon"
                        title={text.view}
                        type="button"
                        variant="ghost"
                      >
                        <Eye aria-hidden="true" className="size-3.5" />
                      </Button>
                    ) : null}
                    {onEdit ? (
                      <Button
                        aria-label={text.edit}
                        colorScheme="neutral"
                        onClick={() => onEdit(interaction)}
                        size="icon"
                        title={text.edit}
                        type="button"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                    ) : null}
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
