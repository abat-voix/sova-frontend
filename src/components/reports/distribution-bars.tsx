import type { DistributionEntry } from "@/lib/reports/types";

interface DistributionBarsProps {
  title: string;
  entries: DistributionEntry[];
}

export function DistributionBars({ title, entries }: DistributionBarsProps) {
  const top = entries.slice(0, 8);
  const max = Math.max(1, ...top.map((e) => e.interactions));

  return (
    <div className="border-border bg-card/70 rounded-xl border p-4 shadow-sm backdrop-blur-xl">
      <h3 className="text-foreground text-sm font-medium">{title}</h3>
      {top.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">Нет данных</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {top.map((entry, index) => {
            const width = Math.max(4, (entry.interactions / max) * 100);
            return (
              <li className="flex items-center gap-3" key={index}>
                <span className="text-foreground w-28 shrink-0 truncate text-sm">
                  {entry.label}
                </span>
                <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-10 shrink-0 text-right text-sm tabular-nums">
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
