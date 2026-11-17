// The search box and the dropdowns above the people list. Sorting is one dropdown that holds both the order and
// its direction ("Newest first", "Least recently active"...), so it is stored as "joined:desc" while it is picked.
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { SuperadminFilterBar } from "../SuperadminFilterBar";
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
  { value: "banned", label: "Banned" },
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

export function PeopleFilters({ search, onSearchChange, params, unfinishedSignups, onChange }: {
  search: string;
  onSearchChange: (value: string) => void;
  params: PeopleParams;
  unfinishedSignups: number | null;
  onChange: (change: FilterChange) => void;
}) {
  return (
    <SuperadminFilterBar searchQuery={search} onSearchChange={onSearchChange} searchPlaceholder="Search by name, email or phone">
      <div className="w-full sm:w-[170px]">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Plan" value={params.plan} onChange={(e) => onChange({ plan: e.target.value as PeopleParams["plan"] })}>
          {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </ResponsiveSelect>
      </div>
      <div className="w-full sm:w-[170px]">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Status" value={params.status} onChange={(e) => onChange({ status: e.target.value as PeopleParams["status"] })}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </ResponsiveSelect>
      </div>
      <div className="w-full sm:w-[170px]">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Signed up with" value={params.method} onChange={(e) => onChange({ method: e.target.value as PeopleParams["method"] })}>
          {METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </ResponsiveSelect>
      </div>
      {/* (wider than the others: the unfinished option carries its count) */}
      <div className="w-full sm:w-[220px]">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Sign-up" value={params.signup} onChange={(e) => onChange({ signup: e.target.value as PeopleParams["signup"] })}>
          <option value="finished">Finished sign-ups</option>
          <option value="unfinished">{unfinishedSignups === null ? "Unfinished sign-ups" : `Unfinished sign-ups (${num(unfinishedSignups)})`}</option>
          <option value="all">Everyone</option>
        </ResponsiveSelect>
      </div>
      <div className="w-full sm:w-[190px]">
        <ResponsiveSelect className={SELECT_CLASS} aria-label="Sort" value={`${params.sort}:${params.dir}`}
          onChange={(e) => {
            const [sort, dir] = String(e.target.value).split(":");
            onChange({ sort: sort as PeopleParams["sort"], dir: dir as PeopleParams["dir"] });
          }}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </ResponsiveSelect>
      </div>
    </SuperadminFilterBar>
  );
}
