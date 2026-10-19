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
import { Badge } from '@/components/marketing_ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/marketing_ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose, DrawerFooter } from '@/components/marketing_ui/drawer';
import { Input } from '@/components/marketing_ui/input';
import { Label } from '@/components/marketing_ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/marketing_ui/dialog';
import { Tag, ReceiptText, PlusCircle, Save, Percent, HandCoins } from 'lucide-react';
import { format } from 'date-fns';
import { MoneyDisplay, AsyncBillingState } from '../shared/BillingStateComponents';
import { BillingDataTable } from '../shared/BillingDataTable';
import { useDiscounts, useCreateDiscount, useTaxRules, useCreateTaxRule, useGrantCredits } from '../../hooks/useBillingDiscountsTaxes';

// 60. DiscountCatalogTable
export const DiscountCatalogTable: React.FC<{
  onEdit?: (id: string) => void;
}> = ({ onEdit }) => {
  const { data: discounts, isLoading, error } = useDiscounts();

  return (
    <BillingDataTable
      data={discounts}
      isLoading={isLoading}
      error={error}
      keyExtractor={(row: any) => row.id || row._id}
      columns={[
        {
          id: 'code',
          header: 'Code',
          cell: (row) => <span className="font-mono font-medium">{row.code}</span>,
        },
        {
          id: 'type',
          header: 'Type',
          cell: (row) => (
            <Badge variant="secondary" className="capitalize">
              {row.type} {row.type === 'PERCENTAGE' && <Percent className="inline-block w-3 h-3 ml-1" />}
            </Badge>
          ),
        },
        {
          id: 'value',
          header: 'Value',
          cell: (row) => row.type === 'PERCENTAGE' ? `${row.percentage}%` : <MoneyDisplay amountPaise={row.amountPaise} />,
        },
        {
          id: 'status',
          header: 'Status',
          cell: (row) => (
            <Badge variant={row.isActive ? 'success' : 'secondary'}>
              {row.isActive ? 'Active' : 'Archived'}
            </Badge>
          ),
        },
        ...(onEdit ? [{
          id: 'actions',
          header: '',
          align: 'right' as const,
          cell: (row: any) => (
            <Button variant="ghost" size="sm" onClick={() => onEdit(row.id || row._id)}>Edit</Button>
          ),
        }] : [])
      ]}
      emptyTitle="No discounts found"
      emptyDescription="Create a discount code to offer promotions."
    />
  );
};

