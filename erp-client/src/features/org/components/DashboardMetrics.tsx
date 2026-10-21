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

import { ClipboardCheck, GraduationCap, UsersRound, WalletCards } from "lucide-react";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { useInstitutionProfile } from "../queries/useInstitutionProfile";
import {
  getProfileTerm,
  isModuleEnabled,
  pluralizeLabel,
} from "./dashboardProfileUtils";

export function DashboardMetrics() {
  const { data: profile, isLoading } = useInstitutionProfile();

  if (isLoading || !profile) {
    return (
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-lg border border-border bg-muted/40" />
        ))}
      </section>
    );
  }

  const learnerLabel = pluralizeLabel(getProfileTerm(profile, "learner"));
  const educatorLabel = pluralizeLabel(getProfileTerm(profile, "educator"));
  const programLabel = pluralizeLabel(getProfileTerm(profile, "program"));
  const feeLabel = profile.feeProfile.primaryFeeLabel || "Fee";
  const attendanceLabel = profile.attendanceProfile.primarySessionLabel || "Attendance";
  const feesEnabled = isModuleEnabled(profile, "fees");

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={`Total ${learnerLabel}`}
        value="1,247"
        icon={<GraduationCap className="h-4 w-4" />}
        trend="+6.8% current cycle"
        trendDirection="up"
      />
      <StatCard
        title={`Total ${educatorLabel}`}
        value="89"
        icon={<UsersRound className="h-4 w-4" />}
        trend="+3.2% active roles"
        trendDirection="up"
      />
      <StatCard
        title={feesEnabled ? `${feeLabel} Collected` : `Active ${programLabel}`}
        value={feesEnabled ? "INR 12.4L / 18L" : "42"}
        icon={<WalletCards className="h-4 w-4" />}
        trend={feesEnabled ? "69% of current demand" : "Configured for this profile"}
        trendDirection="neutral"
      />
      <StatCard
        title={`${attendanceLabel} %`}
        value="87%"
        icon={<ClipboardCheck className="h-4 w-4" />}
        trend="+4.1% today"
        trendDirection="up"
      />
    </section>
  );
}
