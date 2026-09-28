"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Briefcase,
  LoaderCircle,
  Mail,
  Pencil,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { B2CClientForm } from "@/components/b2c-clients/b2c-client-form";

import { RankChip } from "@/components/catalog/rank-chip";
import { NewInteractionDialog } from "@/components/interactions/new-interaction-dialog";
import { OrganizationContacts } from "@/components/organizations/organization-contacts";
import {
  OrganizationInspector,
  type OrganizationInspectorRow,
} from "@/components/organizations/organization-inspector";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { StatusChip } from "@/components/ui/status-chip";
import { TableToolbar, type TableFilter } from "@/components/ui/table-toolbar";
import {
  b2cClientsQueryKey,
  getB2CClient,
  getB2CClients,
} from "@/lib/api/catalog/b2c-clients";
import type { RankFilter } from "@/lib/api/catalog/rank";
import { formatDate } from "@/lib/format-date";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { B2CClient, B2CClientKind } from "@/types/catalog";

const drawerHeadingId = "b2c-client-drawer-title";

type KindFilter = "all" | B2CClientKind;
type ActivityFilter = "all" | "active" | "inactive";

const copy = {
  ru: {
    title: "B2C-клиенты",
    description:
      "Физические и юридические лица вне вузовской сети, с которыми ведётся работа.",
    clientsCount: "клиентов",
    searchLabel: "Поиск B2C-клиентов",
    searchPlaceholder: "ФИО или наименование, ИНН, email, телефон",
    clearSearch: "Очистить поиск",
    kindFilter: "Тип клиента",
    activityFilter: "Активность",
    rankFilter: "Рейтинг",
    rankTop: "Топ-10",
    ranked: "С местом",
    unranked: "Без места",
    placeLabel: (rank: number) => `${rank} место`,
    all: "Все",
    individual: "Физлицо",
    legalEntity: "Юрлицо",
    active: "Активен",
    inactive: "Неактивен",
    activePlural: "Активные",
    inactivePlural: "Неактивные",
    inn: "ИНН",
    email: "Email",
    phone: "Телефон",
    kind: "Тип",
    createdAt: "Добавлен",
    updatedAt: "Обновлён",
    noValue: "Не указано",
    loading: "Загружаем клиентов…",
    loadMore: "Подгрузить",
    loadingMore: "Загружаем…",
    error: "Не удалось загрузить список клиентов.",
    empty: "По вашему запросу ничего не найдено.",
    retry: "Повторить",
    close: "Закрыть",
    details: "Карточка клиента",
    loadingDetails: "Загружаем карточку клиента…",
    detailsError: "Не удалось загрузить карточку клиента.",
    create: "Новый клиент",
    edit: "Изменить",
    created: "Клиент добавлен.",
    saved: "Изменения сохранены.",
    createInteraction: "Создать взаимодействие",
    openInteraction: "Открыть взаимодействие",
  },
  en: {
    title: "B2C clients",
    description:
      "Individuals and companies outside the university network that the team works with.",
    clientsCount: "clients",
    searchLabel: "Search B2C clients",
    searchPlaceholder: "Name, tax ID, email, or phone",
    clearSearch: "Clear search",
    kindFilter: "Client type",
    activityFilter: "Activity",
    rankFilter: "Ranking",
    rankTop: "Top 10",
    ranked: "Ranked",
    unranked: "Unranked",
    placeLabel: (rank: number) => `#${rank}`,
    all: "All",
    individual: "Individual",
    legalEntity: "Company",
    active: "Active",
    inactive: "Inactive",
    activePlural: "Active",
    inactivePlural: "Inactive",
    inn: "Tax ID",
    email: "Email",
    phone: "Phone",
    kind: "Type",
    createdAt: "Added",
    updatedAt: "Updated",
    noValue: "Not provided",
    loading: "Loading clients…",
    loadMore: "Load more",
    loadingMore: "Loading…",
    error: "The client list could not be loaded.",
    empty: "No clients matched your search.",
    retry: "Retry",
    close: "Close",
    details: "Client card",
    loadingDetails: "Loading the client card…",
    detailsError: "The client card could not be loaded.",
    createInteraction: "Create interaction",
    openInteraction: "Open interaction",
    create: "New client",
    edit: "Edit",
    created: "Client added.",
    saved: "Changes saved.",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

function kindLabel(kind: B2CClientKind, text: Text) {
  return kind === "individual" ? text.individual : text.legalEntity;
}

function ClientIcon({
  kind,
  className,
}: {
  kind: B2CClientKind;
  className: string;
}) {
  const Icon = kind === "individual" ? UserRound : Briefcase;

  return <Icon aria-hidden="true" className={className} />;
}

function ClientCard({
  canCreateInteraction,
  client,
  createInteractionLabel,
  isSelected,
  onCreateInteraction,
  onSelect,
  text,
}: {
  canCreateInteraction: boolean;
  client: B2CClient;
  createInteractionLabel: string;
  isSelected: boolean;
  onCreateInteraction: () => void;
  onSelect: () => void;
  text: Text;
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
            <ClientIcon className="size-7" kind={client.kind} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="leading-5 font-medium">{client.full_name}</h2>
            <span className="mt-2 flex flex-wrap gap-2">
              <RankChip label={text.placeLabel} rank={client.rank} />
              <StatusChip tone="accent">
                {kindLabel(client.kind, text)}
              </StatusChip>
              <StatusChip tone={client.is_active ? "positive" : "neutral"}>
                {client.is_active ? text.active : text.inactive}
              </StatusChip>
            </span>
            {client.email ? (
              <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{client.email}</span>
              </p>
            ) : null}
            {client.phone ? (
              <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                <Phone aria-hidden="true" className="size-4 shrink-0" />
                {client.phone}
              </p>
            ) : null}
            {client.inn ? (
              <p className="text-muted-foreground mt-2 text-xs">
                {text.inn}: {client.inn}
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

function ClientDetails({
  client,
  locale,
  text,
}: {
  client: B2CClient;
  locale: "ru" | "en";
  text: Text;
}) {
  const rows: OrganizationInspectorRow[] = [
    [text.kind, kindLabel(client.kind, text)],
    [text.inn, client.inn],
    [
      text.email,
      client.email ? (
        <a
          className="break-all hover:underline"
          href={`mailto:${client.email}`}
        >
          {client.email}
        </a>
      ) : null,
    ],
    [
      text.phone,
      client.phone ? (
        <a className="hover:underline" href={`tel:${client.phone}`}>
          {client.phone}
        </a>
      ) : null,
    ],
    [text.createdAt, formatDate(client.created_at, locale)],
    [text.updatedAt, formatDate(client.updated_at, locale)],
  ];

  return (
    <>
      <OrganizationInspector
        chips={
          <>
            <StatusChip tone={client.is_active ? "positive" : "neutral"}>
              {client.is_active ? text.active : text.inactive}
            </StatusChip>
            <RankChip label={text.placeLabel} rank={client.rank} />
          </>
        }
        headingId={drawerHeadingId}
        icon={<ClientIcon className="size-6" kind={client.kind} />}
        noValueLabel={text.noValue}
        rows={rows}
        title={client.full_name}
      />
      <OrganizationContacts
        organization={{ id: client.id, type: "b2c_client" }}
        organizationName={client.full_name}
      />
    </>
  );
}

/**
 * B2C-клиенты — список карточек по образцу раздела «Организации»: поиск,
 * отборы по типу и активности, подгрузка страниц и карточка клиента с
 * контактными лицами в боковой панели.
 */
export function B2CClientsWorkspace() {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  const router = useRouter();
  const text = copy[locale];
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [rank, setRank] = useState<RankFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<B2CClient | null>(null);
  const canCreateInteraction =
    user !== null && can(user, "interactions.create");
  const canCreate = user !== null && can(user, "catalog.create");
  const canUpdate = user !== null && can(user, "catalog.update");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ client: B2CClient | null } | null>(null);
  const closeForm = useCallback(() => setForm(null), []);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      350,
    );

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const params = {
    isActive: activity === "all" ? null : activity === "active",
    kind: kind === "all" ? null : kind,
    rank,
    search: debouncedSearch,
  };

  const clientsQuery = useInfiniteQuery({
    queryKey: b2cClientsQueryKey(params),
    queryFn: ({ pageParam }) => getB2CClients({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.next ? pages.length + 1 : undefined,
  });

  const clients = useMemo(
    () => clientsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [clientsQuery.data],
  );
  const total = clientsQuery.data?.pages[0]?.count;
  const selectedRow = clients.find((client) => client.id === selectedId);

  const clientQuery = useQuery({
    queryKey: ["catalog", "b2c-clients", "detail", selectedId],
    queryFn: () => getB2CClient(selectedId as string),
    enabled: selectedId !== null,
    placeholderData: selectedRow,
  });

  const filters: TableFilter[] = [
    {
      label: text.kindFilter,
      name: "kind",
      onChange: (value) => setKind(value as KindFilter),
      options: [
        { label: text.all, value: "all" },
        { label: text.individual, value: "individual" },
        { label: text.legalEntity, value: "legal_entity" },
      ],
      value: kind,
    },
    {
      label: text.activityFilter,
      name: "activity",
      onChange: (value) => setActivity(value as ActivityFilter),
      options: [
        { label: text.all, value: "all" },
        { label: text.activePlural, value: "active" },
        { label: text.inactivePlural, value: "inactive" },
      ],
      value: activity,
    },
    {
      label: text.rankFilter,
      name: "rank",
      onChange: (value) => setRank(value as RankFilter),
      options: [
        { label: text.all, value: "all" },
        { label: text.rankTop, value: "top10" },
        { label: text.ranked, value: "ranked" },
        { label: text.unranked, value: "unranked" },
      ],
      value: rank,
    },
  ];

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
            kind: "b2c_client",
            name: creatingFor.full_name,
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
        {canCreate ? (
          <Button
            className="w-fit"
            onClick={() => setForm({ client: null })}
            size="m"
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            {text.create}
          </Button>
        ) : null}
      </div>

      <TableToolbar
        filters={filters}
        search={{
          clearLabel: text.clearSearch,
          label: text.searchLabel,
          onChange: setSearch,
          placeholder: text.searchPlaceholder,
          value: search,
        }}
      />

      {total !== undefined ? (
        <p className="text-muted-foreground text-sm">
          {total} {text.clientsCount}
        </p>
      ) : null}

      {clientsQuery.isPending ? (
        <RequestState label={text.loading} />
      ) : clientsQuery.isError ? (
        <RequestState
          label={text.error}
          onRetry={() => void clientsQuery.refetch()}
          retryLabel={text.retry}
        />
      ) : clients.length === 0 ? (
        <RequestState label={text.empty} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {clients.map((client) => (
              <ClientCard
                canCreateInteraction={canCreateInteraction}
                client={client}
                createInteractionLabel={text.createInteraction}
                isSelected={client.id === selectedId}
                key={client.id}
                onCreateInteraction={() => setCreatingFor(client)}
                onSelect={() => setSelectedId(client.id)}
                text={text}
              />
            ))}
          </div>
          {clientsQuery.hasNextPage ? (
            <div className="flex justify-center pt-1">
              <Button
                colorScheme="neutral"
                disabled={clientsQuery.isFetchingNextPage}
                onClick={() => void clientsQuery.fetchNextPage()}
                size="l"
                type="button"
                variant="outline"
              >
                {clientsQuery.isFetchingNextPage ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : null}
                {clientsQuery.isFetchingNextPage
                  ? text.loadingMore
                  : text.loadMore}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {selectedId ? (
        <Drawer
          closeLabel={text.close}
          footer={
            canUpdate && clientQuery.data ? (
              <Button
                colorScheme="neutral"
                onClick={() => setForm({ client: clientQuery.data ?? null })}
                size="m"
                type="button"
                variant="outline"
              >
                <Pencil aria-hidden="true" className="size-4" />
                {text.edit}
              </Button>
            ) : undefined
          }
          labelledBy={drawerHeadingId}
          onClose={() => setSelectedId(null)}
        >
          <p className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.08em] uppercase">
            {text.details}
          </p>
          {clientQuery.data ? (
            <ClientDetails
              client={clientQuery.data}
              locale={locale}
              text={text}
            />
          ) : clientQuery.isError ? (
            <p className="text-muted-foreground text-sm" id={drawerHeadingId}>
              {text.detailsError}
            </p>
          ) : (
            <p
              className="text-muted-foreground flex items-center gap-2 text-sm"
              id={drawerHeadingId}
            >
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              {text.loadingDetails}
            </p>
          )}
        </Drawer>
      ) : null}

      {form ? (
        <B2CClientForm
          client={form.client}
          onClose={closeForm}
          onSaved={(saved) => {
            toast.success(form.client ? text.saved : text.created);
            setForm(null);
            setSelectedId(saved.id);
            // Место в рейтинге считается в списке — перезапрашиваем и карточку
            void queryClient.invalidateQueries({
              queryKey: ["catalog", "b2c-clients"],
            });
          }}
        />
      ) : null}
    </div>
  );
}
