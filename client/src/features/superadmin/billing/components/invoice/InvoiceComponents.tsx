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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { FileText, Send, Download, XCircle, ArrowRightCircle, PlusCircle, CalendarClock, History } from 'lucide-react';
import { format } from 'date-fns';
import { MoneyDisplay, AsyncBillingState } from '../shared/BillingStateComponents';
import { BillingDataTable } from '../shared/BillingDataTable';
import { useInvoices, useInvoiceDetail, useIssueInvoice, useInvoiceDeliveryHistory, useInvoicePreview } from '../../hooks/useBillingInvoices';

// 54. InvoiceStatusBadge
export const InvoiceStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' = 'default';
  
  if (['PAID'].includes(status)) variant = 'success';
  if (['VOID', 'OVERDUE', 'FAILED'].includes(status)) variant = 'destructive';
  if (['ISSUED', 'SENT'].includes(status)) variant = 'warning';
  if (['DRAFT'].includes(status)) variant = 'secondary';

  return <Badge variant={variant as any}>{status.replace(/_/g, ' ')}</Badge>;
};

// 55. InvoiceListTable
export const InvoiceListTable: React.FC<{
  filters: any;
  onViewInvoice: (id: string) => void;
}> = ({ filters, onViewInvoice }) => {
  const { data, isLoading, error } = useInvoices(filters);

  return (
    <BillingDataTable
      data={data}
      isLoading={isLoading}
      error={error}
      keyExtractor={(row: any) => row.id || row._id}
      columns={[
        {
          id: 'number',
          header: 'Invoice #',
          cell: (row) => <span className="font-mono">{row.invoiceNumber}</span>,
        },
        {
          id: 'organization',
          header: 'Organization',
          cell: (row) => <span className="font-medium">{row.organizationId?.name || row.organizationId || 'Unavailable'}</span>,
        },
        {
          id: 'date',
          header: 'Issued Date',
          cell: (row) => <span className="text-muted-foreground">{row.issueDate ? format(new Date(row.issueDate), 'MMM dd, yyyy') : 'Not issued'}</span>,
        },
        {
          id: 'amount',
          header: 'Amount',
          cell: (row) => <MoneyDisplay amountPaise={row.totalAmountPaise} />,
        },
        {
          id: 'status',
          header: 'Status',
          cell: (row) => <InvoiceStatusBadge status={row.status} />,
        },
        {
          id: 'actions',
          header: '',
          align: 'right',
          cell: (row) => (
            <Button variant="ghost" size="sm" onClick={() => onViewInvoice(row.id || row._id)} className="h-8 gap-1">
              View <ArrowRightCircle className="w-3 h-3" />
            </Button>
          ),
        }
      ]}
      emptyTitle="No invoices found"
      emptyDescription="No invoices match the current filters."
    />
  );
};

