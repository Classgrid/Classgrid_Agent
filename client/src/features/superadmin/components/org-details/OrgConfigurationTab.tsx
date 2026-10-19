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

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Palette, Settings2, SlidersHorizontal, Edit2, Zap, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { organizationControlCenterApi } from "../../services/organizationControlCenterApi";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Badge } from "@/components/marketing_ui/badge";
import { Input } from "@/components/marketing_ui/input";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";

import type { OrganizationFullProfile } from "../../services/organizationControlCenterApi";
import {
  formatBoolean,
  formatDateTime,
  formatNumber,
  humanizeKey,
} from "./formatters";
import { OrgDataRow } from "./OrgDataRow";
import { OrgSectionCard } from "./OrgSectionCard";
import { EditModulesModal } from "./EditModulesModal";
import { EditOnboardingModal } from "./EditOnboardingModal";

interface OrgConfigurationTabProps {
  profile?: OrganizationFullProfile;
}

export function OrgConfigurationTab({ profile }: OrgConfigurationTabProps) {
  const [isEditOnboardingOpen, setIsEditOnboardingOpen] = useState(false);
  const onboarding = profile?.onboarding_progress;
  const onboardingSteps = onboarding
    ? Object.entries(onboarding).filter(
        ([key, value]) => typeof value === "boolean" && key !== "current_stage",
      )
    : [];
  const completedSteps = onboardingSteps.filter(([, value]) => value).length;
  const featureFlags = Object.entries(profile?.feature_flags ?? {});
  const academicConfig = profile?.academic_config;
  const admissionConfig = profile?.admission_config;
  const colors = profile?.branding?.theme_colors;

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleUpgrade = async () => {
    if (!profile?._id) return;
    if (!window.confirm("Are you sure you want to upgrade this Sandbox to Active Production mode?")) return;
    
    setIsUpgrading(true);
    try {
      await organizationControlCenterApi.convertToActive(profile._id);
      toast.success("Organization upgraded to Active Production mode!");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upgrade organization.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const confirmDelete = async () => {
    if (!profile?._id) return;
    
    setIsDeleting(true);
    try {
      await organizationControlCenterApi.deleteOrganization(profile._id);
      toast.success("Organization successfully deleted.");
      setTimeout(() => window.location.href = "/superadmin/orgs", 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete organization.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <OrgSectionCard
        title="Business Lifecycle & Billing"
        description="Manage the sandbox expiry, active production status, and deletion."
        icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
        className="border-primary/20 bg-primary/5"
      >
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <dl className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <OrgDataRow label="Mode" value={humanizeKey(profile?.org_mode || "production")} />
            <OrgDataRow label="Status" value={humanizeKey(profile?.status || "active")} />
            <OrgDataRow label="Sandbox Expiry" value={formatDateTime(profile?.demoExpiresAt) || "N/A"} />
            <OrgDataRow 
              label="Days Remaining" 
              value={profile?.demoExpiresAt 
                ? (() => {
                    const diff = new Date(profile.demoExpiresAt).getTime() - Date.now();
                    const days = Math.ceil(diff / (1000 * 3600 * 24));
                    return days > 0 ? `${days} days left` : "Expired";
                  })()
                : "Unlimited"} 
            />
          </dl>
          <div className="flex flex-col gap-3 min-w-[200px]">
            {profile?.org_mode === "sandbox" && (
              <Button 
                onClick={handleUpgrade} 
                disabled={isUpgrading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Zap className="mr-2 h-4 w-4" /> 
                {isUpgrading ? "Upgrading..." : "Upgrade to Active"}
              </Button>
            )}
            <Button 
              onClick={() => setIsDeleteDialogOpen(true)} 
              disabled={isDeleting}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" /> 
              {isDeleting ? "Deleting..." : "Delete Organization"}
            </Button>
          </div>
        </div>
      </OrgSectionCard>

      <div className="grid gap-6 xl:grid-cols-2 items-start">
        {/* Left Column Group */}
        <div className="flex flex-col gap-6 w-full">
          <OrgSectionCard
        title="Configuration Data & Deep Dives"
        description="View live, detailed data for this organization's core modules."
        icon={<Settings2 className="h-5 w-5" aria-hidden="true" />}
      >
        <div className="flex flex-wrap gap-3 mt-4">
          <Button variant="outline" className="cursor-pointer" asChild>
            <Link to={`/superadmin/detail/${profile?._id}/hierarchy`} state={{ orgName: profile?.name }}>
              View Academic Hierarchy
            </Link>
          </Button>
          <Button variant="outline" className="cursor-pointer" asChild>
            <Link to={`/superadmin/detail/${profile?._id}/staff`} state={{ orgName: profile?.name }}>
              View Faculty Imported
            </Link>
          </Button>
          <Button variant="outline" className="cursor-pointer" asChild>
            <Link to={`/superadmin/detail/${profile?._id}/students`} state={{ orgName: profile?.name }}>
              View Students Imported
            </Link>
          </Button>
          <Button variant="outline" className="cursor-pointer" asChild>
            <Link to={`/superadmin/detail/${profile?._id}/fees`} state={{ orgName: profile?.name }}>
              View Fee Structure
            </Link>
          </Button>
          <Button variant="outline" className="cursor-pointer" asChild>
            <Link to={`/superadmin/detail/${profile?._id}/admission`} state={{ orgName: profile?.name }}>
              View Admission Form
            </Link>
          </Button>
        </div>
      </OrgSectionCard>

      <OrgSectionCard
        title="Academic configuration"
        description="Institution-specific identity and hierarchy settings."
        icon={<Settings2 className="h-5 w-5" aria-hidden="true" />}
      >
        <dl>
          <OrgDataRow label="Identifier label" value={academicConfig?.identifierLabel ?? profile?.rollNumberLabel ?? "Not Configured"} />
          <OrgDataRow label="Identifier required" value={formatBoolean(academicConfig?.prnRequired)} />
          <OrgDataRow label="Identifier locked" value={formatBoolean(academicConfig?.prnLocked)} />
          <OrgDataRow label="Batches" value={academicConfig?.batches?.length ? academicConfig.batches.join(", ") : "Not Configured"} />
          <OrgDataRow label="Branches" value={academicConfig?.branches?.length ? academicConfig.branches.join(", ") : "Not Configured"} />
          <OrgDataRow label="ID card fields" value={academicConfig?.idCardFields?.length ? academicConfig.idCardFields.map(humanizeKey).join(", ") : "Not Configured"} />
        </dl>
      </OrgSectionCard>

      <OrgSectionCard
        title="Admission configuration"
        description="Safe admission workflow settings returned by the organization profile."
        icon={<Settings2 className="h-5 w-5" aria-hidden="true" />}
      >
        <dl>
          <OrgDataRow label="Portal" value={formatBoolean(admissionConfig?.is_portal_open)} />
          <OrgDataRow label="Merit list published" value={formatBoolean(admissionConfig?.is_merit_list_published)} />
          <OrgDataRow label="Registration fee" value={formatNumber(admissionConfig?.registration_fee)} />
          <OrgDataRow label="Applications per student" value={formatNumber(admissionConfig?.max_applications_per_student)} />
          <OrgDataRow label="Seat matrix" value={formatBoolean(admissionConfig?.seat_matrix_policy?.enabled)} />
          <OrgDataRow label="Waitlist" value={formatBoolean(admissionConfig?.waitlist_and_deadlines?.waitlist_enabled)} />
          <OrgDataRow label="Automatic waitlist promotion" value={formatBoolean(admissionConfig?.waitlist_and_deadlines?.auto_promote_waitlist)} />
          <OrgDataRow label="PRN generation" value={humanizeKey(admissionConfig?.workflow_execution?.prn_generation)} />
        </dl>
      </OrgSectionCard>
      </div>

      {/* Right Column Group */}
      <div className="flex flex-col gap-6 w-full">
        <OrgSectionCard
        title="Feature flags"
        description="Every organization feature flag currently returned by the backend."
        icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}
        action={<EditModulesModal profile={profile} orgId={profile?._id as string} />}
      >
        {featureFlags.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {featureFlags.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 shadow-sm transition-all hover:bg-muted/40">
                <span className="text-sm font-medium text-foreground truncate min-w-0 flex-1" title={humanizeKey(key)}>{humanizeKey(key)}</span>
                <Badge variant={value ? "success" : "neutral"} className="shrink-0 text-[11px] px-2 py-0.5 font-semibold tracking-wide">
                  {formatBoolean(value)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Feature flags are unavailable from the backend response.</p>
        )}
      </OrgSectionCard>
      </div>
      </div>

      <OrgSectionCard
        title="Branding"
        description="Visual settings returned by the organization record."
        icon={<Palette className="h-5 w-5" aria-hidden="true" />}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <dl>
            <OrgDataRow label="Font" value={profile?.branding?.font_preference ?? "Not Configured"} />
            <OrgDataRow label="Tagline" value={profile?.branding?.tagline ?? "Not Configured"} />
            <OrgDataRow label="Logo" value={profile?.logo_url ? "Configured" : "Not Configured"} />
            <OrgDataRow label="Favicon" value={profile?.favicon_url ? "Configured" : "Not Configured"} />
            <OrgDataRow label="Campus image" value={profile?.campus_photo_url ? "Configured" : "Not Configured"} />
          </dl>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Object.entries(colors ?? {}).map(([name, color]) => (
              <div key={name} className="rounded-xl border border-border/60 p-3">
                <div
                  className="h-16 rounded-lg border border-border"
                  style={{ backgroundColor: color }}
                  aria-label={`${humanizeKey(name)} color ${color}`}
                />
                <p className="mt-2 text-sm font-medium">{humanizeKey(name)}</p>
                <p className="font-mono text-xs text-muted-foreground">{color}</p>
              </div>
            ))}
          </div>
        </div>
      </OrgSectionCard>

      <DangerConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => !isDeleting && setIsDeleteDialogOpen(open)}
        title="Delete Organization"
        description={<>CRITICAL WARNING: Are you sure you want to completely delete <strong>{profile?.name}</strong>? This will permanently erase all students, faculty, data, and subscriptions.</>}
        warningMessage="This action is irreversible. All data across every department will be permanently lost and cannot be recovered."
        confirmationSteps={[
          {
            label: "To confirm, type the organization name",
            value: profile?.name || "",
          },
          {
            label: "To confirm, type",
            value: "delete",
          },
        ]}
        actionLabel="Permanently Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        variant="danger"
      />
    </div>
  );
}
