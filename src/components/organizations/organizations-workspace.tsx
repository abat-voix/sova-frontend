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
import { OrganizationForm } from "@/components/organizations/organization-form";
import { OrganizationsMap } from "@/components/organizations/organizations-map";
import { NewInteractionDialog } from "@/components/interactions/new-interaction-dialog";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SearchInput } from "@/components/ui/search-input";
import { StatusChip } from "@/components/ui/status-chip";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  getOrganizations,
  getOrganization,
  getOrganizationMapPoints,
} from "@/lib/api/catalog/organizations";
import type { RankFilter } from "@/lib/api/catalog/rank";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { organizationCity } from "@/lib/address";
import { organizationTypeLabels } from "@/lib/organization-type";
import { useLocale } from "@/providers/locale-provider";
import type {
  InteractionsFilter,
  Organization,
  OrganizationType,
} from "@/types/organization";

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
      "Вузы, компании и другие организации, с которыми ведётся работа.",
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
    typeFilter: "Тип",
    typeFilterAll: "Все",
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
    type: "Вид",
    city: "Город",
    legalAddress: "Юридический адрес",
    actualAddress: "Фактический адрес",
    sameAsLegal: "Совпадает с юридическим",
    email: "Email",
    phone: "Телефон",
    externalCode: "Внешний код",
    createdAt: "Добавлена",
    updatedAt: "Обновлена",
    noValue: "Не указано",
    noInteractions: "Без взаимодействий",
    selectedOrganization: "Выбранная организация",
    selectMarker: "Выберите маркер на карте",
    mapHint:
      "На карте — организации с координатами. Чтобы добавить организацию, укажите координаты в её адресе: в Яндекс Картах нажмите на точку — координаты появятся в карточке места, в Google Maps нажмите правой кнопкой — они в первой строке меню.",
    withoutCoordinates: (count: number) =>
      `Не показаны на карте: ${count} без координат.`,
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
    searchLabel: "Поиск организаций",
    searchPlaceholder: "Название, ИНН, email или внешний код",
    clearSearch: "Очистить поиск",
    noResults: "По вашему запросу ничего не найдено.",
    create: "Новая организация",
    edit: "Изменить",
    created: "Организация добавлена.",
    saved: "Изменения сохранены.",
    createInteraction: "Создать взаимодействие",
    openInteraction: "Открыть взаимодействие",
  },
  en: {
    title: "Organizations",
    description:
      "Organizations and partner organizations currently working with the team.",
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
    typeFilter: "Type",
    typeFilterAll: "All",
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
    type: "Type",
    city: "City",
    legalAddress: "Legal address",
    actualAddress: "Actual address",
    sameAsLegal: "Same as legal",
    email: "Email",
    phone: "Phone",
    externalCode: "External code",
    createdAt: "Added",
    updatedAt: "Updated",
    noValue: "Not provided",
    noInteractions: "No interactions",
    selectedOrganization: "Selected organization",
    selectMarker: "Select a marker on the map",
    mapHint:
      "The map shows organizations with coordinates. To add one, enter coordinates in its address: in Yandex Maps click a point — they appear in the place card; in Google Maps right-click — they are the first menu line.",
    withoutCoordinates: (count: number) =>
      `Not on the map: ${count} without coordinates.`,
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
    searchLabel: "Search organizations",
    searchPlaceholder: "Name, tax ID, email, or external code",
    clearSearch: "Clear search",
    noResults: "No organizations matched your search.",
    create: "New organization",
    edit: "Edit",
    created: "Organization added.",
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
  locale,
  onCreateInteraction,
  onSelect,
}: {
  canCreateInteraction: boolean;
  createInteractionLabel: string;
  organization: Organization;
  isSelected: boolean;
  labels: OrganizationDetailsLabels;
  locale: "ru" | "en";
  onCreateInteraction: () => void;
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
            <span className="mt-2 flex flex-wrap gap-2">
              <RankChip label={labels.place} rank={organization.rank} />
              <StatusChip tone="info">
                {organizationTypeLabels[locale][organization.organization_type]}
              </StatusChip>
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
            {organizationCity(organization) ? (
              <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                {organizationCity(organization)}
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
  const [creatingFor, setCreatingFor] = useState<Organization | null>(null);
  const [interactions, setInteractions] = useState<InteractionsFilter>("all");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [organizationType, setOrganizationType] =
    useState<OrganizationType | null>(null);
  const isActive = activity === "all" ? null : activity === "active";
  const [rank, setRank] = useState<RankFilter>("all");
  const isCompactViewport = useMediaQuery(compactViewportQuery);
  const canCreateInteraction =
    user !== null && can(user, "interactions.create");
  const canCreate = user !== null && can(user, "catalog.create");
  const canUpdate = user !== null && can(user, "catalog.update");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{
    organization: Organization | null;
  } | null>(null);
  const closeForm = useCallback(() => setForm(null), []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const organizationsQuery = useInfiniteQuery({
    queryKey: [
      "catalog",
      "organizations",
      {
        interactions,
        isActive,
        organizationType,
        rank,
        search: debouncedSearch,
      },
    ],
    queryFn: ({ pageParam }) =>
      getOrganizations(
        pageParam,
        debouncedSearch,
        interactions,
        rank,
        isActive,
        organizationType,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });
  const mapQuery = useQuery({
    queryKey: [
      "catalog",
      "organizations",
      "map",
      {
        interactions,
        isActive,
        organizationType,
        rank,
        search: debouncedSearch,
      },
    ],
    queryFn: () =>
      getOrganizationMapPoints(
        debouncedSearch,
        interactions,
        rank,
        isActive,
        organizationType,
      ),
    enabled: view === "map",
  });
  const selectedOrganizationQuery = useQuery({
    queryKey: ["catalog", "organizations", selectedId],
    queryFn: () => getOrganization(selectedId!),
    enabled: selectedId !== null,
  });

  const organizations = useMemo(
    () => organizationsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [organizationsQuery.data],
  );
  const total = organizationsQuery.data?.pages[0]?.count;
  const detailLabels: OrganizationDetailsLabels = {
    active: text.active,
    actualAddress: text.actualAddress,
    city: text.city,
    createdAt: text.createdAt,
    email: text.email,
    externalCode: text.externalCode,
    hasInteractions: text.hasInteractions,
    inactive: text.inactive,
    inn: text.inn,
    legalAddress: text.legalAddress,
    noInteractions: text.noInteractions,
    noValue: text.noValue,
    phone: text.phone,
    place: text.place,
    sameAsLegal: text.sameAsLegal,
    type: text.type,
    updatedAt: text.updatedAt,
    createInteraction: text.createInteraction,
  };
  const clearSelection = useCallback(() => setSelectedId(null), []);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setSelectedId(null);
  }, []);
  // Выбранная организация может не пройти новый отбор — его карточка осталась бы
  // открытой в отрыве от карты.
  const handleInteractionsChange = useCallback((value: InteractionsFilter) => {
    setInteractions(value);
    setSelectedId(null);
  }, []);
  const handleTypeChange = useCallback((value: OrganizationType | null) => {
    setOrganizationType(value);
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
  // Карточка организации открыта только в том режиме, где её выбрали
  const handleViewChange = useCallback((value: ViewMode) => {
    setView(value);
    setSelectedId(null);
  }, []);

  const selectedOrganization = selectedOrganizationQuery.data;
  const editButton =
    canUpdate && selectedOrganization ? (
      <Button
        colorScheme="neutral"
        onClick={() => setForm({ organization: selectedOrganization })}
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
    selectedOrganizationQuery.isPending ? (
      <p
        className="text-muted-foreground flex items-center gap-2 text-sm"
        id={headingId}
      >
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        {text.loadingDetails}
      </p>
    ) : selectedOrganizationQuery.isError ? (
      <div id={headingId}>
        <RequestState
          label={text.detailsError}
          onRetry={() => void selectedOrganizationQuery.refetch()}
          retryLabel={text.retry}
        />
      </div>
    ) : selectedOrganizationQuery.data ? (
      <>
        <OrganizationDetails
          headingId={headingId}
          labels={detailLabels}
          locale={locale}
          onCreateInteraction={
            canCreateInteraction
              ? () => setCreatingFor(selectedOrganizationQuery.data!)
              : undefined
          }
          organization={selectedOrganizationQuery.data}
        />
        {withEditButton && editButton ? (
          <div className="mt-4">{editButton}</div>
        ) : null}
        <OrganizationContacts
          organization={{
            id: selectedOrganizationQuery.data.id,
            type: "organization",
          }}
          organizationName={selectedOrganizationQuery.data.name}
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
            kind: "organization",
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
              onClick={() => setForm({ organization: null })}
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

        <label className="bg-card flex w-fit items-center gap-1 rounded-xl border p-1 shadow-sm">
          <span className="text-muted-foreground px-2 text-sm">
            {text.typeFilter}
          </span>
          <select
            className="bg-card h-9 rounded-lg px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--atmr-accent-primary)]"
            onChange={(event) =>
              handleTypeChange(
                (event.target.value || null) as OrganizationType | null,
              )
            }
            value={organizationType ?? ""}
          >
            <option value="">{text.typeFilterAll}</option>
            {Object.entries(organizationTypeLabels[locale]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

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
        organizationsQuery.isPending ? (
          <RequestState label={text.loading} />
        ) : organizationsQuery.isError ? (
          <RequestState
            label={text.listError}
            onRetry={() => void organizationsQuery.refetch()}
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
                  locale={locale}
                  onCreateInteraction={() => setCreatingFor(organization)}
                  onSelect={() => setSelectedId(organization.id)}
                  organization={organization}
                />
              ))}
            </div>
            {organizationsQuery.hasNextPage ? (
              <div className="flex justify-center pt-1">
                <Button
                  colorScheme="neutral"
                  disabled={organizationsQuery.isFetchingNextPage}
                  onClick={() => void organizationsQuery.fetchNextPage()}
                  size="l"
                  type="button"
                  variant="outline"
                >
                  {organizationsQuery.isFetchingNextPage ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : null}
                  {organizationsQuery.isFetchingNextPage
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
          <p className="text-muted-foreground text-sm leading-6 lg:col-span-2">
            {text.mapHint}
            {total !== undefined && total > mapQuery.data.length
              ? ` ${text.withoutCoordinates(total - mapQuery.data.length)}`
              : null}
          </p>
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
        <OrganizationForm
          onClose={closeForm}
          onSaved={(saved) => {
            toast.success(form.organization ? text.saved : text.created);
            setForm(null);
            setSelectedId(saved.id);
            // Ответ записи без аннотаций списка (взаимодействия, место) —
            // карточку и список перезапрашиваем целиком
            void queryClient.invalidateQueries({
              queryKey: ["catalog", "organizations"],
            });
          }}
          organization={form.organization}
        />
      ) : null}
    </div>
  );
}
