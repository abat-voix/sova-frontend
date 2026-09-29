"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { FileUp, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  registryCopy,
  RegistryHeader,
  registryPaginationLabels,
  registryTableLabels,
} from "@/components/registry/registry-shared";
import { LearnerFormDialog } from "@/components/training/learner-form";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import {
  createLearner,
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
      "Обучающиеся из файла «Пользователи» и добавленные вручную. Контакты показаны маской; полные персональные данные открываются на странице обучающегося с записью в журнал.",
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
    create: "Создать обучающегося",
    createTitle: "Новый обучающийся",
  },
  en: {
    title: "Learners",
    description:
      "Learners from the users file and added manually. Contacts are masked; full personal data opens on the learner page and is logged.",
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
    create: "Create learner",
    createTitle: "New learner",
  },
} as const;

/** Раздел «Обучение → Обучающиеся»: список; обучающийся открывается отдельной страницей. */
export function LearnersWorkspace() {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const router = useRouter();
  const { csrfToken, user } = useAuth();
  const canUpload = user !== null && can(user, "training.import");
  const canCreate = user !== null && can(user, "training.update");
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
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
          canUpload || canCreate ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {canCreate ? (
                <Button
                  onClick={() => setIsCreating(true)}
                  size="m"
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  {text.create}
                </Button>
              ) : null}
              {canUpload ? (
                <Button
                  asChild
                  colorScheme="neutral"
                  size="m"
                  variant="outline"
                >
                  <Link href="/training/learners/import">
                    <FileUp aria-hidden="true" className="size-4" />
                    {text.upload}
                  </Link>
                </Button>
              ) : null}
            </div>
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

      {isCreating ? (
        <LearnerFormDialog
          initial={null}
          onClose={() => setIsCreating(false)}
          onSaved={(saved) => {
            void queryClient.invalidateQueries({
              queryKey: ["training", "learners"],
            });
            router.push(learnerHref((saved as Learner).id));
          }}
          onSubmit={(payload) => createLearner(payload, csrfToken)}
          title={text.createTitle}
        />
      ) : null}
    </div>
  );
}
