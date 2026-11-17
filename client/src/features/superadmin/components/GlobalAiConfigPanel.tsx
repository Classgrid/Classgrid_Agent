/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
//
// Plans & Usage > Settings (owner, 2026-11-17): the global settings beside the plans, in two cards.
// "In use now": read for everyone, plans on or off (top-up credits per rupee, credits per picture, the prices of
// extra use, the longest read-aloud, one free limit per computer, student prices, the Cloudflare Neuron cap).
// "Only used while plans are off": the fallback limits planOf() falls back to when plans are off, and that Classgrid
// staff accounts always use. The organization pool is an organization idea and is not shown (the field stays).
//
// Each dialog saves only its own fields (a partial PUT, which the server accepts): saving every field from the
// page's state, as before, could write back an old value another tab had just changed. The server does not check
// credits per rupee, credits per picture or the session limit, so the minimums are checked here before saving.
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/marketing_ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { Input } from "@/components/marketing_ui/input";
import { Label } from "@/components/marketing_ui/label";
import { Switch } from "@/components/marketing_ui/switch";
import { Textarea } from "@/components/marketing_ui/textarea";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { apiClient as api } from "@/lib/apiClient";
import { ResetPeriodInput, formatResetPeriod, toResetPeriod } from "@/features/superadmin/components/SetupUsageCredits";
import { useAiPlans, type ResetPeriod } from "@/features/superadmin/queries/useAiUsage";
import { Section } from "@/features/superadmin/components/ai-usage/Section";
import { errorText } from "@/features/superadmin/components/ai-usage/planText";

type Config = Record<string, any> & { resetPeriods?: Record<string, ResetPeriod | undefined> };
type NumField = { key: string; label: string; min: number; max?: number; fallback: number };
type PeriodKind = "tokens" | "image" | "whatsapp" | "calls";
type Editor = {
  title: string; description?: string; fields: NumField[];
  reset?: { kind: PeriodKind; valueKey: string; unitKey: string };
};

const num = (v: unknown) => Math.round(Number(v) || 0).toLocaleString("en-IN");
const valueOf = (cfg: Config | undefined, f: NumField) => (cfg?.[f.key] ?? f.fallback) as number;

// The fields, with the defaults the server uses when a value was never saved
const F = {
  creditsPerInr: { key: "credits_per_inr", label: "Credits for ₹1", min: 1, fallback: 0 },
  imageCost: { key: "image_generation_token_cost", label: "Credits per picture", min: 0, fallback: 0 },
  extraImage: { key: "extra_image_credits", label: "Credits per extra picture", min: 0, fallback: 5000 },
  extraWhatsapp: { key: "extra_whatsapp_credits", label: "Credits per extra WhatsApp message", min: 0, fallback: 2000 },
  extraVoiceReply: { key: "extra_voice_reply_credits", label: "Credits per extra read-aloud", min: 0, fallback: 3000 },
  extraVoiceInput: { key: "extra_voice_input_credits_per_minute", label: "Credits per extra minute of voice", min: 0, fallback: 2000 },
  voiceMaxChars: { key: "voice_reply_max_chars", label: "Longest read-aloud", min: 200, fallback: 4000 },
  peakAnswers: { key: "peak_answers_at_once", label: "AI answers at once before the line (0 = no line)", min: 0, fallback: 40 },
  session: { key: "global_user_weekly_limit", label: "Session limit", min: 1000, fallback: 0 },
  pictures: { key: "global_image_weekly_limit", label: "Pictures", min: 0, fallback: 0 },
  whatsapp: { key: "global_whatsapp_scheduling_limit", label: "WhatsApp messages", min: 0, fallback: 0 },
  calls: { key: "global_call_minutes_limit", label: "Free call minutes", min: 0, fallback: 0 },
  voiceReplies: { key: "global_voice_replies_per_day", label: "Read-alouds a day", min: -1, fallback: 20 },
} satisfies Record<string, NumField>;

/** Why a typed number cannot be saved, or "" when it can */
function fieldError(f: NumField, raw: string) {
  if (raw.trim() === "") return "Write a number.";
  const v = Number(raw);
  if (!Number.isInteger(v)) return "Write a whole number.";
  if (v < f.min) return `At least ${f.min.toLocaleString("en-IN")}.`;
  if (f.max !== undefined && v > f.max) return `At most ${f.max.toLocaleString("en-IN")}.`;
  return "";
}

