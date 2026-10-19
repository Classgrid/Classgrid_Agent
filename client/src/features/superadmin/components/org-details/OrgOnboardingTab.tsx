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

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

import { Check, Circle, Clock, Globe, GraduationCap, KeyRound, LayoutDashboard, Lock, MonitorSmartphone, Shield, UserPlus, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/marketing_ui/badge";
import type {
  OrganizationFullProfile,
  OrganizationOnboardingProgress,
} from "../../services/organizationControlCenterApi";
import { OrgSectionCard } from "./OrgSectionCard";

// ── Step definition ─────────────────────────────────────────────────────────────

interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  phase: 1 | 2;
  /** Returns true if this step is complete based on org data */
  isComplete: (progress: OrganizationOnboardingProgress, profile: OrganizationFullProfile) => boolean;
  /** If true, step is not yet built in the admin dashboard */
  notBuiltYet?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  // ── Phase 1: The Gateway (onboard.classgrid.in) ───────
  {
    key: "provisioning_email_sent",
    label: "Provisioning Email Sent",
    description: "Super Admin clicked 'Provision Sandbox' and the activation email was sent.",
    icon: <KeyRound className="size-4" />,
    phase: 1,
    isComplete: (p) => !!p.tenant_created,
  },
  {
    key: "wizard_completed",
    label: "Onboarding Wizard Completed",
    description: "Admin finished the 10-screen wizard on onboard.classgrid.in and set their password.",
    icon: <Shield className="size-4" />,
    phase: 1,
    isComplete: (p) => !!p.branding_configured || p.current_stage !== "admin_activation_pending",
  },
  // ── Phase 2: Core Academic Setup (Inside Admin Dashboard) ──
  {
    key: "first_login",
    label: "First Login Completed",
    description: "The Admin successfully logged into the main ERP dashboard for the first time.",
    icon: <LayoutDashboard className="size-4" />,
    phase: 2,
    isComplete: (p) => !!p.first_login_completed,
  },
  {
    key: "admins_invited",
    label: "Admins Invited",
    description: "The root Admin invited other admins or faculty to help set up modules.",
    icon: <UserPlus className="size-4" />,
    phase: 2,
    isComplete: (p) => !!p.admins_invited,
    notBuiltYet: true,
  },
  {
    key: "academic_hierarchy",
    label: "Academic Hierarchy Set",
    description: "Admin configured Standards, Divisions, Semesters, or Courses.",
    icon: <GraduationCap className="size-4" />,
    phase: 2,
    isComplete: (p) => !!p.academic_hierarchy_set,
    notBuiltYet: true,
  },
  {
    key: "staff_imported",
    label: "Staff Imported",
    description: "Admin imported historical faculty data via CSV.",
    icon: <Users className="size-4" />,
    phase: 2,
    isComplete: (p) => !!p.staff_imported,
    notBuiltYet: true,
  },
  {
    key: "students_imported",
    label: "Students Imported",
    description: "Admin imported historical student data via CSV.",
    icon: <GraduationCap className="size-4" />,
    phase: 2,
    isComplete: (p) => !!p.students_imported,
    notBuiltYet: true,
  },
  {
    key: "fee_structure",
    label: "Fee Structure Configured",
    description: "Module Admin configured installments, ledgers, and payment gateways.",
    icon: <Wallet className="size-4" />,
    phase: 2,
    isComplete: (p) => !!p.fee_structure_configured,
    notBuiltYet: true,
  },
  {
    key: "admission_form",
    label: "Admission Form Configured",
    description: "Admission Dept opened the portal, set form logic, and seat matrix.",
    icon: <MonitorSmartphone className="size-4" />,
    phase: 2,
    isComplete: (p) => !!p.admission_form_configured,
    notBuiltYet: true,
  }
];

// ── Helpers ──────────────────────────────────────────────────────────────────────

