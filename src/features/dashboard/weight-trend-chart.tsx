"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeightLog } from "./dashboard.types";

export function WeightTrendChart({ logs }: { logs: WeightLog[] }) {
  return (
    <div
      className="weight-chart"
      role="img"
      aria-label={`Grafik tren berat badan dari ${logs.length} catatan`}
    >
      <ResponsiveContainer width="100%" height="100%" debounce={100}>
        <AreaChart data={logs} margin={{ top: 12, right: 8, bottom: 2, left: -12 }}>
          <defs>
            <linearGradient id="weight-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border-soft)"
            strokeDasharray="4 5"
          />
          <XAxis
            axisLine={false}
            dataKey="label"
            minTickGap={24}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            domain={["dataMin - 0.5", "dataMax + 0.5"]}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickFormatter={(value) => `${value} kg`}
            tickLine={false}
            width={46}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow)",
              color: "var(--popover-foreground)",
            }}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            formatter={(value) => [`${value} kg`, "Berat badan"]}
            labelStyle={{ color: "var(--muted-foreground)" }}
            itemStyle={{ color: "var(--foreground)" }}
          />
          <Area
            activeDot={{ fill: "var(--card)", r: 6, stroke: "var(--accent)", strokeWidth: 3 }}
            dataKey="weight"
            dot={{ fill: "var(--card)", r: 3.5, stroke: "var(--accent)", strokeWidth: 3 }}
            fill="url(#weight-trend-fill)"
            fillOpacity={1}
            stroke="var(--accent)"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
