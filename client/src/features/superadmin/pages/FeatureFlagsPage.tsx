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
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

// Feature flags (rebuilt 2026-11-17, owner: "find all features, like voice to voice, image, list it, and build feature
// flags for it"). One switch per Classgrid AI feature, grouped like the app (chat and models, voice, images...). The
// list itself comes from the server (services/feature-flag.service.js), which also enforces every switch: turning a
// feature off stops it for everyone, super admins included, within a few seconds. Turning off asks first; turning
// back on is immediate. Looks like the Plans page (PlanConfigPanel.tsx): cards with a small icon square and a line.
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessagesSquare, Mic, ImageIcon, FolderGit2, FileText, MessageCircle, IndianRupee, Sparkles, Search, Power, RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Switch } from "@/components/marketing_ui/switch";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Spinner } from "@/components/marketing_ui/spinner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/marketing_ui/dialog";
import { getSocket } from "@/lib/socketClient";
import { FEATURE_FLAGS_KEY, useFeatureFlags, useToggleFeatureFlag } from "../queries/useConfig";
import type { FeatureFlag, FeatureFlagGroup } from "../services/superAdminApi";

// The icon of each group (the server sends the groups and their names; an unknown group gets the "Other" icon)
const GROUP_ICONS: Record<string, LucideIcon> = {
  chat: MessagesSquare,
  voice: Mic,
  images: ImageIcon,
  studio: FolderGit2,
  docs: FileText,
  messaging: MessageCircle,
  payments: IndianRupee,
  other: Sparkles,
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const changedLine = (f: FeatureFlag) => {
  if (!f.changedAt) return null;
  const who = f.changedBy?.name || f.changedBy?.email || "";
  return `${f.isEnabled ? "Turned on" : "Turned off"}${who ? ` by ${who}` : ""} on ${when(f.changedAt)}`;
};

export function FeatureFlagsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useFeatureFlags();
  const toggle = useToggleFeatureFlag();
  const [search, setSearch] = useState("");
  const [confirmOff, setConfirmOff] = useState<FeatureFlag | null>(null);

  // Another super admin switched a flag: read the list again at once
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEY });
    socket.on("platform_feature_flags_updated", refresh);
    return () => {
      socket.off("platform_feature_flags_updated", refresh);
    };
  }, [qc]);

  const flags: FeatureFlag[] = data?.data ?? [];
  const groups: FeatureFlagGroup[] = useMemo(() => {
    const known = data?.groups ?? [];
    // (a flag whose group the server didn't list still shows, under its own group id)
    const extra = [...new Set(flags.map((f) => f.group))].filter((g) => !known.some((k) => k.id === g)).map((id) => ({ id, label: id }));
    return [...known, ...extra];
  }, [data, flags]);

  const query = search.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!query) return flags;
    const groupLabel = (id: string) => groups.find((g) => g.id === id)?.label.toLowerCase() || "";
    return flags.filter((f) =>
      f.name.toLowerCase().includes(query) ||
      f.description.toLowerCase().includes(query) ||
      f.key.toLowerCase().includes(query) ||
      groupLabel(f.group).includes(query)
    );
  }, [flags, groups, query]);

  // The counts are of the whole list (the search only narrows what is shown)
  const offCount = flags.filter((f) => !f.isEnabled).length;
  const onCount = flags.length - offCount;
  const pendingKey = toggle.isPending ? toggle.variables?.key : null;

  const setFlag = (f: FeatureFlag, isEnabled: boolean) =>
    toggle.mutate(
      { key: f.key, isEnabled },
      {
        onSuccess: () => {
          toast.success(isEnabled ? `${f.name} is on again.` : `${f.name} is off for everyone.`);
          setConfirmOff(null);
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || `Could not change ${f.name}. Please try again.`),
      }
    );

  // Turning off asks first; turning on happens at once
  const onSwitch = (f: FeatureFlag, wantOn: boolean) => {
    if (wantOn) setFlag(f, true);
    else setConfirmOff(f);
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl mx-auto px-4 py-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Spinner className="w-3.5 h-3.5 mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Counts and search */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Features", value: flags.length, tone: "text-foreground" },
            { label: "On", value: onCount, tone: "text-foreground" },
            { label: "Off", value: offCount, tone: offCount ? "text-amber-600 dark:text-amber-400" : "text-foreground" },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 min-w-0">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className={`text-2xl font-semibold ${c.tone}`}>{isLoading ? "–" : c.value}</div>
            </div>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features"
            aria-label="Search features"
            className="h-10 pl-9 text-sm"
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="w-full h-40 rounded-xl" />)}
        </div>
      )}

      {isError && !isLoading && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-foreground">Could not load the feature flags.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      )}

      {!isLoading && !isError && shown.length === 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 text-sm text-muted-foreground">
          {query ? `No feature matches "${search.trim()}".` : "No features to show."}
        </div>
      )}

      {!isLoading && !isError && groups.map((g) => {
        const items = shown.filter((f) => f.group === g.id);
        if (!items.length) return null;
        const all = flags.filter((f) => f.group === g.id);
        const off = all.filter((f) => !f.isEnabled).length;
        const Icon = GROUP_ICONS[g.id] || Sparkles;
        return (
          <section key={g.id} className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-foreground" /></span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">{g.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {all.length} {all.length === 1 ? "feature" : "features"}, {off ? <span className="text-amber-600 dark:text-amber-400">{off} off</span> : "all on"}
                </p>
              </div>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {items.map((f) => {
                const line = changedLine(f);
                const busy = pendingKey === f.key;
                return (
                  <li key={f.key} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{f.name}</span>
                        {!f.isEnabled && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            <Power className="w-3 h-3" /> Off
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                      {line && <p className="text-[11px] text-muted-foreground/80 mt-1">{line}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      {busy && <Spinner className="w-3.5 h-3.5" />}
                      <Switch
                        checked={f.isEnabled}
                        disabled={toggle.isPending}
                        aria-label={`${f.name}: ${f.isEnabled ? "on" : "off"}`}
                        onCheckedChange={(on) => onSwitch(f, on)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* Turning a feature off asks first */}
      <Dialog open={!!confirmOff} onOpenChange={(o) => { if (!o && !toggle.isPending) setConfirmOff(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Turn off {confirmOff?.name}?</DialogTitle>
            <DialogDescription>
              {confirmOff?.name} stops for everyone within a few seconds, super admins included. People who try it are told it is turned off for now. You can turn it back on here at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOff(null)} disabled={toggle.isPending}>Cancel</Button>
            <Button variant="destructive" isLoading={toggle.isPending} onClick={() => confirmOff && setFlag(confirmOff, false)}>
              Turn off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