// 56. InvoiceLineItemTable
export const InvoiceLineItemTable: React.FC<{ lineItems: any[] }> = ({ lineItems }) => {
  if (!lineItems || lineItems.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit Price</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lineItems.map((item, idx) => (
          <TableRow key={idx}>
            <TableCell>
              <div className="font-medium">{item.name}</div>
              {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
            </TableCell>
            <TableCell className="text-right">{item.quantity}</TableCell>
            <TableCell className="text-right"><MoneyDisplay amountPaise={item.unitPricePaise} /></TableCell>
            <TableCell className="text-right font-medium"><MoneyDisplay amountPaise={item.totalPaise} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// 57. InvoiceDetailDrawer
export const InvoiceDetailDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
}> = ({ isOpen, onClose, invoiceId }) => {
  const { data: invoice, isLoading, error } = useInvoiceDetail(invoiceId);
  const issueMutation = useIssueInvoice();

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-3xl ml-auto right-0 left-auto h-full rounded-l-xl rounded-r-none">
        <DrawerHeader className="border-b pb-4 flex justify-between items-center">
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Details {invoice && <span className="font-mono text-muted-foreground ml-2">#{invoice.invoiceNumber}</span>}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="sm">Close</Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-muted/10">
          <AsyncBillingState loading={isLoading} error={error} skeletonType="card">
            {invoice && (
              <>
                <div className="flex justify-between items-start bg-card p-6 rounded-lg border shadow-sm">
                  <div>
                    <h3 className="text-3xl font-semibold mb-2">
                      <MoneyDisplay amountPaise={invoice.totalAmountPaise} />
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{invoice.organization?.name || invoice.orgId}</span>
                      <span>•</span>
                      <span>{format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <InvoiceStatusBadge status={invoice.status} />
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" /> PDF
                      </Button>
                      {invoice.status === 'DRAFT' && (
                        <Button 
                          size="sm" 
                          className="gap-2"
                          disabled={issueMutation.isPending}
                          onClick={() => issueMutation.mutate(invoiceId)}
                        >
                          <Send className="w-4 h-4" /> Issue Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader className="py-4 border-b">
                    <CardTitle className="text-base">Line Items</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <InvoiceLineItemTable lineItems={invoice.lineItems} />
                    <div className="p-4 border-t bg-muted/5 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span><MoneyDisplay amountPaise={invoice.subtotalPaise} /></span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Discount</span>
                        <span>-<MoneyDisplay amountPaise={invoice.discountPaise} /></span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax</span>
                        <span><MoneyDisplay amountPaise={invoice.taxPaise} /></span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t mt-2">
                        <span>Total</span>
                        <span><MoneyDisplay amountPaise={invoice.totalAmountPaise} /></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {invoice.status !== 'DRAFT' && (
                  <InvoiceDeliveryHistory invoiceId={invoiceId} />
                )}
              </>
            )}
          </AsyncBillingState>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

// Sub-component for delivery history
const InvoiceDeliveryHistory: React.FC<{ invoiceId: string }> = ({ invoiceId }) => {
  const { data: history, isLoading } = useInvoiceDeliveryHistory(invoiceId);

  return (
    <Card>
      <CardHeader className="py-4 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" /> Delivery History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Loading history...</div>
        ) : !history || history.length === 0 ? (
          <div className="text-sm text-muted-foreground">No delivery history recorded.</div>
        ) : (
          history.map((event: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
              <span className="text-muted-foreground capitalize">{event.method} ({event.destination})</span>
              <div className="text-right">
                <span className={event.status === 'DELIVERED' ? 'text-green-600' : 'text-yellow-600'}>{event.status}</span>
                <div className="text-xs text-muted-foreground">{format(new Date(event.timestamp), 'MMM dd HH:mm')}</div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

// 58. UpcomingInvoicePreview
export const UpcomingInvoicePreview: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const { data: preview, isLoading } = useInvoicePreview({ organizationId, type: 'upcoming' });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading preview...</div>;
  if (!preview) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-3 px-4 border-b border-primary/10">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
          <CalendarClock className="w-4 h-4" />
          Next Invoice Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">Estimated Generation</span>
          <span className="font-medium text-sm">{format(new Date(preview.estimatedDate), 'MMM dd, yyyy')}</span>
        </div>
        <InvoiceLineItemTable lineItems={preview.lineItems} />
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-primary/10">
          <span className="font-medium">Estimated Total</span>
          <span className="font-bold text-primary"><MoneyDisplay amountPaise={preview.totalAmountPaise} /></span>
        </div>
      </CardContent>
    </Card>
  );
};

// 59. ProrationPreview
export const ProrationPreview: React.FC<{ organizationId: string; newPlanId: string }> = ({ organizationId, newPlanId }) => {
  const { data: preview, isLoading } = useInvoicePreview({ organizationId, newPlanId, type: 'proration' });

  if (isLoading) return <div className="text-sm text-muted-foreground animate-pulse p-4">Calculating proration...</div>;
  if (!preview) return null;

  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader className="py-3 px-4 border-b border-warning/10">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ArrowRightCircle className="w-4 h-4 text-warning" />
          Immediate Proration Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <InvoiceLineItemTable lineItems={preview.lineItems} />
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-warning/10">
          <span className="font-medium">Amount Due Today</span>
          <span className="font-bold text-warning"><MoneyDisplay amountPaise={preview.totalAmountPaise} /></span>
        </div>
      </CardContent>
    </Card>
  );
};
