// A Razorpay id in monospace with a copy button. The click never reaches the row around it, so copying an id
// doesn't open the payment.
import React, { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyIdProps {
  value: string | null | undefined;
  label?: string; // "Payment id", "Order id", "Refund id"
  wrap?: boolean; // the detail page shows the whole id; the list cuts it short
  className?: string;
}

export function CopyId({ value, label = "Payment id", wrap = false, className }: CopyIdProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!value) return <span className="text-muted-foreground">—</span>;

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied`);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the id and copy it by hand.");
    }
  };

  return (
    <span className={cn("inline-flex items-center gap-1 min-w-0 max-w-full", className)}>
      <span className={cn("font-mono text-xs text-foreground", wrap ? "break-all" : "truncate")} title={value}>
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label={`Copy ${label.toLowerCase()}`}
        title={`Copy ${label.toLowerCase()}`}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}