// Each setting is its own card, as on the old page (owner, 2026-11-17: "like my old ui, make everything separate,
// no box inside a box"): name, note and value on top, the Edit button or switch in the bar under it
function SettingCard({ title, value, line, children }: { title: ReactNode; value?: ReactNode; line?: ReactNode; children: ReactNode }) {
  return (
    <div className="border border-border rounded-xl shadow-sm bg-card flex flex-col justify-between min-w-0">
      <div className="p-5 flex flex-col gap-1 min-w-0">
        <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
        {value !== undefined && <span className="text-xl font-bold text-foreground tabular-nums break-words">{value}</span>}
        {line && <div className="text-sm text-muted-foreground break-words">{line}</div>}
      </div>
      <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end">{children}</div>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return <Button type="button" variant="outline" onClick={onClick}>Edit</Button>;
}

// only="credits": just the top-up credit settings (the Top-up credits tab of Plans & Billing; owner, 2026-11-17: "a
// separate tab so we can update"). Without it: the settings beside the plans, on the AI Usage & Credits page.
export function GlobalAiConfigPanel({ only }: { only?: "credits" } = {}) {
  const queryClient = useQueryClient();
  const { data: plansData } = useAiPlans();
  const plansOn = plansData?.enabled;

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["globalAiConfig"],
    queryFn: async () => {
      const res = await api.get("/api/super-admin/ai-global-config");
      return (res.data?.config ? { ...res.data.config, resetPeriods: res.data.resetPeriods } : res.data?.config) as Config | undefined;
    },
  });

  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => (await api.put("/api/super-admin/ai-global-config", body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["globalAiConfig"] }),
    onError: (e) => toast.error(errorText(e, "Could not save. Try again.")),
  });

  // The open dialog, and what is typed in it
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftReset, setDraftReset] = useState<ResetPeriod>(toResetPeriod());
  const [tried, setTried] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [studentDomains, setStudentDomains] = useState("");
  const [studentMonths, setStudentMonths] = useState("12");

  const open = (e: Editor) => {
    setDraft(Object.fromEntries(e.fields.map((f) => [f.key, String(valueOf(cfg, f))])));
    if (e.reset) setDraftReset(toResetPeriod(cfg?.resetPeriods?.[e.reset.kind]));
    setTried(false);
    setEditor(e);
  };

  const saveEditor = () => {
    if (!editor) return;
    setTried(true);
    if (editor.fields.some((f) => fieldError(f, draft[f.key] ?? ""))) return;
    const body: Record<string, unknown> = Object.fromEntries(editor.fields.map((f) => [f.key, Number(draft[f.key])]));
    if (editor.reset) { body[editor.reset.valueKey] = draftReset.value; body[editor.reset.unitKey] = draftReset.unit; }
    save.mutate(body, { onSuccess: () => { toast.success("Saved"); setEditor(null); } });
  };

  const monthsError = (() => {
    const v = Number(studentMonths);
    return studentMonths.trim() === "" || !Number.isInteger(v) || v < 1 || v > 48 ? "From 1 to 48 months." : "";
  })();
  const saveStudent = () => {
    setTried(true);
    if (monthsError) return;
    save.mutate(
      { student_email_domains: studentDomains.split(/[\s,]+/).map((d) => d.trim()).filter(Boolean), student_verification_months: Number(studentMonths) },
      { onSuccess: () => { toast.success("Saved"); setStudentOpen(false); } },
    );
  };

  const setSwitch = (key: string, on: boolean) => save.mutate({ [key]: on }, { onSuccess: () => toast.success("Saved") });

  if (isLoading) return <Skeleton className="w-full h-64 rounded-xl" />;

  const period = (kind: PeriodKind) => formatResetPeriod(cfg?.resetPeriods?.[kind]);
  const voiceReplies = valueOf(cfg, F.voiceReplies);
  const busy = save.isPending;

  // The number dialog shared by every card: it saves only the fields it shows
  const numberDialog = (
    <Dialog open={!!editor} onOpenChange={(o) => { if (!o && !busy) setEditor(null); }}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editor?.title}</DialogTitle>
          {editor?.description && <DialogDescription>{editor.description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {editor?.fields.map((f) => {
            const err = tried ? fieldError(f, draft[f.key] ?? "") : "";
            return (
              <div key={f.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`setting-${f.key}`} className="text-sm font-medium">{f.label}</Label>
                <Input
                  id={`setting-${f.key}`} type="number" min={f.min} max={f.max} step={1}
                  value={draft[f.key] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} disabled={busy}
                />
                {err && <p className="text-xs text-red-500">{err}</p>}
              </div>
            );
          })}
          {editor?.reset && <ResetPeriodInput id={`setting-${editor.reset.kind}`} value={draftReset} onChange={setDraftReset} disabled={busy} />}
        </div>
        <DialogFooter>
          <Button type="button" onClick={saveEditor} disabled={busy}>
            {busy && <Spinner className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Plans & Billing > Top-up credits: what a rupee buys, and what each thing past a plan limit takes from the credits
  if (only === "credits") {
    return (
      <div className="flex flex-col gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Top-up credits</h2>
          <p className="text-sm text-muted-foreground">
            Credits are one pool: bought and gifted together. They are used only when a plan limit is over, at these prices. Chat and Claude take credits by the tokens they use.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingCard title="Credits for ₹1" value={`${num(valueOf(cfg, F.creditsPerInr))} credits`} line="Top-up credits a person gets for each rupee.">
            <EditButton onClick={() => open({ title: "Credits for ₹1", fields: [F.creditsPerInr] })} />
          </SettingCard>
          <SettingCard title="Credits per picture" value={`${num(valueOf(cfg, F.imageCost))} credits`} line="Taken from the person's credits for each picture, besides counting it in their picture limit.">
            <EditButton onClick={() => open({ title: "Credits per picture", fields: [F.imageCost] })} />
          </SettingCard>
          <SettingCard title="Extra picture" value={`${num(valueOf(cfg, F.extraImage))} credits`} line="Each picture past the plan's number. 0 = off: the limit then stops them.">
            <EditButton onClick={() => open({ title: "Extra picture", description: "Taken from the person's credits for each picture past their plan's number. 0 turns it off, and the limit then stops them.", fields: [F.extraImage] })} />
          </SettingCard>
          <SettingCard title="Extra WhatsApp message" value={`${num(valueOf(cfg, F.extraWhatsapp))} credits`} line="Each WhatsApp message past the plan's number. 0 = off: the limit then stops them.">
            <EditButton onClick={() => open({ title: "Extra WhatsApp message", description: "Taken from the person's credits for each WhatsApp message past their plan's number. 0 turns it off, and the limit then stops them.", fields: [F.extraWhatsapp] })} />
          </SettingCard>
          <SettingCard title="Extra read-aloud" value={`${num(valueOf(cfg, F.extraVoiceReply))} credits`} line="Each read-aloud past the plan's number. 0 = off: the limit then stops them.">
            <EditButton onClick={() => open({ title: "Extra read-aloud", description: "Taken from the person's credits for each read-aloud past their plan's number. 0 turns it off, and the limit then stops them.", fields: [F.extraVoiceReply] })} />
          </SettingCard>
          <SettingCard title="Extra voice minute" value={`${num(valueOf(cfg, F.extraVoiceInput))} credits`} line="Each minute of voice past the plan's minutes. 0 = off: the limit then stops them.">
            <EditButton onClick={() => open({ title: "Extra voice minute", description: "Taken from the person's credits for each minute of voice past their plan's minutes. 0 turns it off, and the limit then stops them.", fields: [F.extraVoiceInput] })} />
          </SettingCard>
        </div>
        {numberDialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 mb-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">What applies beside the plans.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingCard title="AI answers at once before the line" value={valueOf(cfg, F.peakAnswers) > 0 ? num(valueOf(cfg, F.peakAnswers)) : "No line"} line="When more answers than this run at once, a plan with priority at peak starts at once and everyone else waits in line. 0 = no line.">
          <EditButton onClick={() => open({ title: "AI answers at once before the line", description: "0 means no line: every answer starts at once.", fields: [F.peakAnswers] })} />
        </SettingCard>
        <SettingCard title="Longest read-aloud" value={`${num(valueOf(cfg, F.voiceMaxChars))} characters`} line="The most one answer read aloud can say. A longer answer stops at its last full sentence.">
          <EditButton onClick={() => open({ title: "Longest read-aloud", fields: [F.voiceMaxChars] })} />
        </SettingCard>

        {/* One free limit per computer (the desktop app sends the computer's scrambled Windows ID) */}
        <SettingCard
          title={<Label htmlFor="free-limit-per-computer" className="text-base font-semibold text-foreground">One free limit per computer</Label>}
          line="On: every account used on the same computer shares one free limit, so more accounts on one PC don't give more free usage. Off: every account has its own free limit, even on the same computer."
        >
          <Switch id="free-limit-per-computer" checked={!!cfg?.free_limit_per_computer} disabled={busy} onCheckedChange={(on) => setSwitch("free_limit_per_computer", on)} />
        </SettingCard>

        {/* Student prices: who counts as a student (Settings > Billing confirms a university email with a code) */}
        <SettingCard
          title="Student prices"
          line={<>
            <p>A person gets the student price of Pro and Max after confirming a university email ending in one of these, with a code sent to it. It lasts {num(cfg?.student_verification_months ?? 12)} months, then they confirm again. You can also confirm a student by hand on their page.</p>
            <p className="text-foreground mt-2">{(cfg?.student_email_domains || []).join("  ") || ".edu  .edu.in  .ac.in  .ac.uk  .edu.au"}</p>
          </>}
        >
          <EditButton onClick={() => {
            setStudentDomains((cfg?.student_email_domains || []).join("\n"));
            setStudentMonths(String(cfg?.student_verification_months ?? 12));
            setTried(false);
            setStudentOpen(true);
          }} />
        </SettingCard>

        {/* Cloudflare Workers AI: the account's daily Neuron cap (owner, 2026-11-13: Cloudflare bills above 10,000 a day from Dec 1) */}
        <div className="md:col-span-2">
          <SettingCard
            title={<Label htmlFor="cf-neuron-cap" className="text-base font-semibold text-foreground">Cloudflare daily Neuron cap</Label>}
            line={<>
              <p>On: once today's Neurons reach 9,500, every Cloudflare model (chat, voice, speech, images) pauses until 00:00 UTC (5:30 AM IST); the chat uses its other models where it has them. Off: nothing pauses, the meter still counts. Cloudflare gives 10,000 Neurons a day free and bills above that from 1 December 2026; the cap stays 500 under it, so nothing is ever billed.</p>
              <p className="text-foreground mt-2">
                Today, {cfg?.cfNeurons?.day || "UTC"}: <strong>{num(cfg?.cfNeurons?.used || 0)}</strong> of {num(cfg?.cfNeurons?.cap || 9500)} Neurons
                {cfg?.cfNeurons?.byModel?.length ? (
                  <span className="text-muted-foreground"> · {cfg.cfNeurons.byModel.map((m: { model: string; neurons: number; requests: number }) => `${m.model.replace("@cf/", "")}: ${num(m.neurons)} (${m.requests} requests)`).join(", ")}</span>
                ) : null}
              </p>
            </>}
          >
            <Switch id="cf-neuron-cap" checked={!!cfg?.cf_neuron_cap_enabled} disabled={busy} onCheckedChange={(on) => setSwitch("cf_neuron_cap_enabled", on)} />
          </SettingCard>
        </div>
      </div>

      {numberDialog}

      <Dialog open={studentOpen} onOpenChange={(o) => { if (!o && !busy) setStudentOpen(false); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student prices</DialogTitle>
            <DialogDescription>Email endings that count as a university, one per line (for example .edu, .ac.in, .edu.in, or a whole address like iitb.ac.in). The prices are set on each plan.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student-domains" className="text-sm font-medium">Email endings</Label>
              <Textarea id="student-domains" rows={8} value={studentDomains} onChange={(e) => setStudentDomains(e.target.value)} disabled={busy} className="font-mono text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student-months" className="text-sm font-medium">Months a confirmation lasts</Label>
              <Input id="student-months" type="number" min={1} max={48} step={1} value={studentMonths} onChange={(e) => setStudentMonths(e.target.value)} disabled={busy} />
              {tried && monthsError && <p className="text-xs text-red-500">{monthsError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={saveStudent} disabled={busy}>
              {busy && <Spinner className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
