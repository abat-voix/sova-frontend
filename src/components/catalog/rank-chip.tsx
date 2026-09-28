import { Trophy } from "lucide-react";

import { StatusChip } from "@/components/ui/status-chip";

/**
 * Место в рейтинге каталога: «1 место». Без места метка не показывается —
 * у объекта ещё нет зачисленных (у продукта — взаимодействий).
 */
export function RankChip({
  label,
  rank,
}: {
  label: (rank: number) => string;
  rank: number | null | undefined;
}) {
  if (rank === null || rank === undefined) return null;

  return (
    <StatusChip className="gap-1" tone="accent">
      <Trophy aria-hidden="true" className="size-3.5" />
      {label(rank)}
    </StatusChip>
  );
}
