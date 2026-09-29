"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, Presentation } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  registryCopy,
  RegistryHeader,
  registryPaginationLabels,
  registryTableLabels,
} from "@/components/registry/registry-shared";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar, type TableFilter } from "@/components/ui/table-toolbar";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import {
  getInstructors,
  instructorsPageSize,
  instructorsQueryKey,
  trainingInstructorHref,
} from "@/lib/api/training/instructors";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import type { TrainingInstructor } from "@/types/training";

type Activity = "all" | "active" | "inactive";

const text = {
  title: "Преподаватели",
  description:
    "Преподаватели организаций и B2C-клиентов, которые ведут потоки. Заводятся вручную; на поток назначаются только преподаватели организации-контрагента.",
  create: "Новый преподаватель",
  searchLabel: "Поиск преподавателей",
  searchPlaceholder: "ФИО, email или ID в LMS",
  activity: "Активность",
  active: "Активен",
  inactive: "Неактивен",
  activePlural: "Активные",
  inactivePlural: "Неактивные",
  name: "ФИО",
  organization: "Организация",
  position: "Должность",
  status: "Статус",
  tableCaption: "Преподаватели",
  loading: "Загружаем преподавателей…",
  error: "Не удалось загрузить преподавателей.",
} as const;

/** Раздел «Обучение → Преподаватели»: список; преподаватель открывается отдельной страницей. */
export function TrainingInstructorsWorkspace() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const canCreate = user !== null && can(user, "catalog.create");
  const common = registryCopy[locale];
  const router = useRouter();
  const table = useTableQueryState({ direction: "asc", field: "last_name" });
  const [activity, setActivity] = useState<Activity>("all");

  const params = {
    isActive: activity === "all" ? null : activity === "active",
    ordering: table.ordering,
    page: table.page,
    search: table.debouncedSearch,
  };
  const instructorsQuery = useQuery({
    queryKey: instructorsQueryKey(params),
    queryFn: () => getInstructors(params),
    placeholderData: keepPreviousData,
  });

  const filters: TableFilter[] = [
    {
      label: text.activity,
      name: "activity",
      onChange: table.withPageReset((value: string) =>
        setActivity(value as Activity),
      ),
      options: [
        { label: common.all, value: "all" },
        { label: text.activePlural, value: "active" },
        { label: text.inactivePlural, value: "inactive" },
      ],
      value: activity,
    },
  ];

  const columns: DataTableColumn<TrainingInstructor>[] = [
    {
      name: "last_name",
      render: (item) => (
        <span className="flex items-center gap-2 font-medium">
          <Presentation
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
          <Link
            className="hover:underline"
            href={trainingInstructorHref(item.id)}
          >
            {item.full_name}
          </Link>
        </span>
      ),
      sortField: "last_name",
      title: text.name,
      width: "32%",
    },
    {
      name: "organization",
      render: (item) => (
        <span className="text-muted-foreground">
          {item.organization?.name ??
            item.b2c_client?.full_name ??
            common.noValue}
        </span>
      ),
      title: text.organization,
      width: "30%",
    },
    {
      name: "position",
      render: (item) => (
        <span className="text-muted-foreground">
          {item.position || common.noValue}
        </span>
      ),
      title: text.position,
      width: "24%",
    },
    {
      name: "is_active",
      render: (item) => (
        <StatusChip tone={item.is_active ? "positive" : "neutral"}>
          {item.is_active ? text.active : text.inactive}
        </StatusChip>
      ),
      title: text.status,
      width: "14%",
    },
  ];

  return (
    <div className="space-y-5">
      <RegistryHeader
        action={
          canCreate ? (
            <Button asChild size="m">
              <Link href="/training/instructors/new">
                <Plus aria-hidden="true" className="size-4" />
                {text.create}
              </Link>
            </Button>
          ) : undefined
        }
        description={text.description}
        title={text.title}
      />

      <TableToolbar
        filters={filters}
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
            count={instructorsQuery.data?.count ?? 0}
            labels={registryPaginationLabels(locale)}
            onPageChange={table.setPage}
            page={table.page}
            pageSize={instructorsPageSize}
          />
        }
        getRowId={(row) => row.id}
        isError={instructorsQuery.isError}
        isLoading={instructorsQuery.isPending}
        labels={registryTableLabels(locale, {
          error: text.error,
          loading: text.loading,
        })}
        onRetry={() => void instructorsQuery.refetch()}
        onRowClick={(row) => router.push(trainingInstructorHref(row.id))}
        onSortChange={table.setSort}
        rows={instructorsQuery.data?.results ?? []}
        sort={table.sort}
      />
    </div>
  );
}
