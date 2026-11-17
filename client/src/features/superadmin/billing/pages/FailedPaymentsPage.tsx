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

// Failed payments for Classgrid AI (rebuilt 2026-11-17 at the owner's request): payments for a plan or AI credits
// that Razorpay marked failed, newest first, with who tried, what they tried to buy, why it failed and whether they
// paid later. It reads only the failed-payments router's /ai endpoints (no ERP organizations any more).
// The filters live in the address (q, reason, plan, outcome, from, to, page) so Back from a payment keeps them.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import {
  errorMessage,
  errorStatus,
  type FailedPaymentsParams,
  type OutcomeFilter,
  type PlanFilter,
  type PlanKey,
  type ReasonKey,
} from "../components/failed-payments/failedPaymentsApi";
import {
  useFailedPaymentsList,
  useFailedPaymentsLiveRefresh,
  useFailedPaymentsSummary,
} from "../components/failed-payments/useFailedPayments";
import { REASON_KEYS } from "../components/failed-payments/labels";
import { FailedPaymentsSummary } from "../components/failed-payments/FailedPaymentsSummary";
import { FailedPaymentsFilters, type FilterValues } from "../components/failed-payments/FailedPaymentsFilters";
import { FailedPaymentsList } from "../components/failed-payments/FailedPaymentsList";

const PAGE_SIZE = 20;
const PLAN_FILTERS: PlanFilter[] = ["all", "pro", "max", "enterprise", "credits", "unknown"];
const OUTCOMES: OutcomeFilter[] = ["all", "paid_later", "not_paid"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Used for the plan filter until the summary (which carries the plans' real names) has loaded
const FALLBACK_PLANS: Array<{ key: PlanKey; name: string }> = [
  { key: "pro", name: "Pro" },
  { key: "max", name: "Max" },
  { key: "enterprise", name: "Enterprise" },
];

const FailedPaymentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setBreadcrumbs([{ label: "Failed Payments" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  useFailedPaymentsLiveRefresh();

  // Read the filters from the address; anything unexpected (an old or hand-typed link) falls back to "all"
  const q = searchParams.get("q") ?? "";
  const rawReason = searchParams.get("reason") ?? "all";
  const reason = (REASON_KEYS as string[]).includes(rawReason) ? (rawReason as ReasonKey) : "all";
  const rawPlan = searchParams.get("plan") ?? "all";
  const plan = (PLAN_FILTERS as string[]).includes(rawPlan) ? (rawPlan as PlanFilter) : "all";
  const rawOutcome = searchParams.get("outcome") ?? "all";
  const outcome = (OUTCOMES as string[]).includes(rawOutcome) ? (rawOutcome as OutcomeFilter) : "all";
  const rawFrom = searchParams.get("from") ?? "";
  const from = DAY.test(rawFrom) ? rawFrom : "";
  const rawTo = searchParams.get("to") ?? "";
  const to = DAY.test(rawTo) ? rawTo : "";
  const pageNumber = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));

  const hasFilters = Boolean(q || reason !== "all" || plan !== "all" || outcome !== "all" || from || to);

  // Change some filters in the address. Any change other than the page itself goes back to page 1.
  // replace: true so Back leaves the page instead of stepping through every filter change.
  const updateParams = useCallback(
    (changes: Record<string, string>, keepPage = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (!value || value === "all") next.delete(key);
            else next.set(key, value);
          }
          if (!keepPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // The search box writes to the address 400 ms after the last key, so each key press doesn't load the list
  const [searchInput, setSearchInput] = useState(q);
  // The last search this page wrote to the address, so its own write isn't mistaken for a change from outside
  // (that would put the older words back into the box while the person is still typing)
  const writtenQ = useRef(q);
  useEffect(() => {
    const value = searchInput.trim();
    if (value === q) return;
    const t = setTimeout(() => {
      writtenQ.current = value;
      updateParams({ q: value });
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, q, updateParams]);

  // The address changed from outside the box (Back, an old link): show the same words in the box
  useEffect(() => {
    if (q === writtenQ.current) return;
    writtenQ.current = q;
    setSearchInput(q);
  }, [q]);

  const params: FailedPaymentsParams = useMemo(
    () => ({ page: pageNumber, limit: PAGE_SIZE, search: q, reason, plan, outcome, from, to }),
    [pageNumber, q, reason, plan, outcome, from, to],
  );

  const list = useFailedPaymentsList(params);
  const summary = useFailedPaymentsSummary();

  // A page past the end (an old link, or payments that no longer match) would show an empty list with no way back,
  // so it moves to the last page that has rows. Only real answers count, not the previous page kept on screen.
  const lastPage = list.data?.pagination?.totalPages;
  const showingPlaceholder = list.isPlaceholderData;
  useEffect(() => {
    if (showingPlaceholder || !lastPage || pageNumber <= lastPage) return;
    updateParams({ page: lastPage > 1 ? String(lastPage) : "" }, true);
  }, [showingPlaceholder, lastPage, pageNumber, updateParams]);

  // A 400 means the filters themselves are wrong (e.g. the start date is after the end date): say so under the
  // dates; any other error is shown in the list card with a "Try again" button
  const badRequest = list.isError && errorStatus(list.error) === 400;
  const filterError = badRequest ? errorMessage(list.error) || "These filters aren't valid." : undefined;

  const onFilterChange = <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => {
    updateParams({ [key]: String(value) });
  };

  const clearFilters = () => {
    writtenQ.current = "";
    setSearchInput("");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const openPayment = (id: string) => {
    // The detail page's "Back to failed payments" uses this to return to the same filters and page
    navigate(`/super-admin/billing/failed-payments/${id}`, { state: { fromList: location.search } });
  };

  const refreshing = list.isFetching || summary.isFetching;
  const refresh = () => {
    list.refetch();
    summary.refetch();
  };

  const plans = summary.data?.plans?.length ? summary.data.plans : FALLBACK_PLANS;

  return (
    <div className="space-y-5 pb-8 min-w-0">
      {/* 1. Header */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">Failed payments</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Payments for a plan or AI credits that didn't go through on Razorpay. Newest first.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* 2. Summary */}
      <FailedPaymentsSummary summary={summary.data} isLoading={summary.isLoading} />

      {/* 3. Filters */}
      <FailedPaymentsFilters
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        values={{ reason, plan, outcome, from, to }}
        onChange={onFilterChange}
        plans={plans}
        hasFilters={hasFilters}
        onClear={clearFilters}
        errorText={filterError}
      />

      {/* 4 and 5. The list, or what to show when there is nothing to list */}
      <FailedPaymentsList
        result={badRequest ? undefined : list.data}
        isLoading={list.isLoading}
        isError={list.isError && !badRequest}
        hasFilters={hasFilters}
        onClear={clearFilters}
        onRetry={() => list.refetch()}
        onPage={(page) => updateParams({ page: page > 1 ? String(page) : "" }, true)}
        onOpen={openPayment}
      />
    </div>
  );
};

export default FailedPaymentsPage;
