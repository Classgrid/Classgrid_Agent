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

import React from "react";
import { GraduationCap, Users, IndianRupee, CalendarCheck, Building } from "lucide-react";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useOrgDashboardMetrics } from "../../queries/useOrgDashboard";

interface OrgOverviewCardsProps {
  profile: any;
}

export function OrgOverviewCards({ profile }: OrgOverviewCardsProps) {
  const { data: metrics, isLoading, isError } = useOrgDashboardMetrics();

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-xl border border-border mb-6">
        <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <Building className="w-6 h-6" />
        </div>
        <h3 className="font-bold mb-1">Failed to load overview metrics</h3>
        <p className="text-sm text-muted-foreground">There was an issue connecting to the server.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        title={`Total ${profile?.terminology?.learner || "Students"}`} 
        value={metrics?.totalStudents?.toLocaleString() || "0"} 
        icon={GraduationCap} 
      />
      <StatCard
        title={`Total ${profile?.terminology?.educator || "Faculty"}`} 
        value={metrics?.totalFaculty?.toLocaleString() || "0"} 
        icon={Users} 
      />
      <StatCard
        title={metrics?.structureMetricLabel || "Classes"} 
        value={metrics?.structureMetric?.toLocaleString() || "0"} 
        icon={Building} 
      />
      <StatCard
        title="Attendance %" 
        value="0%" 
        icon={CalendarCheck} 
      />
    </div>
  );
}
