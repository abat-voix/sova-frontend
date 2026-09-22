"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Building2,
  List,
  LoaderCircle,
  Map as MapIcon,
  MapPin,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  OrganizationDetails,
  type OrganizationDetailsLabels,
} from "@/components/organizations/organization-details";
import { OrganizationSheet } from "@/components/organizations/organization-sheet";
import { OrganizationsMap } from "@/components/organizations/organizations-map";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { StatusChip } from "@/components/ui/status-chip";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  getUniversities,
  getUniversity,
  getUniversityMapPoints,
} from "@/lib/api/catalog/universities";
import { useLocale } from "@/providers/locale-provider";
import type { InteractionsFilter, University } from "@/types/university";

const compactViewportQuery = "(max-width: 1023.98px)";
const panelHeadingId = "organization-panel-title";
const sheetHeadingId = "organization-sheet-title";

type ViewMode = "list" | "map";

const interactionsFilters = [
  { labelKey: "interactionsFilterAll", value: "all" },
  { labelKey: "interactionsFilterWith", value: "with" },
  { labelKey: "interactionsFilterWithout", value: "without" },
] as const satisfies readonly {
  labelKey: string;
  value: InteractionsFilter;
}[];

const copy = {
  ru: {
    title: "Организации",
    description:
      "Университеты и партнёрские организации, с которыми ведётся работа.",
    list: "Список",
    map: "Карта",
    organizationsCount: "организаций",
    active: "Активно",
    hasInteractions: "Есть взаимодействия",
    inactive: "Неактивно",
    interactionsFilter: "Взаимодействия",
    interactionsFilterAll: "Все",
    interactionsFilterWith: "Есть",
    interactionsFilterWithout: "Нет",
    inn: "ИНН",
    noInteractions: "Без взаимодействий",
    noContacts: "Контакты не указаны",
    selectedOrganization: "Выбранный вуз",
    selectMarker: "Выберите маркер на карте",
    selectMarkerDescription:
      "По нажатию загрузим полную информацию об организации.",
    close: "Закрыть",
    loadMore: "Подгрузить",
    loading: "Загружаем организации…",
    loadingDetails: "Загружаем данные организации…",
    loadingMore: "Загружаем…",
    listError: "Не удалось загрузить список организаций.",
    mapError: "Не удалось загрузить точки на карте.",
    detailsError: "Не удалось загрузить данные организации.",
    retry: "Повторить",
    searchLabel: "Поиск университетов",
    searchPlaceholder: "Название, ИНН, email или внешний код",
    clearSearch: "Очистить поиск",
    noResults: "По вашему запросу ничего не найдено.",
  },
  en: {
    title: "Organizations",
    description:
      "Universities and partner organizations currently working with the team.",
    list: "List",
    map: "Map",
    organizationsCount: "organizations",
    active: "Active",
    hasInteractions: "Has interactions",
    inactive: "Inactive",
    interactionsFilter: "Interactions",
    interactionsFilterAll: "All",
    interactionsFilterWith: "Yes",
    interactionsFilterWithout: "No",
    inn: "Tax ID",
    noInteractions: "No interactions",
    noContacts: "No contacts provided",
    selectedOrganization: "Selected university",
    selectMarker: "Select a marker on the map",
    selectMarkerDescription:
      "Full organization details will load after you select a point.",
    close: "Close",
    loadMore: "Load more",
    loading: "Loading organizations…",
    loadingDetails: "Loading organization details…",
    loadingMore: "Loading…",
    listError: "The organization list could not be loaded.",
    mapError: "The map points could not be loaded.",
    detailsError: "The organization details could not be loaded.",
    retry: "Retry",
    searchLabel: "Search universities",
    searchPlaceholder: "Name, tax ID, email, or external code",
    clearSearch: "Clear search",
    noResults: "No universities matched your search.",
  },
} as const;

