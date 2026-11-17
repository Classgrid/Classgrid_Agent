// The cards on a payment's page: the payment itself, who paid, what it bought, the Razorpay ids and the receipt email.
// A line with nothing to show is left out instead of showing a dash, so each card says only what is known.
// Nothing is guessed: settlement dates, the buyer's IP and organization details are not shown on purpose.
import React from "react";
import { useNavigate } from "react-router-dom";
import { Hash, IndianRupee, Mail, Package, User } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { CopyId } from "./CopyId";
import { PersonAvatar } from "./PersonAvatar";
import { fmtDay, fmtTime, inr, methodLabel, statusLabel, termLabel } from "./paymentFormat";
import type { PaymentDetail } from "./paymentsApi";

export function SectionCard({ icon: Icon, title, note, children }: {
  icon: React.ElementType;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-5 min-w-0">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// Label on the left, value on the right; hidden when there is no value
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "" || children === false) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-b-0 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="text-foreground text-right min-w-0 break-words">{children}</div>
    </div>
  );
}

const dayAndTime = (iso: string | null | undefined) => (iso ? [fmtDay(iso), fmtTime(iso)].filter(Boolean).join(", ") : null);

export function PaymentCard({ p }: { p: PaymentDetail }) {
  const pay = p.payment;
  const method = pay.methodLabel || methodLabel(p.method);
  return (
    <SectionCard icon={IndianRupee} title="Payment" note="What was paid and how.">
      <div>
        <DetailRow label="Amount">{inr(p.amountInr)}</DetailRow>
        <DetailRow label="Status">{statusLabel(p)}</DetailRow>
        <DetailRow label="Paid with">
          {method ? (
            <div>
              <div>{method}</div>
              {pay.methodDetail && <div className="font-mono text-xs text-muted-foreground break-all">{pay.methodDetail}</div>}
            </div>
          ) : null}
        </DetailRow>
        <DetailRow label="Bank reference">
          {pay.bankReference ? <span className="font-mono text-xs break-all">{pay.bankReference}</span> : null}
        </DetailRow>
        <DetailRow label="Razorpay fee">{pay.feeInr != null ? inr(pay.feeInr) : null}</DetailRow>
        <DetailRow label="GST on the fee">{pay.taxInr != null ? inr(pay.taxInr) : null}</DetailRow>
        <DetailRow label="You receive">{pay.netInr != null ? inr(pay.netInr) : null}</DetailRow>
        {/* Same words as the header line: a failed payment was only tried, an unfinished one only started */}
        <DetailRow label={p.status === "failed" ? "Tried on" : p.status === "pending" ? "Started on" : "Paid on"}>
          {dayAndTime(pay.paidAt)}
        </DetailRow>
        {p.status === "failed" && <DetailRow label="Why it failed">{pay.errorText}</DetailRow>}
      </div>

      {p.refunds.length > 0 && (
        <div className="mt-4">
          <h5 className="text-sm font-semibold text-foreground mb-2">Refunds</h5>
          <ul className="flex flex-col gap-2">
            {p.refunds.map((r, i) => (
              <li key={r.refundId || i} className="text-sm">
                <div className="text-foreground">
                  {inr(r.amountInr)} on {fmtDay(r.date)}
                </div>
                {r.reason && <div className="text-xs text-muted-foreground">{r.reason}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

export function PersonCard({ p }: { p: PaymentDetail }) {
  const navigate = useNavigate();
  const person = p.person;
  const plan = person.currentPlan;
  const planNow = plan ? (plan.expiresAt ? `${plan.name}, until ${fmtDay(plan.expiresAt)}` : plan.name) : "Free";
  const canOpen = person.linked && !!person.userId;

  return (
    <SectionCard icon={User} title="Person" note="Who paid.">
      <div className="flex items-center gap-3 mb-3 min-w-0">
        <PersonAvatar name={person.name} email={person.email} photoUrl={person.photoUrl} size={48} />
        <div className="min-w-0">
          <div className={person.name ? "font-medium text-foreground truncate" : "font-medium text-muted-foreground truncate"}>
            {person.name || "No name"}
          </div>
          <div className="text-sm text-muted-foreground truncate">{person.email || "No email"}</div>
        </div>
      </div>
      <div>
        <DetailRow label="Phone">{person.phone}</DetailRow>
        {/* "Plan now" is about the account, so it only means something while the account exists */}
        {canOpen && <DetailRow label="Plan now">{planNow}</DetailRow>}
      </div>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canOpen}
          onClick={() => canOpen && navigate(`/superadmin/global-users/${person.userId}`)}
        >
          Open profile
        </Button>
        {!canOpen && <span className="text-xs text-muted-foreground">This account no longer exists.</span>}
      </div>
    </SectionCard>
  );
}

export function BoughtCard({ p }: { p: PaymentDetail }) {
  let body: React.ReactNode;
  if (p.status === "failed") {
    body = <p className="text-sm text-muted-foreground">Nothing was bought: the payment did not go through.</p>;
  } else if (p.kind === "plan") {
    const sp = p.plan?.studentPrice;
    body = (
      <div>
        <DetailRow label="Plan">{p.plan?.name || "Not recorded"}</DetailRow>
        <DetailRow label="Length">{termLabel(p.plan?.term) || "Not recorded"}</DetailRow>
        <DetailRow label="Price">{sp === true ? "Student price" : sp === false ? "Normal price" : "Not recorded"}</DetailRow>
        <DetailRow label="From">{fmtDay(p.plan?.periodStart)}</DetailRow>
        <DetailRow label="Until">{fmtDay(p.plan?.periodEnd)}</DetailRow>
      </div>
    );
  } else if (p.kind === "topup") {
    body = (
      <div>
        <DetailRow label="Credits added">{p.credits == null ? "Not recorded" : p.credits.toLocaleString("en-IN")}</DetailRow>
      </div>
    );
  } else {
    body = <p className="text-sm text-muted-foreground">An older payment from before plans. Its details aren't shown here.</p>;
  }
  return (
    <SectionCard icon={Package} title="What it bought" note="The plan and its dates, or the credits.">
      {body}
    </SectionCard>
  );
}

export function RazorpayIdsCard({ p }: { p: PaymentDetail }) {
  const refundIds = p.refunds.filter((r) => r.refundId);
  const none = !p.razorpayPaymentId && !p.razorpayOrderId && refundIds.length === 0;
  return (
    <SectionCard icon={Hash} title="Razorpay" note="Ids to look this payment up.">
      {none ? (
        <p className="text-sm text-muted-foreground">No Razorpay ids are saved on this payment.</p>
      ) : (
        <div>
          <DetailRow label="Payment id">
            {p.razorpayPaymentId ? <CopyId value={p.razorpayPaymentId} label="Payment id" wrap /> : null}
          </DetailRow>
          <DetailRow label="Order id">
            {p.razorpayOrderId ? <CopyId value={p.razorpayOrderId} label="Order id" wrap /> : null}
          </DetailRow>
          {refundIds.map((r) => (
            <DetailRow key={r.refundId as string} label="Refund id">
              <CopyId value={r.refundId} label="Refund id" wrap />
            </DetailRow>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// Only plans get a receipt email. Whether it arrived isn't saved anywhere per payment, so the card says only where
// it was sent.
export function ReceiptCard({ p }: { p: PaymentDetail }) {
  if (p.receipt.sent !== "plan_receipt" && p.kind !== "topup") return null;
  return (
    <SectionCard icon={Mail} title="Receipt email" note="What the buyer got by email.">
      {p.receipt.sent === "plan_receipt" ? (
        p.receipt.to ? (
          <div className="text-sm">
            <p className="text-foreground break-words">A receipt is emailed to {p.receipt.to} when a plan is paid.</p>
            <p className="text-xs text-muted-foreground mt-1">Whether it arrived isn't recorded.</p>
          </div>
        ) : (
          <p className="text-sm text-foreground">A receipt is emailed when a plan is paid, but no address is saved on this payment.</p>
        )
      ) : (
        <p className="text-sm text-foreground">No receipt email is sent for credit top-ups.</p>
      )}
    </SectionCard>
  );
}
