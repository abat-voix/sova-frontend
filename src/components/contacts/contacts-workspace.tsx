"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, LoaderCircle, User } from "lucide-react";
import { useState } from "react";

import {
  ContactDetails,
  type ContactDetailsLabels,
} from "@/components/contacts/contact-details";
import {
  DataTable,
  type DataTableColumn,
  type DataTableLabels,
} from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { EntitySelect } from "@/components/ui/entity-select";
import { StatusChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar, type TableFilter } from "@/components/ui/table-toolbar";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import {
  contactPersonsPageSize,
  getContactPerson,
  getContactPersons,
} from "@/lib/api/catalog/contact-persons";
import {
  searchB2CClients,
  searchUniversities,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import { formatDate } from "@/lib/format-date";
import { useLocale } from "@/providers/locale-provider";
import type {
  ContactActivityFilter,
  ContactPerson,
} from "@/types/contact-person";

const drawerHeadingId = "contact-drawer-title";

const copy = {
  ru: {
    title: "Контакты",
    description:
      "Контактные лица вузов и B2C-клиентов: должности, связи и способы связаться.",
    searchLabel: "Поиск контактных лиц",
    searchPlaceholder: "ФИО, должность, email или телефон",
    clearSearch: "Очистить поиск",
    activityFilter: "Активность",
    activityAll: "Все",
    activityActive: "Активные",
    activityInactive: "Неактивные",
    universityFilter: "Вуз",
    universityPlaceholder: "Любой вуз",
    b2cFilter: "B2C-клиент",
    b2cPlaceholder: "Любой клиент",
    columnName: "ФИО",
    columnCounterparty: "Контрагент",
    columnEmail: "Email",
    columnPhone: "Телефон",
    columnStatus: "Статус",
    columnCreatedAt: "Добавлен",
    tableCaption: "Контактные лица",
    active: "Активен",
    inactive: "Неактивен",
    university: "Вуз",
    b2cClient: "B2C-клиент",
    noCounterparty: "Контрагент не указан",
    createdAt: "Дата создания",
    updatedAt: "Дата обновления",
    noValue: "—",
    empty: "По вашему запросу ничего не найдено.",
    error: "Не удалось загрузить список контактов.",
    loading: "Загружаем контакты…",
    retry: "Повторить",
    sortAscending: "Сортировать по возрастанию",
    sortDescending: "Сортировать по убыванию",
    sortNone: "Отменить сортировку",
    previousPage: "Предыдущая страница",
    nextPage: "Следующая страница",
    close: "Закрыть",
    details: "Карточка контакта",
    loadingDetails: "Загружаем карточку контакта…",
    detailsError: "Не удалось загрузить карточку контакта.",
  },
  en: {
    title: "Contacts",
    description:
      "Contact people of universities and B2C clients: roles, links, and ways to reach them.",
    searchLabel: "Search contact people",
    searchPlaceholder: "Name, position, email, or phone",
    clearSearch: "Clear search",
    activityFilter: "Activity",
    activityAll: "All",
    activityActive: "Active",
    activityInactive: "Inactive",
    universityFilter: "University",
    universityPlaceholder: "Any university",
    b2cFilter: "B2C client",
    b2cPlaceholder: "Any client",
    columnName: "Full name",
    columnCounterparty: "Counterparty",
    columnEmail: "Email",
    columnPhone: "Phone",
    columnStatus: "Status",
    columnCreatedAt: "Added",
    tableCaption: "Contact people",
    active: "Active",
    inactive: "Inactive",
    university: "University",
    b2cClient: "B2C client",
    noCounterparty: "No counterparty",
    createdAt: "Created",
    updatedAt: "Updated",
    noValue: "—",
    empty: "No contacts matched your search.",
    error: "The contact list could not be loaded.",
    loading: "Loading contacts…",
    retry: "Retry",
    sortAscending: "Sort ascending",
    sortDescending: "Sort descending",
    sortNone: "Clear sorting",
    previousPage: "Previous page",
    nextPage: "Next page",
    close: "Close",
    details: "Contact card",
    loadingDetails: "Loading the contact card…",
    detailsError: "The contact card could not be loaded.",
  },
} as const;

/**
 * Раздел контактных лиц: таблица каталога с поиском, отборами и карточкой
 * записи в боковой панели.
 *
 * Поиск, сортировка и отборы уходят в запрос — список постраничный, и
 * упорядочить его целиком на клиенте невозможно.
 */
export function ContactsWorkspace() {
  const { locale } = useLocale();
  const text = copy[locale];
  const table = useTableQueryState({ direction: "asc", field: "full_name" });
  const [activity, setActivity] = useState<ContactActivityFilter>("all");
  const [university, setUniversity] = useState<LookupOption | null>(null);
  const [b2cClient, setB2cClient] = useState<LookupOption | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const contactsQuery = useQuery({
    queryKey: [
      "catalog",
      "contact-persons",
      {
        activity,
        b2cClientId: b2cClient?.id ?? null,
        ordering: table.ordering,
        page: table.page,
        search: table.debouncedSearch,
        universityId: university?.id ?? null,
      },
    ],
    queryFn: () =>
      getContactPersons({
        activity,
        b2cClientId: b2cClient?.id ?? null,
        ordering: table.ordering,
        page: table.page,
        search: table.debouncedSearch,
        universityId: university?.id ?? null,
      }),
    // Соседняя страница приезжает вместо текущей, а не вместо пустой таблицы.
    placeholderData: keepPreviousData,
  });

  const contacts = contactsQuery.data?.results ?? [];
  const count = contactsQuery.data?.count ?? 0;
  const selectedRow = contacts.find((contact) => contact.id === selectedId);

  // Строка списка и карточка приходят одной схемой, поэтому панель открывается
  // сразу по данным строки, а запрос лишь обновляет её.
  const contactQuery = useQuery({
    queryKey: ["catalog", "contact-persons", "detail", selectedId],
    queryFn: () => getContactPerson(selectedId as string),
    enabled: selectedId !== null,
    placeholderData: selectedRow,
  });

  const detailLabels: ContactDetailsLabels = {
    active: text.active,
    b2cClient: text.b2cClient,
    createdAt: text.createdAt,
    email: text.columnEmail,
    inactive: text.inactive,
    noCounterparty: text.noCounterparty,
    noValue: text.noValue,
    phone: text.columnPhone,
    university: text.university,
    updatedAt: text.updatedAt,
  };

  const tableLabels: DataTableLabels = {
    empty: text.empty,
    error: text.error,
    loading: text.loading,
    retry: text.retry,
    sortAscending: text.sortAscending,
    sortDescending: text.sortDescending,
    sortNone: text.sortNone,
  };

  const filters: TableFilter[] = [
    {
      label: text.activityFilter,
      name: "activity",
      onChange: table.withPageReset((value: string) =>
        setActivity(value as ContactActivityFilter),
      ),
      options: [
        { label: text.activityAll, value: "all" },
        { label: text.activityActive, value: "active" },
        { label: text.activityInactive, value: "inactive" },
      ],
      value: activity,
    },
  ];

  const columns: DataTableColumn<ContactPerson>[] = [
    {
      name: "full_name",
      render: (contact) => (
        <div className="min-w-0">
          <p className="font-medium">{contact.full_name}</p>
          {contact.position ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {contact.position}
            </p>
          ) : null}
        </div>
      ),
      sortField: "full_name",
      title: text.columnName,
      width: "24%",
    },
    {
      name: "counterparty",
      render: (contact) => {
        const name = contact.university
          ? contact.university.name
          : contact.b2c_client?.full_name;

        if (!name) {
          return <span className="text-muted-foreground">{text.noValue}</span>;
        }

        const Icon = contact.university ? Building2 : User;

        return (
          <span className="flex items-start gap-2">
            <Icon
              aria-hidden="true"
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="block">{name}</span>
              <span className="text-muted-foreground block text-xs">
                {contact.university ? text.university : text.b2cClient}
              </span>
            </span>
          </span>
        );
      },
      title: text.columnCounterparty,
      width: "24%",
    },
    {
      name: "email",
      render: (contact) =>
        contact.email ? (
          <a
            className="break-all hover:underline"
            href={`mailto:${contact.email}`}
            onClick={(event) => event.stopPropagation()}
          >
            {contact.email}
          </a>
        ) : (
          <span className="text-muted-foreground">{text.noValue}</span>
        ),
      sortField: "email",
      title: text.columnEmail,
      width: "20%",
    },
    {
      name: "phone",
      render: (contact) =>
        contact.phone ? (
          <a
            className="whitespace-nowrap hover:underline"
            href={`tel:${contact.phone}`}
            onClick={(event) => event.stopPropagation()}
          >
            {contact.phone}
          </a>
        ) : (
          <span className="text-muted-foreground">{text.noValue}</span>
        ),
      title: text.columnPhone,
      width: "14%",
    },
    {
      name: "is_active",
      render: (contact) => (
        <StatusChip tone={contact.is_active ? "positive" : "neutral"}>
          {contact.is_active ? text.active : text.inactive}
        </StatusChip>
      ),
      title: text.columnStatus,
      width: "10%",
    },
    {
      align: "right",
      name: "created_at",
      render: (contact) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(contact.created_at, locale) ?? text.noValue}
        </span>
      ),
      sortField: "created_at",
      title: text.columnCreatedAt,
      width: "12%",
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
          onChange: table.setSearch,
          placeholder: text.searchPlaceholder,
          value: table.search,
        }}
      >
        <div className="w-56">
          <EntitySelect
            id="contacts-university-filter"
            label={text.universityFilter}
            onChange={table.withPageReset(setUniversity)}
            placeholder={text.universityPlaceholder}
            queryKey={["catalog", "universities", "lookup"]}
            search={searchUniversities}
            value={university}
          />
        </div>
        <div className="w-56">
          <EntitySelect
            id="contacts-b2c-filter"
            label={text.b2cFilter}
            onChange={table.withPageReset(setB2cClient)}
            placeholder={text.b2cPlaceholder}
            queryKey={["catalog", "b2c-clients", "lookup"]}
            search={searchB2CClients}
            value={b2cClient}
          />
        </div>
      </TableToolbar>

      <DataTable
        caption={text.tableCaption}
        columns={columns}
        footer={
          <TablePagination
            count={count}
            labels={{
              next: text.nextPage,
              pageOf: (page, pages) =>
                locale === "ru"
                  ? `Страница ${page} из ${pages}`
                  : `Page ${page} of ${pages}`,
              previous: text.previousPage,
              range: (from, to, total) =>
                locale === "ru"
                  ? `Строки ${from}–${to} из ${total}`
                  : `Rows ${from}–${to} of ${total}`,
            }}
            onPageChange={table.setPage}
            page={table.page}
            pageSize={contactPersonsPageSize}
          />
        }
        getRowId={(contact) => contact.id}
        isError={contactsQuery.isError}
        isLoading={contactsQuery.isPending}
        labels={tableLabels}
        onRetry={() => void contactsQuery.refetch()}
        onRowClick={(contact) => setSelectedId(contact.id)}
        onSortChange={table.setSort}
        rows={contacts}
        selectedRowId={selectedId}
        sort={table.sort}
      />

      {selectedId ? (
        <Drawer
          closeLabel={text.close}
          labelledBy={drawerHeadingId}
          onClose={() => setSelectedId(null)}
        >
          <p className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.08em] uppercase">
            {text.details}
          </p>
          {contactQuery.data ? (
            <ContactDetails
              contact={contactQuery.data}
              headingId={drawerHeadingId}
              labels={detailLabels}
              locale={locale}
            />
          ) : contactQuery.isError ? (
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
