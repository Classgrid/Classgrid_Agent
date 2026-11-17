// What a super admin can do to an account (owner, 2026-11-17: "instead of ban, block; delete account; block for a few
// days or a time"; suspended is the same as blocked): block it for 1, 7 or 30 days, until a date or until unblocked;
// unblock it; log it out everywhere; send a password reset email; or delete the account and its data. The person gets
// an email when they are blocked, unblocked or deleted. Each one asks first; blocking yourself or a Super Admin, and
// every delete, ask for the email to be typed. Under the buttons is the list of the last things admins did to it.
// No "Change role" here (owner, 2026-11-17: one click could make anyone a super admin); admin roles are given on the
// Platform Team page.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Label } from "@/components/marketing_ui/label";
import { Textarea } from "@/components/marketing_ui/textarea";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { SectionCard } from "./SectionCard";
import { usePersonAction, useDeletePerson } from "./api";
import { dateText, dateTimeText, isBanned, planIdLabel, roleLabel } from "./format";
import type { AdminLogItem, PersonOverview } from "./types";

const REASON_MAX = 300;

type Confirm = "block" | "unblock" | "logout" | "reset" | "delete" | null;

// How long a block lasts
const LENGTHS = [
  { key: "1", label: "1 day", days: 1 },
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "date", label: "Until a date", days: 0 },
  { key: "forever", label: "Until I unblock", days: 0 },
] as const;
type LengthKey = (typeof LENGTHS)[number]["key"];

function logText(item: AdminLogItem): { text: string; extra?: string } {
  switch (item.action) {
    case "ban": return { text: "Blocked", extra: item.detail || undefined };
    case "unban": return { text: "Unblocked" };
    case "force_logout": return { text: "Logged out everywhere" };
    case "reset_password": return { text: "Password reset email sent" };
    case "role_change": return { text: `Role changed to ${roleLabel(item.detail)}` };
    case "plan_gift": return { text: item.detail ? `Gifted ${planIdLabel(item.detail)}` : "Gifted a plan" };
    case "plan_end": return { text: "Moved back to Free" };
    default: return { text: String(item.action) };
  }
}

const dayAfter = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 0, 0); return x; };

