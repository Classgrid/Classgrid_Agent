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

import type { ReactNode } from "react";
import { BarChart3, LineChart, PieChart } from "lucide-react";
import { useInstitutionProfile } from "../queries/useInstitutionProfile";
import {
  getPrimaryHierarchyLabel,
  getProfileTerm,
  lowerLabel,
  pluralizeLabel,
} from "./dashboardProfileUtils";

type ChartPanelProps = {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
};

function ChartPanel({ title, description, icon, children }: ChartPanelProps) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      </div>
      {children}
    </article>
  );
}

function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary"  />
      </div>
    </div>
  );
}

export function DashboardCharts() {
  const { data: profile, isLoading } = useInstitutionProfile();

  if (isLoading || !profile) {
    return (
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-72 animate-pulse rounded-lg border border-border bg-muted/40" />
        ))}
      </section>
    );
  }

  const learnerLabel = pluralizeLabel(getProfileTerm(profile, "learner"));
  const educatorLabel = pluralizeLabel(getProfileTerm(profile, "educator"));
  const groupLabel = getProfileTerm(profile, "group");
  const hierarchyLabel = getPrimaryHierarchyLabel(profile);
  const hierarchyLevelNote = profile.structureFeatures.hasSubBatches
    ? `${groupLabel} plus sub-batch view`
    : `${groupLabel} level view`;

  const trendValues = [
    { period: "M1", value: 56 },
    { period: "M2", value: 64 },
    { period: "M3", value: 72 },
    { period: "M4", value: 79 },
    { period: "M5", value: 86 },
    { period: "M6", value: 94 },
  ];
  const roleDistribution = [
    { label: learnerLabel, value: 82 },
    { label: educatorLabel, value: 12 },
    { label: "Admin team", value: 6 },
  ];
  const hierarchyDistribution = [74, 68, 91, 62].map((value, index) => ({
    label: `${hierarchyLabel} ${index + 1}`,
    value,
  }));

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <ChartPanel
        title="Enrollment Trends"
        description={`Recent intake movement for ${lowerLabel(learnerLabel)}.`}
        icon={<LineChart className="h-4 w-4" />}
      >
        <div className="flex h-44 items-end gap-3">
          {trendValues.map((item) => (
            <div key={item.period} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md bg-primary/80"
                
                aria-label={`${item.period}: ${item.value}%`}
              />
              <span className="text-xs text-muted-foreground">{item.period}</span>
            </div>
          ))}
        </div>
      </ChartPanel>

      <ChartPanel
        title="Role Distribution"
        description={`Split across ${lowerLabel(learnerLabel)}, ${lowerLabel(educatorLabel)}, and admins.`}
        icon={<PieChart className="h-4 w-4" />}
      >
        <div className="space-y-4">
          {roleDistribution.map((item) => (
            <BarRow key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </ChartPanel>

      <ChartPanel
        title={`Distribution by ${hierarchyLabel}`}
        description={hierarchyLevelNote}
        icon={<BarChart3 className="h-4 w-4" />}
      >
        <div className="space-y-4">
          {hierarchyDistribution.map((item) => (
            <BarRow key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </ChartPanel>
    </section>
  );
}
