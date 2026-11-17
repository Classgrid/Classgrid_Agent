// A label and its value. On phones the value sits under the label; from small screens up they share a line.
import React from "react";

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_minmax(0,1fr)] gap-0.5 sm:gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words min-w-0">{children}</dd>
    </div>
  );
}

// The rows of one card, with a thin line between them
export function InfoList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-border">{children}</dl>;
}
