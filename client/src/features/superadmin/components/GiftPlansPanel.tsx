// Gift plans to many people at once (owner, 2026-11-17: "grant panel should rebuild to gifting multiple people at a
// time with different plans"). The same look as the old Grant Credits panel: search, filters, tap people to pick them,
// "Select All / Add Separate / None". Same plan for everyone, or "Add Separate" to give each person their own plan.
// Saved one person at a time by setUserPlan (PUT /api/super-admin/ai-usage/users/:id/plan), which keeps the reason on
// the plan and in the admin audit log and emails the person.
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { SuperadminFilterBar } from "@/features/superadmin/components/SuperadminFilterBar";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/marketing_ui/select";
import { Button } from "@/components/marketing_ui/button";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { Textarea } from "@/components/marketing_ui/textarea";
import { apiClient as api } from "@/lib/apiClient";
import { usePeople, useAiPlans, giftablePlans, invalidatePlanQueries, type PersonRow } from "@/features/superadmin/queries/useAiUsage";
import { errorText } from "@/features/superadmin/components/ai-usage/planText";

// A day as "YYYY-MM-DD" <-> a Date, for the app's own calendar (NikhilTimeCalendar) instead of the browser's date box
const dateOf = (iso: string) => (iso ? new Date(`${iso}T00:00:00`) : undefined);
const isoOf = (d?: Date) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "");

