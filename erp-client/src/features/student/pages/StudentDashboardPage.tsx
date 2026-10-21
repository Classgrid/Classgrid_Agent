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

import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import {
  useStudentProfile,
  useStudentOnboarding,
  useStudentAnalytics,
  useStudentAiSummary,
  useTodaySchedule,
} from "../queries/useStudentDashboard";

import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";
import { AiCounselorCard } from "../components/dashboard/AiCounselorCard";
import { PerformanceMetricsGrid } from "../components/dashboard/PerformanceMetricsGrid";
import { TodayScheduleWidget } from "../components/dashboard/TodayScheduleWidget";
import { InsightsWidget } from "../components/dashboard/InsightsWidget";
import { OnboardingBanner } from "../components/dashboard/OnboardingBanner";

export function StudentDashboardPage() {
  const { data: user } = useCurrentUser();

  const { data: profile, isLoading: isProfileLoading } = useStudentProfile();
  const { data: onboarding, isLoading: isOnboardingLoading } = useStudentOnboarding();
  const studentId = profile?.id;
  const { data: analytics, isLoading: isAnalyticsLoading } = useStudentAnalytics(studentId);
  const { data: aiSummary } = useStudentAiSummary(studentId);
  const { data: scheduleData, isLoading: isScheduleLoading } = useTodaySchedule();

  const isLoading = isProfileLoading || isOnboardingLoading || isAnalyticsLoading || isScheduleLoading;

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {profile?.divisions?.name ? `Division: ${profile.divisions.name}` : "Here is your academic overview."}
          </p>
        </div>
        <OnboardingBanner data={onboarding} />
      </div>

      {aiSummary && (
        <section>
          <AiCounselorCard data={aiSummary} />
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <PerformanceMetricsGrid data={analytics} />
          <div className="flex-1 min-h-[200px]">
            <InsightsWidget data={analytics} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <TodayScheduleWidget schedule={scheduleData?.schedule} day={scheduleData?.day} />
        </div>
      </div>
    </div>
  );
}
