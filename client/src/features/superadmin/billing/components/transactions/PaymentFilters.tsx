// The filters over the payments list: search, type, plan, status and dates. Built here instead of with the shared
// SuperadminFilterBar because that bar has an emerald focus ring (no green in the app's own look).
// The page keeps the values in the URL, so Back from a payment brings the same filters back.
import React from "react";
import { format } from "date-fns";
import { Search, X } from "lucide-react";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { NikhilDateCalendar } from "@/components/marketing_ui/nikhil_date_calendar";
import { Button } from "@/components/marketing_ui/button";

export interface PaymentFilterValues {
  type: string;
  plan: string;
  status: string;
  from: string; // yyyy-MM-dd
  to: string; // yyyy-MM-dd
}

interface PaymentFiltersProps {
  searchInput: string;
  onSearchInput: (value: string) => void;
  values: PaymentFilterValues;
  onChange: (patch: Partial<PaymentFilterValues>) => void;
  anyFilter: boolean;
  onClear: () => void;
}

const SELECT_CLASS =
  "flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent/50";

// yyyy-MM-dd → a local Date for the calendar (no time zone shift: the day the person picked stays that day)
const toDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
};

export function PaymentFilters({ searchInput, onSearchInput, values, onChange, anyFilter, onClear }: PaymentFiltersProps) {
  const fromDate = toDate(values.from);
  const toDateValue = toDate(values.to);
  const hasDates = !!(fromDate || toDateValue);
  const planLocked = values.type === "topup" || values.type === "other";

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)}
          placeholder="Search by name, email or payment id"
          maxLength={100}
          className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => onSearchInput("")}
            title="Clear search"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="w-full sm:w-40">
        <ResponsiveSelect
          className={SELECT_CLASS}
          value={values.type}
          // A plan only belongs to plan payments, so any other type clears the plan
          onChange={(e) => {
            const type = e.target.value;
            onChange(type === "plan" ? { type } : { type, plan: "" });
          }}
        >
          <option value="">All types</option>
          <option value="plan">Plans</option>
          <option value="topup">Top-ups</option>
          <option value="other">Other payments</option>
        </ResponsiveSelect>
      </div>

      <div className="w-full sm:w-36">
        <ResponsiveSelect
          className={SELECT_CLASS}
          value={values.plan}
          disabled={planLocked}
          // Picking a plan means looking at plan payments, so the type follows
          onChange={(e) => {
            const plan = e.target.value;
            onChange(plan ? { plan, type: "plan" } : { plan: "" });
          }}
        >
          <option value="">All plans</option>
          <option value="pro">Pro</option>
          <option value="max">Max</option>
          <option value="enterprise">Enterprise</option>
        </ResponsiveSelect>
      </div>

      <div className="w-full sm:w-40">
        <ResponsiveSelect className={SELECT_CLASS} value={values.status} onChange={(e) => onChange({ status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </ResponsiveSelect>
      </div>

      <div className="relative w-full sm:w-[230px] overflow-hidden">
        <NikhilDateCalendar
          value={hasDates ? { from: fromDate, to: toDateValue } : undefined}
          onChange={(range) =>
            onChange({
              from: range?.from ? format(range.from, "yyyy-MM-dd") : "",
              to: range?.to ? format(range.to, "yyyy-MM-dd") : "",
            })
          }
          placeholder="Any date"
          popDirection="down"
          className="h-9 w-full pr-8"
        />
        {hasDates && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: "", to: "" });
            }}
            title="Clear dates"
            aria-label="Clear dates"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {anyFilter && (
        <Button variant="ghost" size="sm" onClick={onClear} className="w-full sm:w-auto">
          Clear filters
        </Button>
      )}
    </div>
  );
}
