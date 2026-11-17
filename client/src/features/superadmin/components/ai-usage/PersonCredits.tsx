// Plans & Usage, one person: their credits (owner, 2026-11-17). Top-up credits they bought and credits given by hand,
// both used after the plan's limits. Closed at first, because plans come first now; opening it lists the credits
// given by hand with View, Extend, Pause and Remove, and "Give credits" opens the credit panel for this one person.
//
// The old "Granted By" column is gone: it showed the super admin looking at the page, not the giver, and the giver of
// a grant is not stored. The old "Payment Summary" is gone too: the History section lists every payment.
import { useState } from "react";
import { ChevronDown, Coins } from "lucide-react";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/marketing_ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/marketing_ui/table";
import { dayText, n } from "@/features/shared/queries/usePlanOverview";
import { GrantCreditsModal } from "@/features/superadmin/components/GrantCredits";
import type { CreditEvent, UserDetail } from "@/features/superadmin/queries/useAiUsage";
import { ViewGrantedCreditsDetails } from "./ViewGrantedCreditsDetails";
import { ExtendUserGrantedCredits } from "./ExtendUserGrantedCredits";
import { PauseUserGrantedCredits } from "./PauseUserGrantedCredits";
import { RemoveUserGrantedCredits } from "./RemoveUserGrantedCredits";
import { SectionTitle } from "./Section";

type GrantStatus = { label: "Active" | "Paused" | "Removed" | "Ended" | "Used up"; variant: "neutral" | "warning" | "danger"; old: string };

const isGrant = (h: CreditEvent) => h.type === "grant" || h.type === "granted";
const endOf = (row: CreditEvent, detail: UserDetail) => (row.metadata?.endDate as string | undefined) || detail.ai_tokens?.promotion_credits_end_date || null;

/** Each grant's state. Given credits are spent oldest first, so a grant is used up once the credits spent cover it
 * and every older grant that is still active. (old: the word ViewGrantedCreditsDetails expects) */
function grantStatuses(detail: UserDetail) {
  const grants = (detail.promotionHistory || []).filter(isGrant);
  const active = grants
    .filter((g) => ["success", "pending", "active"].includes((g.status || "").toLowerCase()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalActive = active.reduce((s, g) => s + (g.credits_added || 0), 0);
  let spent = Math.max(0, totalActive - (detail.ai_tokens?.promotion_credits_balance || 0));
  const usedUp = new Set<string>();
  for (const g of active) {
    const amount = g.credits_added || 0;
    if (spent >= amount) { usedUp.add(String(g.id)); spent -= amount; } else spent = 0;
  }
  const map = new Map<string, GrantStatus>();
  for (const g of grants) {
    const s = (g.status || "").toLowerCase();
    const end = endOf(g, detail);
    let st: GrantStatus = { label: "Active", variant: "neutral", old: "ACTIVE" };
    if (s === "revoked") st = { label: "Removed", variant: "danger", old: "REVOKED" };
    else if (s === "paused") st = { label: "Paused", variant: "warning", old: "PAUSED" };
    else if (s === "expired" || (end && new Date(end).getTime() < Date.now())) st = { label: "Ended", variant: "neutral", old: "EXPIRED" };
    else if (usedUp.has(String(g.id))) st = { label: "Used up", variant: "neutral", old: "ACTIVE" };
    map.set(String(g.id), st);
  }
  return { grants, map };
}

function GrantActions({ row, detail, status }: { row: CreditEvent; detail: UserDetail; status: GrantStatus }) {
  const id = String(row.id);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ViewGrantedCreditsDetails used={0} limit={row.credits_added || 0} history={detail.promotionHistory || []} status={status.old} transactionId={id} />
      {status.label !== "Removed" && (
        <>
          <ExtendUserGrantedCredits userId={detail.id} currentExpiry={endOf(row, detail)} />
          <PauseUserGrantedCredits userId={detail.id} transactionId={id} isPaused={status.label === "Paused"} />
          <RemoveUserGrantedCredits userId={detail.id} transactionId={id} />
        </>
      )}
    </div>
  );
}

export function PersonCredits({ detail }: { detail: UserDetail }) {
  const [open, setOpen] = useState(false);
  const [giving, setGiving] = useState(false);
  const { grants, map } = grantStatuses(detail);
  const statusOf = (row: CreditEvent) => map.get(String(row.id)) || { label: "Active", variant: "neutral", old: "ACTIVE" } as GrantStatus;

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-5 min-w-0">
      <Collapsible open={open} onOpenChange={(next) => setOpen(next)}>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle
            icon={Coins}
            title="Credits"
            note={`Top-up credits left: ${n(detail.balance || 0)} · Given credits left: ${n(detail.ai_tokens?.promotion_credits_balance || 0)}`}
          />
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="shrink-0 font-medium" aria-label={open ? "Hide credits" : "Show credits"}>
              {open ? "Hide" : "Show"}
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Top-ups they bought and credits given by hand. They are used after the plan's limits.</p>

            {grants.length > 0 && (
              <>
                {/* sm and up: a table */}
                <div className="hidden sm:block overflow-x-auto rounded-md border border-border">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Given on</TableHead><TableHead>Ends</TableHead><TableHead className="text-right">Credits</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grants.map((g) => {
                        const st = statusOf(g);
                        return (
                          <TableRow key={String(g.id)}>
                            <TableCell className="whitespace-nowrap">{dayText(g.date)}</TableCell>
                            <TableCell className="whitespace-nowrap">{dayText(endOf(g, detail)) || "No end date"}</TableCell>
                            <TableCell className="text-right tabular-nums">{n(g.credits_added || 0)}</TableCell>
                            <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                            <TableCell><GrantActions row={g} detail={detail} status={st} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Phone: one block per grant */}
                <div className="sm:hidden rounded-md border border-border divide-y divide-border">
                  {grants.map((g) => {
                    const st = statusOf(g);
                    return (
                      <div key={String(g.id)} className="p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground tabular-nums">{n(g.credits_added || 0)} credits</span>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">Given on {dayText(g.date)} · Ends {dayText(endOf(g, detail)) || "no end date"}</div>
                        <GrantActions row={g} detail={detail} status={st} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div>
              <Button type="button" variant="outline" size="sm" className="font-medium" onClick={() => setGiving(true)}>
                <Coins className="w-4 h-4 mr-2" />Give credits
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <GrantCreditsModal
        isOpen={giving}
        onClose={() => setGiving(false)}
        initialMode="credits"
        orgs={[{ id: detail.id, name: detail.name || detail.email, orgName: "", email: detail.email, role: "", avatar: detail.photo || detail.profilePicture || undefined }]}
      />
    </section>
  );
}
