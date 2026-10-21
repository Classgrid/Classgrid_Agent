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

import { CheckCircle2, FileText, WalletCards } from "lucide-react";
import { useInstitutionProfile } from "../queries/useInstitutionProfile";
import { Button } from "@/components/marketing_ui/button";
import {
  getProfileTerm,
  isModuleEnabled,
  lowerLabel,
} from "./dashboardProfileUtils";

export function DashboardActivity() {
  const { data: profile, isLoading } = useInstitutionProfile();

  if (isLoading || !profile) {
    return <div className="h-56 animate-pulse rounded-lg border border-border bg-muted/40" />;
  }

  const learnerLabel = lowerLabel(getProfileTerm(profile, "learner"));
  const programLabel = getProfileTerm(profile, "program");
  const feeLabel = profile.feeProfile.primaryFeeLabel || "Fee";
  const admissionWorkflow = profile.admissionProfile.enabledWorkflows[0] ?? "profile workflow";
  const hasFees = isModuleEnabled(profile, "fees");

  const entries = [
    {
      label: `New ${learnerLabel} application moved to verification`,
      detail: admissionWorkflow,
      time: "2m ago",
      icon: <FileText className="h-4 w-4" />,
    },
    hasFees
      ? {
          label: `${feeLabel} payment received`,
          detail: "Finance update",
          time: "15m ago",
          icon: <WalletCards className="h-4 w-4" />,
        }
      : null,
    {
      label: `${programLabel} document queue reviewed`,
      detail: "Operations update",
      time: "1h ago",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
          <p className="mt-1 text-sm text-muted-foreground">Live operations from the active profile.</p>
        </div>
        <Button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          View All
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {entries.map((entry) => (
          <li key={`${entry.label}-${entry.time}`} className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">{entry.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{entry.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{entry.detail}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{entry.time}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
