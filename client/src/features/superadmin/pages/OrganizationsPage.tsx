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

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Plus, RefreshCw, Search, ShieldCheck, Users, X } from "lucide-react";
import { Link } from "react-router-dom";


import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { DataTable } from "@/components/marketing_ui/data-table";
import { formatOrgType } from "@/utils/orgHelpers";
import { Button } from "@/components/marketing_ui/button";
import { Badge } from "@/components/marketing_ui/badge";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Input } from "@/components/marketing_ui/input";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { SuperadminFilterBar } from "../components/SuperadminFilterBar";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";


import { formatDate } from "@/utils/dateUtils";

import { dashboardApi, type SuperAdminOrganization } from "../services/superAdminApi";

const STATUS_OPTIONS = [
  { value: "", label: "Status: All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "blocked", label: "Blocked" },
  { value: "sandbox", label: "Sandbox" },
  { value: "setup_in_progress", label: "Setup in Progress" },
];

const statusColor = (status: string) => {
  switch (status) {
    case "active": return "var(--success)";
    case "suspended": return "var(--danger)";
    case "blocked": return "var(--danger)";
    case "sandbox": return "var(--warning)";
    case "setup_in_progress": return "var(--info)";
    default: return undefined;
  }
};

const statusVariant = (status?: string) => {
  if (status === "active") return "success";
  if (status === "suspended" || status === "blocked") return "danger";
  return "warning";
};

export function OrganizationsPage() {
  const [search, setSearch] = useState("");
  const [orgTypeFilter, setOrgTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState("");
  const [orgNameFilter, setOrgNameFilter] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["superadmin-all-orgs"],
    queryFn: dashboardApi.getOrganizations,
    staleTime: 60_000,
    retry: 1,
  });

  const allOrgs = data?.data || [];

  const orgEntries = useMemo(() => {
    const map = new Map<string, string | undefined>();
    allOrgs.forEach(org => {
      if (!map.has(org.name)) {
        map.set(org.name, org.logo_url || org.logoUrl);
      }
    });
    return Array.from(map.entries());
  }, [allOrgs]);

  const filteredOrgs = useMemo(() => {
    let result = allOrgs;

    if (orgNameFilter) {
      result = result.filter((org) => org.name === orgNameFilter);
    }

    if (orgTypeFilter) {
      result = result.filter((org: any) => 
        org.orgType?.toLowerCase() === orgTypeFilter.toLowerCase() || 
        org.structureType?.toLowerCase() === orgTypeFilter.toLowerCase()
      );
    }

    if (statusFilter) {
      result = result.filter((org) => org.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (dateFrom) {
      const startOfDay = new Date(dateFrom);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFrom);
      endOfDay.setHours(23, 59, 59, 999);
      
      result = result.filter((org) => {
        const cDate = new Date(org.createdAt);
        return cDate >= startOfDay && cDate <= endOfDay;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (org) =>
          org.name.toLowerCase().includes(q) ||
          (org.ownerEmail || "").toLowerCase().includes(q) ||
          (org.ownerName || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [allOrgs, search, orgTypeFilter, dateFrom, statusFilter, orgNameFilter]);

  const stats = useMemo(() => {
    const totalUsers = allOrgs.reduce((sum, org) => sum + (org.userCount ?? 0), 0);
    return {
      total: allOrgs.length,
      active: allOrgs.filter((org) => org.status === "active").length,
      suspended: allOrgs.filter((org) => org.status === "suspended" || org.status === "blocked").length,
      totalUsers,
    };
  }, [allOrgs]);

  const columns = [
    {
      header: "Organization Name",
      key: "name",
      render: (_val: any, row: any) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex w-10 h-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground overflow-hidden">
            {row.logo_url || row.logoUrl ? (
              <img src={row.logo_url || row.logoUrl} alt={row.name} className="w-full h-full object-contain" />
            ) : (
              <Building2 className="size-4" />
            )}
          </span>
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-xs capitalize text-muted-foreground">
              {formatOrgType(row.orgType)}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Owner",
      key: "ownerEmail",
      render: (_val: any, row: any) => (
        <div className="flex flex-col min-w-0 max-w-[150px]">
          <div className="font-medium text-foreground truncate">{row.ownerName || "Owner not set"}</div>
          <div className="text-xs text-muted-foreground truncate" title={row.ownerEmail}>{row.ownerEmail || "No owner email"}</div>
        </div>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (_val: any, row: any) => (
        <Badge variant={statusVariant(row.status)} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Users",
      key: "userCount",
      render: (_val: any, row: any) => <span className="font-medium tabular-nums">{row.userCount ?? 0}</span>,
    },
    {
      header: "Joined",
      key: "createdAt",
      render: (_val: any, row: any) => (
        <span className="text-sm">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (_val: any, row: any) => (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/superadmin/detail/${row._id}`}>
            View Details
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">


      {/* Search & Filters */}
      <div className="w-full relative z-50">
        <SuperadminFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, owner, plan..."
        >
          {/* Org Name */}
          <div className="w-[150px]">
            <ResponsiveSelect
              className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm"
              value={orgNameFilter}
              onChange={(e) => setOrgNameFilter(e.target.value)}
            >
              <option value="">Org Name: All</option>
              {orgEntries.map(([name, logo]) => (
                <option key={name} value={name}>
                  <span className="flex items-center gap-2">
                    {logo ? (
                      <img src={logo} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-muted shrink-0 flex items-center justify-center text-[9px] font-bold text-muted-foreground">{name.charAt(0)}</span>
                    )}
                    <span className="truncate">{name}</span>
                  </span>
                </option>
              ))}
            </ResponsiveSelect>
          </div>

          {/* Org Type */}
          <div className="w-[150px]">
            <ResponsiveSelect
              className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm"
              value={orgTypeFilter}
              onChange={(e) => setOrgTypeFilter(e.target.value)}
            >
              <option value="">Org Type: All</option>
              {["school", "junior_college", "engineering", "coaching", "diploma", "other"].map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ")}
                </option>
              ))}
            </ResponsiveSelect>
          </div>

          {/* Date picker */}
          <div className="w-[180px] max-w-[180px] overflow-hidden relative">
            <NikhilTimeCalendar
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Select Date"
              popDirection="down"
              showTime={false}
              className="h-9 w-full pr-8"
            />
            {dateFrom && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent bg-background"
                title="Clear date"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status */}
          <div className="w-[150px]">
            <ResponsiveSelect
              className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} data-color={o.value ? statusColor(o.value) : undefined}>
                  {o.label}
                </option>
              ))}
            </ResponsiveSelect>
          </div>
        </SuperadminFilterBar>
      </div>

      {isError ? (
          <div className="p-4 m-4 rounded-md border bg-red-100 text-red-800 border-red-200">
            <span className="font-semibold block mb-1">Backend request failed</span>
            <p className="text-sm mb-3">
              {(error as Error)?.message || "The organizations endpoint did not return data."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

      <div className="w-full relative z-0">
        <DataTable
          columns={columns}
          rows={filteredOrgs}
          isLoading={isLoading}
          emptyMessage={allOrgs.length ? "No organizations match your search." : "No organizations found."}
        />
      </div>
    </div>
  );
}
