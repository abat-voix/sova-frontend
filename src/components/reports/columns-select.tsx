"use client";

import type { AvailableColumn, ReportColumn } from "@/lib/reports/types";

import { MultiSelect } from "./multi-select";

interface ColumnsSelectProps {
  availableColumns: AvailableColumn[];
  selected: ReportColumn[] | null;
  onChange: (next: ReportColumn[] | null) => void;
}

export function ColumnsSelect({
  availableColumns,
  selected,
  onChange,
}: ColumnsSelectProps) {
  const effectiveSelected = selected ?? availableColumns.map((c) => c.value);

  return (
    <MultiSelect
      emptyText="Нет доступных колонок"
      label="Колонки"
      onChange={(next) => {
        if (next.length === 0) return;
        onChange(next as ReportColumn[]);
      }}
      options={availableColumns.map((c) => ({
        value: c.value,
        label: c.label,
      }))}
      selected={effectiveSelected}
    />
  );
}
