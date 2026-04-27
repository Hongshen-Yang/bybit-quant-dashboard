"use client";

import { useMemo, useState } from "react";

import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

export type PortfolioHistoryPoint = {
  recordedAt: string;
  valueUsd: number;
  holdings?: Array<{
    symbol: string;
    quantity: number;
  }>;
};

type PortfolioHistoryChartProps = {
  data: PortfolioHistoryPoint[];
};

type TimeRange = "last24h" | "lastMonth" | "allTime";

function formatXAxisLabel(value: string, range: TimeRange): string {
  const date = new Date(value);

  if (range === "last24h") {
    // HH:mm format
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  if (range === "lastMonth") {
    // MMM-dd format
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "2-digit",
    }).format(date);
  }

  // allTime - let system decide (default locale formatting)
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTooltipLabel(value: string, range: TimeRange): string {
  const date = new Date(value);

  if (range === "last24h") {
    // Last 24h: show full datetime with 24-hour format
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  if (range === "lastMonth") {
    // Last month: show date and time
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  // All time: show full date and time
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatUsdValue(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatHoldingQuantity(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

function formatYAxisTick(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toFixed(0);
}

function getUtcDateComponents(date: Date): { year: number; month: number; day: number } {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function calculateYAxisDomain(points: PortfolioHistoryPoint[]): [number, number] {
  if (points.length === 0) {
    return [0, 1];
  }

  let min = points[0].valueUsd;
  let max = points[0].valueUsd;

  for (const point of points) {
    if (point.valueUsd < min) min = point.valueUsd;
    if (point.valueUsd > max) max = point.valueUsd;
  }

  // Apply 10% padding: [min/1.1, max*1.1]
  return [min / 1.03, max * 1.03];
}

function filterByRange(data: PortfolioHistoryPoint[], range: TimeRange): PortfolioHistoryPoint[] {
  if (range === "allTime") {
    return data;
  }

  const now = new Date();
  const nowUtc = getUtcDateComponents(now);

  if (range === "last24h") {
    return data.filter((point) => {
      const pointDate = getUtcDateComponents(new Date(point.recordedAt));
      return (
        pointDate.year === nowUtc.year &&
        pointDate.month === nowUtc.month &&
        pointDate.day === nowUtc.day
      );
    });
  }

  return data.filter((point) => {
    const pointDate = getUtcDateComponents(new Date(point.recordedAt));
    return pointDate.year === nowUtc.year && pointDate.month === nowUtc.month;
  });
}

export function PortfolioHistoryChart({ data }: PortfolioHistoryChartProps) {
  const [range, setRange] = useState<TimeRange>("last24h");

  const filteredData = useMemo(() => {
    const scoped = filterByRange(data, range);
    return scoped.length > 0 ? scoped : data;
  }, [data, range]);

  const [yMin, yMax] = useMemo(() => calculateYAxisDomain(filteredData), [filteredData]);

  function renderTooltipContent({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length || typeof label !== "string") {
      return null;
    }

    const point = payload[0]?.payload as PortfolioHistoryPoint | undefined;
    const holdings = point?.holdings ?? [];

    return (
      <div
        style={{
          border: "1px solid rgba(23, 23, 23, 0.15)",
          borderRadius: 8,
          backgroundColor: "white",
          padding: "10px 12px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
        }}
      >
        <div style={{ fontWeight: 600 }}>{formatTooltipLabel(label, range)}</div>
        <div style={{ marginTop: 4 }}>{formatUsdValue(Number(payload[0].value))}</div>

        {holdings.length > 0 ? (
          <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Holdings</div>
            {holdings.slice(0, 6).map((holding) => (
              <div key={holding.symbol}>
                {holding.symbol}: {formatHoldingQuantity(holding.quantity)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 600 }}>Historical portfolio value</p>

      <div style={{ display: "inline-flex", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setRange("last24h")}
          style={{
            border: "1px solid #0f766e",
            borderRadius: 999,
            padding: "4px 10px",
            backgroundColor: range === "last24h" ? "#0f766e" : "white",
            color: range === "last24h" ? "white" : "#0f766e",
            cursor: "pointer",
          }}
        >
          Last 24h
        </button>
        <button
          type="button"
          onClick={() => setRange("lastMonth")}
          style={{
            border: "1px solid #0f766e",
            borderRadius: 999,
            padding: "4px 10px",
            backgroundColor: range === "lastMonth" ? "#0f766e" : "white",
            color: range === "lastMonth" ? "white" : "#0f766e",
            cursor: "pointer",
          }}
        >
          Last month
        </button>
        <button
          type="button"
          onClick={() => setRange("allTime")}
          style={{
            border: "1px solid #0f766e",
            borderRadius: 999,
            padding: "4px 10px",
            backgroundColor: range === "allTime" ? "#0f766e" : "white",
            color: range === "allTime" ? "white" : "#0f766e",
            cursor: "pointer",
          }}
        >
          All time
        </button>
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={filteredData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(23, 23, 23, 0.2)" />
            <XAxis dataKey="recordedAt" tickFormatter={(value) => formatXAxisLabel(value, range)} minTickGap={24} />
            <YAxis tickFormatter={formatYAxisTick} width={72} type="number" domain={[yMin, yMax]} />
            <Tooltip content={renderTooltipContent} />
            <Line
              type="monotone"
              dataKey="valueUsd"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              isAnimationActive
            />
            {filteredData.length > 20 ? (
              <Brush
                dataKey="recordedAt"
                tickFormatter={(value) => formatXAxisLabel(value, range)}
                height={24}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}