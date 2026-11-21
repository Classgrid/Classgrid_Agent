// AI Usage & Credits, plans only (owner, 2026-11-17: "remove all AI credits things, only plans"), in the old page's
// look: the folders are the plans (Free, Pro, Max), then the people on that plan, then the person. PlanMeters shows a person's
// plan limits and what they used of them, the same numbers they see in their own Settings > Usage.
import { useState } from "react";
import { User as UserIcon, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Input } from "@/components/marketing_ui/input";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { usePlansSummary, usePeople } from "@/features/superadmin/queries/useAiUsage";
import { n, type Meter, type PlanOverview } from "@/features/shared/queries/usePlanOverview";

function Folder({ label, subtitle, onClick, icon: Icon }: { label: string; subtitle?: string; onClick: () => void; icon: typeof UserIcon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-start p-4 rounded-xl hover:bg-accent/50 transition-colors border border-transparent hover:border-border group h-auto min-h-[160px] relative cursor-pointer"
    >
      <div className="relative mb-2">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 group-hover:text-amber-500 transition-colors drop-shadow-sm">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pt-2">
          <Icon className="w-6 h-6 text-amber-100 opacity-60" />
        </div>
      </div>
      <div className="flex flex-col w-full justify-center mt-2">
        <span className="text-sm font-medium text-foreground whitespace-normal break-words w-full text-center leading-tight px-1 text-balance">{label}</span>
        {subtitle && <span className="text-xs text-muted-foreground whitespace-normal break-words w-full text-center mt-1 px-1 text-balance">{subtitle}</span>}
      </div>
    </button>
  );
}

/** One folder per plan, with how many people are on it */
export function PlanFolders({ onOpen }: { onOpen: (plan: string, planName: string) => void }) {
  const { data, isLoading } = usePlansSummary();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const plans = (data?.plans || []).filter((p) => !p.coming_soon || p.people > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Plans ({plans.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {plans.map((p) => (
            <Folder
              key={p.key}
              label={p.name}
              subtitle={p.key === "free" ? `${n(p.people)} people` : `${n(p.people)} people · ${n(p.bought)} bought · ${n(p.gifted)} gifted`}
              icon={Layers}
              onClick={() => onOpen(p.key, p.name)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** The people on one plan, as folders, with a search and pages */
export function PlanPeopleFolders({ plan, planName, onOpen }: { plan: string; planName: string; onOpen: (userId: string, userName: string) => void }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePeople({ q, plan, how: "", page, limit: 60 });
  const people = data?.data || [];
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CardTitle className="text-lg">{planName} ({n(data?.total ?? 0)})</CardTitle>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name or email..." className="h-9 sm:max-w-[280px]" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : people.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No people on this plan.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {people.map((u) => (
              <Folder
                key={u.id}
                label={u.name || u.email}
                subtitle={u.staff ? "Staff" : u.plan?.expires_at ? `Until ${new Date(u.plan.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : u.email}
                icon={UserIcon}
                onClick={() => onOpen(u.id, u.name || u.email)}
              />
            ))}
          </div>
        )}
        {(data?.pages ?? 1) > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mt-4">
            <span>Page {page} of {data?.pages}</span>
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Back</Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= (data?.pages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MeterRow({ label, note, meter, unit }: { label: string; note?: string; meter: Meter | undefined; unit: string }) {
  if (!meter) return null;
  const limit = meter.limit;
  if (limit === 0) return null;
  const percent = limit && limit > 0 ? Math.min(100, Math.max(0, (meter.used / limit) * 100)) : 0;
  return (
    // Two equal columns in every row, so all the bars start at the same place and have the same length (owner,
    // 2026-11-17: "align them"); on a phone the bar goes under the name
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 items-start">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground break-words">{note || meter.periodText || ""}</span>
      </div>
      <div className="flex flex-col gap-1.5 mt-1 min-w-0">
        <div className="w-full flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-foreground">{limit && limit > 0 ? `${Math.round(percent)}% Used` : "No limit"}</span>
          <span className="text-muted-foreground font-medium">{n(meter.used)}{limit && limit > 0 ? ` / ${n(limit)}` : ""} {unit}</span>
        </div>
        <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

/** What the person used of their plan's limits (from the server's planOverviewFor). The plan's name and end date
 * are in the two boxes above these rows on the person's page. */
export function PlanMeters({ overview }: { overview?: PlanOverview | null }) {
  if (!overview) return null;
  const u = overview.usage;
  return (
    <>
      {/* The same names and lines as the person's own Settings > Usage page, so it is clear which models each limit is for */}
      <MeterRow label="Session limit" note={`Mid models (DeepSeek, GLM and others) · ${u.credits_window?.periodText || "5 hours"}`} meter={u.credits_window} unit="" />
      <MeterRow label="Weekly limit"note="DeepSeek, GLM and other models · Weekly" meter={u.credits_week} unit="" />
      <MeterRow label="Claude limit" note="Sonnet, Opus and Haiku · Weekly" meter={u.claude_week} unit="" />
      <MeterRow label="Cloud computer limit" note="Time code, projects and the live browser ran in the cloud · this month" meter={u.cloud_hours} unit="hours" />
      <MeterRow label="Pictures" meter={u.images} unit="pictures" />
      <MeterRow label="WhatsApp messages limit" note={`Messages the AI sends${u.whatsapp?.periodText ? ` · ${u.whatsapp.periodText}` : ""}`} meter={u.whatsapp} unit="messages" />
      <MeterRow label="Read-aloud limit" note="Answers the AI reads out loud · today" meter={u.voice_replies} unit="replies" />
      <MeterRow label="Voice limit" note="Minutes talking with the AI · today" meter={u.voice_input_minutes} unit="minutes" />
      <MeterRow label="WhatsApp calls limit" note={`Call minutes with the AI${u.call_minutes?.periodText ? ` · ${u.call_minutes.periodText}` : ""}`} meter={u.call_minutes} unit="minutes" />
    </>
  );
}
