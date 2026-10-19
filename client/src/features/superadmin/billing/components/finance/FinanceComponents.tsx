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
import { Box, Building2, Download, FileText, HelpCircle, Landmark, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/marketing_ui/badge';
import { Button } from '@/components/marketing_ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/marketing_ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/marketing_ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/marketing_ui/drawer';
import { Input } from '@/components/marketing_ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { AsyncBillingState, MoneyDisplay } from '../shared/BillingStateComponents';
import {
  useExportRevenue,
  useReconcileRevenue,
  useRevenueByInvoice,
  useRevenueByOrg,
} from '../../hooks/useBillingFinance';
import { useBillingExportDownload, useBillingExportJob } from '../../hooks/useBillingExports';

export {
  RevenueViewTabs,
  RevenueOrganizationTable,
} from './RevenueComponents';

export const RevenueInvoiceTable: React.FC = () => {
  const { data: invoices, isLoading, error } = useRevenueByInvoice();

  return (
    <div className="rounded-md border bg-card">
      <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices?.map((invoice: any) => (
              <TableRow key={invoice._id}>
                <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.organizationId?.name || invoice.organizationId?._id || 'Unavailable'}</TableCell>
                <TableCell>{invoice.issueDate ? format(new Date(invoice.issueDate), 'dd MMM yyyy') : 'Not issued'}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amountPaise={invoice.totalAmountPaise || 0} />
                </TableCell>
                <TableCell><Badge variant="outline">{invoice.status}</Badge></TableCell>
              </TableRow>
            ))}
            {!invoices?.length && (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No invoices found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </AsyncBillingState>
    </div>
  );
};

export const ModulePriceBreakdown: React.FC<{ moduleName: string; stats: any }> = ({ moduleName, stats }) => (
  <Card>
    <CardHeader className="border-b px-4 py-3">
      <CardTitle className="flex items-center gap-2 text-sm">
        <Box className="h-4 w-4" /> {moduleName}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 p-4 text-sm">
      <div className="flex justify-between"><span>Active subscriptions</span><span>{stats?.activeCount || 0}</span></div>
      <div className="flex justify-between"><span>Recognized revenue</span><MoneyDisplay amountPaise={stats?.recognizedRevenuePaise || 0} /></div>
    </CardContent>
  </Card>
);

export const SettlementStatusPanel: React.FC<{ settlementInfo: any }> = ({ settlementInfo }) => (
  <Card>
    <CardHeader className="border-b px-4 py-3">
      <CardTitle className="flex items-center gap-2 text-sm"><Landmark className="h-4 w-4" /> Settlement</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm">
      <div><p className="text-muted-foreground">Provider</p><p>{settlementInfo?.provider || 'Unavailable'}</p></div>
      <div><p className="text-muted-foreground">Provider settlement ID</p><p className="font-mono">{settlementInfo?.providerSettlementId || 'Unavailable'}</p></div>
      <div><p className="text-muted-foreground">Status</p><p>{settlementInfo?.status || 'Unavailable'}</p></div>
      <div><p className="text-muted-foreground">Settled at</p><p>{settlementInfo?.settledAt ? format(new Date(settlementInfo.settledAt), 'dd MMM yyyy') : 'Unavailable'}</p></div>
    </CardContent>
  </Card>
);

export const InvoicePreviewPanel: React.FC<{ invoice: any }> = ({ invoice }) => (
  <Card>
    <CardHeader className="border-b px-4 py-3">
      <CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> Associated invoice</CardTitle>
    </CardHeader>
    <CardContent className="flex items-center justify-between p-4">
      <span className="font-mono text-sm">{invoice?.invoiceNumber || 'Unavailable'}</span>
      <Badge variant="outline">{invoice?.status || 'Unavailable'}</Badge>
    </CardContent>
  </Card>
);

export const RevenueDetailDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}> = ({ isOpen, onClose, orgId }) => {
  const { data, isLoading, error } = useRevenueByOrg();
  const organizationRevenue = data?.find((entry: any) => String(entry._id) === String(orgId));

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent>
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Revenue detail</DrawerTitle>
        </DrawerHeader>
        <div className="p-6">
          <AsyncBillingState loading={isLoading} error={error} skeletonType="card">
            {organizationRevenue ? (
              <Card>
                <CardHeader><CardTitle>{organizationRevenue.organization?.name || orgId}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between"><span>Captured revenue</span><MoneyDisplay amountPaise={organizationRevenue.grossRevenuePaise || 0} /></div>
                  <div className="flex justify-between"><span>Transactions</span><span>{organizationRevenue.transactionCount || 0}</span></div>
                  <div className="flex justify-between"><span>Latest payment</span><span>{organizationRevenue.latestTransactionDate ? format(new Date(organizationRevenue.latestTransactionDate), 'dd MMM yyyy, HH:mm') : 'Unavailable'}</span></div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No captured Classgrid revenue was found for this organization.</p>
            )}
          </AsyncBillingState>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export const RevenueExportDialog: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const exportMutation = useExportRevenue();
  const jobId = exportMutation.data?._id || '';
  const exportJob = useBillingExportJob(jobId);
  const downloadExport = useBillingExportDownload();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Prepare CSV</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Prepare revenue export</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">The backend will create an expiring export job from captured Classgrid subscription payments.</p>
        {exportMutation.isSuccess && (
          <div className="space-y-2 text-sm">
            <p className="text-primary">Export status: {exportJob.data?.status || 'PENDING'}</p>
            <p className="font-mono text-xs text-muted-foreground">{jobId}</p>
            {exportJob.data?.status === 'COMPLETED' && (
              <Button size="sm" onClick={() => downloadExport.mutate(jobId)} disabled={downloadExport.isPending}>
                {downloadExport.isPending ? 'Opening...' : 'Download CSV'}
              </Button>
            )}
            {exportJob.data?.status === 'FAILED' && (
              <p className="text-destructive">{exportJob.data.errorDetails || 'Export generation failed.'}</p>
            )}
          </div>
        )}
        {exportMutation.error && <p className="text-sm text-destructive">{(exportMutation.error as Error).message}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          <Button disabled={exportMutation.isPending || !!jobId} onClick={() => exportMutation.mutate()}>
            {exportMutation.isPending ? 'Preparing...' : jobId ? 'Queued' : 'Prepare export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ReconciliationDialog: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [targetDate, setTargetDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const reconciliation = useReconcileRevenue();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild><Button size="sm"><RefreshCcw className="mr-2 h-4 w-4" />Run reconciliation</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Provider reconciliation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="flex gap-2 text-sm text-muted-foreground"><HelpCircle className="h-4 w-4 shrink-0" />Compare captured Razorpay payments with the Classgrid ledger for one date.</p>
          <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          {reconciliation.error && <p className="text-sm text-destructive">{(reconciliation.error as Error).message}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button disabled={!targetDate || reconciliation.isPending} onClick={() => reconciliation.mutate({ targetDate }, { onSuccess: () => setIsOpen(false) })}>
            {reconciliation.isPending ? 'Checking...' : 'Start check'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
