"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  registryCopy,
  RegistryHeader,
  registryPaginationLabels,
  registryTableLabels,
} from "@/components/registry/registry-shared";
import {
  streamStatusLabels,
  streamStatusTone,
} from "@/components/training/training-labels";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableToolbar, type TableFilter } from "@/components/ui/table-toolbar";
import { useTableQueryState } from "@/hooks/use-table-query-state";
import {
  getTrainingStreams,
  trainingStreamHref,
  trainingStreamsPageSize,
  trainingStreamsQueryKey,
} from "@/lib/api/training/streams";
import { formatDate } from "@/lib/format-date";
import { useLocale } from "@/providers/locale-provider";
import type { TrainingStream, TrainingStreamStatus } from "@/types/training";

const copy = {
  ru: {
    title: "Потоки",
    description:
      "Потоки обучения по программам взаимодействий. Поток создаётся кнопкой «Создать обучение» в процессе взаимодействия после подписания договора.",
    searchLabel: "Поиск потоков",
    searchPlaceholder: "Название потока или программы",
    status: "Статус",
    name: "Поток",
    program: "Программа",
    counterparty: "Контрагент",
    period: "Начало",
    participants: "Участники / оплатили",
    tableCaption: "Потоки обучения",
    loading: "Загружаем потоки…",
    error: "Не удалось загрузить потоки.",
  },
  en: {
    title: "Streams",
    description:
      "Training streams by interaction programs. A stream is created with “Create training” in the interaction process after the contract is signed.",
    searchLabel: "Search streams",
    searchPlaceholder: "Stream or program name",
    status: "Status",
    name: "Stream",
    program: "Program",
    counterparty: "Counterparty",
    period: "Start",
    participants: "Participants / paid",
    tableCaption: "Training streams",
    loading: "Loading streams…",
    error: "Streams could not be loaded.",
  },
} as const;

type StatusFilter = TrainingStreamStatus | "all";

/** Раздел «Обучение → Потоки»: список; поток открывается отдельной страницей. */
export function TrainingStreamsWorkspace() {
  const { locale } = useLocale();
  const text = copy[locale];
  const common = registryCopy[locale];
  const router = useRouter();
  const table = useTableQueryState({ direction: "desc", field: "created_at" });
  const [status, setStatus] = useState<StatusFilter>("all");
  // Старые ссылки вида ?stream=<id> ведут на страницу потока
  const linkedStreamId = useSearchParams()?.get("stream") || null;
  useEffect(() => {
    if (linkedStreamId) router.replace(trainingStreamHref(linkedStreamId));
  }, [linkedStreamId, router]);

  const params = {
    ordering: table.ordering,
    page: table.page,
    search: table.debouncedSearch,
    status: status === "all" ? null : status,
  };
  const streamsQuery = useQuery({
    queryKey: trainingStreamsQueryKey(params),
    queryFn: () => getTrainingStreams(params),
    placeholderData: keepPreviousData,
  });
  const streams = streamsQuery.data?.results ?? [];

  const filters: TableFilter[] = [
    {
      label: text.status,
      name: "status",
      onChange: table.withPageReset((value: string) =>
        setStatus(value as StatusFilter),
      ),
      options: [
        { label: common.all, value: "all" },
        ...(
          Object.keys(streamStatusLabels[locale]) as TrainingStreamStatus[]
        ).map((value) => ({ label: streamStatusLabels[locale][value], value })),
      ],
      value: status,
    },
  ];

  const columns: DataTableColumn<TrainingStream>[] = [
    {
      name: "name",
      render: (stream) => (
        <span className="flex items-center gap-2 font-medium">
          <GraduationCap
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
          <Link
            className="hover:underline"
            href={trainingStreamHref(stream.id)}
          >
            {stream.name}
          </Link>
        </span>
      ),
      sortField: "name",
      title: text.name,
      width: "24%",
    },
    {
      name: "program",
      render: (stream) => stream.program.name,
      title: text.program,
      width: "20%",
    },
    {
      name: "counterparty",
      render: (stream) => (
        <span className="text-muted-foreground">
          {stream.counterparty_name} · № {stream.interaction_number}
        </span>
      ),
      title: text.counterparty,
      width: "22%",
    },
    {
      name: "status",
      render: (stream) => (
        <StatusChip tone={streamStatusTone[stream.status]}>
          {streamStatusLabels[locale][stream.status]}
        </StatusChip>
      ),
      sortField: "status",
      title: text.status,
      width: "12%",
    },
    {
      align: "right",
      name: "starts_at",
      render: (stream) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {stream.starts_at
            ? formatDate(stream.starts_at, locale)
            : common.noValue}
        </span>
      ),
      sortField: "starts_at",
      title: text.period,
      width: "10%",
    },
    {
      align: "right",
      name: "participants",
      render: (stream) =>
        `${stream.participants_count ?? 0} / ${stream.paid_count ?? 0}`,
      title: text.participants,
      width: "12%",
    },
  ];

  return (
    <div className="space-y-5">
      <RegistryHeader description={text.description} title={text.title} />

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
            count={streamsQuery.data?.count ?? 0}
            labels={registryPaginationLabels(locale)}
            onPageChange={table.setPage}
            page={table.page}
            pageSize={trainingStreamsPageSize}
          />
        }
        getRowId={(row) => row.id}
        isError={streamsQuery.isError}
        isLoading={streamsQuery.isPending}
        labels={registryTableLabels(locale, {
          error: text.error,
          loading: text.loading,
        })}
        onRetry={() => void streamsQuery.refetch()}
        onRowClick={(row) => router.push(trainingStreamHref(row.id))}
        onSortChange={table.setSort}
        rows={streams}
        sort={table.sort}
      />
    </div>
  );
}
