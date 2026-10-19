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
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/marketing_ui/tabs';
import { PillTabs } from '@/components/marketing_ui/pill-tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { Badge } from '@/components/marketing_ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/marketing_ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/marketing_ui/sheet';
import { Input } from '@/components/marketing_ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { Button } from '@/components/marketing_ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/marketing_ui/dialog';
import { Skeleton } from '@/components/marketing_ui/skeleton';
import { Label } from '@/components/marketing_ui/label';
import { Textarea } from '@/components/marketing_ui/textarea';
import { MoreHorizontal, Plus, ArrowRight, Settings2, History, Lock, Calculator, FileText, AlertTriangle } from 'lucide-react';
import { MoneyDisplay, BillingStatusBadge, AsyncBillingState } from '../shared/BillingStateComponents';
import { useBillingPlans, usePlanVersions, usePlanVersionDetail, useCreatePlan, useModuleVersions, usePlanEligibility, useUpdatePlanEligibility, useModuleEligibility, useUpdateModuleEligibility } from '../../hooks/useBillingCatalog';

// 1. PlansBillingTabs
export const PlansBillingTabs: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}> = ({ activeTab, onTabChange, children }) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <div className="flex justify-between items-center mb-6">
        <TabsList>
          <TabsTrigger value="plans">Base Plans</TabsTrigger>
          <TabsTrigger value="modules">Add-on Modules</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility Rules</TabsTrigger>
          <TabsTrigger value="taxes">Tax Rules</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
};

