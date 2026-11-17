// Privacy requests page: the two things a super admin can do for a person, said plainly before the list
// (owner, 2026-11-17: the old page spoke of anonymizing and foreign keys and he could not tell what it did)
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Download, Trash2 } from "lucide-react";

function ActionCard({ icon: Icon, title, note, children }: { icon: LucideIcon; title: string; note: string; children: ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-5 min-w-0">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-foreground" /></span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-sm text-foreground">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function PrivacyActionCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ActionCard icon={Download} title="Download a person's data" note="One file with everything Classgrid AI keeps about them.">
        <List
          items={[
            "Profile: name, emails, phone, photo, when they joined and last signed in",
            "Plan, credits and every payment",
            "List of chats: title, date and number of messages",
            "Files, saved songs and projects",
            "What the AI remembers about them and their AI settings",
          ]}
        />
        <p className="text-xs text-muted-foreground">Nothing is changed. Send the file to the person who asked for it.</p>
      </ActionCard>

      <ActionCard icon={Trash2} title="Delete a person's data" note="The same as when they delete their account in Settings.">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Removed</p>
          <List
            items={[
              "Their account and sign-in",
              "Chats and every message, shared chat links",
              "Files, saved songs and projects, and the stored files",
              "Memory, schedules, docs, pages and notifications",
            ]}
          />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Kept for the records</p>
          <List items={["Payments, invoices and credit records (the law asks us to keep them)"]} />
        </div>
        <p className="text-xs text-muted-foreground">It can&apos;t be undone. Super admin accounts are protected and can&apos;t be deleted.</p>
      </ActionCard>
    </div>
  );
}
