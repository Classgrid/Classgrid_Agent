// Failed payments for Classgrid AI: the card shell every section uses, copied from the plans page
// (PlanConfigPanel): a small icon square, a title, a one-line note, then the content. InfoRow is a label on the left
// and its value on the right; on a phone the value drops under the label so nothing is pushed off the screen.
import React from "react";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  icon: React.ElementType;
  title: string;
  note?: string;
  className?: string;
  iconClassName?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
};

export function SectionCard({ icon: Icon, title, note, className, iconClassName, right, children }: SectionCardProps) {
  return (
    <section className={cn("bg-card border border-border rounded-xl shadow-sm p-5 min-w-0", className)}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className={cn("w-4 h-4 text-foreground", iconClassName)} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {note ? <p className="text-xs text-muted-foreground mt-0.5">{note}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function InfoRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 py-2 border-b border-border last:border-b-0 text-sm",
        className,
      )}
    >
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium min-w-0 break-words sm:text-right">{children}</span>
    </div>
  );
}
