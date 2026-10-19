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
import { Button } from '@/components/marketing_ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose, DrawerFooter } from '@/components/marketing_ui/drawer';
import { Building2, Receipt, ArrowRightCircle, ExternalLink, CreditCard, Smartphone, Banknote, History, User, Store, ShieldCheck, ShieldAlert, SplitSquareHorizontal, Undo2, MoreVertical, Terminal, Webhook } from 'lucide-react';
import { MoneyDisplay, AsyncBillingState } from '../shared/BillingStateComponents';
import { useTransactions, useTransactionDetail, useTransactionWebhooks, useRefundTransaction } from '../../hooks/useBillingFinance';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/marketing_ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/marketing_ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/marketing_ui/dropdown-menu';
import { DataTable } from '@/components/marketing_ui/data-table';

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const avatarColors = [
  "bg-emerald-500",
  "bg-emerald-600",
  "bg-green-500",
  "bg-green-600",
  "bg-teal-500",
  "bg-teal-600",
];

function getAvatarColor(name: string) {
  if (!name) return "bg-emerald-500";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
}
// 24. TransactionStatusBadge
export const TransactionStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case 'SUCCESS':
    case 'COMPLETED':
    case 'CAPTURED':
      return <Badge className="bg-primary/10 text-primary border-primary/20">SUCCESS</Badge>;
    case 'FAILED':
    case 'DECLINED':
      return <Badge variant="destructive">FAILED</Badge>;
    case 'PENDING':
    case 'PROCESSING':
      return <Badge variant="secondary" className="text-muted-foreground border-dashed">PENDING</Badge>;
    case 'REFUNDED':
    case 'REVERSED':
      return <Badge variant="outline" className="border-primary text-primary border-dashed">REFUNDED</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// 25. TransactionTable
