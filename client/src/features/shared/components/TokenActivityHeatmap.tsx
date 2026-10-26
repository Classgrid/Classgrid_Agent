// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, endOfWeek, format, min, startOfWeek } from "date-fns";
import { apiClient } from "@/lib/apiClient";
import { NikhilDateCalendar } from "@/components/marketing_ui/nikhil_date_calendar";
import { cn } from "@/lib/utils";

type View = "daily" | "weekly" | "cumulative";

// Weeks start on Monday (top row = Monday)
const WEEK_OPTS = { weekStartsOn: 1 as const };

// 32400000 -> "32.4M", 57000000 -> "57M"
const formatTokens = (n: number) => {
  const units: [number, string][] = [[1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [size, label] of units) {
    if (n >= size) return `${parseFloat((n / size).toFixed(1))}${label}`;
  }
  return String(n);
};

// 0 = empty, 1..4 = faint to strong (black on light mode, white on dark mode)
const LEVEL_CLASSES = [
  "bg-foreground/[0.07]",
  "bg-foreground/20",
  "bg-foreground/40",
  "bg-foreground/65",
  "bg-foreground/90",
];

const GAP = 3;

const levelFor = (value: number, max: number) => {
  if (!value || !max) return 0;
  const r = value / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
};

type Tip = { title: string; value: string; x: number; y: number } | null;

export function TokenActivityHeatmap() {
  const [view, setView] = useState<View>("daily");
  const [range, setRange] = useState<{ from: Date; to: Date }>(() => {
    const year = new Date().getFullYear();
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
  });
  const [tip, setTip] = useState<Tip>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const fromKey = format(range.from, "yyyy-MM-dd");
  const toKey = format(range.to, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["token-activity", fromKey, toKey],
    queryFn: () =>
      apiClient
        .get(`/api/ai/my-token-activity?from=${fromKey}&to=${toKey < format(new Date(), "yyyy-MM-dd") ? toKey : format(new Date(), "yyyy-MM-dd")}`)
        .then((r) => r.data as { days: { date: string; tokens: number }[] }),
  });

  // Week columns: each has 7 days (Mon..Sun) plus its total
  const weeks = useMemo(() => {
    const byDay = new Map<string, number>();
    (data?.days || []).forEach((d) => byDay.set(d.date, d.tokens));

    const cols: { start: Date; days: { date: Date; key: string; tokens: number; inRange: boolean }[]; total: number }[] = [];
    let cursor = startOfWeek(range.from, WEEK_OPTS);
    const last = endOfWeek(range.to, WEEK_OPTS);
    while (cursor <= last) {
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(cursor, i);
        const key = format(date, "yyyy-MM-dd");
        const inRange = key >= fromKey && key <= toKey;
        return { date, key, tokens: inRange ? byDay.get(key) || 0 : 0, inRange };
      });
      cols.push({ start: cursor, days, total: days.reduce((s, d) => s + d.tokens, 0) });
      cursor = addDays(cursor, 7);
    }
    return cols;
  }, [data, range, fromKey, toKey]);

  const maxDay = useMemo(() => Math.max(0, ...weeks.flatMap((w) => w.days.map((d) => d.tokens))), [weeks]);
  const maxWeek = useMemo(() => Math.max(0, ...weeks.map((w) => w.total)), [weeks]);
  const runningTotals = useMemo(() => {
    let sum = 0;
    return weeks.map((w) => (sum += w.total));
  }, [weeks]);
  const grandTotal = runningTotals[runningTotals.length - 1] || 0;

  // Month name under the week that holds the 1st of that month
  const monthLabels = useMemo(
    () =>
      weeks
        .map((w, i) => {
          const first = w.days.find((d) => d.date.getDate() === 1 && d.inRange);
          return first ? { index: i, label: format(first.date, "MMM") } : null;
        })
        .filter(Boolean) as { index: number; label: string }[],
    [weeks]
  );

  const showTip = (e: React.MouseEvent<HTMLDivElement>, title: string, value: string) => {
    const box = boxRef.current?.getBoundingClientRect();
    const cell = e.currentTarget.getBoundingClientRect();
    if (!box) return;
    setTip({ title, value, x: cell.left - box.left + cell.width / 2, y: cell.top - box.top });
  };

  const renderCell = (weekIndex: number, dayIndex: number) => {
    const week = weeks[weekIndex];
    const day = week.days[dayIndex];

    if (view === "daily") {
      if (!day.inRange) return <div key={dayIndex} className="aspect-square" />;
      return (
        <div
          key={dayIndex}
          className={cn("aspect-square rounded-[3px] transition-colors", LEVEL_CLASSES[levelFor(day.tokens, maxDay)])}
          onMouseEnter={(e) => showTip(e, format(day.date, "MMM d"), `${formatTokens(day.tokens)} tokens`)}
          onMouseLeave={() => setTip(null)}
        />
      );
    }

    // Weekly / Cumulative: each week is a column that fills up from the bottom.
    // Weeks that start after today are the future: keep them blank.
    if (format(week.start, "yyyy-MM-dd") > format(new Date(), "yyyy-MM-dd")) {
      return <div key={dayIndex} className="aspect-square rounded-[3px] bg-foreground/[0.07]" />;
    }
    const value = view === "weekly" ? week.total : runningTotals[weekIndex];
    const max = view === "weekly" ? maxWeek : grandTotal;
    const filled = value > 0 && max > 0 ? Math.max(1, Math.round((value / max) * 7)) : 0;
    const isFilled = dayIndex >= 7 - filled;
    const title =
      view === "weekly"
        ? `Week of ${format(week.start, "MMM d, yyyy")}`
        : `Total by ${format(min([week.days[6].date, range.to, new Date()]), "MMM d, yyyy")}`;

    return (
      <div
        key={dayIndex}
        className={cn("aspect-square rounded-[3px] transition-colors", isFilled ? LEVEL_CLASSES[levelFor(value, max)] : LEVEL_CLASSES[0])}
        onMouseEnter={isFilled ? (e) => showTip(e, title, `${formatTokens(value)} tokens`) : undefined}
        onMouseLeave={() => setTip(null)}
      />
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold">Token activity</h3>
        <div className="flex items-center gap-4">
          {(["daily", "weekly", "cumulative"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "text-sm capitalize transition-colors",
                view === v ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
          <NikhilDateCalendar
            iconOnly
            value={range}
            popDirection="down"
            className="h-8 w-8 p-0 justify-center"
            onChange={(d) => {
              if (!d?.from) return;
              setRange({ from: d.from, to: d.to || new Date() });
            }}
          />
        </div>
      </div>

      <div ref={boxRef} className="relative" onMouseLeave={() => setTip(null)}>
        <div className={cn("w-full", isLoading && "animate-pulse")}>
          <div className="grid" style={{ gap: GAP, gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
            {weeks.map((_, wi) => (
              <div key={wi} className="grid grid-rows-7" style={{ gap: GAP }}>
                {Array.from({ length: 7 }, (_, di) => renderCell(wi, di))}
              </div>
            ))}
          </div>

          <div className="relative h-5 mt-2 text-xs text-muted-foreground">
            {monthLabels.map(({ index, label }) => {
              const nearEnd = index >= weeks.length - 2;
              return (
                <span
                  key={`${label}-${index}`}
                  className="absolute top-0 whitespace-nowrap"
                  style={nearEnd ? { right: 0 } : { left: `${(index / weeks.length) * 100}%` }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {tip && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg whitespace-nowrap"
            style={{ left: tip.x, top: tip.y - 6 }}
          >
            <div>{tip.title}</div>
            <div>{tip.value}</div>
          </div>
        )}
      </div>
    </div>
  );
}
