"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type React from "react";

import type {
  ReportChart,
  ReportChartItem,
  ReportChartPoint,
  ReportHorizontalBarChart,
  ReportLineChart,
} from "@/types/report";

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

export function ReportChartRenderer({ chart }: { chart: ReportChart }) {
  return chart.kind === "line" ? (
    <LineChartView chart={chart} />
  ) : (
    <HorizontalBarChartView chart={chart} />
  );
}
