// The small pieces every Settings section is built from: a titled group with one card, a row (title, one grey line,
// a control on the right), the grey button, and the thin usage bar.
import React from "react";

export function Section({ title, desc, action, children }: { title: string; desc?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="rounded-xl border border-border bg-card">{children}</div>
    </section>
  );
}

export function Row({ title, desc, value, children }: { title: React.ReactNode; desc?: React.ReactNode; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4 border-b border-border last:border-b-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {desc && <span className="text-xs text-muted-foreground break-words">{desc}</span>}
      </div>
      {(value !== undefined || children) && (
        <div className="shrink-0 flex items-center gap-2 text-right">
          {value !== undefined && <span className="text-sm text-muted-foreground tabular-nums">{value}</span>}
          {children}
        </div>
      )}
    </div>
  );
}

export const btn = "h-8 px-3 rounded-lg text-[13px] font-medium bg-black/[0.05] dark:bg-white/[0.07] hover:bg-black/[0.08] dark:hover:bg-white/[0.11] text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center";
export const btnPrimary = "h-8 px-3 rounded-lg text-[13px] font-medium bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center";

/** A row with a thin bar under it: "used of limit", the bar, and the reset or period on the right */
export function MeterRow({ title, desc, used, limit, unit = "", right }: { title: string; desc?: string; used: number; limit: number | null; unit?: string; right?: string }) {
  const fmt = (v: number) => Math.round(v).toLocaleString("en-IN");
  const text = limit === 0 ? "Not included" : limit === null || limit < 0 ? `${fmt(used)}${unit ? ` ${unit}` : ""} used` : `${fmt(used)} of ${fmt(limit)}${unit ? ` ${unit}` : ""}`;
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="px-5 py-3.5 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-sm text-foreground tabular-nums whitespace-nowrap">{text}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden mt-2.5">
        {limit !== null && limit > 0 && <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-foreground/70"}`} style={{ width: `${pct}%` }} />}
      </div>
      {(desc || right) && (
        <div className="flex justify-between gap-4 text-xs text-muted-foreground mt-1.5">
          <span>{desc || ""}</span>
          <span>{right || ""}</span>
        </div>
      )}
    </div>
  );
}
