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
import { Lead } from "../../services/superAdminApi";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/marketing_ui/tooltip";
import { formatDate } from "@/utils/dateUtils";
import { formatOrgType } from "@/utils/orgHelpers";

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
      width: "w-[350px]",
      render: (_val: unknown, row: Lead) => (
        <div className="flex items-center gap-3 w-full min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs bg-emerald-500">
              {row.adminName?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="font-semibold text-foreground text-sm truncate">{row.adminName}</span>
            <a href={`mailto:${row.adminEmail}`} className="text-xs text-muted-foreground hover:text-primary hover:underline truncate transition-colors">
              {row.adminEmail?.toLowerCase()}
            </a>
          </div>
        </div>
      ),
    },
    {
      key: "organization",
      header: "Organization",
      render: (_val: unknown, row: Lead) => (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-foreground truncate">{row.institutionName}</span>
          <span className="text-[10px] text-muted-foreground truncate">{formatOrgType(row.orgType)}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[110px]",
      render: (_val: unknown, row: Lead) => {
        let text = "Pending";
        let color = "bg-yellow-500";
        let textColor = "text-yellow-500";
        
        if (row.status === "converted") {
          text = "Provisioned";
          color = "bg-emerald-500"; textColor = "text-emerald-500";
        } else if (row.status === "closed") {
          text = "Closed";
          color = "bg-gray-500"; textColor = "text-gray-500";
        } else {
          // If not converted or closed, rely strictly on Meeting Status
          const ms = row.meetingStatus || "pending";
          if (ms === "pending") {
            if (row.assignedTo) {
              text = "Contacted";
              color = "bg-blue-500"; textColor = "text-blue-500";
            } else {
              text = "Pending";
              color = "bg-yellow-500"; textColor = "text-yellow-500";
            }
          } else if (ms === "scheduled") {
            text = "Scheduled";
            color = "bg-blue-500"; textColor = "text-blue-500";
          } else if (ms === "rescheduled") {
            text = "Rescheduled";
            color = "bg-purple-500"; textColor = "text-purple-500";
          } else if (ms === "missed") {
            text = "Missed";
            color = "bg-orange-500"; textColor = "text-orange-500";
          } else if (ms === "completed") {
            text = "Completed";
            color = "bg-emerald-500"; textColor = "text-emerald-500";
          } else if (ms === "cancelled") {
            text = "Cancelled";
            color = "bg-red-500"; textColor = "text-red-500";
          }
        }        return (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            <span className={`text-xs font-medium ${textColor}`}>
              {text}
            </span>
          </div>
        );
      },
    },
    {
      key: "assigned",
      header: "Assigned",
      width: "w-[140px]",
      render: (_val: unknown, row: Lead) => {
        const assigned = row.assignedTo && typeof row.assignedTo === 'object' && row.assignedTo.name ? row.assignedTo : null;
        return (
        <div className="flex items-center">
          {assigned ? (
            <TooltipProvider>
              <Tooltip delay={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-border bg-card text-xs font-medium text-foreground w-fit cursor-default hover:border-foreground/20 transition-colors">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-border bg-emerald-500">
                      {(assigned as any).avatarUrl || (assigned as any).profilePicture || (assigned as any).picture ? (
                        <img src={(assigned as any).avatarUrl || (assigned as any).profilePicture || (assigned as any).picture} alt={assigned.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-[9px]">{assigned.name?.charAt(0).toUpperCase() || 'U'}</span>
                      )}
                    </div>
                    <span className="truncate max-w-[80px]">{assigned.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{row.assignedAt ? `Assigned on ${formatDate(row.assignedAt, "dd MMM yyyy, hh:mm a")}` : "Assigned"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="ghost"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-colors disabled:opacity-50"
              onClick={(e) => { e.stopPropagation(); onAssign(row._id); }}
              disabled={assigningId === row._id}
            >
              {assigningId === row._id ? "Assigning..." : "Assign me"}
            </Button>
          )}
        </div>
        );
      },
    },
    {
      key: "action",
      header: "",
      width: "w-[90px]",
      render: (_val: unknown, row: Lead) => (
        <Button 
          variant="primary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onManage(row._id); }} 
        >
          Read
        </Button>
      ),
    },
  ], [onManage, onAssign, assigningId]);

  if (isError) {
    return (
      <div className="p-8 text-center text-sm text-red-500 border border-border rounded-lg bg-card">
        Failed to load leads.
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={leads}
      isLoading={isLoading}
      emptyMessage="No leads found."
    />
  );
}
