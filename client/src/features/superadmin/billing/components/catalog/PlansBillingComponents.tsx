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

import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/marketing_ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { AsyncBillingState, MoneyDisplay } from '../shared/BillingStateComponents';
import { DiscountCatalogTable, TaxRuleTable } from './DiscountTaxesComponents';
import { useCreditAccount, useTaxRuleVersions } from '../../hooks/useBillingDiscountsTaxes';

export {
  PlanCatalogTable,
  PlanEditorDrawer,
  PlanVersionHistory,
  PlanVersionComparison,
  PlanEligibilityEditor,
  ModulePricingTypeSelector,
  ModuleEligibilityEditor,
  EffectiveDateSelector,
  SubscriptionChangeReasonDialog,
  UsageMetricTable,
  UsageCalculationPreview,
  InvoiceRulesPanel,
  PriceChangeConfirmationDialog,
  SubscriptionHistoryTimeline,
  TerminologyPricingPreview,
} from './PlanCatalogComponents';

export {
  ModuleCatalogTable,
  ModuleEditorDrawer,
  ModuleVersionHistory,
} from './ModuleCatalogComponents';

export {
  BillingMetricSelector,
  OrganizationSubscriptionTable,
  OrganizationSubscriptionDrawer,
  PlanAssignmentDialog,
} from './SubscriptionComponents';

export {
  ModuleAssignmentDialog,
  ModuleOverrideDialog,
  OrganizationPricingOverrideTable,
  ProrationPreview,
  UpcomingInvoicePreview,
} from './OverrideAndProrationComponents';

export const DiscountManagementPanel: React.FC<{ onEdit: (discountId: string) => void }> = ({ onEdit }) => (
  <DiscountCatalogTable onEdit={onEdit} />
);

export const DiscountRedemptionTable: React.FC<{ redemptions: any[] }> = ({ redemptions }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Organization</TableHead>
        <TableHead>Invoice</TableHead>
        <TableHead className="text-right">Discount</TableHead>
        <TableHead>Redeemed</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {redemptions.map((redemption) => (
        <TableRow key={redemption._id}>
          <TableCell>{redemption.organizationId?.name || redemption.organizationId || 'Unavailable'}</TableCell>
          <TableCell className="font-mono">{redemption.invoiceId || 'Unavailable'}</TableCell>
          <TableCell className="text-right"><MoneyDisplay amountPaise={redemption.discountAmountPaise || 0} /></TableCell>
          <TableCell>{redemption.createdAt ? format(new Date(redemption.createdAt), 'dd MMM yyyy') : 'Unavailable'}</TableCell>
        </TableRow>
      ))}
      {!redemptions.length && (
        <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No discount redemptions found.</TableCell></TableRow>
      )}
    </TableBody>
  </Table>
);

export const OrganizationCreditLedger: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { data, isLoading, error } = useCreditAccount(orgId);
  return (
    <Card>
      <CardHeader><CardTitle>Organization credit ledger</CardTitle></CardHeader>
      <CardContent>
        <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
          <div className="mb-4 flex justify-between text-sm">
            <span>Current balance</span>
            <MoneyDisplay amountPaise={data?.account?.currentBalancePaise || 0} />
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {data?.history?.map((entry: any) => (
                <TableRow key={entry._id}>
                  <TableCell>{entry.entryType}</TableCell>
                  <TableCell>{entry.reason}</TableCell>
                  <TableCell className="text-right"><MoneyDisplay amountPaise={entry.amountPaise || 0} showSign /></TableCell>
                </TableRow>
              ))}
              {!data?.history?.length && <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No credit entries found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </AsyncBillingState>
      </CardContent>
    </Card>
  );
};

export const TaxConfigurationPanel: React.FC<{ onEdit: (taxRuleId: string) => void }> = ({ onEdit }) => (
  <TaxRuleTable onEdit={onEdit} />
);

export const TaxRuleVersionHistory: React.FC<{ taxRuleId: string }> = ({ taxRuleId }) => {
  const { data = [], isLoading, error } = useTaxRuleVersions(taxRuleId);
  return (
    <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
      <Table>
        <TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Total tax</TableHead><TableHead>Effective from</TableHead></TableRow></TableHeader>
        <TableBody>
          {data.map((version: any) => (
            <TableRow key={version._id}>
              <TableCell>v{version.versionNumber}</TableCell>
              <TableCell>{version.taxPercentage}%</TableCell>
              <TableCell>{version.effectiveFrom ? format(new Date(version.effectiveFrom), 'dd MMM yyyy') : 'Unavailable'}</TableCell>
            </TableRow>
          ))}
          {!data.length && <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No tax versions found.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </AsyncBillingState>
  );
};
