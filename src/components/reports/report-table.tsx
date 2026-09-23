"use client";

import { Button } from "@/components/ui/button";
import type {
  ReportColumn,
  ReportPreviewResponse,
  ReportRow,
} from "@/lib/reports/types";

function rowKey(row: ReportRow): string {
  return [
    row.interaction_id,
    row.interaction_direction_id ?? "",
    row.interaction_program_id ?? "",
    row.interaction_product_id ?? "",
  ].join("|");
}

function formatCell(column: ReportColumn, row: ReportRow): string {
  switch (column) {
    case "process_status":
      return (row.process_status ?? []).map((p) => p.label).join(", ") || "—";
    case "active_stages":
      return (row.active_stages ?? []).map((s) => s.name).join(", ") || "—";
    case "contract_numbers":
      return (row.contract_numbers ?? []).join(", ") || "—";
    case "contract_signed_at":
      return (row.contract_signed_at ?? []).join(", ") || "—";
    case "license_valid_until_year":
      return row.license_valid_until_year != null
        ? String(row.license_valid_until_year)
        : "—";
    default: {
      const value = row[column];
      return value == null || value === "" ? "—" : String(value);
    }
  }
}

interface ReportTableProps {
  data: ReportPreviewResponse | undefined;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function ReportTable({
  data,
  isLoading,
  page,
  pageSize,
  onPageChange,
}: ReportTableProps) {
  const columns = data?.meta.columns ?? [];
  const availableLabel = new Map(
    (data?.meta.available_columns ?? []).map((c) => [c.value, c.label]),
  );
  const pageCount = data ? Math.max(1, Math.ceil(data.count / pageSize)) : 1;

  return (
    <div className="border-border bg-card/70 rounded-xl border shadow-sm backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              {columns.map((column) => (
                <th
                  className="text-muted-foreground px-3 py-2 text-left font-medium whitespace-nowrap"
                  key={column}
                >
                  {availableLabel.get(column) ?? column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && !data && (
              <tr>
                <td
                  className="text-muted-foreground px-3 py-6 text-center"
                  colSpan={Math.max(columns.length, 1)}
                >
                  Загрузка…
                </td>
              </tr>
            )}
            {data && data.results.length === 0 && (
              <tr>
                <td
                  className="text-muted-foreground px-3 py-6 text-center"
                  colSpan={Math.max(columns.length, 1)}
                >
                  Нет данных по выбранным фильтрам
                </td>
              </tr>
            )}
            {data?.results.map((row) => (
              <tr
                className="border-border/60 hover:bg-secondary/40 border-b"
                key={rowKey(row)}
              >
                {columns.map((column) => (
                  <td className="px-3 py-2 whitespace-nowrap" key={column}>
                    {formatCell(column, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
          <p className="text-muted-foreground text-sm">
            Всего строк: {data.count.toLocaleString("ru-RU")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              size="m"
              type="button"
              variant="ghost"
            >
              Назад
            </Button>
            <span className="text-muted-foreground text-sm">
              {page} / {pageCount}
            </span>
            <Button
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
              size="m"
              type="button"
              variant="ghost"
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}

      {data?.meta.state_note && (
        <p className="text-muted-foreground border-border border-t px-3 py-2 text-xs">
          {data.meta.state_note} · сформировано{" "}
          {new Date(data.meta.generated_at).toLocaleString("ru-RU")}
        </p>
      )}
    </div>
  );
}