export function ActionsCard({ overview }: { overview: PersonOverview }) {
  const navigate = useNavigate();
  const { person, isSelf, adminLog } = overview;
  const userId = person._id;
  const name = person.name || person.email;
  const action = usePersonAction(userId);
  const remove = useDeletePerson(userId);
  const busy = action.isPending || remove.isPending;

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [reason, setReason] = useState("");
  const [length, setLength] = useState<LengthKey>("7");
  const [untilDay, setUntilDay] = useState<Date | undefined>();
  const [tried, setTried] = useState(false);

  const erased = person.status === "deleted";
  const blocked = isBanned(person.status);
  const close = () => setConfirm(null);
  const protectedAccount = isSelf || person.role === "super_admin" || person.role === "co_super_admin";

  // Blocking yourself or a Super Admin needs the email typed first
  const blockExtra = isSelf ? "This is your own account. You'll be locked out at once." : person.role === "super_admin" ? "This is a Super Admin account." : null;

  const choice = LENGTHS.find((l) => l.key === length) || LENGTHS[1];
  const untilOk = length !== "date" || (!!untilDay && dayAfter(untilDay) > new Date());
  const endText = choice.days
    ? `for ${choice.label}, until ${dateTimeText(new Date(Date.now() + choice.days * 86400000).toISOString())}`
    : length === "date" ? (untilDay ? `until ${dateText(dayAfter(untilDay).toISOString())}` : "until the date you pick") : "until you unblock them";

  const doBlock = () => {
    setTried(true);
    if (!untilOk) return;
    const when = choice.days ? { days: choice.days } : length === "date" && untilDay ? { until: dayAfter(untilDay).toISOString() } : {};
    action.mutate({ type: "ban", reason, ...when }, { onSuccess: close });
  };

  return (
    <SectionCard icon={ShieldAlert} title="Actions" note="Each one asks you to confirm first. The person gets an email when they're blocked, unblocked or deleted.">
      <div className="flex flex-wrap gap-2">
        {!erased && (blocked ? (
          <Button variant="outline" size="sm" onClick={() => setConfirm("unblock")}>Unblock</Button>
        ) : (
          <Button variant="destructive" size="sm" onClick={() => { setReason(""); setLength("7"); setUntilDay(undefined); setTried(false); setConfirm("block"); }}>Block</Button>
        ))}
        {!erased && <Button variant="outline" size="sm" onClick={() => setConfirm("logout")}>Log out everywhere</Button>}
        {!erased && <Button variant="outline" size="sm" onClick={() => setConfirm("reset")}>Send password reset email</Button>}
        {!erased && !protectedAccount && <Button variant="destructive" size="sm" onClick={() => setConfirm("delete")}>Delete account</Button>}
      </div>
      {erased && <p className="text-sm text-muted-foreground mt-3">This account was deleted.</p>}
      {!erased && protectedAccount && <p className="text-xs text-muted-foreground mt-3">An admin account can&apos;t be deleted from here.</p>}

      {adminLog?.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-foreground">Recent admin actions</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {adminLog.map((item, i) => {
              const { text, extra } = logText(item);
              return (
                <li key={`${item.at}-${i}`} className="text-sm text-foreground break-words">
                  {text}
                  {extra && <span className="text-muted-foreground">{` (${extra})`}</span>}
                  <span className="text-muted-foreground">{` · ${item.by} · ${dateTimeText(item.at)}`}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Block */}
      <DangerConfirmDialog
        open={confirm === "block"}
        onOpenChange={(o) => { if (!o) close(); }}
        variant="danger"
        title={`Block ${name}?`}
        description={blockExtra
          ? <>They&apos;re signed out at once and can&apos;t use Classgrid {endText}.<span className="block mt-2 font-medium text-foreground">{blockExtra}</span></>
          : `They're signed out at once and can't use Classgrid ${endText}.`}
        confirmationSteps={isSelf || person.role === "super_admin" ? [{ label: "To confirm, type", value: person.email }] : []}
        warningMessage="They get an email saying their account is blocked and until when."
        actionLabel="Block"
        isLoading={busy}
        onConfirm={doBlock}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm text-foreground">How long</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How long">
              {LENGTHS.map((l) => (
                <Button key={l.key} type="button" size="sm" role="radio" aria-checked={l.key === length} disabled={busy}
                  variant={l.key === length ? "default" : "outline"} onClick={() => setLength(l.key)} className="h-9 px-3 font-medium">
                  {l.label}
                </Button>
              ))}
            </div>
            {length === "date" && (
              <div className={`max-w-[240px] ${busy ? "pointer-events-none opacity-60" : ""}`}>
                <NikhilTimeCalendar value={untilDay} onChange={setUntilDay} showTime={false} placeholder="Blocked until" className="w-full h-9 border border-input bg-background" />
              </div>
            )}
            {tried && !untilOk && <p className="text-xs text-red-500">Pick a day after today.</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="block-reason" className="text-sm text-foreground">Reason (only admins see it)</Label>
            {/* (Enter makes a new line here instead of pressing Block) */}
            <Textarea id="block-reason" value={reason} maxLength={REASON_MAX} disabled={busy}
              onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
              onKeyDown={(e) => { if (e.key === "Enter") e.stopPropagation(); }}
              className="min-h-[80px]" />
            <span className="text-xs text-muted-foreground self-end">{reason.length}/{REASON_MAX}</span>
          </div>
        </div>
      </DangerConfirmDialog>

      {/* Unblock */}
      <DangerConfirmDialog
        open={confirm === "unblock"}
        onOpenChange={(o) => { if (!o) close(); }}
        variant="warning"
        title={`Unblock ${name}?`}
        description="They can sign in and use Classgrid again. They get an email saying so."
        warningMessage="Their plan, chats and settings are as they were."
        actionLabel="Unblock"
        isLoading={busy}
        onConfirm={() => action.mutate({ type: "unban" }, { onSuccess: close })}
      />

      {/* Log out everywhere */}
      <DangerConfirmDialog
        open={confirm === "logout"}
        onOpenChange={(o) => { if (!o) close(); }}
        variant="warning"
        title={`Log ${name} out everywhere?`}
        description={`Every browser, the desktop app and the phone app are signed out. They can sign in again straight away.${isSelf ? " This includes you, here." : ""}`}
        warningMessage="Use this if someone else may be using their account."
        actionLabel="Log out everywhere"
        isLoading={busy}
        onConfirm={() => action.mutate({ type: "force_logout" }, { onSuccess: close })}
      />

      {/* Password reset email */}
      <DangerConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(o) => { if (!o) close(); }}
        variant="warning"
        title="Send a password reset email?"
        description={`We'll email ${person.email} a link to set a new password. The link works for 1 hour.`}
        warningMessage="Their current password keeps working until they set a new one."
        actionLabel="Send email"
        isLoading={busy}
        onConfirm={() => action.mutate({ type: "reset_password" }, { onSuccess: close })}
      />

      {/* Delete account: the same full delete as GDPR & Privacy (the account, chats, files, projects, payments data) */}
      <DangerConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => { if (!o) close(); }}
        variant="danger"
        title={`Delete ${name}'s account?`}
        description="The account and everything in it are deleted for good: chats, files, projects, live docs, pages, skills and settings. This can't be undone."
        confirmationSteps={[{ label: "To confirm, type", value: person.email }]}
        warningMessage="They get an email saying their account was deleted."
        actionLabel="Delete account"
        isLoading={busy}
        onConfirm={() => remove.mutate(person.email, { onSuccess: (data) => { close(); if (!data?.failedParts?.length) navigate("/superadmin/global-users"); } })}
      />
    </SectionCard>
  );
}
