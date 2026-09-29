"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DataTable,
  type DataTableColumn,
  type DataTableLabels,
} from "@/components/ui/data-table";
import {
  CatalogItemForm,
  type CatalogFormTarget,
} from "@/components/catalog/it-catalog-forms";
import { RankChip } from "@/components/catalog/rank-chip";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EntitySelect } from "@/components/ui/entity-select";
import { StatusChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar, type TableFilter } from "@/components/ui/table-toolbar";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import {
  searchDirections,
  searchPrograms,
  type LookupOption,
} from "@/lib/api/catalog/lookups";
import {
  getDirection,
  getDirections,
  getProduct,
  getProducts,
  getProgram,
  getPrograms,
  itCatalogPageSize,
} from "@/lib/api/catalog/it-catalog";
import { rankOrdering, type RankFilter } from "@/lib/api/catalog/rank";
import { formatDate } from "@/lib/format-date";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Direction, Product, Program } from "@/types/catalog";

const headingId = "it-catalog-drawer-title";
type CatalogTab = "directions" | "programs" | "products";
type CatalogItem = Direction | Program | Product;
type Activity = "all" | "active" | "inactive";

const copy = {
  ru: {
    title: "ИТ-каталог",
    description: "Направления обучения, программы и продукты каталога.",
    create: {
      directions: "Создать направление",
      programs: "Создать программу",
      products: "Создать продукт",
    },
    edit: "Изменить",
    created: "Запись создана.",
    saved: "Изменения сохранены.",
    directions: "Направления",
    programs: "Программы",
    products: "Продукты",
    search: "Поиск по каталогу",
    placeholder: "Название или внешний код",
    clear: "Очистить поиск",
    activity: "Активность",
    all: "Все",
    active: "Активные",
    inactive: "Неактивные",
    direction: "Направление",
    anyDirection: "Любое направление",
    program: "Программа",
    anyProgram: "Любая программа",
    hasProducts: "Продукты",
    withProducts: "Есть продукты",
    withoutProducts: "Нет продуктов",
    rank: "Рейтинг",
    rankTop: "Топ-10",
    ranked: "С местом",
    unranked: "Без места",
    place: "Место",
    placeLabel: (rank: number) => `${rank} место`,
    name: "Название",
    code: "Внешний код",
    status: "Статус",
    productCount: "Продуктов",
    vendor: "Вендор",
    relatedPrograms: "Программы",
    dateCreated: "Создано",
    dateUpdated: "Обновлено",
    loading: "Загружаем каталог…",
    empty: "Записи не найдены.",
    error: "Не удалось загрузить каталог.",
    retry: "Повторить",
    sortAscending: "Сортировать по возрастанию",
    sortDescending: "Сортировать по убыванию",
    sortNone: "Сбросить сортировку",
    previous: "Предыдущая страница",
    next: "Следующая страница",
    close: "Закрыть",
    details: "Карточка записи",
    noValue: "Не указано",
    loadingDetails: "Загружаем карточку…",
    detailsError: "Не удалось загрузить карточку.",
    pageOf: (p: number, total: number) => `Страница ${p} из ${total}`,
    range: (from: number, to: number, total: number) =>
      `Записи ${from}–${to} из ${total}`,
  },
  en: {
    title: "IT catalog",
    description: "Training directions, programs, and catalog products.",
    create: {
      directions: "Create direction",
      programs: "Create program",
      products: "Create product",
    },
    edit: "Edit",
    created: "The record was created.",
    saved: "Changes saved.",
    directions: "Directions",
    programs: "Programs",
    products: "Products",
    search: "Search the catalog",
    placeholder: "Name or external code",
    clear: "Clear search",
    activity: "Activity",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    direction: "Direction",
    anyDirection: "Any direction",
    program: "Program",
    anyProgram: "Any program",
    hasProducts: "Products",
    withProducts: "Has products",
    withoutProducts: "No products",
    rank: "Ranking",
    rankTop: "Top 10",
    ranked: "Ranked",
    unranked: "Unranked",
    place: "Place",
    placeLabel: (rank: number) => `#${rank}`,
    name: "Name",
    code: "External code",
    status: "Status",
    productCount: "Products",
    vendor: "Vendor",
    relatedPrograms: "Programs",
    dateCreated: "Created",
    dateUpdated: "Updated",
    loading: "Loading catalog…",
    empty: "No records found.",
    error: "The catalog could not be loaded.",
    retry: "Retry",
    sortAscending: "Sort ascending",
    sortDescending: "Sort descending",
    sortNone: "Clear sorting",
    previous: "Previous page",
    next: "Next page",
    close: "Close",
    details: "Record details",
    noValue: "Not provided",
    loadingDetails: "Loading details…",
    detailsError: "Could not load record details.",
    pageOf: (p: number, total: number) => `Page ${p} of ${total}`,
    range: (from: number, to: number, total: number) =>
      `Rows ${from}–${to} of ${total}`,
  },
} as const;

