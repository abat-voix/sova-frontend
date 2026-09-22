"use client";

import { useCallback, useEffect, useState } from "react";

import type { DataTableSort } from "@/components/ui/data-table";

const searchDebounceMs = 350;

/**
 * Состояние запроса списка: строка поиска, порядок сортировки и страница.
 *
 * Любое изменение отбора возвращает на первую страницу — иначе после смены
 * условий пользователь оказался бы на странице, которой в новой выборке уже
 * нет, и увидел бы пустой список.
 */
export function useTableQueryState(defaultSort: DataTableSort | null = null) {
  const [search, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSortValue] = useState<DataTableSort | null>(defaultSort);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, searchDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const setSort = useCallback((value: DataTableSort | null) => {
    setSortValue(value);
    setPage(1);
  }, []);

  /**
   * Оборачивает установку своего отбора раздела: значение уходит по адресу,
   * страница возвращается на первую.
   */
  const withPageReset = useCallback(
    <Value>(apply: (value: Value) => void) =>
      (value: Value) => {
        apply(value);
        setPage(1);
      },
    [],
  );

  return {
    debouncedSearch,
    /** Значение параметра `ordering`; минус в начале — по убыванию. */
    ordering: sort
      ? sort.direction === "desc"
        ? `-${sort.field}`
        : sort.field
      : null,
    page,
    search,
    setPage,
    setSearch,
    setSort,
    sort,
    withPageReset,
  };
}