// 2. PlanCatalogTable
export const PlanCatalogTable: React.FC<{
  onEdit?: (id: string) => void;
  onViewHistory?: (id: string) => void;
}> = ({ onEdit, onViewHistory }) => {
  const { data: plans, isLoading, error } = useBillingPlans();

  return (
    <div className="rounded-md border bg-card">
      <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>System Code</TableHead>
              <TableHead>Active Version</TableHead>
              <TableHead>Base Monthly</TableHead>
              <TableHead>Status</TableHead>
              {(onEdit || onViewHistory) && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans?.map((plan: any) => (
              <TableRow key={plan._id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{plan.code}</TableCell>
                <TableCell>v{plan.activeVersionId?.versionNumber || 1}</TableCell>
                <TableCell><MoneyDisplay amountPaise={plan.activeVersionId?.monthlyBasePricePaise || 0} /></TableCell>
                <TableCell><BillingStatusBadge status={plan.status} /></TableCell>
                {(onEdit || onViewHistory) && <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && <DropdownMenuItem onClick={() => onEdit(plan._id)}>Edit Draft</DropdownMenuItem>}
                      {onViewHistory && <DropdownMenuItem onClick={() => onViewHistory(plan._id)}>Version History</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>}
              </TableRow>
            ))}
            {plans?.length === 0 && (
              <TableRow>
                <TableCell colSpan={onEdit || onViewHistory ? 6 : 5} className="h-24 text-center text-muted-foreground">
                  No plans found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AsyncBillingState>
    </div>
  );
};

// 3. PlanEditorDrawer
export const PlanEditorDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
}> = ({ isOpen, onClose, mode }) => {
  const { mutateAsync: createPlan, isPending } = useCreatePlan();
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });

  const handleSave = async () => {
    if (mode === 'create') {
      await createPlan({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        currency: 'INR',
      });
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{mode === 'create' ? 'Create New Plan' : 'Edit Plan Draft'}</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          <div className="grid gap-2">
            <Label>Plan Name</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Enterprise School Suite" />
          </div>
          <div className="grid gap-2">
            <Label>System Code</Label>
            <Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="ENT_SCHOOL_BASE" className="font-mono" disabled={mode === 'edit'} />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe who this plan is for." />
          </div>
          <p className="text-xs text-muted-foreground">Pricing is published separately as an immutable plan version.</p>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSave} disabled={isPending || !formData.name.trim() || !formData.code.trim()}>{isPending ? 'Saving...' : 'Save Draft'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// 4. PlanVersionHistory
export const PlanVersionHistory: React.FC<{
  planId: string;
  onCompare: (v1: number, v2: number) => void;
}> = ({ planId, onCompare }) => {
  const { data: versions, isLoading, error } = usePlanVersions(planId);

  return (
    <div className="rounded-md border bg-card">
      <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Published Date</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions?.map((v: any) => (
              <TableRow key={v.versionNumber}>
                <TableCell className="font-medium">v{v.versionNumber}</TableCell>
                <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                <TableCell><MoneyDisplay amountPaise={v.monthlyBasePricePaise} /></TableCell>
                <TableCell><BillingStatusBadge status={v.status || 'ACTIVE'} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onCompare(v.versionNumber, versions[0].versionNumber)}>
                    Compare to Active
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {versions?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No versions history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AsyncBillingState>
    </div>
  );
};

// 5. PlanVersionComparison
export const PlanVersionComparison: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  v1: number;
  v2: number;
}> = ({ isOpen, onClose, planId, v1, v2 }) => {
  const { data: version1, isLoading: load1 } = usePlanVersionDetail(planId, v1);
  const { data: version2, isLoading: load2 } = usePlanVersionDetail(planId, v2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Version Comparison: v{v1} vs v{v2}</DialogTitle>
        </DialogHeader>
        <AsyncBillingState loading={load1 || load2} skeletonType="card">
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-semibold mb-4 text-muted-foreground flex items-center justify-between">
                Version {v1} <Badge variant="secondary">ARCHIVED</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly:</span> <span><MoneyDisplay amountPaise={version1?.monthlyBasePricePaise || 0} /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Org Limit:</span> <span>{version1?.organizationLimit || 'Unlimited'}</span></div>
              </div>
            </div>
            <div className="border rounded-lg p-4 border-primary/20 bg-primary/5">
              <h4 className="font-semibold mb-4 text-primary flex items-center justify-between">
                Version {v2} <Badge>ACTIVE</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly:</span> <span className="text-primary font-medium"><MoneyDisplay amountPaise={version2?.monthlyBasePricePaise || 0} /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Org Limit:</span> <span className="text-primary font-medium">{version2?.organizationLimit || 'Unlimited'}</span></div>
              </div>
            </div>
          </div>
        </AsyncBillingState>
      </DialogContent>
    </Dialog>
  );
};

// 85. PlanEligibilityEditor
export const PlanEligibilityEditor: React.FC<{ planId: string }> = ({ planId }) => {
  const { data: plan, isLoading } = usePlanEligibility(planId);
  const { mutate: updateEligibility, isPending } = useUpdatePlanEligibility();
  
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const handleToggleOrgType = (type: string) => {
    if (!plan) return;
    const current = plan.allowedOrgTypes || [];
    const updated = current.includes(type) ? current.filter((t: string) => t !== type) : [...current, type];
    updateEligibility({ planId, payload: { allowedOrgTypes: updated } });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card mt-4">
      <h3 className="font-semibold flex items-center gap-2"><Settings2 className="w-4 h-4" /> Eligibility Rules</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Allowed Org Types (Click to toggle)</Label>
          <div className="flex gap-2 flex-wrap">
            {['K-12 School', 'University', 'Coaching', 'Corporate'].map(type => (
              <Badge 
                key={type} 
                variant={plan?.allowedOrgTypes?.includes(type) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleToggleOrgType(type)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <Button size="sm" disabled={isPending}>{isPending ? 'Saving...' : 'Rules Auto-Save'}</Button>
    </div>
  );
};

export { ModuleVersionHistory, ModulePricingTypeSelector } from './ModuleCatalogComponents';

// 88. ModuleEligibilityEditor
export const ModuleEligibilityEditor: React.FC<{ moduleId: string }> = ({ moduleId }) => {
  const { data: module, isLoading } = useModuleEligibility(moduleId);
  const updateEligibility = useUpdateModuleEligibility();
  const [orgType, setOrgType] = useState('');
  const allowedOrgTypes: string[] = module?.allowedOrgTypes || [];

  const save = (nextTypes: string[]) => {
    updateEligibility.mutate({ moduleId, payload: { allowedOrgTypes: nextTypes } });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h3 className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Module eligibility</h3>
      <AsyncBillingState loading={isLoading} skeletonType="form">
        <div className="flex flex-wrap gap-2">
          {allowedOrgTypes.map((type) => (
            <Button key={type} variant="outline" size="sm" onClick={() => save(allowedOrgTypes.filter((item) => item !== type))}>
              {type} ×
            </Button>
          ))}
          {!allowedOrgTypes.length && <p className="text-sm text-muted-foreground">Available to every organization type.</p>}
        </div>
        <div className="flex gap-2">
          <Input value={orgType} onChange={(event) => setOrgType(event.target.value)} placeholder="Organization type code" />
          <Button
            disabled={!orgType.trim() || updateEligibility.isPending}
            onClick={() => {
              const normalized = orgType.trim();
              if (!allowedOrgTypes.includes(normalized)) save([...allowedOrgTypes, normalized]);
              setOrgType('');
            }}
          >
            Add
          </Button>
        </div>
      </AsyncBillingState>
    </div>
  );
};

// 89. EffectiveDateSelector
export const EffectiveDateSelector: React.FC<{ date: Date | null; onSelect: (d: Date | null) => void }> = ({ date, onSelect }) => (
  <div className="space-y-2">
    <Label>Effective Date</Label>
    <Input type="date" value={date ? format(date, 'yyyy-MM-dd') : ''} onChange={e => onSelect(e.target.value ? new Date(e.target.value) : null)} />
    <p className="text-xs text-muted-foreground">When will this pricing change take effect for existing subscriptions?</p>
  </div>
);

// 90. SubscriptionChangeReasonDialog
export const SubscriptionChangeReasonDialog: React.FC<{ isOpen: boolean; onConfirm: (reason: string) => void; onCancel: () => void }> = ({ isOpen, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reason for Modification</DialogTitle></DialogHeader>
        <div className="py-4 space-y-2">
          <Label>Audit Log Reason</Label>
          <Textarea placeholder="E.g., Client requested downgrade due to budget constraints." value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(reason)} disabled={!reason}>Confirm Change</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 91. UsageMetricTable
export const UsageMetricTable: React.FC<{ data: any[] }> = ({ data }) => (
  <Table>
    <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Unit</TableHead><TableHead>Aggregation</TableHead><TableHead>Supported organization types</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
    <TableBody>
      {data?.map((item, idx) => (
        <TableRow key={item._id || item.code || idx}>
          <TableCell><p className="font-medium">{item.name}</p><p className="font-mono text-xs text-muted-foreground">{item.code}</p></TableCell>
          <TableCell>{item.unitLabel}</TableCell>
          <TableCell>{item.aggregationType}</TableCell>
          <TableCell>{item.supportedOrgTypes?.length ? item.supportedOrgTypes.join(', ') : 'All organization types'}</TableCell>
          <TableCell>
            <Badge variant={item.isActive ? 'success' : 'secondary'}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </TableCell>
        </TableRow>
      ))}
      {(!data || data.length === 0) && (
        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No billing metrics found.</TableCell></TableRow>
      )}
    </TableBody>
  </Table>
);

// 92. UsageCalculationPreview
export const UsageCalculationPreview: React.FC<{ calculations: any[]; nextInvoiceProjection: number }> = ({ calculations, nextInvoiceProjection }) => (
  <div className="p-4 border rounded-lg bg-card space-y-3">
    <h4 className="font-medium text-sm flex items-center gap-2"><Calculator className="w-4 h-4" /> Live Overage Calculation</h4>
    {calculations?.map((calc, idx) => (
      <div key={idx} className="flex justify-between text-sm border-b pb-1">
        <span className="text-muted-foreground">{calc.label}</span>
        <span><MoneyDisplay amountPaise={calc.amountPaise} /></span>
      </div>
    ))}
    {(!calculations || calculations.length === 0) && <p className="text-sm text-muted-foreground">No overages calculated.</p>}
    <div className="flex justify-between text-sm font-semibold pt-2">
      <span className="text-primary">Next Invoice Projection</span>
      <span className="text-primary"><MoneyDisplay amountPaise={nextInvoiceProjection} /></span>
    </div>
  </div>
);

// 93. InvoiceRulesPanel
export const InvoiceRulesPanel: React.FC<{ planId: string }> = ({ planId }) => {
  const { data: plan } = usePlanEligibility(planId);
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Invoicing Rules</h3>
      <p className="text-sm text-muted-foreground">
        {plan?.invoiceRules
          ? `Cycle: ${plan.invoiceRules.cycle}; terms: ${plan.invoiceRules.netTerms}.`
          : 'No plan-specific invoice rule is configured. Subscription cycle and invoice due dates remain authoritative.'}
      </p>
    </div>
  );
};

// 94. PriceChangeConfirmationDialog
export const PriceChangeConfirmationDialog: React.FC<{ isOpen: boolean; onConfirm: () => void; onCancel: () => void; impactCount: number }> = ({ isOpen, onConfirm, onCancel, impactCount }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
    <DialogContent>
      <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Confirm Price Change</DialogTitle></DialogHeader>
      <p className="text-sm py-4">You are about to publish a new pricing version. This will affect <strong>{impactCount}</strong> organizations on their next billing cycle if you choose to enforce it globally. Are you absolutely sure?</p>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="destructive" onClick={onConfirm}>Yes, Publish Price</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// 95. SubscriptionHistoryTimeline
export const SubscriptionHistoryTimeline: React.FC<{ history: any[] }> = ({ history }) => (
  <div className="space-y-4 pl-4 border-l-2 border-border ml-2">
    {history?.map((event, idx) => (
      <div key={idx} className="relative">
        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-muted-foreground'} ring-4 ring-background`}></div>
        <p className="text-sm font-medium">{event.actionLabel}</p>
        <p className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleDateString()} by {event.actorEmail}</p>
      </div>
    ))}
    {(!history || history.length === 0) && <p className="text-sm text-muted-foreground">No history available.</p>}
  </div>
);

// 96. TerminologyPricingPreview
export const TerminologyPricingPreview: React.FC<{ planName: string; features: string; pricePaise: number; interval: string }> = ({ planName, features, pricePaise, interval }) => (
  <div className="p-4 border border-dashed rounded-lg bg-muted/10">
    <h4 className="text-sm font-semibold mb-2">Checkout Preview</h4>
    <p className="text-xs text-muted-foreground mb-4">How this plan appears to organization administrators during checkout:</p>
    <div className="bg-background p-4 rounded border shadow-sm flex justify-between items-center">
      <div>
        <p className="font-medium">{planName || 'Unnamed Plan'}</p>
        <p className="text-xs text-muted-foreground">{features || 'Standard Features'}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-lg"><MoneyDisplay amountPaise={pricePaise || 0} /><span className="text-xs text-muted-foreground font-normal">/{interval.toLowerCase()}</span></p>
        <p className="text-xs text-success">Billed {interval}</p>
      </div>
    </div>
  </div>
);
