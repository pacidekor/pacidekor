"use client";

import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChartGranularity } from "@/lib/analytics";

type RevenuePoint = {
  date: string;
  value: number;
};

type RevenueChartProps = {
  data: RevenuePoint[];
  granularity?: ChartGranularity;
  className?: string;
};

const chartConfig = {
  value: {
    label: "Tržby",
    color: "#75825B",
  },
} satisfies ChartConfig;

function parseChartDate(value: string) {
  if (value.includes("T")) {
    const [day, time = "00:00"] = value.split("T");
    const normalized = time.length === 2 ? `${time}:00` : time;
    return new Date(`${day}T${normalized}:00`);
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    return new Date(`${value}-01T12:00:00`);
  }
  return new Date(`${value}T12:00:00`);
}

function formatTooltipLabel(value: string, granularity: ChartGranularity) {
  const date = parseChartDate(value);

  if (granularity === "hour") {
    return date.toLocaleString("sk-SK", {
      weekday: "short",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (granularity === "month") {
    return date.toLocaleDateString("sk-SK", {
      month: "long",
      year: "numeric",
    });
  }

  return date.toLocaleDateString("sk-SK", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAxisTick(value: string, granularity: ChartGranularity) {
  const date = parseChartDate(value);

  if (granularity === "hour") {
    const isDayAnchor =
      (date.getHours() === 0 || date.getHours() === 9) &&
      date.getMinutes() === 0;
    if (isDayAnchor && value.includes("T")) {
      return date.toLocaleDateString("sk-SK", {
        weekday: "short",
        day: "numeric",
      });
    }
    return date.toLocaleTimeString("sk-SK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (granularity === "month") {
    return date.toLocaleDateString("sk-SK", { month: "short" });
  }

  return date.toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "numeric",
  });
}

function formatEuro(value: number) {
  return `${Math.round(value).toLocaleString("sk-SK")} €`;
}

function formatAxisEuro(value: number) {
  if (value >= 1000) {
    const compact = Math.round(value / 100) / 10;
    return `${compact.toLocaleString("sk-SK")}k`;
  }
  return value.toLocaleString("sk-SK");
}

export function RevenueChart({
  data,
  granularity = "day",
  className = "",
}: RevenueChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const average =
    data.length > 0
      ? data.reduce((sum, point) => sum + point.value, 0) / data.length
      : 0;

  const chartData = useMemo(
    () =>
      data.map((point, index) => {
        const previous = index > 0 ? data[index - 1]?.value : null;
        const delta =
          previous != null && previous > 0
            ? Math.round(((point.value - previous) / previous) * 100)
            : null;
        return { ...point, delta };
      }),
    [data],
  );

  const showDots = data.length <= 16;
  const minTickGap =
    granularity === "hour" ? 22 : granularity === "month" ? 20 : 18;

  return (
    <ChartContainer
      config={chartConfig}
      className={`!aspect-auto h-full min-h-[280px] w-full ${className}`}
      initialDimension={{ width: 640, height: 360 }}
    >
      <ComposedChart
        accessibilityLayer
        data={chartData}
        margin={{ left: 4, right: 12, top: 16, bottom: 4 }}
      >
        <defs>
          <linearGradient id={`fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#75825B" stopOpacity={0.28} />
            <stop offset="55%" stopColor="#75825B" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#75825B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`stroke-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8a9870" />
            <stop offset="50%" stopColor="#75825B" />
            <stop offset="100%" stopColor="#5f6b49" />
          </linearGradient>
        </defs>

        <CartesianGrid
          vertical
          horizontal
          stroke="rgba(47,41,36,0.06)"
          strokeDasharray="3 6"
        />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          minTickGap={minTickGap}
          tick={{ fill: "rgba(47,41,36,0.45)", fontSize: 11 }}
          tickFormatter={(value) => formatAxisTick(String(value), granularity)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickMargin={6}
          tickCount={6}
          domain={["auto", "auto"]}
          tick={{ fill: "rgba(47,41,36,0.45)", fontSize: 10 }}
          tickFormatter={(value) => formatAxisEuro(Number(value))}
        />

        {average > 0 ? (
          <ReferenceLine
            y={average}
            stroke="rgba(47,41,36,0.28)"
            strokeDasharray="4 6"
            strokeWidth={1}
            ifOverflow="extendDomain"
            label={{
              value: `Ø ${formatEuro(average)}`,
              position: "insideTopRight",
              fill: "rgba(47,41,36,0.45)",
              fontSize: 11,
            }}
          />
        ) : null}

        <ChartTooltip
          cursor={{
            stroke: "#75825B",
            strokeWidth: 1.25,
            strokeDasharray: "4 4",
            strokeOpacity: 0.55,
          }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0]?.payload as {
              date?: string;
              value?: number;
              delta?: number | null;
            };
            const amount =
              typeof point.value === "number" ? formatEuro(point.value) : "—";
            const delta = point.delta;
            const share =
              average > 0 && typeof point.value === "number"
                ? Math.round((point.value / average) * 100)
                : null;

            return (
              <div className="min-w-[10.5rem] rounded-xl border border-black/[0.06] bg-white px-3.5 py-2.5 shadow-[0_12px_28px_rgba(47,41,36,0.14)]">
                <p className="text-[11px] font-medium text-[#2f2924]/50">
                  {formatTooltipLabel(String(point.date ?? ""), granularity)}
                </p>
                <p className="mt-1 font-heading text-base font-semibold tabular-nums text-[#2f2924]">
                  {amount}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#2f2924]/45">
                  {delta != null ? (
                    <span
                      className={
                        delta > 0
                          ? "font-medium text-[#75825B]"
                          : delta < 0
                            ? "font-medium text-[#c45c4a]"
                            : undefined
                      }
                    >
                      {delta > 0 ? "+" : ""}
                      {delta} % vs predch.
                    </span>
                  ) : null}
                  {share != null ? <span>{share} % z priemeru</span> : null}
                </div>
              </div>
            );
          }}
        />

        <Area
          dataKey="value"
          type="monotone"
          fill={`url(#fill-${gradientId})`}
          stroke="none"
          isAnimationActive
          animationDuration={700}
        />
        <Line
          dataKey="value"
          type="monotone"
          stroke={`url(#stroke-${gradientId})`}
          strokeWidth={2.25}
          dot={
            showDots
              ? {
                  r: 3,
                  fill: "#75825B",
                  stroke: "#fff",
                  strokeWidth: 2,
                }
              : false
          }
          activeDot={{
            r: 5,
            fill: "#75825B",
            stroke: "#fff",
            strokeWidth: 2.5,
          }}
          isAnimationActive
          animationDuration={700}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
