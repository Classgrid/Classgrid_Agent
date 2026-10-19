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

import { ExternalLink, Globe2, ShieldCheck, UserCircle } from "lucide-react";

import { Badge } from "@/components/marketing_ui/badge";

import type {
  OrganizationAdmin,
  OrganizationFullProfile,
} from "../../services/organizationControlCenterApi";
import { formatDateTime, humanizeKey } from "./formatters";
import { OrgDataRow } from "./OrgDataRow";
import { OrgSectionCard } from "./OrgSectionCard";

interface OrgAccessTabProps {
  profile?: OrganizationFullProfile;
}

function AdminCard({ admin }: { admin: OrganizationAdmin }) {
  return (
    <article className="rounded-xl border border-border/60 bg-muted/10 p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start gap-3">
        {admin.profilePicture ? (
          <img
            src={admin.profilePicture}
            alt={`${admin.name ?? "Administrator"} profile`}
            className="h-11 w-11 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            <UserCircle className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{admin.name ?? "Unnamed administrator"}</h3>
          <p className="truncate text-xs text-muted-foreground">{admin.email ?? "Email unavailable"}</p>
          {admin.role ? (
            <Badge variant="outline" className="mt-2">
              {humanizeKey(admin.role)}
            </Badge>
          ) : null}
        </div>
      </div>
      <dl className="mt-4">
        <OrgDataRow label="Department" value={admin.department ?? "Not Configured"} />
        <OrgDataRow label="Designation" value={admin.designation ?? "Not Configured"} />
        <OrgDataRow label="Phone" value={admin.phoneNumber ?? "Not Configured"} />
      </dl>
    </article>
  );
}

export function OrgAccessTab({ profile }: OrgAccessTabProps) {
  const admins = profile?.adminsList ?? [];
  const customDomain = profile?.custom_domain;
  const owner = typeof profile?.owner_id === "object" ? profile.owner_id : undefined;

  return (
    <div className="space-y-6">
      <OrgSectionCard
        title="Administrators"
        description="Elevated-access users returned by the organization backend."
        icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
      >
        {admins.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {admins.map((admin) => (
              <AdminCard key={admin._id} admin={admin} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No administrator records were returned.</p>
        )}
      </OrgSectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <OrgSectionCard
          title="Domain and tenant access"
          description="Only domains explicitly returned by the backend are shown; no portal URL is invented."
          icon={<Globe2 className="h-5 w-5" aria-hidden="true" />}
        >
          <dl>
            <OrgDataRow label="Subdomain slug" value={profile?.subdomain ?? "Not Configured"} />
            <OrgDataRow
              label="Custom domain"
              value={
                customDomain?.domain ? (
                  <a
                    href={`https://${customDomain.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    {customDomain.domain}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  "Not Configured"
                )
              }
            />
            <OrgDataRow label="Domain status" value={humanizeKey(customDomain?.status)} />
            <OrgDataRow label="TXT verified" value={customDomain?.txt_verified === undefined ? "Not Configured" : customDomain.txt_verified ? "Yes" : "No"} />
            <OrgDataRow label="CNAME verified" value={customDomain?.cname_verified === undefined ? "Not Configured" : customDomain.cname_verified ? "Yes" : "No"} />
            <OrgDataRow label="TLS provisioned" value={customDomain?.ssl_provisioned === undefined ? "Not Configured" : customDomain.ssl_provisioned ? "Yes" : "No"} />
            <OrgDataRow label="Verified at" value={formatDateTime(customDomain?.verified_at)} />
          </dl>
        </OrgSectionCard>

        <OrgSectionCard
          title="Identity and code security"
          description="Joining-code values remain hidden even though the legacy backend response contains them."
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
        >
          <dl>
            <OrgDataRow label="Owner" value={profile?.ownerName ?? owner?.name ?? "Not Configured"} />
            <OrgDataRow label="Owner email" value={profile?.ownerEmail ?? owner?.email ?? "Not Configured"} />
            <OrgDataRow label="Allowed email domains" value={profile?.allowed_domains?.length ? profile.allowed_domains.join(", ") : "Not Configured"} />
            <OrgDataRow label="Faculty organization code" value={profile?.organizationCode ? "Configured — hidden" : "Not Configured"} />
            <OrgDataRow label="Student honor code" value={profile?.honorCode ? "Configured — hidden" : "Not Configured"} />
            <OrgDataRow label="Legacy private code" value={profile?.private_code ? "Configured — hidden" : "Not Configured"} />
          </dl>
        </OrgSectionCard>
      </div>
    </div>
  );
}
