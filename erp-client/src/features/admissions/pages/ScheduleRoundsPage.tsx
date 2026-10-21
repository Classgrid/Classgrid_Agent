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

import { Input } from "@/components/marketing_ui/input";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save, Calendar, Clock, Sparkles, GitCommit,
  Settings2, RefreshCw, ChevronRight, BarChart2,
  PieChart as PieIcon, Activity, TrendingUp,
  Play, Users, CheckCircle, AlertTriangle
} from "lucide-react";
import { StatCard } from "@/components/marketing_ui/StatCard";

import {
  getAdmissionConfigFull,
  updateAdmissionConfig,
  advanceRound,
  promoteWaitlist,
  getAdmissionAnalytics,
} from "../../admissions/api";

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export function ScheduleRoundsPage() {
  const qc = useQueryClient();

  const [cutoffDate, setCutoffDate]           = useState("");
  const [maxRounds, setMaxRounds]             = useState(3);
  const [currentRound, setCurrentRound]       = useState(1);
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [autoPromote, setAutoPromote]         = useState(false);
  const [feeDeadlineHours, setFeeDeadlineHours] = useState(48);
  const [cancellationHandling, setCancellationHandling] =
    useState<"return_to_pool" | "manual_review">("return_to_pool");

  const configQ    = useQuery({ queryKey: ["admission-config-full"], queryFn: getAdmissionConfigFull });
  const analyticsQ = useQuery({ queryKey: ["admission-analytics-schedule"], queryFn: () => getAdmissionAnalytics() });

  useEffect(() => {
    const cfg = configQ.data?.config;
    if (!cfg) return;
    if (cfg.cutoff_date) setCutoffDate(cfg.cutoff_date.split("T")[0]);
    const rc = cfg.admission_round || {};
    setMaxRounds(rc.max_rounds || 3);
    setCurrentRound(rc.current_round || 1);
    const wl = cfg.waitlist_and_deadlines || {};
    setWaitlistEnabled(wl.waitlist_enabled ?? true);
    setAutoPromote(wl.auto_promote_waitlist ?? false);
    setFeeDeadlineHours(wl.fee_payment_deadline_hours || 48);
    setCancellationHandling(wl.cancellation_handling || "return_to_pool");
  }, [configQ.data]);

  const saveMut = useMutation({
    mutationFn: (cfg: any) => updateAdmissionConfig({ admission_config: cfg }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admission-config-full"] }),
  });

  const advanceMut = useMutation({
    mutationFn: advanceRound,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admission-config-full"] }),
  });

  const promoteMut = useMutation({
    mutationFn: promoteWaitlist,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admission-config-full"] }),
  });

  const handleSave = () => {
    const base = configQ.data?.config;
    if (!base) return;
    saveMut.mutate({
      ...base,
      cutoff_date: cutoffDate ? new Date(cutoffDate).toISOString() : undefined,
      admission_round: { ...base.admission_round, max_rounds: maxRounds, current_round: currentRound },
      waitlist_and_deadlines: {
        ...base.waitlist_and_deadlines,
        waitlist_enabled: waitlistEnabled,
        auto_promote_waitlist: autoPromote,
        fee_payment_deadline_hours: feeDeadlineHours,
        cancellation_handling: cancellationHandling,
      },
    });
  };

  /* ── derived data ── */
  const roundHistory: any[] = configQ.data?.config?.admission_round?.round_history || [];
  const anal = analyticsQ.data;
  const funnel = anal?.summary?.funnel || {};

  /* ── chart data ── */
  const funnelPie = [
    { name: "Applied",     value: funnel.applied          || 0, color: "#34d399" },
    { name: "Verified",    value: funnel.verified          || 0, color: "#60a5fa" },
    { name: "Allotted",   value: funnel.allotted          || 0, color: "#818cf8" },
    { name: "Enrolled",   value: funnel.enrolled          || 0, color: "#10b981" },
    { name: "Waitlisted", value: funnel.waitlisted        || 0, color: "#f59e0b" },
    { name: "Rejected",   value: funnel.rejected          || 0, color: "#f87171" },
  ].filter((d) => d.value > 0);

  const roundBar = roundHistory.map((r: any) => ({
    round: `Round ${r.round_number}`,
    filled: r.seats_filled || 0,
    remaining: r.seats_remaining || 0,
  }));

  /* seats filled vs remaining donut (latest round) */
  const latestRound = roundHistory[roundHistory.length - 1];
  const seatsDonut = latestRound
    ? [
        { name: "Filled",     value: latestRound.seats_filled     || 0, color: "#34d399" },
        { name: "Remaining",  value: latestRound.seats_remaining  || 0, color: "#f87171" },
      ]
    : [
        { name: "No data", value: 1, color: "#94a3b8" },
      ];

  /* daily trend */
  const dailyTrend = (anal?.daily_trend || [])
    .map((d: any) => ({ day: d._id?.slice(5) || "", applications: d.count }))
    .slice(-14);

  /* fee deadline histogram buckets */
  const deadlineHist = [
    { bin: "24h",  count: feeDeadlineHours <= 24  ? 1 : 0 },
    { bin: "48h",  count: feeDeadlineHours === 48  ? 1 : 0 },
    { bin: "72h",  count: feeDeadlineHours === 72  ? 1 : 0 },
    { bin: "96h+", count: feeDeadlineHours >  72  ? 1 : 0 },
  ];

  const totalApps    = anal?.summary?.total_applications ?? 0;
  const convRate     = anal?.summary?.conversion_rate    ?? "0%";
  const feePaidCount = anal?.summary?.fee_paid_count     ?? 0;

  if (configQ.isLoading) {
    return (
      <div className="p-12 flex items-center justify-center gap-3 text-muted-foreground">
        <Sparkles className="w-5 h-5 animate-spin text-primary" /> Loading schedule config...
      </div>
    );
  }

  return (
    <div
      title="Schedule & Admission Rounds"
      description={`Currently on Round ${currentRound} of ${maxRounds}  ·  ${configQ.data?.structure_type?.toUpperCase().replace("_", " ")}`}
      breadcrumbs={[
        { label: "Admissions", to: "/dept/admissions/dashboard" },
        { label: "Configuration" },
        { label: "Schedule & Rounds" },
      ]}
      actions={
        <motion.button
          whileHover={{ scale: 1.03 }}
          onClick={handleSave}
          disabled={saveMut.isPending}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 bg-primary text-primary-foreground shadow flex items-center gap-2"
        >
          {saveMut.isPending ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Config
        </motion.button>
      }
    >
      <motion.div variants={stagger} initial="hidden" animate="show" >

        {/* ── KPIs ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Current Round"
            value={`${currentRound} / ${maxRounds}`}
            icon={<Activity className="w-4 h-4" />}
            trend="0 Admission rounds"
          />
          <StatCard
            title="Total Applications"
            value={totalApps.toLocaleString()}
            icon={<Users className="w-4 h-4" />}
            trend="8 This session"
          />
          <StatCard
            title="Conversion Rate"
            value={convRate}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <StatCard
            title="Fee Paid"
            value={`${feePaidCount} students`}
            icon={<CheckCircle className="w-4 h-4" />}
          />
        </motion.div>

        {/* ── Charts ── */}
        <motion.div variants={fadeUp}>
          <div title="Round & Pipeline Analytics" description="Live visualizations of the admission pipeline across rounds">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-primary" /> Admission Funnel Status
                </p>
                <div data={funnelPie.length ? funnelPie : [{ name: "No data", value: 1, color: "#94a3b8" }]} height={240} />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-400" /> Seats: Latest Round
                </p>
                <div data={seatsDonut} height={240} />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-400" /> Seats per Round
                </p>
                {roundBar.length > 0 ? (
                  <div
                    data={roundBar}
                    indexKey="round"
                    series={[
                      { key: "filled",    name: "Filled",     color: "#34d399" },
                      { key: "remaining", name: "Remaining",  color: "#f87171" },
                    ]}
                    stacked
                    height={240}
                  />
                ) : (
                  <div className="flex items-center justify-center h-60 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                    No round history yet
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-400" /> Daily Application Trend
                </p>
                <div
                  data={dailyTrend.length ? dailyTrend : [{ day: "—", applications: 0 }]}
                  indexKey="day"
                  series={[{ key: "applications", name: "Applications", color: "#34d399" }]}
                  height={200}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-400" /> Fee Deadline Window
                </p>
                <div data={deadlineHist} height={200} fill="hsl(var(--primary))" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Config Tabs ── */}
        <motion.div variants={fadeUp}>
          <div defaultValue="rounds">
            <div>
              <div value="rounds">
                <GitCommit className="w-4 h-4" /> Round Setup
              </div>
              <div value="waitlist">
                <Settings2 className="w-4 h-4" /> Waitlist & Deadlines
              </div>
              <div value="history">
                <Activity className="w-4 h-4" /> Round History
              </div>
              <div value="actions">
                <Play className="w-4 h-4" /> Quick Actions
              </div>
            </div>

            {/* ── Round Setup ── */}
            <div value="rounds">
              <div className="mt-4">
                <div title="Cap Round Configuration" description="Set cutoff date, round count, and current round">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" /> Cutoff Date
                      </label>
                      <Input
                        type="date"
                        value={cutoffDate}
                        onChange={(e) => setCutoffDate(e.target.value)}
                        
                      />
                      <p className="text-xs text-muted-foreground">
                        No new applications or admissions after this date.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Maximum Rounds</label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={maxRounds}
                        onChange={(e) => setMaxRounds(Number(e.target.value))}
                        
                      />
                      <p className="text-xs text-muted-foreground">Total number of merit list rounds.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Current Round</label>
                      <Input
                        type="number"
                        min={1}
                        max={maxRounds}
                        value={currentRound}
                        onChange={(e) => setCurrentRound(Number(e.target.value))}
                        
                      />
                      <p className="text-xs text-muted-foreground">Active round that candidates are allotted from.</p>
                    </div>
                  </div>

                  {/* Round progress bar */}
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-2">Round Progress</p>
                    <div className="flex gap-2">
                      {Array.from({ length: maxRounds }, (_, i) => i + 1).map((r) => (
                        <motion.div
                          key={r}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setCurrentRound(r)}
                          className={`flex-1 h-10 rounded-md flex items-center justify-center text-sm font-semibold cursor-pointer border transition-all ${
                            r < currentRound
                              ? "bg-primary/20 border-primary/40 text-primary"
                              : r === currentRound
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-muted/20 border-border text-muted-foreground"
                          }`}
                        >
                          R{r}
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Round 1</span>
                      <span>Round {maxRounds}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Waitlist & Deadlines ── */}
            <div value="waitlist">
              <div className="mt-4">
                <div title="Waitlist & Deadline Policies" description="Configure what happens when candidates miss deadlines or cancel">
                  <div className=" gap-4">
                    {/* Toggles */}
                    {[
                      {
                        label: "Enable Waitlist",
                        desc: "Allow students to be waitlisted when seats are full.",
                        val: waitlistEnabled,
                        set: setWaitlistEnabled,
                        icon: <Settings2 className="w-4 h-4 text-primary" />,
                      },
                      {
                        label: "Auto-Promote Waitlist",
                        desc: "Automatically allot seats when others cancel.",
                        val: autoPromote,
                        set: setAutoPromote,
                        icon: <RefreshCw className="w-4 h-4 text-emerald-400" />,
                        disabled: !waitlistEnabled,
                      },
                    ].map(({ label, desc, val, set, icon, disabled }) => (
                      <motion.div
                        key={label}
                        whileHover={{ scale: 1.005 }}
                        className={`flex items-center justify-between p-4 rounded-lg border border-border transition-all ${disabled ? "opacity-40 pointer-events-none" : "bg-muted/10"}`}
                      >
                        <div className="flex items-center gap-3">
                          {icon}
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                          </div>
                        </div>
                        <label >
                          <Input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} />
                          <span  />
                        </label>
                      </motion.div>
                    ))}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" /> Fee Payment Deadline
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={feeDeadlineHours}
                            onChange={(e) => setFeeDeadlineHours(Number(e.target.value))}
                            className=" pr-16"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                            hours
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Time given after seat allotment to pay fees. Unpaid = forfeited.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Seat Cancellation Policy</label>
                        <div
                          value={cancellationHandling}
                          onValueChange={(val: any) => setCancellationHandling(val)}
                          options={[
                            { label: "Return seat to Open Pool", value: "return_to_pool" },
                            { label: "Hold for Manual Review",    value: "manual_review"  },
                          ]}
                        />
                        <p className="text-xs text-muted-foreground">
                          {cancellationHandling === "return_to_pool"
                            ? "Seat immediately returns to the pool for the next round."
                            : "Seat is locked until an admin manually releases it."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Round History ── */}
            <div value="history">
              <div className="mt-4">
                <div title="Round History" description="Historical data of executed admission rounds">
                  {roundHistory.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-border rounded-lg text-muted-foreground">
                      <GitCommit className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No rounds executed yet</p>
                      <p className="text-sm mt-1">Advance the round to begin recording history.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {roundHistory.map((rh: any, i: number) => (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.005 }}
                          className="flex items-center justify-between p-4 bg-muted/10 border border-border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                              R{rh.round_number}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">Round {rh.round_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {rh.merit_list_published_at
                                  ? new Date(rh.merit_list_published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                  : "Not published yet"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-semibold text-primary">{rh.seats_filled ?? 0}</p>
                              <p className="text-xs text-muted-foreground">Filled</p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-muted-foreground">{rh.seats_remaining ?? 0}</p>
                              <p className="text-xs text-muted-foreground">Remaining</p>
                            </div>
                            <div variant={i === roundHistory.length - 1 ? "success" : "neutral"}>
                              {i === roundHistory.length - 1 ? "Latest" : "Done"}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div value="actions">
              <div className="mt-4">
                <div title="Quick Actions" description="Trigger round advancement and waitlist operations">
                  <div variant="warning" title="Caution" className="mb-6">
                    These actions are irreversible. Advancing a round publishes the merit list and notifies candidates.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div whileHover={{ scale: 1.01 }} className="p-5 border border-primary/30 bg-primary/5 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Play className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-semibold text-sm">Advance to Round {currentRound + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            Publishes merit list and closes Round {currentRound}.
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        disabled={advanceMut.isPending || currentRound >= maxRounds}
                        onClick={() => advanceMut.mutate()}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 bg-primary text-primary-foreground shadow w-full flex items-center justify-center gap-2"
                      >
                        {advanceMut.isPending ? <Sparkles className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        {currentRound >= maxRounds ? "Final Round Reached" : "Advance Round"}
                      </motion.button>
                      {advanceMut.isSuccess && (
                        <p className="text-xs text-primary mt-2 text-center">✅ Round advanced successfully.</p>
                      )}
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.01 }} className="p-5 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <RefreshCw className="w-5 h-5 text-amber-500" />
                        <div>
                          <p className="font-semibold text-sm">Promote Waitlist</p>
                          <p className="text-xs text-muted-foreground">
                            Allot seats to next waitlisted candidates immediately.
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        disabled={promoteMut.isPending || !waitlistEnabled}
                        onClick={() => promoteMut.mutate()}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground w-full flex items-center justify-center gap-2"
                      >
                        {promoteMut.isPending ? <Sparkles className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {waitlistEnabled ? "Promote Waitlist" : "Waitlist Disabled"}
                      </motion.button>
                      {promoteMut.isSuccess && (
                        <p className="text-xs text-amber-500 mt-2 text-center">✅ Waitlist promoted.</p>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
