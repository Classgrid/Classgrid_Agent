// One section card of the Plans & Usage page, in the look of Plans & Billing (PlanConfigPanel): a small icon square,
// the title, a one-line note, and room on the right for a badge or a button. Kept in one place so every section of
// the list and of a person's page looks the same.
import type { ElementType, ReactNode } from "react";

export function SectionTitle({ icon: Icon, title, note, badge }: { icon: ElementType; title: string; note?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-foreground" /></span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {badge}
        </div>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}

export function Section({ id, icon, title, note, badge, right, children, className = "" }: {
  id?: string; icon: ElementType; title: string; note?: ReactNode; badge?: ReactNode; right?: ReactNode; children?: ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`bg-card border border-border rounded-xl shadow-sm p-5 min-w-0 scroll-mt-20 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SectionTitle icon={icon} title={title} note={note} badge={badge} />
        {right && <div className="flex flex-wrap items-center gap-2 shrink-0">{right}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
