// Whether an account can be used: Active, Banned (suspended or blocked), Pending, or Erased (removed on request).
import { Badge } from "@/components/marketing_ui/badge";
import { isBanned, statusLabel } from "./format";

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const variant = !status || status === "active" ? "success" : isBanned(status) ? "danger" : status === "pending" ? "warning" : "neutral";
  return (
    <Badge variant={variant} dot className="whitespace-nowrap">
      {statusLabel(status)}
    </Badge>
  );
}
