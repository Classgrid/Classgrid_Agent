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
  CreditCard,
  GraduationCap,
  HardDrive,
  Landmark,
  Receipt,
  Users,
  Activity,
  Mail,
  MessageSquare,
  Video,
  BrainCircuit,
  CheckCircle2,
  Calendar,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/marketing_ui/alert";
import { Badge } from "@/components/marketing_ui/badge";
import { Progress } from "@/components/marketing_ui/progress";

import type {
  OrganizationDetailSnapshot,
  OrganizationFullProfile,
  OrganizationInsight,
  OrganizationLegacyUsage,
} from "../../services/organizationControlCenterApi";
import {
  formatBytes,
  formatCurrency,
  formatDate,
  formatNumber,
  humanizeKey,
} from "./formatters";
import { OrgDataRow } from "./OrgDataRow";
import { OrgMetricCard } from "./OrgMetricCard";
import { OrgSectionCard } from "./OrgSectionCard";

interface OrgBillingTabProps {
  profile?: OrganizationFullProfile;
  detail?: OrganizationDetailSnapshot;
  insight?: OrganizationInsight;
  legacyUsage?: OrganizationLegacyUsage;
}

interface LimitMeterProps {
  label: string;
  used?: number;
  limit?: number;
}

function LimitMeter({ label, used, limit }: LimitMeterProps) {
  const hasMeter = used !== undefined && limit !== undefined && limit > 0;
  const percentage = hasMeter ? Math.min(100, (used / limit) * 100) : undefined;

  return (
    <div className="space-y-2 rounded-xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {hasMeter ? `${formatNumber(used)} / ${formatNumber(limit)}` : "Not Configured"}
        </span>
      </div>
      {percentage === undefined ? (
        <div className="h-1 rounded-full bg-muted" aria-label={`${label} unavailable`} />
      ) : (
        <Progress value={percentage} aria-label={`${label} ${percentage.toFixed(1)} percent used`} />
      )}
    </div>
  );
}

