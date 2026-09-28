"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Building2,
  List,
  LoaderCircle,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  OrganizationDetails,
  type OrganizationDetailsLabels,
} from "@/components/organizations/organization-details";
import { RankChip } from "@/components/catalog/rank-chip";
import { OrganizationContacts } from "@/components/organizations/organization-contacts";
import { OrganizationSheet } from "@/components/organizations/organization-sheet";
import { UniversityForm } from "@/components/organizations/university-form";
import { OrganizationsMap } from "@/components/organizations/organizations-map";
import { NewInteractionDialog } from "@/components/interactions/new-interaction-dialog";
import { InteractionLinkBadge } from "@/components/interactions/interaction-link-badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SearchInput } from "@/components/ui/search-input";
import { StatusChip } from "@/components/ui/status-chip";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  getUniversities,
  getUniversity,
  getUniversityMapPoints,
} from "@/lib/api/catalog/universities";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import type { RankFilter } from "@/lib/api/catalog/rank";
import { useLocale } from "@/providers/locale-provider";
import type { InteractionsFilter, University } from "@/types/university";

const compactViewportQuery = "(max-width: 1023.98px)";
const panelHeadingId = "organization-panel-title";
const sheetHeadingId = "organization-sheet-title";
const drawerHeadingId = "organization-drawer-title";

type ViewMode = "list" | "map";
type ActivityFilter = "all" | "active" | "inactive";

const interactionsFilters = [
  { labelKey: "interactionsFilterAll", value: "all" },
  { labelKey: "interactionsFilterWith", value: "with" },
  { labelKey: "interactionsFilterWithout", value: "without" },
] as const satisfies readonly {
  labelKey: string;
  value: InteractionsFilter;
}[];

const activityFilters = [
  { labelKey: "activityFilterAll", value: "all" },
  { labelKey: "activityFilterActive", value: "active" },
  { labelKey: "activityFilterInactive", value: "inactive" },
] as const satisfies readonly {
  labelKey: string;
  value: ActivityFilter;
}[];

const rankFilters = [
  { labelKey: "rankFilterAll", value: "all" },
  { labelKey: "rankFilterTop", value: "top10" },
  { labelKey: "rankFilterRanked", value: "ranked" },
  { labelKey: "rankFilterUnranked", value: "unranked" },
] as const satisfies readonly {
  labelKey: string;
  value: RankFilter;
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
    activityFilter: "Активность",
    activityFilterAll: "Все",
    activityFilterActive: "Активные",
    activityFilterInactive: "Неактивные",
    rankFilter: "Рейтинг",
    rankFilterAll: "Все",
    rankFilterTop: "Топ-10",
    rankFilterRanked: "С местом",
    rankFilterUnranked: "Без места",
    place: (rank: number) => `${rank} место`,
    inn: "ИНН",
    city: "Город",
    email: "Email",
    phone: "Телефон",
    externalCode: "Внешний код",
    createdAt: "Добавлена",
    updatedAt: "Обновлена",
    noValue: "Не указано",
    noInteractions: "Без взаимодействий",
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
    create: "Новый вуз",
    edit: "Изменить",
    created: "Вуз добавлен.",
    saved: "Изменения сохранены.",
    createInteraction: "Создать взаимодействие",
    openInteraction: "Открыть взаимодействие",
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
    activityFilter: "Activity",
    activityFilterAll: "All",
    activityFilterActive: "Active",
    activityFilterInactive: "Inactive",
    rankFilter: "Ranking",
    rankFilterAll: "All",
    rankFilterTop: "Top 10",
    rankFilterRanked: "Ranked",
    rankFilterUnranked: "Unranked",
    place: (rank: number) => `#${rank}`,
    inn: "Tax ID",
    city: "City",
    email: "Email",
    phone: "Phone",
    externalCode: "External code",
    createdAt: "Added",
    updatedAt: "Updated",
    noValue: "Not provided",
    noInteractions: "No interactions",
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
    create: "New university",
    edit: "Edit",
    created: "University added.",
    saved: "Changes saved.",
    createInteraction: "Create interaction",
    openInteraction: "Open interaction",
  },
} as const;

