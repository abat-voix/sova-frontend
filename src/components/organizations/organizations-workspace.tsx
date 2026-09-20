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
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  getUniversities,
  getUniversity,
  getUniversityMapPoints,
} from "@/lib/api/catalog/universities";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import type { University } from "@/types/university";

const compactViewportQuery = "(max-width: 1023.98px)";
const panelHeadingId = "organization-panel-title";
const sheetHeadingId = "organization-sheet-title";

type ViewMode = "list" | "map";

const copy = {
  ru: {
    title: "Организации",
    description:
      "Университеты и партнёрские организации, с которыми ведётся работа.",
    list: "Список",
    map: "Карта",
    organizationsCount: "организаций",
    active: "Активно",
    inactive: "Неактивно",
    inn: "ИНН",
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
    inactive: "Inactive",
    inn: "Tax ID",
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
  activeLabel,
  inactiveLabel,
  innLabel,
}: {
  organization: University;
  activeLabel: string;
  inactiveLabel: string;
  innLabel: string;
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
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                organization.is_active
                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {organization.is_active ? activeLabel : inactiveLabel}
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
              {innLabel}: {organization.inn}
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
  const isCompactViewport = useMediaQuery(compactViewportQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const universitiesQuery = useInfiniteQuery({
    queryKey: ["catalog", "universities", { search: debouncedSearch }],
    queryFn: ({ pageParam }) => getUniversities(pageParam, debouncedSearch),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });
  const mapQuery = useQuery({
    queryKey: ["catalog", "universities", "map", { search: debouncedSearch }],
    queryFn: () => getUniversityMapPoints(debouncedSearch),
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
    inactive: text.inactive,
    inn: text.inn,
    noContacts: text.noContacts,
  };
  const clearSelection = useCallback(() => setSelectedId(null), []);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
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

      <SearchInput
        aria-label={text.searchLabel}
        className="max-w-2xl"
        clearLabel={text.clearSearch}
        onChange={handleSearchChange}
        placeholder={text.searchPlaceholder}
        value={search}
      />

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
                  activeLabel={text.active}
                  inactiveLabel={text.inactive}
                  innLabel={text.inn}
                  key={organization.id}
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
