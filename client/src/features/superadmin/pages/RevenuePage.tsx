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

import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "../services/superAdminApi";


import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Badge } from "@/components/marketing_ui/badge";
import { formatDate } from "@/utils/dateUtils";
import { IndianRupee, TrendingUp, TrendingDown, RefreshCw, Users, CreditCard } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { getSocket } from "@/lib/socketClient";


function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RevenuePage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["superadmin-platform-revenue"],
    queryFn: dashboardApi.getPlatformRevenue,
    staleTime: 60_000, // 1 min
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleUpdate = () => qc.invalidateQueries({ queryKey: ["superadmin-platform-revenue"] });
    socket.on("platform_transactions_updated", handleUpdate);
    return () => {
      socket.off("platform_transactions_updated", handleUpdate);
    };
  }, [qc]);

  const revenueData = data?.data || {
    mrr: 0,
    totalIncome: 0,
    lostRevenue: 0,
    activeSubs: 0,
    recentTransactions: [],
  };

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Transaction ID",
        size: 150,
        cell: ({ getValue }) => (
          <span >
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "orgName",
        header: "Organization",
        size: 250,
        cell: ({ getValue }) => <strong >{getValue<string>()}</strong>,
      },
      {
        accessorKey: "plan",
        header: "Plan",
        size: 120,
        cell: ({ getValue }) => {
          const plan = getValue<string>();
          return (
            <Badge variant={plan === "active" ? "success" : "neutral"} dot>
              {plan === "active" ? "Paid" : "Demo"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        size: 140,
        cell: ({ getValue }) => <span >{formatCurrency(getValue<number>())}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        cell: ({ getValue }) => {
          const status = getValue<string>();
          const variant = status === "successful" ? "success" : status === "failed" ? "danger" : "warning";
          return <Badge variant={variant}>{status}</Badge>;
        },
      },
      {
        accessorKey: "date",
        header: "Date",
        size: 140,
        cell: ({ getValue }) => <span >{formatDate(getValue<string>())}</span>,
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div
        title="Platform Revenue"
        description="Monitor Monthly Recurring Revenue (MRR), total platform income, and subscription status."
        actions={
          
        }
      />

      <div >
        <SectionPanel
          title="Recent Transactions"
          description="Latest payments from organizations for platform subscriptions."
          noPadding
        >
          {isError ? (
            <div className="p-4 rounded-md border bg-red-100 text-red-800 p-4 rounded-md border border-red-200" >
              <div className="p-4 rounded-md border__body">
                <span className="p-4 rounded-md border__title">Failed to load revenue data.</span>
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={revenueData.recentTransactions}
              pageSize={10}
              emptyIcon={<CreditCard size={32} />}
              emptyTitle="No recent transactions"
              emptyDescription="No paid subscriptions have generated transactions yet."
              emptyMessage="No transactions available."
            />
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