// 61. DiscountEditorDrawer
export const DiscountEditorDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [value, setValue] = useState('');
  const createMutation = useCreateDiscount();

  const handleSave = () => {
    const numericValue = Number(value);
    if (!name.trim() || !code.trim() || !Number.isFinite(numericValue) || numericValue <= 0) return;
    createMutation.mutate(
      {
        name: name.trim(),
        code: code.trim(),
        discountType: type,
        ...(type === 'PERCENTAGE'
          ? { percentage: numericValue }
          : { amountPaise: numericValue }),
        validFrom: new Date().toISOString(),
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-md ml-auto right-0 left-auto h-full rounded-l-xl rounded-r-none">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Create Discount
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Discount name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Annual subscription offer" />
            </div>
            <div className="space-y-2">
              <Label>Discount Code</Label>
              <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. SUMMER2024" />
            </div>
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={type} onValueChange={(nextType) => {
                if (nextType === 'PERCENTAGE' || nextType === 'FIXED_AMOUNT') setType(nextType);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value {type === 'PERCENTAGE' ? '(%)' : '(in Paise)'}</Label>
              <Input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 10" />
            </div>
          </div>
        </div>
        <DrawerFooter className="border-t">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <Button
            onClick={handleSave}
            disabled={
              createMutation.isPending ||
              !name.trim() ||
              !code.trim() ||
              !Number.isFinite(Number(value)) ||
              Number(value) <= 0
            }
          >
            <Save className="w-4 h-4 mr-2" /> 
            {createMutation.isPending ? 'Saving...' : 'Save Discount'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

// 62. CreditGrantDialog
export const CreditGrantDialog: React.FC<{
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
}> = ({ orgId, isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const grantMutation = useGrantCredits(orgId);

  const handleGrant = () => {
    grantMutation.mutate(
      { amountPaise: Number(amount) * 100, reason },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-primary" />
            Grant Promotional Credits
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Amount (in INR)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" />
          </div>
          <div className="space-y-2">
            <Label>Reason / Note</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Goodwill gesture" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGrant} disabled={grantMutation.isPending || !amount || !reason}>
            Grant Credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 63. TaxRuleTable
export const TaxRuleTable: React.FC<{
  onEdit?: (id: string) => void;
}> = ({ onEdit }) => {
  const { data: rules, isLoading, error } = useTaxRules();

  return (
    <BillingDataTable
      data={rules}
      isLoading={isLoading}
      error={error}
      keyExtractor={(row: any) => row.id || row._id}
      columns={[
        {
          id: 'name',
          header: 'Tax Name',
          cell: (row) => <span className="font-medium">{row.name}</span>,
        },
        {
          id: 'rate',
          header: 'Rate (%)',
          cell: (row) => <span>{row.rate}%</span>,
        },
        {
          id: 'region',
          header: 'Region / State',
          cell: (row) => <span className="text-muted-foreground">{row.region}</span>,
        },
        {
          id: 'status',
          header: 'Status',
          cell: (row) => (
            <Badge variant={row.isActive ? 'success' : 'secondary'}>
              {row.isActive ? 'Active' : 'Archived'}
            </Badge>
          ),
        },
        ...(onEdit ? [{
          id: 'actions',
          header: '',
          align: 'right' as const,
          cell: (row: any) => (
            <Button variant="ghost" size="sm" onClick={() => onEdit(row.id || row._id)}>Edit</Button>
          ),
        }] : [])
      ]}
      emptyTitle="No tax rules found"
      emptyDescription="Create tax rules to apply GST or localized taxes automatically."
    />
  );
};

// 64. TaxRuleEditorDrawer
export const TaxRuleEditorDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [rate, setRate] = useState('');
  const [region, setRegion] = useState('');
  const createMutation = useCreateTaxRule();

  const handleSave = () => {
    const numericRate = Number(rate);
    if (!name.trim() || !code.trim() || !region || !Number.isFinite(numericRate) || numericRate < 0) return;
    createMutation.mutate(
      {
        name: name.trim(),
        code: code.trim(),
        taxPercentage: numericRate,
        placeOfSupplyLogic: region as 'INTRA_STATE' | 'INTER_STATE' | 'INTERNATIONAL',
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-md ml-auto right-0 left-auto h-full rounded-l-xl rounded-r-none">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5" />
            Create Tax Rule
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tax Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. IGST 18%" />
            </div>
            <div className="space-y-2">
              <Label>Tax code</Label>
              <Input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} placeholder="SOFTWARE_SERVICES" />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 18" />
            </div>
            <div className="space-y-2">
              <Label>Applicable Region</Label>
              <Select value={region} onValueChange={(nextRegion) => nextRegion && setRegion(nextRegion)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTER_STATE">Inter-State (IGST)</SelectItem>
                  <SelectItem value="INTRA_STATE">Intra-State (CGST+SGST)</SelectItem>
                  <SelectItem value="INTERNATIONAL">International</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DrawerFooter className="border-t">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <Button
            onClick={handleSave}
            disabled={
              createMutation.isPending ||
              !name.trim() ||
              !code.trim() ||
              !region ||
              !Number.isFinite(Number(rate)) ||
              Number(rate) < 0
            }
          >
            <Save className="w-4 h-4 mr-2" /> 
            {createMutation.isPending ? 'Saving...' : 'Save Tax Rule'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
