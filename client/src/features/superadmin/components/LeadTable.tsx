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

import { useMemo } from "react";
import { Button } from "@/components/marketing_ui/button";
import { DataTable } from "@/components/marketing_ui/data-table";
import type { Lead } from "../services/superAdminApi";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/marketing_ui/tooltip";
import { formatDate } from "@/utils/dateUtils";

// Demo leads come from the "Book a Demo" form on classgrid.in (Classgrid AI): name, work email, phone, company,
// role, team size, what they want Classgrid AI for, website and a message. Leads saved before the form changed have
// no team size or use case; they still show their name, email, company and status.

export type LeadStatusInfo = { key: string; label: string; dot: string; text: string };

/** The status a lead shows in the list, the filter and its own page (one place, so all three always agree). */
export function getLeadStatus(lead: Pick<Lead, "status" | "meetingStatus" | "assignedTo">): LeadStatusInfo {
  if (lead.status === "converted") return { key: "converted", label: "Converted", dot: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" };
  if (lead.status === "closed") return { key: "closed", label: "Closed", dot: "bg-zinc-400", text: "text-muted-foreground" };
  const ms = lead.meetingStatus || "pending";
  if (ms === "scheduled") return { key: "scheduled", label: "Scheduled", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" };
  if (ms === "rescheduled") return { key: "rescheduled", label: "Rescheduled", dot: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" };
  if (ms === "missed") return { key: "missed", label: "Missed", dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" };
  if (ms === "completed") return { key: "completed", label: "Completed", dot: "bg-foreground", text: "text-foreground" };
  if (ms === "cancelled") return { key: "cancelled", label: "Cancelled", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" };
  if (ms === "closed") return { key: "closed", label: "Closed", dot: "bg-zinc-400", text: "text-muted-foreground" };
  // Not booked yet: "Contacted" once someone on the team has taken it, "Pending" before that
  return lead.assignedTo
    ? { key: "contacted", label: "Contacted", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" }
    : { key: "pending", label: "Pending", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
}

/** "Founder · 11-50 people": the role and team size from the form, whichever are there */
export function leadCompanyLine(lead: Pick<Lead, "role" | "teamSize">) {
  return [lead.role, lead.teamSize ? `${lead.teamSize} people` : ""].filter(Boolean).join(" · ");
}

/** A team member's photo, whichever field their account keeps it in */
export function personPhoto(person: any): string | undefined {
  return person?.avatarUrl || person?.profilePicture || person?.picture || person?.photoUrl || undefined;
}

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  isError: boolean;
  onManage: (id: string) => void;
  onAssign: (id: string) => void;
  assigningId: string | null;
}

export function LeadTable({ leads, isLoading, isError, onManage, onAssign, assigningId }: LeadTableProps) {
  const columns = useMemo(() => [
    {
      key: "requester",
      header: "Requester",
      width: "w-[26%]",
      render: (_val: unknown, row: Lead) => (
        <div className="flex items-center gap-3 w-full min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-muted text-foreground font-semibold text-xs">
            {row.adminName?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="font-semibold text-foreground text-sm truncate">{row.adminName}</span>
            <a
              href={`mailto:${row.adminEmail}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate transition-colors"
            >
              {row.adminEmail?.toLowerCase()}
            </a>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      width: "w-[22%]",
      render: (_val: unknown, row: Lead) => {
        const line = leadCompanyLine(row);
        return (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm text-foreground truncate">{row.institutionName || "—"}</span>
            {line && <span className="text-xs text-muted-foreground truncate">{line}</span>}
          </div>
        );
      },
    },
    {
      key: "useCase",
      header: "Wants it for",
      width: "w-[18%]",
      render: (_val: unknown, row: Lead) => (
        <span className="block text-sm text-muted-foreground truncate" title={row.useCase || undefined}>{row.useCase || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[12%]",
      render: (_val: unknown, row: Lead) => {
        const st = getLeadStatus(row);
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
            <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
          </div>
        );
      },
    },
    {
      key: "assigned",
      header: "Assigned",
      width: "w-[13%]",
      render: (_val: unknown, row: Lead) => {
        const assigned = row.assignedTo && typeof row.assignedTo === "object" && row.assignedTo.name ? row.assignedTo : null;
        const photo = personPhoto(assigned);
        return (
          <div className="flex items-center min-w-0">
            {assigned ? (
              <TooltipProvider delay={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-border bg-card text-xs font-medium text-foreground max-w-full cursor-default">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-muted">
                        {photo ? (
                          <img src={photo} alt={assigned.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-foreground font-semibold text-[9px]">{assigned.name?.charAt(0).toUpperCase() || "?"}</span>
                        )}
                      </div>
                      <span className="truncate">{assigned.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{row.assignedAt ? `Assigned on ${formatDate(row.assignedAt, "dd MMM yyyy, hh:mm a")}` : "Assigned"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-2.5 text-[11px] font-semibold"
                onClick={(e) => { e.stopPropagation(); onAssign(row._id); }}
                disabled={assigningId === row._id}
              >
                {assigningId === row._id ? "Assigning" : "Assign me"}
              </Button>
            )}
          </div>
        );
      },
    },
    {
      key: "action",
      header: "",
      width: "w-[9%]",
      render: (_val: unknown, row: Lead) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onManage(row._id); }}
        >
          Open
        </Button>
      ),
    },
  ], [onManage, onAssign, assigningId]);

  if (isError) {
    return (
      <div className="p-8 text-center text-sm text-red-500 border border-border rounded-lg bg-card">
        Could not load the demo leads.
      </div>
    );
  }

  const hasRows = !isLoading && leads.length > 0;
  // Wide table: on a phone it scrolls inside its own box, so the page never scrolls sideways
  return (
    <div className={hasRows ? "overflow-x-auto rounded-md border border-border" : ""}>
      <DataTable
        className={hasRows ? "min-w-[860px] rounded-none border-0" : ""}
        columns={columns}
        rows={leads}
        isLoading={isLoading}
        onRowClick={(row: Lead) => onManage(row._id)}
        emptyMessage="No demo leads match these filters."
      />
    </div>
  );
}
