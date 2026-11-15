// Adding an email to the account: the email, then the 6-digit code sent to it (Settings > Account > Emails, and the
// school email step of the student application). The server checks everything again.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccountEmails, useAddAccountEmail, useConfirmAccountEmail } from "@/features/shared/queries/useAccountEmails";

export const btn = "inline-flex items-center h-8 px-3.5 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-default";
export const btnGrey = `${btn} bg-black/[0.06] dark:bg-white/[0.09] text-foreground hover:bg-black/[0.1] dark:hover:bg-white/[0.14]`;
export const btnWhite = `${btn} bg-foreground text-background hover:bg-foreground/90`;
export const field = "flex items-center h-11 px-3.5 rounded-[10px] border border-border bg-background text-base gap-1.5 focus-within:border-[#7aa7ff]";
export const input = "flex-1 min-w-0 bg-transparent outline-none text-foreground text-base";

/** Whether the email is at the domain or under it ("cse.iitb.ac.in" is under "iitb.ac.in") */
export const inDomain = (email: string, domain: string) => {
  const host = (email.split("@")[1] || "").toLowerCase();
  const d = domain.toLowerCase();
  return !!host && !!d && (d.startsWith(".") ? host.endsWith(d) : host === d || host.endsWith(`.${d}`));
};

export function AddEmailForm({ requiredDomains, onAdded, onCancel }: { requiredDomains?: string[]; onAdded?: (email: string) => void; onCancel?: () => void }) {
  const { data } = useAccountEmails();
  const add = useAddAccountEmail();
  const confirm = useConfirmAccountEmail();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [err, setErr] = useState("");
  const needs = (requiredDomains || []).filter(Boolean);

  // A code already sent (in the last 15 minutes) goes straight to the code step
  useEffect(() => {
    if (data?.pending_email && step === "email" && !email) {
      if (!needs.length || needs.some((d) => inDomain(data.pending_email!, d))) { setEmail(data.pending_email); setStep("code"); }
    }
  }, [data?.pending_email]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const e = email.trim().toLowerCase();
    setErr("");
    if (needs.length && !needs.some((d) => inDomain(e, d))) { setErr(`Use your school email ending in ${needs.join(" or ")}.`); return; }
    try { await add.mutateAsync(e); setEmail(e); setCode(""); setStep("code"); toast.success(`Code sent to ${e}`); }
    catch (x: any) { setErr(x?.response?.data?.error || "Couldn't send the code. Please try again."); }
  };
  const check = async () => {
    setErr("");
    try {
      await confirm.mutateAsync(code.trim());
      toast.success(`${email} is added to your account`);
      const added = email;
      setEmail(""); setCode(""); setStep("email");
      onAdded?.(added);
    } catch (x: any) { setErr(x?.response?.data?.error || "Couldn't confirm the code. Please try again."); }
  };

  return (
    <div>
      {step === "email" ? (
        <>
          <div className="text-[13px] font-medium">{needs.length ? "School email" : "Email"}</div>
          <div className={`${field} mt-2`}>
            <input data-no-ring="true" className={input} type="email" autoComplete="email" placeholder={needs.length ? `you@${(needs[0] || "").replace(/^\./, "college")}` : "you@example.com"} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) send(); }} autoFocus />
          </div>
        </>
      ) : (
        <>
          <div className="text-[13px] font-medium">Code sent to {email}</div>
          <div className={`${field} mt-2`}>
            <input data-no-ring="true" className={`${input} tracking-[0.3em]`} inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) check(); }} autoFocus />
          </div>
          <button type="button" className="text-xs text-muted-foreground underline mt-2 cursor-pointer" onClick={() => { setStep("email"); setErr(""); }}>Use another email or send a new code</button>
        </>
      )}
      <div className="text-xs text-red-500 min-h-[16px] mt-1.5">{err}</div>
      <div className="flex justify-end gap-2 mt-1">
        {onCancel && <button type="button" className={btnGrey} onClick={onCancel}>Cancel</button>}
        {step === "email"
          ? <button type="button" className={btnWhite} disabled={!email.trim() || add.isPending} onClick={send}>{add.isPending ? "Sending" : "Send code"}</button>
          : <button type="button" className={btnWhite} disabled={code.length !== 6 || confirm.isPending} onClick={check}>{confirm.isPending ? "Checking" : "Add email"}</button>}
      </div>
    </div>
  );
}
