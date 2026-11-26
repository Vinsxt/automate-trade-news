"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usd } from "@/lib/trade/beginner-market";

const compact = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
});

export type ImportValueChartProps = {
  data: { period: string; values: (number | null)[] }[];
  series: string[];
};

export function ImportValueChart({ data, series }: ImportValueChartProps) {
  return <div className="h-56 w-full min-w-0 sm:h-64" data-testid="import-chart">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={data} accessibilityLayer aria-label="Annual import values in US dollars" margin={{ top: 10, right: 14, left: 2, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
        <YAxis tickFormatter={(value: number) => compact.format(value)} tickLine={false} axisLine={false}
          width={63} tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
          labelFormatter={label => `Trade year ${label}`}
          formatter={value => value == null ? "Unavailable" : usd(Number(value))}
          contentStyle={{ border: "1px solid var(--border)", borderRadius: "10px", backgroundColor: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow-panel)" }}
          labelStyle={{ fontWeight: 650 }} />
        {series.map((name, index) => <Line key={name} type="linear" name={name} dataKey={`values[${index}]`}
          stroke={index === 0 ? "var(--chart-primary)" : "var(--chart-secondary)"}
          strokeDasharray={index === 0 ? undefined : "5 4"} strokeWidth={2.5}
          dot={{ r: 3, strokeWidth: 1.5, fill: "var(--surface)" }} activeDot={{ r: 5 }}
          isAnimationActive={false} connectNulls={false} />)}
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
