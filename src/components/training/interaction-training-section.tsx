"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  streamStatusLabels,
  streamStatusTone,
} from "@/components/training/training-labels";
import { StatusChip } from "@/components/ui/status-chip";
import {
  getTrainingStreams,
  trainingStreamHref,
  trainingStreamsQueryKey,
} from "@/lib/api/training/streams";
import { useLocale } from "@/providers/locale-provider";

const copy = {
  ru: {
    loading: "Загружаем потоки…",
    error: "Не удалось загрузить потоки.",
    empty:
      "По программам взаимодействия потоков пока нет. Поток создаётся кнопкой «Создать обучение» в процессе после подписания договора.",
    participants: (total: number, paid: number) =>
      `участников: ${total}, оплатили: ${paid}`,
    open: "Открыть поток",
  },
  en: {
    loading: "Loading streams…",
    error: "Streams could not be loaded.",
    empty:
      "No streams for this interaction's programs yet. A stream is created with “Create training” in the process after the contract is signed.",
    participants: (total: number, paid: number) =>
      `participants: ${total}, paid: ${paid}`,
    open: "Open stream",
  },
} as const;

/**
 * Потоки обучения по программам взаимодействия — ссылки в раздел «Обучение».
 * Связывает карточку взаимодействия с потоками без поиска по разделу.
 */
export function InteractionTrainingSection({
  interactionId,
}: {
  interactionId: string;
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const params = {
    interactionIds: interactionId,
    ordering: "-created_at",
    page: 1,
    pageSize: 100,
    search: "",
    status: null,
  };
  const query = useQuery({
    queryKey: trainingStreamsQueryKey(params),
    queryFn: () => getTrainingStreams(params),
  });
  const streams = query.data?.results ?? [];

  if (query.isPending)
    return <p className="text-muted-foreground text-sm">{text.loading}</p>;
  if (query.isError)
    return (
      <p className="text-sm text-[var(--atmr-brand-orange)]">{text.error}</p>
    );
  if (streams.length === 0)
    return <p className="text-muted-foreground text-sm">{text.empty}</p>;

  return (
    <ul className="space-y-2">
      {streams.map((stream) => (
        <li
          className="flex flex-wrap items-center justify-between gap-2 text-sm"
          key={stream.id}
        >
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {stream.program.name}
            </p>
            <Link
              aria-label={`${text.open}: ${stream.name}`}
              className="font-medium underline"
              href={trainingStreamHref(stream.id)}
            >
              {stream.name}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip tone={streamStatusTone[stream.status]}>
              {streamStatusLabels[locale][stream.status]}
            </StatusChip>
            <span className="text-muted-foreground text-xs">
              {text.participants(
                stream.participants_count ?? 0,
                stream.paid_count ?? 0,
              )}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