function OrganizationCard({
  canCreateInteraction,
  createInteractionLabel,
  organization,
  isSelected,
  labels,
  onCreateInteraction,
  onOpenInteractions,
  onSelect,
}: {
  canCreateInteraction: boolean;
  createInteractionLabel: string;
  organization: University;
  isSelected: boolean;
  labels: OrganizationDetailsLabels;
  onCreateInteraction: () => void;
  onOpenInteractions: () => void;
  onSelect: () => void;
}) {
  return (
    <article
      className={`bg-card rounded-xl border p-5 text-left shadow-sm transition-colors hover:border-[var(--atmr-accent-primary)] ${isSelected ? "border-[var(--atmr-accent-primary)]" : ""}`}
    >
      <button
        aria-pressed={isSelected}
        className="focus-visible:ring-ring w-full text-left outline-none focus-visible:ring-2"
        onClick={onSelect}
        type="button"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
            <Building2 aria-hidden="true" className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="leading-5 font-medium">{organization.name}</h2>
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
      </button>
      <span className="mt-2 flex flex-wrap gap-2">
        <RankChip label={labels.place} rank={organization.rank} />
        {organization.has_interactions ? (
          <InteractionLinkBadge
            label={labels.hasInteractions}
            onClick={onOpenInteractions}
          />
        ) : (
          <StatusChip tone="neutral">{labels.noInteractions}</StatusChip>
        )}
        <StatusChip tone={organization.is_active ? "positive" : "neutral"}>
          {organization.is_active ? labels.active : labels.inactive}
        </StatusChip>
      </span>
      {canCreateInteraction ? (
        <Button
          className="mt-4"
          onClick={onCreateInteraction}
          size="s"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          {createInteractionLabel}
        </Button>
      ) : null}
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
  const { csrfToken, user } = useAuth();
  const router = useRouter();
  const text = copy[locale];
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [creatingFor, setCreatingFor] = useState<University | null>(null);
  const [interactions, setInteractions] = useState<InteractionsFilter>("all");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const isActive = activity === "all" ? null : activity === "active";
  const [rank, setRank] = useState<RankFilter>("all");
  const isCompactViewport = useMediaQuery(compactViewportQuery);
  const canCreateInteraction =
    user !== null && can(user, "interactions.create");
  const canCreate = user !== null && can(user, "catalog.create");
  const canUpdate = user !== null && can(user, "catalog.update");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ university: University | null } | null>(
    null,
  );
  const closeForm = useCallback(() => setForm(null), []);

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
      { interactions, isActive, rank, search: debouncedSearch },
    ],
    queryFn: ({ pageParam }) =>
      getUniversities(pageParam, debouncedSearch, interactions, rank, isActive),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });
  const mapQuery = useQuery({
    queryKey: [
      "catalog",
      "universities",
      "map",
      { interactions, isActive, rank, search: debouncedSearch },
    ],
    queryFn: () =>
      getUniversityMapPoints(debouncedSearch, interactions, rank, isActive),
    enabled: view === "map",
  });
  const selectedUniversityQuery = useQuery({
    queryKey: ["catalog", "universities", selectedId],
    queryFn: () => getUniversity(selectedId!),
    enabled: selectedId !== null,
  });

  const organizations = useMemo(
    () => universitiesQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [universitiesQuery.data],
  );
  const total = universitiesQuery.data?.pages[0]?.count;
  const detailLabels: OrganizationDetailsLabels = {
    active: text.active,
    city: text.city,
    createdAt: text.createdAt,
    email: text.email,
    externalCode: text.externalCode,
    hasInteractions: text.hasInteractions,
    inactive: text.inactive,
    inn: text.inn,
    noInteractions: text.noInteractions,
    noValue: text.noValue,
    phone: text.phone,
    place: text.place,
    updatedAt: text.updatedAt,
    createInteraction: text.createInteraction,
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
  const handleActivityChange = useCallback((value: ActivityFilter) => {
    setActivity(value);
    setSelectedId(null);
  }, []);
  const handleRankChange = useCallback((value: RankFilter) => {
    setRank(value);
    setSelectedId(null);
  }, []);
  // Карточка вуза открыта только в том режиме, где его выбрали
  const handleViewChange = useCallback((value: ViewMode) => {
    setView(value);
    setSelectedId(null);
  }, []);

  const selectedUniversity = selectedUniversityQuery.data;
  const editButton =
    canUpdate && selectedUniversity ? (
      <Button
        colorScheme="neutral"
        onClick={() => setForm({ university: selectedUniversity })}
        size="m"
        type="button"
        variant="outline"
      >
        <Pencil aria-hidden="true" className="size-4" />
        {text.edit}
      </Button>
    ) : null;

  // В боковой панели списка кнопка правки — в её подвале, на карте — под карточкой
  const renderSelected = (headingId: string, withEditButton = true) =>
    selectedUniversityQuery.isPending ? (
      <p
        className="text-muted-foreground flex items-center gap-2 text-sm"
        id={headingId}
      >
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        {text.loadingDetails}
      </p>
    ) : selectedUniversityQuery.isError ? (
      <div id={headingId}>
        <RequestState
          label={text.detailsError}
          onRetry={() => void selectedUniversityQuery.refetch()}
          retryLabel={text.retry}
        />
      </div>
    ) : selectedUniversityQuery.data ? (
      <>
        <OrganizationDetails
          headingId={headingId}
          labels={detailLabels}
          locale={locale}
          onCreateInteraction={
            canCreateInteraction
              ? () => setCreatingFor(selectedUniversityQuery.data!)
              : undefined
          }
          onOpenInteractions={
            selectedUniversityQuery.data.has_interactions
              ? () =>
                  router.push(
                    `/interactions?university__ids=${selectedUniversityQuery.data!.id}`,
                  )
              : undefined
          }
          organization={selectedUniversityQuery.data}
        />
        {withEditButton && editButton ? (
          <div className="mt-4">{editButton}</div>
        ) : null}
        <OrganizationContacts
          organization={{
            id: selectedUniversityQuery.data.id,
            type: "university",
          }}
          organizationName={selectedUniversityQuery.data.name}
        />
      </>
    ) : null;

  return (
    <div className="space-y-5">
      {creatingFor && user ? (
        <NewInteractionDialog
          csrfToken={csrfToken}
          currentUser={user}
          key={creatingFor.id}
          onClose={() => setCreatingFor(null)}
          onCreated={() => setCreatingFor(null)}
          onCreatedAction={{
            label: text.openInteraction,
            onClick: (interactionId) =>
              router.push(`/interactions?interaction=${interactionId}`),
          }}
          preselectedCounterparty={{
            id: creatingFor.id,
            kind: "university",
            name: creatingFor.name,
          }}
        />
      ) : null}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
            {text.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
            {text.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canCreate ? (
            <Button
              onClick={() => setForm({ university: null })}
              size="m"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              {text.create}
            </Button>
          ) : null}
          <div
            aria-label={locale === "ru" ? "Режим отображения" : "View mode"}
            className="bg-card flex w-fit items-center gap-1 rounded-xl border p-1 shadow-sm"
            role="group"
          >
            <Button
              aria-pressed={view === "list"}
              colorScheme={view === "list" ? "accent" : "neutral"}
              onClick={() => handleViewChange("list")}
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
              onClick={() => handleViewChange("map")}
              size="m"
              type="button"
              variant={view === "map" ? "secondary" : "ghost"}
            >
              <MapIcon aria-hidden="true" className="size-4" />
              {text.map}
            </Button>
          </div>
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
          <span
            aria-hidden="true"
            className="text-muted-foreground px-2 text-sm"
          >
            {text.interactionsFilter}
          </span>
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

        <div
          aria-label={text.activityFilter}
          className="bg-card flex w-fit items-center gap-1 rounded-xl border p-1 shadow-sm"
          role="group"
        >
          <span
            aria-hidden="true"
            className="text-muted-foreground px-2 text-sm"
          >
            {text.activityFilter}
          </span>
          {activityFilters.map(({ labelKey, value }) => (
            <Button
              aria-pressed={activity === value}
              colorScheme={activity === value ? "accent" : "neutral"}
              key={value}
              onClick={() => handleActivityChange(value)}
              size="m"
              type="button"
              variant={activity === value ? "secondary" : "ghost"}
            >
              {text[labelKey]}
            </Button>
          ))}
        </div>

        <div
          aria-label={text.rankFilter}
          className="bg-card flex w-fit items-center gap-1 rounded-xl border p-1 shadow-sm"
          role="group"
        >
          <span
            aria-hidden="true"
            className="text-muted-foreground px-2 text-sm"
          >
            {text.rankFilter}
          </span>
          {rankFilters.map(({ labelKey, value }) => (
            <Button
              aria-pressed={rank === value}
              colorScheme={rank === value ? "accent" : "neutral"}
              key={value}
              onClick={() => handleRankChange(value)}
              size="m"
              type="button"
              variant={rank === value ? "secondary" : "ghost"}
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
                  canCreateInteraction={canCreateInteraction}
                  createInteractionLabel={text.createInteraction}
                  isSelected={organization.id === selectedId}
                  key={organization.id}
                  labels={detailLabels}
                  onCreateInteraction={() => setCreatingFor(organization)}
                  onOpenInteractions={() =>
                    router.push(
                      `/interactions?university__ids=${organization.id}`,
                    )
                  }
                  onSelect={() => setSelectedId(organization.id)}
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
            {selectedId ? (
              <Drawer
                closeLabel={text.close}
                footer={editButton}
                labelledBy={drawerHeadingId}
                onClose={clearSelection}
              >
                <p className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.08em] uppercase">
                  {text.selectedOrganization}
                </p>
                {renderSelected(drawerHeadingId, false)}
              </Drawer>
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
                {renderSelected(panelHeadingId)}
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
              {renderSelected(sheetHeadingId)}
            </OrganizationSheet>
          ) : null}
        </div>
      )}

      {form ? (
        <UniversityForm
          onClose={closeForm}
          onSaved={(saved) => {
            toast.success(form.university ? text.saved : text.created);
            setForm(null);
            setSelectedId(saved.id);
            // Ответ записи без аннотаций списка (взаимодействия, место) —
            // карточку и список перезапрашиваем целиком
            void queryClient.invalidateQueries({
              queryKey: ["catalog", "universities"],
            });
          }}
          university={form.university}
        />
      ) : null}
    </div>
  );
}
