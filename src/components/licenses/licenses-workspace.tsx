"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BadgeCheck, LoaderCircle, Pencil, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { interactionTitle } from "@/components/interactions/interaction-list";
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
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { EntitySelect } from "@/components/ui/entity-select";
import { Modal } from "@/components/ui/modal";
import { StatusChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar, type TableFilter } from "@/components/ui/table-toolbar";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import {
  searchCatalogProducts,
  searchContracts,
  searchInteractionProducts,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import {
  contractQueryKey,
  getContract,
} from "@/lib/api/interactions/contracts";
import {
  createLicense,
  deleteLicense,
  getLicense,
  getLicenses,
  licensesPageSize,
  licensesQueryKey,
  updateLicense,
  type LicenseSignedFilter,
  type LicenseStateFilter,
} from "@/lib/api/interactions/licenses";
import { formatDate } from "@/lib/format-date";
import { useAuth } from "@/providers/auth-provider";
import { can } from "@/lib/permissions";
import { useLocale } from "@/providers/locale-provider";
import type { License } from "@/types/license";

const drawerHeadingId = "license-drawer-title";
const formHeadingId = "license-form-title";

const copy = {
  ru: {
    title: "Лицензии",
    description:
      "Реестр лицензий на продукты по договорам: подписание, сроки действия и история перезаключений.",
    create: "Новая лицензия",
    createTitle: "Новая лицензия",
    editTitle: "Редактировать лицензию",
    reissueHint:
      "Если по этому договору на продукт уже есть действующая лицензия, она будет закрыта и останется в истории.",
    searchLabel: "Поиск лицензий",
    searchPlaceholder: "Номер договора или название продукта",
    state: "Состояние",
    stateActive: "Действующие",
    stateSuperseded: "Заменённые",
    signedFilter: "Подписание",
    signedYes: "Подписаны",
    signedNo: "Не подписаны",
    contract: "Договор",
    anyContract: "Любой договор",
    product: "Продукт",
    anyProduct: "Любой продукт",
    validFrom: "Действует до, с",
    validTo: "по",
    yearPlaceholder: "год",
    counterparty: "Контрагент",
    signed: "Подписана",
    unsigned: "Не подписана",
    signedAt: "Дата подписания",
    validUntil: "Действует до",
    status: "Состояние",
    active: "Действующая",
    superseded: "Заменена",
    expired: "Срок истёк",
    createdAt: "Оформлена",
    createdBy: "Оформил",
    supersededAt: "Заменена",
    tableCaption: "Лицензии",
    loading: "Загружаем лицензии…",
    error: "Не удалось загрузить реестр лицензий.",
    details: "Карточка лицензии",
    loadingDetails: "Загружаем карточку лицензии…",
    detailsError: "Не удалось загрузить карточку лицензии.",
    contractPlaceholder: "Выберите договор",
    productPlaceholder: "Выберите продукт взаимодействия",
    productDisabled: "Сначала выберите договор",
    created: "Лицензия оформлена.",
    saved: "Изменения сохранены.",
    deleted: "Лицензия удалена.",
  },
  en: {
    title: "Licenses",
    description:
      "Register of product licenses under contracts: signing, validity, and reissue history.",
    create: "New license",
    createTitle: "New license",
    editTitle: "Edit license",
    reissueHint:
      "If this contract already has an active license for the product, it will be closed and kept in the history.",
    searchLabel: "Search licenses",
    searchPlaceholder: "Contract number or product name",
    state: "State",
    stateActive: "Active",
    stateSuperseded: "Superseded",
    signedFilter: "Signing",
    signedYes: "Signed",
    signedNo: "Not signed",
    contract: "Contract",
    anyContract: "Any contract",
    product: "Product",
    anyProduct: "Any product",
    validFrom: "Valid until, from",
    validTo: "to",
    yearPlaceholder: "year",
    counterparty: "Counterparty",
    signed: "Signed",
    unsigned: "Not signed",
    signedAt: "Signing date",
    validUntil: "Valid until",
    status: "State",
    active: "Active",
    superseded: "Superseded",
    expired: "Expired",
    createdAt: "Issued",
    createdBy: "Issued by",
    supersededAt: "Superseded",
    tableCaption: "Licenses",
    loading: "Loading licenses…",
    error: "The license register could not be loaded.",
    details: "License card",
    loadingDetails: "Loading the license card…",
    detailsError: "The license card could not be loaded.",
    contractPlaceholder: "Select a contract",
    productPlaceholder: "Select an interaction product",
    productDisabled: "Select a contract first",
    created: "License issued.",
    saved: "Changes saved.",
    deleted: "License deleted.",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

const currentYear = new Date().getFullYear();

function isExpired(license: License) {
  return (
    license.valid_until_year !== null && license.valid_until_year < currentYear
  );
}

function StateChip({ license, text }: { license: License; text: Text }) {
  if (!license.is_active) {
    return <StatusChip>{text.superseded}</StatusChip>;
  }

  if (isExpired(license)) {
    return (
      <StatusChip className="bg-[var(--atmr-brand-orange)]/12 text-[var(--atmr-brand-orange)]">
        {text.expired}
      </StatusChip>
    );
  }

  return <StatusChip tone="positive">{text.active}</StatusChip>;
}

function yearValue(value: string) {
  return /^\d{4}$/.test(value.trim()) ? value.trim() : "";
}

function LicenseForm({
  csrfToken,
  license,
  onClose,
  onSaved,
  text,
}: {
  csrfToken: string;
  license: License | null;
  onClose: () => void;
  onSaved: (license: License) => void;
  text: Text;
}) {
  const { locale } = useLocale();
  const common = registryCopy[locale];
  const [contract, setContract] = useState<LookupOption | null>(null);
  const [product, setProduct] = useState<LookupOption | null>(null);
  const [isSigned, setIsSigned] = useState(license?.is_signed ?? false);
  const [signedAt, setSignedAt] = useState(license?.signed_at ?? "");
  const [validUntil, setValidUntil] = useState(
    license?.valid_until_year ? String(license.valid_until_year) : "",
  );

  // Продукт лицензии — продукт взаимодействия договора: без договора
  // выбирать не из чего.
  const contractQuery = useQuery({
    queryKey: contractQueryKey(contract?.id ?? ""),
    queryFn: () => getContract(contract!.id),
    enabled: contract !== null,
  });
  const interactionId = contractQuery.data?.interaction.id ?? null;

  const mutation = useMutation({
    mutationFn: () => {
      const fields = {
        is_signed: isSigned,
        signed_at: signedAt || null,
        valid_until_year: validUntil ? Number(validUntil) : null,
      };

      return license
        ? updateLicense(license.id, fields, csrfToken)
        : createLicense(
            {
              ...fields,
              contract: contract!.id,
              interaction_product: product!.id,
            },
            csrfToken,
          );
    },
    onSuccess: onSaved,
  });

  const canSubmit =
    !mutation.isPending &&
    (license !== null || (contract !== null && product !== null)) &&
    (validUntil === "" || yearValue(validUntil) !== "");

  return (
    <Modal
      allowContentOverflow
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
            {license ? text.editTitle : text.createTitle}
          </h2>
          {license ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {license.interaction_product.product.name} ·{" "}
              {license.contract.contract_number}
            </p>
          ) : null}
        </div>
        <div className="space-y-4 px-5 py-4">
          {license ? null : (
            <>
              <Field htmlFor="license-contract" label={text.contract} required>
                <div className="mt-1">
                  <EntitySelect
                    id="license-contract"
                    label={text.contract}
                    onChange={(value) => {
                      setContract(value);
                      setProduct(null);
                    }}
                    placeholder={text.contractPlaceholder}
                    queryKey={["interactions", "contracts", "lookup"]}
                    search={searchContracts}
                    value={contract}
                  />
                </div>
              </Field>
              <Field htmlFor="license-product" label={text.product} required>
                <div className="mt-1">
                  <EntitySelect
                    disabled={interactionId === null}
                    disabledHint={text.productDisabled}
                    id="license-product"
                    label={text.product}
                    onChange={setProduct}
                    placeholder={text.productPlaceholder}
                    queryKey={[
                      "interactions",
                      "interaction-products",
                      "lookup",
                      interactionId,
                    ]}
                    search={(term) =>
                      searchInteractionProducts(term, interactionId ?? "")
                    }
                    value={product}
                  />
                </div>
              </Field>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="license-signed-at" label={text.signedAt}>
              <input
                className={fieldInputClass}
                id="license-signed-at"
                onChange={(event) => setSignedAt(event.target.value)}
                type="date"
                value={signedAt}
              />
            </Field>
            <Field htmlFor="license-valid-until" label={text.validUntil}>
              <input
                className={fieldInputClass}
                id="license-valid-until"
                inputMode="numeric"
                max={9999}
                min={1900}
                onChange={(event) => setValidUntil(event.target.value)}
                placeholder={String(currentYear + 1)}
                type="number"
                value={validUntil}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={isSigned}
              onChange={(event) => setIsSigned(event.target.checked)}
              type="checkbox"
            />
            {text.signed}
          </label>
          {license ? null : (
            <p className="text-muted-foreground text-xs leading-5">
              {text.reissueHint}
            </p>
          )}
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
            <Button disabled={!canSubmit} size="m" type="submit">
              {mutation.isPending ? common.saving : common.save}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function LicenseDetails({ license, text }: { license: License; text: Text }) {
  const { locale } = useLocale();
  const common = registryCopy[locale];
  const contractQuery = useQuery({
    queryKey: contractQueryKey(license.contract.id),
    queryFn: () => getContract(license.contract.id),
  });

  return (
    <>
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
          <BadgeCheck aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-medium" id={drawerHeadingId}>
            {license.interaction_product.product.name}
          </h2>
          <span className="mt-2 flex flex-wrap gap-2">
            <StateChip license={license} text={text} />
            <StatusChip tone={license.is_signed ? "accent" : "neutral"}>
              {license.is_signed ? text.signed : text.unsigned}
            </StatusChip>
          </span>
        </div>
      </div>
      <div className="mt-4">
        <DetailRows
          noValue={common.noValue}
          rows={[
            [text.contract, license.contract.contract_number],
            [
              text.counterparty,
              contractQuery.data
                ? interactionTitle(
                    contractQuery.data.interaction,
                    common.noValue,
                  )
                : null,
            ],
            [text.signedAt, formatDate(license.signed_at, locale)],
            [text.validUntil, license.valid_until_year],
            [text.createdAt, formatDate(license.created_at, locale)],
            [text.createdBy, license.created_by?.full_name],
            ...(license.superseded_at
              ? ([
                  [
                    text.supersededAt,
                    formatDate(license.superseded_at, locale),
                  ],
                ] as [string, string | null][])
              : []),
          ]}
        />
      </div>
    </>
  );
}

/**
 * Реестр лицензий: таблица с поиском и отборами по состоянию, подписанию,
 * договору, продукту и году окончания; карточка, оформление и правка.
 */
export function LicensesWorkspace() {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  const canCreate = user !== null && can(user, "licenses.create");
  const canUpdate = user !== null && can(user, "licenses.update");
  const canDelete = user !== null && can(user, "licenses.delete");
  const text = copy[locale];
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const table = useTableQueryState({ direction: "desc", field: "created_at" });
  const [state, setState] = useState<LicenseStateFilter>("active");
  const [signed, setSigned] = useState<LicenseSignedFilter>("all");
  const [contract, setContract] = useState<LookupOption | null>(null);
  const [product, setProduct] = useState<LookupOption | null>(null);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ license: License | null } | null>(null);
  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const closeForm = useCallback(() => setForm(null), []);

  const params = {
    contractId: contract?.id ?? null,
    ordering: table.ordering,
    page: table.page,
    productId: product?.id ?? null,
    search: table.debouncedSearch,
    signed,
    state,
    validFrom: yearValue(validFrom),
    validTo: yearValue(validTo),
  };

  const licensesQuery = useQuery({
    queryKey: licensesQueryKey(params),
    queryFn: () => getLicenses(params),
    placeholderData: keepPreviousData,
  });
  const licenses = licensesQuery.data?.results ?? [];
  const selectedRow = licenses.find((license) => license.id === selectedId);

  const licenseQuery = useQuery({
    queryKey: ["interactions", "licenses", "detail", selectedId],
    queryFn: () => getLicense(selectedId as string),
    enabled: selectedId !== null,
    placeholderData: selectedRow,
  });
  const license = licenseQuery.data;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLicense(id, csrfToken),
    onSuccess: () => {
      toast.success(text.deleted);
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: licensesQueryKey() });
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, common.unknownError)),
  });

  const filters: TableFilter[] = [
    {
      label: text.state,
      name: "state",
      onChange: table.withPageReset((value: string) =>
        setState(value as LicenseStateFilter),
      ),
      options: [
        { label: common.all, value: "all" },
        { label: text.stateActive, value: "active" },
        { label: text.stateSuperseded, value: "superseded" },
      ],
      value: state,
    },
    {
      label: text.signedFilter,
      name: "signed",
      onChange: table.withPageReset((value: string) =>
        setSigned(value as LicenseSignedFilter),
      ),
      options: [
        { label: common.all, value: "all" },
        { label: text.signedYes, value: "signed" },
        { label: text.signedNo, value: "unsigned" },
      ],
      value: signed,
    },
  ];

  const columns: DataTableColumn<License>[] = [
    {
      name: "product",
      render: (row) => (
        <span className="font-medium">
          {row.interaction_product.product.name}
        </span>
      ),
      title: text.product,
      width: "26%",
    },
    {
      name: "contract",
      render: (row) => row.contract.contract_number || common.noValue,
      title: text.contract,
      width: "16%",
    },
    {
      name: "signed_at",
      render: (row) => (
        <span className="flex flex-col items-start gap-1">
          <StatusChip tone={row.is_signed ? "accent" : "neutral"}>
            {row.is_signed ? text.signed : text.unsigned}
          </StatusChip>
          {row.signed_at ? (
            <span className="text-muted-foreground text-xs">
              {formatDate(row.signed_at, locale)}
            </span>
          ) : null}
        </span>
      ),
      sortField: "signed_at",
      title: text.signedAt,
      width: "16%",
    },
    {
      name: "valid_until_year",
      render: (row) =>
        row.valid_until_year ?? (
          <span className="text-muted-foreground">{common.noValue}</span>
        ),
      sortField: "valid_until_year",
      title: text.validUntil,
      width: "12%",
    },
    {
      name: "is_active",
      render: (row) => <StateChip license={row} text={text} />,
      sortField: "is_active",
      title: text.status,
      width: "14%",
    },
    {
      align: "right",
      name: "created_at",
      render: (row) => (
        <span className="text-muted-foreground block">
          <span className="block whitespace-nowrap">
            {formatDate(row.created_at, locale)}
          </span>
          {row.created_by ? (
            <span className="block truncate text-xs">
              {row.created_by.full_name}
            </span>
          ) : null}
        </span>
      ),
      sortField: "created_at",
      title: text.createdAt,
      width: "16%",
    },
  ];

  return (
    <div className="space-y-5">
      <RegistryHeader
        action={
          canCreate ? (
            <Button
              onClick={() => setForm({ license: null })}
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
      >
        <div className="w-56">
          <EntitySelect
            id="licenses-contract-filter"
            label={text.contract}
            onChange={table.withPageReset(setContract)}
            placeholder={text.anyContract}
            queryKey={["interactions", "contracts", "lookup"]}
            search={searchContracts}
            value={contract}
          />
        </div>
        <div className="w-56">
          <EntitySelect
            id="licenses-product-filter"
            label={text.product}
            onChange={table.withPageReset(setProduct)}
            placeholder={text.anyProduct}
            queryKey={["catalog", "products", "lookup"]}
            search={searchCatalogProducts}
            value={product}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label
            className="text-muted-foreground"
            htmlFor="licenses-valid-from"
          >
            {text.validFrom}
          </label>
          <input
            className={`${fieldInputClass} mt-0 w-24`}
            id="licenses-valid-from"
            inputMode="numeric"
            onChange={(event) => {
              setValidFrom(event.target.value);
              table.setPage(1);
            }}
            placeholder={text.yearPlaceholder}
            type="number"
            value={validFrom}
          />
          <label className="text-muted-foreground" htmlFor="licenses-valid-to">
            {text.validTo}
          </label>
          <input
            className={`${fieldInputClass} mt-0 w-24`}
            id="licenses-valid-to"
            inputMode="numeric"
            onChange={(event) => {
              setValidTo(event.target.value);
              table.setPage(1);
            }}
            placeholder={text.yearPlaceholder}
            type="number"
            value={validTo}
          />
        </div>
      </TableToolbar>

      <DataTable
        caption={text.tableCaption}
        columns={columns}
        footer={
          <TablePagination
            count={licensesQuery.data?.count ?? 0}
            labels={registryPaginationLabels(locale)}
            onPageChange={table.setPage}
            page={table.page}
            pageSize={licensesPageSize}
          />
        }
        getRowId={(row) => row.id}
        isError={licensesQuery.isError}
        isLoading={licensesQuery.isPending}
        labels={registryTableLabels(locale, {
          error: text.error,
          loading: text.loading,
        })}
        onRetry={() => void licensesQuery.refetch()}
        onRowClick={(row) => setSelectedId(row.id)}
        onSortChange={table.setSort}
        rows={licenses}
        selectedRowId={selectedId}
        sort={table.sort}
      />

      {selectedId ? (
        <Drawer
          closeLabel={common.close}
          footer={
            license && (canUpdate || canDelete) ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {canUpdate ? (
                  <Button
                    colorScheme="neutral"
                    onClick={() => setForm({ license })}
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
                    onConfirm={() => deleteMutation.mutate(license.id)}
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
          {license ? (
            <LicenseDetails license={license} text={text} />
          ) : licenseQuery.isError ? (
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
        <LicenseForm
          csrfToken={csrfToken}
          license={form.license}
          onClose={closeForm}
          onSaved={(saved) => {
            toast.success(form.license ? text.saved : text.created);
            setForm(null);
            setSelectedId(saved.id);
            queryClient.setQueryData(
              ["interactions", "licenses", "detail", saved.id],
              saved,
            );
            void queryClient.invalidateQueries({
              queryKey: licensesQueryKey(),
            });
          }}
          text={text}
        />
      ) : null}
    </div>
  );
}
