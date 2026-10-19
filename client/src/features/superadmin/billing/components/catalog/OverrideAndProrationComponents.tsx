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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/marketing_ui/dialog';
import { SelectAdvanced } from '@/components/marketing_ui/select-advanced';
import { Button } from '@/components/marketing_ui/button';
import { Input } from '@/components/marketing_ui/input';
import { Label } from '@/components/marketing_ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/marketing_ui/card';
import { AlertCircle, FileText } from 'lucide-react';
import { MoneyDisplay, AsyncBillingState } from '../shared/BillingStateComponents';
import { useBillingModules } from '../../hooks/useBillingCatalog';
import { usePricingOverrides, useSetPricingOverride, useAddSubscriptionModule } from '../../hooks/useBillingSubscriptions';

// 16. ModuleAssignmentDialog
export const ModuleAssignmentDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}> = ({ isOpen, onClose, orgId }) => {
  const { data: modules, isLoading } = useBillingModules();
  const [selectedModule, setSelectedModule] = useState<string>('');
  const addModule = useAddSubscriptionModule();

  const moduleOptions = modules?.map((module: any) => ({
    label: module.name,
    value: module.activeVersionId?._id || module.activeVersionId,
  })).filter((option: any) => option.value) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Add-on Module</DialogTitle>
        </DialogHeader>
        <AsyncBillingState loading={isLoading} skeletonType="form">
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label>Select Module</Label>
              <SelectAdvanced
                options={moduleOptions}
                value={selectedModule}
                onChange={setSelectedModule}
                placeholder="Search modules..."
              />
            </div>
            <div className="p-3 bg-primary/10 text-primary text-sm rounded-md border border-primary/20">
              Billing will start immediately. A prorated invoice will be generated for the remainder of the current cycle.
            </div>
          </div>
        </AsyncBillingState>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!selectedModule || addModule.isPending}
            onClick={() => addModule.mutate(
              { orgId, billingModuleVersionId: selectedModule },
              { onSuccess: onClose }
            )}
          >
            {addModule.isPending ? 'Assigning...' : 'Assign module'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 17. ModuleOverrideDialog
export const ModuleOverrideDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  moduleId: string;
  moduleName: string;
  currentPricePaise: number;
}> = ({ isOpen, onClose, orgId, moduleId, moduleName, currentPricePaise }) => {
  const { mutateAsync: setOverride, isPending } = useSetPricingOverride();
  const [overridePrice, setOverridePrice] = useState(String(currentPricePaise));

  const handleSave = async () => {
    await setOverride({ orgId, moduleId, overridePricePaise: Number(overridePrice) });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Custom Pricing</DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-6">
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">Module</p>
            <p className="font-semibold">{moduleName}</p>
          </div>
          <div className="space-y-2">
            <Label>New Unit Price (Paise)</Label>
            <Input 
              type="number" 
              value={overridePrice}
              onChange={e => setOverridePrice(e.target.value)} 
              placeholder={String(currentPricePaise)} 
            />
            <p className="text-xs text-muted-foreground pt-1">
              This price will override the standard catalog price for this organization only.
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isPending}>{isPending ? 'Saving...' : 'Save Custom Price'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 18. OrganizationPricingOverrideTable
export const OrganizationPricingOverrideTable: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { data: overrides, isLoading } = usePricingOverrides(orgId);
  const [selectedModule, setSelectedModule] = useState<any>(null);

  if (isLoading) return <AsyncBillingState loading={true} skeletonType="table" />;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>Custom Price</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overrides?.length ? overrides.map((override: any) => (
            <TableRow key={override._id}>
              <TableCell>{override.moduleId?.name}</TableCell>
              <TableCell><MoneyDisplay amountPaise={override.overridePricePaise} /></TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => setSelectedModule(override.moduleId)}>Edit</Button>
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">No overrides found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {selectedModule && (
        <ModuleOverrideDialog 
          isOpen={!!selectedModule}
          onClose={() => setSelectedModule(null)}
          orgId={orgId}
          moduleId={selectedModule._id}
          moduleName={selectedModule.name}
          currentPricePaise={0}
        />
      )}
    </div>
  );
};

export { ProrationPreview, UpcomingInvoicePreview } from '../invoice/InvoiceComponents';