export const TransactionTable: React.FC<{
  onViewDetail: (txId: string) => void;
  filters: any;
}> = ({ onViewDetail, filters }) => {
  const { data: transactions, isLoading, error } = useTransactions(filters);

  const columns = [
    {
      key: "customer",
      header: "Customer",
      render: (_: any, tx: any) => {
        const name = tx.userName || "Unknown";
        const initial = name.charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-3 py-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-[11px] shrink-0 ${getAvatarColor(name)}`}
            >
              {tx.userId?.profilePicture || tx.profilePicture ? (
                <img src={tx.userId?.profilePicture || tx.profilePicture} alt={name} className="w-full h-full object-cover" />
              ) : (
                getInitials(name)
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-sm text-foreground truncate transition-colors" title={name}>
                {name}
              </span>
              <span className="text-muted-foreground text-xs truncate">
                {tx.userEmail || "No email"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "paymentDetail",
      header: "Payment Detail",
      width: "w-[240px]",
      render: (_: any, tx: any) => (
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-sm text-foreground font-medium truncate" title={tx.razorpayPaymentId || tx.id}>
            {tx.razorpayPaymentId || tx.id || "N/A"}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(tx.createdAt), 'EEE MMM dd, h:mma')} • {tx.organization?.name || tx.organizationName || tx.orgId || ""}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "w-[120px]",
      render: (_: any, tx: any) => (
        <span className="text-sm font-medium text-foreground">
          <MoneyDisplay amountPaise={tx.amountPaise} />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[120px]",
      render: (_: any, tx: any) => {
        const isSuccess = tx.status === 'success' || tx.status === 'COMPLETED' || tx.status === 'CAPTURED';
        const isFailed = tx.status === 'failed';
        const isRefunded = tx.status === 'refunded' || tx.status === 'REFUNDED';
        const dotColor = isSuccess ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : isRefunded ? 'bg-indigo-500' : 'bg-amber-500';
        const textColor = isSuccess ? 'text-emerald-500' : isFailed ? 'text-red-500' : isRefunded ? 'text-indigo-500' : 'text-foreground';
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            <span className={`text-xs font-medium ${textColor}`}>
              {tx.status?.charAt(0).toUpperCase() + tx.status?.slice(1) || 'Unknown'}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "w-[90px]",
      render: (_: any, tx: any) => (
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onViewDetail(tx.id); }}
        >
          Read
        </Button>
      ),
    },
  ];

  return (
    <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
      <DataTable 
        columns={columns} 
        rows={transactions || []} 
        emptyMessage="No transactions found matching the criteria."
        onRowClick={(row) => onViewDetail(row.id)}
      />
    </AsyncBillingState>
  );
};

// ── helpers ──
function DetailRow({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 pt-0.5">{label}</span>
      <span className={`text-xs font-medium text-foreground text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

const TIMELINE_STEPS = [
  { key: 'created', label: 'Payment Created', icon: '🕐' },
  { key: 'authorized', label: 'Payment Authorized', icon: '🔐' },
  { key: 'captured', label: 'Payment Captured', icon: '✅' },
  { key: 'settlement', label: 'Settlement', icon: '🏦' },
];

function PaymentStepper({ tx }: { tx: any }) {
  const isSuccess = tx.status === 'success' || tx.status === 'CAPTURED';
  const isFailed = tx.status === 'failed';

  const createdAt = tx.paymentTime || tx.createdAt;
  const capturedAt = tx.paymentTime || tx.createdAt;
  const settlementDate = capturedAt ? new Date(new Date(capturedAt).getTime() + 3 * 24 * 60 * 60 * 1000) : null;
  const now = new Date();
  const isSettled = settlementDate ? settlementDate <= now : false;

  const steps = [
    { label: 'Payment Created', sub: createdAt ? format(new Date(createdAt), 'EEE, dd MMM yyyy hh:mm a') : '—', done: true, failed: false },
    { label: 'Payment Authorized', sub: isSuccess ? (capturedAt ? format(new Date(capturedAt), 'EEE, dd MMM yyyy hh:mm a') : '—') : (isFailed ? 'Not completed' : 'Pending'), done: isSuccess, failed: isFailed },
    { label: 'Payment Captured', sub: isSuccess ? (capturedAt ? format(new Date(capturedAt), 'EEE, dd MMM yyyy hh:mm a') : '—') : (isFailed ? 'Not completed' : 'Pending'), done: isSuccess, failed: isFailed },
    { label: isSettled ? 'Settlement Processed' : 'Settlement Pending', sub: settlementDate ? `Expected by ${format(settlementDate, 'EEE, dd MMM yyyy hh:mm a')}` : '—', done: isSettled && isSuccess, failed: false, pending: !isSettled },
  ];

  return (
    <div className="py-2 space-y-0">
      {steps.map((step, idx) => (
        <div key={idx} className="flex gap-3">
          {/* icon + line */}
          <div className="flex flex-col items-center">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 mt-2.5 transition-colors
              ${step.done ? 'border-emerald-500 bg-emerald-500/10' : step.failed ? 'border-red-500 bg-red-500/10' : 'border-muted-foreground/30 bg-muted/30'}`}>
              {step.done ? (
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : step.failed ? (
                <svg className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-0.5 flex-1 my-1 rounded ${step.done ? 'bg-emerald-500/40' : 'bg-border'}`} style={{ minHeight: '24px' }} />
            )}
          </div>
          {/* content */}
          <div className="pb-4 pt-2.5 min-w-0">
            <p className={`text-xs font-semibold leading-tight ${step.done ? 'text-foreground' : step.failed ? 'text-red-500' : 'text-muted-foreground'}`}>
              {step.label}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{step.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// 26. TransactionDetailDrawer
export const TransactionDetailDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  txId: string;
}> = ({ isOpen, onClose, txId }) => {
  const { data: tx, isLoading, error } = useTransactionDetail(txId);

  const isSuccess = tx?.status === 'success' || tx?.status === 'CAPTURED';
  const isFailed = tx?.status === 'failed';

  // Parse UPI VPA or card details from paymentMethod string (e.g. "upi:nikhilsubsun123-1@okicici")
  const rawMethod = tx?.paymentMethod || '';
  const [methodType, methodDetail] = rawMethod.includes(':') ? rawMethod.split(':', 2) : [rawMethod, ''];

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-lg ml-auto right-0 left-auto h-full rounded-l-xl rounded-r-none flex flex-col">
        <DrawerHeader className="border-b pb-3 shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-sm">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Transaction Details
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          <AsyncBillingState loading={isLoading} error={error} skeletonType="card">
            {tx && (
              <div className="p-4 space-y-3">

                {/* ── SECTION 1: Overview Hero ── */}
                <div className={`rounded-xl border p-4 flex items-center justify-between
                  ${isSuccess ? 'bg-emerald-500/5 border-emerald-500/20' : isFailed ? 'bg-red-500/5 border-red-500/20' : 'bg-card border-border'}`}>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-foreground">
                      ₹{tx.amount?.toFixed ? tx.amount.toFixed(2) : (tx.amountPaise ? (tx.amountPaise / 100).toFixed(2) : '—')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono truncate max-w-[200px]">
                      {tx.razorpayPaymentId || tx._id}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <TransactionStatusBadge status={tx.status || 'unknown'} />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {tx.paymentFlow === 'ai_topup' ? 'AI Top-Up' : tx.paymentFlow === 'subscription' ? 'Subscription' : tx.type || 'Razorpay'}
                    </span>
                  </div>
                </div>

                {/* ── SECTION 2: Customer / User Details ── */}
                <SectionCard icon={<User className="h-3.5 w-3.5" />} title="Customer Details">
                  <div className="py-3 flex justify-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-[16px] shrink-0 ${getAvatarColor(tx.userName || 'Unknown')}`}
                    >
                      {tx.userId?.profilePicture || tx.profilePicture ? (
                        <img src={tx.userId?.profilePicture || tx.profilePicture} alt={tx.userName} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(tx.userName || 'Unknown')
                      )}
                    </div>
                  </div>
                  <DetailRow label="Name" value={tx.userName || 'Unknown'} />
                  <DetailRow label="Email" value={tx.userEmail || '—'} />
                  <DetailRow label="Mobile" value={tx.userMobile || '—'} />
                  <DetailRow label="User ID" value={tx.userId?._id || tx.userId || '—'} mono />
                  <DetailRow label="Role" value={tx.userRole ? tx.userRole.charAt(0).toUpperCase() + tx.userRole.slice(1) : '—'} />
                </SectionCard>

                {/* ── SECTION 3: Payment Method Details ── */}
                <SectionCard icon={<CreditCard className="h-3.5 w-3.5" />} title="Payment Details">
                  <DetailRow label="Payment ID" value={tx.razorpayPaymentId || '—'} mono />
                  <DetailRow label="Order ID" value={tx.razorpayOrderId || '—'} mono />
                  <DetailRow label="Method" value={
                    <span className="flex items-center gap-1.5">
                      {methodType.toLowerCase() === 'upi' && <Smartphone className="h-3 w-3" />}
                      {methodType.toLowerCase() === 'netbanking' && <Banknote className="h-3 w-3" />}
                      {methodType.toLowerCase() === 'card' && <CreditCard className="h-3 w-3" />}
                      <span className="uppercase">{methodType || tx.method || '—'}</span>
                    </span>
                  } />
                  {methodDetail && <DetailRow label={methodType.toLowerCase() === 'upi' ? 'UPI VPA' : methodType.toLowerCase() === 'card' ? 'Card' : 'Account'} value={methodDetail} mono />}
                  {tx.bankRRN && <DetailRow label="Bank RRN" value={tx.bankRRN} mono />}
                  <DetailRow label="Date & Time" value={tx.paymentTime ? format(new Date(tx.paymentTime), 'dd MMM yyyy, hh:mm:ss a') : tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM yyyy, hh:mm:ss a') : '—'} />
                  <DetailRow label="Currency" value={tx.currency || 'INR'} />
                  {tx.note && <DetailRow label="Note" value={tx.note} />}
                </SectionCard>

                {/* ── SECTION 4: Organization ── */}
                {(tx.organizationId || tx.organizationName) && (
                  <SectionCard icon={<Building2 className="h-3.5 w-3.5" />} title="Organization">
                    <DetailRow label="Name" value={tx.organizationId?.name || tx.organizationName || '—'} />
                    <DetailRow label="Org ID" value={tx.organizationId?._id || (typeof tx.organizationId === 'string' ? tx.organizationId : '') || '—'} mono />
                  </SectionCard>
                )}

                {/* ── SECTION 5: Fees & Processing ── */}
                <SectionCard icon={<Receipt className="h-3.5 w-3.5" />} title="Fees & Processing">
                  <DetailRow label="Razorpay Fee" value={tx.feePaise != null ? `₹${(tx.feePaise / 100).toFixed(2)}` : '₹0.00'} />
                  <DetailRow label="GST on Fee" value={tx.taxPaise != null ? `₹${(tx.taxPaise / 100).toFixed(2)}` : '₹0.00'} />
                  <DetailRow label="Net Received" value={
                    tx.amount != null
                      ? `₹${(tx.amount - (tx.feePaise || 0) / 100 - (tx.taxPaise || 0) / 100).toFixed(2)}`
                      : '—'
                  } />
                  {tx.sourceIp && <DetailRow label="Source IP" value={tx.sourceIp} mono />}
                  <DetailRow label="Fee Bearer" value="Merchant" />
                </SectionCard>

                {/* ── SECTION 6: Payment Timeline Stepper ── */}
                <SectionCard icon={<History className="h-3.5 w-3.5" />} title="Payment Timeline">
                  <PaymentStepper tx={tx} />
                </SectionCard>

              </div>
            )}
          </AsyncBillingState>
        </div>

        <DrawerFooter className="border-t shrink-0">
          <DrawerClose asChild>
            <Button variant="outline" size="sm">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};


// 43. TransactionFlowTabs
export const TransactionFlowTabs: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ activeTab, onTabChange }) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full mb-6">
      <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="successful">Successful</TabsTrigger>
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <TabsTrigger value="failed">Failed</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

// 44. PaymentMethodCell
export const PaymentMethodCell: React.FC<{
  method: string; // e.g., 'card', 'upi', 'netbanking'
  brand?: string; // e.g., 'visa', 'mastercard'
  last4?: string;
}> = ({ method, brand, last4 }) => {
  if (!method) return <span className="text-muted-foreground">-</span>;

  let icon = <CreditCard className="w-4 h-4 text-muted-foreground" />;
  if (method.toLowerCase() === 'upi') icon = <Smartphone className="w-4 h-4 text-muted-foreground" />;
  if (method.toLowerCase() === 'netbanking') icon = <Banknote className="w-4 h-4 text-muted-foreground" />;

  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="capitalize">{method}</span>
      {last4 && <span className="text-muted-foreground font-mono text-xs">• {last4}</span>}
      {brand && <Badge variant="outline" className="text-[10px] h-5 px-1 uppercase">{brand}</Badge>}
    </div>
  );
};

// 45. TransactionTimeline
export const TransactionTimeline: React.FC<{
  events: { id: string; status: string; timestamp: string; note?: string }[];
}> = ({ events }) => {
  if (!events || events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          Event Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {events.map((event) => (
            <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-5 h-5 rounded-full border border-primary bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                <div className="w-2 h-2 bg-primary rounded-full" />
              </div>
              <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border bg-card shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm capitalize">{event.status.replace(/_/g, ' ')}</span>
                  <time className="text-xs text-muted-foreground">{format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}</time>
                </div>
                {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// 46. PayerInformationPanel
export const PayerInformationPanel: React.FC<{
  payer: { name?: string; email?: string; contact?: string } | null;
}> = ({ payer }) => {
  if (!payer) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          Payer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2 text-sm">
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">Name</span>
          <span className="font-medium text-foreground">{payer.name || 'Not provided'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">Email</span>
          <span className="text-foreground">{payer.email || '-'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">Contact</span>
          <span className="text-foreground">{payer.contact || '-'}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// 47. MerchantAccountPanel
export const MerchantAccountPanel: React.FC<{
  merchant: { accountId: string; name?: string; settlementStatus?: string } | null;
}> = ({ merchant }) => {
  if (!merchant) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Store className="w-4 h-4 text-muted-foreground" />
          Connected Merchant Account
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2 text-sm">
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground">Account ID</span>
          <span className="font-mono text-foreground">{merchant.accountId}</span>
        </div>
        {merchant.name && (
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Business Name</span>
            <span className="text-foreground">{merchant.name}</span>
          </div>
        )}
        {merchant.settlementStatus && (
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Settlement</span>
            <span className="capitalize">{merchant.settlementStatus}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 48. GatewayResponsePanel
export const GatewayResponsePanel: React.FC<{
  response: any;
}> = ({ response }) => {
  if (!response) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          Raw Gateway Response
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-muted/30">
        <pre className="text-xs font-mono overflow-auto max-h-48 text-muted-foreground">
          {JSON.stringify(response, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
};

// 49. WebhookTimeline
export const WebhookTimeline: React.FC<{ txId: string }> = ({ txId }) => {
  const { data: webhooks, isLoading } = useTransactionWebhooks(txId);

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Webhook className="w-4 h-4 text-muted-foreground" />
          Webhook Events
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Loading webhooks...</div>
        ) : !webhooks || webhooks.length === 0 ? (
          <div className="text-sm text-muted-foreground">No webhooks received for this transaction.</div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh: any) => (
              <div key={wh.id} className="p-3 border rounded-md bg-card text-sm">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{wh.event}</Badge>
                  <time className="text-xs text-muted-foreground">{format(new Date(wh.receivedAt), 'dd MMM HH:mm:ss')}</time>
                </div>
                <div className="text-xs text-muted-foreground">Status: <span className={wh.status === 'processed' ? 'text-green-500' : 'text-yellow-500'}>{wh.status}</span></div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 50. SignatureVerificationPanel
export const SignatureVerificationPanel: React.FC<{
  isVerified: boolean;
  signature?: string;
}> = ({ isVerified, signature }) => {
  if (!signature) return null;

  return (
    <div className={`p-4 rounded-lg border flex items-start gap-3 ${isVerified ? 'bg-green-50/50 border-green-200' : 'bg-destructive/10 border-destructive/20'}`}>
      {isVerified ? (
        <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
      ) : (
        <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
      )}
      <div>
        <h4 className={`text-sm font-semibold ${isVerified ? 'text-green-800' : 'text-destructive'}`}>
          {isVerified ? 'Signature Verified' : 'Signature Verification Failed'}
        </h4>
        <p className={`text-xs mt-1 break-all ${isVerified ? 'text-green-600/80' : 'text-destructive/80'}`}>
          Hash: {signature}
        </p>
      </div>
    </div>
  );
};

// 51. PaymentAllocationPanel
export const PaymentAllocationPanel: React.FC<{
  allocations: { id: string; target: string; amountPaise: number }[];
}> = ({ allocations }) => {
  if (!allocations || allocations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <SplitSquareHorizontal className="w-4 h-4 text-muted-foreground" />
          Fund Allocations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {allocations.map((alloc) => (
          <div key={alloc.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
            <span className="text-muted-foreground">{alloc.target}</span>
            <span className="font-medium text-foreground"><MoneyDisplay amountPaise={alloc.amountPaise} /></span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// 52. RefundPanel
export const RefundPanel: React.FC<{
  refunds: { id: string; amountPaise: number; status: string; createdAt: string }[];
}> = ({ refunds }) => {
  if (!refunds || refunds.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Undo2 className="w-4 h-4 text-muted-foreground" />
          Refunds
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {refunds.map((ref) => (
          <div key={ref.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
            <div>
              <div className="font-medium text-destructive"><MoneyDisplay amountPaise={ref.amountPaise} /></div>
              <div className="text-xs text-muted-foreground font-mono">{ref.id}</div>
            </div>
            <div className="text-right">
              <TransactionStatusBadge status={ref.status} />
              <div className="text-xs text-muted-foreground mt-1">{format(new Date(ref.createdAt), 'MMM dd')}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// 53. TransactionActionMenu
export const TransactionActionMenu: React.FC<{
  txId: string;
  onInitiateRefund: () => void;
  onDownloadReceipt: () => void;
}> = ({ txId, onInitiateRefund, onDownloadReceipt }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onDownloadReceipt}>Download Receipt</DropdownMenuItem>
        <DropdownMenuItem onClick={onInitiateRefund} className="text-destructive">Initiate Refund</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
