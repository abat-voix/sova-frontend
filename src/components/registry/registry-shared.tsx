"use client";

import { Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { DataTableLabels } from "@/components/ui/data-table";
import { ApiError } from "@/lib/api/http";
import type { Locale } from "@/i18n/translations";

/**
 * Общие подписи таблиц-реестров (договоры, лицензии, вендоры): состояния
 * таблицы, сортировка и пагинация одинаковы во всех разделах.
 */
export const registryCopy = {
  ru: {
    all: "Все",
    cancel: "Отмена",
    clearSearch: "Очистить поиск",
    close: "Закрыть",
    delete: "Удалить",
    deleteConfirm: "Удалить без возможности восстановления?",
    deleting: "Удаляем…",
    edit: "Изменить",
    empty: "Записи не найдены.",
    next: "Следующая страница",
    no: "Нет",
    noValue: "Не указано",
    previous: "Предыдущая страница",
    retry: "Повторить",
    save: "Сохранить",
    saving: "Сохраняем…",
    sortAscending: "Сортировать по возрастанию",
    sortDescending: "Сортировать по убыванию",
    sortNone: "Сбросить сортировку",
    unknownError: "Не удалось выполнить запрос.",
    yes: "Да",
    pageOf: (page: number, pages: number) => `Страница ${page} из ${pages}`,
    range: (from: number, to: number, total: number) =>
      `Строки ${from}–${to} из ${total}`,
  },
  en: {
    all: "All",
    cancel: "Cancel",
    clearSearch: "Clear search",
    close: "Close",
    delete: "Delete",
    deleteConfirm: "Delete permanently?",
    deleting: "Deleting…",
    edit: "Edit",
    empty: "No records found.",
    next: "Next page",
    no: "No",
    noValue: "Not provided",
    previous: "Previous page",
    retry: "Retry",
    save: "Save",
    saving: "Saving…",
    sortAscending: "Sort ascending",
    sortDescending: "Sort descending",
    sortNone: "Clear sorting",
    unknownError: "The request failed.",
    yes: "Yes",
    pageOf: (page: number, pages: number) => `Page ${page} of ${pages}`,
    range: (from: number, to: number, total: number) =>
      `Rows ${from}–${to} of ${total}`,
  },
} as const;

export function registryTableLabels(
  locale: Locale,
  state: { error: string; loading: string },
): DataTableLabels {
  const common = registryCopy[locale];

  return {
    empty: common.empty,
    error: state.error,
    loading: state.loading,
    retry: common.retry,
    sortAscending: common.sortAscending,
    sortDescending: common.sortDescending,
    sortNone: common.sortNone,
  };
}

export function registryPaginationLabels(locale: Locale) {
  const common = registryCopy[locale];

  return {
    next: common.next,
    pageOf: common.pageOf,
    previous: common.previous,
    range: common.range,
  };
}

/**
 * Текст ошибки запроса: ошибки полей бэкенда важнее общего `detail` — они
 * говорят, что именно исправить в форме.
 */
export function apiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;

  const fieldMessages = Object.values(error.fieldErrors).flat();
  if (fieldMessages.length > 0) return fieldMessages.join(" ");

  return error.detail ?? fallback;
}

export const fieldInputClass =
  "border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

export function Field({
  children,
  hint,
  htmlFor,
  label,
  required = false,
}: {
  children: ReactNode;
  hint?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-muted-foreground text-xs" htmlFor={htmlFor}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {hint ? (
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function DetailRows({
  noValue,
  rows,
}: {
  noValue: string;
  rows: [string, ReactNode][];
}) {
  return (
    <dl className="divide-y">
      {rows.map(([label, value]) => (
        <div className="py-3" key={label}>
          <dt className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
            {label}
          </dt>
          <dd className="mt-1 text-sm break-words">
            {value === null || value === undefined || value === "" ? (
              <span className="text-muted-foreground">{noValue}</span>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Шапка раздела-реестра: заголовок, описание и главное действие справа. */
export function RegistryHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-base leading-7">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

/**
 * Удаление в два шага: первая кнопка только спрашивает подтверждение, чтобы
 * запись не пропала от случайного клика. `description` — что именно пропадёт.
 */
export function ConfirmDeleteButton({
  description,
  isPending,
  locale,
  onConfirm,
}: {
  description?: string;
  isPending: boolean;
  locale: Locale;
  onConfirm: () => void;
}) {
  const common = registryCopy[locale];
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <Button
        colorScheme="neutral"
        onClick={() => setIsConfirming(true)}
        size="m"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        {common.delete}
      </Button>
    );
  }

  const buttons = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">{common.deleteConfirm}</span>
      <Button disabled={isPending} onClick={onConfirm} size="m" type="button">
        {isPending ? common.deleting : common.delete}
      </Button>
      <Button
        colorScheme="neutral"
        disabled={isPending}
        onClick={() => setIsConfirming(false)}
        size="m"
        type="button"
        variant="outline"
      >
        {common.cancel}
      </Button>
    </div>
  );

  if (!description) return buttons;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">{description}</p>
      {buttons}
    </div>
  );
}