export function OrgBillingTab({
  profile,
  detail,
  insight,
  legacyUsage,
}: OrgBillingTabProps) {
  const subscription = detail?.subscription;
  const billing = subscription?.billing;
  const usage = detail?.usage;
  const studentCount =
    usage?.totalStudents ?? insight?.totalStudents ?? profile?.stats?.totalStudents;
  const facultyCount =
    usage?.totalTeachers ?? insight?.totalFaculty ?? profile?.stats?.totalFaculty;
  const basePrice = billing?.basePricePerMonth;
  const studentRate = billing?.pricePerStudent;
  const knownStudentCharge =
    studentRate !== undefined && studentCount !== undefined
      ? studentRate * studentCount
      : undefined;
  const knownStorageCharge = legacyUsage?.storage?.knownChargeInr;
  const subtotalParts = [basePrice, knownStudentCharge, knownStorageCharge].filter(
    (value): value is number => value !== undefined,
  );
  const knownSubtotal =
    subtotalParts.length > 0
      ? subtotalParts.reduce((sum, value) => sum + value, 0)
      : undefined;

  const ledger = legacyUsage?.billingLedger?.currentMonth;
  const latestInvoice = legacyUsage?.billingLedger?.latestInvoice;

  return (
    <div className="space-y-6">
      {latestInvoice ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle>Monthly Invoice System is Active</AlertTitle>
          <AlertDescription>
            The latest invoice <strong>{latestInvoice.invoiceNumber}</strong> for ₹{latestInvoice.totalAmountInr} is marked as {latestInvoice.status}. The current month's live Pay-As-You-Go usage is updating below.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle>Pay-As-You-Go Metering Active</AlertTitle>
          <AlertDescription>
            The backend is actively metering live resource usage across all dashboards. The first invoice will generate on the 1st of next month.
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="Live Month-to-Date Usage" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <OrgMetricCard
          title="API Requests"
          value={formatNumber(ledger?.totalApiRequests || 0)}
          detail="Total authenticated API calls across all Vercel/EC2 instances."
          icon={<Activity className="h-5 w-5 text-blue-500" aria-hidden="true" />}
          quality="actual"
        />
        <OrgMetricCard
          title="AI Tokens"
          value={formatNumber(ledger?.totalAiTokens || 0)}
          detail="Total tokens consumed across OpenAI, Groq, and Gemini."
          icon={<BrainCircuit className="h-5 w-5 text-purple-500" aria-hidden="true" />}
          quality="actual"
        />
        <OrgMetricCard
          title="Storage (GB-Days)"
          value={formatNumber(ledger?.totalStorageGbDays || 0)}
          detail="Total R2 storage usage calculated daily."
          icon={<HardDrive className="h-5 w-5 text-indigo-500" aria-hidden="true" />}
          quality="actual"
        />
        <OrgMetricCard
          title="Emails Sent"
          value={formatNumber(ledger?.totalEmails || 0)}
          detail="Total SES transactional emails delivered."
          icon={<Mail className="h-5 w-5 text-amber-500" aria-hidden="true" />}
          quality="actual"
        />
        <OrgMetricCard
          title="SMS Segments"
          value={formatNumber(ledger?.totalSmsSegments || 0)}
          detail="Total SMS segments sent via Firebase."
          icon={<MessageSquare className="h-5 w-5 text-emerald-500" aria-hidden="true" />}
          quality="actual"
        />
        <OrgMetricCard
          title="Agora Minutes"
          value={formatNumber(ledger?.totalAgoraMinutes || 0)}
          detail="Total video participant-minutes across live classes."
          icon={<Video className="h-5 w-5 text-rose-500" aria-hidden="true" />}
          quality="actual"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <OrgSectionCard
          title="Current Month Subtotal"
          description="Live accrued charges for the current billing period."
          icon={<Receipt className="h-5 w-5" aria-hidden="true" />}
        >
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="text-4xl font-bold tracking-tight text-foreground">
              {formatCurrency(ledger?.totalAmountInr || 0)}
            </span>
            <span className="mt-2 text-sm text-muted-foreground">Excludes 18% GST (Calculated at end of month)</span>
          </div>
        </OrgSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <OrgSectionCard
          title="Subscription contract"
          description="Plan, billing state, limits, and configured rates from the live subscription record."
          icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
        >
          <dl>
            <OrgDataRow label="Plan" value={humanizeKey(subscription?.plan)} />
            <OrgDataRow label="Subscription status" value={humanizeKey(subscription?.status)} />
            <OrgDataRow
              label="Payment status"
              value={
                subscription?.isPaid === undefined ? (
                  "Not Configured"
                ) : (
                  <Badge variant={subscription.isPaid ? "success" : "warning"}>
                    {subscription.isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                )
              }
            />
            <OrgDataRow label="Renews or expires" value={formatDate(subscription?.expiresAt)} />
            <OrgDataRow label="Storage rate per GB" value={formatCurrency(billing?.pricePerGB)} />
            <OrgDataRow
              label="Included storage"
              value={legacyUsage?.storage?.includedGb === undefined ? "Not Configured" : `${formatNumber(legacyUsage.storage.includedGb)} GB`}
            />
            <OrgDataRow
              label="Tracked billable storage"
              value={legacyUsage?.storage?.billableGb === undefined ? "Not Configured" : `${formatNumber(legacyUsage.storage.billableGb)} GB`}
            />
            <OrgDataRow label="Configured payment method" value={humanizeKey(profile?.paymentMethod)} />
          </dl>
        </OrgSectionCard>

        <OrgSectionCard
          title="Limit utilization"
          description="Usage against subscription limits, with storage based on the currently tracked legacy note-storage meter."
          icon={<HardDrive className="h-5 w-5" aria-hidden="true" />}
        >
          <div className="space-y-3">
            <LimitMeter
              label="Student seats"
              used={studentCount}
              limit={subscription?.metadata?.max_students}
            />
            <LimitMeter
              label="Faculty seats"
              used={facultyCount}
              limit={subscription?.metadata?.max_faculty}
            />
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium">Tracked legacy storage</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatBytes(legacyUsage?.storage?.bytes)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {legacyUsage?.storage?.scope ?? "Storage coverage details are unavailable."}
              </p>
            </div>
          </div>
        </OrgSectionCard>
      </div>

      <OrgSectionCard
        title="Live billing volume"
        description="Actual organization-linked payment and ledger activity already stored in your backend records."
        icon={<Landmark className="h-5 w-5" aria-hidden="true" />}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <dl>
            <OrgDataRow label="Invoices" value={formatNumber(legacyUsage?.finance?.invoices?.total)} />
            <OrgDataRow label="Total billed" value={formatCurrency(legacyUsage?.finance?.invoices?.totalBilledAmount)} />
            <OrgDataRow label="Total paid" value={formatCurrency(legacyUsage?.finance?.invoices?.totalPaidAmount)} />
            <OrgDataRow label="Outstanding" value={formatCurrency(legacyUsage?.finance?.invoices?.totalOutstandingAmount)} />
            <OrgDataRow label="Fee transactions" value={formatNumber(legacyUsage?.finance?.feeCollections?.totalTransactions)} />
            <OrgDataRow label="Collected via fee transactions" value={formatCurrency(legacyUsage?.finance?.feeCollections?.successfulAmount)} />
          </dl>
          <dl>
            <OrgDataRow label="Platform billing transactions" value={formatNumber(legacyUsage?.finance?.platformBilling?.totalTransactions)} />
            <OrgDataRow label="Platform billing collected" value={formatCurrency(legacyUsage?.finance?.platformBilling?.successfulAmount)} />
            <OrgDataRow label="Refunded platform billing" value={formatCurrency(legacyUsage?.finance?.platformBilling?.refundedAmount)} />
            <OrgDataRow label="Payment requests" value={formatNumber(legacyUsage?.finance?.paymentRequests?.total)} />
            <OrgDataRow label="Approved payment-request amount" value={formatCurrency(legacyUsage?.finance?.paymentRequests?.approvedAmount)} />
            <OrgDataRow label="Active student ledgers" value={formatNumber(legacyUsage?.finance?.studentLedger?.totalLedgers)} />
            <OrgDataRow label="Ledger balance" value={formatCurrency(legacyUsage?.finance?.studentLedger?.totalBalance)} />
          </dl>
        </div>
      </OrgSectionCard>
    </div>
  );
}
