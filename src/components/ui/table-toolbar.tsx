"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

export type TableFilterOption = {
  label: string;
  value: string;
};

/** Отбор с коротким списком значений: показывается переключателем. */
export type TableFilter = {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: TableFilterOption[];
  value: string;
};

export type TableSearch = {
  clearLabel: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

type TableToolbarProps = {
  /**
   * Отборы, которым переключателя мало: выпадушки справочников и прочие свои
   * контролы. Раздел сам решает, как их устроить.
   */
  children?: ReactNode;
  className?: string;
  filters?: TableFilter[];
  search: TableSearch;
};

/**
 * Панель отборов над таблицей: поиск и переключатели значений.
 *
 * Своего состояния не держит — поиск и отборы принадлежат разделу, который
 * превращает их в параметры запроса. Поэтому одна и та же панель годится и
 * там, где отбор один, и там, где их несколько.
 */
export function TableToolbar({
  children,
  className,
  filters = [],
  search,
}: TableToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <SearchInput
        aria-label={search.label}
        className="w-full max-w-2xl min-w-64 flex-1"
        clearLabel={search.clearLabel}
        onChange={search.onChange}
        placeholder={search.placeholder}
        value={search.value}
      />

      {filters.map((filter) => (
        <div
          aria-label={filter.label}
          className="bg-card flex w-fit items-center gap-1 rounded-xl border p-1 shadow-sm"
          key={filter.name}
          role="group"
        >
          {filter.options.map((option) => {
            const isActive = option.value === filter.value;

            return (
              <Button
                aria-pressed={isActive}
                colorScheme={isActive ? "accent" : "neutral"}
                key={option.value}
                onClick={() => filter.onChange(option.value)}
                size="m"
                type="button"
                variant={isActive ? "secondary" : "ghost"}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      ))}

      {children}
    </div>
  );
}
