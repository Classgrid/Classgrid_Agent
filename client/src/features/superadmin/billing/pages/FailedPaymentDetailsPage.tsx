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
// One failed payment for Classgrid AI (rebuilt 2026-11-17 at the owner's request): who tried to pay, what they tried
// to buy, why it failed, whether they paid later, their other failed tries and Razorpay's record. It reads the
// failed-payments router's /ai/:id endpoint, which only reads; there are no actions here. A "send a reminder" button
// is left out on purpose: no endpoint emails the person (the old "notify" one went to ERP admins, and the old
// payment link would not give the plan or the credits).
import React, { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AlertTriangle, SearchX } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/marketing_ui/empty";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { errorStatus } from "../components/failed-payments/failedPaymentsApi";
import { useFailedPayment, useFailedPaymentsLiveRefresh } from "../components/failed-payments/useFailedPayments";
import { FailedPaymentHeader } from "../components/failed-payments/FailedPaymentHeader";
import { PersonSection } from "../components/failed-payments/PersonSection";
import { PurchaseSection } from "../components/failed-payments/PurchaseSection";
import { ReasonSection } from "../components/failed-payments/ReasonSection";
import { PaidLaterSection } from "../components/failed-payments/PaidLaterSection";
import { OtherTriesSection } from "../components/failed-payments/OtherTriesSection";
import { PaymentRecordSection } from "../components/failed-payments/PaymentRecordSection";

const LIST_URL = "/super-admin/billing/failed-payments";

export default function FailedPaymentDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);

  useFailedPaymentsLiveRefresh();

  const { data: item, isLoading, isError, error, refetch } = useFailedPayment(id);

  // Opened from the list: it passed its filters (the part after "?"), so "Back to failed payments" returns to the
  // same filters and page. Opened any other way (a shared link, a profile): back to the plain list.
  const fromList = typeof (location.state as { fromList?: unknown } | null)?.fromList === "string"
    ? ((location.state as { fromList: string }).fromList)
    : undefined;
  const backTo = fromList ? `${LIST_URL}${fromList}` : LIST_URL;

  const personName = item?.person?.name;
  useEffect(() => {
    setBreadcrumbs([
      { label: "Failed Payments", href: LIST_URL },
      { label: personName || "Failed payment" },
    ]);
    return () => setBreadcrumbs([]);
  }, [personName, setBreadcrumbs]);

  if (isLoading) {
    return (
      <div className="space-y-5 pb-12">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Only when there is nothing to show: a failed background refresh (e.g. after a live update) keeps the payment
  // that is already on screen instead of swapping it for an error
  if (!item) {
    const status = errorStatus(error);
    const notFound = status === 404 || (!isError && !item);
    const badLink = status === 400;
    return (
      <div className="pb-12">
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {notFound || badLink ? <SearchX /> : <AlertTriangle className="text-destructive" />}
              </EmptyMedia>
              <EmptyTitle className="text-foreground">
                {badLink ? "This link is not valid" : notFound ? "Failed payment not found" : "Couldn't load this payment"}
              </EmptyTitle>
              <EmptyDescription>
                {notFound || badLink
                  ? "The link may be wrong, or this payment isn't for Classgrid AI."
                  : "Check your connection and try again."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {notFound || badLink ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={backTo}>Back to failed payments</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try again
                </Button>
              )}
            </EmptyContent>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12 min-w-0">
      <FailedPaymentHeader item={item} backTo={backTo} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PersonSection item={item} />
        <PurchaseSection item={item} />
        <ReasonSection item={item} />
        <PaidLaterSection item={item} />
        <OtherTriesSection item={item} fromList={fromList} className="md:col-span-2" />
        <PaymentRecordSection item={item} className="md:col-span-2" />
      </div>
    </div>
  );
}
