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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { Badge } from '@/components/marketing_ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/marketing_ui/sheet';
import { Input } from '@/components/marketing_ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { Button } from '@/components/marketing_ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/marketing_ui/radio-group';
import { Label } from '@/components/marketing_ui/label';
import { BillingStatusBadge, MoneyDisplay, AsyncBillingState } from '../shared/BillingStateComponents';
import { Info } from 'lucide-react';
import { useBillingModules, useModuleVersions, useCreateModule } from '../../hooks/useBillingCatalog';

// 7. ModuleCatalogTable
export const ModuleCatalogTable: React.FC<{
  onEdit?: (id: string) => void;
}> = ({ onEdit }) => {
  const { data: modules, isLoading, error } = useBillingModules();

  return (
    <div className="rounded-md border bg-card">
      <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module Name</TableHead>
              <TableHead>Pricing Strategy</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Status</TableHead>
              {onEdit && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules?.map((mod: any) => (
              <TableRow key={mod._id}>
                <TableCell className="font-medium">{mod.name}</TableCell>
                <TableCell><Badge variant="outline">{mod.pricingType}</Badge></TableCell>
                <TableCell><MoneyDisplay amountPaise={mod.activeVersionId?.monthlyPricePaise || 0} /></TableCell>
                <TableCell><BillingStatusBadge status={mod.status} /></TableCell>
                {onEdit && <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(mod._id)}>Configure</Button>
                </TableCell>}
              </TableRow>
            ))}
            {modules?.length === 0 && (
              <TableRow>
                <TableCell colSpan={onEdit ? 5 : 4} className="h-24 text-center text-muted-foreground">
                  No modules found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AsyncBillingState>
    </div>
  );
};

// 8. ModuleEditorDrawer
export const ModuleEditorDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { mutateAsync: createModule, isPending } = useCreateModule();
  const [formData, setFormData] = useState({ name: '', code: '', category: '', pricingType: 'FIXED' });

  const handleSave = async () => {
    await createModule({
      name: formData.name,
      code: formData.code,
      category: formData.category,
      pricingType: formData.pricingType,
    });
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configure Add-on Module</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          <div className="grid gap-2">
            <Label>Module Name</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Advanced Analytics" />
          </div>
          <div className="grid gap-2">
            <Label>System Code</Label>
            <Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="MOD_ADV_ANALYTICS" className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Academic, Finance, Communication..." />
          </div>
          
          <ModulePricingTypeSelector value={formData.pricingType} onChange={v => setFormData({ ...formData, pricingType: v })} />
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <Info className="w-3 h-3 mr-1" /> Save the module first, then publish a separately versioned price.
          </p>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button
            onClick={handleSave}
            disabled={isPending || !formData.name.trim() || !formData.code.trim() || !formData.category.trim()}
          >
            {isPending ? 'Saving...' : 'Save Module'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// 9. ModuleVersionHistory
export const ModuleVersionHistory: React.FC<{
  moduleId: string;
}> = ({ moduleId }) => {
  const { data: versions, isLoading, error } = useModuleVersions(moduleId);

  return (
    <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>Published Date</TableHead>
            <TableHead>Unit Price</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions?.map((v: any) => (
            <TableRow key={v.versionNumber}>
              <TableCell>v{v.versionNumber}</TableCell>
              <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
              <TableCell><MoneyDisplay amountPaise={v.monthlyPricePaise || 0} /></TableCell>
              <TableCell><BillingStatusBadge status={v.status || 'ACTIVE'} /></TableCell>
            </TableRow>
          ))}
          {versions?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No versions history found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </AsyncBillingState>
  );
};

// 10. ModulePricingTypeSelector
export const ModulePricingTypeSelector: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  return (
    <div className="grid gap-3">
      <Label>Pricing Strategy</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex flex-col space-y-2">
        <div className="flex items-start space-x-3 border p-3 rounded-md bg-card">
          <RadioGroupItem value="FIXED" id="r-fixed" className="mt-1" />
          <Label htmlFor="r-fixed" className="font-normal cursor-pointer">
            <div className="font-medium text-foreground">Fixed Recurring</div>
            <div className="text-muted-foreground text-sm">A flat fee billed every cycle, regardless of usage.</div>
          </Label>
        </div>
        <div className="flex items-start space-x-3 border p-3 rounded-md bg-card">
          <RadioGroupItem value="PER_USER" id="r-user" className="mt-1" />
          <Label htmlFor="r-user" className="font-normal cursor-pointer">
            <div className="font-medium text-foreground">Per Active User</div>
            <div className="text-muted-foreground text-sm">Multiplied by the number of active users/learners.</div>
          </Label>
        </div>
        <div className="flex items-start space-x-3 border p-3 rounded-md bg-card">
          <RadioGroupItem value="USAGE_BASED" id="r-usage" className="mt-1" />
          <Label htmlFor="r-usage" className="font-normal cursor-pointer">
            <div className="font-medium text-foreground">Metered Usage</div>
            <div className="text-muted-foreground text-sm">Billed post-cycle based on actual consumption (e.g. SMS credits).</div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
