"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Briefcase, LoaderCircle, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { OrganizationContacts } from "@/components/organizations/organization-contacts";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { StatusChip } from "@/components/ui/status-chip";
import { TableToolbar, type TableFilter } from "@/components/ui/table-toolbar";
import {
  b2cClientsQueryKey,
  getB2CClient,
  getB2CClients,
} from "@/lib/api/catalog/b2c-clients";
import { formatDate } from "@/lib/format-date";
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
  client,
  isSelected,
  onSelect,
  text,
}: {
  client: B2CClient;
  isSelected: boolean;
  onSelect: () => void;
  text: Text;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`bg-card focus-visible:ring-ring w-full rounded-xl border p-5 text-left shadow-sm transition-colors outline-none hover:border-[var(--atmr-accent-primary)] focus-visible:ring-2 ${isSelected ? "border-[var(--atmr-accent-primary)]" : ""}`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
          <ClientIcon className="size-7" kind={client.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="leading-5 font-medium">{client.full_name}</h2>
            <span className="flex flex-wrap gap-2">
              <StatusChip tone="accent">
                {kindLabel(client.kind, text)}
              </StatusChip>
              <StatusChip tone={client.is_active ? "positive" : "neutral"}>
                {client.is_active ? text.active : text.inactive}
              </StatusChip>
            </span>
          </div>
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
  const rows: [string, ReactNode][] = [
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
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
          <ClientIcon className="size-6" kind={client.kind} />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-medium" id={drawerHeadingId}>
            {client.full_name}
          </h2>
          <span className="mt-2 inline-flex">
            <StatusChip tone={client.is_active ? "positive" : "neutral"}>
              {client.is_active ? text.active : text.inactive}
            </StatusChip>
          </span>
        </div>
      </div>
      <dl className="mt-5 divide-y">
        {rows.map(([label, value]) => (
          <div className="py-3" key={label}>
            <dt className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-sm break-words">
              {value || (
                <span className="text-muted-foreground">{text.noValue}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <OrganizationContacts b2cClientId={client.id} />
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
  const text = copy[locale];
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
          {text.title}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          {text.description}
        </p>
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
                client={client}
                isSelected={client.id === selectedId}
                key={client.id}
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
    </div>
  );
}
