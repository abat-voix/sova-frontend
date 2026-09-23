"use client";

import { EntitySelect } from "@/components/ui/entity-select";
import type { LookupOption } from "@/lib/api/catalog/lookups";

type WorkflowSingleSelectProps = {
  clearable?: boolean;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly LookupOption[];
  placement?: "bottom" | "top";
  placeholder: string;
  value: string;
};

/**
 * Одиночный селектор для локальных справочников конструктора workflow.
 *
 * Адаптирует статический список к тому же интерфейсу и UX, который используют
 * поисковые селекторы фильтров отчёта. Снаружи остаются только строковые id.
 */
export function WorkflowSingleSelect({
  clearable = false,
  disabled = false,
  id,
  label,
  onChange,
  options,
  placement = "bottom",
  placeholder,
  value,
}: WorkflowSingleSelectProps) {
  const selected = options.find((option) => option.id === value) ?? null;

  return (
    <div className="min-w-0 flex-1">
      <EntitySelect
        clearable={clearable}
        disabled={disabled}
        id={id}
        label={label}
        onChange={(option) => onChange(option?.id ?? "")}
        placement={placement}
        placeholder={placeholder}
        queryKey={["workflows", "select", id, options]}
        search={async (term) => {
          const normalized = term.trim().toLocaleLowerCase();
          return normalized
            ? options.filter((option) =>
                option.name.toLocaleLowerCase().includes(normalized),
              )
            : [...options];
        }}
        value={selected}
      />
    </div>
  );
}
