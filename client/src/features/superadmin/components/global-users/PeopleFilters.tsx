// The search box and the dropdowns above the people list. Sorting is one dropdown that holds both the order and
// its direction ("Newest first", "Least recently active"...), so it is stored as "joined:desc" while it is picked.
//
// Layout (owner, 2026-11-17, "fix this" on the live page): the search box was dashed, cut its placeholder and sat
// alone beside the dropdowns, which wrapped 3 + 2 at uneven widths. Now: a full-width search box with the same solid
// border, height and corners as the dropdowns, then one even row of filters (2 a row on phones, 5 on wide screens)
// with the number of people found under it.
import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { num } from "./format";
import type { PeopleParams } from "./types";

const SELECT_CLASS = "flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm";

export const PLAN_OPTIONS = [
  { value: "all", label: "All plans" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "max", label: "Max" },
  { value: "enterprise", label: "Enterprise" },
  { value: "none", label: "No plan saved" },
] as const;

export const STATUS_OPTIONS = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "banned", label: "Blocked" },
  { value: "erased", label: "Erased" },
] as const;

export const METHOD_OPTIONS = [
  { value: "all", label: "Any sign-up" },
  { value: "email", label: "Email" },
  { value: "google", label: "Google" },
  { value: "github", label: "GitHub" },
] as const;

export const SORT_OPTIONS = [
  { value: "joined:desc", label: "Newest first" },
  { value: "joined:asc", label: "Oldest first" },
  { value: "last_active:desc", label: "Recently active" },
  { value: "last_active:asc", label: "Least recently active" },
] as const;

export type FilterChange = Partial<Omit<PeopleParams, "page" | "q">>;

export function PeopleFilters({ search, onSearchChange, params, unfinishedSignups, onChange, countText }: {
  search: string;
  onSearchChange: (value: string) => void;
  params: PeopleParams;
  unfinishedSignups: number | null;
  onChange: (change: FilterChange) => void;
  /** "28 people", shown under the filters (null while loading) */
  countText?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 mb-4 min-w-0">
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search people by name, email or phone"
          aria-label="Search people"
          className="w-full h-9 pl-9 pr-9 rounded-md border border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        {search && (
          <button type="button" onClick={() => onSearchChange("")} aria-label="Clear the search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 min-w-0">
      <div className="min-w-0">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Plan" value={params.plan} onChange={(e) => onChange({ plan: e.target.value as PeopleParams["plan"] })}>
          {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </ResponsiveSelect>
      </div>
      <div className="min-w-0">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Status" value={params.status} onChange={(e) => onChange({ status: e.target.value as PeopleParams["status"] })}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </ResponsiveSelect>
      </div>
      <div className="min-w-0">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Signed up with" value={params.method} onChange={(e) => onChange({ method: e.target.value as PeopleParams["method"] })}>
          {METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </ResponsiveSelect>
      </div>
      <div className="min-w-0">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Sign-up" value={params.signup} onChange={(e) => onChange({ signup: e.target.value as PeopleParams["signup"] })}>
          <option value="finished">Finished sign-ups</option>
          <option value="unfinished">{unfinishedSignups === null ? "Unfinished sign-ups" : `Unfinished sign-ups (${num(unfinishedSignups)})`}</option>
          <option value="all">Everyone</option>
        </ResponsiveSelect>
      </div>
      <div className="min-w-0 col-span-2 lg:col-span-1">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Sort" value={`${params.sort}:${params.dir}`}
          onChange={(e) => {
            const [sort, dir] = String(e.target.value).split(":");
            onChange({ sort: sort as PeopleParams["sort"], dir: dir as PeopleParams["dir"] });
          }}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </ResponsiveSelect>
      </div>
      </div>
      {countText !== undefined && <div className="h-5 flex items-center text-sm text-muted-foreground">{countText}</div>}
    </div>
  );
}
