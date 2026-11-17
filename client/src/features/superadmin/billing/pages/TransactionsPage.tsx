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
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

// Transactions (owner, 2026-11-17: rebuilt as "every payment for Classgrid AI"). Plans and credit top-ups come from
// the AI credit ledger, the only place every plan purchase is saved; failed attempts and older payments come from the
// platform ledger. The old page listed organization payments with filters that never matched the data, so it is
// replaced, not patched. Filters live in the URL so Back from a payment keeps them.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Download, Receipt, XCircle } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { RefreshButton } from "@/components/marketing_ui/refresh-button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { PaymentFilters, type PaymentFilterValues } from "../components/transactions/PaymentFilters";
import { PaymentSummary } from "../components/transactions/PaymentSummary";
import { PaymentsTable } from "../components/transactions/PaymentsTable";
import { PaymentsPager } from "../components/transactions/PaymentsPager";
import { usePayments } from "../components/transactions/usePayments";
import { downloadPaymentsCsv, type PaymentFilters as Filters } from "../components/transactions/paymentsApi";

const LIMIT = 25;
const CSV_MAX = 5000;
const TYPES = ["plan", "topup", "other"];
const PLANS = ["pro", "max", "enterprise"];
const STATUSES = ["paid", "refunded", "failed", "pending"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const FILTER_KEYS = ["q", "type", "plan", "status", "from", "to"] as const;

// A value from the URL is used only when it is one the server accepts, so a hand-edited link can't break the page
const pickOne = (v: string | null, allowed: string[]) => (v && allowed.includes(v) ? v : "");

const TransactionsPage = () => {
  const navigate = useNavigate();
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "Transactions" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").slice(0, 100);
  const values: PaymentFilterValues = {
    type: pickOne(searchParams.get("type"), TYPES),
    plan: pickOne(searchParams.get("plan"), PLANS),
    status: pickOne(searchParams.get("status"), STATUSES),
    from: DAY.test(searchParams.get("from") || "") ? (searchParams.get("from") as string) : "",
    to: DAY.test(searchParams.get("to") || "") ? (searchParams.get("to") as string) : "",
  };
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const anyFilter = !!(q || values.type || values.plan || values.status || values.from || values.to);

  // Every filter change starts again at page 1. replace keeps the history short: Back leaves the list instead of
  // stepping through each filter.
  const updateParams = (patch: Record<string, string>, keepPage = false) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        if (!keepPage) next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  // The search box writes to the URL 400 ms after typing stops
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== q) updateParams({ q: next });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  // The URL changed some other way (Clear filters, Back): show its search in the box
  useEffect(() => {
    if (q !== searchInput.trim()) setSearchInput(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filters: Filters = useMemo(
    () => ({
      search: q,
      type: values.type as Filters["type"],
      plan: values.plan as Filters["plan"],
      status: values.status as Filters["status"],
      from: values.from,
      to: values.to,
      page,
      limit: LIMIT,
    }),
    [q, values.type, values.plan, values.status, values.from, values.to, page],
  );

  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = usePayments(filters);
  const rows = data?.data || [];
  const total = data?.pagination?.total ?? data?.summary?.total ?? 0;
  const summary = data?.summary;

  // A page past the end (an old link, or fewer payments after a refresh) goes to the last page that has rows
  useEffect(() => {
    if (!data || isPlaceholderData) return;
    const pages = Math.max(1, Math.ceil(total / LIMIT));
    if (page > pages) updateParams({ page: pages > 1 ? String(pages) : "" }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isPlaceholderData, total, page]);

  const clearFilters = () => {
    setSearchInput("");
    updateParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  };

  const [downloading, setDownloading] = useState(false);
  const downloadCsv = async () => {
    if (downloading) return;
    if (summary && summary.total === 0) {
      toast("There are no payments to download.");
      return;
    }
    setDownloading(true);
    try {
      await downloadPaymentsCsv(filters);
      if (summary && summary.total > CSV_MAX) {
        toast("Only the newest 5,000 payments are in the file. Pick fewer dates for the rest.");
      }
    } catch {
      toast.error("Couldn't make the CSV. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  const openPayment = (id: string) => navigate(`/super-admin/billing/transactions/${id}`);

  let list: React.ReactNode;
  if (isLoading && !data) {
    list = (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  } else if (isError && !data) {
    list = (
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center text-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <XCircle className="w-4 h-4 text-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Couldn't load payments.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (rows.length === 0) {
    list = (
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center text-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <Receipt className="w-4 h-4 text-foreground" />
        </div>
        <h4 className="text-base font-semibold text-foreground">
          {anyFilter ? "No payments match these filters" : "No payments yet"}
        </h4>
        <p className="text-xs text-muted-foreground">
          {anyFilter ? "Try other filters or dates." : "Plan purchases and credit top-ups show up here as soon as someone pays."}
        </p>
        {anyFilter && (
          <Button variant="outline" size="sm" className="mt-2" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  } else {
    list = <PaymentsTable rows={rows} onOpen={(row) => openPayment(row.id)} dimmed={isPlaceholderData} />;
  }

  return (
    <div className="flex flex-col gap-4 w-full min-w-0 pb-8">
      <section className="bg-card border border-border rounded-xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground">Transactions</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Every payment for Classgrid AI: plans and credit top-ups, newest first.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <RefreshButton size="sm" label="Refresh" isFetching={isFetching && !isLoading} onClick={() => refetch()} />
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadCsv} disabled={downloading}>
              <Download className="w-4 h-4" />
              {downloading ? "Making the CSV…" : "Download CSV"}
            </Button>
          </div>
        </div>
      </section>

      <PaymentSummary summary={summary} loading={isLoading && !data} />

      <PaymentFilters
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        values={values}
        onChange={(patch) => updateParams(patch as Record<string, string>)}
        anyFilter={anyFilter || !!searchInput.trim()}
        onClear={clearFilters}
      />

      {list}

      {rows.length > 0 && (
        <PaymentsPager
          page={page}
          limit={LIMIT}
          total={total}
          onPage={(p) => {
            updateParams({ page: p > 1 ? String(p) : "" }, true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
};

export default TransactionsPage;
