"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

type RevenuePoint = {
  date: string;
  value: number;
};

type RevenueChartProps = {
  data: RevenuePoint[];
  className?: string;
};

const chartConfig = {
  value: {
    label: "Tržby",
    color: "#75825B",
  },
} satisfies ChartConfig;

function formatTooltipDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAxisEuro(value: number) {
  if (value >= 1000) {
    const compact = Math.round(value / 100) / 10;
    return `${compact.toLocaleString("sk-SK")}k`;
  }
  return value.toLocaleString("sk-SK");
}

export function RevenueChart({ data, className = "" }: RevenueChartProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className={`!aspect-auto h-[220px] w-full sm:h-[260px] ${className}`}
      initialDimension={{ width: 320, height: 220 }}
    >
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} stroke="rgba(47,41,36,0.08)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={28}
          tick={{ fill: "rgba(47,41,36,0.45)", fontSize: 11 }}
          tickFormatter={(value) => {
            const date = new Date(`${value}T12:00:00`);
            return date.toLocaleDateString("sk-SK", {
              day: "numeric",
              month: "numeric",
            });
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickMargin={4}
          tickCount={5}
          tick={{ fill: "rgba(47,41,36,0.45)", fontSize: 10 }}
          tickFormatter={(value) => formatAxisEuro(Number(value))}
        />
        <ChartTooltip
          cursor={{ stroke: "#75825B", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;

            const raw = payload[0]?.value;
            const amount =
              typeof raw === "number"
                ? `${raw.toLocaleString("sk-SK")} €`
                : String(raw ?? "");

            return (
              <div className="rounded-lg border border-black/[0.06] bg-white px-3 py-2 shadow-[0_8px_24px_rgba(47,41,36,0.12)]">
                <p className="text-[11px] font-medium text-[#2f2924]/50">
                  {formatTooltipDate(String(label))}
                </p>
                <p className="mt-1 font-heading text-sm font-semibold tabular-nums text-[#2f2924]">
                  {amount}
                </p>
              </div>
            );
          }}
        />
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, fill: "#75825B", stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
