"use client";

import type { ReactNode } from "react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { TablePagination } from "@/components/ui/table-pagination";
import { teamPageSize } from "@/lib/api/users/team";
import { useLocale } from "@/providers/locale-provider";
import type { SovaUser } from "@/types/user";

const copy = {
  ru: {
    columnName: "ФИО",
    columnEmail: "Email",
    clearSearch: "Очистить поиск",
    searchPlaceholder: "ФИО или email",
    error: "Не удалось загрузить список.",
    loading: "Загружаем…",
    retry: "Повторить",
    sortAscending: "Сортировать по возрастанию",
    sortDescending: "Сортировать по убыванию",
    sortNone: "Отменить сортировку",
    next: "Следующая страница",
    previous: "Предыдущая страница",
    pageOf: (page: number, pages: number) => `Страница ${page} из ${pages}`,
    range: (from: number, to: number, count: number) =>
      `${from}–${to} из ${count}`,
  },
  en: {
    columnName: "Name",
    columnEmail: "Email",
    clearSearch: "Clear search",
    searchPlaceholder: "Name or email",
    error: "The list could not be loaded.",
    loading: "Loading…",
    retry: "Retry",
    sortAscending: "Sort ascending",
    sortDescending: "Sort descending",
    sortNone: "Clear sorting",
    next: "Next page",
    previous: "Previous page",
    pageOf: (page: number, pages: number) => `Page ${page} of ${pages}`,
    range: (from: number, to: number, count: number) =>
      `${from}–${to} of ${count}`,
  },
};

type TeamMembersTableProps = {
  caption: string;
  count: number;
  empty: string;
  isError: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  page: number;
  renderAction: (user: SovaUser) => ReactNode;
  rows: SovaUser[];
  search: string;
};

/** Список КАМов раздела «Команда»: поиск, таблица, пагинация и действие в строке. */
export function TeamMembersTable(props: TeamMembersTableProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const columns: DataTableColumn<SovaUser>[] = [
    { name: "name", render: (user) => user.full_name, title: text.columnName },
    { name: "email", render: (user) => user.email, title: text.columnEmail },
    {
      align: "right",
      name: "action",
      render: props.renderAction,
      title: "",
      width: "16rem",
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{props.caption}</h2>
      <SearchInput
        aria-label={`${props.caption}: ${text.searchPlaceholder}`}
        clearLabel={text.clearSearch}
        onChange={props.onSearchChange}
        placeholder={text.searchPlaceholder}
        value={props.search}
      />
      <DataTable
        caption={props.caption}
        columns={columns}
        footer={
          props.count > teamPageSize ? (
            <TablePagination
              count={props.count}
              labels={{
                next: text.next,
                pageOf: text.pageOf,
                previous: text.previous,
                range: text.range,
              }}
              onPageChange={props.onPageChange}
              page={props.page}
              pageSize={teamPageSize}
            />
          ) : undefined
        }
        getRowId={(user) => String(user.id)}
        isError={props.isError}
        isLoading={props.isLoading}
        labels={{
          empty: props.empty,
          error: text.error,
          loading: text.loading,
          retry: text.retry,
          sortAscending: text.sortAscending,
          sortDescending: text.sortDescending,
          sortNone: text.sortNone,
        }}
        onRetry={props.onRetry}
        rows={props.rows}
      />
    </section>
  );
}
