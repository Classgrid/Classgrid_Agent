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

/*
 * =========================================================================================
 * 🔴🔴🔴 PERMANENT RULE — STATUS FILTER — READ BEFORE TOUCHING THIS FILE 🔴🔴🔴
 *
 * DO NOT EVER ADD "scheduled" TO THE STATUS_OPTIONS FILTER LIST.
 * NOT NOW. NOT TOMORROW. NOT EVER.
 *
 * REASON:
 * "scheduled" is set ONLY by the marketing site (classgrid.in) when a lead
 * books their FIRST meeting. The DASHBOARD NEVER SETS THIS STATUS.
 * After the first booking, the only relevant status is "rescheduled".
 *
 * THE FILTER ONLY SHOWS STATUSES THAT THE DASHBOARD TEAM ACTS ON.
 * "scheduled" IS NOT ONE OF THEM. ONLY "rescheduled" BELONGS HERE.
 *
 * IF YOU ARE AN AI AND YOU ADD "scheduled" TO THIS LIST, YOU ARE WRONG.
 * IF YOU ARE A DEVELOPER AND YOU ADD "scheduled" TO THIS LIST, YOU ARE WRONG.
 * THIS IS A DIRECT INSTRUCTION FROM THE PRODUCT OWNER. DO NOT OVERRIDE IT.
 * =========================================================================================
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, CheckCircle, CalendarClock,
  AlertTriangle
} from "lucide-react";

import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { SuperadminFilterBar } from "../components/SuperadminFilterBar";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { X } from "lucide-react";
import { DataTable } from "@/components/marketing_ui/data-table";
import { useLeads, useAssignLead } from "../queries/useLeads";
import type { Lead } from "../services/superAdminApi";
import { getSocket } from "@/lib/socketClient";

import { LeadTable } from "../components/LeadTable";

// ── Page ──────────────────────────────────────────────────────────────────────

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * 🚨 STRICT RULE — DO NOT ADD "scheduled" TO THIS LIST. EVER. 🚨
 *
 * "scheduled" is set ONLY by the marketing site on first-time booking.
 * It is NEVER used by the dashboard and must NEVER appear as a filter option.
 * After the first booking, the status becomes "rescheduled" — use that instead.
 *
 * ANY AI OR DEVELOPER WHO ADDS "scheduled" TO THIS LIST IS WRONG.
 * ONLY "rescheduled" belongs here. Not "scheduled". Never "scheduled".
 * ─────────────────────────────────────────────────────────────────────────────
 */
const STATUS_OPTIONS = [
  { value: "", label: "Status: All" },
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "contacted", label: "Contacted", color: "bg-blue-500" },
  { value: "completed", label: "Completed", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
  { value: "rescheduled", label: "Rescheduled", color: "bg-purple-500" },
  { value: "missed", label: "Missed", color: "bg-orange-500" },
  { value: "closed", label: "Closed", color: "bg-gray-500" },
  { value: "provisioned", label: "Provisioned", color: "bg-emerald-500" },
];

export function LeadsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch, isFetching } = useLeads();
  const assignMutation = useAssignLead();

  const [search, setSearch] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [orgTypeFilter, setOrgTypeFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateType, setDateType] = useState<"createdAt" | "meetingScheduledAt">("createdAt");

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for DemoRequest changes emitted by our MongoDB change stream
    socket.on("superadmin:leads_updated", () => {
      refetch();
    });

    return () => {
      socket.off("superadmin:leads_updated");
    };
  }, [refetch]);

  const leads = data?.leads ?? [];

  const stats = useMemo(() => {
    const total = leads.length;
    const unassigned = leads.filter(l => !l.assignedTo).length;
    const demoScheduled = leads.filter(l => l.meetingStatus === "scheduled").length;
    const converted = leads.filter(l => l.status === "converted").length;
    return { total, unassigned, demoScheduled, converted };
  }, [leads]);

  const assignees = useMemo(() => {
    const map = new Map<string, any>();
    leads.forEach(lead => {
      if (lead.assignedTo && lead.assignedTo._id) {
        map.set(lead.assignedTo._id, lead.assignedTo);
      }
    });
    return Array.from(map.values());
  }, [leads]);

  const filtered = useMemo(() => {
    let result = leads;

    if (statusFilter) {
      result = result.filter(l => {
        // Provisioned = status is "converted"
        if (statusFilter === "provisioned") return l.status === "converted";
        // Closed uses the top-level status field
        if (statusFilter === "closed") return l.status === "closed";
        // All others: compute the displayed badge the same way LeadTable does
        if (l.status === "converted" || l.status === "closed") return false;
        const ms = l.meetingStatus || "pending";
        if (statusFilter === "contacted") {
          // "Contacted" = meetingStatus is pending AND has an assignee
          return ms === "pending" && !!l.assignedTo;
        }
        if (statusFilter === "pending") {
          // "Pending" = meetingStatus is pending AND no assignee
          return ms === "pending" && !l.assignedTo;
        }
        // scheduled, completed, cancelled, rescheduled, missed map 1:1 to meetingStatus
        return ms === statusFilter;
      });
    }
    
    if (orgTypeFilter) {
      result = result.filter(l => l.orgType?.toLowerCase() === orgTypeFilter.toLowerCase());
    }
    
    if (assigneeFilter) {
      result = result.filter(l => l.assignedTo?._id === assigneeFilter);
    }
    
    if (dateFrom) {
      const startOfDay = new Date(dateFrom);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFrom);
      endOfDay.setHours(23, 59, 59, 999);
      
      result = result.filter((lead) => {
        const cDate = lead[dateType] ? new Date(lead[dateType] as string | Date) : null;
        if (!cDate) return false;
        return cDate >= startOfDay && cDate <= endOfDay;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.institutionName?.toLowerCase().includes(q) ||
        l.adminEmail?.toLowerCase().includes(q) ||
        l.adminName?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, search, statusFilter, orgTypeFilter, assigneeFilter, dateFrom, dateType]);

  const handleAssign = (id: string) => {
    setAssigningId(id);
    assignMutation.mutate(id, {
      onSettled: () => setAssigningId(null),
      onError: (err: Error) => alert(err?.message || "Failed to assign lead")
    });
  };

  const handleManage = (id: string) => {
    navigate(`/superadmin/leads/${id}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">




      {/* Search & Filters */}
      <div className="w-full -mb-6 relative z-50">
        <SuperadminFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search institution, contact, city…"
        >
          {/* Assignee */}
          <div className="w-[150px]">
            <ResponsiveSelect
              className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="">Assigned: All</option>
              {assignees.map((user: any) => (
                <option key={user._id} value={user._id}>
                  {user.name}
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
              dateType={dateType}
              onDateTypeChange={setDateType}
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
                <option key={o.value} value={o.value} data-color={o.color}>
                  {o.label}
                </option>
              ))}
            </ResponsiveSelect>
          </div>
        </SuperadminFilterBar>
      </div>

      {/* Leads List */}
      <div className="w-full">
        <LeadTable 
          leads={filtered} 
          isLoading={isLoading} 
          isError={isError} 
          onManage={handleManage} 
          onAssign={handleAssign} 
          assigningId={assigningId} 
        />
      </div>
    </div>
  );
}
