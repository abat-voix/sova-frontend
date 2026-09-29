"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FileUp, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  registryCopy,
  RegistryHeader,
  registryPaginationLabels,
  registryTableLabels,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import {
  getLearners,
  learnerHref,
  learnersPageSize,
  learnersQueryKey,
} from "@/lib/api/training/learners";
import { formatDate } from "@/lib/format-date";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { Learner } from "@/types/training";

const copy = {
  ru: {
    title: "Обучающиеся",
    description:
      "Обучающиеся из файла «Пользователи». Контакты показаны маской; полные персональные данные видит только администратор платформы.",
    searchLabel: "Поиск обучающихся",
    searchPlaceholder: "Фамилия, имя или отчество",
    name: "ФИО",
    email: "Email",
    phone: "Телефон",
    createdAt: "Загружен",
    tableCaption: "Обучающиеся",
    loading: "Загружаем обучающихся…",
    error: "Не удалось загрузить обучающихся.",
    upload: "Загрузка обучающихся",
  },
  en: {
    title: "Learners",
    description:
      "Learners from the users file. Contacts are masked; full personal data is visible to the platform administrator only.",
    searchLabel: "Search learners",
    searchPlaceholder: "Last, first or middle name",
    name: "Full name",
    email: "Email",
    phone: "Phone",
    createdAt: "Uploaded",
    tableCaption: "Learners",
    loading: "Loading learners…",
    error: "Learners could not be loaded.",
    upload: "Upload learners",
  },
} as const;

/** Раздел «Обучение → Обучающиеся»: список; обучающийся открывается отдельной страницей. */
export function LearnersWorkspace() {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const router = useRouter();
  const { user } = useAuth();
  const canUpload = user !== null && can(user, "catalog.import");
  const table = useTableQueryState({ direction: "asc", field: "last_name" });

  const params = {
    ordering: table.ordering,
    page: table.page,
    search: table.debouncedSearch,
  };
  const learnersQuery = useQuery({
    queryKey: learnersQueryKey(params),
    queryFn: () => getLearners(params),
    placeholderData: keepPreviousData,
  });

  const columns: DataTableColumn<Learner>[] = [
    {
      name: "last_name",
      render: (learner) => (
        <span className="flex items-center gap-2 font-medium">
          <UserRound
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
          <Link className="hover:underline" href={learnerHref(learner.id)}>
            {learner.full_name}
          </Link>
        </span>
      ),
      sortField: "last_name",
      title: text.name,
      width: "40%",
    },
    {
      name: "email",
      render: (learner) => (
        <span className="text-muted-foreground">
          {learner.email || common.noValue}
        </span>
      ),
      title: text.email,
      width: "22%",
    },
    {
      name: "phone",
      render: (learner) => (
        <span className="text-muted-foreground">
          {learner.phone || common.noValue}
        </span>
      ),
      title: text.phone,
      width: "20%",
    },
    {
      align: "right",
      name: "created_at",
      render: (learner) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(learner.created_at, locale)}
        </span>
      ),
      sortField: "created_at",
      title: text.createdAt,
      width: "18%",
    },
  ];

  return (
    <div className="space-y-5">
      <RegistryHeader
        action={
          canUpload ? (
            <Button asChild size="m">
              <Link href="/training/learners/import">
                <FileUp aria-hidden="true" className="size-4" />
                {text.upload}
              </Link>
            </Button>
          ) : undefined
        }
        description={text.description}
        title={text.title}
      />

      <TableToolbar
        search={{
          clearLabel: common.clearSearch,
          label: text.searchLabel,
          onChange: table.setSearch,
          placeholder: text.searchPlaceholder,
          value: table.search,
        }}
      />

      <DataTable
        caption={text.tableCaption}
        columns={columns}
        footer={
          <TablePagination
            count={learnersQuery.data?.count ?? 0}
            labels={registryPaginationLabels(locale)}
            onPageChange={table.setPage}
            page={table.page}
            pageSize={learnersPageSize}
          />
        }
        getRowId={(row) => row.id}
        isError={learnersQuery.isError}
        isLoading={learnersQuery.isPending}
        labels={registryTableLabels(locale, {
          error: text.error,
          loading: text.loading,
        })}
        onRetry={() => void learnersQuery.refetch()}
        onRowClick={(row) => router.push(learnerHref(row.id))}
        onSortChange={table.setSort}
        rows={learnersQuery.data?.results ?? []}
        sort={table.sort}
      />
    </div>
  );
}
