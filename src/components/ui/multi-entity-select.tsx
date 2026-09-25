"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/search-input";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";

const copy = {
  ru: {
    clearAll: "Очистить",
    clearSearch: "Очистить поиск",
    empty: "Ничего не найдено.",
    error: "Не удалось загрузить справочник.",
    loading: "Загружаем…",
    searchPlaceholder: "Поиск…",
  },
  en: {
    clearAll: "Clear",
    clearSearch: "Clear search",
    empty: "Nothing found.",
    error: "The catalog could not be loaded.",
    loading: "Loading…",
    searchPlaceholder: "Search…",
  },
} as const;

type MultiEntitySelectProps = {
  id: string;
  label: string;
  /**
   * Выбранные значения, которые пользователю нельзя снять: права на это есть
   * только у другого пользователя.
   */
  lockedIds?: string[];
  onChange: (values: LookupOption[]) => void;
  placeholder: string;
  /** Ключ кэша без строки поиска — её компонент добавляет сам. */
  queryKey: readonly unknown[];
  search: (term: string) => Promise<LookupOption[]>;
  value: LookupOption[];
};

/**
 * Мультиселект справочника: поиск с задержкой и список отмечаемых вариантов.
 *
 * Сестра `EntitySelect` для мест, где отбор допускает несколько значений
 * (фильтры отчёта): те же поиск и список, но с чекбоксами вместо выбора одного
 * варианта.
 */
export function MultiEntitySelect({
  id,
  label,
  lockedIds,
  onChange,
  placeholder,
  queryKey,
  search,
  value,
}: MultiEntitySelectProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedTerm(term.trim()),
      350,
    );

    return () => window.clearTimeout(timeoutId);
  }, [term]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const optionsQuery = useQuery({
    queryKey: [...queryKey, debouncedTerm],
    queryFn: () => search(debouncedTerm),
    enabled: isOpen,
  });

  const options = optionsQuery.data ?? [];
  const selectedIds = new Set(value.map((option) => option.id));
  const locked = new Set(lockedIds ?? []);
  const hasRemovable = value.some((option) => !locked.has(option.id));

  function toggle(option: LookupOption) {
    if (locked.has(option.id)) return;
    onChange(
      selectedIds.has(option.id)
        ? value.filter((selected) => selected.id !== option.id)
        : [...value, option],
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-1">
        <button
          aria-controls={`${id}-list`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label}
          className={cn(
            "border-input bg-background flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-colors outline-none",
            "focus-visible:ring-ring focus-visible:ring-2",
          )}
          id={id}
          onClick={() => setIsOpen((open) => !open)}
          role="combobox"
          type="button"
        >
          <span
            className={cn(
              "truncate",
              value.length === 0 && "text-muted-foreground",
            )}
          >
            {value.length === 0 ? placeholder : `${label} · ${value.length}`}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 opacity-60"
          />
        </button>

        {hasRemovable ? (
          <button
            aria-label={`${text.clearAll}: ${label}`}
            className="text-muted-foreground hover:bg-secondary hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
            onClick={() =>
              onChange(value.filter((option) => locked.has(option.id)))
            }
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div
          className="bg-card absolute z-20 mt-1 w-72 max-w-[90vw] rounded-xl border p-2 shadow-lg"
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            setIsOpen(false);
          }}
        >
          <SearchInput
            aria-label={`${label}: ${text.searchPlaceholder}`}
            autoFocus
            className="[&_input]:h-9 [&_input]:rounded-lg"
            clearLabel={text.clearSearch}
            onChange={setTerm}
            placeholder={text.searchPlaceholder}
            value={term}
          />

          <div
            aria-label={label}
            className="mt-2 h-56 overflow-y-auto"
            id={`${id}-list`}
            role="listbox"
          >
            {optionsQuery.isPending ? (
              <p className="text-muted-foreground flex items-center gap-2 p-2 text-sm">
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
                {text.loading}
              </p>
            ) : optionsQuery.isError ? (
              <p className="text-muted-foreground p-2 text-sm">{text.error}</p>
            ) : options.length === 0 ? (
              <p className="text-muted-foreground p-2 text-sm">{text.empty}</p>
            ) : (
              options.map((option) => {
                const isSelected = selectedIds.has(option.id);
                const isLocked = locked.has(option.id);

                return (
                  <button
                    aria-disabled={isLocked}
                    aria-selected={isSelected}
                    className={cn(
                      "hover:bg-secondary flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
                      isLocked && "cursor-not-allowed opacity-60",
                    )}
                    key={option.id}
                    onClick={() => toggle(option)}
                    role="option"
                    type="button"
                  >
                    <Check
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{option.name}</span>
                      {option.hint ? (
                        <span className="text-muted-foreground block truncate text-xs">
                          {option.hint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
