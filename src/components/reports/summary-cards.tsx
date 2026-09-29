import type { ReportSummaryResponse } from "@/lib/reports/types";

interface SummaryCardsProps {
  summary: ReportSummaryResponse;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    { label: "Взаимодействия", value: summary.interactions_count },
    { label: "Строки", value: summary.rows_count },
    { label: "Программы", value: summary.programs_count },
    { label: "Продукты", value: summary.products_count },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          className="border-border bg-card/70 rounded-xl border p-4 shadow-sm backdrop-blur-xl"
          key={card.label}
        >
          <p className="text-muted-foreground text-sm">{card.label}</p>
          <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
            {card.value.toLocaleString("ru-RU")}
          </p>
        </div>
      ))}
    </div>
  );
}
