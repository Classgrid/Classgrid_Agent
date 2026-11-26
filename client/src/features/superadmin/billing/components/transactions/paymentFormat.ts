// How payments read on the Transactions pages: rupees in the Indian way, dates and times in India time, and plain
// words for what was bought and where the payment stands.
import type { PaymentRow } from "./paymentsApi";

type RowLike = Pick<PaymentRow, "kind" | "status" | "plan" | "amountInr" | "refundedInr">;

export const inr = (n: number | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const toDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

// "17 Nov 2026"
export const fmtDay = (iso: string | null | undefined) => {
  const d = toDate(iso);
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";
};

// "3:45 pm"
export const fmtTime = (iso: string | null | undefined) => {
  const d = toDate(iso);
  return d ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) : "";
};

export const termLabel = (t: string | null | undefined) => (t === "month" ? "1 month" : t === "year" ? "1 year" : "");

const METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  google_play: "Google Play",
};

export const methodLabel = (m: string | null | undefined) => {
  if (!m) return null;
  return METHOD_LABELS[m.toLowerCase()] || m;
};

// The first line of the "What" column
export const whatLabel = (row: RowLike) => {
  if (row.kind === "plan") {
    const name = row.plan?.name || "Plan";
    const term = termLabel(row.plan?.term);
    return term ? `${name} · ${term}` : name;
  }
  if (row.kind === "topup") return "Credit top-up";
  return row.status === "failed" ? "Payment attempt" : "Older payment";
};

// The heading of the detail page
export const whatTitle = (row: RowLike) => {
  if (row.kind === "plan") {
    const name = row.plan?.name || "Plan";
    const term = termLabel(row.plan?.term);
    return term ? `${name} plan, ${term}` : `${name} plan`;
  }
  if (row.kind === "topup") return "Credit top-up";
  return row.status === "failed" ? "Payment attempt" : "Older payment";
};

export const isPartlyRefunded = (row: RowLike) =>
  row.status === "refunded" && row.refundedInr > 0 && row.refundedInr < row.amountInr;

export const statusLabel = (row: RowLike) => {
  switch (row.status) {
    case "paid":
      return "Paid";
    case "refunded":
      return isPartlyRefunded(row) ? "Partly refunded" : "Refunded";
    case "failed":
      return "Failed";
    default:
      return "Not finished";
  }
};
