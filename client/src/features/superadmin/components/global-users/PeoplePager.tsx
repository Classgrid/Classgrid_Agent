// Previous / Page x of y / Next, under the people list and under the full payments list.
import { Button } from "@/components/marketing_ui/button";
import { num } from "./format";

export function PeoplePager({ page, pages, onPage, disabled }: { page: number; pages: number; onPage: (page: number) => void; disabled?: boolean }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-sm text-muted-foreground">Page {num(page)} of {num(pages)}</span>
      <Button variant="outline" size="sm" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}
