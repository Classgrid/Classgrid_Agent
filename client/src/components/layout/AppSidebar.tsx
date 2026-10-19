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
 * 4. NEVER ADD A FLOATING AI PANEL ANYWHERE IN THIS CODEBASE.
 * =========================================================================================
 * STRICT SECURITY POLICY & FINAL WARNING:
 * NO AI, NO HUMAN, NO GOD WILL EVER AGAIN ADD SPARKLES, ADD A SIDEBAR, OR ADD ANY KIND OF 
 * FLOATING AI TO THIS CODEBASE. WE ONLY USE FULL SCREEN CHAT GPT-LIKE AI.
 * =========================================================================================
 * 
 * CORRECT DESIGN DRAWING (AS REQUESTED):
 * 
 * +---------------------------------------------------+
 * |  Main Sidebar |          What do you want to know?|
 * |  (NO AGENT    |                                   |
 * |   MENU HERE)  |          [  Input Box  ]          |
 * |               |                                   |
 * |               |                                   |
 * |               |   <-- NO FLOATING SPARKLES HERE   |
 * +---------------------------------------------------+
 * 
 * THIS IS THE ONLY ALLOWED DESIGN. DO NOT DEVIATE.
 * =========================================================================================
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
 * 4. NEVER ADD A FLOATING AI PANEL ANYWHERE IN THIS CODEBASE.
 * =========================================================================================
 * STRICT SECURITY POLICY & FINAL WARNING:
 * NO AI, NO HUMAN, NO GOD WILL EVER AGAIN ADD SPARKLES, ADD A SIDEBAR, OR ADD ANY KIND OF 
 * FLOATING AI TO THIS CODEBASE. WE ONLY USE FULL SCREEN CHAT GPT-LIKE AI.
 * =========================================================================================
 * 
 * CORRECT DESIGN DRAWING (AS REQUESTED):
 * 
 * +---------------------------------------------------+
 * |  Main Sidebar |          What do you want to know?|
 * |  (NO AGENT    |                                   |
 * |   MENU HERE)  |          [  Input Box  ]          |
 * |               |                                   |
 * |               |                                   |
 * |               |   <-- NO FLOATING SPARKLES HERE   |
 * +---------------------------------------------------+
 * 
 * THIS IS THE ONLY ALLOWED DESIGN. DO NOT DEVIATE.
 * =========================================================================================
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

// 🛑 AI AGENT INSTRUCTION: DO NOT EDIT OR REFACTOR THIS FILE.
// The user explicitly requested that AI agents must NEVER modify the sidebar 
// layout, section headers, icons, or visual logic without extreme explicit permission.
//
// PAST AI MISTAKES TO NEVER REPEAT:
// - Disabled the Storage link: An agent accidentally ran a git checkout to a version of the sidebar from a month ago, completely breaking Storage.
// - Added colorful icons: An agent wrongly added bright green active states (text-emerald-500) to icons. DO NOT add colors to icons.
// - Added extra "Classgrid" text: An agent wrongly added the word "Classgrid" above the switcher causing an Icons is not defined crash.
// - Enabled/Disabled section labels: An agent messed around with <SidebarGroupLabel> hiding and showing it. Leave the labels alone.
//
// 🛑 STOP AND ASK BEFORE MAKING ANY CHANGES HERE.

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, HardDrive, FileBarChart, Settings, StickyNote } from "lucide-react";
import { getLoginPathForPath } from "@/features/auth/auth-helpers";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/marketing_ui/sidebar";
import { dashboardConfigs } from "@/config/sidebar";
import type { DashboardRole } from "./DashboardLayout";
import { SidebarFooterUser } from "./SidebarFooterUser";
import { SidebarSwitcher } from "./SidebarSwitcher";
import { SidebarSearch } from "./SidebarSearch";
import { SlidingSidebar } from "./SlidingSidebar";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { AgentNestedMenu } from "@/components/ai/components/AgentSidebar";
import { AiChatSearchPalette } from "@/components/ai/components/AiChatSearchPalette";

