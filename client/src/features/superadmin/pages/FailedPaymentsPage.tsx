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

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, XCircle, Building2, IndianRupee, Clock } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionPanel } from "@/components/marketing_ui/SectionPanel";

import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { DataTable } from "@/components/marketing_ui/data-table";


import { apiClient } from "@/lib/apiClient";
import { formatDate } from "@/utils/dateUtils";
import { getSocket } from "@/lib/socketClient";
import { useEffect } from "react";


const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.abs(n));

export function FailedPaymentsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Fetch failed platform transactions
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["failed-transactions", typeFilter],
    queryFn: () =>
      apiClient
        .get<any>("/api/super-admin/transactions", {
          params: { status: "failed", type: typeFilter || undefined, limit: 200 },
        })
        .then((r) => r.data),
    staleTime: 60_000,
  });



  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    const handler = () => refetch();
    
    socket.on("failed_payment_received", handler);
    socket.on("platform_transactions_updated", handler);

    return () => {
      socket.off("failed_payment_received", handler);
      socket.off("platform_transactions_updated", handler);
    };
  }, [refetch]);

  const txns: any[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const filtered = useMemo(() => {
    if (!search.trim()) return txns;
    const q = search.toLowerCase();
    return txns.filter(
      (t) =>
        (t.organizationName ?? t.organizationId?.name ?? "").toLowerCase().includes(q) ||
        (t.razorpayPaymentId ?? "").toLowerCase().includes(q) ||
        (t.razorpayOrderId ?? "").toLowerCase().includes(q) ||
        (t.note ?? "").toLowerCase().includes(q)
    );
  }, [txns, search]);

  const totalLost = txns.reduce((s, t) => s + (t.amount ?? 0), 0);

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        size: 120,
        cell: ({ getValue }) => (
          <span >{formatDate(getValue<string>())}</span>
        ),
      },
      {
        accessorKey: "organizationName",
        header: "Organization",
        size: 200,
        cell: ({ row, getValue }) => {
          const name = getValue<string>() || row.original.organizationId?.name || "—";
          return (
            <div >
              <Building2 size={13} />
              <span >{name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        size: 120,
        cell: ({ getValue }) => (
          <span >
            {INR(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        size: 110,
        cell: ({ getValue }) => <Badge variant="neutral">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: "razorpayOrderId",
        header: "Order ID",
        size: 200,
        cell: ({ getValue }) => (
          <span >
            {getValue<string>() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "razorpayPaymentId",
        header: "Payment ID",
        size: 200,
        cell: ({ getValue }) => (
          <span >
            {getValue<string>() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "note",
        header: "Note / Reason",
        size: 200,
        cell: ({ getValue }) => (
          <span >
            {getValue<string>() || "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div
        title="Failed Payments"
        description="All platform billing payments that failed or were not completed. Investigate and follow up with organizations."
        actions={
          
        }
      />

      {/* Alert Banner */}
      {total > 0 && (
        <div
          
        >
          <XCircle size={18}  />
          <div>
            <span >
              {total} failed payment{total !== 1 ? "s" : ""} detected
            </span>
            <span >
              — Total lost revenue: <strong>{INR(totalLost)}</strong>. Follow up with affected organizations.
            </span>
          </div>
        </div>
      )}

      <div >
        <SectionPanel
          title="Failed Transaction Log"
          description="All failed or incomplete platform subscription payments."
          noPadding
          actions={
            <div
              value={typeFilter}
              onValueChange={setTypeFilter}
              options={[
                { label: "All Types", value: "" },
                { label: "Razorpay", value: "razorpay" },
                { label: "Manual", value: "manual" },
              ]}
            />
          }
        >
          <div >
            <div
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search org, order ID, payment ID…"
            />
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            pageSize={50}
            emptyIcon={<Clock size={32} />}
            emptyTitle="No failed payments"
            emptyDescription="All platform payments have been successfully processed."
            emptyMessage="No failures found."
          />
        </SectionPanel>
      </div>
    </div>
  );
}