function getOverallPhaseLabel(progress: OrganizationOnboardingProgress | undefined): { label: string; variant: "success" | "warning" | "info" | "danger" } {
  if (!progress) return { label: "No Data", variant: "danger" };

  const stage = progress.current_stage;
  if (stage === "admin_activation_pending") return { label: "Setup In Progress", variant: "info" };
  if (stage === "wizard_completed" || stage === "first_login_completed") return { label: "Sandbox", variant: "warning" };
  if (stage === "fully_onboarded") return { label: "Fully Onboarded", variant: "success" };

  // Fallback — check booleans
  if (progress.branding_configured) return { label: "Sandbox", variant: "warning" };
  if (progress.tenant_created) return { label: "Setup In Progress", variant: "info" };

  return { label: "Not Started", variant: "danger" };
}

// ── Component ───────────────────────────────────────────────────────────────────

interface OrgOnboardingTabProps {
  profile?: OrganizationFullProfile;
}

export function OrgOnboardingTab({ profile }: OrgOnboardingTabProps) {
  const progress = profile?.onboarding_progress ?? {};
  const overall = getOverallPhaseLabel(profile?.onboarding_progress);

  const phase1Steps = ONBOARDING_STEPS.filter((s) => s.phase === 1);
  const phase2Steps = ONBOARDING_STEPS.filter((s) => s.phase === 2);

  const completedCount = ONBOARDING_STEPS.filter((s) => s.isComplete(progress, profile!)).length;
  const totalCount = ONBOARDING_STEPS.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overall progress header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Onboarding Progress</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {completedCount} of {totalCount} steps completed
            </p>
          </div>
          <Badge variant={overall.variant} className="self-start text-xs px-3 py-1">
            {overall.label}
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Overall completion</span>
            <span className="font-medium text-foreground">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                background: progressPct === 100
                  ? "var(--success, #22c55e)"
                  : "linear-gradient(90deg, hsl(221 83% 53%), hsl(262 83% 58%))",
              }}
            />
          </div>
        </div>
      </div>

      {/* Phase 1 */}
      <OrgSectionCard
        title="Phase 1 — The Gateway"
        description="Steps completed on onboard.classgrid.in before the Admin can access the dashboard."
        icon={<Lock className="h-5 w-5" aria-hidden="true" />}
      >
        <div className="space-y-1">
          {phase1Steps.map((step, idx) => (
            <StepRow key={step.key} step={step} progress={progress} profile={profile!} index={idx} isLast={idx === phase1Steps.length - 1} />
          ))}
        </div>
      </OrgSectionCard>

      {/* Phase 2 */}
      <OrgSectionCard
        title="Phase 2 — Core Academic Setup"
        description="Steps the Admin completes inside the ERP dashboard after logging in."
        icon={<LayoutDashboard className="h-5 w-5" aria-hidden="true" />}
      >
        <div className="space-y-1">
          {phase2Steps.map((step, idx) => (
            <StepRow key={step.key} step={step} progress={progress} profile={profile!} index={idx} isLast={idx === phase2Steps.length - 1} />
          ))}
        </div>
      </OrgSectionCard>
    </div>
  );
}

// ── Step Row ────────────────────────────────────────────────────────────────────

function StepRow({
  step,
  progress,
  profile,
  index,
  isLast,
}: {
  step: OnboardingStep;
  progress: OrganizationOnboardingProgress;
  profile: OrganizationFullProfile;
  index: number;
  isLast: boolean;
}) {
  const isComplete = step.isComplete(progress, profile);

  return (
    <div className="flex gap-3 py-3">
      {/* Vertical timeline dot + line */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            isComplete
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {isComplete ? <Check className="size-3.5" /> : <Circle className="size-3" />}
        </div>
        {!isLast && (
          <div
            className={`mt-1 w-px flex-1 min-h-[20px] ${
              isComplete ? "bg-emerald-500/30" : "bg-border"
            }`}
          />
        )}
      </div>

      {/* Step content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${isComplete ? "text-foreground" : "text-muted-foreground"}`}>
            {step.icon}
            {step.label}
          </span>
          {isComplete && (
            <Badge variant="success" className="text-[10px] px-1.5 py-0">
              Done
            </Badge>
          )}
          {!isComplete && step.notBuiltYet && (
            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
              <Clock className="size-2.5 mr-0.5" />
              Not Built Yet
            </Badge>
          )}
          {!isComplete && !step.notBuiltYet && (
            <Badge variant="info" className="text-[10px] px-1.5 py-0">
              Pending
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
      </div>
    </div>
  );
}
