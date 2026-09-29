"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, LoaderCircle } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

/** Порядок сортировки списка. `field` — имя поля для `ordering` у бэкенда. */
export type DataTableSort = {
  direction: SortDirection;
  field: string;
};

export type DataTableColumn<Row> = {
  align?: "left" | "right";
  /** Уникальное имя колонки: ключ React и идентификатор заголовка. */
  name: string;
  render: (row: Row) => ReactNode;
  /**
   * Поле сортировки бэкенда. Без него заголовок не кликабельный: колонка
   * вроде «Контрагент» собирается из двух связей, и сортировать её нечем.
   */
  sortField?: string;
  title: string;
  /** Ширина колонки; задаётся через `<colgroup>`, а не на каждой ячейке. */
  width?: string;
};

export type DataTableLabels = {
  empty: string;
  error: string;
  loading: string;
  retry: string;
  sortAscending: string;
  sortDescending: string;
  sortNone: string;
};

type DataTableProps<Row> = {
  /** Название таблицы для скринридера. */
  caption: string;
  className?: string;
  columns: DataTableColumn<Row>[];
  /** Растягивает таблицу на доступное место и включает внутреннюю прокрутку строк. */
  fillHeight?: boolean;
  /** Подвал: пагинация, кнопка подгрузки или итоги. */
  footer?: ReactNode;
  getRowId: (row: Row) => string;
  isError?: boolean;
  isLoading?: boolean;
  labels: DataTableLabels;
  onRetry?: () => void;
  onRowClick?: (row: Row) => void;
  onSortChange?: (sort: DataTableSort | null) => void;
  rows: Row[];
  selectedRowId?: string | null;
  sort?: DataTableSort | null;
};

/**
 * Базовая таблица разделов: сортировка по заголовкам, состояния загрузки,
 * ошибки и пустого списка, выбор строки.
 *
 * Данные таблица не грузит и не сортирует сама — она сообщает о выборе
 * заголовка через `onSortChange`, а раздел превращает его в параметр запроса.
 * Иначе порядок ломался бы на постраничных списках: отсортировать можно было
 * бы только загруженную страницу.
 *
 * Фильтры и поиск живут в `TableToolbar` рядом: они относятся к запросу, а не
 * к разметке таблицы, и нужны не каждому списку.
 */
export function DataTable<Row>({
  caption,
  className,
  columns,
  fillHeight = false,
  footer,
  getRowId,
  isError = false,
  isLoading = false,
  labels,
  onRetry,
  onRowClick,
  onSortChange,
  rows,
  selectedRowId = null,
  sort = null,
}: DataTableProps<Row>) {
  // Порядок обхода как в дизайн-системе: без сортировки → по возрастанию →
  // по убыванию → снова без сортировки.
  function toggleSort(field: string) {
    if (!onSortChange) return;

    if (sort?.field !== field) {
      onSortChange({ direction: "asc", field });

      return;
    }

    onSortChange(
      sort.direction === "asc" ? { direction: "desc", field } : null,
    );
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    row: Row,
  ) {
    if (!onRowClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    // Пробел на строке иначе прокрутил бы страницу под открывающейся панелью.
    event.preventDefault();
    onRowClick(row);
  }

  const stateLabel = isError
    ? labels.error
    : isLoading
      ? labels.loading
      : labels.empty;
  const hasRows = rows.length > 0;

  return (
    <div
      className={cn(
        "bg-card overflow-hidden rounded-xl border shadow-sm",
        fillHeight && "flex min-h-0 flex-1 flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "overflow-x-auto",
          fillHeight && "min-h-0 flex-1 overflow-auto",
        )}
      >
        <table
          aria-busy={isLoading || undefined}
          aria-label={caption}
          className="w-full min-w-[48rem] border-collapse text-sm"
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.name} style={{ width: column.width }} />
            ))}
          </colgroup>

          <thead className="bg-secondary/60 sticky top-0 z-10">
            <tr>
              {columns.map((column) => {
                const sortField = column.sortField;
                const isSorted =
                  sortField !== undefined && sort?.field === sortField;
                const SortIcon = !isSorted
                  ? ChevronsUpDown
                  : sort?.direction === "asc"
                    ? ArrowUp
                    : ArrowDown;
                const sortHint = !isSorted
                  ? labels.sortAscending
                  : sort?.direction === "asc"
                    ? labels.sortDescending
                    : labels.sortNone;

                return (
                  <th
                    aria-sort={
                      sortField
                        ? !isSorted
                          ? "none"
                          : sort?.direction === "asc"
                            ? "ascending"
                            : "descending"
                        : undefined
                    }
                    className={cn(
                      "text-muted-foreground border-b px-4 py-3 text-xs font-bold tracking-[0.08em] uppercase",
                      column.align === "right" ? "text-right" : "text-left",
                    )}
                    key={column.name}
                    scope="col"
                  >
                    {sortField && onSortChange ? (
                      <button
                        className={cn(
                          "focus-visible:ring-ring hover:text-foreground -mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors outline-none focus-visible:ring-2",
                          column.align === "right" && "flex-row-reverse",
                          isSorted && "text-[var(--atmr-accent-primary)]",
                        )}
                        onClick={() => toggleSort(sortField)}
                        title={`${column.title}: ${sortHint}`}
                        type="button"
                      >
                        {column.title}
                        <SortIcon aria-hidden="true" className="size-3.5" />
                        <span className="sr-only">{sortHint}</span>
                      </button>
                    ) : (
                      column.title
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {hasRows ? (
              rows.map((row) => {
                const id = getRowId(row);
                const isSelected = id === selectedRowId;

                return (
                  <tr
                    className={cn(
                      "border-b transition-colors last:border-b-0",
                      onRowClick &&
                        "focus-visible:ring-ring hover:bg-secondary/50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset",
                      isSelected && "bg-[var(--atmr-background-accent-soft)]",
                    )}
                    data-selected={isSelected || undefined}
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={(event) => handleRowKeyDown(event, row)}
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    {columns.map((column) => (
                      <td
                        className={cn(
                          "px-4 py-3 align-middle",
                          column.align === "right" && "text-right",
                        )}
                        key={column.name}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-12" colSpan={columns.length}>
                  <div className="text-muted-foreground flex flex-col items-center justify-center gap-4 text-center text-sm">
                    <p className="flex items-center gap-2">
                      {isLoading ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                      ) : null}
                      {stateLabel}
                    </p>
                    {isError && onRetry ? (
                      <Button
                        colorScheme="neutral"
                        onClick={onRetry}
                        size="m"
                        type="button"
                        variant="outline"
                      >
                        {labels.retry}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {footer && hasRows ? (
        <div className="bg-card border-t px-4 py-3">{footer}</div>
      ) : null}
    </div>
  );
}
