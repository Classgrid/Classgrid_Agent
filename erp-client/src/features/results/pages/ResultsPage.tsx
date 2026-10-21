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

import React, { useState } from "react";
import {
  Loader,
  GraduationCap,
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { useStudentResults, useStudentCgpa, StudentResult } from "../queries/useStudentResults";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";

export function ResultsPage() {
  const { data: user } = useCurrentUser();
  const { data, isLoading, error } = useStudentResults();
  const studentId = user?._id || user?.id || "";
  const { data: cgpaData } = useStudentCgpa(studentId);
  const [activeTab, setActiveTab] = useState<"current" | "cumulative">("current");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader size={36} className="animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading your results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertTriangle size={48} className="text-destructive" />
        <h2 className="text-xl font-bold">Unable to load results</h2>
        <p className="text-muted-foreground max-w-md">
          {(error as any)?.message || "Something went wrong while fetching your academic results. Please try again."}
        </p>
      </div>
    );
  }

  const results = data?.results || [];
  const student = data?.student;

  if (results.length === 0) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-4 border-b border-border pb-4">
          <p className="text-sm font-medium text-muted-foreground">Academic Performance</p>
          <h1 className="text-2xl font-bold tracking-tight">My Results</h1>
        </header>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-dashed rounded-lg bg-card mt-6">
          <GraduationCap size={48} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold">No Published Results Yet</h2>
          <p className="text-muted-foreground max-w-md">
            Your results will appear here once the examination cell has published them.
          </p>
        </div>
      </div>
    );
  }

  // Sort by semester/academic year to show latest first
  const sorted = [...results].sort((a, b) => {
    const semA = parseInt(a.result_schemes?.semester || "0");
    const semB = parseInt(b.result_schemes?.semester || "0");
    return semB - semA;
  });

  const latestResult = sorted[0];
  const isCollegeMode = latestResult?.result_schemes?.rules_json?.mode === "college";

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4 border-b border-border pb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Academic Performance</p>
          <h1 className="text-2xl font-bold tracking-tight">My Results</h1>
          {student && (
            <p className="text-sm text-muted-foreground mt-1">
              {student.name} {student.prn ? `• PRN: ${student.prn}` : ""}
            </p>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-border mt-6">
        <Button
          onClick={() => setActiveTab("current")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "current"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          Semester Results
        </Button>
        {isCollegeMode && (
          <Button
            onClick={() => setActiveTab("cumulative")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "cumulative"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            Cumulative CGPA
          </Button>
        )}
      </div>

      <div className="mt-6">
        {activeTab === "current" ? (
          <SemesterResults results={sorted} isCollegeMode={isCollegeMode} />
        ) : (
          <CumulativeView cgpaData={cgpaData || null} />
        )}
      </div>
    </div>
  );
}

// ─── Semester Results View ───────────────────────────────

function SemesterResults({ results, isCollegeMode }: { results: StudentResult[]; isCollegeMode: boolean }) {
  return (
    <div className="space-y-8">
      {results.map((result) => (
        <SemesterCard key={result.id} result={result} isCollegeMode={isCollegeMode} />
      ))}
    </div>
  );
}

function SemesterCard({ result, isCollegeMode }: { result: StudentResult; isCollegeMode: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const scheme = result.result_schemes;
  const subjects = result.result_detail || [];

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pass: { color: "text-green-500", icon: <CheckCircle size={18} />, label: "PASS" },
    distinction: { color: "text-emerald-500", icon: <Award size={18} />, label: "DISTINCTION" },
    first_class: { color: "text-blue-500", icon: <Award size={18} />, label: "FIRST CLASS" },
    higher_second_class: { color: "text-sky-500", icon: <CheckCircle size={18} />, label: "HIGHER SECOND" },
    compartment: { color: "text-amber-500", icon: <AlertTriangle size={18} />, label: "COMPARTMENT" },
    fail: { color: "text-red-500", icon: <XCircle size={18} />, label: "FAIL" },
  };

  const st = statusConfig[result.status] || statusConfig.pass;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Scheme Header */}
      <div
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="text-lg font-bold">{scheme?.name || "Result"}</h3>
          <p className="text-sm text-muted-foreground">
            {scheme?.academic_year || ""} {scheme?.semester ? `• Semester ${scheme.semester}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1 font-semibold ${st.color}`}>
            {st.icon} {st.label}
          </span>
          {expanded ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 pb-4">
            {isCollegeMode && result.sgpa != null && (
              <StatCard icon={<TrendingUp size={20} />} label="SGPA" value={result.sgpa.toFixed(2)} />
            )}
            {isCollegeMode && result.earn_credits != null && (
              <StatCard icon={<BookOpen size={20} />} label="Credits Earned" value={`${result.earn_credits} / ${result.total_credits}`} />
            )}
            <StatCard icon={<Award size={20} />} label="Percentage" value={`${(result.percentage ?? 0).toFixed(2)}%`} />
            <StatCard icon={<GraduationCap size={20} />} label="Grade" value={result.grade} />
            {!isCollegeMode && (
              <StatCard icon={<BookOpen size={20} />} label="Marks" value={`${result.total_marks} / ${result.max_total_marks}`} />
            )}
            {result.scheme_rank && (
              <StatCard icon={<Award size={20} />} label="Rank" value={`#${result.scheme_rank}`} />
            )}
          </div>

          {/* Subjects Table */}
          <div className="px-5 pb-5">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left py-3 px-4 font-semibold">Subject</th>
                    <th className="text-center py-3 px-4 font-semibold">Type</th>
                    {isCollegeMode && <th className="text-center py-3 px-4 font-semibold">Credits</th>}
                    <th className="text-center py-3 px-4 font-semibold">Marks</th>
                    <th className="text-center py-3 px-4 font-semibold">Grade</th>
                    {isCollegeMode && <th className="text-center py-3 px-4 font-semibold">GP</th>}
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subj, i) => {
                    const passed = !subj.is_absent && subj.marks_obtained >= subj.pass_marks;
                    return (
                      <tr key={subj.subject_id || i} className="border-t border-border hover:bg-accent/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium">{subj.subject_name}</div>
                          {subj.subject_code && <span className="text-xs text-muted-foreground">{subj.subject_code}</span>}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {subj.course_type}
                          </span>
                        </td>
                        {isCollegeMode && <td className="text-center py-3 px-4">{subj.credits}</td>}
                        <td className="text-center py-3 px-4 font-medium">
                          {subj.is_absent ? (
                            <span className="text-destructive font-semibold">AB</span>
                          ) : (
                            `${subj.marks_obtained} / ${subj.max_marks}`
                          )}
                        </td>
                        <td className="text-center py-3 px-4 font-bold">{subj.grade}</td>
                        {isCollegeMode && <td className="text-center py-3 px-4">{subj.grade_points}</td>}
                        <td className="text-center py-3 px-4">
                          {subj.is_absent ? (
                            <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold">
                              <XCircle size={14} /> ABSENT
                            </span>
                          ) : passed ? (
                            <span className="inline-flex items-center gap-1 text-green-500 text-xs font-semibold">
                              <CheckCircle size={14} /> PASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 text-xs font-semibold">
                              <XCircle size={14} /> FAIL
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

// ─── Cumulative CGPA View ───────────────────────────────

function CumulativeView({ cgpaData }: { cgpaData: any | null }) {
  if (!cgpaData || cgpaData.cgpa == null) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg bg-card">
        <p className="text-muted-foreground">Cumulative CGPA data is not yet available.</p>
      </div>
    );
  }

  const semesters = cgpaData.semesters || [];

  return (
    <div className="space-y-6">
      {/* CGPA Header */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<TrendingUp size={20} />} label="Cumulative CGPA" value={cgpaData.cgpa.toFixed(2)} />
          {cgpaData.percentage_equivalent != null && (
            <StatCard icon={<Award size={20} />} label="Equivalent %" value={`${cgpaData.percentage_equivalent}%`} />
          )}
          <StatCard icon={<BookOpen size={20} />} label="Semesters Completed" value={String(cgpaData.total_semesters)} />
        </div>
      </div>

      {/* SGPA Progression */}
      {semesters.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4">SGPA Progression</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left py-3 px-4 font-semibold">Semester</th>
                  <th className="text-left py-3 px-4 font-semibold">Scheme</th>
                  <th className="text-center py-3 px-4 font-semibold">SGPA</th>
                  <th className="text-center py-3 px-4 font-semibold">Credits</th>
                  <th className="text-center py-3 px-4 font-semibold">Earned</th>
                </tr>
              </thead>
              <tbody>
                {semesters.map((sem: any, i: number) => (
                  <tr key={sem.scheme_id || i} className="border-t border-border hover:bg-accent/20 transition-colors">
                    <td className="py-3 px-4 font-medium">Sem {sem.semester || i + 1}</td>
                    <td className="py-3 px-4 text-muted-foreground">{sem.scheme_name} ({sem.academic_year})</td>
                    <td className="text-center py-3 px-4 font-bold">{sem.sgpa?.toFixed(2) ?? "—"}</td>
                    <td className="text-center py-3 px-4">{sem.credits ?? "—"}</td>
                    <td className="text-center py-3 px-4">{sem.earn_credits ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visual Bar Chart */}
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Visual Progression</h4>
            {semesters.map((sem: any, i: number) => {
              const sgpa = sem.sgpa || 0;
              const widthPct = Math.min((sgpa / 10) * 100, 100);
              return (
                <div key={sem.scheme_id || i} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16 shrink-0">Sem {sem.semester || i + 1}</span>
                  <div className="flex-1 h-8 bg-secondary/30 rounded-md overflow-hidden relative">
                    <div
                      className="h-full bg-primary/80 rounded-md transition-all duration-500"
                      
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                      {sgpa.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
