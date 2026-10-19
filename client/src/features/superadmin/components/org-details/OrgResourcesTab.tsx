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
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Cloud,
  Database,
  HardDrive,
  LifeBuoy,
  Mail,
  Server,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/marketing_ui/alert";
import { Badge } from "@/components/marketing_ui/badge";

import type {
  OrganizationEmailAnalytics,
  OrganizationLegacyUsage,
  OrganizationResourceMeter,
} from "../../services/organizationControlCenterApi";
import {
  formatBytes,
  formatCurrency,
  formatDateTime,
  formatNumber,
  humanizeKey,
} from "./formatters";
import { OrgDataRow } from "./OrgDataRow";
import { OrgMetricCard } from "./OrgMetricCard";
import { OrgSectionCard } from "./OrgSectionCard";

interface OrgResourcesTabProps {
  legacyUsage?: OrganizationLegacyUsage;
  emailAnalytics?: OrganizationEmailAnalytics;
}

const missingProviderMeters = [
  "Vercel requests, bandwidth, build, and function-cost allocation",
  "EC2 compute, EBS, and network allocation per organization",
  "MongoDB byte-level storage and query-cost allocation per organization",
  "Redis memory, commands, and queue allocation per organization",
  "SMS, AI, video, and payment-provider cost allocation per organization",
  "Full Cloudflare R2 object/request allocation across every feature prefix",
] as const;

function formatMeterUsage(meter: OrganizationResourceMeter): string {
  const unit = (meter.unit || "count").toLowerCase();
  const value = meter.usageAmount;

  if (unit === "bytes") return formatBytes(value);
  if (unit === "inr") return formatCurrency(value);
  if (value === null || value === undefined) return "Not Configured";

  return `${formatNumber(value)} ${meter.unit || ""}`.trim();
}

function formatMeterCost(meter: OrganizationResourceMeter): string {
  if (meter.costAmount === null || meter.costAmount === undefined) return "Cost not allocated";
  return meter.currency === "INR" || !meter.currency
    ? formatCurrency(meter.costAmount)
    : `${formatNumber(meter.costAmount)} ${meter.currency}`;
}

