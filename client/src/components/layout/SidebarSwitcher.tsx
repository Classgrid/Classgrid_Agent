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

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiClient as api } from "@/lib/apiClient";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronsUpDown,
  Check,
  Building2,
  Plus,
  Code2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/marketing_ui/sidebar";

export function SidebarSwitcher({ user }: { user: { role?: string; name?: string; sidebar_name?: string; additional_roles?: string[]; organization?: { sidebar_name?: string; name?: string; logo_url?: string; sidebar_logo_url?: string }, metadata?: Record<string, any> } | null }) {
  const { isMobile } = useSidebar();
  // Modes: Agent (the chat) and Project. Super admins stay under /superadmin, everyone else under /c.
  const { pathname } = useLocation();
  const isSuperAdminArea = pathname.startsWith("/superadmin");
  const agentPath = isSuperAdminArea ? "/superadmin/agent" : "/c/agent";
  const projectPath = isSuperAdminArea ? "/superadmin/project" : "/c/project";
  const currentMode = pathname.split("/").includes("project") ? "project" : "agent";
  const queryClient = useQueryClient();
  const [isSwitching, setIsSwitching] = useState(false);

  // 1. Resolve Organization Branding from Backend User Object
  const currentRole = user?.role || "super_admin";
  const orgName = user?.organization?.sidebar_name || user?.organization?.name || (currentRole === "super_admin" ? (user?.sidebar_name || user?.name || "Super Admin").replace(/\s*Platform\s*$/i, "") : "Classgrid");
  const orgLogo = user?.organization?.sidebar_logo_url || user?.organization?.logo_url || (currentRole === "super_admin" ? (user as any)?.platformLogo : undefined);

  // 2. Resolve Roles
  // (currentRole already defined above)
  
  // Use additional_roles from the backend user object
  const additionalRoles = user?.additional_roles || [];

  // Deduplicate roles to build the switcher list
  const allRoles = Array.from(new Set([currentRole, ...additionalRoles]));

  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleSwitchRole = async (targetRole: string) => {
    if (targetRole === currentRole || isSwitching) return;
    
    setIsSwitching(true);
    try {
      await api.post("/org/switch-role", { targetRole });
      toast.success(`Switched to ${formatRole(targetRole)} dashboard`);
      queryClient.invalidateQueries(); // invalidate all to re-fetch the user context
      window.location.reload(); // Hard reload to fully reset app state
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to switch role");
      setIsSwitching(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          }>
              {/* Logo hidden for now (owner's choice); remove "hidden" to show it again */}
              <div className={`hidden h-9 w-9 items-center justify-center rounded-md shrink-0 ${orgLogo ? 'bg-transparent' : 'bg-emerald-500 text-white shadow-sm overflow-hidden'}`}>
                {orgLogo ? (
                  <img src={orgLogo} alt={orgName} className="w-full h-full object-contain rounded-md" />
                ) : (
                  <Building2 className="size-5 text-white" />
                )}
              </div>
              {/* With the logo hidden: bigger name, lined up with the search box and menu below */}
              <div className="grid flex-1 gap-0.5 pl-2 text-left text-sm leading-tight">
                <span className="text-2xl font-semibold tracking-tight text-foreground whitespace-normal break-words leading-none">
                  {orgName}
                </span>
                {user?.metadata?.show_role_in_sidebar !== false && (
                  <span className="truncate text-[13px] text-muted-foreground">
                    {formatRole(user?.metadata?.job_role || currentRole)}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl shadow-xl border-border bg-popover text-popover-foreground p-1"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-wider py-2">
              Switch Mode
            </DropdownMenuLabel>
            {[
              { key: "agent", label: "Agent", to: agentPath },
              { key: "project", label: "Project", to: projectPath },
            ].map((mode) => (
              <DropdownMenuItem
                key={mode.key}
                render={<Link to={mode.to} className="flex items-center gap-3 p-2 w-full cursor-pointer rounded-md" />}
                className="p-0"
              >
                <ModeIcon kind={mode.key as "agent" | "project"} />
                <span className={`flex-1 text-sm ${mode.key === currentMode ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {mode.label}
                </span>
                {mode.key === currentMode && <Check className="size-4 shrink-0 text-foreground" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              render={<a href="https://www.classgrid.in/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 w-full cursor-pointer rounded-md" />}
              className="p-0"
            >
              <ModeIcon kind="docs" />
              <span className="flex-1 text-sm text-muted-foreground">Docs</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Icons for the mode switcher: Agent (Classgrid green, a chat bubble with a spark), Project (Classgrid orange,
// code brackets) and Docs (neutral, a page)
function ModeIcon({ kind }: { kind: "agent" | "project" | "docs" }) {
  if (kind === "agent") {
    return (
      <svg viewBox="0 0 24 24" className="size-7 shrink-0" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#34d399" />
        <path d="M6.5 8.2c0-1.2 1-2.2 2.2-2.2h6.6c1.2 0 2.2 1 2.2 2.2v4.6c0 1.2-1 2.2-2.2 2.2h-4.2l-3 2.4v-2.4h-.4c-.7 0-1.2-.5-1.2-1.2V8.2z" fill="#022c22" />
        <path d="M12 7.9l.62 1.48 1.48.62-1.48.62L12 12.1l-.62-1.48L9.9 10l1.48-.62L12 7.9z" fill="#34d399" />
      </svg>
    );
  }
  if (kind === "project") {
    return (
      <svg viewBox="0 0 24 24" className="size-7 shrink-0" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#f97316" />
        <path d="M9.4 8.3L5.9 12l3.5 3.7M14.6 8.3l3.5 3.7-3.5 3.7M13.1 7l-2.2 10" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-7 shrink-0" aria-hidden="true">
      <rect width="24" height="24" rx="6" className="fill-muted" />
      <path d="M8.5 6h5l3 3v8.2c0 .7-.5 1.3-1.2 1.3H8.5c-.7 0-1.2-.6-1.2-1.3V7.3C7.3 6.6 7.8 6 8.5 6z" fill="none" className="stroke-foreground" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13.3 6v3.2h3.2M9.8 12.3h4.4M9.8 15h3" fill="none" className="stroke-foreground" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
