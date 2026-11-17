/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

// The Users list (rebuilt 2026-11-17 for Classgrid AI): everyone with an account, with their plan, when they joined,
// when they were last active and how many chats they have. Filters, sort and page live in the page address, so
// Back from a person's page returns to the same list. Opening a person shows their own page (UserDetailPage).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/marketing_ui/empty";

import { usePeople, usePeopleLive } from "../components/global-users/api";
import { METHOD_OPTIONS, PLAN_OPTIONS, PeopleFilters, SORT_OPTIONS, STATUS_OPTIONS, type FilterChange } from "../components/global-users/PeopleFilters";
import { PeopleTable } from "../components/global-users/PeopleTable";
import { PeopleCards } from "../components/global-users/PeopleCards";
import { PeoplePager } from "../components/global-users/PeoplePager";
import { peopleText } from "../components/global-users/format";
import type { PeopleParams, PersonRow } from "../components/global-users/types";

const DEFAULTS: PeopleParams = { q: "", plan: "all", status: "all", method: "all", signup: "finished", sort: "joined", dir: "desc", page: 1 };
const SEARCH_DELAY_MS = 300;

// A value typed into the address by hand that the server doesn't know falls back to the default, instead of the
// whole list failing with "Unknown filter"
const oneOf = <T extends string>(value: string | null, allowed: readonly { value: string }[], fallback: T): T =>
  (value && allowed.some((o) => o.value === value) ? value : fallback) as T;

function readParams(sp: URLSearchParams): PeopleParams {
  const [sortRaw, dirRaw] = [sp.get("sort"), sp.get("dir")];
  const sortValue = oneOf(`${sortRaw || DEFAULTS.sort}:${dirRaw || DEFAULTS.dir}`, SORT_OPTIONS, `${DEFAULTS.sort}:${DEFAULTS.dir}`);
  const [sort, dir] = sortValue.split(":") as [PeopleParams["sort"], PeopleParams["dir"]];
  const page = Number.parseInt(sp.get("page") || "", 10);
  return {
    q: (sp.get("q") || "").slice(0, 100),
    plan: oneOf(sp.get("plan"), PLAN_OPTIONS, DEFAULTS.plan),
    status: oneOf(sp.get("status"), STATUS_OPTIONS, DEFAULTS.status),
    method: oneOf(sp.get("method"), METHOD_OPTIONS, DEFAULTS.method),
    signup: oneOf(sp.get("signup"), [{ value: "finished" }, { value: "unfinished" }, { value: "all" }], DEFAULTS.signup),
    sort,
    dir,
    page: Number.isFinite(page) && page >= 1 ? page : 1,
  };
}

// Only the values that differ from the defaults go in the address, so a plain list has a plain address
function writeParams(params: PeopleParams): URLSearchParams {
  const sp = new URLSearchParams();
  (Object.keys(DEFAULTS) as (keyof PeopleParams)[]).forEach((key) => {
    const value = params[key];
    if (key === "q" ? String(value).trim() : value !== DEFAULTS[key]) sp.set(key, String(key === "q" ? String(value).trim() : value));
  });
  return sp;
}

export function GlobalUsersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => readParams(searchParams), [searchParams]);
  const { data, isLoading, isError, isPlaceholderData, refetch } = usePeople(params);
  usePeopleLive();

  const update = (next: PeopleParams, push = false) => setSearchParams(writeParams(next), { replace: !push });
  // (the search timer reads the filters as they are when it fires, not as they were when typing started)
  const latestParams = useRef(params);
  latestParams.current = params;

  // Search is typed here and sent 300 ms after the last key. The box follows the address when the address changes
  // from elsewhere (Back, Clear filters), but not when it is the box's own text arriving there.
  const [search, setSearch] = useState(params.q);
  const sentSearch = useRef(params.q);
  useEffect(() => {
    if (params.q !== sentSearch.current) {
      sentSearch.current = params.q;
      setSearch(params.q);
    }
  }, [params.q]);
  useEffect(() => {
    if (search.trim() === params.q.trim()) return;
    const timer = setTimeout(() => {
      sentSearch.current = search.trim();
      update({ ...latestParams.current, q: search, page: 1 });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // (only a change in the typed text starts the timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const changeFilters = (change: FilterChange) => update({ ...params, ...change, page: 1 });
  const clearFilters = () => {
    sentSearch.current = "";
    setSearch("");
    update(DEFAULTS);
  };
  const goToPage = (page: number) => {
    update({ ...params, page }, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // A page number past the end (people were removed, or an old link) moves to the last page there is
  useEffect(() => {
    if (data && data.data.length === 0 && data.total > 0 && params.page > data.pages) update({ ...params, page: data.pages });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params.page]);

  const rows: PersonRow[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const filtersOn = params.q.trim() !== "" || params.plan !== "all" || params.status !== "all" || params.method !== "all" || params.signup !== "finished";
  const openPerson = (row: PersonRow) => navigate(`/superadmin/global-users/${row._id}`);

  let body: ReactNode;
  if (isError && !data) {
    body = (
      <Empty className="border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyTitle className="text-foreground">Couldn&apos;t load users</EmptyTitle>
          <EmptyDescription>Check your connection and try again.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button size="sm" onClick={() => refetch()}>Try again</Button></EmptyContent>
      </Empty>
    );
  } else if (!isLoading && rows.length === 0 && total === 0) {
    body = filtersOn ? (
      <Empty className="border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyTitle className="text-foreground">No one matches</EmptyTitle>
          <EmptyDescription>Try another name, email or phone, or clear the filters.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button></EmptyContent>
      </Empty>
    ) : (
      <Empty className="border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyTitle className="text-foreground">No users yet</EmptyTitle>
          <EmptyDescription>People appear here as soon as they sign up.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else {
    body = (
      // (the rows of the old page stay dimmed while the next page or filter loads)
      <div className={`flex flex-col gap-4 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        <div className="hidden md:block">
          <PeopleTable rows={rows} isLoading={isLoading} onOpen={openPerson} />
        </div>
        <div className="md:hidden">
          <PeopleCards rows={rows} isLoading={isLoading} onOpen={openPerson} />
        </div>
        {data && <PeoplePager page={params.page} pages={data.pages} onPage={goToPage} disabled={isPlaceholderData} />}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6 flex flex-col gap-5 min-w-0">
      <div className="min-w-0">
        {/* (the same name as the sidebar and the page's top bar) */}
        <h1 className="text-2xl font-semibold text-foreground">Global Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Everyone with a Classgrid account. Open a person to see their plan, payments and activity.</p>
      </div>

      {/* (the filter bar brings its own space underneath, so it sits in a block without the page gap) */}
      <div className="min-w-0">
        <PeopleFilters
          search={search}
          onSearchChange={setSearch}
          params={params}
          unfinishedSignups={data ? data.unfinishedSignups : null}
          onChange={changeFilters}
          countText={isError && !data ? undefined : isLoading ? <Skeleton className="h-4 w-24" /> : peopleText(total)}
        />
        {body}
      </div>
    </div>
  );
}
