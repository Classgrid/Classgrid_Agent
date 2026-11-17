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

function Tile({ title, value, line, onClick }: { title: string; value: ReactNode; line?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-border bg-background/40 hover:bg-muted/50 transition-colors p-4 text-left flex flex-col gap-1 min-w-0">
      <span className="text-sm text-muted-foreground">{title}</span>
      <span className="text-lg font-semibold text-foreground tabular-nums break-words">{value}</span>
      {line && <span className="text-xs text-muted-foreground">{line}</span>}
    </button>
  );
}

function SubCard({ title, note, badge, children }: { title: string; note: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4 min-w-0">
      <div className="flex items-center gap-2 flex-wrap"><h3 className="text-sm font-semibold text-foreground">{title}</h3>{badge}</div>
      <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function GlobalAiConfigPanel() {
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
  // The plans-off card is open at first only while plans are off (null: not touched yet, so follow the switch)
  const [offOpen, setOffOpen] = useState<boolean | null>(null);

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
  const offIsOpen = offOpen ?? plansOn === false;
  const busy = save.isPending;

  return (
    <Section icon={SlidersHorizontal} title="Settings" note="What applies beside the plans.">
      <div className="flex flex-col gap-4">
        <SubCard title="In use now" note="These apply to everyone today, with plans on or off.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Tile
              title="Credits for ₹1"
              value={`${num(valueOf(cfg, F.creditsPerInr))} credits`}
              line="Top-up credits a person gets for each rupee."
              onClick={() => open({ title: "Credits for ₹1", fields: [F.creditsPerInr] })}
            />
            <Tile
              title="Credits per picture"
              value={`${num(valueOf(cfg, F.imageCost))} credits`}
              line="Taken from the person's credits for each picture, besides counting it in their picture limit."
              onClick={() => open({ title: "Credits per picture", fields: [F.imageCost] })}
            />
            <Tile
              title="Extra use from top-up credits"
              value={`${num(valueOf(cfg, F.extraImage))} credits a picture`}
              line={`WhatsApp message ${num(valueOf(cfg, F.extraWhatsapp))} · read aloud ${num(valueOf(cfg, F.extraVoiceReply))} · voice minute ${num(valueOf(cfg, F.extraVoiceInput))}`}
              onClick={() => open({
                title: "Extra use from top-up credits",
                description: "When someone has used all the pictures, WhatsApp messages, read-alouds or voice minutes of their plan, each extra one is paid from their top-up credits at these prices. 0 turns it off, and the limit then stops them.",
                fields: [F.extraImage, F.extraWhatsapp, F.extraVoiceReply, F.extraVoiceInput],
              })}
            />
            <Tile
              title="Longest read-aloud"
              value={`${num(valueOf(cfg, F.voiceMaxChars))} characters`}
              line="The most one answer read aloud can say. A longer answer stops at its last full sentence."
              onClick={() => open({ title: "Longest read-aloud", fields: [F.voiceMaxChars] })}
            />

            {/* One free limit per computer (the desktop app sends the computer's scrambled Windows ID) */}
            <div className="sm:col-span-2 rounded-lg border border-border p-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <Label htmlFor="free-limit-per-computer" className="text-sm font-medium text-foreground">One free limit per computer</Label>
                <p className="text-xs text-muted-foreground">
                  On: every account used on the same computer shares one free limit, so more accounts on one PC don't give more free usage.
                  Off: every account has its own free limit, even on the same computer.
                </p>
              </div>
              <Switch id="free-limit-per-computer" checked={!!cfg?.free_limit_per_computer} disabled={busy} onCheckedChange={(on) => setSwitch("free_limit_per_computer", on)} />
            </div>

            {/* Student prices: who counts as a student (Settings > Billing confirms a university email with a code) */}
            <div className="sm:col-span-2 rounded-lg border border-border p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-medium text-foreground">Student prices</span>
                <p className="text-xs text-muted-foreground">
                  A person gets the student price of Pro and Max after confirming a university email ending in one of these, with a code sent to it.
                  It lasts {num(cfg?.student_verification_months ?? 12)} months, then they confirm again. You can also confirm a student by hand on their page.
                </p>
                <p className="text-xs text-foreground mt-1 break-words">{(cfg?.student_email_domains || []).join("  ") || ".edu  .edu.in  .ac.in  .ac.uk  .edu.au"}</p>
              </div>
              <Button
                type="button" variant="outline" size="sm" className="shrink-0 self-start font-medium"
                onClick={() => {
                  setStudentDomains((cfg?.student_email_domains || []).join("\n"));
                  setStudentMonths(String(cfg?.student_verification_months ?? 12));
                  setTried(false);
                  setStudentOpen(true);
                }}
              >
                Edit
              </Button>
            </div>

            {/* Cloudflare Workers AI: the account's daily Neuron cap (owner, 2026-11-13: Cloudflare bills above 10,000 a day from Dec 1) */}
            <div className="sm:col-span-2 rounded-lg border border-border p-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <Label htmlFor="cf-neuron-cap" className="text-sm font-medium text-foreground">Cloudflare daily Neuron cap</Label>
                <p className="text-xs text-muted-foreground">
                  On: once today's Neurons reach 9,500, every Cloudflare model (chat, voice, speech, images) pauses until 00:00 UTC (5:30 AM IST); the chat uses its other models where it has them.
                  Off: nothing pauses, the meter still counts. Cloudflare gives 10,000 Neurons a day free and bills above that from 1 December 2026; the cap stays 500 under it, so nothing is ever billed.
                </p>
                <p className="text-xs text-foreground mt-1 break-words">
                  Today, {cfg?.cfNeurons?.day || "UTC"}: <strong>{num(cfg?.cfNeurons?.used || 0)}</strong> of {num(cfg?.cfNeurons?.cap || 9500)} Neurons
                  {cfg?.cfNeurons?.byModel?.length ? (
                    <span className="text-muted-foreground"> · {cfg.cfNeurons.byModel.map((m: { model: string; neurons: number; requests: number }) => `${m.model.replace("@cf/", "")}: ${num(m.neurons)} (${m.requests} requests)`).join(", ")}</span>
                  ) : null}
                </p>
              </div>
              <Switch id="cf-neuron-cap" checked={!!cfg?.cf_neuron_cap_enabled} disabled={busy} onCheckedChange={(on) => setSwitch("cf_neuron_cap_enabled", on)} />
            </div>
          </div>
        </SubCard>

        <Collapsible open={offIsOpen} onOpenChange={(next) => setOffOpen(next)}>
          <div className="rounded-xl border border-border p-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground">Only used while plans are off</h3>
                  {plansOn !== undefined && <Badge variant={plansOn ? "neutral" : "warning"}>{plansOn ? "Not used now" : "In use now"}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plansOn === false
                    ? "Plans are off, so these limits apply to everyone."
                    : "Plans are on, so everyone follows their plan. Only Classgrid staff accounts (super admins and @classgrid.in emails) use these. They apply to everyone again if plans are turned off in Plans & Billing."}
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="shrink-0 font-medium">
                  {offIsOpen ? "Hide" : "Show"}
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${offIsOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <Tile
                  title="Session limit"
                  value={`${num(valueOf(cfg, F.session))} credits`}
                  line={period("tokens")}
                  onClick={() => open({
                    title: "Session limit", description: "Credits a person can use, and how often the count starts again.", fields: [F.session],
                    reset: { kind: "tokens", valueKey: "global_token_reset_value", unitKey: "global_token_reset_unit" },
                  })}
                />
                <Tile
                  title="Pictures"
                  value={`${num(valueOf(cfg, F.pictures))} pictures`}
                  line={period("image")}
                  onClick={() => open({
                    title: "Pictures", description: "Pictures a person can make, and how often the count starts again.", fields: [F.pictures],
                    reset: { kind: "image", valueKey: "global_image_reset_value", unitKey: "global_image_reset_unit" },
                  })}
                />
                <Tile
                  title="WhatsApp messages"
                  value={`${num(valueOf(cfg, F.whatsapp))} messages`}
                  line={period("whatsapp")}
                  onClick={() => open({
                    title: "WhatsApp messages", description: "WhatsApp messages a person can schedule, and how often the count starts again.", fields: [F.whatsapp],
                    reset: { kind: "whatsapp", valueKey: "global_whatsapp_reset_value", unitKey: "global_whatsapp_reset_unit" },
                  })}
                />
                <Tile
                  title="Free call minutes"
                  value={`${num(valueOf(cfg, F.calls))} minutes`}
                  line={period("calls")}
                  onClick={() => open({
                    title: "Free call minutes", description: "Free WhatsApp call minutes a person gets. Past them, a call is paid from credits.", fields: [F.calls],
                    reset: { kind: "calls", valueKey: "global_call_reset_value", unitKey: "global_call_reset_unit" },
                  })}
                />
                <Tile
                  title="Read-alouds a day"
                  value={voiceReplies < 0 ? "No limit" : num(voiceReplies)}
                  line="Starts again every day"
                  onClick={() => open({ title: "Read-alouds a day", description: "-1 means no limit, 0 means off.", fields: [F.voiceReplies] })}
                />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* The number dialog shared by every tile: it saves only the fields it shows */}
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
    </Section>
  );
}
