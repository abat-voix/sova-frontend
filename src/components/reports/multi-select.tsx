"use client";

import { ChevronDown, X } from "lucide-react";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  loading?: boolean;
  placeholder?: string;
  emptyText?: string;
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchValue,
  onSearchChange,
  loading,
  placeholder = "Поиск…",
  emptyText = "Ничего не найдено",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function toggleValue(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  function close() {
    setOpen(false);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details
      className="group relative"
      onToggle={(e) => setOpen(e.currentTarget.open)}
      ref={detailsRef}
    >
      <summary
        className={cn(
          "border-border bg-background/60 text-foreground flex h-10 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm shadow-sm select-none",
          "marker:content-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <span className="truncate">
          {label}
          {selected.length > 0 ? ` · ${selected.length}` : ""}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </summary>

      {open && (
        <div className="border-border bg-card absolute z-20 mt-2 w-72 max-w-[90vw] rounded-md border p-2 shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {onSearchChange && (
              <Input
                autoFocus
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={placeholder}
                value={searchValue ?? ""}
              />
            )}
            {selected.length > 0 && (
              <button
                aria-label="Очистить выбор"
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-2"
                onClick={() => onChange([])}
                type="button"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <ul className="mt-2 max-h-64 overflow-y-auto">
            {loading && (
              <li className="text-muted-foreground px-2 py-3 text-sm">
                Загрузка…
              </li>
            )}
            {!loading && options.length === 0 && (
              <li className="text-muted-foreground px-2 py-3 text-sm">
                {emptyText}
              </li>
            )}
            {!loading &&
              options.map((option) => (
                <li key={option.value}>
                  <label className="hover:bg-secondary flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                    <input
                      checked={selected.includes(option.value)}
                      className="accent-primary size-4"
                      onChange={() => toggleValue(option.value)}
                      type="checkbox"
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                </li>
              ))}
          </ul>

          <div className="border-border mt-2 flex justify-end border-t pt-2">
            <button
              className="text-primary text-sm font-medium hover:underline"
              onClick={close}
              type="button"
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </details>
  );
}