interface AppSidebarProps {
  role: DashboardRole;
  user?: {
    name: string;
    email?: string;
    avatar?: string;
    profilePicture?: string;
    photoURL?: string;
  };
}

export function AppSidebar({ role, user }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const config = dashboardConfigs.find(c => c.role === role);

  const agentItem = config?.sections.flatMap(s => s.items).find(i => i.label === "Agent");
  const isAgentPage = agentItem ? location.pathname === agentItem.to : false;

  // Local state to track if we are showing the storage menu pane.
  // Defaults to true if we load directly into a storage route.
  const [showStorageMenu, setShowStorageMenu] = useState(location.pathname.startsWith("/superadmin/storage"));
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"global" | "chat">("global");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteMode("global");
        setPaletteOpen((open) => !open);
      }
    };
    const handleOpen = () => {
      setPaletteMode("chat");
      setPaletteOpen(true);
    };
    
    document.addEventListener("keydown", down);
    window.addEventListener("agent:open-search-palette", handleOpen);
    
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("agent:open-search-palette", handleOpen);
    };
  }, []);

  // Auto-open menus based on route changes
  useEffect(() => {
    setShowStorageMenu(location.pathname.includes("/storage"));
    setShowAgentMenu((location.pathname.includes("/agent") && !location.pathname.includes("/agent-reviews")) || location.pathname.split("/").includes("project"));
  }, [location.pathname, agentItem]);

  // Auto-open Agent menu when first question is sent
  useEffect(() => {
    const handleAutoOpen = () => setShowAgentMenu(true);
    window.addEventListener("agent:auto-open-sidebar", handleAutoOpen);
    return () => window.removeEventListener("agent:auto-open-sidebar", handleAutoOpen);
  }, []);

  const storageNavItems = [
    { label: "Files", to: "/superadmin/storage/files", icon: HardDrive },
    { label: "Analytics", to: "/superadmin/storage/analytics", icon: FileBarChart },
    { label: "S3 Configuration", to: "/superadmin/storage/s3", icon: Settings },
    { label: "Notes", to: "/superadmin/storage/notes", icon: StickyNote },
  ];

  if (!config) {
    return null;
  }

  // Filter sections based on search query
  const filteredSections = config.sections.map(section => {
    const filteredItems = section.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...section, items: filteredItems };
  }).filter(section => section.items.length > 0);

  const { data: chatUnreadData } = useQuery({
    queryKey: ["chat-unread-count"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ threads: any[] }>("/api/threads?filter=Unread");
      return data.threads.reduce((acc, t) => acc + (t.unread || 0), 0);
    },
    refetchInterval: 30000,
  });

  // Inject dynamic badges
  const sectionsWithBadges = filteredSections.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (item.label === "Chat" && chatUnreadData && chatUnreadData > 0) {
        return { ...item, badge: chatUnreadData > 99 ? '99+' : chatUnreadData.toString() };
      }
      return item;
    })
  }));

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="!bg-background !border-r-0">
      <SidebarHeader className={showStorageMenu || showAgentMenu ? "gap-1 p-2 pb-0" : ""}>
        <div className="flex items-center w-full group-data-[collapsible=icon]:justify-center">
          <SidebarSwitcher user={user ?? null} />
        </div>
        <div className={showStorageMenu || showAgentMenu ? "group-data-[collapsible=icon]:hidden mb-1" : "group-data-[collapsible=icon]:hidden"}>
          <SidebarSearch 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            placeholder={showAgentMenu ? "Search chat history" : "Search..."}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-0">
        <SlidingSidebar
          showNested={showStorageMenu || showAgentMenu}
          onBack={() => { setShowStorageMenu(false); setShowAgentMenu(false); }}
          nestedTitle={showStorageMenu ? "Storage" : showAgentMenu ? "Agent" : ""}
          mainMenu={
            <>
              {sectionsWithBadges.map((section, index) => (
                <SidebarGroup key={section.label || index}>
                  {index > 0 && (
                    <div className="mx-4 my-2 h-px bg-border group-data-[collapsible=icon]:mx-2 group-data-[collapsible=icon]:my-1" />
                  )}
                  {/* section.label && (
                    <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                  ) */}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item) => {
                        // Make sure "Storage" highlights actively if we are anywhere in /superadmin/storage
                        const isActive =
                          location.pathname === item.to ||
                          (item.to !== "/" && location.pathname.startsWith(item.to + "/")) ||
                          (item.label === "Storage" && location.pathname.startsWith("/superadmin/storage"));

                        return (
                          <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton
                              id={isActive ? "active-main-menu-item" : undefined}
                              isActive={isActive}
                              tooltip={item.label}
                              className={isActive ? "font-semibold bg-secondary text-secondary-foreground" : ""}
                              onClick={(e) => {
                                if (item.label === "Storage") {
                                  setShowStorageMenu(true);
                                } else if (item.label === "Agent") {
                                  e.preventDefault();
                                  setShowAgentMenu(true);
                                  // Only navigate to home if we are NOT already somewhere in the agent section
                                  if (item.to && !(location.pathname.includes("/agent") && !location.pathname.includes("/agent-reviews"))) {
                                    navigate(item.to);
                                  }
                                }
                              }}
                              render={
                                item.label === "Log out" ? (
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const isChatSubdomain = window.location.hostname.startsWith('chat.');
                                      const loginPath = isChatSubdomain ? '/login' : getLoginPathForPath(location.pathname);
                                      navigate(`/logout?redirectTo=${encodeURIComponent(loginPath)}`);
                                    }}
                                    className="flex items-center gap-3 w-full justify-between cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      {item.icon && <item.icon size={20} />}
                                      <span className="truncate">{item.label}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <Link 
                                    to={item.hasNestedNav ? "#" : (item.to || "#")} 
                                    className="flex items-center gap-3 w-full justify-between"
                                    onClick={(e) => {
                                      if (item.label === "Agent") {
                                        e.preventDefault();
                                        setShowAgentMenu(true);
                                        // Only navigate to home if we are NOT already somewhere in the agent section
                                        if (item.to && !(location.pathname.includes("/agent") && !location.pathname.includes("/agent-reviews"))) {
                                          navigate(item.to);
                                        }
                                      } else if (item.hasNestedNav) {
                                        e.preventDefault();
                                        setShowStorageMenu(true);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      {item.icon && <item.icon size={20} />}
                                      <span className="truncate">{item.label}</span>
                                    </div>
                                    <div className="flex items-center ml-auto gap-2">
                                      {item.isNew && (
                                        <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                          New
                                        </span>
                                      )}
                                      {item.badge && (
                                        <span className="bg-secondary text-secondary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                                          {item.badge}
                                        </span>
                                      )}
                                      {item.hasNestedNav && (
                                        <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
                                      )}
                                    </div>
                                  </Link>
                                )
                              }
                            />
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
              {sectionsWithBadges.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No matching items found.
                </div>
              )}
            </>
          }
          nestedMenu={
            showStorageMenu ? (
              <SidebarGroup className="pt-1">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {storageNavItems.map((item) => {
                      const isActive =
                        location.pathname === item.to ||
                        (item.to !== "/" && location.pathname.startsWith(item.to + "/"));

                      return (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.label}
                            className={isActive ? "font-semibold bg-secondary text-secondary-foreground" : ""}
                            render={
                              <Link to={item.to} className="flex items-center gap-3 w-full justify-between">
                                <div className="flex items-center gap-3">
                                  <item.icon size={20} />
                                  <span className="truncate">{item.label}</span>
                                </div>
                              </Link>
                            }
                          />
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : showAgentMenu ? (
              <AgentNestedMenu searchQuery={searchQuery} />
            ) : null
          }
        />
      </SidebarContent>

      {user && <SidebarFooterUser role={role} user={user} />}
      <AiChatSearchPalette open={paletteOpen} onOpenChange={setPaletteOpen} mode={paletteMode} />
    </Sidebar>
  );
}
