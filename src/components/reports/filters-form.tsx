"use client";

import { Select } from "@/components/ui/select";
import { ORDERING_OPTIONS } from "@/lib/reports/constants";
import type {
  AvailableColumn,
  ReportFilters,
  ReportOrdering,
} from "@/lib/reports/types";

import { CatalogMultiSelect } from "./catalog-multi-select";
import { ColumnsSelect } from "./columns-select";
import { DateRangeFields } from "./date-range-fields";

interface FiltersFormProps {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  availableColumns: AvailableColumn[];
}

export function FiltersForm({
  filters,
  onChange,
  availableColumns,
}: FiltersFormProps) {
  function patch(next: Partial<ReportFilters>) {
    onChange({ ...filters, ...next });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <DateRangeFields
        dateFrom={filters.date_from}
        dateTo={filters.date_to}
        onChange={({ dateFrom, dateTo }) =>
          patch({ date_from: dateFrom, date_to: dateTo })
        }
      />

      <CatalogMultiSelect
        kind="universities"
        label="Вузы"
        onChange={(universities) => patch({ universities })}
        selected={filters.universities}
      />
      <CatalogMultiSelect
        kind="directions"
        label="Направления"
        onChange={(directions) => patch({ directions })}
        selected={filters.directions}
      />
      <CatalogMultiSelect
        kind="programs"
        label="Программы"
        onChange={(programs) => patch({ programs })}
        selected={filters.programs}
      />
      <CatalogMultiSelect
        kind="products"
        label="Продукты"
        onChange={(products) => patch({ products })}
        selected={filters.products}
      />
      <CatalogMultiSelect
        kind="responsibles"
        label="Ответственные"
        onChange={(responsibles) =>
          patch({
            responsibles: responsibles.map(Number).filter(Number.isFinite),
          })
        }
        selected={filters.responsibles.map(String)}
      />

      <label className="text-sm">
        <span className="text-muted-foreground mb-1 block">Сортировка</span>
        <Select
          onChange={(e) =>
            patch({ ordering: e.target.value as ReportOrdering })
          }
          value={filters.ordering}
        >
          {ORDERING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <ColumnsSelect
        availableColumns={availableColumns}
        onChange={(columns) => patch({ columns })}
        selected={filters.columns}
      />
    </div>
  );
}