const PERIODS = [
  { key: "1", label: "1 month", months: 1 },
  { key: "3", label: "3 months", months: 3 },
  { key: "6", label: "6 months", months: 6 },
  { key: "12", label: "1 year", months: 12 },
  { key: "date", label: "Pick a date", months: 0 },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dayText = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function GiftPlansPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePeople({ q: search, plan: planFilter, how: "", page, limit: 100 });
  const { data: plansData } = useAiPlans();
  const plans = useMemo(() => giftablePlans(plansData?.plans), [plansData]);

  // Picked people are kept by id, so they stay picked across searches and pages
  const [picked, setPicked] = useState<Record<string, PersonRow>>({});
  const [isSeparateMode, setIsSeparateMode] = useState(false);
  const [rowPlan, setRowPlan] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("1");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  const rows = data?.data ?? [];
  const pickedList = Object.values(picked);
  const defaultPlan = plan || plans[0]?.key || "";
  const planOf = (id: string) => (isSeparateMode ? rowPlan[id] || defaultPlan : defaultPlan);
  const planName = (key: string) => plans.find((p) => p.key === key)?.name || key;
  const choice = PERIODS.find((p) => p.key === period) || PERIODS[0];
  const endOk = choice.months > 0 || (!!endDate && endDate > todayIso());
  const end = choice.months > 0 ? (() => { const d = new Date(); d.setMonth(d.getMonth() + choice.months); return d; })() : endOk ? new Date(`${endDate}T23:59:59`) : null;

  const toggle = (row: PersonRow) => {
    if (row.staff) return;
    setPicked((prev) => {
      const next = { ...prev };
      if (next[row.id]) delete next[row.id];
      else next[row.id] = row;
      return next;
    });
  };

  const reset = () => {
    setPicked({}); setRowPlan({}); setIsSeparateMode(false); setReason(""); setTried(false);
    setIsConfirmOpen(false); setPeriod("1"); setEndDate("");
  };
  const close = () => { if (busy) return; reset(); onClose(); };

  const giftAll = async () => {
    setTried(true);
    if (!reason.trim() || !end || !endOk || !pickedList.length) return;
    setBusy(true);
    const failed: string[] = [];
    let done = 0;
    for (const person of pickedList) {
      const planId = planOf(person.id);
      try {
        await api.put(`/api/super-admin/ai-usage/users/${person.id}/plan`, {
          planId, reason: reason.trim(), ...(choice.months ? { months: choice.months } : { expires_at: end.toISOString() }),
        });
        done++;
      } catch (e) {
        failed.push(`${person.name || person.email}: ${errorText(e, "could not give the plan")}`);
      }
    }
    setBusy(false);
    invalidatePlanQueries(queryClient);
    if (done) toast.success(`Plan given to ${done} ${done === 1 ? "person" : "people"} until ${dayText(end)}. Each one gets an email.`);
    if (failed.length) toast.error(`Not given to ${failed.length}: ${failed.join("; ")}`);
    if (!failed.length) { reset(); onClose(); }
  };

  const columns = [
    {
      key: "name", header: "Name", width: "w-72", accent: true,
      render: (_: unknown, row: PersonRow) => (
        <div className="flex items-center gap-3">
          {row.photo ? (
            <img src={row.photo} alt={row.name} className="w-8 h-8 rounded-full object-cover border border-border bg-muted shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted border border-border shrink-0 flex items-center justify-center text-xs font-semibold text-muted-foreground">
              {(row.name || row.email || "?")[0]}
            </div>
          )}
          <span className="text-sm font-semibold text-foreground truncate">{row.name || row.email}</span>
        </div>
      ),
    },
    { key: "email", header: "Email", width: "w-64", render: (val: string) => <span className="text-xs text-muted-foreground truncate">{val}</span> },
    {
      key: "plan", header: "Plan now", width: "w-32",
      render: (_: unknown, row: PersonRow) => (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground inline-block">
          {row.staff ? "Staff" : row.plan?.name || "Free"}
        </span>
      ),
    },
    ...(isSeparateMode
      ? [{
          key: "give", header: "Give plan", width: "w-44",
          render: (_: unknown, row: PersonRow) => row.staff ? null : (
            <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Select value={rowPlan[row.id] || defaultPlan} onValueChange={(v) => { setRowPlan((p) => ({ ...p, [row.id]: v as string })); setPicked((p) => ({ ...p, [row.id]: row })); }}>
                <SelectTrigger className="h-8 w-[130px]"><SelectValue>{planName(rowPlan[row.id] || defaultPlan)}</SelectValue></SelectTrigger>
                <SelectContent className="z-[500]">
                  <SelectGroup>{plans.map((p) => <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>)}</SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ),
        }]
      : []),
    {
      key: "select", header: "", width: "w-14",
      render: (_: unknown, row: PersonRow) => {
        const on = !!picked[row.id];
        return (
          <div className="flex justify-end pr-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${row.staff ? "opacity-30 border-border" : on ? "border-blue-500 bg-blue-500" : "border-border"}`}>
              {on && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="gift-plans-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-5xl h-[85vh] flex flex-col bg-background border border-border rounded-2xl shadow-xl overflow-hidden relative"
          >
            <div className="flex-1 min-h-0 px-4 sm:px-6 py-5 flex flex-col gap-4">
              <div className="shrink-0 pr-10">
                <h2 className="text-base font-semibold text-foreground">Gift plans</h2>
                <p className="text-sm text-muted-foreground">Pick people, then give them a plan. Use Add Separate to give each person a different plan.</p>
              </div>

              <div className="shrink-0">
                <SuperadminFilterBar searchQuery={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search by name or email...">
                  <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v as string); setPage(1); }}>
                    <SelectTrigger className="h-9 px-3 w-[140px] rounded-full border border-dashed border-border bg-transparent shadow-sm">
                      <SelectValue>{planFilter === "all" ? "All plans" : planFilter === "free" ? "Free" : planName(planFilter)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-[400]">
                      <SelectGroup>
                        <SelectItem value="all">All plans</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        {plans.map((p) => <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select
                    value={isSeparateMode ? "separate" : ""}
                    onValueChange={(val) => {
                      if (val === "all") setPicked((prev) => { const next = { ...prev }; rows.filter((r) => !r.staff).forEach((r) => { next[r.id] = r; }); return next; });
                      if (val === "none") { setPicked({}); setIsSeparateMode(false); }
                      if (val === "separate") setIsSeparateMode(true);
                    }}
                  >
                    <SelectTrigger className="h-9 px-3 w-[150px] rounded-full border border-dashed border-border bg-transparent shadow-sm">
                      <span className="text-sm">{isSeparateMode ? "Add Separate" : "Select All / None"}</span>
                    </SelectTrigger>
                    <SelectContent className="z-[500]">
                      <SelectGroup>
                        <SelectItem value="all">Select All</SelectItem>
                        <SelectItem value="separate">Add Separate</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </SuperadminFilterBar>
              </div>

              <DataTable
                columns={columns}
                rows={rows}
                isLoading={isLoading}
                emptyMessage="No people found."
                onRowClick={(row: PersonRow) => toggle(row)}
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar"
              />

              {(data?.pages ?? 1) > 1 && (
                <div className="shrink-0 flex items-center justify-end gap-2 text-sm text-muted-foreground">
                  <span>Page {page} of {data?.pages}</span>
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Back</Button>
                  <Button type="button" variant="outline" size="sm" disabled={page >= (data?.pages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              )}

              <AnimatePresence>
                {pickedList.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: 12, height: 0 }} transition={{ duration: 0.25 }}
                    className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between border-t border-border pt-4 mt-2 gap-3"
                  >
                    <div className="text-sm shrink-0">
                      <span className="font-semibold text-foreground">{pickedList.length}</span>{" "}
                      <span className="text-muted-foreground">{pickedList.length === 1 ? "person" : "people"} selected</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {!isSeparateMode && (
                        <Select value={defaultPlan} onValueChange={(v) => setPlan(v as string)}>
                          <SelectTrigger className="h-10 w-[130px]"><SelectValue>{planName(defaultPlan)}</SelectValue></SelectTrigger>
                          <SelectContent className="z-[500]">
                            <SelectGroup>{plans.map((p) => <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>)}</SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                      <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
                        <SelectTrigger className="h-10 w-[140px]"><SelectValue>{choice.label}</SelectValue></SelectTrigger>
                        <SelectContent className="z-[500]">
                          <SelectGroup>{PERIODS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectGroup>
                        </SelectContent>
                      </Select>
                      {period === "date" && (
                        <NikhilTimeCalendar value={dateOf(endDate)} onChange={(d) => setEndDate(isoOf(d))} showTime={false} popDirection="up" placeholder="End date" className="w-[170px] h-10 border border-input bg-background" />
                      )}
                      <button
                        type="button"
                        onClick={() => { setTried(false); setIsConfirmOpen(true); }}
                        disabled={!endOk || !defaultPlan}
                        className="h-10 px-6 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
                      >
                        Gift Plans
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={close} className="absolute top-4 right-4 z-[100] p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Close">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>
      )}

      {isConfirmOpen && (
        <motion.div
          key="gift-plans-confirm-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6"
          onClick={() => { if (!busy) setIsConfirmOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-md bg-background border border-border rounded-xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Confirm Gift Plans</h2>
              <button onClick={() => { if (!busy) setIsConfirmOpen(false); }} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-0">
              {pickedList.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-sm">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">{person.name || person.email}</span>
                    <span className="text-xs text-muted-foreground truncate">{person.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ml-2">
                    <Gift className="w-3.5 h-3.5" />
                    {planName(planOf(person.id))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-4 border-t border-border bg-muted/30 flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">
                Until <span className="font-medium text-foreground">{end ? dayText(end) : "-"}</span>. Each one gets an email.
              </span>
              <Textarea
                rows={2} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} maxLength={300}
                placeholder="Reason, for example: thanks for the bug reports" className="min-h-[64px]"
                fieldState={tried && !reason.trim() ? "error" : "normal"}
              />
              {tried && !reason.trim() && <p className="text-xs text-red-500">Write why you are giving this plan.</p>}
            </div>

            <div className="p-4 border-t border-border bg-card">
              <button
                onClick={giftAll}
                disabled={busy}
                className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
              >
                {busy ? "Giving..." : `Gift plans to ${pickedList.length} ${pickedList.length === 1 ? "person" : "people"}`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
