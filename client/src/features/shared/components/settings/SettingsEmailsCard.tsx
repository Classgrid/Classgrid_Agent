// Settings > Account > Emails (owner, 2026-11-15, like GitHub's): the account's main email and up to two more, each
// confirmed with a code. Signing in works with any of them and the same password; usage and limits are shared,
// because it is one account. At most one school email.
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { useAccountEmails, useRemoveAccountEmail } from "@/features/shared/queries/useAccountEmails";
import { AddEmailForm, btnGrey } from "./AddEmailForm";

const pill = (text: string, on = false) => (
  <span className={`inline-flex items-center h-[22px] px-2.5 rounded-full text-xs font-medium ${on ? "bg-emerald-500/15 text-emerald-500" : "bg-black/[0.06] dark:bg-white/[0.09] text-muted-foreground"}`}>{text}</span>
);

export function SettingsEmailsCard() {
  const { data, isLoading } = useAccountEmails();
  const remove = useRemoveAccountEmail();
  const [adding, setAdding] = useState(false);
  const count = data ? 1 + data.emails.length : 1;
  const full = !!data && count >= data.max;

  const drop = async (email: string) => {
    try { await remove.mutateAsync(email); toast.success(`${email} is removed from your account`); }
    catch (e: any) { toast.error(e?.response?.data?.error || "Couldn't remove the email. Please try again."); }
  };

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden mt-2 shadow-sm">
        <div className="p-6 bg-card flex flex-col gap-1.5">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">Emails</h3>
          <p className="text-sm text-muted-foreground">
            Add up to {data?.max ?? 3} emails, for example your school email. You can sign in with any of them and the same password. Your usage and limits stay the same: it is one account.
          </p>
        </div>
        <div className="bg-card border-t border-border divide-y divide-border">
          {isLoading || !data ? (
            <div className="px-6 py-4"><Skeleton className="h-4 w-64 rounded" /></div>
          ) : (
            <>
              <div className="px-6 py-3.5 flex items-center gap-3">
                <span className="text-[15px] text-foreground truncate">{data.primary.email}</span>
                {pill("Main")}
                {data.primary.school && pill("School", true)}
              </div>
              {data.emails.map((e) => (
                <div key={e.email} className="px-6 py-3.5 flex items-center gap-3">
                  <span className="text-[15px] text-foreground truncate">{e.email}</span>
                  {e.school && pill("School", true)}
                  <button type="button" className={`${btnGrey} ml-auto`} disabled={remove.isPending} onClick={() => drop(e.email)}>Remove</button>
                </div>
              ))}
            </>
          )}
        </div>
        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{data ? `${count} of ${data.max} emails` : ""}</span>
          <button type="button" className={btnGrey} disabled={full || !data} title={full ? "Remove an email to add another" : undefined} onClick={() => setAdding(true)}>Add email</button>
        </div>
      </div>

      <Dialog open={adding} onOpenChange={(o) => { if (!o) setAdding(false); }}>
        <DialogContent className="sm:max-w-[440px] p-6" overlayClassName="supports-backdrop-filter:backdrop-blur-none !backdrop-blur-none !bg-black/40">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add an email</DialogTitle>
            <DialogDescription>We send a 6-digit code to the email. Once you enter it, you can sign in with that email too.</DialogDescription>
          </DialogHeader>
          <AddEmailForm onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
