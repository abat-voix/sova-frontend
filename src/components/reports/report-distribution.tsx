import type { ReportDistributionEntry } from "@/types/report";

type ReportDistributionProps = {
  emptyLabel: string;
  entries: ReportDistributionEntry[];
  title: string;
};

/** Ранжированный список с горизонтальными полосами — топ-8 значений распределения. */
export function ReportDistribution({
  emptyLabel,
  entries,
  title,
}: ReportDistributionProps) {
  const top = entries.slice(0, 8);
  const max = Math.max(1, ...top.map((entry) => entry.interactions));

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <h3 className="text-sm font-medium">{title}</h3>
      {top.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {top.map((entry, index) => {
            const width = Math.max(4, (entry.interactions / max) * 100);

            return (
              <li className="flex items-center gap-3" key={index}>
                <span className="w-28 shrink-0 truncate text-sm">
                  {entry.label}
                </span>
                <div className="bg-secondary h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-[var(--atmr-accent-primary)]"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-10 shrink-0 text-right text-sm">
                  {entry.interactions}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
