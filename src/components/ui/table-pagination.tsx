"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export type TablePaginationLabels = {
  next: string;
  pageOf: (page: number, pages: number) => string;
  previous: string;
  range: (from: number, to: number, count: number) => string;
};

type TablePaginationProps = {
  /** Всего строк во всех страницах — `count` из ответа каталога. */
  count: number;
  labels: TablePaginationLabels;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
};

/**
 * Подвал постраничного списка: сколько строк показано и переход по страницам.
 *
 * Номера страниц не рисуем: бэкенд отдаёт только `count`, `next` и `previous`,
 * и на длинных списках ряд кнопок всё равно пришлось бы сворачивать.
 */
export function TablePagination({
  count,
  labels,
  onPageChange,
  page,
  pageSize,
}: TablePaginationProps) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        {labels.range(from, to, count)}
      </p>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">
          {labels.pageOf(page, pages)}
        </span>
        <Button
          aria-label={labels.previous}
          colorScheme="neutral"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          size="icon"
          title={labels.previous}
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label={labels.next}
          colorScheme="neutral"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          size="icon"
          title={labels.next}
          type="button"
          variant="outline"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}
