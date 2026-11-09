// Calls (owner's design, 2026-11-09): every call the user had with Classgrid AI (and the tasks their WhatsApp
// messages or emails started), newest first, grouped by day. Each one opens its read-only record (CallDetailPage):
// the transcript, every step the AI did afterwards, what it sent, what failed. Nothing here can be sent or edited.
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Phone, Search, MessageSquare, Mail, FolderPlus, ChevronRight, Clock } from "lucide-react";
// (the list is sized for a desktop window: wide, 15–16 px text)
import { apiClient as api } from "@/lib/apiClient";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { readPageCache, writePageCache } from "@/lib/desktopPageCache";
import { getSocket } from "@/lib/socketClient";
import { cn } from "@/lib/utils";
import {
  ACTIVE, ORIGIN, STATUS, StatusBadge, StepCounts, dayLabel, dotClass, fmtDuration, fmtTime, type CallListItem, type CallStatus,
} from "./callsShared";

type Filter = "all" | "working" | "needs_you" | "done" | "failed";
const FILTERS: Array<{ id: Filter; label: string; match: (s: CallStatus) => boolean }> = [
  { id: "all", label: "All", match: () => true },
  { id: "working", label: "Working", match: (s) => ACTIVE.includes(s) || s === "sleeping" },
  { id: "needs_you", label: "Needs you", match: (s) => s === "waiting" || s === "paused" },
  { id: "done", label: "Done", match: (s) => s === "done" || s === "answered" },
  { id: "failed", label: "Failed", match: (s) => s === "failed" || s === "retrying" || s === "stopped" },
];

// The page's own base (/agent or /c/studio), so the detail opens in the same mode
export function callsBasePath(pathname: string) {
  const parts = pathname.split("/");
  const i = parts.indexOf("agent") !== -1 ? parts.indexOf("agent") : parts.indexOf("studio");
  return i !== -1 ? parts.slice(0, i + 1).join("/") : pathname.replace(/\/calls.*$/, "");
}

