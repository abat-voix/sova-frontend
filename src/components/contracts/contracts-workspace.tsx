"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Building2,
  Download,
  FileText,
  LoaderCircle,
  Paperclip,
  Pencil,
  Plus,
  UserRound,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ContractFiles } from "@/components/contracts/contract-files";
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
  searchInteractions,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import {
  contractQueryKey,
  contractsPageSize,
  contractsQueryKey,
  createContract,
  deleteContract,
  getContract,
  getContracts,
  updateContract,
  type ContractSignedFilter,
} from "@/lib/api/interactions/contracts";
import { getLicenses } from "@/lib/api/interactions/licenses";
import { formatDate } from "@/lib/format-date";
import { useAuth } from "@/providers/auth-provider";
import { can } from "@/lib/permissions";
import { useLocale } from "@/providers/locale-provider";
import type { Contract } from "@/types/contract";

const drawerHeadingId = "contract-drawer-title";
const formHeadingId = "contract-form-title";

const copy = {
  ru: {
    title: "Договоры",
    description:
      "Договоры по взаимодействиям: этапы подписания, файлы и их версии, выданные лицензии.",
    create: "Новый договор",
    createTitle: "Новый договор",
    editTitle: "Редактировать договор",
    searchLabel: "Поиск договоров",
    searchPlaceholder: "Номер договора",
    signedFilter: "Подписание",
    signedYes: "Подписаны",
    signedNo: "Не подписаны",
    counterparty: "Контрагент",
    anyCounterparty: "Любое взаимодействие",
    interactionPlaceholder: "Выберите взаимодействие",
    signedPeriod: "Подписан",
    from: "с",
    to: "по",
    number: "Номер",
    noNumber: "Без номера",
    stage: "Этап",
    draft: "Черновик",
    sent: "На подписании",
    corrected: "Скорректирован",
    signed: "Подписан",
    sentAt: "Отправлен на подписание",
    correctedAt: "Скорректирован",
    signedAt: "Подписан",
    files: "Файлы",
    file: "Файл договора",
    fileHint: "Можно загрузить и позже — из карточки договора.",
    download: "Скачать текущий файл",
    createdAt: "Создан",
    updatedAt: "Обновлён",
    tableCaption: "Договоры",
    loading: "Загружаем договоры…",
    error: "Не удалось загрузить список договоров.",
    details: "Карточка договора",
    loadingDetails: "Загружаем карточку договора…",
    detailsError: "Не удалось загрузить карточку договора.",
    licenses: "Лицензии по договору",
    licensesEmpty: "Лицензий по договору нет.",
    licensesError: "Не удалось загрузить лицензии.",
    validUntil: "до",
    superseded: "заменена",
    created: "Договор создан.",
    saved: "Изменения сохранены.",
    deleted: "Договор удалён.",
  },
  en: {
    title: "Contracts",
    description:
      "Interaction contracts: signing stages, files and their versions, issued licenses.",
    create: "New contract",
    createTitle: "New contract",
    editTitle: "Edit contract",
    searchLabel: "Search contracts",
    searchPlaceholder: "Contract number",
    signedFilter: "Signing",
    signedYes: "Signed",
    signedNo: "Not signed",
    counterparty: "Counterparty",
    anyCounterparty: "Any interaction",
    interactionPlaceholder: "Select an interaction",
    signedPeriod: "Signed",
    from: "from",
    to: "to",
    number: "Number",
    noNumber: "No number",
    stage: "Stage",
    draft: "Draft",
    sent: "Out for signing",
    corrected: "Corrected",
    signed: "Signed",
    sentAt: "Sent for signing",
    correctedAt: "Corrected",
    signedAt: "Signed",
    files: "Files",
    file: "Contract file",
    fileHint: "You can also upload it later from the contract card.",
    download: "Download the current file",
    createdAt: "Created",
    updatedAt: "Updated",
    tableCaption: "Contracts",
    loading: "Loading contracts…",
    error: "The contract list could not be loaded.",
    details: "Contract card",
    loadingDetails: "Loading the contract card…",
    detailsError: "The contract card could not be loaded.",
    licenses: "Licenses under the contract",
    licensesEmpty: "No licenses under this contract.",
    licensesError: "The licenses could not be loaded.",
    validUntil: "until",
    superseded: "superseded",
    created: "Contract created.",
    saved: "Changes saved.",
    deleted: "Contract deleted.",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

/** Этап договора — по самой поздней из заполненных дат. */
function StageChip({ contract, text }: { contract: Contract; text: Text }) {
  if (contract.signed_at) {
    return <StatusChip tone="positive">{text.signed}</StatusChip>;
  }
  if (contract.corrected_at) {
    return <StatusChip tone="accent">{text.corrected}</StatusChip>;
  }
  if (contract.sent_at) {
    return <StatusChip tone="accent">{text.sent}</StatusChip>;
  }

  return <StatusChip>{text.draft}</StatusChip>;
}

function Counterparty({
  contract,
  fallback,
}: {
  contract: Contract;
  fallback: string;
}) {
  const Icon = contract.interaction.university ? Building2 : UserRound;

  return (
    <span className="flex items-start gap-2">
      <Icon
        aria-hidden="true"
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
      />
      <span className="min-w-0">
        {interactionTitle(contract.interaction, fallback)}
      </span>
    </span>
  );
}

function ContractForm({
  contract,
  csrfToken,
  onClose,
  onSaved,
  text,
}: {
  contract: Contract | null;
  csrfToken: string;
  onClose: () => void;
  onSaved: (contract: Contract) => void;
  text: Text;
}) {
  const { locale } = useLocale();
  const common = registryCopy[locale];
  const [interaction, setInteraction] = useState<LookupOption | null>(null);
  const [number, setNumber] = useState(contract?.contract_number ?? "");
  const [sentAt, setSentAt] = useState(contract?.sent_at ?? "");
  const [correctedAt, setCorrectedAt] = useState(contract?.corrected_at ?? "");
  const [signedAt, setSignedAt] = useState(contract?.signed_at ?? "");
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      contract
        ? updateContract(
            contract.id,
            {
              contract_number: number.trim(),
              corrected_at: correctedAt || null,
              sent_at: sentAt || null,
              signed_at: signedAt || null,
            },
            csrfToken,
          )
        : createContract(
            {
              contract_number: number.trim(),
              corrected_at: correctedAt,
              file,
              interaction: interaction!.id,
              sent_at: sentAt,
              signed_at: signedAt,
            },
            csrfToken,
          ),
    onSuccess: onSaved,
  });

  const canSubmit =
    !mutation.isPending && (contract !== null || interaction !== null);

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
            {contract ? text.editTitle : text.createTitle}
          </h2>
          {contract ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {interactionTitle(contract.interaction, common.noValue)}
            </p>
          ) : null}
        </div>
        <div className="space-y-4 px-5 py-4">
          {contract ? null : (
            <Field
              htmlFor="contract-interaction"
              label={text.counterparty}
              required
            >
              <div className="mt-1">
                <EntitySelect
                  id="contract-interaction"
                  label={text.counterparty}
                  onChange={setInteraction}
                  placeholder={text.interactionPlaceholder}
                  queryKey={["interactions", "lookup"]}
                  search={searchInteractions}
                  value={interaction}
                />
              </div>
            </Field>
          )}
          <Field htmlFor="contract-number" label={text.number}>
            <input
              className={fieldInputClass}
              id="contract-number"
              maxLength={255}
              onChange={(event) => setNumber(event.target.value)}
              value={number}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field htmlFor="contract-sent-at" label={text.sentAt}>
              <input
                className={fieldInputClass}
                id="contract-sent-at"
                onChange={(event) => setSentAt(event.target.value)}
                type="date"
                value={sentAt}
              />
            </Field>
            <Field htmlFor="contract-corrected-at" label={text.correctedAt}>
              <input
                className={fieldInputClass}
                id="contract-corrected-at"
                onChange={(event) => setCorrectedAt(event.target.value)}
                type="date"
                value={correctedAt}
              />
            </Field>
            <Field htmlFor="contract-signed-at" label={text.signedAt}>
              <input
                className={fieldInputClass}
                id="contract-signed-at"
                onChange={(event) => setSignedAt(event.target.value)}
                type="date"
                value={signedAt}
              />
            </Field>
          </div>
          {contract ? null : (
            <Field
              hint={text.fileHint}
              htmlFor="contract-file"
              label={text.file}
            >
              <input
                className="mt-1 w-full text-sm"
                id="contract-file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </Field>
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

function ContractLicenses({
  contractId,
  text,
}: {
  contractId: string;
  text: Text;
}) {
  const { locale } = useLocale();
  const licensesQuery = useQuery({
    queryKey: ["interactions", "licenses", "contract", contractId],
    queryFn: () =>
      getLicenses({
        contractId,
        ordering: "-created_at",
        page: 1,
        productId: null,
        search: "",
        signed: "all",
        state: "all",
        validFrom: "",
        validTo: "",
      }),
  });
  const licenses = licensesQuery.data?.results ?? [];

  return (
    <section aria-label={text.licenses} className="mt-5 border-t pt-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{text.licenses}</h3>
        {licensesQuery.data ? (
          <span className="text-muted-foreground text-xs">
            {licensesQuery.data.count}
          </span>
        ) : null}
      </div>
      {licensesQuery.isPending ? (
        <LoaderCircle
          aria-hidden="true"
          className="text-muted-foreground mt-3 size-4 animate-spin"
        />
      ) : licensesQuery.isError ? (
        <p className="text-muted-foreground mt-2 text-sm">
          {text.licensesError}
        </p>
      ) : licenses.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          {text.licensesEmpty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {licenses.map((license) => (
            <li
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
              key={license.id}
            >
              <span className="min-w-0 truncate">
                {license.interaction_product.product.name}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {license.is_active
                  ? license.valid_until_year
                    ? `${text.validUntil} ${license.valid_until_year}`
                    : formatDate(license.signed_at, locale)
                  : text.superseded}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Реестр договоров: таблица с поиском и отборами по подписанию, периоду и
 * взаимодействию; карточка с файлами (загрузка, скачивание, история версий)
 * и лицензиями по договору.
 */
export function ContractsWorkspace() {
  const { locale } = useLocale();
  const { csrfToken, user } = useAuth();
  const canCreate = user !== null && can(user, "contracts.create");
  const canUpdate = user !== null && can(user, "contracts.update");
  const canDelete = user !== null && can(user, "contracts.delete");
  const canAttach = user !== null && can(user, "contracts.attach");
  const text = copy[locale];
  const common = registryCopy[locale];
  const queryClient = useQueryClient();
  const table = useTableQueryState({ direction: "desc", field: "updated_at" });
  const [signed, setSigned] = useState<ContractSignedFilter>("all");
  const [interaction, setInteraction] = useState<LookupOption | null>(null);
  const [signedFrom, setSignedFrom] = useState("");
  const [signedTo, setSignedTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ contract: Contract | null } | null>(null);
  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const closeForm = useCallback(() => setForm(null), []);

  const params = {
    interactionId: interaction?.id ?? null,
    ordering: table.ordering,
    page: table.page,
    search: table.debouncedSearch,
    signed,
    signedFrom,
    signedTo,
  };

  const contractsQuery = useQuery({
    queryKey: contractsQueryKey(params),
    queryFn: () => getContracts(params),
    placeholderData: keepPreviousData,
  });
  const contracts = contractsQuery.data?.results ?? [];
  const selectedRow = contracts.find((contract) => contract.id === selectedId);

  const contractQuery = useQuery({
    queryKey: contractQueryKey(selectedId ?? ""),
    queryFn: () => getContract(selectedId as string),
    enabled: selectedId !== null,
    placeholderData: selectedRow,
  });
  const contract = contractQuery.data;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContract(id, csrfToken),
    onSuccess: () => {
      toast.success(text.deleted);
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: contractsQueryKey() });
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, common.unknownError)),
  });

  const filters: TableFilter[] = [
    {
      label: text.signedFilter,
      name: "signed",
      onChange: table.withPageReset((value: string) =>
        setSigned(value as ContractSignedFilter),
      ),
      options: [
        { label: common.all, value: "all" },
        { label: text.signedYes, value: "signed" },
        { label: text.signedNo, value: "unsigned" },
      ],
      value: signed,
    },
  ];

  const columns: DataTableColumn<Contract>[] = [
    {
      name: "contract_number",
      render: (row) => (
        <span className="flex items-center gap-2 font-medium">
          <FileText
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
          {row.contract_number || (
            <span className="text-muted-foreground font-normal">
              {text.noNumber}
            </span>
          )}
        </span>
      ),
      sortField: "contract_number",
      title: text.number,
      width: "16%",
    },
    {
      name: "counterparty",
      render: (row) => (
        <Counterparty contract={row} fallback={common.noValue} />
      ),
      title: text.counterparty,
      width: "24%",
    },
    {
      name: "stage",
      render: (row) => <StageChip contract={row} text={text} />,
      title: text.stage,
      width: "13%",
    },
    {
      name: "sent_at",
      render: (row) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(row.sent_at, locale) ?? "—"}
        </span>
      ),
      sortField: "sent_at",
      title: text.sentAt,
      width: "13%",
    },
    {
      name: "signed_at",
      render: (row) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(row.signed_at, locale) ?? "—"}
        </span>
      ),
      sortField: "signed_at",
      title: text.signedAt,
      width: "11%",
    },
    {
      name: "files",
      render: (row) =>
        row.download_url ? (
          <span className="flex items-center gap-1">
            <Button asChild colorScheme="neutral" size="icon" variant="ghost">
              <a
                aria-label={`${text.download}: ${row.file_name}`}
                download
                href={row.download_url}
                onClick={(event) => event.stopPropagation()}
                title={`${text.download}: ${row.file_name}`}
              >
                <Download aria-hidden="true" className="size-4" />
              </a>
            </Button>
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Paperclip aria-hidden="true" className="size-3.5" />
              {row.files_count}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      title: text.files,
      width: "10%",
    },
    {
      align: "right",
      name: "updated_at",
      render: (row) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(row.updated_at, locale)}
        </span>
      ),
      sortField: "updated_at",
      title: text.updatedAt,
      width: "13%",
    },
  ];

  return (
    <div className="space-y-5">
      <RegistryHeader
        action={
          canCreate ? (
            <Button
              onClick={() => setForm({ contract: null })}
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
        <div className="w-60">
          <EntitySelect
            id="contracts-interaction-filter"
            label={text.counterparty}
            onChange={table.withPageReset(setInteraction)}
            placeholder={text.anyCounterparty}
            queryKey={["interactions", "lookup"]}
            search={searchInteractions}
            value={interaction}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{text.signedPeriod}</span>
          <label className="sr-only" htmlFor="contracts-signed-from">
            {`${text.signedPeriod} ${text.from}`}
          </label>
          <span className="text-muted-foreground" aria-hidden="true">
            {text.from}
          </span>
          <input
            className={`${fieldInputClass} mt-0 w-40`}
            id="contracts-signed-from"
            max={signedTo || undefined}
            onChange={(event) => {
              setSignedFrom(event.target.value);
              table.setPage(1);
            }}
            type="date"
            value={signedFrom}
          />
          <label className="sr-only" htmlFor="contracts-signed-to">
            {`${text.signedPeriod} ${text.to}`}
          </label>
          <span className="text-muted-foreground" aria-hidden="true">
            {text.to}
          </span>
          <input
            className={`${fieldInputClass} mt-0 w-40`}
            id="contracts-signed-to"
            min={signedFrom || undefined}
            onChange={(event) => {
              setSignedTo(event.target.value);
              table.setPage(1);
            }}
            type="date"
            value={signedTo}
          />
        </div>
      </TableToolbar>

      <DataTable
        caption={text.tableCaption}
        columns={columns}
        footer={
          <TablePagination
            count={contractsQuery.data?.count ?? 0}
            labels={registryPaginationLabels(locale)}
            onPageChange={table.setPage}
            page={table.page}
            pageSize={contractsPageSize}
          />
        }
        getRowId={(row) => row.id}
        isError={contractsQuery.isError}
        isLoading={contractsQuery.isPending}
        labels={registryTableLabels(locale, {
          error: text.error,
          loading: text.loading,
        })}
        onRetry={() => void contractsQuery.refetch()}
        onRowClick={(row) => setSelectedId(row.id)}
        onSortChange={table.setSort}
        rows={contracts}
        selectedRowId={selectedId}
        sort={table.sort}
      />

      {selectedId ? (
        <Drawer
          closeLabel={common.close}
          footer={
            contract && (canUpdate || canDelete) ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {canUpdate ? (
                  <Button
                    colorScheme="neutral"
                    onClick={() => setForm({ contract })}
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
                    onConfirm={() => deleteMutation.mutate(contract.id)}
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
          {contract ? (
            <>
              <h2 className="text-xl font-medium" id={drawerHeadingId}>
                {contract.contract_number || text.noNumber}
              </h2>
              <span className="mt-3 inline-flex">
                <StageChip contract={contract} text={text} />
              </span>
              <div className="mt-4">
                <DetailRows
                  noValue={common.noValue}
                  rows={[
                    [
                      text.counterparty,
                      <Counterparty
                        contract={contract}
                        fallback={common.noValue}
                        key="counterparty"
                      />,
                    ],
                    [text.sentAt, formatDate(contract.sent_at, locale)],
                    [
                      text.correctedAt,
                      formatDate(contract.corrected_at, locale),
                    ],
                    [text.signedAt, formatDate(contract.signed_at, locale)],
                    [text.createdAt, formatDate(contract.created_at, locale)],
                    [text.updatedAt, formatDate(contract.updated_at, locale)],
                  ]}
                />
              </div>
              <ContractFiles
                canUpload={canAttach}
                contract={contract}
                csrfToken={csrfToken}
              />
              <ContractLicenses contractId={contract.id} text={text} />
            </>
          ) : contractQuery.isError ? (
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
        <ContractForm
          contract={form.contract}
          csrfToken={csrfToken}
          onClose={closeForm}
          onSaved={(saved) => {
            toast.success(form.contract ? text.saved : text.created);
            setForm(null);
            setSelectedId(saved.id);
            queryClient.setQueryData(contractQueryKey(saved.id), saved);
            void queryClient.invalidateQueries({
              queryKey: contractsQueryKey(),
            });
          }}
          text={text}
        />
      ) : null}
    </div>
  );
}
