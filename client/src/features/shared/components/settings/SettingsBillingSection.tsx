// Settings > Billing (owner, 2026-11-14, built from the HTML page he approved, laid out like Grok's Billing &
// invoices): two tiles on top (Current plan with Upgrade; Additional usage with Auto top-up and Buy credits), then
// Payment details; an Invoices tab with every payment, grant and top-up. Upgrade and Buy credits live only here.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Switch } from "@/components/marketing_ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { useMyAiHistory, useInitiateAiTopUp } from "@/components/ai/queries/useAiCredits";
import { openCheckout, startPlanPayment } from "@/components/ai/components/credits/planPayment";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { usePlanOverview, useAutoTopup, useSaveAutoTopup, useStudent, useStartStudent, useConfirmStudent, n, inr, dayText, type AutoTopup, type StudentState } from "@/features/shared/queries/usePlanOverview";

const PRICING_URL = "https://classgrid.in/pricing";
const TOPUP_MAX = 10000;

const btn = "inline-flex items-center h-8 px-3.5 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap transition-colors";
const btnGrey = `${btn} bg-black/[0.06] dark:bg-white/[0.09] text-foreground hover:bg-black/[0.1] dark:hover:bg-white/[0.14]`;
const btnWhite = `${btn} bg-foreground text-background hover:bg-foreground/90`;
const field = "flex items-center h-11 px-3.5 rounded-[10px] border border-border bg-background text-base gap-1.5 focus-within:border-[#7aa7ff]";
const input = "flex-1 min-w-0 bg-transparent outline-none text-foreground text-base";

/** The user's own minimum (the server checks the same) */
const useMinInr = () => {
  const { data: me } = useCurrentUser();
  return String(me?.email || "").trim().toLowerCase() === "nikhilsubsun123@gmail.com" ? 1 : 299;
};

