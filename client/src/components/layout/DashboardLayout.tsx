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
 * 4. NEVER ADD A FLOATING AI PANEL OR SIDE AI PANEL ANYWHERE IN THIS CODEBASE.
 * 5. THE USER EXPLICITLY BANNED FLOATING/SIDE AI. WE ONLY USE FULL SCREEN AI.
 * 6. DO NOT ADD <GlobalAiPanel /> OR ANY SIMILAR COMPONENT.
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

import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/marketing_ui/sidebar";
import { TooltipProvider } from "@/components/marketing_ui/tooltip";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbLink } from "@/components/marketing_ui/breadcrumb";
import { Separator } from "@/components/marketing_ui/separator";
import { Link } from "react-router-dom";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { ChevronDown, LayoutDashboard } from "lucide-react";

import { AppSidebar } from "./AppSidebar";
import { resolveDashboardPageTitle } from "@/config/sidebar";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { getAccessibleDashboards } from "@/lib/dashboardRoleMap";
import { getSocket } from "@/lib/socketClient";
import { useQueryClient } from "@tanstack/react-query";

import type { DashboardRole } from "@/layouts/types";

export type { DashboardRole } from "@/layouts/types";

type DashboardRoleInput = DashboardRole | string;

const ROLE_ALIASES: Record<string, DashboardRole> = {
  admission: "admission_dept",
  admissions: "admission_dept",
  ADMISSION_MENU: "admission_dept",
  admission_head: "admission_dept",
  admission_verifier: "admission_dept",
  admission_counselor: "admission_dept",
  admission_clerk: "admission_dept",
  fees: "fees_dept",
  FEES_MENU: "fees_dept",
  fee_manager: "fees_dept",
  exams: "exam_dept",
  exam: "exam_dept",
  EXAMS_MENU: "exam_dept",
  exam_controller: "exam_dept",
  library: "library_dept",
  LIBRARY_MENU: "library_dept",
  library_manager: "library_dept",
  attendance: "attendance_dept",
  ATTENDANCE_MENU: "attendance_dept",
  hr: "hr_dept",
  HR_MENU: "hr_dept",
  hostel: "hostel_dept",
  transport: "hostel_dept",
  HOSTEL_MENU: "hostel_dept",
  transport_manager: "hostel_dept",
  teacher: "faculty",
  hod: "faculty",
  principal: "faculty",
  vice_principal: "faculty",
};

function roleFromPath(pathname: string): DashboardRole | null {
  if (pathname.startsWith("/superadmin")) return "super_admin";
  if (pathname.startsWith("/org")) return "org_admin";
  if (pathname.startsWith("/dept/admissions")) return "admission_dept";
  if (pathname.startsWith("/dept/fees")) return "fees_dept";
  if (pathname.startsWith("/dept/exams")) return "exam_dept";
  if (pathname.startsWith("/dept/library")) return "library_dept";
  if (pathname.startsWith("/dept/attendance")) return "attendance_dept";
  if (pathname.startsWith("/dept/hr")) return "hr_dept";
  if (pathname.startsWith("/dept/hostel") || pathname.startsWith("/dept/transport")) return "hostel_dept";
  if (pathname.startsWith("/faculty")) return "faculty";
  if (pathname.startsWith("/student")) return "student";
  return null;
}

function normalizeDashboardRole(role: DashboardRoleInput, pathname: string): DashboardRole {
  return ROLE_ALIASES[role] || roleFromPath(pathname) || (role as DashboardRole);
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: DashboardRoleInput;
  user?: {
    name: string;
    email?: string;
    avatar?: string;
    profilePicture?: string;
    photoURL?: string;
  };
}

