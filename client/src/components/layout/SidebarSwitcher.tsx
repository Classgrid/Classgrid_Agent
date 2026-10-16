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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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
  const currentMode = pathname.endsWith("/project") ? "project" : "agent";
  const queryClient = useQueryClient();
  const [isSwitching, setIsSwitching] = useState(false);

  // 1. Resolve Organization Branding from Backend User Object
  const currentRole = user?.role || "super_admin";
  const orgName = user?.organization?.sidebar_name || user?.organization?.name || (currentRole === "super_admin" ? user?.sidebar_name || user?.name || "Super Admin" : "Classgrid");
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
              <div className={`flex h-9 w-9 items-center justify-center rounded-md shrink-0 ${orgLogo ? 'bg-transparent' : 'bg-emerald-500 text-white shadow-sm overflow-hidden'}`}>
                {orgLogo ? (
                  <img src={orgLogo} alt={orgName} className="w-full h-full object-contain rounded-md" />
                ) : (
                  <Building2 className="size-5 text-white" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-semibold text-foreground whitespace-normal break-words leading-tight">
                  {orgName}
                </span>
                {user?.metadata?.show_role_in_sidebar !== false && (
                  <span className="truncate text-xs text-muted-foreground">
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
              Active Context
            </DropdownMenuLabel>
            <DropdownMenuItem className="gap-3 p-2 rounded-md">
              <div className={`flex aspect-square size-8 items-center justify-center rounded-md overflow-hidden shrink-0 ${orgLogo ? 'bg-transparent' : 'bg-emerald-500 text-white border border-border'}`}>
                {orgLogo ? (
                  <img src={orgLogo} alt={orgName} className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="size-4 text-white" />
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-sm text-foreground">{orgName}</span>
                <span className="text-xs text-muted-foreground">{formatRole(user?.metadata?.job_role || currentRole)} (Active)</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="mx-1 my-1" />
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
                <div className="flex size-5 items-center justify-center shrink-0">
                  {mode.key === currentMode ? (
                    <Check className="size-4 text-blue-500 font-bold" />
                  ) : (
                    <div className="size-4" />
                  )}
                </div>
                <span className={`text-sm ${mode.key === currentMode ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {mode.label}
                </span>
              </DropdownMenuItem>
            ))}

            {currentRole === "super_admin" && (
              <>
                <DropdownMenuSeparator className="mx-1 my-1" />
                <DropdownMenuItem render={
                  <Link to="/superadmin/onboard" className="flex items-center gap-2 p-2 w-full cursor-pointer rounded-md text-sm text-blue-500 hover:text-blue-600 font-medium" />
                } className="p-0">
                    <div className="flex size-5 items-center justify-center rounded-md border border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-800">
                      <Plus className="size-3" />
                    </div>
                    Onboard New Organization
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

