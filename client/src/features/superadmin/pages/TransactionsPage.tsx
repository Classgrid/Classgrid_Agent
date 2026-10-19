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


import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, RefreshCw, Plus, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle, Building2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { SectionPanel } from "@/components/marketing_ui/SectionPanel";

import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/marketing_ui/dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiClient } from "@/lib/apiClient";
import { formatDate } from "@/utils/dateUtils";
import { getSocket } from "@/lib/socketClient";


const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.abs(n));

const fetchTransactions = (status: string, type: string) =>
  apiClient.get<any>("/api/super-admin/transactions", { params: { status: status || undefined, type: type || undefined, limit: 200 } }).then(r => r.data);

const fetchAllOrgs = () =>
  apiClient.get<any>("/api/super-admin/organizations").then(r => r.data);

const STATUS_BADGE: Record<string, any> = {
  success: { variant: "success", label: "Paid" },
  refunded: { variant: "warning", label: "Refunded" },
  pending: { variant: "neutral", label: "Pending" },
  failed: { variant: "danger", label: "Failed" },
};

const TYPE_BADGE: Record<string, any> = {
  razorpay: { variant: "info", label: "Razorpay" },
  manual: { variant: "neutral", label: "Manual" },
  refund: { variant: "warning", label: "Refund" },
  credit: { variant: "success", label: "Credit" },
  adjustment: { variant: "neutral", label: "Adjustment" },
};