function isProgram(item: CatalogItem): item is Program {
  return "direction" in item;
}
function isProduct(item: CatalogItem): item is Product {
  return "programs" in item;
}

export function ItCatalogWorkspace() {
  const { locale } = useLocale();
  const { user } = useAuth();
  // Кнопки прячутся по правам справочников; решение всё равно за бэкендом
  const canCreate = user !== null && can(user, "catalog.create");
  const canUpdate = user !== null && can(user, "catalog.update");
  const queryClient = useQueryClient();
  const text = copy[locale];
  const [form, setForm] = useState<CatalogFormTarget | null>(null);
  const [tab, setTab] = useState<CatalogTab>("directions");
  const [activity, setActivity] = useState<Activity>("all");
  const [hasProducts, setHasProducts] = useState("all");
  const [rank, setRank] = useState<RankFilter>("all");
  const [direction, setDirection] = useState<LookupOption | null>(null);
  const [program, setProgram] = useState<LookupOption | null>(null);
  const [selected, setSelected] = useState<{
    id: string;
    tab: CatalogTab;
  } | null>(null);
  const table = useTableQueryState({ direction: "asc", field: "name" });
  const query = {
    directionId: tab === "directions" ? null : direction?.id,
    hasProducts:
      tab === "programs" && hasProducts !== "all"
        ? hasProducts === "yes"
        : null,
    isActive: activity === "all" ? null : activity === "active",
    ordering: table.ordering,
    page: table.page,
    programId: tab === "products" ? program?.id : null,
    rank,
    search: table.debouncedSearch,
  };
  const directionsQuery = useQuery({
    enabled: tab === "directions",
    queryKey: ["it-catalog", "directions", query],
    queryFn: () => getDirections(query),
    placeholderData: keepPreviousData,
  });
  const programsQuery = useQuery({
    enabled: tab === "programs",
    queryKey: ["it-catalog", "programs", query],
    queryFn: () => getPrograms(query),
    placeholderData: keepPreviousData,
  });
  const productsQuery = useQuery({
    enabled: tab === "products",
    queryKey: ["it-catalog", "products", query],
    queryFn: () => getProducts(query),
    placeholderData: keepPreviousData,
  });
  const directionDetails = useQuery({
    enabled: selected?.tab === "directions",
    queryKey: ["it-catalog", "direction", selected?.id],
    queryFn: () => getDirection(selected!.id),
  });
  const programDetails = useQuery({
    enabled: selected?.tab === "programs",
    queryKey: ["it-catalog", "program", selected?.id],
    queryFn: () => getProgram(selected!.id),
  });
  const productDetails = useQuery({
    enabled: selected?.tab === "products",
    queryKey: ["it-catalog", "product", selected?.id],
    queryFn: () => getProduct(selected!.id),
  });

  const result =
    tab === "directions"
      ? directionsQuery.data
      : tab === "programs"
        ? programsQuery.data
        : productsQuery.data;
  const activeQuery =
    tab === "directions"
      ? directionsQuery
      : tab === "programs"
        ? programsQuery
        : productsQuery;
  const rows: CatalogItem[] = result?.results ?? [];
  const count = result?.count ?? 0;
  const detail: CatalogItem | undefined =
    selected?.tab === "directions"
      ? directionDetails.data
      : selected?.tab === "programs"
        ? programDetails.data
        : selected?.tab === "products"
          ? productDetails.data
          : undefined;
  const detailQuery =
    selected?.tab === "directions"
      ? directionDetails
      : selected?.tab === "programs"
        ? programDetails
        : productDetails;
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
      label: text.activity,
      name: "activity",
      value: activity,
      onChange: table.withPageReset((value: string) =>
        setActivity(value as Activity),
      ),
      options: [
        { label: text.all, value: "all" },
        { label: text.active, value: "active" },
        { label: text.inactive, value: "inactive" },
      ],
    },
    ...(tab === "programs"
      ? [
          {
            label: text.hasProducts,
            name: "has-products",
            value: hasProducts,
            onChange: table.withPageReset(setHasProducts),
            options: [
              { label: text.all, value: "all" },
              { label: text.withProducts, value: "yes" },
              { label: text.withoutProducts, value: "no" },
            ],
          },
        ]
      : []),
    {
      label: text.rank,
      name: "rank",
      value: rank,
      onChange: (value: string) => {
        const next = value as RankFilter;
        setRank(next);
        // Отбор по рейтингу показывает места по порядку
        if (rankOrdering(next))
          table.setSort({ direction: "asc", field: "rank" });
        else table.setPage(1);
      },
      options: [
        { label: text.all, value: "all" },
        { label: text.rankTop, value: "top10" },
        { label: text.ranked, value: "ranked" },
        { label: text.unranked, value: "unranked" },
      ],
    },
  ];
  const statusCell = (item: CatalogItem) => (
    <StatusChip tone={item.is_active ? "positive" : "neutral"}>
      {item.is_active ? text.active : text.inactive}
    </StatusChip>
  );
  const rankColumn: DataTableColumn<CatalogItem> = {
    name: "rank",
    title: text.place,
    sortField: "rank",
    width: "10%",
    render: (item) => (
      <span className="text-muted-foreground tabular-nums">
        {item.rank ?? "—"}
      </span>
    ),
  };
  const columns: DataTableColumn<CatalogItem>[] =
    tab === "directions"
      ? [
          rankColumn,
          {
            name: "name",
            title: text.name,
            sortField: "name",
            width: "45%",
            render: (item) => <span className="font-medium">{item.name}</span>,
          },
          {
            name: "external_code",
            title: text.code,
            sortField: "external_code",
            width: "25%",
            render: (item) => (
              <span className="text-muted-foreground">
                {"external_code" in item
                  ? item.external_code || text.noValue
                  : text.noValue}
              </span>
            ),
          },
          {
            name: "is_active",
            title: text.status,
            width: "20%",
            render: statusCell,
          },
        ]
      : tab === "programs"
        ? [
            rankColumn,
            {
              name: "name",
              title: text.name,
              sortField: "name",
              width: "35%",
              render: (item) => (
                <span className="font-medium">{item.name}</span>
              ),
            },
            {
              name: "direction",
              title: text.direction,
              sortField: "direction__name",
              width: "25%",
              render: (item) =>
                isProgram(item) ? item.direction.name : text.noValue,
            },
            {
              name: "products_count",
              title: text.productCount,
              sortField: "products_count",
              width: "15%",
              render: (item) => (isProgram(item) ? item.products_count : 0),
            },
            {
              name: "is_active",
              title: text.status,
              width: "15%",
              render: statusCell,
            },
          ]
        : [
            rankColumn,
            {
              name: "name",
              title: text.name,
              sortField: "name",
              width: "30%",
              render: (item) => (
                <span className="font-medium">{item.name}</span>
              ),
            },
            {
              name: "programs",
              title: text.relatedPrograms,
              width: "25%",
              render: (item) =>
                isProduct(item)
                  ? item.programs.map((p) => p.name).join(", ") || text.noValue
                  : text.noValue,
            },
            {
              name: "vendor",
              title: text.vendor,
              width: "20%",
              render: (item) =>
                isProduct(item)
                  ? (item.vendor?.name ?? text.noValue)
                  : text.noValue,
            },
            {
              name: "is_active",
              title: text.status,
              width: "15%",
              render: statusCell,
            },
          ];

  function changeTab(value: CatalogTab) {
    setTab(value);
    table.setPage(1);
    table.setSearch("");
    table.setSort({ direction: "asc", field: "name" });
    setDirection(null);
    setProgram(null);
    setHasProducts("all");
    setRank("all");
    setSelected(null);
  }

  const detailRows: [string, string | null | undefined][] = detail
    ? selected?.tab === "directions"
      ? [[text.code, "external_code" in detail ? detail.external_code : null]]
      : isProgram(detail)
        ? [
            [text.direction, detail.direction.name],
            [text.productCount, String(detail.products_count)],
          ]
        : isProduct(detail)
          ? [
              [
                text.code,
                "external_code" in detail ? detail.external_code : null,
              ],
              [text.vendor, detail.vendor?.name],
              [
                text.relatedPrograms,
                // С направлением: тёзки из разных направлений различимы
                detail.programs
                  .map((item) => `${item.direction.name} · ${item.name}`)
                  .join(", "),
              ],
            ]
          : []
    : [];
  if (detail)
    detailRows.push(
      [text.dateCreated, formatDate(detail.created_at, locale)],
      [text.dateUpdated, formatDate(detail.updated_at, locale)],
    );

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
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
            onClick={() =>
              setForm({ item: null, kind: tab } as CatalogFormTarget)
            }
            size="m"
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            {text.create[tab]}
          </Button>
        ) : null}
      </header>
      <div
        aria-label={text.title}
        className="bg-card flex w-fit flex-wrap gap-1 rounded-xl border p-1 shadow-sm"
        role="group"
      >
        {(["directions", "programs", "products"] as const).map((item) => (
          <button
            aria-pressed={tab === item}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === item ? "bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            key={item}
            onClick={() => changeTab(item)}
            type="button"
          >
            {text[item]}
          </button>
        ))}
      </div>
      <TableToolbar
        filters={filters}
        search={{
          clearLabel: text.clear,
          label: text.search,
          onChange: table.setSearch,
          placeholder: text.placeholder,
          value: table.search,
        }}
      >
        {tab !== "directions" ? (
          <div className="w-60">
            <EntitySelect
              id="it-catalog-direction"
              label={text.direction}
              onChange={table.withPageReset((value: LookupOption | null) => {
                setDirection(value);
                setProgram(null);
              })}
              placeholder={text.anyDirection}
              queryKey={["it-catalog", "direction-lookup"]}
              search={searchDirections}
              value={direction}
            />
          </div>
        ) : null}
        {tab === "products" && direction ? (
          <div className="w-60">
            <EntitySelect
              id="it-catalog-program"
              label={text.program}
              onChange={table.withPageReset(setProgram)}
              placeholder={text.anyProgram}
              queryKey={["it-catalog", "program-lookup", direction.id]}
              search={(term) => searchPrograms(term, direction.id)}
              value={program}
            />
          </div>
        ) : null}
      </TableToolbar>
      <DataTable
        caption={`${text.title}: ${text[tab]}`}
        columns={columns}
        fillHeight
        footer={
          <TablePagination
            count={count}
            labels={{
              next: text.next,
              pageOf: text.pageOf,
              previous: text.previous,
              range: text.range,
            }}
            onPageChange={table.setPage}
            page={table.page}
            pageSize={itCatalogPageSize}
          />
        }
        getRowId={(item) => item.id}
        isError={activeQuery.isError}
        isLoading={activeQuery.isPending}
        labels={tableLabels}
        onRetry={() => void activeQuery.refetch()}
        onRowClick={(item) => setSelected({ id: item.id, tab })}
        onSortChange={table.setSort}
        rows={rows}
        selectedRowId={selected?.tab === tab ? selected.id : null}
        sort={table.sort}
      />
      {selected ? (
        <Drawer
          closeLabel={text.close}
          footer={
            canUpdate && detail ? (
              <Button
                colorScheme="neutral"
                onClick={() =>
                  setForm({
                    item: detail,
                    kind: selected.tab,
                  } as CatalogFormTarget)
                }
                size="m"
                type="button"
                variant="outline"
              >
                <Pencil aria-hidden="true" className="size-4" />
                {text.edit}
              </Button>
            ) : undefined
          }
          labelledBy={headingId}
          onClose={() => setSelected(null)}
        >
          <p className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.08em] uppercase">
            {text.details} · {text[selected.tab]}
          </p>
          {detail ? (
            <>
              <h2 className="text-xl font-medium" id={headingId}>
                {detail.name}
              </h2>
              <span className="mt-3 flex flex-wrap gap-2">
                {statusCell(detail)}
                <RankChip label={text.placeLabel} rank={detail.rank} />
              </span>
              <dl className="mt-5 divide-y">
                {detailRows.map(([label, value]) => (
                  <div className="py-3" key={label}>
                    <dt className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm break-words">
                      {value || text.noValue}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : detailQuery.isError ? (
            <div className="text-sm" id={headingId}>
              <p className="text-muted-foreground">{text.detailsError}</p>
              <button
                className="mt-3 underline"
                onClick={() => void detailQuery.refetch()}
                type="button"
              >
                {text.retry}
              </button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm" id={headingId}>
              {text.loadingDetails}
            </p>
          )}
        </Drawer>
      ) : null}
      {form ? (
        <CatalogItemForm
          key={`${form.kind}-${form.item?.id ?? "new"}`}
          onClose={() => setForm(null)}
          onSaved={(saved) => {
            toast.success(form.item ? text.saved : text.created);
            setForm(null);
            setSelected({ id: saved.id, tab: saved.kind });
            // Меняются списки, карточка и выпадушки каталога в других разделах
            void queryClient.invalidateQueries({ queryKey: ["it-catalog"] });
            void queryClient.invalidateQueries({ queryKey: ["catalog"] });
          }}
          target={form}
        />
      ) : null}
    </div>
  );
}