// Dashboard Switcher — shows in header when user has access to multiple dashboards
function DashboardSwitcher({ mainRole, additionalRoles }: { mainRole: string; additionalRoles: string[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const dashboards = getAccessibleDashboards(mainRole, additionalRoles);

  // Only render if user has 2+ distinct dashboards
  if (dashboards.length < 2) return null;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 border border-border rounded-lg px-3 py-1.5 transition-colors"
      >
        <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
        Switch Dashboard
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[220px] bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {dashboards.map((dash) => (
            <button
              key={dash.key}
              onClick={() => {
                navigate(dash.path);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-muted transition-colors"
            >
              <span className="text-base">{dash.icon}</span>
              <span className="font-medium text-foreground">{dash.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardLayout({ children, role, user }: DashboardLayoutProps) {
  const location = useLocation();
  const isFullBleed = location.pathname.includes("/chat") || location.pathname.includes("/website") || location.pathname.includes("/storage/files") || location.pathname.includes("/dashboard") || (location.pathname.includes("/agent") && !location.pathname.includes("agent-reviews")) || location.pathname.endsWith("/project");
  const isNoPadding = location.pathname.includes("/storage/notes");
  const { items, showBreadcrumbs } = useBreadcrumbStore();
  const dashboardRole = normalizeDashboardRole(role, location.pathname);
  const { data: currentUser } = useCurrentUser();
  const sidebarUser = user ?? currentUser ?? undefined;
  
  const mainRole: string = currentUser?.role ?? "";
  const additionalRoles: string[] = currentUser?.additional_roles ?? [];

  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleProfileUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["global-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    };

    socket.on("user_profile_updated", handleProfileUpdated);

    return () => {
      socket.off("user_profile_updated", handleProfileUpdated);
    };
  }, [queryClient]);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar role={dashboardRole} user={sidebarUser} />
        <SidebarInset className="bg-background m-0 p-0 flex flex-col h-screen overflow-hidden">
          <div className={`flex-1 min-h-0 flex flex-col overflow-hidden relative ${(isFullBleed || isNoPadding) ? "bg-background border-l border-border" : "bg-card border-l border-border"}`}>
            {!isFullBleed && showBreadcrumbs && (
              <header className="flex h-14 shrink-0 items-center justify-center border-b border-border/50 px-4 bg-background/80 backdrop-blur-md sticky top-0 z-50 relative">
                {/* Left: trigger */}
                <div className="absolute left-4 flex items-center gap-2">
                  <SidebarTrigger />
                  <Separator orientation="vertical" className="h-4" />
                </div>

                {/* Center: breadcrumb */}
                <Breadcrumb>
                  <BreadcrumbList>
                    {items.length > 0 ? (
                      items.map((item, index) => (
                        <React.Fragment key={index}>
                          <BreadcrumbItem>
                            {item.onClick ? (
                              <BreadcrumbLink asChild>
                                <div role="button" tabIndex={0} onClick={item.onClick} className="hover:text-foreground cursor-pointer bg-transparent border-none p-0 inline-flex">
                                  {item.label}
                                </div>
                              </BreadcrumbLink>
                            ) : item.href ? (
                              <BreadcrumbLink asChild>
                                <Link to={item.href}>{item.label}</Link>
                              </BreadcrumbLink>
                            ) : (
                              <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            )}
                          </BreadcrumbItem>
                          {index < items.length - 1 && <BreadcrumbSeparator />}
                        </React.Fragment>
                      ))
                    ) : (
                      <BreadcrumbItem>
                        <BreadcrumbPage>{resolveDashboardPageTitle(location.pathname)}</BreadcrumbPage>
                      </BreadcrumbItem>
                    )}
                  </BreadcrumbList>
                </Breadcrumb>

                <div className="absolute right-4 flex items-center">
                  <DashboardSwitcher mainRole={mainRole} additionalRoles={additionalRoles} />
                </div>
              </header>
            )}
            <main className={`flex-1 min-h-0 overflow-x-hidden bg-background relative ${isFullBleed ? "overflow-y-hidden p-0 m-0 border-none flex flex-col" : isNoPadding ? "p-0 m-0 border-none flex flex-col" : "overflow-y-auto p-4 lg:p-6"}`}>
              {isFullBleed && !location.pathname.includes("/agent") && (
                <div className="absolute top-4 left-4 z-50">
                  <SidebarTrigger />
                </div>
              )}
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
