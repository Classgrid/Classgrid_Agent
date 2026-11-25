// Plans & Usage, one person: AI access (owner, 2026-11-17). Block or unblock all of their AI, or clear what their
// current session used (credits and pictures back to 0; the week, Claude and Fable counts stay). Both need the super
// admin's security code: the code is emailed first (security-code/request), then checked (security-code/verify), and
// only then is the change made. Replaces BlockUserAiUsage and ResetUserDailyLimit on this page (those files stay for
// other pages).
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Label } from "@/components/marketing_ui/label";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { useClearSessionUse, useRequestSecurityCode, useSetAiBlocked, useVerifySecurityCode } from "@/features/superadmin/queries/useAiUsage";
import { Section } from "./Section";
import { CODE_TTL_MINUTES } from "@/lib/codeLifetime";
import { errorText } from "./planText";

type Action = "block" | "unblock" | "clear";

export function PersonAccess({ userId, name, isBlocked }: { userId: string; name: string; isBlocked: boolean }) {
  const [action, setAction] = useState<Action | null>(null);
  const [code, setCode] = useState("");
  const requestCode = useRequestSecurityCode();
  const verifyCode = useVerifySecurityCode();
  const setBlocked = useSetAiBlocked();
  const clearSession = useClearSessionUse();

  // The server checks the code against the action it was sent for, so block and clear ask for different codes
  const serverAction = (a: Action) => (a === "clear" ? "RESET_USER_USAGE" : "BLOCK_USER_AI");

  const start = async (a: Action) => {
    try {
      await requestCode.mutateAsync({ action: serverAction(a) });
      setCode("");
      setAction(a);
    } catch {
      // (useRequestSecurityCode already shows why the code could not be sent)
    }
  };

  const confirm = async () => {
    if (!action) return;
    try {
      await verifyCode.mutateAsync({ code: code.trim(), action: serverAction(action) });
    } catch {
      return; // (useVerifySecurityCode already says the code is wrong or old)
    }
    try {
      if (action === "clear") {
        await clearSession.mutateAsync(userId);
        toast.success(`Session use cleared for ${name}`);
      } else {
        await setBlocked.mutateAsync({ userId, isBlocked: action === "block" });
        toast.success(action === "block" ? `AI blocked for ${name}` : `AI unblocked for ${name}`);
      }
      setAction(null);
      setCode("");
    } catch (e) {
      toast.error(errorText(e, "Could not save. Try again."));
    }
  };

  const busy = verifyCode.isPending || setBlocked.isPending || clearSession.isPending;
  const dialog = action === "block"
    ? { title: `Block AI for ${name}?`, warning: `${name} can't use any AI until you unblock them.`, label: "Block AI", variant: "danger" as const }
    : action === "unblock"
      ? { title: `Unblock AI for ${name}?`, warning: `${name} can use AI again.`, label: "Unblock AI", variant: "warning" as const }
      : { title: `Clear session use for ${name}?`, warning: "Their session credits and pictures used go back to 0.", label: "Clear", variant: "warning" as const };

  return (
    <Section icon={ShieldCheck} title="AI access">
      <div className="flex flex-col gap-4">
        <p className={`text-sm font-medium ${isBlocked ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
          {isBlocked ? "Blocked from AI" : "Can use AI"}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Button
            type="button"
            variant={isBlocked ? "outline" : "destructive"}
            size="sm"
            className="font-medium self-start"
            disabled={requestCode.isPending}
            onClick={() => start(isBlocked ? "unblock" : "block")}
          >
            {isBlocked ? "Unblock AI" : "Block AI"}
          </Button>
          <div className="flex flex-col gap-1.5 min-w-0">
            <Button type="button" variant="outline" size="sm" className="font-medium self-start" disabled={requestCode.isPending} onClick={() => start("clear")}>
              Clear session use
            </Button>
            <p className="text-xs text-muted-foreground">Sets the session's credits and pictures used back to 0. The week, Claude and Fable counts stay.</p>
          </div>
        </div>
      </div>

      <DangerConfirmDialog
        open={action !== null}
        onOpenChange={(open) => { if (!open && !busy) { setAction(null); setCode(""); } }}
        title={dialog.title}
        warningMessage={dialog.warning}
        actionLabel={dialog.label}
        variant={dialog.variant}
        isLoading={busy}
        isConfirmDisabled={code.trim().length !== 6}
        onConfirm={confirm}
      >
        <div className="flex flex-col gap-2 pt-2">
          <Label htmlFor="person-access-code" className="text-sm font-medium">Security code from your email</Label>
          <Input
            id="person-access-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            disabled={busy}
          />
          <p className="text-xs text-muted-foreground">The code works for {CODE_TTL_MINUTES} minutes.</p>
        </div>
      </DangerConfirmDialog>
    </Section>
  );
}