export function OrgResourcesTab({
  legacyUsage,
  emailAnalytics,
}: OrgResourcesTabProps) {
  const storageBytes = legacyUsage?.storage?.bytes;
  const fileCount = legacyUsage?.storage?.fileCount;
  const notesCount = legacyUsage?.db?.notesCount;
  const trackedRecordCount = legacyUsage?.db?.totalTrackedRecords;
  const emailCount = emailAnalytics?.total ?? legacyUsage?.email?.totalSent;
  const supportCount = legacyUsage?.support?.totalTickets;
  const resourceMeterSummary = legacyUsage?.resourceMeters;
  const resourceMeters = resourceMeterSummary?.records ?? [];
  const providerConfiguration = resourceMeterSummary?.providerConfiguration ?? [];
  const supportStatus = legacyUsage?.support?.byStatus;
  const activeSupportCount =
    (supportStatus?.open ?? 0) +
    (supportStatus?.in_progress ?? 0) +
    (supportStatus?.waiting_on_user ?? 0) +
    (supportStatus?.reopened ?? 0);
  const trackedCollections = Object.entries(legacyUsage?.db?.trackedCollections ?? {})
    .filter(([, count]) => (count ?? 0) > 0)
    .sort((left, right) => (right[1] ?? 0) - (left[1] ?? 0));
  const emailBreakdown = emailAnalytics?.typeBreakdown ?? legacyUsage?.email?.typeBreakdown;

  return (
    <div className="space-y-6">
      <Alert className="border-amber-500/30 bg-amber-500/5 px-4 py-3 text-amber-800 dark:text-amber-200">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Resource coverage is broader, but still partial</AlertTitle>
        <AlertDescription>
          This page now includes live organization-scoped record counts, support volume, billing inputs, persisted resource meters, and provider env readiness from the backend. Provider costs still stay unreported until those provider APIs or tenant-tagged logs return per-organization allocation.
        </AlertDescription>
      </Alert>

      <section aria-label="Live resource statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <OrgMetricCard
          title="Legacy notes storage"
          value={formatBytes(storageBytes)}
          detail="Supabase notes-files bucket only; broader cloud storage is still outside the tracked meter."
          icon={<HardDrive className="h-5 w-5" aria-hidden="true" />}
          quality={storageBytes === undefined ? "Not Configured" : "partial"}
        />
        <OrgMetricCard
          title="Legacy stored files"
          value={formatNumber(fileCount)}
          detail="Files found below the organization student-notes prefix."
          icon={<Server className="h-5 w-5" aria-hidden="true" />}
          quality={fileCount === undefined ? "Not Configured" : "partial"}
        />
        <OrgMetricCard
          title="Tracked DB records"
          value={formatNumber(trackedRecordCount)}
          detail="Organization-scoped counts across tracked academic, support, and content models."
          icon={<Database className="h-5 w-5" aria-hidden="true" />}
          quality={trackedRecordCount === undefined ? "Not Configured" : "actual"}
        />
        <OrgMetricCard
          title="Email jobs"
          value={formatNumber(emailCount)}
          detail="Email jobs associated with the organization or its users."
          icon={<Mail className="h-5 w-5" aria-hidden="true" />}
          quality={emailCount === undefined ? "Not Configured" : "actual"}
        />
        <OrgMetricCard
          title="Support tickets"
          value={formatNumber(supportCount)}
          detail="Live support volume linked to this organization."
          icon={<LifeBuoy className="h-5 w-5" aria-hidden="true" />}
          quality={supportCount === undefined ? "Not Configured" : "actual"}
        />
      </section>

      <OrgSectionCard
        title="Persisted resource meters"
        description="Organization-level meter records saved by the backend from real app usage. Provider API cost syncs can fill this same model later."
        icon={<Cloud className="h-5 w-5" aria-hidden="true" />}
      >
        <dl>
          <OrgDataRow label="Saved meters" value={formatNumber(resourceMeterSummary?.totals?.totalMeters)} />
          <OrgDataRow label="Actual meters" value={formatNumber(resourceMeterSummary?.totals?.actualMeters)} />
          <OrgDataRow label="Partial meters" value={formatNumber(resourceMeterSummary?.totals?.partialMeters)} />
          <OrgDataRow label="Known meter cost" value={formatCurrency(resourceMeterSummary?.totals?.knownCostInr)} />
          <OrgDataRow
            label="Configured providers"
            value={
              resourceMeterSummary?.totals?.configuredProviders === undefined || resourceMeterSummary?.totals?.totalProviders === undefined
                ? "Not Configured"
                : `${formatNumber(resourceMeterSummary.totals.configuredProviders)} / ${formatNumber(resourceMeterSummary.totals.totalProviders)}`
            }
          />
        </dl>
        {resourceMeters.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2" aria-label="Saved organization resource meters">
            {resourceMeters.map((meter) => (
              <div key={`${meter.provider}-${meter.metricKey}`} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{meter.metricLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {meter.providerLabel ?? humanizeKey(meter.provider)} / {humanizeKey(meter.resourceType)}
                    </p>
                  </div>
                  <Badge variant={meter.quality === "partial" ? "warning" : "success"} className="shrink-0">
                    {humanizeKey(meter.quality ?? "actual")}
                  </Badge>
                </div>
                <dl className="mt-3">
                  <OrgDataRow label="Usage" value={formatMeterUsage(meter)} />
                  <OrgDataRow label="Cost" value={formatMeterCost(meter)} />
                  <OrgDataRow label="Synced" value={formatDateTime(meter.lastSyncedAt)} />
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No saved resource meters have been returned yet.</p>
        )}
        {resourceMeterSummary?.captureError ? (
          <p className="mt-4 text-sm text-destructive">Meter capture error: {resourceMeterSummary.captureError}</p>
        ) : null}
      </OrgSectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <OrgSectionCard
          title="Provider configuration"
          description="Backend readiness by provider. The API returns only env variable names and configured/missing status, never secret values."
          icon={<Cloud className="h-5 w-5" aria-hidden="true" />}
        >
          {providerConfiguration.length > 0 ? (
            <div className="space-y-3">
              {providerConfiguration.map((provider) => (
                <div key={provider.provider} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{provider.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{provider.note}</p>
                    </div>
                    <Badge variant={provider.configured ? "success" : "warning"} className="shrink-0 gap-1.5">
                      {provider.configured ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <CircleSlash className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {provider.configured ? "Configured" : "Missing env"}
                    </Badge>
                  </div>
                  {provider.missingEnv && provider.missingEnv.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2" aria-label={`${provider.label} missing env names`}>
                      {provider.missingEnv.map((envName) => (
                        <Badge key={envName} variant="outline">{envName}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Provider configuration status has not been returned yet.</p>
          )}
        </OrgSectionCard>

        <OrgSectionCard
          title="Missing billable meters"
          description="These cloud and provider costs still cannot be allocated to a single organization until a provider sync or tenant-tagged log is added."
          icon={<Server className="h-5 w-5" aria-hidden="true" />}
        >
          <ul className="space-y-3">
            {missingProviderMeters.map((meter) => (
              <li key={meter} className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
                <span className="text-sm leading-relaxed">{meter}</span>
                <Badge variant="neutral" className="shrink-0">Cost sync pending</Badge>
              </li>
            ))}
          </ul>
          {legacyUsage?.coverage?.reason ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {legacyUsage.coverage.reason}
            </p>
          ) : null}
        </OrgSectionCard>
      </div>

      <OrgSectionCard
        title="Tracked application records"
        description="Live counts from organization-owned collections already present in your backend models."
        icon={<Database className="h-5 w-5" aria-hidden="true" />}
      >
        <dl>
          <OrgDataRow label="Student note rows" value={formatNumber(notesCount)} />
          <OrgDataRow label="Tracked database records" value={formatNumber(trackedRecordCount)} />
          <OrgDataRow label="Support tickets" value={formatNumber(supportCount)} />
          <OrgDataRow label="High-priority support tickets" value={formatNumber(legacyUsage?.support?.highPriorityTickets)} />
        </dl>
        {trackedCollections.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Tracked resources by collection">
            {trackedCollections.map(([key, count]) => (
              <Badge key={key} variant="outline" className="gap-1.5">
                {humanizeKey(key)}
                <span className="tabular-nums text-muted-foreground">{formatNumber(count)}</span>
              </Badge>
            ))}
          </div>
        ) : null}
      </OrgSectionCard>

      <OrgSectionCard
        title="Operational activity"
        description="Real organization-filtered email and support activity from live backend records."
        icon={<Mail className="h-5 w-5" aria-hidden="true" />}
      >
        <dl>
          <OrgDataRow label="All-time email jobs" value={formatNumber(emailAnalytics?.total ?? legacyUsage?.email?.totalSent)} />
          <OrgDataRow label="Email jobs today" value={formatNumber(emailAnalytics?.daily ?? legacyUsage?.email?.daily)} />
          <OrgDataRow label="Email jobs this month" value={formatNumber(emailAnalytics?.monthly ?? legacyUsage?.email?.monthly)} />
          <OrgDataRow label="Active support tickets" value={formatNumber(activeSupportCount)} />
          <OrgDataRow label="Resolved support tickets" value={formatNumber(supportStatus?.resolved)} />
        </dl>
        {emailBreakdown && Object.keys(emailBreakdown).length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Email jobs by type">
            {Object.entries(emailBreakdown).map(([type, count]) => (
              <Badge key={type} variant="outline" className="gap-1.5">
                {humanizeKey(type)}
                <span className="tabular-nums text-muted-foreground">{formatNumber(count)}</span>
              </Badge>
            ))}
          </div>
        ) : null}
      </OrgSectionCard>
    </div>
  );
}
