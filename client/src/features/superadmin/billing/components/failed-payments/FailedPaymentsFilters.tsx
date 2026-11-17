// Failed payments for Classgrid AI: the filters above the list. Plain inputs are used for the search and the dates
// (the shared Input and the date calendars carry a green focus ring, which the owner doesn't want in the app's look).
import React from "react";
import { Button } from "@/components/marketing_ui/button";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { format } from "date-fns";
import { X } from "lucide-react";
import type { OutcomeFilter, PlanFilter, PlanKey, ReasonKey } from "./failedPaymentsApi";
import { REASONS } from "./labels";

// The app's own calendar (owner's rule: never the browser's date box). The filter keeps yyyy-MM-dd; the calendar
// works with a local Date, so the picked day stays that day.
const toKey = (date: Date | undefined) => (date ? format(date, "yyyy-MM-dd") : "");
const toDate = (key: string) =>
  key ? new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))) : undefined;

function DateBox({ value, onChange, placeholder }: { value: string; onChange: (key: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full overflow-hidden">
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
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
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

export type FilterValues = {
  reason: "all" | ReasonKey;
  plan: PlanFilter;
  outcome: OutcomeFilter;
  from: string;
  to: string;
};

type Props = {
  searchInput: string;
  onSearchInput: (value: string) => void;
  values: FilterValues;
  onChange: <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => void;
  plans: Array<{ key: PlanKey; name: string }>;
  hasFilters: boolean;
  onClear: () => void;
  errorText?: string;
};

const FIELD =
  "h-9 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

// On phones ResponsiveSelect shows the phone's own list, whose focus ring is green by default; this turns it neutral
const SELECT = "w-full h-9 text-sm [&_select:focus-visible]:ring-ring";

function Field({ label, htmlFor, className, children }: { label: string; htmlFor?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 min-w-0 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function FailedPaymentsFilters({ searchInput, onSearchInput, values, onChange, plans, hasFilters, onClear, errorText }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <Field label="Search" htmlFor="fp-search" className="lg:col-span-2">
          <input
            id="fp-search"
            type="search"
            value={searchInput}
            onChange={(e) => onSearchInput(e.target.value)}
            placeholder="Name, email or payment ID"
            maxLength={100}
            className={FIELD}
          />
        </Field>

        <Field label="Why it failed">
          <ResponsiveSelect
            className={SELECT}
            value={values.reason}
            onChange={(e) => onChange("reason", e.target.value as FilterValues["reason"])}
          >
            <option value="all">All reasons</option>
            {REASONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </ResponsiveSelect>
        </Field>

        <Field label="What they tried to buy">
          <ResponsiveSelect
            className={SELECT}
            value={values.plan}
            onChange={(e) => onChange("plan", e.target.value as PlanFilter)}
          >
            <option value="all">Everything</option>
            {plans.map((p) => (
              <option key={p.key} value={p.key}>
                {`${p.name} plan`}
              </option>
            ))}
            <option value="credits">AI credits</option>
            <option value="unknown">Not known</option>
          </ResponsiveSelect>
        </Field>

        <Field label="Paid later?">
          <ResponsiveSelect
            className={SELECT}
            value={values.outcome}
            onChange={(e) => onChange("outcome", e.target.value as OutcomeFilter)}
          >
            <option value="all">All</option>
            <option value="paid_later">Paid later</option>
            <option value="not_paid">Not paid yet</option>
          </ResponsiveSelect>
        </Field>

        {/* The two dates share one cell so they always stay side by side, even on a phone */}
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-2">
          <Field label="From" htmlFor="fp-from">
            <DateBox value={values.from} onChange={(key) => onChange("from", key)} placeholder="From" />
          </Field>
          <Field label="To" htmlFor="fp-to">
            <DateBox value={values.to} onChange={(key) => onChange("to", key)} placeholder="To" />
          </Field>
        </div>
      </div>

      {errorText ? <p className="text-xs text-destructive mt-2">{errorText}</p> : null}

      {hasFilters ? (
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}
