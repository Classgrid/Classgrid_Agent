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

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Hash, Loader2, CheckCircle, ChevronRight,
  LayoutGrid, Users, Award, Armchair, DollarSign, UserCheck,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  enrollStudent, batchGeneratePRNs, allocateDivisions,
  getSeatMatrix, getExportUrl,
} from "../../admissions/api";
import { useApplications } from "../../admissions/queries/useApplications";
import type { AdmissionApplication } from "../../admissions/types";
import { ExportMenu } from "../components/SharedAdmissions";

import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";

const HIERARCHIES = [
  { id: "all",         label: "All Divisions" },
  { id: "school",      label: "School" },
  { id: "jr_college",  label: "Jr. College" },
  { id: "engineering", label: "Engineering" },
  { id: "coaching",    label: "Coaching" },
] as const;

type HierarchyId = typeof HIERARCHIES[number]["id"];

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(200 70% 52%)",
  "hsl(40 90% 55%)",
  "hsl(280 60% 55%)",
  "hsl(340 65% 50%)",
];

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export function EnrollmentPage() {
  const qc = useQueryClient();
  const [activeHierarchy, setActiveHierarchy] = useState<HierarchyId>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("verified");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const hierarchyParam = activeHierarchy === "all" ? undefined : activeHierarchy;

  // ── Real API Data ──
  const { data: appData, isLoading } = useApplications({
    status: statusFilter,
    hierarchy_id: hierarchyParam,
    search: search || undefined,
    limit: 200,
  });

  const seatMatrix = useQuery({
    queryKey: ["seat-matrix"],
    queryFn: getSeatMatrix,
  });

  const apps: AdmissionApplication[] = appData?.applications ?? [];

  // ── Mutations (connected to real backend) ──
  const enrollMut = useMutation({
    mutationFn: (applicationId: string) => enrollStudent(applicationId),
    onSuccess: (data: any) => {
      setSuccessMsg(`${data.message || "Enrolled successfully"}. PRN: ${data.prn || "N/A"}`);
      setEnrollingId(null);
      setPassword("");
      qc.invalidateQueries({ queryKey: ["admission-applications"] });
    },
  });

  const prnMut = useMutation({
    mutationFn: batchGeneratePRNs,
    onSuccess: () => {
      setSuccessMsg("PRNs generated for all eligible candidates.");
      qc.invalidateQueries({ queryKey: ["admission-applications"] });
    },
  });

  const divisionMut = useMutation({
    mutationFn: allocateDivisions,
    onSuccess: () => {
      setSuccessMsg("Divisions allocated successfully.");
      qc.invalidateQueries({ queryKey: ["admission-applications"] });
    },
  });

  // ── Charts Data ──
  const { feeDonut, categoryBar, metrics } = useMemo(() => {
    const paid = apps.filter(a => a.fee_paid).length;
    const pending = apps.length - paid;
    const enrolled = apps.filter(a => a.status === "enrolled").length;

    const catCounts: Record<string, number> = {};
    apps.forEach(a => {
      const cat = a.category || "General";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    return {
      feeDonut: [
        { name: "Paid", value: paid, color: "hsl(var(--primary))" },
        { name: "Pending", value: pending, color: "hsl(var(--accent))" },
      ],
      categoryBar: Object.entries(catCounts).map(([name, count]) => ({ name, count })),
      metrics: { total: apps.length, paid, pending, enrolled },
    };
  }, [apps]);

  const enrolledCount = metrics.enrolled;
  const pendingFeeCount = metrics.pending;
  const missingPrnCount = apps.filter((a) => !a.prn).length;
  const conversionRate = metrics.total > 0 ? Math.round((metrics.enrolled / metrics.total) * 100) : 0;

  // ── Table Columns ──
  const columns: ColumnDef<AdmissionApplication>[] = [
    {
      accessorKey: "full_name",
      header: "Candidate",
      cell: ({ row }) => (
        <div >
          <div name={row.original.full_name} size="sm" />
          <div>
            <div className=" font-semibold">{row.original.full_name}</div>
            <small className=" font-mono">
              {row.original.en_number ? `EN: ${row.original.en_number}` : row.original.phone || "—"}
            </small>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="text-foreground">{row.original.category || "General"}</span>
          <div variant="outline" size="sm" className="w-fit">{row.original.entry_mode}</div>
        </div>
      ),
    },
    {
      accessorKey: "merit_score",
      header: "Merit",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.merit_score > 0 ? `${row.original.merit_score.toFixed(2)}%` : "—"}
        </span>
      ),
    },
    {
      accessorKey: "fee_paid",
      header: "Fee Status",
      cell: ({ row }) => (
        row.original.fee_paid ? (
          <div variant="success">Paid</div>
        ) : (
          <div variant="warning">Pending</div>
        )
      ),
    },
    {
      accessorKey: "prn",
      header: "PRN",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.prn || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        const variant = s === "enrolled" ? "success" : s === "verified" ? "info" : s === "fee_pending" ? "warning" : "neutral";
        return <div variant={variant}>{s.replace("_", " ")}</div>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const app = row.original;
        const canEnroll = app.status === "verified" || app.status === "fee_pending" || app.status === "allotted";
        const isThisEnrolling = enrollingId === app._id;

        if (app.status === "enrolled") {
          return <div variant="success">Enrolled ✓</div>;
        }

        if (isThisEnrolling) {
          return (
            <div className="flex gap-2 items-center">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set password..."
                className="w-32 text-xs px-2 py-1.5 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button
                onClick={() => enrollMut.mutate(app._id)}
                disabled={!password || enrollMut.isPending}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 bg-primary text-primary-foreground shadow inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2--sm"
              >
                {enrollMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
              </Button>
              <Button onClick={() => { setEnrollingId(null); setPassword(""); }} className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2--ghost inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2--sm">
                ✕
              </Button>
            </div>
          );
        }

        return (
          <Button
            onClick={() => setEnrollingId(app._id)}
            disabled={!canEnroll}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2--sm"
          >
            Enroll <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        );
      },
    },
  ];

  return (
    <div
      title="Final Enrollment"
      description="Allocate divisions, generate PRNs, and officially enroll verified candidates."
      breadcrumbs={[
        { label: "Admissions", to: "/dept/admissions/dashboard" },
        { label: "Enrollment" },
      ]}
      actions={
        <div >
          <Button
            onClick={() => divisionMut.mutate()}
            disabled={divisionMut.isPending}
            variant="outline"
          >
            {divisionMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutGrid className="w-4 h-4" />}
            Allocate Divisions
          </Button>
          <Button
            onClick={() => prnMut.mutate()}
            disabled={prnMut.isPending}
            variant="outline"
          >
            {prnMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />}
            Batch Generate PRNs
          </Button>
          <ExportMenu
            data={apps}
            filename="enrollment-data"
            columns={["full_name", "en_number", "category", "merit_score", "status", "prn"]}
          />
        </div>
      }
    >
      {/* ── Hierarchy Tabs ── */}
      <div >
        {HIERARCHIES.map(h => (
          <Button
            key={h.id}
            onClick={() => setActiveHierarchy(h.id)}
            className={`${activeHierarchy === h.id ? " " : ""}`}
          >
            {h.label}
            {activeHierarchy === h.id && (
              <motion.span  layoutId="hierarchy-indicator-enroll" />
            )}
          </Button>
        ))}
      </div>

      {/* ── Success / Error Alerts ── */}
      {successMsg && (
        <div variant="success" title="Success">{successMsg}</div>
      )}
      {(enrollMut.isError || prnMut.isError || divisionMut.isError) && (
        <div variant="danger" title="Error">
          {(enrollMut.error as Error)?.message || (prnMut.error as Error)?.message || (divisionMut.error as Error)?.message || "Operation failed."}
        </div>
      )}

      {/* ── Metric Cards ── */}
      <motion.div className=" mb-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <div title="Total Enrolled" value={enrolledCount} icon={<CheckCircle className="w-5 h-5" />} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <div title="Fee Collection Pending" value={pendingFeeCount} icon={<DollarSign className="w-5 h-5" />} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <div title="Missing PRN" value={missingPrnCount} icon={<UserCheck className="w-5 h-5" />} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <div title="Conversion Rate" value={`${conversionRate}%`} icon={<Users className="w-5 h-5" />} />
        </motion.div>
      </motion.div>

      {/* ── Charts ── */}
      <motion.div className=" mb-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <div title="Fee Payment Status" description="Paid vs Pending for enrollment candidates.">
            {isLoading ? (
              <div ><Loader2 className="animate-spin w-6 h-6" /></div>
            ) : (feeDonut[0]?.value ?? 0) + (feeDonut[1]?.value ?? 0) > 0 ? (
              <div data={feeDonut} height={220} />
            ) : (
              <div title="No data" description="No candidates in this filter." />
            )}
          </div>
        </motion.div>
        <motion.div variants={fadeUp}>
          <div title="Category Distribution" description="Reservation category split.">
            {isLoading ? (
              <div ><Loader2 className="animate-spin w-6 h-6" /></div>
            ) : categoryBar.length > 0 ? (
              <div data={categoryBar} indexKey="name" series={[{ key: "count", color: "hsl(var(--accent))", name: "Candidates" }]} height={220} />
            ) : (
              <div title="No data" description="No category data." />
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Seat Matrix (Live from backend) ── */}
      {seatMatrix.data && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-6">
          <div title="Live Seat Matrix" description="Real-time seat availability from the seat matrix service.">
            {seatMatrix.isLoading ? (
              <div ><Loader2 className="animate-spin w-6 h-6" /></div>
            ) : (
              <div >
                {(Array.isArray(seatMatrix.data) ? seatMatrix.data : seatMatrix.data?.matrix || []).map((entry: any, i: number) => (
                  <div key={i} className="p-4 bg-card border border-border rounded-lg">
                    <div className="text-sm font-medium text-foreground mb-1">{entry.hierarchy_name || entry.name || `Seat ${i + 1}`}</div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Total: {entry.total_seats ?? entry.total ?? "—"}</span>
                      <span>Filled: {entry.filled ?? entry.allocated ?? "—"}</span>
                      <span className="text-primary font-semibold">
                        Available: {entry.available ?? ((entry.total_seats ?? entry.total ?? 0) - (entry.filled ?? entry.allocated ?? 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Data Table ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div title="Enrollment Candidates" noPadding>
          <div className="flex items-center gap-2 p-2 border-b border-border">
            <div
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by name, EN number, phone..."
              filters={
                <div
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { label: "Verified (Ready)", value: "verified" },
                    { label: "Fee Pending", value: "fee_pending" },
                    { label: "Allotted", value: "allotted" },
                    { label: "Enrolled", value: "enrolled" },
                    { label: "All Stages", value: "" },
                  ]}
                />
              }
            />
          </div>

          {isLoading ? (
            <div ><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div
              columns={columns}
              data={apps}
              pageSize={15}
              emptyMessage="No candidates match your current filters."
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