function BuyCreditsDialog({ open, onClose, perInr, start }: { open: boolean; onClose: () => void; perInr: number; start?: number | null }) {
  const minInr = useMinInr();
  const [amountStr, setAmountStr] = useState("500");
  useEffect(() => { if (open) setAmountStr(String(start && start >= 1 ? start : 500)); }, [open, start]);
  const topUp = useInitiateAiTopUp("billing");
  const amount = Math.floor(Number(amountStr) || 0);
  const err = amount < minInr ? `Minimum is ${inr(minInr)}.` : amount > TOPUP_MAX ? `Maximum is ${inr(TOPUP_MAX)}.` : "";
  const pay = async () => {
    if (err) return;
    try {
      const r = await topUp.mutateAsync(amount);
      if (!r?.checkout_url) throw new Error("no checkout link");
      toast.message("Taking you to the payment page");
      await openCheckout(r.checkout_url);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Could not start the payment. Please try again.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[440px] p-6" overlayClassName="supports-backdrop-filter:backdrop-blur-none !backdrop-blur-none !bg-black/40">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Buy credits</DialogTitle>
          <DialogDescription>Credits are used after your included usage. They last 30 days.</DialogDescription>
        </DialogHeader>
        <div>
          <div className="text-[13px] font-medium">Amount</div>
          <div className={`${field} mt-2`}>
            <span className="text-muted-foreground">₹</span>
            <input data-no-ring="true" className={input} type="number" min={minInr} max={TOPUP_MAX} step={1} value={amountStr} onChange={(e) => setAmountStr(e.target.value)} autoFocus />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{inr(minInr)} to {inr(TOPUP_MAX)}</span>
          </div>
          <div className="text-xs text-red-500 mt-2 min-h-[14px]">{err}</div>
          <div className="flex justify-between text-[13px] text-muted-foreground mt-2"><span>You get</span><b className="text-foreground font-semibold">{n(Math.max(0, amount) * perInr)} credits</b></div>
          <div className="flex justify-between text-[13px] text-muted-foreground mt-2"><span>Rate</span><span>₹1 = {n(perInr)} credits</span></div>
        </div>
        <DialogFooter className="mt-2">
          <button type="button" className={btnGrey} onClick={onClose}>Cancel</button>
          <button type="button" className={btnWhite} disabled={!!err || topUp.isPending} onClick={pay}>{topUp.isPending ? "One moment" : `Pay ${inr(Math.max(0, amount))}`}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AutoTopupDialog({ open, onClose, perInr, saved }: { open: boolean; onClose: () => void; perInr: number; saved?: AutoTopup }) {
  const minInr = useMinInr();
  const save = useSaveAutoTopup();
  const [on, setOn] = useState(false);
  const [belowStr, setBelowStr] = useState("100");
  const [amountStr, setAmountStr] = useState("500");
  useEffect(() => {
    if (!open) return;
    setOn(!!saved?.enabled); setBelowStr(String(saved?.below_inr ?? 100)); setAmountStr(String(saved?.amount_inr ?? 500));
  }, [open, saved]);
  const below = Math.floor(Number(belowStr) || 0);
  const amount = Math.floor(Number(amountStr) || 0);
  const err = !on ? "" : below < 1 ? "Enter the balance that starts a top-up." : amount < minInr || amount > TOPUP_MAX ? `Top up amount must be ${inr(minInr)} to ${inr(TOPUP_MAX)}.` : "";
  const submit = async () => {
    if (err) return;
    try {
      await save.mutateAsync({ enabled: on, below_inr: below || 100, amount_inr: amount || 500 });
      toast.success(on ? "Automatic top-ups saved." : "Automatic top-ups turned off.");
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Couldn't save. Please try again.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[440px] p-6" overlayClassName="supports-backdrop-filter:backdrop-blur-none !backdrop-blur-none !bg-black/40">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Automatic top-ups</DialogTitle>
          <DialogDescription>Add credits when your balance is low.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-[10px] border border-border bg-background">
          <div><div className="text-sm font-medium">Automatic top-ups</div><div className="text-xs text-muted-foreground mt-0.5">{on ? "On" : "Off"}</div></div>
          <Switch checked={on} onCheckedChange={setOn} />
        </div>
        {on && (
          <div>
            <div className="text-[13px] font-medium">Top up when balance is below</div>
            <div className={`${field} mt-2`}>
              <span className="text-muted-foreground">₹</span>
              <input data-no-ring="true" className={input} type="number" min={1} step={1} value={belowStr} onChange={(e) => setBelowStr(e.target.value)} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{below > 0 ? `= ${n(below * perInr)} credits` : ""}</span>
            </div>
            <div className="text-[13px] font-medium mt-4">Top up amount</div>
            <div className={`${field} mt-2`}>
              <span className="text-muted-foreground">₹</span>
              <input data-no-ring="true" className={input} type="number" min={minInr} max={TOPUP_MAX} step={1} value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{inr(minInr)} to {inr(TOPUP_MAX)}</span>
            </div>
            <div className="text-xs text-red-500 mt-2 min-h-[14px]">{err}</div>
          </div>
        )}
        <div className="p-3.5 rounded-[10px] border border-border bg-black/[0.03] dark:bg-white/[0.04] text-[13px] leading-5 text-foreground/80">
          <b className="text-foreground font-medium">How it works:</b>{" "}
          {on
            ? `when your credit balance drops below ${inr(below || 0)} (${n((below || 0) * perInr)} credits), Classgrid emails you a one-click link to buy ${inr(amount || 0)} of credits (${n((amount || 0) * perInr)} credits). The amount is filled in; you only confirm the payment. At most one email a day. Nothing is charged by itself.`
            : "turn this on and Classgrid emails you a one-click link to buy credits when your balance runs low, so your chats never stop. You choose the amount. Nothing is charged by itself. You can turn it off any time."}
        </div>
        <DialogFooter className="mt-1">
          <button type="button" className={btnGrey} onClick={onClose}>Cancel</button>
          <button type="button" className={btnWhite} disabled={!!err || save.isPending} onClick={submit}>{save.isPending ? "Saving" : "Save"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Student prices: confirm a school or university email with the code sent to it. `then` runs once confirmed (a plan
 * picked at the student price on the pricing page starts its payment). */
function StudentDialog({ open, onClose, state, then }: { open: boolean; onClose: () => void; state?: StudentState; then?: (() => void) | null }) {
  const start = useStartStudent();
  const confirm = useConfirmStudent();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!open) return;
    setErr(""); setCode("");
    if (state?.pending_email) { setEmail(state.pending_email); setStep("code"); } else { setStep("email"); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    setErr("");
    try { await start.mutateAsync(email.trim()); setStep("code"); toast.success(`Code sent to ${email.trim()}`); }
    catch (e: any) { setErr(e?.response?.data?.error || "Couldn't send the code. Please try again."); }
  };
  const check = async () => {
    setErr("");
    try {
      await confirm.mutateAsync(code.trim());
      toast.success("You're confirmed as a student");
      onClose();
      then?.();
    } catch (e: any) { setErr(e?.response?.data?.error || "Couldn't confirm the code. Please try again."); }
  };
  const examples = (state?.domains || [".edu", ".ac.in", ".edu.in"]).slice(0, 3).join(", ");
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[440px] p-6" overlayClassName="supports-backdrop-filter:backdrop-blur-none !backdrop-blur-none !bg-black/40">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Student prices</DialogTitle>
          <DialogDescription>
            {step === "email"
              ? `Confirm your school or university email to get student prices on Pro and Max. It must end in a school domain, for example ${examples}.`
              : `Enter the 6-digit code we sent to ${email.trim()}. It works for 15 minutes.`}
          </DialogDescription>
        </DialogHeader>
        {step === "email" ? (
          <div>
            <div className="text-[13px] font-medium">School email</div>
            <div className={`${field} mt-2`}>
              <input data-no-ring="true" className={input} type="email" autoComplete="email" placeholder="you@college.ac.in" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) send(); }} autoFocus />
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[13px] font-medium">Code</div>
            <div className={`${field} mt-2`}>
              <input data-no-ring="true" className={`${input} tracking-[0.3em]`} inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) check(); }} autoFocus />
            </div>
            <button type="button" className="text-xs text-muted-foreground underline mt-2 cursor-pointer" onClick={() => { setStep("email"); setErr(""); }}>Use another email or send a new code</button>
          </div>
        )}
        <div className="text-xs text-red-500 min-h-[14px]">{err}</div>
        <DialogFooter>
          <button type="button" className={btnGrey} onClick={onClose}>Cancel</button>
          {step === "email"
            ? <button type="button" className={btnWhite} disabled={!email.trim() || start.isPending} onClick={send}>{start.isPending ? "Sending" : "Send code"}</button>
            : <button type="button" className={btnWhite} disabled={code.length !== 6 || confirm.isPending} onClick={check}>{confirm.isPending ? "Checking" : "Confirm"}</button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const typeText = (t: any) => {
  if (t.type === "plan") return `${(t.plan_key ? t.plan_key.charAt(0).toUpperCase() + t.plan_key.slice(1) : "Plan")} plan, ${t.plan_term === "year" ? "1 year" : "1 month"}`;
  if (t.type === "grant") return "Credits granted by Classgrid";
  if (t.type === "topup") return "Top-up";
  if (t.type === "refund") return "Refund";
  if (t.type === "extend") return "Granted credits extended";
  if (t.type === "revoke") return "Granted credits removed";
  if (t.type === "pause") return "Granted credits paused";
  if (t.type === "resume") return "Granted credits resumed";
  return "Adjustment";
};
const statusText = (s: string) => (s === "success" ? "Paid" : s === "active" ? "Active" : s === "expired" ? "Used up" : s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export function SettingsBillingSection() {
  const { data, isLoading } = usePlanOverview();
  const { data: history } = useMyAiHistory();
  const { data: auto } = useAutoTopup();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"overview" | "invoices">("overview");
  const [buyOpen, setBuyOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const { data: student } = useStudent();
  const [studentOpen, setStudentOpen] = useState(false);
  const [studentThen, setStudentThen] = useState<(() => void) | null>(null);
  // A plan picked at the student price before the school email was confirmed: confirm it here, then the payment starts
  useEffect(() => {
    if (params.get("student") !== "verify") return;
    const key = String(params.get("buy") || "").toLowerCase();
    const term: "month" | "year" = params.get("term") === "year" ? "year" : "month";
    const back = params.get("back") === "pricing" ? "pricing" as const : undefined;
    if (/^[a-z]{2,20}$/.test(key)) {
      setStudentThen(() => async () => {
        try { toast.message("Taking you to the payment page"); await openCheckout(await startPlanPayment(key, term, back, true)); }
        catch (e: any) { toast.error(e?.response?.data?.error || "Could not start the payment. Please try again."); }
      });
    }
    setStudentOpen(true);
    const p = new URLSearchParams(params); ["student", "buy", "term", "back"].forEach((k) => p.delete(k)); setParams(p, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // From the automatic top-up email (?topup=500): the Buy credits popup opens with the amount filled in
  const topupStart = useMemo(() => { const v = parseInt(params.get("topup") || "", 10); return Number.isFinite(v) && v > 0 ? v : null; }, [params]);
  useEffect(() => {
    if (topupStart === null) return;
    setBuyOpen(true);
    const p = new URLSearchParams(params); p.delete("topup"); setParams(p, { replace: true });
  }, [topupStart]); // eslint-disable-line react-hooks/exhaustive-deps
  // Back from the payment page (?ai_payment=success|failed)
  useEffect(() => {
    const r = params.get("ai_payment");
    if (!r) return;
    const paidPlan = params.get("plan") || "";
    if (r === "success" && paidPlan) toast.success(`You're subscribed to ${paidPlan.charAt(0).toUpperCase() + paidPlan.slice(1)}. The receipt is in your email.`);
    else if (r === "success") { toast.success("Payment successful! AI Credits have been added to your account."); setTab("invoices"); }
    else toast.error("Payment failed or was cancelled.");
    qc.invalidateQueries({ queryKey: ["ai-plan-overview"] }); qc.invalidateQueries({ queryKey: ["my-ai-history"] }); qc.invalidateQueries({ queryKey: ["my-ai-balance"] });
    const p = new URLSearchParams(params); p.delete("ai_payment"); p.delete("plan"); setParams(p, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // A payment finished somewhere else (the payment page sends this to its opener)
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "CLASSGRID_PAYMENT_SUCCESS") { qc.invalidateQueries({ queryKey: ["ai-plan-overview"] }); qc.invalidateQueries({ queryKey: ["my-ai-history"] }); } };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc]);

  if (isLoading || !data) {
    return (
      <div className="max-w-[860px]">
        <h2 className="text-[26px] font-semibold text-foreground">Billing &amp; invoices</h2>
        <div className="flex gap-1.5 mt-5">
          <span className="h-9 px-5 rounded-full text-[15px] inline-flex items-center bg-black/[0.07] dark:bg-white/[0.1] text-foreground">Overview</span>
          <span className="h-9 px-5 rounded-full text-[15px] inline-flex items-center text-muted-foreground">Invoices</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3"><div className="text-sm text-muted-foreground">Current plan</div><Skeleton className="h-8 w-20 rounded-full" /></div>
            <Skeleton className="h-8 w-24 rounded mt-3" />
            <Skeleton className="h-3 w-64 rounded mt-4" />
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3"><div className="text-sm text-muted-foreground">Additional usage</div><div className="flex gap-2"><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-24 rounded-full" /></div></div>
            <Skeleton className="h-8 w-32 rounded mt-3" />
            <Skeleton className="h-3 w-56 rounded mt-4" />
          </div>
        </div>
        <div className="text-lg font-semibold text-foreground mt-8 mb-2">Payment details</div>
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
          <div className="text-base font-semibold">Payments go through Razorpay</div>
          <div className="text-sm text-muted-foreground mt-2 max-w-[520px] mx-auto">UPI, cards and net banking. You pay once for a month or a year, or for credits. Nothing is charged by itself.</div>
        </div>
      </div>
    );
  }

  const perInr = data.balance.credits_per_inr || 3000;
  const balance = (data.balance.topup || 0) + (data.balance.promotion || 0);
  const planName = data.enabled ? data.plan.name : "Free";
  const lim = data.plan.limits || {};
  const yearly = data.plan.billing === "prepaid_yearly";
  const studentPaid = !!data.plan.student_price;
  const price = data.enabled && data.plan.key !== "free"
    ? Number(studentPaid ? (yearly ? lim.student_price_inr_yearly : lim.student_price_inr_monthly) : (yearly ? lim.price_inr_yearly : lim.price_inr_monthly))
    : 0;
  const priceLine = data.plan.key === "free" || !data.enabled
    ? "Free, no payment needed"
    : data.plan.billing === "granted"
      ? `Given to you${data.plan.expires_at ? ` · until ${dayText(data.plan.expires_at)}` : ""}`
      : `${price > 0 ? `${inr(price)} per ${yearly ? "year" : "month"}${studentPaid ? " (student price)" : ""}` : planName}${data.plan.expires_at ? ` · paid until ${dayText(data.plan.expires_at)}` : ""}`;
  const rows = Array.isArray(history) ? history : [];

  const pill = (text: string, on: boolean) => <span className={`inline-flex items-center h-[22px] px-2.5 rounded-full text-xs font-medium ${on ? "bg-emerald-500/15 text-emerald-500" : "bg-black/[0.06] dark:bg-white/[0.09] text-muted-foreground"}`}>{text}</span>;

  return (
    <div className="max-w-[860px]">
      <h2 className="text-[26px] font-semibold text-foreground">Billing &amp; invoices</h2>
      <div className="flex gap-1.5 mt-5">
        {(["overview", "invoices"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`h-9 px-5 rounded-full text-[15px] cursor-pointer ${tab === t ? "bg-black/[0.07] dark:bg-white/[0.1] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "overview" ? "Overview" : "Invoices"}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Current plan</div>
                <a className={btnWhite} href={PRICING_URL} target="_blank" rel="noopener noreferrer" onClick={(e) => {
                  // Classgrid Code shows the pricing page in the computer's browser
                  const desk = import.meta.env.VITE_EDITOR === "1" ? (window as unknown as { classgridDesktop?: { openExternal?: (url: string) => Promise<unknown> } }).classgridDesktop : undefined;
                  if (desk?.openExternal) { e.preventDefault(); void desk.openExternal(PRICING_URL); }
                }}>Upgrade</a>
              </div>
              <div className="text-[28px] font-semibold mt-2">{planName}</div>
              <div className="flex justify-between gap-4 text-[13px] text-muted-foreground mt-3.5"><span>{priceLine}</span>{data.enabled && data.plan.key !== "free" && data.plan.billing !== "granted" && <span>Does not renew by itself</span>}</div>
              <div className="flex justify-between gap-4 text-[13px] text-muted-foreground mt-1.5">
                {student?.verified ? (
                  <>
                    <span className="flex items-center gap-2">{pill("Student", true)}<span>Student prices until {dayText(student.expires_at)}</span></span>
                    <a className="underline hover:text-foreground" href={`${PRICING_URL}?student=1`} target="_blank" rel="noopener noreferrer">See student prices</a>
                  </>
                ) : (
                  <>
                    <span>{student?.expired ? "Your student confirmation has run out" : "Student? Pro and Max cost less"}</span>
                    <button type="button" className="underline hover:text-foreground cursor-pointer" onClick={() => { setStudentThen(null); setStudentOpen(true); }}>{student?.expired ? "Confirm again" : "Confirm student email"}</button>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">Additional usage</div>
                <div className="flex gap-2">
                  <button type="button" className={btnGrey} onClick={() => setAutoOpen(true)}>Auto top-up</button>
                  <button type="button" className={btnWhite} onClick={() => setBuyOpen(true)}>Buy credits</button>
                </div>
              </div>
              <div className="text-[28px] font-semibold mt-2">{n(balance)}<span className="text-sm font-normal text-muted-foreground ml-1.5">credits</span></div>
              <div className="flex justify-between gap-4 text-[13px] text-muted-foreground mt-3.5"><span>Credit balance</span><span>Used after your included usage</span></div>
              <div className="flex justify-between gap-4 text-[13px] text-muted-foreground mt-1.5">
                <span className="flex items-center gap-2">{auto?.enabled ? <>{pill("Auto top-up on", true)}<span>{inr(auto.amount_inr)} when below {inr(auto.below_inr)}</span></> : pill("Auto top-up off", false)}</span>
                <span>Bought credits last 30 days from purchase</span>
              </div>
            </div>
          </div>

          <div className="text-lg font-semibold text-foreground mt-8 mb-2">Payment details</div>
          <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
            <div className="text-base font-semibold">Payments go through Razorpay</div>
            <div className="text-sm text-muted-foreground mt-2 max-w-[520px] mx-auto">UPI, cards and net banking. You pay once for a month or a year, or for credits. Nothing is charged by itself.</div>
          </div>
          <p className="text-xs text-muted-foreground mt-2.5">Receipts are sent to your email. Prices include GST.</p>
        </>
      ) : (
        <>
          {rows.length ? (
            <div className="rounded-xl border border-border bg-card overflow-x-auto mt-5">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground text-left"><th className="font-medium px-5 py-3 border-b border-border">Date</th><th className="font-medium px-5 py-3 border-b border-border">Type</th><th className="font-medium px-5 py-3 border-b border-border text-center">Amount</th><th className="font-medium px-5 py-3 border-b border-border text-center">Credits added</th><th className="font-medium px-5 py-3 border-b border-border text-center">Status</th></tr></thead>
                <tbody>
                  {rows.map((t: any) => (
                    <tr key={t._id}>
                      <td className="px-5 py-3 border-b border-border last:border-b-0 whitespace-nowrap">{dayText(t.createdAt)}</td>
                      <td className="px-5 py-3 border-b border-border">{typeText(t)}</td>
                      <td className="px-5 py-3 border-b border-border text-center">{t.amount_inr > 0 ? inr(t.amount_inr) : "–"}</td>
                      <td className="px-5 py-3 border-b border-border text-center tabular-nums">{t.credits_added > 0 ? `+${n(t.credits_added)}` : "–"}</td>
                      <td className="px-5 py-3 border-b border-border text-center">{statusText(t.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center mt-5">
              <div className="text-base font-semibold">No invoices yet</div>
              <div className="text-sm text-muted-foreground mt-2">Invoices appear here once you are billed.</div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2.5">Receipts are sent to your email. Prices include GST.</p>
        </>
      )}

      <BuyCreditsDialog open={buyOpen} onClose={() => setBuyOpen(false)} perInr={perInr} start={topupStart} />
      <AutoTopupDialog open={autoOpen} onClose={() => setAutoOpen(false)} perInr={perInr} saved={auto} />
      <StudentDialog open={studentOpen} onClose={() => setStudentOpen(false)} state={student} then={studentThen} />
    </div>
  );
}