export const CallsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = `${callsBasePath(location.pathname)}/calls`;

  const [calls, setCalls] = useState<CallListItem[]>(() => readPageCache<CallListItem[]>("calls:all") || []);
  const [loading, setLoading] = useState(() => !readPageCache("calls:all"));
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const load = async (quiet = false) => {
    if (!quiet) setLoading(calls.length === 0);
    try {
      const res = await api.get("/api/calls?limit=200");
      if (res.data?.success) {
        setCalls(res.data.calls);
        writePageCache("calls:all", res.data.calls);
        setFailed(false);
      }
    } catch {
      if (!quiet) setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Live: the server says "calls:updated" after every write to one of this user's records (a new call, a line said,
  // a step done), and the list reloads (a burst of events reloads once). Timed reloads stay as a safety net: every
  // 10 seconds while a call is live or its work is running, every 30 seconds otherwise, and when the window
  // comes back in front
  const anyActive = calls.some((c) => ACTIVE.includes(c.status));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => { if (timer) return; timer = setTimeout(() => { timer = null; load(true); }, 400); };
    const socket = getSocket();
    socket?.on("calls:updated", soon);
    const t = setInterval(() => load(true), anyActive ? 10000 : 30000);
    const onFocus = () => { if (document.visibilityState !== "hidden") load(true); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      socket?.off("calls:updated", soon);
      if (timer) clearTimeout(timer);
      clearInterval(t); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyActive]);

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const needle = q.trim().toLowerCase();
    return calls.filter((c) => f.match(c.status) && (!needle || `${c.name} ${c.summary} ${c.project_name || ""}`.toLowerCase().includes(needle)));
  }, [calls, filter, q]);

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: CallListItem[] }> = [];
    for (const c of shown) {
      const day = dayLabel(c.started_at);
      const g = out[out.length - 1];
      if (g && g.day === day) g.items.push(c); else out.push({ day, items: [c] });
    }
    return out;
  }, [shown]);

  // (the page name is in the top bar; no title, subtitle or counters here, owner 2026-11-09)
  return (
    <div className="h-full flex flex-col bg-background relative z-10 px-6 py-6 md:px-10 md:py-8 max-w-5xl mx-auto w-full overflow-y-auto">
      {(calls.length > 0 || q) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-7">
          <div className="flex items-center gap-2.5 flex-1 bg-muted/40 dark:bg-white/5 border border-border/60 rounded-xl px-4 py-2.5 focus-within:border-foreground/20 transition-colors">
            <Search className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
            <input
              type="text"
              data-no-ring="true"
              placeholder="Search calls"
              className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none border-none focus:ring-0 focus-visible:ring-0 focus:outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap",
                  filter === f.id ? "bg-[#2C2C2C] text-[#F0EFED] dark:bg-[#F0EFED] dark:text-[#2C2C2C] shadow-sm" : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3.5">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[55%]" />
                <Skeleton className="h-3 w-[75%]" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ) : failed && calls.length === 0 ? (
        <div className="rounded-2xl border border-border/60 p-8 text-center">
          <p className="text-sm text-foreground font-medium">The calls could not be loaded.</p>
          <button onClick={() => load()} className="mt-3 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground cursor-pointer">Try again</button>
        </div>
      ) : calls.length === 0 ? (
        <EmptyCalls />
      ) : shown.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No calls match.</div>
      ) : (
        <div className="flex flex-col">
          {groups.map((g) => (
            <section key={g.day} className="mb-7">
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{g.day}</h3>
              <div className="rounded-2xl border border-border/60 divide-y divide-border/40 overflow-hidden bg-background">
                {g.items.map((c) => <CallRow key={c._id} call={c} onOpen={() => navigate(`${base}/${c._id}`)} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

function CallRow({ call, onOpen }: { call: CallListItem; onOpen: () => void }) {
  const O = ORIGIN[call.origin] || ORIGIN.call;
  const Icon = O.icon;
  const tone = STATUS[call.status]?.tone || "neutral";
  const c = call.counts || {};
  const line = call.summary || (call.status === "live" ? "On the call now…" : call.status === "queued" ? "Starting the work…" : call.status === "working" ? "Working on it…" : call.tasks ? `${call.tasks} task${call.tasks === 1 ? "" : "s"} saved on the call` : "");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-muted/40 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
    >
      <div className="relative w-12 h-12 rounded-xl bg-muted/60 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-foreground/80" />
        <span className={cn("absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ring-background", dotClass[tone], STATUS[call.status]?.pulse && "animate-pulse")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="font-semibold text-[16px] truncate">{call.name || "Call"}</h3>
          <StatusBadge status={call.status} className="hidden sm:inline-flex" />
        </div>
        {line && <p className="text-[14px] text-muted-foreground line-clamp-1 mt-1">{line}</p>}
        <div className="flex items-center gap-x-3.5 gap-y-1 flex-wrap mt-2 text-[12.5px] text-muted-foreground/80">
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(call.started_at)}{call.duration_ms > 0 ? ` · ${fmtDuration(call.duration_ms, { short: true })}` : ""}</span>
          {call.project_name && <span className="inline-flex items-center gap-1 truncate max-w-[220px]"><FolderPlus className="w-3.5 h-3.5" />{call.project_name}</span>}
          {(c.whatsapp_sent || 0) > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{c.whatsapp_sent} sent</span>}
          {((c.emails_read || 0) + (c.emails_sent || 0)) > 0 && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{(c.emails_read || 0) + (c.emails_sent || 0)}</span>}
          {(c.steps || 0) > 0 && <StepCounts total={c.steps || 0} failed={c.failed || 0} word={(c.steps || 0) - (c.failed || 0) === 1 ? "step done" : "steps done"} />}
        </div>
      </div>
      <ChevronRight className="w-[18px] h-[18px] text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-3.5 transition-colors" />
    </button>
  );
}

function EmptyCalls() {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-6 py-14 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/60 dark:bg-white/5 flex items-center justify-center">
        <Phone className="w-5 h-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold">No calls yet</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
        Call the Classgrid WhatsApp number from your verified phone. The call, and every step Classgrid AI takes after it, shows up here.
      </p>
    </div>
  );
}

export default CallsPage;