export function TransactionsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [refundTarget, setRefundTarget] = useState<any>(null);
  const [refundReason, setRefundReason] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ organizationId: "", amount: "", note: "", type: "manual" });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform-transactions", statusFilter, typeFilter],
    queryFn: () => fetchTransactions(statusFilter, typeFilter),
    staleTime: 30_000,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleUpdate = () => qc.invalidateQueries({ queryKey: ["platform-transactions"] });
    socket.on("platform_transactions_updated", handleUpdate);
    return () => {
      socket.off("platform_transactions_updated", handleUpdate);
    };
  }, [qc]);
  const { data: orgsData } = useQuery({ queryKey: ["sa-orgs-list"], queryFn: fetchAllOrgs });

  const txns: any[] = data?.data ?? [];
  const allOrgs: any[] = orgsData?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return txns;
    const q = search.toLowerCase();
    return txns.filter(t =>
      (t.organizationName ?? t.organizationId?.name ?? "").toLowerCase().includes(q) ||
      (t.razorpayPaymentId ?? "").toLowerCase().includes(q) ||
      (t.note ?? "").toLowerCase().includes(q)
    );
  }, [txns, search]);

  const refundMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/api/super-admin/transactions/${id}/refund`, { reason }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform-transactions"] }); toast.success("Refund issued."); setRefundTarget(null); setRefundReason(""); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Refund failed."),
  });

  const manualMut = useMutation({
    mutationFn: (payload: any) => apiClient.post("/api/super-admin/transactions", payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform-transactions"] }); toast.success("Transaction recorded."); setManualOpen(false); setManual({ organizationId: "", amount: "", note: "", type: "manual" }); },
    onError: () => toast.error("Failed to record transaction."),
  });

  const totalRevenue = txns.filter(t => t.status === "success" && t.type !== "refund").reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalRefunds = txns.filter(t => t.type === "refund").reduce((s, t) => s + Math.abs(t.amount ?? 0), 0);
  const successCount = txns.filter(t => t.status === "success").length;
  const refundCount = txns.filter(t => t.type === "refund").length;

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "createdAt", header: "Date", size: 120,
      cell: ({ getValue }) => <span >{formatDate(getValue<string>())}</span>,
    },
    {
      accessorKey: "organizationName", header: "Organization", size: 180,
      cell: ({ row, getValue }) => {
        const name = getValue<string>() || row.original.organizationId?.name || "—";
        return <div ><Building2 size={13} /><span >{name}</span></div>;
      },
    },
    {
      accessorKey: "amount", header: "Amount", size: 120,
      cell: ({ row, getValue }) => {
        const amt = getValue<number>();
        const isRefund = row.original.type === "refund";
        return <span >{isRefund ? "−" : "+"}{INR(amt)}</span>;
      },
    },
    {
      accessorKey: "type", header: "Type", size: 110,
      cell: ({ getValue }) => { const t = TYPE_BADGE[getValue<string>()] ?? { variant: "neutral", label: getValue<string>() }; return <Badge variant={t.variant}>{t.label}</Badge>; },
    },
    {
      accessorKey: "status", header: "Status", size: 100,
      cell: ({ getValue }) => { const s = STATUS_BADGE[getValue<string>()] ?? { variant: "neutral", label: getValue<string>() }; return <Badge variant={s.variant} dot>{s.label}</Badge>; },
    },
    {
      accessorKey: "razorpayPaymentId", header: "Razorpay ID", size: 170,
      cell: ({ getValue }) => <span >{getValue<string>() || "—"}</span>,
    },
    {
      accessorKey: "note", header: "Note", size: 180,
      cell: ({ getValue }) => <span >{getValue<string>() || "—"}</span>,
    },
    {
      id: "actions", header: "Actions", size: 100,
      cell: ({ row }) => {
        const t = row.original;
        if (t.status !== "success" || t.type === "refund") return null;
        return (
          <Button size="sm" variant="outline" onClick={() => setRefundTarget(t)}>
            <RotateCcw size={12} /> Refund
          </Button>
        );
      },
    },
  ], []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <PageHeader
        title="Platform Transactions"
        description="All platform billing payments, refunds, and manual adjustments. Full financial history."
        actions={
          <div >
            
            <Button onClick={() => setManualOpen(true)}><Plus size={14} /> Record Payment</Button>
          </div>
        }
      />



      <div >
        <SectionPanel title="Transaction History" description={`${filtered.length} records`} noPadding
          actions={
            <div >
              <div value={statusFilter} onValueChange={setStatusFilter} options={[
                { label: "All Status", value: "" }, { label: "Paid", value: "success" },
                { label: "Refunded", value: "refunded" }, { label: "Failed", value: "failed" },
              ]} />
              <div value={typeFilter} onValueChange={setTypeFilter} options={[
                { label: "All Types", value: "" }, { label: "Razorpay", value: "razorpay" },
                { label: "Manual", value: "manual" }, { label: "Refund", value: "refund" },
              ]} />
            </div>
          }
        >
          <div >
            <div searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search org, payment ID, note…" />
          </div>
          <DataTable columns={columns} data={filtered} isLoading={isLoading} pageSize={50}
            emptyIcon={<IndianRupee size={32} />} emptyTitle="No transactions yet" emptyDescription="Payments recorded via Razorpay or manually will appear here." emptyMessage="No transactions." />
        </SectionPanel>
      </div>

      {/* Refund Dialog */}
      <Dialog open={!!refundTarget} onOpenChange={o => !o && setRefundTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>Refund {INR(refundTarget?.amount ?? 0)} to <strong>{refundTarget?.organizationName}</strong>. This will mark the original payment as refunded.</DialogDescription>
          </DialogHeader>
          <div >
            <label >Reason</label>
            <Input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Enter refund reason…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>Cancel</Button>
            <Button variant="destructive" isLoading={refundMut.isPending} onClick={() => refundMut.mutate({ id: refundTarget._id, reason: refundReason })}>
              <RotateCcw size={14} /> Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Manual Payment</DialogTitle>
            <DialogDescription>Log a payment that was collected outside of Razorpay (e.g., bank transfer, cash).</DialogDescription>
          </DialogHeader>
          <div >
            <div>
              <label >Organization</label>
              <div value={manual.organizationId} onValueChange={v => setManual(p => ({ ...p, organizationId: v }))}
                options={allOrgs.map(o => ({ label: o.name, value: o._id }))} />
            </div>
            <div>
              <label >Amount (₹)</label>
              <Input type="number" min={0} value={manual.amount} onChange={e => setManual(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 5000" />
            </div>
            <div>
              <label >Note</label>
              <Input value={manual.note} onChange={e => setManual(p => ({ ...p, note: e.target.value }))} placeholder="e.g. Bank transfer for Q1 subscription" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button isLoading={manualMut.isPending} disabled={!manual.organizationId || !manual.amount}
              onClick={() => manualMut.mutate({ ...manual, amount: parseFloat(manual.amount) })}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
