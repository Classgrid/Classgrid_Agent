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

// The owner approved this rebuild of the Revenue page (Classgrid AI plans and top-ups) on 2026-11-17.

import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/marketing_ui/button';
import { Card, CardContent } from '@/components/marketing_ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { Skeleton } from '@/components/marketing_ui/skeleton';
import { NikhilTimeCalendar } from '@/components/marketing_ui/nikhil_time_calendar';
import { SuperadminFilterBar } from '../../components/SuperadminFilterBar';
import { PaymentsPager } from '../components/transactions/PaymentsPager';
import { RevenueDailyChart } from '../components/revenue/RevenueDailyChart';
import { RevenuePaymentsTable } from '../components/revenue/RevenuePaymentsTable';
import {
  CardTitleRow,
  MoneyInTiles,
  RefundsFailedCard,
  SourcesCard,
  rangeLabel,
} from '../components/revenue/RevenueSummaryParts';
import { useRevenueLive, useRevenuePayments, useRevenueSummary } from '../components/revenue/useRevenue';
import { downloadRevenueCsv, type RevenueKind, type RevenuePaymentFilters } from '../components/revenue/revenueApi';

const LIMIT = 20;
const SEARCH_DELAY_MS = 400;

const KIND_LABELS: Record<RevenueKind, string> = {
  all: 'All payments',
  pro: 'Pro',
  max: 'Max',
  topup: 'Top-ups',
  refunded: 'Refunded',
  failed: 'Failed',
};
const KINDS = Object.keys(KIND_LABELS) as RevenueKind[];

// yyyy-MM-dd for the server, and back to a local Date for the calendar (the picked day stays that day)
const toKey = (date: Date | undefined) => (date ? format(date, 'yyyy-MM-dd') : '');
const toDate = (key: string) =>
  key ? new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))) : undefined;

// One date box of the filter bar, with a small button that clears it
function DateFilter({ value, onChange, placeholder }: { value: string; onChange: (key: string) => void; placeholder: string }) {
  return (
    <div className="relative w-[160px] max-w-full overflow-hidden">
      <NikhilTimeCalendar
        value={toDate(value)}
        onChange={(date) => onChange(toKey(date))}
        placeholder={placeholder}
        popDirection="down"
        showTime={false}
        className="h-9 w-full pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(''); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent bg-background"
          title="Clear date"
          aria-label="Clear date"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

const RevenuePage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<RevenueKind>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);

  // Payments saved, failed or refunded on Razorpay reload the page's numbers by themselves
  useRevenueLive();

  // The search is sent 400 ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== search) {
        setSearch(next);
        setPage(1);
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  // A start after the end (or an end before the start) clears the other date instead of asking for an impossible range
  const changeFrom = (key: string) => {
    setFrom(key);
    if (key && to && key > to) setTo('');
    setPage(1);
  };
  const changeTo = (key: string) => {
    setTo(key);
    if (key && from && key < from) setFrom('');
    setPage(1);
  };

  const range = useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to]);
  const filters: RevenuePaymentFilters = useMemo(
    () => ({ search, kind, from: from || undefined, to: to || undefined, page, limit: LIMIT }),
    [search, kind, from, to, page],
  );

  const summaryQuery = useRevenueSummary(range);
  const summary = summaryQuery.data;
  const summaryLoading = summaryQuery.isLoading;
  const summaryFailed = summaryQuery.isError && !summary;

  const paymentsQuery = useRevenuePayments(filters);
  const rows = paymentsQuery.data?.data || [];
  const total = paymentsQuery.data?.pagination?.total ?? 0;
  const anyFilter = !!(search || kind !== 'all' || from || to);

  // Fewer payments than before (a filter, or a live change): a page past the end goes to the last page with rows
  useEffect(() => {
    if (!paymentsQuery.data || paymentsQuery.isPlaceholderData) return;
    const pages = Math.max(1, Math.ceil(total / LIMIT));
    if (page > pages) setPage(pages);
  }, [paymentsQuery.data, paymentsQuery.isPlaceholderData, total, page]);

  const exportCsv = async () => {
    if (downloading) return;
    if (paymentsQuery.data && total === 0) {
      toast('There are no payments to export.');
      return;
    }
    setDownloading(true);
    try {
      await downloadRevenueCsv(filters);
    } catch {
      toast.error("Couldn't make the CSV.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="w-full relative z-50 px-4 pt-4 sm:px-6 sm:pt-6">
        <SuperadminFilterBar
          searchQuery={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search name, email or payment id"
        >
          <Select
            value={kind}
            onValueChange={(value) => {
              setKind(KINDS.includes(value as RevenueKind) ? (value as RevenueKind) : 'all');
              setPage(1);
            }}
          >
            <SelectTrigger
              className="h-9 px-3 min-w-[150px] rounded-full border border-dashed border-border bg-transparent shadow-sm"
              aria-label="Payments to show"
            >
              <SelectValue>{(value: string) => KIND_LABELS[value as RevenueKind] || KIND_LABELS.all}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((key) => (
                <SelectItem key={key} value={key}>{KIND_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateFilter value={from} onChange={changeFrom} placeholder="From" />
          <DateFilter value={to} onChange={changeTo} placeholder="To" />
          <Button variant="outline" size="sm" className="h-9 ml-auto" onClick={exportCsv} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? 'Exporting' : 'Export CSV'}
          </Button>
        </SuperadminFilterBar>
      </div>

      <div className="space-y-6 px-4 pb-6 sm:px-6">
        <MoneyInTiles summary={summary} loading={summaryLoading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardTitleRow title="Money per day" note={rangeLabel(summary?.range)} />
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {summaryLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : summaryFailed || !summary ? (
                <p className="text-sm text-muted-foreground">Couldn't load these numbers.</p>
              ) : (
                <RevenueDailyChart days={summary.daily} />
              )}
            </CardContent>
          </Card>
          <div className="min-w-0 space-y-6">
            <SourcesCard summary={summary} loading={summaryLoading} failed={summaryFailed} />
            <RefundsFailedCard summary={summary} loading={summaryLoading} failed={summaryFailed} />
          </div>
        </div>

        <Card className="min-w-0">
          <CardTitleRow title="Payments" />
          <CardContent className="p-0">
            {paymentsQuery.isLoading ? (
              <div className="space-y-2 px-4 pb-4 sm:px-6 sm:pb-6">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : paymentsQuery.isError && !paymentsQuery.data ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-6 sm:pb-6">Couldn't load payments.</p>
            ) : rows.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-6 sm:pb-6">
                {anyFilter ? 'No payments match these filters.' : 'No payments yet.'}
              </p>
            ) : (
              <RevenuePaymentsTable rows={rows} dimmed={paymentsQuery.isPlaceholderData} />
            )}
          </CardContent>
        </Card>
        <PaymentsPager page={page} limit={LIMIT} total={total} onPage={setPage} />
      </div>
    </div>
  );
};

export default RevenuePage;
