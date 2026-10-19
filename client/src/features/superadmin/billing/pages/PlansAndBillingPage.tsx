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

import React, { useState } from 'react';
import { Button } from '@/components/marketing_ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/marketing_ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/marketing_ui/tabs';
import { AsyncBillingState } from '../components/shared/BillingStateComponents';
import { OrganizationSelector } from '../components/shared/BillingFilterComponents';
import {
  InvoiceRulesPanel,
  OrganizationCreditLedger,
  UsageMetricTable,
} from '../components/catalog/PlansBillingComponents';
import {
  PlanCatalogTable,
  PlanEditorDrawer,
} from '../components/catalog/PlanCatalogComponents';
import {
  ModuleCatalogTable,
  ModuleEditorDrawer,
} from '../components/catalog/ModuleCatalogComponents';
import {
  OrganizationSubscriptionDrawer,
  OrganizationSubscriptionTable,
} from '../components/catalog/SubscriptionComponents';
import { OrganizationPricingOverrideTable } from '../components/catalog/OverrideAndProrationComponents';
import {
  CreditGrantDialog,
  DiscountCatalogTable,
  DiscountEditorDrawer,
  TaxRuleEditorDrawer,
  TaxRuleTable,
} from '../components/catalog/DiscountTaxesComponents';
import { useBillingMetrics, useBillingPlans } from '../hooks/useBillingCatalog';

const PlansAndBillingPage = () => {
  const [activeTab, setActiveTab] = useState('plans');
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [moduleEditorOpen, setModuleEditorOpen] = useState(false);
  const [discountEditorOpen, setDiscountEditorOpen] = useState(false);
  const [taxEditorOpen, setTaxEditorOpen] = useState(false);
  const [creditGrantOpen, setCreditGrantOpen] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [managedOrganizationId, setManagedOrganizationId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const { data: plans = [] } = useBillingPlans();
  const { data: metrics = [], isLoading: metricsLoading, error: metricsError } = useBillingMetrics();

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="border-b border-border bg-card p-6">
        <h2 className="text-xl font-semibold tracking-tight">Plans & Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the versioned catalog and organization billing configuration.
        </p>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="subscriptions">Organization Subscriptions</TabsTrigger>
            <TabsTrigger value="overrides">Pricing Overrides</TabsTrigger>
            <TabsTrigger value="metrics">Usage Metrics</TabsTrigger>
            <TabsTrigger value="invoice-rules">Invoice Rules</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="taxes">Taxes</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setPlanEditorOpen(true)}>Create plan</Button>
            </div>
            <PlanCatalogTable />
          </TabsContent>

          <TabsContent value="modules" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setModuleEditorOpen(true)}>Create module</Button>
            </div>
            <ModuleCatalogTable />
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-6">
            <OrganizationSubscriptionTable onManage={setManagedOrganizationId} />
          </TabsContent>

          <TabsContent value="overrides" className="mt-6 space-y-4">
            <OrganizationSelector selectedId={selectedOrganizationId} onSelect={setSelectedOrganizationId} />
            <Card>
              <CardHeader><CardTitle>Organization pricing overrides</CardTitle></CardHeader>
              <CardContent>
                {selectedOrganizationId
                  ? <OrganizationPricingOverrideTable orgId={selectedOrganizationId} />
                  : <p className="text-sm text-muted-foreground">Select an organization to inspect its active price overrides.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Billing metric definitions</CardTitle></CardHeader>
              <CardContent>
                <AsyncBillingState loading={metricsLoading} error={metricsError} skeletonType="table">
                  <UsageMetricTable data={metrics} />
                </AsyncBillingState>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice-rules" className="mt-6 space-y-4">
            <Select value={selectedPlanId} onValueChange={(value) => value && setSelectedPlanId(value)}>
              <SelectTrigger className="w-full max-w-sm"><SelectValue placeholder="Select a plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((plan: any) => (
                  <SelectItem key={plan._id} value={plan._id}>{plan.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlanId
              ? <InvoiceRulesPanel planId={selectedPlanId} />
              : <p className="text-sm text-muted-foreground">Select a plan to view its authoritative invoice rules.</p>}
          </TabsContent>

          <TabsContent value="discounts" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setDiscountEditorOpen(true)}>Create discount</Button>
            </div>
            <DiscountCatalogTable />
          </TabsContent>

          <TabsContent value="credits" className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <OrganizationSelector selectedId={selectedOrganizationId} onSelect={setSelectedOrganizationId} />
              <Button disabled={!selectedOrganizationId} onClick={() => setCreditGrantOpen(true)}>Grant credit</Button>
            </div>
            {selectedOrganizationId
              ? <OrganizationCreditLedger orgId={selectedOrganizationId} />
              : <p className="text-sm text-muted-foreground">Select an organization to view its credit ledger.</p>}
          </TabsContent>

          <TabsContent value="taxes" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setTaxEditorOpen(true)}>Create tax rule</Button>
            </div>
            <TaxRuleTable />
          </TabsContent>
        </Tabs>
      </div>

      <PlanEditorDrawer isOpen={planEditorOpen} onClose={() => setPlanEditorOpen(false)} mode="create" />
      <ModuleEditorDrawer isOpen={moduleEditorOpen} onClose={() => setModuleEditorOpen(false)} />
      <DiscountEditorDrawer isOpen={discountEditorOpen} onClose={() => setDiscountEditorOpen(false)} />
      <TaxRuleEditorDrawer isOpen={taxEditorOpen} onClose={() => setTaxEditorOpen(false)} />
      <CreditGrantDialog
        orgId={selectedOrganizationId}
        isOpen={creditGrantOpen}
        onClose={() => setCreditGrantOpen(false)}
      />
      {managedOrganizationId && (
        <OrganizationSubscriptionDrawer
          isOpen
          orgId={managedOrganizationId}
          onClose={() => setManagedOrganizationId('')}
        />
      )}
    </div>
  );
};

export default PlansAndBillingPage;
