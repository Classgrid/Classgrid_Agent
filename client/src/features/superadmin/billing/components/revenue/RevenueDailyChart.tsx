// Money per day for the chosen dates: one blue bar per India day, with a hover tooltip (date, amount, payments).
// One series, so no legend: the card title names it.
import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { inr } from "../transactions/paymentFormat";
import type { RevenueDay } from "./revenueApi";

// yyyy-MM-dd (an India day) read as that calendar day, without a time zone shift
const dayDate = (day: string) => new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));

const shortDay = (day: string) => dayDate(day).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const longDay = (day: string) => dayDate(day).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const compactInr = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

function DayTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RevenueDay }> }) {
  const day = active ? payload?.[0]?.payload : undefined;
  if (!day) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{longDay(day.day)}</p>
      <p className="text-sm font-semibold text-foreground">{inr(day.amountInr)}</p>
      <p className="text-xs text-muted-foreground">
        {day.count === 1 ? "1 payment" : `${day.count.toLocaleString("en-IN")} payments`}
      </p>
    </div>
  );
}

export function RevenueDailyChart({ days }: { days: RevenueDay[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDecimals={false}
            tickFormatter={(value: number) => `₹${compactInr.format(value)}`}
          />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={<DayTooltip />} />
          <Bar dataKey="amountInr" name="Money in" fill="var(--chart-1)" maxBarSize={18} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
