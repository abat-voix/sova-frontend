"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, ChevronDown, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SearchInput } from "@/components/ui/search-input";
import type { LookupOption } from "@/lib/api/catalog/lookups";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";

const copy = {
  ru: {
    clear: "Очистить",
    clearSearch: "Очистить поиск",
    empty: "Ничего не найдено.",
    error: "Не удалось загрузить справочник.",
    loading: "Загружаем…",
    loadMore: "Показать ещё",
    searchPlaceholder: "Поиск…",
  },
  en: {
    clear: "Clear",
    clearSearch: "Clear search",
    empty: "Nothing found.",
    error: "The catalog could not be loaded.",
    loading: "Loading…",
    loadMore: "Load more",
    searchPlaceholder: "Search…",
  },
} as const;

type EntitySelectProps = {
  /** Показывать кнопку очистки выбранного значения. */
  clearable?: boolean;
  disabled?: boolean;
  /** Подсказка вместо плейсхолдера, когда выбор ещё невозможен. */
  disabledHint?: string;
  /** Скрываемые варианты: уже выбранные в другом месте формы. */
  excludeIds?: string[];
  id: string;
  invalid?: boolean;
  label: string;
  onChange: (option: LookupOption | null) => void;
  /** Локальные варианты для небольших списков без API-справочника. */
  options?: LookupOption[];
  placement?: "bottom" | "top";
  placeholder: string;
  /** Ключ кэша без строки поиска — её компонент добавляет сам. */
  queryKey: readonly unknown[];
  search?: (term: string) => Promise<LookupOption[]>;
  /** Постраничный источник для больших справочников. */
  searchPage?: (
    term: string,
    page: number,
  ) => Promise<{ options: LookupOption[]; hasNextPage: boolean }>;
  value: LookupOption | null;
};

/**
 * Выпадушка справочника: поиск с задержкой и список вариантов.
 *
 * Запрос описывается функцией `search`, поэтому компонент не знает ни об одном
 * конкретном эндпоинте и одинаково работает для вузов, клиентов, направлений,
 * программ и продуктов.
 */
export function EntitySelect({
  clearable = true,
  disabled = false,
  disabledHint,
  excludeIds = [],
  id,
  invalid = false,
  label,
  onChange,
  placement = "bottom",
  placeholder,
  queryKey,
  search,
  searchPage,
  options: staticOptions,
  value,
}: EntitySelectProps) {
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

  const optionsQuery = useInfiniteQuery({
    queryKey: [...queryKey, debouncedTerm],
    queryFn: async ({ pageParam }) => {
      if (staticOptions) {
        const normalizedTerm = debouncedTerm.toLocaleLowerCase();

        return {
          hasNextPage: false,
          options: staticOptions.filter((option) =>
            option.name.toLocaleLowerCase().includes(normalizedTerm),
          ),
        };
      }

      if (searchPage) return searchPage(debouncedTerm, pageParam);
      if (search) {
        return { options: await search(debouncedTerm), hasNextPage: false };
      }

      return { options: [], hasNextPage: false };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
    enabled: isOpen && !disabled,
  });

  const options = (
    optionsQuery.data?.pages.flatMap((page) => page.options) ?? []
  ).filter(
    (option) => option.id === value?.id || !excludeIds.includes(option.id),
  );

  function choose(option: LookupOption) {
    onChange(option);
    setIsOpen(false);
    setTerm("");
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
            "border-input bg-background flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-colors outline-none",
            "focus-visible:ring-ring focus-visible:ring-2",
            invalid && "border-[var(--atmr-accent-primary)]",
            disabled && "cursor-not-allowed opacity-50",
          )}
          disabled={disabled}
          id={id}
          onClick={() => setIsOpen((open) => !open)}
          role="combobox"
          type="button"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value?.name ??
              (disabled ? (disabledHint ?? placeholder) : placeholder)}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 opacity-60"
          />
        </button>

        {clearable && value && !disabled ? (
          <button
            aria-label={`${text.clear}: ${label}`}
            className="text-muted-foreground hover:bg-secondary hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
            onClick={() => onChange(null)}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div
          className={cn(
            "bg-card absolute z-20 w-full rounded-xl border p-2 shadow-lg",
            placement === "top" ? "bottom-full mb-1" : "mt-1",
          )}
          onKeyDown={(event) => {
            // Первый Escape закрывает список, а не всё модальное окно.
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
            className="mt-2 max-h-56 overflow-y-auto"
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
              options.map((option) => (
                <button
                  aria-selected={option.id === value?.id}
                  className="hover:bg-secondary flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm"
                  key={option.id}
                  onClick={() => choose(option)}
                  role="option"
                  type="button"
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0",
                      option.id === value?.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.name}</span>
                </button>
              ))
            )}
            {optionsQuery.hasNextPage ? (
              <button
                className="text-muted-foreground hover:bg-secondary w-full rounded-lg px-2 py-2 text-center text-sm"
                disabled={optionsQuery.isFetchingNextPage}
                onClick={() => void optionsQuery.fetchNextPage()}
                type="button"
              >
                {optionsQuery.isFetchingNextPage ? text.loading : text.loadMore}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
