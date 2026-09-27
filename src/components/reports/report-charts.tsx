"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type React from "react";

import { useLocale } from "@/providers/locale-provider";
import type {
  ReportChart,
  ReportChartItem,
  ReportChartPoint,
  ReportHorizontalBarChart,
  ReportLineChart,
} from "@/types/report";

/** Графики, которые рисуются пончиком вместо горизонтальных полос. */
const donutChartIds = new Set(["by_university"]);
/** Больше сегментов пончик не различает — хвост сворачивается в «Остальные». */
const maxDonutSegments = 6;
const donutColors = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
];
const donutOtherColor = "var(--atmr-text-secondary)";
const donutCopy = {
  ru: { other: "Остальные", intl: "ru-RU" },
  en: { other: "Other", intl: "en-GB" },
} as const;

const tones: Record<string, string> = {
  primary: "var(--atmr-accent-primary)",
  secondary: "var(--atmr-accent-secondary, var(--atmr-accent-primary))",
  warning: "var(--atmr-brand-orange)",
  neutral: "var(--atmr-text-secondary)",
};

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ payload: ReportChartPoint | ReportChartItem }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-card rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label ?? point.label}</p>
      <p className="text-muted-foreground mt-1">{point.display_value}</p>
    </div>
  );
}

function ChartCard({
  chart,
  children,
}: {
  chart: ReportChart;
  children: React.ReactNode;
}) {
  const data = chart.kind === "line" ? chart.points : chart.items;
  const tone = tones[chart.tone] ?? tones.primary;

  return (
    <section
      aria-describedby={`${chart.id}-description`}
      aria-labelledby={`${chart.id}-title`}
      className="bg-card rounded-xl border p-4 shadow-sm"
    >
      <h3 className="text-sm font-medium" id={`${chart.id}-title`}>
        {chart.title}
      </h3>
      <p
        className="text-muted-foreground mt-1 text-xs"
        id={`${chart.id}-description`}
      >
        {chart.description}
      </p>
      {data.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          {chart.empty_message}
        </p>
      ) : (
        <div
          className="mt-4 h-64"
          style={{ "--chart-tone": tone } as React.CSSProperties}
        >
          {children}
        </div>
      )}
    </section>
  );
}

function LineChartView({ chart }: { chart: ReportLineChart }) {
  return (
    <ChartCard chart={chart}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          data={chart.points}
          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--atmr-border-subtle)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--atmr-text-secondary)", fontSize: 11 }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--atmr-text-secondary)", fontSize: 11 }}
            width={32}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            dataKey="value"
            dot={{ fill: "var(--chart-tone)" }}
            name={chart.value_label}
            stroke="var(--chart-tone)"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function HorizontalBarChartView({
  chart,
}: {
  chart: ReportHorizontalBarChart;
}) {
  return (
    <ChartCard chart={chart}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={chart.items}
          layout="vertical"
          margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--atmr-border-subtle)"
          />
          <XAxis allowDecimals={false} type="number" />
          <YAxis
            dataKey="label"
            tick={{ fill: "var(--atmr-text-secondary)", fontSize: 11 }}
            type="category"
            width={112}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="value"
            fill="var(--chart-tone)"
            name={chart.value_label}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

type DonutSegment = ReportChartItem & { fill: string; share: number };

function donutSegments(
  items: ReportChartItem[],
  otherLabel: string,
  numberFormat: Intl.NumberFormat,
): DonutSegment[] {
  let folded = items;
  if (items.length > maxDonutSegments) {
    const rest = items
      .slice(maxDonutSegments - 1)
      .reduce((sum, item) => sum + item.value, 0);
    folded = [
      ...items.slice(0, maxDonutSegments - 1),
      {
        key: "other",
        label: otherLabel,
        value: rest,
        display_value: numberFormat.format(rest),
      },
    ];
  }
  const total = folded.reduce((sum, item) => sum + item.value, 0) || 1;

  return folded.map((item, index) => ({
    ...item,
    fill:
      item.key === "other"
        ? donutOtherColor
        : donutColors[index % donutColors.length],
    share: item.value / total,
  }));
}

function DonutChartView({ chart }: { chart: ReportHorizontalBarChart }) {
  const { locale } = useLocale();
  const text = donutCopy[locale];
  const numberFormat = new Intl.NumberFormat(text.intl);
  const percentFormat = new Intl.NumberFormat(text.intl, {
    maximumFractionDigits: 1,
    style: "percent",
  });
  const segments = donutSegments(chart.items, text.other, numberFormat);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <ChartCard chart={chart}>
      <div className="flex h-full items-center gap-4">
        <div className="relative size-40 shrink-0">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                data={segments}
                dataKey="value"
                endAngle={-270}
                innerRadius="64%"
                nameKey="label"
                outerRadius="100%"
                startAngle={90}
                stroke="var(--card)"
                strokeWidth={2}
              />
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-medium">
              {numberFormat.format(total)}
            </span>
            <span className="text-muted-foreground text-xs">
              {chart.value_label}
            </span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {segments.map((segment) => (
            <li
              className="flex items-center gap-2 text-sm"
              key={segment.key ?? segment.label}
            >
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.fill }}
              />
              <span className="min-w-0 flex-1 truncate" title={segment.label}>
                {segment.label}
              </span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {segment.display_value} · {percentFormat.format(segment.share)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

export function ReportChartRenderer({ chart }: { chart: ReportChart }) {
  if (chart.kind === "line") return <LineChartView chart={chart} />;
  if (donutChartIds.has(chart.id)) return <DonutChartView chart={chart} />;
  return <HorizontalBarChartView chart={chart} />;
}
