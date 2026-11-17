// What a super admin can do to an account: ban or unban it, log it out everywhere, send a password reset email, or
// change its role. Each one asks first. Nothing is refused (the owner's rule is no blocks): banning yourself or a
// Super Admin, or giving or changing an admin role, asks for the email to be typed instead, so it can't happen by
// a slip of the mouse. Under the buttons is the list of the last things admins did to this account.
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Label } from "@/components/marketing_ui/label";
import { Textarea } from "@/components/marketing_ui/textarea";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { SectionCard } from "./SectionCard";
import { usePersonAction } from "./api";
import { dateTimeText, isBanned, planIdLabel, roleLabel } from "./format";
import type { AdminLogItem, PersonOverview } from "./types";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "co_super_admin", label: "Co-Super Admin" },
  { value: "super_admin", label: "Super Admin" },
];
const ADMIN_ROLES = ["super_admin", "co_super_admin"];
const REASON_MAX = 300;

type Confirm = "ban" | "unban" | "logout" | "reset" | null;

function logText(item: AdminLogItem): { text: string; extra?: string } {
  switch (item.action) {
    case "ban": return { text: "Banned", extra: item.detail || undefined };
    case "unban": return { text: "Unbanned" };
    case "force_logout": return { text: "Logged out everywhere" };
    case "reset_password": return { text: "Password reset email sent" };
    case "role_change": return { text: `Role changed to ${roleLabel(item.detail)}` };
    case "plan_gift": return { text: item.detail ? `Gifted ${planIdLabel(item.detail)}` : "Gifted a plan" };
    case "plan_end": return { text: "Moved back to Free" };
    default: return { text: String(item.action) };
  }
}

export function ActionsCard({ overview }: { overview: PersonOverview }) {
  const { person, isSelf, adminLog } = overview;
  const userId = person._id;
  const name = person.name || person.email;
  const action = usePersonAction(userId);
  const busy = action.isPending;

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [reason, setReason] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState(person.role);
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);

  const erased = person.status === "deleted";
  const banned = isBanned(person.status);
  const close = () => setConfirm(null);

  // Banning yourself or a Super Admin needs the email typed first
  const guardedBan = isSelf || person.role === "super_admin";
  const banExtra = isSelf ? "This is your own account. You'll be locked out at once." : person.role === "super_admin" ? "This is a Super Admin account." : null;

  const openRoleDialog = () => { setNewRole(person.role); setRoleOpen(true); };
  const newRoleLabel = roleLabel(newRole);
  const roleNeedsTyping = ADMIN_ROLES.includes(newRole) || isSelf;
  const saveRole = () => action.mutate({ type: "role", role: newRole }, { onSuccess: () => { setRoleOpen(false); setRoleConfirmOpen(false); } });
  const currentIsListed = ROLE_OPTIONS.some((o) => o.value === person.role);

  return (
    <SectionCard icon={ShieldAlert} title="Actions" note="Each one asks you to confirm first." className="lg:col-span-2">
      <div className="flex flex-wrap gap-2">
        {!erased && (banned ? (
          <Button variant="outline" size="sm" onClick={() => setConfirm("unban")}>Unban</Button>
        ) : (
          <Button variant="destructive" size="sm" onClick={() => { setReason(""); setConfirm("ban"); }}>Ban</Button>
        ))}
        {!erased && <Button variant="outline" size="sm" onClick={() => setConfirm("logout")}>Log out everywhere</Button>}
        {!erased && <Button variant="outline" size="sm" onClick={() => setConfirm("reset")}>Send password reset email</Button>}
        <Button variant="outline" size="sm" onClick={openRoleDialog}>Change role</Button>
      </div>
      {erased && <p className="text-sm text-muted-foreground mt-3">This account was erased.</p>}

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

      {/* Ban */}
      <DangerConfirmDialog
        open={confirm === "ban"}
        onOpenChange={(o) => { if (!o) close(); }}
        variant="danger"
        title={`Ban ${name}?`}
        description={banExtra
          ? <>They&apos;re signed out at once and can&apos;t use Classgrid until you unban them.<span className="block mt-2 font-medium text-foreground">{banExtra}</span></>
          : "They're signed out at once and can't use Classgrid until you unban them."}
        confirmationSteps={guardedBan ? [{ label: "To confirm, type", value: person.email }] : []}
        warningMessage="When they try to use Classgrid they'll see that their account is not active."
        actionLabel="Ban"
        isLoading={busy}
        onConfirm={() => action.mutate({ type: "ban", reason }, { onSuccess: close })}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="ban-reason" className="text-sm text-foreground">Reason (only admins see it)</Label>
          {/* (Enter makes a new line here instead of pressing Ban) */}
          <Textarea id="ban-reason" value={reason} maxLength={REASON_MAX} disabled={busy}
            onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
            onKeyDown={(e) => { if (e.key === "Enter") e.stopPropagation(); }}
            className="min-h-[80px]" />
          <span className="text-xs text-muted-foreground self-end">{reason.length}/{REASON_MAX}</span>
        </div>
      </DangerConfirmDialog>

      {/* Unban */}
      <DangerConfirmDialog
        open={confirm === "unban"}
        onOpenChange={(o) => { if (!o) close(); }}
        variant="warning"
        title={`Unban ${name}?`}
        description="They can sign in and use Classgrid again."
        warningMessage="Their plan, chats and settings are as they were."
        actionLabel="Unban"
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

      {/* Change role: pick the role, then (for an admin role or your own account) type the email to confirm */}
      <Dialog open={roleOpen} onOpenChange={(o) => { if (!busy) setRoleOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">Change role</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <ResponsiveSelect aria-label="Role" value={newRole} disabled={busy}
              onChange={(e) => setNewRole(String(e.target.value))}>
              {/* (their current role when it is none of the three choices; "(now)" because an old "student" account
                  also reads "User", and the wide-screen dropdown can't grey an entry out) */}
              {!currentIsListed && <option value={person.role} disabled>{`${roleLabel(person.role)} (now)`}</option>}
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </ResponsiveSelect>
            <p className="text-xs text-muted-foreground">Super Admin and Co-Super Admin can open this dashboard and change anything in it.</p>
          </div>
          <DialogFooter>
            <Button size="sm" disabled={busy || newRole === person.role}
              onClick={() => {
                if (roleNeedsTyping) { setRoleOpen(false); setRoleConfirmOpen(true); }
                else saveRole();
              }}>
              Change role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DangerConfirmDialog
        open={roleConfirmOpen}
        onOpenChange={(o) => { if (!o && !busy) setRoleConfirmOpen(false); }}
        variant="danger"
        title={isSelf ? "Change your own role?" : `Make ${name} ${newRoleLabel}?`}
        confirmationSteps={[{ label: "To confirm, type", value: person.email }]}
        warningMessage={isSelf ? "You may lose access to this dashboard." : "They get full access to this dashboard."}
        actionLabel="Change role"
        isLoading={busy}
        onConfirm={saveRole}
      />
    </SectionCard>
  );
}
