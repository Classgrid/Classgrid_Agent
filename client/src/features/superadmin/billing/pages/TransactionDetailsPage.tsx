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
// One payment (owner, 2026-11-17: rebuilt with the Transactions list). The id in the link is a payment from the AI
// credit ledger, a platform payment (older links keep working) or a Razorpay payment id. The page shows what was
// paid, who paid, what it bought, the Razorpay ids and the receipt email; the old organization card, the guessed
// settlement timeline, the IP and the raw id as the heading are gone on purpose.
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, SearchX, XCircle } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { isNotFound, usePayment } from "../components/transactions/usePayments";
import { PaymentStatusBadge } from "../components/transactions/PaymentStatusBadge";
import { fmtDay, fmtTime, inr, whatTitle } from "../components/transactions/paymentFormat";
import {
  BoughtCard,
  PaymentCard,
  PersonCard,
  RazorpayIdsCard,
  ReceiptCard,
  TimelineCard,
} from "../components/transactions/PaymentDetailCards";

const LIST_PATH = "/super-admin/billing/transactions";

export default function TransactionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);
  const { data: p, isLoading, isError, error, refetch } = usePayment(id);

  // The person's name, never a raw id, as the last breadcrumb
  const personName = p?.person?.name || "";
  useEffect(() => {
    setBreadcrumbs([
      { label: "Transactions", href: LIST_PATH },
      { label: personName || "Payment" },
    ]);
    return () => setBreadcrumbs([]);
  }, [personName, setBreadcrumbs]);

  // Back keeps the list's filters (they are in the list's URL); a page opened from a link goes to the list
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(LIST_PATH);
  };

  const backButton = (
    <div>
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={goBack}>
        <ArrowLeft className="w-4 h-4" />
        Back to transactions
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full min-w-0 pb-8">
        {backButton}
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !p) {
    const notFound = !id || isNotFound(error) || (!isError && !p);
    const Icon = notFound ? SearchX : XCircle;
    return (
      <div className="flex flex-col gap-4 w-full min-w-0 pb-8">
        {backButton}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center text-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {notFound ? "We couldn't find this payment." : "Couldn't load this payment."}
          </p>
          {notFound ? (
            <Button variant="outline" size="sm" onClick={() => navigate(LIST_PATH)}>
              Back to transactions
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  const when = [fmtDay(p.date), fmtTime(p.date)].filter(Boolean).join(", ");
  const whenLine = p.status === "failed" ? `Tried on ${when}` : p.status === "pending" ? `Started on ${when}` : `Paid on ${when}`;
  const razorpayMissed = p.payment && p.payment.live === false && !!p.razorpayPaymentId?.startsWith("pay_");

  return (
    <div className="flex flex-col gap-4 w-full min-w-0 pb-8">
      {backButton}

      <section className="bg-card border border-border rounded-xl shadow-sm p-5 min-w-0">
        <h2 className="text-xl font-semibold text-foreground break-words">{whatTitle(p)}</h2>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span className="text-3xl font-semibold text-foreground">{inr(p.amountInr)}</span>
          <PaymentStatusBadge row={p} />
        </div>
        {when && <p className="text-sm text-muted-foreground mt-2">{whenLine}</p>}
        {razorpayMissed && (
          <p className="text-xs text-muted-foreground mt-2">
            Razorpay couldn't be reached, so the payment method and fees may be missing.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PaymentCard p={p} />
        <PersonCard p={p} />
        <BoughtCard p={p} />
        <RazorpayIdsCard p={p} />
        <ReceiptCard p={p} />
      </div>

      <TimelineCard p={p} />
    </div>
  );
}
