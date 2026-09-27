"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Factory, LoaderCircle, Pencil, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  apiErrorMessage,
  ConfirmDeleteButton,
  DetailRows,
  Field,
  fieldInputClass,
  registryCopy,
  RegistryHeader,
  registryPaginationLabels,
  registryTableLabels,
} from "@/components/registry/registry-shared";
import { OrganizationContacts } from "@/components/organizations/organization-contacts";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { Modal } from "@/components/ui/modal";
import { StatusChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar, type TableFilter } from "@/components/ui/table-toolbar";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import {
  createVendor,
  deleteVendor,
  getVendor,
  getVendors,
  updateVendor,
  vendorsPageSize,
  vendorsQueryKey,
} from "@/lib/api/catalog/vendors";
import { formatDate } from "@/lib/format-date";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Vendor } from "@/types/vendor";

const drawerHeadingId = "vendor-drawer-title";
const formHeadingId = "vendor-form-title";

type Activity = "all" | "active" | "inactive";

const copy = {
  ru: {
    title: "Вендоры",
    description: "Поставщики ИТ-продуктов каталога.",
    create: "Новый вендор",
    createTitle: "Новый вендор",
    editTitle: "Редактировать вендора",
    searchLabel: "Поиск вендоров",
    searchPlaceholder: "Название или внешний код",
    activity: "Активность",
    active: "Активен",
    inactive: "Неактивен",
    activePlural: "Активные",
    inactivePlural: "Неактивные",
    name: "Название",
    code: "Внешний код",
    status: "Статус",
    createdAt: "Создан",
    updatedAt: "Обновлён",
    tableCaption: "Вендоры",
    loading: "Загружаем вендоров…",
    error: "Не удалось загрузить список вендоров.",
    details: "Карточка вендора",
    loadingDetails: "Загружаем карточку вендора…",
    detailsError: "Не удалось загрузить карточку вендора.",
    created: "Вендор добавлен.",
    saved: "Изменения сохранены.",
    deleted: "Вендор удалён.",
  },
  en: {
    title: "Vendors",
    description: "Suppliers of the catalog's IT products.",
    create: "New vendor",
    createTitle: "New vendor",
    editTitle: "Edit vendor",
    searchLabel: "Search vendors",
    searchPlaceholder: "Name or external code",
    activity: "Activity",
    active: "Active",
    inactive: "Inactive",
    activePlural: "Active",
    inactivePlural: "Inactive",
    name: "Name",
    code: "External code",
    status: "Status",
    createdAt: "Created",
    updatedAt: "Updated",
    tableCaption: "Vendors",
    loading: "Loading vendors…",
    error: "The vendor list could not be loaded.",
    details: "Vendor card",
    loadingDetails: "Loading the vendor card…",
    detailsError: "The vendor card could not be loaded.",
    created: "Vendor added.",
    saved: "Changes saved.",
    deleted: "Vendor deleted.",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

function VendorForm({
  csrfToken,
  onClose,
  onSaved,
  text,
  vendor,
}: {
  csrfToken: string;
  onClose: () => void;
  onSaved: (vendor: Vendor) => void;
  text: Text;
  vendor: Vendor | null;
}) {
  const { locale } = useLocale();
  const common = registryCopy[locale];
  const [name, setName] = useState(vendor?.name ?? "");
  const [code, setCode] = useState(vendor?.external_code ?? "");
  const [isActive, setIsActive] = useState(vendor?.is_active ?? true);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        external_code: code.trim() || null,
        is_active: isActive,
        name: name.trim(),
      };

      return vendor
        ? updateVendor(vendor.id, payload, csrfToken)
        : createVendor(payload, csrfToken);
    },
    onSuccess: onSaved,
  });

  return (
    <Modal
      closeLabel={common.cancel}
      labelledBy={formHeadingId}
      onClose={onClose}
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="border-b px-5 py-4 pr-14">
          <h2 className="text-lg font-medium" id={formHeadingId}>
            {vendor ? text.editTitle : text.createTitle}
          </h2>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field htmlFor="vendor-name" label={text.name} required>
            <input
              className={fieldInputClass}
              id="vendor-name"
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </Field>
          <Field htmlFor="vendor-code" label={text.code}>
            <input
              className={fieldInputClass}
              id="vendor-code"
              maxLength={255}
              onChange={(event) => setCode(event.target.value)}
              value={code}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              type="checkbox"
            />
            {text.active}
          </label>
        </div>
        <div className="space-y-3 border-t px-5 py-4">
          {mutation.isError ? (
            <p className="text-sm text-[var(--atmr-brand-orange)]">
              {apiErrorMessage(mutation.error, common.unknownError)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              colorScheme="neutral"
              onClick={onClose}
              size="m"
              type="button"
              variant="outline"
            >
              {common.cancel}
            </Button>
            <Button
              disabled={!name.trim() || mutation.isPending}
              size="m"
              type="submit"
            >
              {mutation.isPending ? common.saving : common.save}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Справочник вендоров: таблица с поиском и отбором, карточка и правка. */
export function VendorsWorkspace() {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  const canCreate = user !== null && can(user, "catalog.create");
  const canUpdate = user !== null && can(user, "catalog.update");
  const canDelete = user !== null && can(user, "catalog.delete");
  const text = copy[locale];
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const table = useTableQueryState({ direction: "asc", field: "name" });
  const [activity, setActivity] = useState<Activity>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ vendor: Vendor | null } | null>(null);
  // Стабильный обработчик: панель перезапускает эффект фокуса при его смене
  // и иначе отбирала бы фокус у открытой поверх формы.
  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const closeForm = useCallback(() => setForm(null), []);

  const params = {
    isActive: activity === "all" ? null : activity === "active",
    ordering: table.ordering,
    page: table.page,
    search: table.debouncedSearch,
  };

  const vendorsQuery = useQuery({
    queryKey: vendorsQueryKey(params),
    queryFn: () => getVendors(params),
    placeholderData: keepPreviousData,
  });
  const vendors = vendorsQuery.data?.results ?? [];
  const selectedRow = vendors.find((vendor) => vendor.id === selectedId);

  const vendorQuery = useQuery({
    queryKey: ["catalog", "vendors", "detail", selectedId],
    queryFn: () => getVendor(selectedId as string),
    enabled: selectedId !== null,
    placeholderData: selectedRow,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVendor(id, csrfToken),
    onSuccess: () => {
      toast.success(text.deleted);
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: vendorsQueryKey() });
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, common.unknownError)),
  });

  const filters: TableFilter[] = [
    {
      label: text.activity,
      name: "activity",
      onChange: table.withPageReset((value: string) =>
        setActivity(value as Activity),
      ),
      options: [
        { label: common.all, value: "all" },
        { label: text.activePlural, value: "active" },
        { label: text.inactivePlural, value: "inactive" },
      ],
      value: activity,
    },
  ];

  const columns: DataTableColumn<Vendor>[] = [
    {
      name: "name",
      render: (vendor) => (
        <span className="flex items-center gap-2 font-medium">
          <Factory
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
          {vendor.name}
        </span>
      ),
      sortField: "name",
      title: text.name,
      width: "38%",
    },
    {
      name: "external_code",
      render: (vendor) => (
        <span className="text-muted-foreground">
          {vendor.external_code || common.noValue}
        </span>
      ),
      sortField: "external_code",
      title: text.code,
      width: "20%",
    },
    {
      name: "is_active",
      render: (vendor) => (
        <StatusChip tone={vendor.is_active ? "positive" : "neutral"}>
          {vendor.is_active ? text.active : text.inactive}
        </StatusChip>
      ),
      sortField: "is_active",
      title: text.status,
      width: "14%",
    },
    {
      align: "right",
      name: "created_at",
      render: (vendor) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(vendor.created_at, locale)}
        </span>
      ),
      sortField: "created_at",
      title: text.createdAt,
      width: "14%",
    },
    {
      align: "right",
      name: "updated_at",
      render: (vendor) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(vendor.updated_at, locale)}
        </span>
      ),
      sortField: "updated_at",
      title: text.updatedAt,
      width: "14%",
    },
  ];

  const vendor = vendorQuery.data;

  return (
    <div className="space-y-5">
      <RegistryHeader
        action={
          canCreate ? (
            <Button
              onClick={() => setForm({ vendor: null })}
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
          clearLabel: common.clearSearch,
          label: text.searchLabel,
          onChange: table.setSearch,
          placeholder: text.searchPlaceholder,
          value: table.search,
        }}
      />

      <DataTable
        caption={text.tableCaption}
        columns={columns}
        footer={
          <TablePagination
            count={vendorsQuery.data?.count ?? 0}
            labels={registryPaginationLabels(locale)}
            onPageChange={table.setPage}
            page={table.page}
            pageSize={vendorsPageSize}
          />
        }
        getRowId={(row) => row.id}
        isError={vendorsQuery.isError}
        isLoading={vendorsQuery.isPending}
        labels={registryTableLabels(locale, {
          error: text.error,
          loading: text.loading,
        })}
        onRetry={() => void vendorsQuery.refetch()}
        onRowClick={(row) => setSelectedId(row.id)}
        onSortChange={table.setSort}
        rows={vendors}
        selectedRowId={selectedId}
        sort={table.sort}
      />

      {selectedId ? (
        <Drawer
          closeLabel={common.close}
          footer={
            vendor && (canUpdate || canDelete) ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {canUpdate ? (
                  <Button
                    colorScheme="neutral"
                    onClick={() => setForm({ vendor })}
                    size="m"
                    type="button"
                    variant="outline"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    {common.edit}
                  </Button>
                ) : null}
                {canDelete ? (
                  <ConfirmDeleteButton
                    isPending={deleteMutation.isPending}
                    locale={locale}
                    onConfirm={() => deleteMutation.mutate(vendor.id)}
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
          {vendor ? (
            <>
              <h2 className="text-xl font-medium" id={drawerHeadingId}>
                {vendor.name}
              </h2>
              <span className="mt-3 inline-flex">
                <StatusChip tone={vendor.is_active ? "positive" : "neutral"}>
                  {vendor.is_active ? text.active : text.inactive}
                </StatusChip>
              </span>
              <div className="mt-4">
                <DetailRows
                  noValue={common.noValue}
                  rows={[
                    [text.code, vendor.external_code],
                    [text.createdAt, formatDate(vendor.created_at, locale)],
                    [text.updatedAt, formatDate(vendor.updated_at, locale)],
                  ]}
                />
              </div>
              <OrganizationContacts
                organization={{ id: vendor.id, type: "vendor" }}
                organizationName={vendor.name}
              />
            </>
          ) : vendorQuery.isError ? (
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
        <VendorForm
          csrfToken={csrfToken}
          onClose={closeForm}
          onSaved={(saved) => {
            toast.success(form.vendor ? text.saved : text.created);
            setForm(null);
            setSelectedId(saved.id);
            queryClient.setQueryData(
              ["catalog", "vendors", "detail", saved.id],
              saved,
            );
            void queryClient.invalidateQueries({ queryKey: vendorsQueryKey() });
          }}
          text={text}
          vendor={form.vendor}
        />
      ) : null}
    </div>
  );
}
