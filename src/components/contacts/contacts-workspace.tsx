"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Building2,
  Factory,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  User,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AddContactAffiliation } from "@/components/contacts/add-contact-affiliation";
import { ConfirmAction } from "@/components/contacts/confirm-action";
import { ContactDetails } from "@/components/contacts/contact-details";
import { ContactPersonForm } from "@/components/contacts/contact-person-form";
import { EditAffiliation } from "@/components/contacts/edit-affiliation";
import {
  apiErrorMessage,
  ConfirmDeleteButton,
  RegistryHeader,
  registryCopy,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
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
  deleteAffiliation,
  organizationAffiliationsQueryKey,
} from "@/lib/api/catalog/contact-affiliations";
import {
  contactPersonsPageSize,
  contactPersonsQueryKey,
  deleteContactPerson,
  getContactPerson,
  getContactPersons,
  updateContactPerson,
} from "@/lib/api/catalog/contact-persons";
import {
  searchB2CClients,
  searchUniversities,
  searchVendors,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import { formatDate } from "@/lib/format-date";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type {
  ContactActivityFilter,
  ContactAffiliation,
  ContactPerson,
  OrganizationType,
} from "@/types/contact-person";

const drawerHeadingId = "contact-drawer-title";

const copy = {
  ru: {
    title: "Контакты",
    description:
      "Контактные лица вузов, B2C-клиентов и вендоров: организации, должности и способы связаться.",
    create: "Новый контакт",
    created: "Контакт создан.",
    saved: "Изменения сохранены.",
    searchLabel: "Поиск контактных лиц",
    searchPlaceholder: "ФИО, должность, email, телефон или Telegram",
    clearSearch: "Очистить поиск",
    activityFilter: "Активность",
    activityAll: "Все",
    activityActive: "Активные",
    activityInactive: "Неактивные",
    universityFilter: "Вуз",
    universityPlaceholder: "Любой вуз",
    b2cFilter: "B2C-клиент",
    b2cPlaceholder: "Любой клиент",
    vendorFilter: "Вендор",
    vendorPlaceholder: "Любой вендор",
    columnName: "ФИО",
    columnOrganizations: "Организации",
    columnEmail: "Email",
    columnPhone: "Телефон",
    columnStatus: "Статус",
    columnCreatedAt: "Добавлен",
    tableCaption: "Контактные лица",
    active: "Активен",
    inactive: "Неактивен",
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
    editContact: "Изменить контакт",
    deactivate: "Выключить",
    deactivateConfirm: "Выключить контакт",
    deactivating: "Выключаем…",
    deactivateQuestion:
      "Человек ушёл отовсюду? Он будет отвязан от всех активных взаимодействий, КАМы получат уведомления, а его связи с организациями удалятся. Включение их не вернёт.",
    deactivated: "Контакт выключен.",
    activate: "Включить",
    activated: "Контакт включён. Добавьте организации, где он работает.",
    removed: "Контакт удалён из организации.",
    added: "Организация добавлена.",
    deleted: "Контакт удалён.",
  },
  en: {
    title: "Contacts",
    description:
      "Contact people of universities, B2C clients, and vendors: organizations, roles, and ways to reach them.",
    create: "New contact",
    created: "Contact created.",
    saved: "Changes saved.",
    searchLabel: "Search contact people",
    searchPlaceholder: "Name, position, email, phone, or Telegram",
    clearSearch: "Clear search",
    activityFilter: "Activity",
    activityAll: "All",
    activityActive: "Active",
    activityInactive: "Inactive",
    universityFilter: "University",
    universityPlaceholder: "Any university",
    b2cFilter: "B2C client",
    b2cPlaceholder: "Any client",
    vendorFilter: "Vendor",
    vendorPlaceholder: "Any vendor",
    columnName: "Full name",
    columnOrganizations: "Organizations",
    columnEmail: "Email",
    columnPhone: "Phone",
    columnStatus: "Status",
    columnCreatedAt: "Added",
    tableCaption: "Contact people",
    active: "Active",
    inactive: "Inactive",
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
    editContact: "Edit contact",
    deactivate: "Deactivate",
    deactivateConfirm: "Deactivate contact",
    deactivating: "Deactivating…",
    deactivateQuestion:
      "Has this person left everywhere? They will be unlinked from all active interactions, account managers will be notified, and their organization links will be deleted. Reactivation will not restore them.",
    deactivated: "Contact deactivated.",
    activate: "Activate",
    activated: "Contact activated. Add the organizations they work with.",
    removed: "The contact was removed from the organization.",
    added: "Organization added.",
    deleted: "Contact deleted.",
  },
} as const;

const typeIcons: Record<OrganizationType, typeof Building2> = {
  b2c_client: User,
  university: Building2,
  vendor: Factory,
};

/**
 * Раздел контактных лиц: таблица каталога с поиском и отборами, карточка
 * человека в боковой панели и управление им — данные, организации, выключение.
 *
 * Поиск, сортировка и отборы уходят в запрос — список постраничный, и
 * упорядочить его целиком на клиенте невозможно.
 */
export function ContactsWorkspace() {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  // Кнопки прячутся по правам справочников (наблюдатель только читает); решение всё равно за бэкендом.
  const canCreate = user !== null && can(user, "catalog.create");
  const canUpdate = user !== null && can(user, "catalog.update");
  const canDelete = user !== null && can(user, "catalog.delete");
  const text = copy[locale];
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const table = useTableQueryState({ direction: "asc", field: "full_name" });
  const [activity, setActivity] = useState<ContactActivityFilter>("all");
  const [university, setUniversity] = useState<LookupOption | null>(null);
  const [b2cClient, setB2cClient] = useState<LookupOption | null>(null);
  const [vendor, setVendor] = useState<LookupOption | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState<{
    contact: ContactPerson | null;
  } | null>(null);
  const [isAddingAffiliation, setIsAddingAffiliation] = useState(false);
  const [editingAffiliation, setEditingAffiliation] =
    useState<ContactAffiliation | null>(null);
  // Стабильные обработчики: панель и окна перезапускают эффект фокуса при их смене.
  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const closePersonForm = useCallback(() => setPersonForm(null), []);
  const closeAddAffiliation = useCallback(
    () => setIsAddingAffiliation(false),
    [],
  );
  const closeEditAffiliation = useCallback(
    () => setEditingAffiliation(null),
    [],
  );

  const params = {
    activity,
    b2cClientId: b2cClient?.id ?? null,
    ordering: table.ordering,
    page: table.page,
    search: table.debouncedSearch,
    universityId: university?.id ?? null,
    vendorId: vendor?.id ?? null,
  };
  const contactsQuery = useQuery({
    queryKey: contactPersonsQueryKey(params),
    queryFn: () => getContactPersons(params),
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
  const contact = contactQuery.data;

  /** Запись человека или связи меняет списки, карточки организаций и контакты взаимодействий. */
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: contactPersonsQueryKey() });
    void queryClient.invalidateQueries({
      queryKey: organizationAffiliationsQueryKey(),
    });
    void queryClient.invalidateQueries({
      queryKey: ["interactions", "contacts"],
    });
  }, [queryClient]);

  const activityMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      updateContactPerson(
        selectedId as string,
        { is_active: isActive },
        csrfToken,
      ),
    onSuccess: (updated) => {
      toast.success(updated.is_active ? text.activated : text.deactivated);
      refresh();
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, common.unknownError)),
  });
  const removeMutation = useMutation({
    mutationFn: (affiliation: ContactAffiliation) =>
      deleteAffiliation(affiliation.type, affiliation.id, csrfToken),
    onSuccess: () => {
      toast.success(text.removed);
      refresh();
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, common.unknownError)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContactPerson(id, csrfToken),
    onSuccess: () => {
      toast.success(text.deleted);
      setSelectedId(null);
      refresh();
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, common.unknownError)),
  });

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
      render: (row) => <p className="font-medium">{row.full_name}</p>,
      sortField: "full_name",
      title: text.columnName,
      width: "22%",
    },
    {
      name: "organizations",
      render: (row) =>
        row.affiliations.length === 0 ? (
          <span className="text-muted-foreground">{text.noValue}</span>
        ) : (
          <ul className="space-y-1">
            {row.affiliations.map((affiliation) => {
              const Icon = typeIcons[affiliation.type];

              return (
                <li className="flex items-start gap-2" key={affiliation.id}>
                  <Icon
                    aria-hidden="true"
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block">
                      {affiliation.organization.name}
                    </span>
                    {affiliation.position ? (
                      <span className="text-muted-foreground block text-xs">
                        {affiliation.position}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ),
      title: text.columnOrganizations,
      width: "28%",
    },
    {
      name: "email",
      render: (row) =>
        row.email ? (
          <a
            className="break-all hover:underline"
            href={`mailto:${row.email}`}
            onClick={(event) => event.stopPropagation()}
          >
            {row.email}
          </a>
        ) : (
          <span className="text-muted-foreground">{text.noValue}</span>
        ),
      sortField: "email",
      title: text.columnEmail,
      width: "18%",
    },
    {
      name: "phone",
      render: (row) =>
        row.phone ? (
          <a
            className="whitespace-nowrap hover:underline"
            href={`tel:${row.phone}`}
            onClick={(event) => event.stopPropagation()}
          >
            {row.phone}
          </a>
        ) : (
          <span className="text-muted-foreground">{text.noValue}</span>
        ),
      title: text.columnPhone,
      width: "12%",
    },
    {
      name: "is_active",
      render: (row) => (
        <StatusChip tone={row.is_active ? "positive" : "neutral"}>
          {row.is_active ? text.active : text.inactive}
        </StatusChip>
      ),
      title: text.columnStatus,
      width: "10%",
    },
    {
      align: "right",
      name: "created_at",
      render: (row) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(row.created_at, locale) ?? text.noValue}
        </span>
      ),
      sortField: "created_at",
      title: text.columnCreatedAt,
      width: "10%",
    },
  ];

  return (
    <div className="space-y-5">
      <RegistryHeader
        action={
          canCreate ? (
            <Button
              onClick={() => setPersonForm({ contact: null })}
              size="m"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              {text.create}
            </Button>
          ) : undefined
        }
        description={text.description}
        title={text.title}
      />

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
        <div className="w-56">
          <EntitySelect
            id="contacts-vendor-filter"
            label={text.vendorFilter}
            onChange={table.withPageReset(setVendor)}
            placeholder={text.vendorPlaceholder}
            queryKey={["catalog", "vendors", "lookup"]}
            search={searchVendors}
            value={vendor}
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
        getRowId={(row) => row.id}
        isError={contactsQuery.isError}
        isLoading={contactsQuery.isPending}
        labels={tableLabels}
        onRetry={() => void contactsQuery.refetch()}
        onRowClick={(row) => setSelectedId(row.id)}
        onSortChange={table.setSort}
        rows={contacts}
        selectedRowId={selectedId}
        sort={table.sort}
      />

      {selectedId ? (
        <Drawer
          closeLabel={text.close}
          footer={
            contact && (canUpdate || canDelete) ? (
              <div className="flex flex-wrap items-start justify-between gap-2">
                {canUpdate ? (
                  <div className="flex flex-wrap items-start gap-2">
                    <Button
                      colorScheme="neutral"
                      onClick={() => setPersonForm({ contact })}
                      size="m"
                      type="button"
                      variant="outline"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                      {text.editContact}
                    </Button>
                    {contact.is_active ? (
                      <ConfirmAction
                        cancelLabel={common.cancel}
                        confirmLabel={text.deactivateConfirm}
                        icon={<Power aria-hidden="true" className="size-3.5" />}
                        isPending={activityMutation.isPending}
                        label={text.deactivate}
                        onConfirm={() => activityMutation.mutate(false)}
                        pendingLabel={text.deactivating}
                        question={text.deactivateQuestion}
                      />
                    ) : (
                      <Button
                        colorScheme="neutral"
                        disabled={activityMutation.isPending}
                        onClick={() => activityMutation.mutate(true)}
                        size="m"
                        type="button"
                        variant="outline"
                      >
                        <Power aria-hidden="true" className="size-4" />
                        {text.activate}
                      </Button>
                    )}
                  </div>
                ) : (
                  <span />
                )}
                {canDelete ? (
                  <ConfirmDeleteButton
                    isPending={deleteMutation.isPending}
                    locale={locale}
                    onConfirm={() => deleteMutation.mutate(contact.id)}
                  />
                ) : null}
              </div>
            ) : undefined
          }
          labelledBy={drawerHeadingId}
          onClose={closeDrawer}
        >
          <p className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.08em] uppercase">
            {text.details}
          </p>
          {contact ? (
            <ContactDetails
              canCreate={canCreate}
              canDelete={canDelete}
              canUpdate={canUpdate}
              contact={contact}
              headingId={drawerHeadingId}
              isRemoving={removeMutation.isPending}
              locale={locale}
              onAddAffiliation={() => setIsAddingAffiliation(true)}
              onEditAffiliation={setEditingAffiliation}
              onRemoveAffiliation={(affiliation) =>
                removeMutation.mutate(affiliation)
              }
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

      {personForm ? (
        <ContactPersonForm
          contact={personForm.contact}
          csrfToken={csrfToken}
          onClose={closePersonForm}
          onPickExisting={(existing) => {
            setPersonForm(null);
            setSelectedId(existing.id);
          }}
          onSaved={(saved) => {
            toast.success(personForm.contact ? text.saved : text.created);
            setPersonForm(null);
            setSelectedId(saved.id);
            refresh();
          }}
        />
      ) : null}
      {isAddingAffiliation && contact ? (
        <AddContactAffiliation
          contact={contact}
          csrfToken={csrfToken}
          onClose={closeAddAffiliation}
          onSaved={() => {
            toast.success(text.added);
            setIsAddingAffiliation(false);
            refresh();
          }}
        />
      ) : null}
      {editingAffiliation && contact ? (
        <EditAffiliation
          affiliation={editingAffiliation}
          contactName={contact.full_name}
          csrfToken={csrfToken}
          onClose={closeEditAffiliation}
          onSaved={() => {
            toast.success(text.saved);
            setEditingAffiliation(null);
            refresh();
          }}
          organization={{
            id: editingAffiliation.organization.id,
            type: editingAffiliation.type,
          }}
          organizationName={editingAffiliation.organization.name}
        />
      ) : null}
    </div>
  );
}
