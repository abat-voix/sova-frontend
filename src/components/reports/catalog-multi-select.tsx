"use client";

import { useState } from "react";

import { useCatalogOptions } from "@/lib/reports/use-catalog-options";
import type { CatalogKind } from "@/lib/reports/catalog";

import { MultiSelect } from "./multi-select";

interface CatalogMultiSelectProps {
  kind: CatalogKind;
  label: string;
  selected: string[];
  onChange: (next: string[]) => void;
}

export function CatalogMultiSelect({
  kind,
  label,
  selected,
  onChange,
}: CatalogMultiSelectProps) {
  const [search, setSearch] = useState("");
  const { data, isFetching } = useCatalogOptions(kind, search);

  return (
    <MultiSelect
      label={label}
      loading={isFetching}
      onChange={onChange}
      onSearchChange={setSearch}
      options={(data ?? []).map((o) => ({ value: o.id, label: o.label }))}
      searchValue={search}
      selected={selected}
    />
  );
}
