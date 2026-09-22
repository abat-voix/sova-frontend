"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getActionRollbacks,
  getStageRollbacks,
  rollbacksQueryKey,
} from "@/lib/api/processes/rollbacks";
import { formatMoment } from "@/lib/workflow/format-moment";
import { useLocale } from "@/providers/locale-provider";

const copy = {
  ru: {
    error: "Не удалось загрузить историю откатов.",
    title: "Откаты",
    unknownAuthor: "неизвестно кем",
  },
  en: {
    error: "The rollback history could not be loaded.",
    title: "Rollbacks",
    unknownAuthor: "unknown author",
  },
} as const;

type Entry = {
  id: string;
  reason: string;
  created_at: string;
  created_by: { full_name: string } | null;
};

/**
 * Список записей журнала. Пустая история не рисует ничего: блок с заголовком
 * и пустотой только занимал бы место в узкой панели.
 */
function History({ entries, isError }: { entries: Entry[]; isError: boolean }) {
  const { locale } = useLocale();
  const text = copy[locale];

  return (
    <div data-testid="rollback-history">
      {isError ? (
        <p className="text-muted-foreground border-t pt-4 text-xs">
          {text.error}
        </p>
      ) : entries.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-muted-foreground text-xs font-bold tracking-[0.12em] uppercase">
            {text.title}
          </p>
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li className="bg-secondary rounded-lg p-3" key={entry.id}>
                <p className="text-sm">{entry.reason}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {entry.created_by?.full_name ?? text.unknownAuthor} ·{" "}
                  {formatMoment(entry.created_at, locale)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Откаты одного действия по всем его исполнениям.
 *
 * Фильтра по действию у эндпоинта нет — журнал приходит по процессу целиком,
 * а записи отбираются по определению действия: так в историю попадают все его
 * исполнения, а не только текущее.
 */
export function ActionRollbackHistory({
  actionDefinitionId,
  workflowInstanceId,
}: {
  actionDefinitionId: string;
  workflowInstanceId: string;
}) {
  const query = useQuery({
    queryKey: [...rollbacksQueryKey(workflowInstanceId), "actions"],
    queryFn: () => getActionRollbacks(workflowInstanceId),
  });

  const entries =
    query.data?.results?.filter(
      (record) => record.from_action_instance.action.id === actionDefinitionId,
    ) ?? [];

  return <History entries={entries} isError={query.isError} />;
}

/** Откаты, которыми этап отменяли или на который возвращались. */
export function StageRollbackHistory({
  stageInstanceId,
  workflowInstanceId,
}: {
  stageInstanceId: string;
  workflowInstanceId: string;
}) {
  const query = useQuery({
    queryKey: [...rollbacksQueryKey(workflowInstanceId), "stages"],
    queryFn: () => getStageRollbacks(workflowInstanceId),
  });

  const entries =
    query.data?.results?.filter(
      (record) =>
        record.from_stage_instance.id === stageInstanceId ||
        record.to_stage_instance.id === stageInstanceId,
    ) ?? [];

  return <History entries={entries} isError={query.isError} />;
}
