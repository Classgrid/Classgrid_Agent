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

import {
  BookOpen,
  Building2,
  GraduationCap,
  Mail,
  ShieldCheck,
  Users,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/marketing_ui/badge";

import type {
  OrganizationDetailSnapshot,
  OrganizationEmailAnalytics,
  OrganizationFullProfile,
  OrganizationInsight,
} from "../../services/organizationControlCenterApi";
import { formatDate, formatNumber, humanizeKey } from "./formatters";
import { OrgDataRow } from "./OrgDataRow";
import { OrgMetricCard } from "./OrgMetricCard";
import { OrgSectionCard } from "./OrgSectionCard";

interface OrgOverviewTabProps {
  profile?: OrganizationFullProfile;
  detail?: OrganizationDetailSnapshot;
  insight?: OrganizationInsight;
  emailAnalytics?: OrganizationEmailAnalytics;
}

export function OrgOverviewTab({
  profile,
  detail,
  insight,
  emailAnalytics,
}: OrgOverviewTabProps) {
  const usage = detail?.usage;
  const studentCount =
    usage?.totalStudents ?? insight?.totalStudents ?? profile?.stats?.totalStudents;
  const facultyCount =
    usage?.totalTeachers ?? insight?.totalFaculty ?? profile?.stats?.totalFaculty;
  const adminCount = usage?.totalAdmins ?? profile?.adminsList?.length;
  const classroomCount = usage?.totalClasses ?? insight?.totalClassrooms;
  const totalUsers = profile?.stats?.totalUsers;
  const emailCount = emailAnalytics?.total ?? usage?.emailsSent;
  const owner =
    typeof profile?.owner_id === "object" ? profile.owner_id : detail?.owner;

  return (
    <div className="space-y-6">
      <section aria-label="Organization statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <OrgMetricCard
          title="Students"
          value={formatNumber(studentCount)}
          detail="Organization-scoped user records returned by the live backend."
          icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />}
          quality={studentCount === undefined ? "unavailable" : "actual"}
        />
        <OrgMetricCard
          title="Faculty"
          value={formatNumber(facultyCount)}
          detail="Faculty and teacher totals from organization usage and insight endpoints."
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          quality={facultyCount === undefined ? "unavailable" : "actual"}
        />
        <OrgMetricCard
          title="Administrators"
          value={formatNumber(adminCount)}
          detail="Active elevated-access accounts returned for this organization."
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          quality={adminCount === undefined ? "unavailable" : "actual"}
        />
        <OrgMetricCard
          title="Classrooms"
          value={formatNumber(classroomCount)}
          detail="Organization classrooms returned by the insight and detail endpoints."
          icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
          quality={classroomCount === undefined ? "unavailable" : "actual"}
        />
        <OrgMetricCard
          title="Registered users"
          value={formatNumber(totalUsers)}
          detail="All user records currently linked to this organization."
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          quality={totalUsers === undefined ? "unavailable" : "actual"}
        />
        <OrgMetricCard
          title="Email jobs"
          value={formatNumber(emailCount)}
          detail="Organization-filtered email jobs; delivery cost is not yet returned."
          icon={<Mail className="h-5 w-5" aria-hidden="true" />}
          quality={emailCount === undefined ? "unavailable" : "actual"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <OrgSectionCard
          title="Institution profile"
          description="Identity and lifecycle fields returned by the organization backend."
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        >
          <dl>
            <OrgDataRow label="Organization ID" value={profile?._id ?? detail?._id ?? "unavailable"} />
            <OrgDataRow 
              label="Subdomain" 
              value={profile?.subdomain ? (
                <a 
                  href={`https://${profile.subdomain}.classgrid.in`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1.5"
                >
                  {profile.subdomain}.classgrid.in
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : "unavailable"} 
            />
            <OrgDataRow label="Institution type" value={humanizeKey(profile?.org_type ?? detail?.org_type)} />
            <OrgDataRow label="Structure type" value={humanizeKey(profile?.structure_type ?? detail?.structure_type)} />
            <OrgDataRow label="Division mode" value={humanizeKey(profile?.division_mode)} />
            <OrgDataRow label="Address" value={profile?.address ?? detail?.address ?? "unavailable"} />
            <OrgDataRow label="City" value={profile?.city ?? detail?.city ?? "unavailable"} />
            <OrgDataRow label="District" value={profile?.district ?? detail?.district ?? "unavailable"} />
            <OrgDataRow label="Taluka" value={profile?.taluka ?? detail?.taluka ?? "unavailable"} />
            <OrgDataRow label="State" value={profile?.state ?? detail?.state ?? "unavailable"} />
            <OrgDataRow label="Pincode" value={profile?.pincode ?? detail?.pincode ?? "unavailable"} />
            <OrgDataRow label="Website" value={profile?.website ?? detail?.website ?? "unavailable"} />
            <OrgDataRow label="Registration number" value={profile?.registration_number ?? detail?.registration_number ?? "unavailable"} />
            <OrgDataRow label="Affiliation" value={profile?.affiliation ?? "unavailable"} />
            <OrgDataRow label="Created" value={formatDate(profile?.createdAt ?? detail?.createdAt)} />
            <OrgDataRow label="Demo expires" value={formatDate(profile?.demoExpiresAt)} />
          </dl>
        </OrgSectionCard>

        <OrgSectionCard
          title="Ownership and subscription"
          description="Responsible account and current platform subscription state."
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
        >
          <dl>
            <OrgDataRow label="Owner" value={profile?.ownerName ?? owner?.name ?? detail?.ownerName ?? "unavailable"} />
            <OrgDataRow label="Owner email" value={profile?.ownerEmail ?? owner?.email ?? detail?.ownerEmail ?? "unavailable"} />
            <OrgDataRow label="Contact number" value={profile?.contactNumber ?? owner?.phoneNumber ?? "unavailable"} />
            <OrgDataRow label="Designation" value={profile?.designation ?? "unavailable"} />
            <OrgDataRow
              label="Plan"
              value={
                detail?.subscription?.plan ? (
                  <Badge variant="info">{humanizeKey(detail.subscription.plan)}</Badge>
                ) : (
                  "unavailable"
                )
              }
            />
            <OrgDataRow
              label="Billing state"
              value={
                detail?.subscription?.isPaid === undefined ? (
                  "unavailable"
                ) : (
                  <Badge variant={detail.subscription.isPaid ? "success" : "warning"}>
                    {detail.subscription.isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                )
              }
            />
            <OrgDataRow label="Renews or expires" value={formatDate(detail?.subscription?.expiresAt)} />
            <OrgDataRow label="Usage refreshed" value={formatDate(usage?.lastUpdated)} />
          </dl>
        </OrgSectionCard>
      </div>
    </div>
  );
}