function OrganizationCard({
  organization,
  labels,
}: {
  organization: University;
  labels: OrganizationDetailsLabels;
}) {
  return (
    <article className="bg-card rounded-xl border p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
          <Building2 aria-hidden="true" className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="leading-5 font-medium">{organization.name}</h2>
            <span className="flex flex-wrap gap-2">
              <StatusChip
                tone={organization.has_interactions ? "accent" : "neutral"}
              >
                {organization.has_interactions
                  ? labels.hasInteractions
                  : labels.noInteractions}
              </StatusChip>
              <StatusChip
                tone={organization.is_active ? "positive" : "neutral"}
              >
                {organization.is_active ? labels.active : labels.inactive}
              </StatusChip>
            </span>
          </div>
          {organization.city ? (
            <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              {organization.city}
            </p>
          ) : null}
          {organization.inn ? (
            <p className="text-muted-foreground mt-2 text-xs">
              {labels.inn}: {organization.inn}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RequestState({
  label,
  retryLabel,
  onRetry,
}: {
  label: string;
  retryLabel?: string;
  onRetry?: () => void;
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

export function OrganizationsWorkspace() {
  const { locale } = useLocale();
  const text = copy[locale];
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [interactions, setInteractions] = useState<InteractionsFilter>("all");
  const isCompactViewport = useMediaQuery(compactViewportQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const universitiesQuery = useInfiniteQuery({
    queryKey: [
      "catalog",
      "universities",
      { interactions, search: debouncedSearch },
    ],
    queryFn: ({ pageParam }) =>
      getUniversities(pageParam, debouncedSearch, interactions),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });
  const mapQuery = useQuery({
    queryKey: [
      "catalog",
      "universities",
      "map",
      { interactions, search: debouncedSearch },
    ],
    queryFn: () => getUniversityMapPoints(debouncedSearch, interactions),
    enabled: view === "map",
  });
  const selectedUniversityQuery = useQuery({
    queryKey: ["catalog", "universities", selectedId],
    queryFn: () => getUniversity(selectedId!),
    enabled: view === "map" && selectedId !== null,
  });

  const organizations = useMemo(
    () => universitiesQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [universitiesQuery.data],
  );
  const total = universitiesQuery.data?.pages[0]?.count;
  const detailLabels: OrganizationDetailsLabels = {
    active: text.active,
    hasInteractions: text.hasInteractions,
    inactive: text.inactive,
    inn: text.inn,
    noContacts: text.noContacts,
    noInteractions: text.noInteractions,
  };
  const clearSelection = useCallback(() => setSelectedId(null), []);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setSelectedId(null);
  }, []);
  // Выбранный вуз может не пройти новый отбор — его карточка осталась бы
  // открытой в отрыве от карты.
  const handleInteractionsChange = useCallback((value: InteractionsFilter) => {
    setInteractions(value);
    setSelectedId(null);
  }, []);

  const selectedContent = selectedUniversityQuery.isPending ? (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      {text.loadingDetails}
    </p>
  ) : selectedUniversityQuery.isError ? (
    <RequestState
      label={text.detailsError}
      onRetry={() => void selectedUniversityQuery.refetch()}
      retryLabel={text.retry}
    />
  ) : selectedUniversityQuery.data ? (
    <OrganizationDetails
      headingId={isCompactViewport ? sheetHeadingId : panelHeadingId}
      labels={detailLabels}
      organization={selectedUniversityQuery.data}
    />
  ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
            {text.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
            {text.description}
          </p>
        </div>

        <div
          aria-label={locale === "ru" ? "Режим отображения" : "View mode"}
          className="bg-card flex w-fit items-center gap-1 rounded-xl border p-1 shadow-sm"
          role="group"
        >
          <Button
            aria-pressed={view === "list"}
            colorScheme={view === "list" ? "accent" : "neutral"}
            onClick={() => setView("list")}
            size="m"
            type="button"
            variant={view === "list" ? "secondary" : "ghost"}
          >
            <List aria-hidden="true" className="size-4" />
            {text.list}
          </Button>
          <Button
            aria-pressed={view === "map"}
            colorScheme={view === "map" ? "accent" : "neutral"}
            onClick={() => setView("map")}
            size="m"
            type="button"
            variant={view === "map" ? "secondary" : "ghost"}
          >
            <MapIcon aria-hidden="true" className="size-4" />
            {text.map}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label={text.searchLabel}
          className="w-full max-w-2xl min-w-64 flex-1"
          clearLabel={text.clearSearch}
          onChange={handleSearchChange}
          placeholder={text.searchPlaceholder}
          value={search}
        />

        <div
          aria-label={text.interactionsFilter}
          className="bg-card flex w-fit items-center gap-1 rounded-xl border p-1 shadow-sm"
          role="group"
        >
          {interactionsFilters.map(({ labelKey, value }) => (
            <Button
              aria-pressed={interactions === value}
              colorScheme={interactions === value ? "accent" : "neutral"}
              key={value}
              onClick={() => handleInteractionsChange(value)}
              size="m"
              type="button"
              variant={interactions === value ? "secondary" : "ghost"}
            >
              {text[labelKey]}
            </Button>
          ))}
        </div>
      </div>

      {total !== undefined ? (
        <p className="text-muted-foreground text-sm">
          {total} {text.organizationsCount}
        </p>
      ) : null}

      {view === "list" ? (
        universitiesQuery.isPending ? (
          <RequestState label={text.loading} />
        ) : universitiesQuery.isError ? (
          <RequestState
            label={text.listError}
            onRetry={() => void universitiesQuery.refetch()}
            retryLabel={text.retry}
          />
        ) : organizations.length === 0 ? (
          <RequestState label={text.noResults} />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {organizations.map((organization) => (
                <OrganizationCard
                  key={organization.id}
                  labels={detailLabels}
                  organization={organization}
                />
              ))}
            </div>
            {universitiesQuery.hasNextPage ? (
              <div className="flex justify-center pt-1">
                <Button
                  colorScheme="neutral"
                  disabled={universitiesQuery.isFetchingNextPage}
                  onClick={() => void universitiesQuery.fetchNextPage()}
                  size="l"
                  type="button"
                  variant="outline"
                >
                  {universitiesQuery.isFetchingNextPage ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : null}
                  {universitiesQuery.isFetchingNextPage
                    ? text.loadingMore
                    : text.loadMore}
                </Button>
              </div>
            ) : null}
          </>
        )
      ) : mapQuery.isPending ? (
        <RequestState label={text.loading} />
      ) : mapQuery.isError ? (
        <RequestState
          label={text.mapError}
          onRetry={() => void mapQuery.refetch()}
          retryLabel={text.retry}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <OrganizationsMap
            onSelect={setSelectedId}
            organizations={mapQuery.data}
            selectedId={selectedId}
          />
          <aside
            aria-label={text.selectedOrganization}
            className="bg-card hidden rounded-xl border p-5 shadow-sm lg:block"
          >
            {selectedId ? (
              <>
                <p className="text-muted-foreground mb-5 text-xs font-medium tracking-[0.08em] uppercase">
                  {text.selectedOrganization}
                </p>
                {selectedContent}
              </>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
                  <Building2 aria-hidden="true" className="size-6" />
                </span>
                <h2 className="mt-4 font-medium">{text.selectMarker}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {text.selectMarkerDescription}
                </p>
              </div>
            )}
          </aside>
          {isCompactViewport && selectedId ? (
            <OrganizationSheet
              closeLabel={text.close}
              labelledBy={sheetHeadingId}
              onClose={clearSelection}
            >
              {selectedContent}
            </OrganizationSheet>
          ) : null}
        </div>
      )}
    </div>
  );
}
