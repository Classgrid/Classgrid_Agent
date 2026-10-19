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
import { CopySnippetCard } from "@/components/marketing_ui/copy-snippet-card";
import { useOrgJoinCodes, useOrgTerminology, useAllTerminology } from "../../queries/useOrgJoinCodes";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Building2, GitBranch, BookOpen, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

// Human-readable label for concept keys from backend
const CONCEPT_LABELS: Record<string, string> = {
  org_label:        "Org Label",
  top_level:        "Top Level",
  course:           "Course",
  year:             "Year",
  period:           "Period",
  division:         "Division",
  sub_batch:        "Sub Batch",
  student_id:       "Student ID",
  teacher:          "Teacher",
  assignment_label: "Assignment",
  exam_label:       "Exam",
};

// Human-readable column labels
const COL_LABELS: Record<string, string> = {
  engineering:    "Engineering",
  school:         "School",
  coaching:       "Coaching",
  junior_college: "Jr. College",
  diploma:        "Diploma",
};

export function OrgCodesCard() {
  const { data: codes, isLoading: codesLoading, isError: codesError } = useOrgJoinCodes();
  const { data: myTerminology, isLoading: termLoading } = useOrgTerminology();
  const { data: allTerminology, isLoading: allTermLoading } = useAllTerminology();
  const [showTerminology, setShowTerminology] = useState(false);

  const isLoading = codesLoading || termLoading || allTermLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[160px] w-full rounded-xl" />
        <Skeleton className="h-[180px] w-full rounded-xl" />
        <Skeleton className="h-[180px] w-full rounded-xl" />
        <Skeleton className="h-[180px] w-full rounded-xl" />
      </div>
    );
  }

  if (codesError || !codes) return null;

  // This org's plan data (from /api/hierarchy/terminology/all, keyed by org_type)
  const myPlanData = allTerminology?.allTerminology?.[codes.orgType];

  // Fallback: if no plan data, show basic info from myTerminology
  const planName = myPlanData?.planName ?? myTerminology?.structure_type ?? "Unknown";
  const planNumber = myPlanData?.planNumber ?? "—";
  const hierarchyLevels = myPlanData?.hierarchyLevels ?? myTerminology?.terminology?.hierarchy ?? [];
  const hierarchyExamples = myPlanData?.hierarchyExamples ?? [];

  const comparisonCols = allTerminology?.comparisonCols ?? [];
  const comparisonConcepts = allTerminology?.comparisonConcepts ?? [];

  return (
    <div className="flex flex-col gap-6">

      {/* ── Organization Type Card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">Organization Type</h3>
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                {codes.orgType?.replace(/_/g, " ")}
              </span>
              <span className="inline-flex items-center rounded-full border border-muted bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                Plan {planNumber}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{planName}</p>
            <p className="mt-1.5 text-xs text-muted-foreground/60">
              Set at registration. Cannot be changed after organization is created.
            </p>
          </div>
        </div>

        {/* Academic Hierarchy Visual */}
        {hierarchyLevels.length > 0 && (
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Academic Hierarchy — {planName}
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              {hierarchyLevels.map((level, index) => (
                <React.Fragment key={level}>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
                      {level}
                    </div>
                    {hierarchyExamples[index] && (
                      <span className="text-[10px] text-muted-foreground/60 max-w-[90px] text-center truncate">
                        {hierarchyExamples[index]}
                      </span>
                    )}
                  </div>
                  {index < hierarchyLevels.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 mt-[-10px]" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Terminology Toggle */}
        {comparisonCols.length > 0 && (
          <button
            onClick={() => setShowTerminology(!showTerminology)}
            className="w-full px-5 py-3 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Platform Terminology Reference — how labels change per org type</span>
            </div>
            {showTerminology ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}

        {/* Terminology Comparison Table — 100% from backend */}
        {showTerminology && comparisonCols.length > 0 && allTerminology && (
          <div className="px-5 pb-5">
            <div className="rounded-lg border border-border overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap border-r border-border">
                      Concept
                    </th>
                    {comparisonCols.map(col => (
                      <th
                        key={col}
                        className={`px-3 py-2.5 text-left font-semibold whitespace-nowrap ${
                          col === codes.orgType
                            ? "text-primary bg-primary/5"
                            : "text-muted-foreground"
                        }`}
                      >
                        {COL_LABELS[col] ?? col}
                        {col === codes.orgType && (
                          <span className="ml-1 text-[10px] font-normal opacity-70">(yours)</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonConcepts.map((concept, i) => (
                    <tr key={concept} className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                      <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap border-r border-border">
                        {CONCEPT_LABELS[concept] ?? concept}
                      </td>
                      {comparisonCols.map(col => {
                        const val = allTerminology.allTerminology?.[col]?.terminology?.[concept];
                        return (
                          <td
                            key={col}
                            className={`px-3 py-2 whitespace-nowrap ${
                              col === codes.orgType
                                ? "text-primary font-semibold bg-primary/5"
                                : "text-muted-foreground"
                            }`}
                          >
                            {val == null || val === "" ? "—" : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Access Codes ── */}
      <CopySnippetCard
        title="Organization ID"
        description="Use this ID to identify your organization when contacting support."
        value={codes.tenantId}
      />

      <CopySnippetCard
        title="Staff Join Code"
        description="Give this 12-character code to staff so they can request a role and join your organization."
        value={codes.organizationCode}
      />

      <CopySnippetCard
        title="Student Honor Code"
        description="Give this 12-character code to students so they can join your organization."
        value={codes.honorCode}
      />
    </div>
  );
}
