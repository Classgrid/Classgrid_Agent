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
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { formatDate } from "@/utils/dateUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { Button } from "@/components/marketing_ui/button";
import { ArrowLeft, RefreshCw, ServerCrash, CheckCircle2, Clock, Globe, ShieldAlert, CreditCard } from "lucide-react";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";

export default function TransactionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["superadmin", "transaction", id],
    queryFn: () => apiClient.get(`/api/super-admin/transactions/${id}`).then((r) => r.data),
  });

  const tx = data?.data;

  useEffect(() => {
    if (tx) {
      setBreadcrumbs([
        { label: "Transactions", href: "/super-admin/billing/transactions" },
        { label: tx._id },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [tx, setBreadcrumbs]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-64 bg-muted animate-pulse rounded-md"></div>
          <div className="h-4 w-96 bg-muted animate-pulse rounded-md mt-2"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-[250px] bg-muted animate-pulse rounded-xl"></div>
          <div className="h-[250px] bg-muted animate-pulse rounded-xl"></div>
          <div className="h-[200px] bg-muted animate-pulse rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (isError || !tx) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center space-y-4">
        <ServerCrash className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Failed to load transaction details.</p>
        <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
      </div>
    );
  }

  // Extract method details
  const rawMethod = tx.paymentMethod || '';
  const [methodType, methodDetail] = rawMethod.includes(':') ? rawMethod.split(':', 2) : [rawMethod, ''];

  const isSuccess = tx.status === 'success' || tx.status === 'CAPTURED';
  const isFailed = tx.status === 'failed';

  const createdAt = tx.paymentTime || tx.createdAt;
  const capturedAt = tx.paymentTime || tx.createdAt;
  const settlementDate = capturedAt ? new Date(new Date(capturedAt).getTime() + 3 * 24 * 60 * 60 * 1000) : null;
  const now = new Date();
  const isSettled = settlementDate ? settlementDate <= now : false;

  // Date formatter for Razorpay style: Wed, Sep 30, 2026 12:42 AM
  const formatRzpDate = (d: Date | string) => {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const steps = [
    { label: 'Payment created', sub: createdAt ? formatRzpDate(createdAt) : '—', done: true, failed: false },
    { label: 'Payment authorized', sub: isSuccess ? (capturedAt ? formatRzpDate(capturedAt) : '—') : (isFailed ? 'Not completed' : 'Pending'), done: isSuccess, failed: isFailed },
    { label: 'Payment captured', sub: isSuccess ? (capturedAt ? formatRzpDate(capturedAt) : '—') : (isFailed ? 'Not completed' : 'Pending'), done: isSuccess, failed: isFailed },
    { label: isSettled ? 'Settlement processed' : 'Settlement (To be processed)', sub: settlementDate ? `To be deposited by: ${formatRzpDate(settlementDate)}` : '—', done: isSettled && isSuccess, failed: false, pending: !isSettled },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Transaction Details</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            ID: {tx._id}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* ── SECTION 1: Overview Hero ── */}
        <div className={`col-span-full rounded-xl border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4
          ${isSuccess ? 'bg-emerald-500/5 border-emerald-500/20' : isFailed ? 'bg-red-500/5 border-red-500/20' : 'bg-card border-border'}`}>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <p className="text-4xl font-bold text-foreground tracking-tight">
              ₹{tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || (tx.amountPaise ? (tx.amountPaise / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')}
            </p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {tx.razorpayPaymentId || tx._id}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-3">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold uppercase tracking-wider ${
              isFailed ? "bg-red-500/10 text-red-500 border border-red-500/20" :
              "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
            }`}>
              {isFailed ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {tx.status || 'SUCCESS'}
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest bg-background/50 px-3 py-1.5 rounded-md border border-border/50 shadow-sm backdrop-blur-sm">
              {tx.paymentFlow === 'ai_topup' ? '🤖 AI Top-Up' : tx.paymentFlow === 'subscription' ? '🏢 Subscription' : tx.type || '💳 Razorpay'}
            </span>
          </div>
        </div>

        {/* ── SECTION 2: Customer Details ── */}
        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
              <span className="text-muted-foreground shrink-0 mr-4">Name</span>
              <span className="font-medium text-right break-words max-w-[65%]">{tx.userName || "Unknown"}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
              <span className="text-muted-foreground shrink-0 mr-4">Email</span>
              <span className="font-medium text-right break-all">{tx.userEmail || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
              <span className="text-muted-foreground shrink-0 mr-4">Mobile</span>
              <span className="font-medium font-mono text-right">{tx.userMobile || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
              <span className="text-muted-foreground shrink-0 mr-4">User ID</span>
              <span className="font-medium font-mono text-xs text-right break-all">{tx.userId?._id || tx.userId || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-muted-foreground shrink-0 mr-4">Role</span>
              <span className="font-medium capitalize px-2 py-0.5 bg-muted rounded text-xs text-right">{tx.userRole || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 3: Payment Details ── */}
        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500"><CreditCard className="h-4 w-4" /></div>
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {tx.cardDetails ? (
              <>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground shrink-0 mr-4">Method</span>
                  <span className="font-medium flex items-center gap-1.5 text-right capitalize">
                    💳 {tx.cardDetails.subType} {tx.cardDetails.type} card
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground shrink-0 mr-4">Card</span>
                  <span className="font-medium text-xs text-right uppercase break-all flex flex-col gap-1.5 items-end">
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">{tx.cardDetails.issuer}</span>
                      {(() => {
                        const net = (tx.cardDetails.network || "").toLowerCase();
                        if (net === "visa") return <span className="font-bold text-[#1434CB] italic text-[14px]">VISA</span>;
                        if (net === "mastercard") return (
                          <div className="flex items-center">
                            <div className="w-3.5 h-3.5 bg-[#EB001B] rounded-full mix-blend-multiply opacity-90 z-10"></div>
                            <div className="w-3.5 h-3.5 bg-[#F79E1B] rounded-full -ml-1.5 mix-blend-multiply opacity-90"></div>
                          </div>
                        );
                        if (net === "maestro") return (
                          <div className="flex items-center">
                            <div className="w-3.5 h-3.5 bg-[#EB001B] rounded-full mix-blend-multiply opacity-90 z-10"></div>
                            <div className="w-3.5 h-3.5 bg-[#00AEEF] rounded-full -ml-1.5 mix-blend-multiply opacity-90"></div>
                          </div>
                        );
                        if (net === "rupay") return <span className="font-bold italic text-[14px]"><span className="text-[#F37A20]">Ru</span><span className="text-[#03984A]">Pay</span></span>;
                        if (net === "amex" || net === "american express") return <span className="bg-[#002663] text-white font-bold text-[10px] px-1.5 py-0.5 rounded-sm">AMEX</span>;
                        if (net === "discover") return <span className="font-bold text-[#F9A021] text-[12px]">DISCOVER</span>;
                        if (net === "diners club") return <span className="font-bold text-[#004A97] text-[12px]">Diners Club</span>;
                        if (net === "jcb") return <span className="font-bold text-[#003F90] text-[12px]">JCB</span>;
                        return <span className="font-semibold uppercase text-xs">{tx.cardDetails.network}</span>;
                      })()}
                    </span>
                    <span className="text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">•••• {tx.cardDetails.last4}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground shrink-0 mr-4">Name on Card</span>
                  <span className="font-medium text-xs text-right break-all">{tx.cardDetails.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground shrink-0 mr-4">Card ID</span>
                  <span className="font-medium font-mono text-xs text-right break-all">{tx.cardDetails.cardId || "—"}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground shrink-0 mr-4">Auth Code</span>
                  <span className="font-medium font-mono text-xs text-right break-all">{tx.cardDetails.authCode || "—"}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground shrink-0 mr-4">Method</span>
                  <span className="font-medium uppercase flex items-center gap-1.5 text-right">
                    {methodType.toLowerCase() === 'upi' ? '📱' : methodType.toLowerCase() === 'card' ? '💳' : '🏦'} {methodType || tx.method || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground shrink-0 mr-4">{methodType.toLowerCase() === 'upi' ? 'UPI VPA' : 'Account'}</span>
                  <span className="font-medium font-mono text-xs text-right break-all">{methodDetail || '—'}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
              <span className="text-muted-foreground shrink-0 mr-4">Bank RRN</span>
              <span className="font-medium font-mono text-xs text-right break-all">{tx.bankRRN || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
              <span className="text-muted-foreground shrink-0 mr-4">Date</span>
              <span className="font-medium text-[11px] text-right">{tx.paymentTime ? formatDate(tx.paymentTime) : tx.createdAt ? formatDate(tx.createdAt) : "—"}</span>
            </div>
            <div className="flex justify-between items-start text-sm pt-1">
              <span className="text-muted-foreground shrink-0 mr-4">Note</span>
              <span className="font-medium text-xs text-right leading-tight">{tx.note || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 4 & 5 Combined: Organization & Fees ── */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="p-1 rounded bg-amber-500/10 text-amber-500"><Globe className="h-3.5 w-3.5" /></div>
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-3 px-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground shrink-0 mr-4">Name</span>
                <span className="font-medium text-right break-words max-w-[65%]">{tx.organization?.name || tx.organizationId?.name || tx.organizationName || "—"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground shrink-0 mr-4">ID</span>
                <span className="font-medium font-mono text-xs text-right break-all">{tx.organization?._id || tx.organizationId?._id || (typeof tx.organizationId === 'string' ? tx.organizationId : '') || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="p-1 rounded bg-purple-500/10 text-purple-500"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                Fees & Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-3 px-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Razorpay Fee</span>
                <span className="font-medium text-red-500/80">{tx.feePaise != null ? `-₹${(tx.feePaise / 100).toFixed(2)}` : '₹0.00'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">GST on Fee</span>
                <span className="font-medium text-red-500/80">{tx.taxPaise != null ? `-₹${(tx.taxPaise / 100).toFixed(2)}` : '₹0.00'}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold pt-1 border-t border-border/50">
                <span className="text-foreground">Net Received</span>
                <span className="text-emerald-500">{
                  tx.amount != null
                    ? `₹${(tx.amount - (tx.feePaise || 0) / 100 - (tx.taxPaise || 0) / 100).toFixed(2)}`
                    : '—'
                }</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                <span>IP: <span className="font-mono">{tx.sourceIp || '—'}</span></span>
                <span>Fee Bearer: Merchant</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── SECTION 6: Payment Timeline ── */}
        <Card className="shadow-sm md:col-span-2 lg:col-span-full border-none">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-semibold">
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-8 pl-4">
            <div className="flex flex-col gap-0 max-w-lg">
              {steps.map((step, idx) => (
                <div key={idx} className="flex relative group">
                  {/* Vertical line connecting to next item */}
                  {idx < steps.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-[-6px] w-[2px] bg-border/40" />
                  )}
                  
                  {/* Step Icon */}
                  <div className={`flex h-6 w-6 mt-0.5 shrink-0 items-center justify-center rounded-full z-10
                    ${step.done ? 'text-emerald-500 bg-emerald-500/10' : step.failed ? 'text-red-500 bg-red-500/10' : step.pending ? 'text-orange-500 bg-orange-500/10' : 'text-muted-foreground bg-muted'}`}>
                    {step.done ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : step.failed ? (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    ) : step.pending ? (
                      <Clock className="h-3.5 w-3.5" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                  
                  {/* Step Content */}
                  <div className="ml-5 pb-8">
                    <p className={`text-[15px] font-medium leading-none ${step.done ? 'text-foreground' : step.failed ? 'text-red-500' : 'text-foreground'}`}>
                      {step.label}
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-2">
                      {step.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

