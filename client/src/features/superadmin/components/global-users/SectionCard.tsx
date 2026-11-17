// One card on the person page, in the same look as the Plans & Billing page: a small icon square, a title, one
// plain line under it, and an optional button on the right.
import React from "react";

export function SectionCard({ icon: Icon, title, note, action, children, className = "" }: {
  icon: React.ElementType;
  title: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-card border border-border rounded-xl shadow-sm p-5 min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-foreground" /></span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
