// Failed payments for Classgrid AI: the payment as Razorpay recorded it (ids, the email and phone typed at
// checkout, Razorpay's raw error fields). When Razorpay's webhook message wasn't saved, the line at the bottom says
// where the details came from, or that some are missing.
import { useState } from "react";
import { ChevronDown, Copy, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { cn } from "@/lib/utils";
import type { FailedPaymentDetail } from "./failedPaymentsApi";
import { InfoRow, SectionCard } from "./SectionCard";
import { formatWhen } from "./labels";

function CopyableId({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast("Copied");
    } catch {
      // The browser refused the clipboard (e.g. the page isn't focused); nothing else to do
    }
  };
  return (
    <span className="inline-flex items-center gap-1 max-w-full">
      <span className="font-mono text-xs break-all">{value}</span>
      <Button variant="ghost" size="sm" onClick={copy} className="h-7 w-7 px-0 shrink-0" aria-label="Copy" title="Copy">
        <Copy className="w-3.5 h-3.5" />
      </Button>
    </span>
  );
}

const RAW_FIELDS: Array<{ key: keyof FailedPaymentDetail["razorpay"]; label: string }> = [
  { key: "errorCode", label: "Code" },
  { key: "errorDescription", label: "Description" },
  { key: "errorSource", label: "Source" },
  { key: "errorStep", label: "Step" },
  { key: "errorReason", label: "Reason" },
];

export function PaymentRecordSection({ item, className }: { item: FailedPaymentDetail; className?: string }) {
  const [open, setOpen] = useState(false);
  const { payment, razorpay, sources } = item;

  return (
    <SectionCard icon={Receipt} title="Payment record" note="From Razorpay's message to Classgrid." className={className}>
      <div>
        <InfoRow label="Razorpay payment ID">
          <CopyableId value={payment.razorpayPaymentId} />
        </InfoRow>
        <InfoRow label="Razorpay order ID">
          <CopyableId value={payment.razorpayOrderId} />
        </InfoRow>
        <InfoRow label="Email at checkout">
          <span className="break-all">{payment.emailUsed || "—"}</span>
        </InfoRow>
        <InfoRow label="Phone at checkout">{payment.phoneUsed || "—"}</InfoRow>
        <InfoRow label="Saved on">{formatWhen(item.recordedAt)}</InfoRow>
      </div>

      <div className="mt-4 rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          What Razorpay sent
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open ? (
          <div className="px-3 pb-2 border-t border-border">
            {RAW_FIELDS.map((f) => (
              <InfoRow key={f.key} label={f.label}>
                <span className="font-mono text-xs break-all">{razorpay[f.key] || "—"}</span>
              </InfoRow>
            ))}
          </div>
        ) : null}
      </div>

      {!sources.webhookSaved ? (
        <p className="text-xs text-muted-foreground mt-3">
          {sources.checkedWithRazorpay
            ? "Razorpay's message wasn't saved, so these details were read from Razorpay just now."
            : "Razorpay's message wasn't saved, so some details are missing."}
        </p>
      ) : null}
    </SectionCard>
  );
}
