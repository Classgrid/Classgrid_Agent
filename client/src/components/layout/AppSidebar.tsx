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

import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight, HardDrive, FileBarChart, Search, Settings, StickyNote } from "lucide-react";
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
import { SettingsNav } from "@/features/shared/settings/SettingsNav";
import { isSettingsPath } from "@/features/shared/settings/settingsSections";
import { AiChatSearchPalette } from "@/components/ai/components/AiChatSearchPalette";
import { StudioSearchPalette } from "@/features/superadmin/components/StudioSearchPalette";
import { FileBadge } from "@/features/superadmin/components/StudioFilesView";
import { ChatMessageToasts } from "@/components/layout/ChatMessageToasts";
import { isChatHost } from "@/lib/chatHost";

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

// The desktop app has no Agent mode: its main-menu item is "Studio" (config/sidebar.ts), which opens the chat list
// the same way "Agent" does on the website
const DESKTOP_APP = import.meta.env.VITE_DESKTOP === "1";
// Desktop app's forward button: the furthest place in the history that can be gone forward to
let lastPlaceIdx = 0;
const isAgentItem = (label: string) => label === "Agent" || (DESKTOP_APP && label === "Studio");

export function AppSidebar({ role, user }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  // Desktop app (not the super admin's long menu, not Project mode): every page has Studio's sidebar, with Grids,
  // Requests and Audit Logs under Library, and no main menu
  const studioEverywhere = DESKTOP_APP && import.meta.env.VITE_EDITOR !== "1" && role !== "super_admin" && !location.pathname.split("/").includes("project");
  const isStudio = location.pathname.split("/").includes("studio") || studioEverywhere;
  // Settings (website and desktop app): its own sidebar, with its sections and a search box (SettingsNav)
  const onSettings = isSettingsPath(location.pathname) && import.meta.env.VITE_EDITOR !== "1";
  const [searchQuery, setSearchQuery] = useState("");
  // Desktop app's back and forward buttons: whether there is a place to go back or forward to (the browser's
  // Navigation API; both stay on where it is missing)
  // (from the router's own place number in the history: going somewhere new drops the places ahead)
  const navType = useNavigationType();
  // Places set with history.pushState straight (a chat opened from the chat menu, for one) and the browser's own
  // back/forward don't go through the router: lib/desktopHistory.ts says "cg:history" on those, and the arrows
  // follow (a straight push is a new place, so the places ahead are dropped)
  const [, historyTick] = useState(0);
  useEffect(() => {
    if (!DESKTOP_APP) return;
    const onHistory = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.type === "push" && typeof d.idx === "number") lastPlaceIdx = d.idx;
      historyTick((n) => n + 1);
    };
    window.addEventListener("cg:history", onHistory);
    window.addEventListener("popstate", onHistory);
    return () => { window.removeEventListener("cg:history", onHistory); window.removeEventListener("popstate", onHistory); };
  }, []);
  const placeIdx = typeof window.history.state?.idx === "number" ? window.history.state.idx : 0;
  if (navType === "PUSH" || placeIdx > lastPlaceIdx) lastPlaceIdx = placeIdx;
  const canGo = { back: placeIdx > 0, forward: placeIdx < lastPlaceIdx };
  const config = dashboardConfigs.find(c => c.role === role);

  const agentItem = config?.sections.flatMap(s => s.items).find(i => i.label === "Agent");
  const isAgentPage = agentItem ? location.pathname === agentItem.to : false;

  // Local state to track if we are showing the storage menu pane.
  // Defaults to true if we load directly into a storage route.
  const [showStorageMenu, setShowStorageMenu] = useState(location.pathname.startsWith("/superadmin/storage"));
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"global" | "chat">("global");

  // Ctrl+K (⌘K on a Mac) opens the same search as the sidebar's search box: the chat history in Agent, Project and
  // Studio mode
  const DESKTOP = import.meta.env.VITE_DESKTOP === "1";
  const chatSearchRef = useRef(false);
  chatSearchRef.current = showAgentMenu;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // (Classgrid Code: Ctrl+K is the editor's own shortcut for this search, anywhere in its window: classgrid-editor)
      if (import.meta.env.VITE_EDITOR === "1") return;
      // (the website keeps its own Ctrl+K: the page search, as before)
      const desktopKey = e.key.toLowerCase() === "k" && !e.shiftKey && !e.altKey;
      if ((DESKTOP ? desktopKey : e.key === "k") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteMode(DESKTOP && chatSearchRef.current ? "chat" : "global");
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
    // (desktop app: no Agent mode, so an /agent page such as Grids shows the main menu, not a chat list)
    setShowAgentMenu((!DESKTOP_APP && location.pathname.includes("/agent") && !location.pathname.includes("/agent-reviews")) || location.pathname.split("/").includes("project") || location.pathname.split("/").includes("studio") || studioEverywhere);
  }, [location.pathname, agentItem, studioEverywhere]);

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

  // Filter sections based on search query
  const filteredSections = (config?.sections ?? []).map(section => {
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

  // Only on chat.classgrid.in and superadmin.classgrid.in (the other dashboards are the shut-down ERP)
  // (desktop app: also in Studio and Project, where its chats now are)
  const gridsDashboard = /^(chat|superadmin)\./.test(window.location.hostname) || /^\/(agent|superadmin)(\/|$)/.test(window.location.pathname) || (DESKTOP_APP && /^\/c\//.test(window.location.pathname));
  // The Grids page is named "Grids", "Grid" or "Chat" in different dashboards; its address always ends in /chat
  const isGridsItem = (item: { label: string; to?: string }) => /\/chat$/.test(item.to || "") || ["Grids", "Grid", "Chat"].includes(item.label);

  // Inject dynamic badges
  const sectionsWithBadges = filteredSections.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (gridsDashboard && isGridsItem(item) && chatUnreadData && chatUnreadData > 0) {
        return { ...item, badge: chatUnreadData > 99 ? '99+' : chatUnreadData.toString() };
      }
      return item;
    })
  }));

  // Where Grids lives in this dashboard (for the new-message popup)
  const gridsItem = gridsDashboard ? (config?.sections ?? []).flatMap((s) => s.items).find(isGridsItem) : undefined;
  // Desktop app, Studio (not the super admin's long menu): no back button; the other pages (Grids, Requests, Audit Logs)
  // are listed under Library instead
  const studioPages = studioEverywhere
    ? sectionsWithBadges.flatMap((s) => s.items).filter((item) => !isAgentItem(item.label) && item.label !== "Log out" && item.to)
    : null;
  // (the popup is in the sidebar, so it works on every page; the Grids page's own address is where it opens a chat)
  const gridsPath = gridsItem?.to || (location.pathname.startsWith("/superadmin") ? "/superadmin/chat" : "/chat");

  // No sidebar for this role (only after every hook above, so the hook order never changes between renders)
  if (!config) {
    return null;
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="!bg-background !border-r-0">
      {gridsDashboard && <ChatMessageToasts chatPath={gridsPath} />}
      <SidebarHeader className={showStorageMenu || showAgentMenu ? "gap-1 p-2 pb-0" : ""}>
        <div className="relative flex items-center w-full group-data-[collapsible=icon]:justify-center">
          <SidebarSwitcher user={user ?? null} />
          {isStudio && (
            <div className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-0.5 group-data-[collapsible=icon]:hidden">
              {/* Desktop app: back and forward through the places opened (chats, Grids, Schedule...), like a browser */}
              {DESKTOP_APP && (<>
                <button type="button" onClick={() => canGo.back && navigate(-1)} aria-disabled={!canGo.back} className={`relative z-10 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent ${canGo.back ? "" : "opacity-40"}`} title="Back" aria-label="Back">
                  <ArrowLeft className="size-4" />
                </button>
                <button type="button" onClick={() => canGo.forward && navigate(1)} aria-disabled={!canGo.forward} className={`relative z-10 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent ${canGo.forward ? "" : "opacity-40"}`} title="Forward" aria-label="Forward">
                  <ArrowRight className="size-4" />
                </button>
              </>)}
              <button type="button" onClick={() => window.dispatchEvent(new Event("agent:open-search-palette"))} className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent" title="Search chats" aria-label="Search chats">
                <Search className="size-4" />
              </button>
            </div>
          )}
        </div>
        <div className={isStudio || onSettings ? "hidden" : showStorageMenu || showAgentMenu ? "group-data-[collapsible=icon]:hidden mb-1" : "group-data-[collapsible=icon]:hidden"}>
          <SidebarSearch 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            placeholder={showAgentMenu ? "Search chat history" : "Search..."}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-0">
        <SlidingSidebar
          showNested={showStorageMenu || showAgentMenu || onSettings}
          onBack={() => { setShowStorageMenu(false); setShowAgentMenu(false); }}
          // (desktop app: Studio keeps its back button, the way to Grids, Requests and Audit Logs now that Agent is gone)
          hideBack={location.pathname.split("/").includes("project") || (!DESKTOP_APP && location.pathname.split("/").includes("studio")) || !!studioPages || onSettings}
          nestedTitle={showStorageMenu ? "Storage" : showAgentMenu ? (DESKTOP_APP ? "Studio" : "Agent") : ""}
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
                                } else if (isAgentItem(item.label)) {
                                  e.preventDefault();
                                  // Desktop app: Studio always opens Studio (Grids lives at /agent/chat, so the rule below kept
                                  // the Grids page with Agent's chat list beside it); its list shows once Studio opens
                                  if (DESKTOP_APP) { if (item.to) navigate(item.to); return; }
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
                                      const isChatSubdomain = isChatHost();
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
                                      if (isAgentItem(item.label)) {
                                        e.preventDefault();
                                        if (DESKTOP_APP) { if (item.to) navigate(item.to); return; } // (as above)
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
            onSettings ? (
              <SettingsNav />
            ) : showStorageMenu ? (
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
              <AgentNestedMenu searchQuery={searchQuery} pages={studioPages || undefined} />
            ) : null
          }
        />
      </SidebarContent>

      {user && <SidebarFooterUser role={role} user={user} />}
      {/* Studio: the same search as the Files tab's "+", starting on Conversations (by project, with groups and pins) */}
      {/* (Classgrid Code: its chats sidebar is narrow, so this search opens in the Agent panel, over the whole window) */}
      {/* (desktop app, no Agent mode: Studio's search everywhere but Project mode, so Agent chats never show) */}
      {import.meta.env.VITE_EDITOR === "1" ? null : location.pathname.split("/").includes("studio") || (DESKTOP_APP && !location.pathname.split("/").includes("project"))
        ? <StudioSearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} initialKind="conversations" fileIcon={(name) => <FileBadge name={name} />} />
        : <AiChatSearchPalette open={paletteOpen} onOpenChange={setPaletteOpen} mode={paletteMode} />}
    </Sidebar>
  );
}
