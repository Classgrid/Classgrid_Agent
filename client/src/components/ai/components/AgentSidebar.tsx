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

import React from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Plus, Search, Pin, PinOff, MoreHorizontal, Pencil, Trash2, Share, Copy, Mail, Check, Link2, FileText, ExternalLink, X, Loader2, SquarePen, Calendar, Library, FolderInput, FolderPlus, Folder, Star, ChevronDown, ListFilter, Laptop, Cloud } from "lucide-react";
import { format } from "date-fns";
import { NikhilDateCalendar } from "@/components/marketing_ui/nikhil_date_calendar";
import { useNavigate, useLocation } from "react-router-dom";

import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/marketing_ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/marketing_ui/popover";
import { Input } from "@/components/marketing_ui/input";
import { Button } from "@/components/marketing_ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/marketing_ui/accordion";

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/marketing_ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/marketing_ui/dialog";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { Spinner } from "@/components/marketing_ui/spinner";
import { toast } from "sonner";
import { fetchWithRescue } from "@/lib/rescue";
import { OFFLINE_CHAT_NOTE, isUnreachable, keepsChatCopies, listChatCopies, listOtherChatCopies, removeChatCopy, type OtherAccountChats } from "@/lib/desktopChats";
import { getSocket } from "@/lib/socketClient";
import { cn } from "@/lib/utils";
import { GroupDialog, groupIcon, groupsApi, openProjectId, useChatGroups, type ChatGroup } from "./chat-groups/chatGroups";
import { NewProjectDialog, openStudioProject, openLocalFolder } from "@/features/superadmin/components/StudioProjectPicker";
import { onDesktop, placeActions, savedProject, thisComputerCopy, type LocalCopy } from "@/features/superadmin/utils/projectCopies";

type SidebarProject = { id: string; name: string; logo?: string | null; location?: "cloud" | "local"; localPath?: string | null; localCopies?: LocalCopy[] };
// Desktop app: a project with a folder on this computer (a folder project, or a cloud project downloaded here)
const onThisPc = (p: Parameters<typeof thisComputerCopy>[0]) => !!p && (p.location === "local" || !!thisComputerCopy(p));

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  pinned?: boolean;
  ended?: boolean;
  project_id?: string; // Studio: the project this chat belongs to
  updated_at?: string; // Studio: when the chat last had a message
}

// Studio's list options (the Display Options menu next to "Projects"), kept on this device
type StudioListOpts = {
  groupBy: "project" | "none"; sortChats: "updated" | "created" | "title"; sortProjects: "custom" | "recent" | "name";
  unreadOnly: boolean; hideEmpty: boolean; openOnly: boolean; showTime: boolean; showLogos: boolean; compact: boolean;
  autoPin: boolean; archivedOnly: boolean;
};
// Classgrid Code's AI panel (/editor/project/...): its chats sidebar is this same list, working like Studio's
const IN_EDITOR = import.meta.env.VITE_EDITOR === "1";
const STUDIO_OPTS_KEY = "cg_studio_list_opts";
const STUDIO_OPTS: StudioListOpts = {
  groupBy: "project", sortChats: "updated", sortProjects: "recent", unreadOnly: false, hideEmpty: false, openOnly: false,
  showTime: true, showLogos: true, compact: false, autoPin: false, archivedOnly: false,
};
function readStudioOpts(): StudioListOpts {
  // (Classgrid Code has no archive view)
  try { return { ...STUDIO_OPTS, ...JSON.parse(localStorage.getItem(STUDIO_OPTS_KEY) || "{}"), ...(IN_EDITOR ? { archivedOnly: false } : {}) }; } catch { return STUDIO_OPTS; }
}

const ChatBubbleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path fill="none" d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092a10 10 0 1 0-4.777-4.719" />
  </svg>
);

export function AgentNestedMenu({ searchQuery = "" }: { searchQuery?: string }) {
  const { state, setOpen: setSidebarOpen } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [loading, setLoading] = React.useState(false);
  // Desktop app, no internet: the list shows the chats saved on this computer
  const [offlineList, setOfflineList] = React.useState(false);
  // Desktop app: chats saved on this computer by the other accounts that logged in here (to go on with them)
  const [otherChats, setOtherChats] = React.useState<OtherAccountChats[]>([]);
  const [activeOther, setActiveOther] = React.useState<string | null>(null); // "<userId>/<chatId>" open now
  const [fullOther, setFullOther] = React.useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [dateFilter, setDateFilter] = React.useState<{ from?: Date; to?: Date } | undefined>();

  const [pinnedOpenState, setPinnedOpenState] = React.useState(false);
  const [recentOpenState, setRecentOpenState] = React.useState(false);
  // Classgrid Code: its icon strip is as narrow as the icons, so Pinned and Recent Chats open the sidebar itself
  // (they show there) instead of a list beside the strip
  const inEditor = import.meta.env.VITE_EDITOR === "1";
  const pinnedOpen = inEditor ? false : pinnedOpenState;
  const recentOpen = inEditor ? false : recentOpenState;
  const setPinnedOpen = (o: boolean) => { if (inEditor) { if (o) setSidebarOpen(true); } else setPinnedOpenState(o); };
  const setRecentOpen = (o: boolean) => { if (inEditor) { if (o) setSidebarOpen(true); } else setRecentOpenState(o); };

  // State for Three-Dot menu operations
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [shareSessionId, setShareSessionId] = React.useState<string | null>(null);
  const [isSharingEmail, setIsSharingEmail] = React.useState(false);
  const [sharedEmailSuccess, setSharedEmailSuccess] = React.useState(false);
  const [copiedSuccess, setCopiedSuccess] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);
  const [publicShareUrl, setPublicShareUrl] = React.useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [sharePreviewMessages, setSharePreviewMessages] = React.useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [deleteSessionId, setDeleteSessionId] = React.useState<string | null>(null);
  // Move to project: the user's own Project Mode projects, and the "New project" dialog
  const [projects, setProjects] = React.useState<SidebarProject[] | null>(null);
  // Website: the folder projects (This PC) left out of the list, so their chats are left out too
  const localProjectIds = React.useRef<Set<string>>(new Set());
  const [newProjectFor, setNewProjectFor] = React.useState<string | null>(null);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [isMovingChat, setIsMovingChat] = React.useState(false);
  const [isDeletingSession, setIsDeletingSession] = React.useState(false);

  React.useEffect(() => {
    const handleActiveSessionChanged = (e: any) => {
      setActiveSessionId(e.detail?.sessionId || null);
      if (e.detail?.sessionId) setActiveOther(null);
    };
    const leaveOther = () => setActiveOther(null);
    window.addEventListener("agent:active-session-changed", handleActiveSessionChanged);
    window.addEventListener("agent:new-chat", leaveOther);
    return () => {
      window.removeEventListener("agent:active-session-changed", handleActiveSessionChanged);
      window.removeEventListener("agent:new-chat", leaveOther);
    };
  }, []);

  // Which list is shown (agent chats, or one project's chats) and which one was asked for last
  const shownListRef = React.useRef<string | null>(null);
  const askedListRef = React.useRef<string | null>(null);
  // silent: refresh in the background without the grey loading bars (used after the first load)
  const fetchSessions = (silent = false) => {
    const endpoint = typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in") + "/api/ai/sessions"
      : "/api/ai/sessions";

    // Agent mode and Project mode keep separate chat lists (Project mode: the open project's chats, or all project chats on the Projects page)
    let listQuery = "?mode=agent";
    if (window.location.pathname.split("/").includes("project") || window.location.pathname.split("/").includes("studio")) { // Studio: the same project chats as Project Mode
      let openProject: string | null = null;
      try { openProject = (sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open")); } catch { /* storage blocked */ }
      listQuery = `?project=${openProject || "all"}`; // no project open: chats of all projects
      // Studio lists every project's chats under its project, and its chats sent with no project
      if (IN_EDITOR || window.location.pathname.split("/").includes("studio")) listQuery = `?project=all&studio=1${readStudioOpts().archivedOnly ? "&archived=1" : ""}`;
    }
    // Another list than the one on screen (Agent -> a project, or one project -> another): clear it at once, so
    // the old mode's chats never show while the new list loads
    if (shownListRef.current !== listQuery) { setSessions([]); silent = false; }
    if (!silent) setLoading(true);
    askedListRef.current = listQuery;
    // Desktop app: the other accounts' chats for the same list, read from this computer
    if (keepsChatCopies()) {
      listOtherChatCopies(listQuery).then((list) => { if (askedListRef.current === listQuery) setOtherChats(list); }).catch(() => {});
    }
    fetchWithRescue(endpoint + listQuery, { credentials: "include" })
      .then(res => {
        if (keepsChatCopies() && isUnreachable({ status: res.status })) throw new TypeError(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (askedListRef.current !== listQuery) return; // a newer list was asked for: this answer is too late
        if (data.sessions) { setSessions(data.sessions); shownListRef.current = listQuery; setOfflineList(false); }
      })
      .catch(async err => {
        console.error("Failed to load sessions", err);
        // Desktop app, no internet: list the chats saved on this computer
        if (!keepsChatCopies() || !isUnreachable(err)) return;
        const saved = await listChatCopies(listQuery);
        if (saved && askedListRef.current === listQuery) { setSessions(saved); shownListRef.current = listQuery; setOfflineList(true); }
      })
      .finally(() => { if (askedListRef.current === listQuery) setLoading(false); });
  };

  React.useEffect(() => {
    fetchSessions();

    const handleRefresh = () => {
      fetchSessions(true);
    };
    // A chat that was just created shows up in the list at once; the background refresh then fills in its real title.
    const handleCreated = (e: any) => {
      const id = e.detail?.id;
      if (!id) return;
      setSessions((prev) => prev.some((s) => s.id === id)
        ? prev
        : [{ id, title: String(e.detail?.title || "New chat").slice(0, 60), created_at: new Date().toISOString(), pinned: false }, ...prev]);
    };

    // The server sends a chat's new title the moment it is made, so it shows without a refresh
    const handleTitle = (data: { sessionId?: string; title?: string }) => {
      if (!data?.sessionId || !data.title) return;
      setSessions((prev) => prev.map((s) => (s.id === data.sessionId ? { ...s, title: String(data.title) } : s)));
    };
    const socket = getSocket();
    socket?.on("ai:session_title", handleTitle);

    window.addEventListener("agent:refresh-sessions", handleRefresh);
    window.addEventListener("agent:session-created", handleCreated);
    // Desktop app: back online, the list comes from the server again
    if (keepsChatCopies()) window.addEventListener("online", handleRefresh);
    return () => {
      socket?.off("ai:session_title", handleTitle);
      window.removeEventListener("agent:refresh-sessions", handleRefresh);
      window.removeEventListener("agent:session-created", handleCreated);
      window.removeEventListener("online", handleRefresh);
    };
  }, []);

  const today = new Date();
  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
    : "";

  React.useEffect(() => {
    if (shareModalOpen && shareSessionId) {
      setIsLoadingPreview(true);
      fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${shareSessionId}/messages`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          if (data.messages) {
            setSharePreviewMessages(data.messages);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingPreview(false));
    } else {
      setSharePreviewMessages([]);
    }
  }, [shareModalOpen, shareSessionId, endpointPrefix]);

  const handleUpdateSession = async (id: string, updates: any) => {
    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include"
      });
      if (res.ok) {
        if (updates.pinned !== undefined) {
          toast.success(updates.pinned ? "Chat pinned successfully!" : "Chat unpinned.");
        }
        fetchSessions(true);
      } else {
        const errData = await res.json();
        if (errData.error) {
          toast.error(errData.error);
        } else {
          toast.error("Failed to update chat.");
        }
      }
    } catch (e) {
      console.error("Failed to update session", e);
      toast.error("Failed to update chat.");
    }
  };

  // A shared chat someone else owns: "delete" means leave it
  const deleteIsShared = !!(sessions.find((x) => x.id === deleteSessionId) as any)?.shared;
  const handleDeleteSession = async (id: string) => {
    const leaving = !!(sessions.find((x) => x.id === id) as any)?.shared;
    setIsDeletingSession(true);
    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        removeChatCopy(id); // desktop app: the copy on this computer goes too
        toast.success(leaving ? "You left the chat" : "Chat deleted");
        setDeleteSessionId(null);
        if (activeSessionId === id) window.dispatchEvent(new Event("agent:new-chat"));
        fetchSessions(true);
      } else {
        toast.error("Failed to delete chat");
      }
    } catch (e) {
      console.error("Failed to delete session", e);
      toast.error("Failed to delete chat");
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleRenameSubmit = (id: string) => {
    if (editingTitle.trim()) {
      handleUpdateSession(id, { title: editingTitle.trim() });
    }
    setEditingSessionId(null);
  };

  const handleShareEmail = async (id: string) => {
    setIsSharingEmail(true);
    setSharedEmailSuccess(false);
    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${id}/share`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        setSharedEmailSuccess(true);
        setTimeout(() => setSharedEmailSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Failed to share session via email", e);
    } finally {
      setIsSharingEmail(false);
    }
  };

  const handleCopyChat = async (id: string) => {
    try {
      setIsCopying(true);
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${id}/messages`, { credentials: "include" });
      const data = await res.json();
      if (data.messages) {
        let transcript = "";
        data.messages.forEach((msg: any) => {
          let cleanContent = msg.content;
          if (cleanContent) {
            cleanContent = cleanContent.replace(/\[IMAGE_GENERATION_COMPLETE:\s*([\s\S]*?)\s*\|\s*(https?:\/\/[^\]]+)\]/g, '[Generated Image: $1]($2)');
            cleanContent = cleanContent.replace(/\[IMAGE_GENERATION_COMPLETE:\s*([\s\S]*?)\s*:\s*(https?:\/\/[^\]]+)\]/g, '[Generated Image: $1]($2)');
            transcript += `${msg.role === 'user' ? 'You' : 'Classgrid AI'}:\n${cleanContent}\n\n`;
          }
        });
        await navigator.clipboard.writeText(transcript);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Failed to copy session", e);
    } finally {
      setIsCopying(false);
    }
  };

  // ── PUBLIC LINK ──
  const handleCreatePublicLink = async (id: string) => {
    setIsCreatingLink(true);
    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${id}/public-share`, {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      if (data.shareUrl) {
        setPublicShareUrl(data.shareUrl);
        await navigator.clipboard.writeText(data.shareUrl);
        setLinkCopied(true);
        toast.success("Public link copied to clipboard!");
        setTimeout(() => setLinkCopied(false), 3000);
      }
    } catch (e) {
      console.error("Failed to create public share", e);
      toast.error("Failed to create share link.");
    } finally {
      setIsCreatingLink(false);
    }
  };

  // ── COPY AS PLAIN TEXT ──
  const handleCopyText = async (id: string) => {
    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${id}/messages`, { credentials: "include" });
      const data = await res.json();
      if (data.messages) {
        let transcript = "";
        data.messages.forEach((msg: any) => {
          let cleanContent = msg.content;
          if (cleanContent) {
            cleanContent = cleanContent.replace(/\[IMAGE_GENERATION_COMPLETE:\s*([\s\S]*?)\s*\|\s*(https?:\/\/[^\]]+)\]/g, '[Generated Image: $1]($2)');
            cleanContent = cleanContent.replace(/\[IMAGE_GENERATION_COMPLETE:\s*([\s\S]*?)\s*:\s*(https?:\/\/[^\]]+)\]/g, '[Generated Image: $1]($2)');
            transcript += `${msg.role === 'user' ? 'You' : 'Classgrid AI'}:\n${cleanContent}\n\n`;
          }
        });
        await navigator.clipboard.writeText(transcript);
        toast.success("Plain text copied to clipboard!");
      }
    } catch (e) {
      console.error("Failed to copy as text", e);
    }
  };

  // ── COPY AS MARKDOWN ──
  const handleCopyMarkdown = async (id: string) => {
    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${id}/messages`, { credentials: "include" });
      const data = await res.json();
      if (data.messages) {
        let md = "";
        data.messages.forEach((msg: any) => {
          const role = msg.role === 'user' ? 'You' : 'Classgrid AI';
          md += `### **${role}**\n${msg.content}\n\n`;
        });
        await navigator.clipboard.writeText(md);
        toast.success("Markdown copied to clipboard!");
      }
    } catch (e) {
      console.error("Failed to copy as markdown", e);
    }
  };

  // ── SOCIAL SHARE ──
  const handleSharePlatform = async (platform: 'whatsapp' | 'linkedin') => {
    let urlToShare = publicShareUrl;
    let newWindow: Window | null = null;
    
    if (!urlToShare) {
       newWindow = window.open('about:blank', '_blank');
       setIsCreatingLink(true);
       try {
         const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${shareSessionId}/public-share`, {
           method: "POST",
           credentials: "include"
         });
         const data = await res.json();
         if (data.shareUrl) {
           setPublicShareUrl(data.shareUrl);
           urlToShare = data.shareUrl;
         } else {
           if (newWindow) newWindow.close();
           toast.error("Failed to generate link");
           setIsCreatingLink(false);
           return;
         }
       } catch(e) {
         if (newWindow) newWindow.close();
         console.error(e);
         toast.error("Failed to generate link");
         setIsCreatingLink(false);
         return;
       }
       setIsCreatingLink(false);
    }

    if (urlToShare) {
       let finalUrl = "";
       if (platform === 'whatsapp') {
          const text = `Read the chat that I recently had on my Classgrid agent. I am sharing the public link here:\n${urlToShare}`;
          finalUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
       } else if (platform === 'linkedin') {
          const text = `Read the chat that I recently had on my Classgrid agent. I am sharing the public link here:\n${urlToShare}`;
          finalUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
       }
       
       if (newWindow) {
         newWindow.location.href = finalUrl;
       } else {
         window.open(finalUrl, '_blank');
       }
    }
  };

  // Chat groups (Project and Studio Mode): the open project's groups, or the ones made with no project open
  const inCodeMode = window.location.pathname.split("/").some((x) => x === "studio" || x === "project");
  const openProject = inCodeMode ? openProjectId() : null;
  const studioPage = IN_EDITOR || window.location.pathname.split("/").includes("studio");
  const groups = useChatGroups(inCodeMode, studioPage ? "all" : openProject);
  const [groupDialog, setGroupDialog] = React.useState<{ project: string | null; group?: ChatGroup; sessionId?: string } | null>(null);
  const [deleteGroup, setDeleteGroup] = React.useState<ChatGroup | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = React.useState(false);
  const [collapsedGroups, setCollapsedGroups] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("cg_groups_collapsed") || "[]"); } catch { return []; }
  });
  const toggleGroup = (id: string) => setCollapsedGroups((prev) => {
    const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    try { localStorage.setItem("cg_groups_collapsed", JSON.stringify(next)); } catch { /* storage blocked */ }
    return next;
  });
  const groupedIds = new Set(groups.flatMap((g) => g.chats.map((c) => c.id)));
  const sortedGroups = [...groups].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  // Website: a chat of a folder project (This PC) never shows; it lives only in the desktop app
  const hiddenChat = (s: ChatSession) => !onDesktop() && !!s.project_id && (localProjectIds.current.has(s.project_id) || savedProject(s.project_id)?.location === "local");
  const filteredSessions = sessions.filter(s => !hiddenChat(s) && s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const pinnedSessions = filteredSessions.filter(s => s.pinned);
  const unpinnedSessions = filteredSessions.filter(s => !s.pinned && !groupedIds.has(s.id));

  const filteredUnpinnedSessions = React.useMemo(() => {
    if (!dateFilter || (!dateFilter.from && !dateFilter.to)) return unpinnedSessions;
    return unpinnedSessions.filter(s => {
      const d = new Date(s.created_at);
      if (dateFilter.from) {
        const fromStart = new Date(dateFilter.from);
        fromStart.setHours(0, 0, 0, 0);
        if (d < fromStart) return false;
      }
      if (dateFilter.to) {
        const toEnd = new Date(dateFilter.to);
        toEnd.setHours(23, 59, 59, 999);
        if (d > toEnd) return false;
      }
      return true;
    });
  }, [unpinnedSessions, dateFilter]);

  const todaySessions = filteredUnpinnedSessions.filter(s => isToday(s.created_at));
  const previousSessions = filteredUnpinnedSessions.filter(s => !isToday(s.created_at));
  // Long histories: render the latest chats first and the rest on request, so opening the sidebar stays fast.
  const PREVIOUS_PAGE = 30;
  const [showAllPrevious, setShowAllPrevious] = React.useState(false);
  const filtering = !!(dateFilter && (dateFilter.from || dateFilter.to));
  const visiblePreviousSessions = showAllPrevious || filtering ? previousSessions : previousSessions.slice(0, PREVIOUS_PAGE);
  const hiddenPreviousCount = previousSessions.length - visiblePreviousSessions.length;

  const navigate = useNavigate();
  const location = useLocation();
  const isProjectMode = location.pathname.split("/").includes("project");
  const isStudioMode = IN_EDITOR || location.pathname.split("/").includes("studio");
  // Switching between Agent and Project mode shows that mode's own chats
  React.useEffect(() => { fetchSessions(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isProjectMode, isStudioMode]);

  // Extract base path robustly by finding the 'agent' segment
  const pathParts = location.pathname.split('/');
  const agentIndex = pathParts.indexOf('agent') !== -1 ? pathParts.indexOf('agent') : pathParts.indexOf('project') !== -1 ? pathParts.indexOf('project') : pathParts.indexOf('studio');
  const baseAgentPath = agentIndex !== -1
    ? pathParts.slice(0, agentIndex + 1).join('/')
    : location.pathname;

  const handleNewChat = () => {
    navigate(baseAgentPath);
    window.dispatchEvent(new Event("agent:new-chat")); // Keep event for legacy state reset if needed
  };

  const handleLoadChat = (sessionId: string) => {
    navigate(`${baseAgentPath}/${sessionId}`);
  };

  // Desktop app: open another account's chat from this computer (the chat panel shows it; sending a message
  // continues it under this account)
  const openOtherChat = (a: OtherAccountChats, c: OtherAccountChats["chats"][number]) => {
    navigate(baseAgentPath);
    setActiveOther(`${a.userId}/${c.id}`);
    window.dispatchEvent(new CustomEvent("agent:open-other-chat", { detail: { userId: a.userId, chatId: c.id, email: a.email, title: c.title } }));
  };

  // Studio: the chats sit under their project's folder (every project shows, even with no chats yet)
  React.useEffect(() => {
    if (!isStudioMode) return;
    loadProjects();
    const again = () => loadProjects();
    window.addEventListener("studio:project-changed", again);
    window.addEventListener("studio:projects-changed", again); // a project's logo, name or repo changed
    return () => { window.removeEventListener("studio:project-changed", again); window.removeEventListener("studio:projects-changed", again); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudioMode]);
  const [closedFolders, setClosedFolders] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("cg_studio_folders_closed") || "[]"); } catch { return []; }
  });
  const toggleFolder = (key: string) => setClosedFolders((prev) => {
    const next = prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key];
    try { localStorage.setItem("cg_studio_folders_closed", JSON.stringify(next)); } catch { /* storage blocked */ }
    return next;
  });
  const [fullFolders, setFullFolders] = React.useState<string[]>([]);
  const [opts, setOpts] = React.useState<StudioListOpts>(readStudioOpts);
  const setOpt = (patch: Partial<StudioListOpts>) => setOpts((prev) => {
    const next = { ...prev, ...patch };
    try { localStorage.setItem(STUDIO_OPTS_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    return next;
  });
  // Archived Only lists the archived chats instead
  const firstOpts = React.useRef(true);
  React.useEffect(() => {
    if (firstOpts.current) { firstOpts.current = false; return; }
    if (isStudioMode) fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.archivedOnly]);

  // Unread: a chat that had a message after it was last open here (kept on this device)
  const [readAt, setReadAt] = React.useState<{ since: number; at: Record<string, number> }>(() => {
    try { const v = JSON.parse(localStorage.getItem("cg_chat_read") || "null"); if (v && typeof v.since === "number" && v.at) return v; } catch { /* storage blocked */ }
    const v = { since: Date.now(), at: {} };
    try { localStorage.setItem("cg_chat_read", JSON.stringify(v)); } catch { /* storage blocked */ }
    return v;
  });
  const markRead = (ids: string[] | "all") => setReadAt((prev) => {
    const now = Date.now();
    const next = ids === "all" ? { since: now, at: {} } : { ...prev, at: { ...prev.at, ...Object.fromEntries(ids.map((id) => [id, now])) } };
    try { localStorage.setItem("cg_chat_read", JSON.stringify(next)); } catch { /* storage blocked */ }
    return next;
  });
  const isUnread = (c: ChatSession) => !!c.updated_at && new Date(c.updated_at).getTime() > (readAt.at[c.id] || readAt.since);
  const lastActive = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!isStudioMode) return;
    const ids = [lastActive.current, activeSessionId].filter((x): x is string => !!x);
    lastActive.current = activeSessionId;
    if (ids.length) markRead(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, sessions, isStudioMode]);

  const chatTime = (c: ChatSession) => new Date((opts.sortChats === "updated" && c.updated_at) || c.created_at).getTime();
  const sortChats = (list: ChatSession[]) => (opts.sortChats === "title"
    ? [...list].sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }))
    : [...list].sort((a, b) => chatTime(b) - chatTime(a)));
  const studioChats = isStudioMode ? sortChats(filteredUnpinnedSessions.filter((c) => !opts.unreadOnly || isUnread(c))) : [];

  // Custom order: drag a project folder onto another to move it there
  const [folderOrder, setFolderOrder] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("cg_studio_folder_order") || "[]"); } catch { return []; }
  });
  const dragFolder = React.useRef<string | null>(null);

  const studioFolders = React.useMemo(() => {
    if (!isStudioMode) return [];
    type F = { key: string; id: string | null; place: "pc" | "cloud"; name: string; logo: string | null; chats: ChatSession[]; groups: ChatGroup[] };
    const folders = new Map<string, F>();
    const names = new Map((projects || []).map((p) => [p.id, p]));
    // Desktop app: a chat sits under This PC or Cloud by where it happened (the server's chat_place), so one project can
    // have a folder in each: its chats on this computer, and its chats in the cloud
    const placeOf = (id: string | null, c?: ChatSession): "pc" | "cloud" => (c as any)?.chat_place || (id && onThisPc(names.get(id) || savedProject(id)) ? "pc" : "cloud");
    const folderFor = (id: string | null, c?: ChatSession) => {
      const place = placeOf(id, c);
      const key = id ? (onDesktop() ? `${place}:${id}` : id) : "none";
      if (!folders.has(key)) {
        const p = id ? names.get(id) : null;
        folders.set(key, { key, id, place, name: id ? p?.name || (c as any)?.project_name || "Project" : "No project", logo: p?.logo || (c as any)?.project_logo || null, chats: [], groups: [] });
      }
      return folders.get(key)!;
    };
    // Website: a folder project's chats make no folder (hiddenChat already left them out of studioChats)
    for (const c of studioChats) if (!hiddenChat(c)) folderFor(c.project_id || null, c).chats.push(c);
    // Each project's own groups sit inside its folder (pinned groups first)
    if (!opts.archivedOnly && !opts.unreadOnly) {
      for (const g of sortedGroups) if (!g.projectId || names.has(g.projectId) || folders.has(g.projectId)) folderFor(g.projectId || null).groups.push(g);
    }
    if (!searchQuery && !opts.hideEmpty && !opts.unreadOnly && !opts.archivedOnly) {
      // (desktop app: only the projects on this computer; its cloud projects' chats are on the website)
      for (const p of projects || []) if (!onDesktop() || onThisPc(p)) folderFor(p.id);
      folderFor(null);
    }
    let list = [...folders.values()];
    if (opts.openOnly) list = list.filter((f) => (f.id || null) === (openProject || null));
    const newest = (f: F) => (f.chats.length ? Math.max(...f.chats.map(chatTime)) : 0);
    if (opts.sortProjects === "name") list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    else {
      list.sort((a, b) => newest(b) - newest(a));
      if (opts.sortProjects === "custom") {
        const at = (k: string) => { const i = folderOrder.indexOf(k); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
        list.sort((a, b) => at(a.key) - at(b.key));
      }
    }
    // Auto Pin: the open project's folder stays at the top
    if (opts.autoPin) {
      const i = list.findIndex((f) => (f.id || null) === (openProject || null));
      if (i > 0) list = [list[i]!, ...list.slice(0, i), ...list.slice(i + 1)];
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudioMode, studioChats, sortedGroups, projects, searchQuery, opts, folderOrder, openProject, readAt]);
  const dropFolder = (target: string) => {
    const from = dragFolder.current;
    dragFolder.current = null;
    if (!from || from === target) return;
    const keys = studioFolders.map((f) => f.key).filter((k) => k !== from);
    keys.splice(Math.max(0, keys.indexOf(target)), 0, from);
    setFolderOrder(keys);
    try { localStorage.setItem("cg_studio_folder_order", JSON.stringify(keys)); } catch { /* storage blocked */ }
    setOpt({ sortProjects: "custom" });
  };
  // Desktop app: This PC and Cloud are two lists, never one. Chats with no project keep their own folder after them
  const studioFolderSections = (() => {
    if (!onDesktop()) return [{ key: "all", label: "", list: studioFolders }];
    const pc = studioFolders.filter((f) => f.id && f.place === "pc");
    const cloud = studioFolders.filter((f) => f.id && f.place === "cloud");
    return [
      { key: "pc", label: "This PC", list: pc },
      { key: "cloud", label: "Cloud", list: cloud },
      { key: "none", label: "", list: studioFolders.filter((f) => !f.id) },
    ].filter((s) => s.list.length);
  })();
  const [newProjectOpen, setNewProjectOpen] = React.useState(false);
  const [showAllStudio, setShowAllStudio] = React.useState(false);

  // A new chat in this folder's project (the project opens, like picking it above the chat input)
  const newChatIn = (projectId: string | null) => {
    navigate(baseAgentPath);
    window.dispatchEvent(new Event("agent:new-chat"));
    if (projectId === openProjectId()) return;
    try {
      if (projectId) { localStorage.setItem("cg_project_open", projectId); sessionStorage.setItem("cg_project_open", projectId); }
      else { localStorage.removeItem("cg_project_open"); sessionStorage.removeItem("cg_project_open"); }
    } catch { /* storage blocked */ }
    window.dispatchEvent(new Event("agent:refresh-sessions"));
    window.dispatchEvent(new CustomEvent("studio:project-changed", { detail: { projectId } }));
  };

  const shortAge = (at: string) => {
    const mins = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000));
    if (mins < 60) return `${Math.max(1, mins)}m`;
    if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
    if (mins < 60 * 24 * 30) return `${Math.floor(mins / (60 * 24))}d`;
    if (mins < 60 * 24 * 365) return `${Math.floor(mins / (60 * 24 * 30))}mo`;
    return `${Math.floor(mins / (60 * 24 * 365))}y`;
  };

  const loadProjects = () => {
    fetchWithRescue(`${endpointPrefix}/api/ide/projects`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const list: SidebarProject[] = Array.isArray(data.projects)
          ? data.projects.map((p: any) => ({ id: String(p.id), name: String(p.name || "Untitled"), logo: p.logo || null, location: p.location, localPath: p.localPath || null, localCopies: p.localCopies }))
          : [];
        // Website: folder projects (This PC) are never listed; they live only in the desktop app
        localProjectIds.current = new Set(list.filter((p) => p.location === "local").map((p) => p.id));
        setProjects(onDesktop() ? list : list.filter((p) => p.location !== "local"));
      })
      .catch(() => setProjects([]));
  };

  /** Move an Agent chat into a Project Mode project: it then leaves the Agent list and opens in Project Mode */
  const moveChatToProject = async (sessionId: string, project: { id: string; name: string }) => {
    setIsMovingChat(true);
    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ide/projects/${project.id}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error === "chat_in_other_project" ? "This chat is already in another project." : data.error || "Could not move the chat.");
        return false;
      }
      // Go straight to Project Mode with this chat. No project is marked open, so the editor does not start;
      // the user opens the editor from the project when they want it.
      const projectPath = baseAgentPath.replace(/\/agent$/, "/project");
      toast.success(`Moved to ${project.name}`);
      try { localStorage.removeItem("cg_project_open"); sessionStorage.removeItem("cg_project_open"); } catch { /* storage blocked */ }
      navigate(`${projectPath}/${sessionId}`);
      return true;
    } catch {
      toast.error("Could not move the chat.");
      return false;
    } finally {
      setIsMovingChat(false);
    }
  };

  const createProjectAndMove = async () => {
    const name = newProjectName.trim();
    if (!name || !newProjectFor) return;
    setIsMovingChat(true);
    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ide/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.project) { toast.error(data.error || "Could not create the project."); return; }
      const project = { id: String(data.project.id), name: String(data.project.name) };
      setProjects((list) => (list ? [project, ...list] : [project]));
      if (await moveChatToProject(newProjectFor, project)) {
        setNewProjectFor(null);
        setNewProjectName("");
      }
    } catch {
      toast.error("Could not create the project.");
    } finally {
      setIsMovingChat(false);
    }
  };

  const renderSessionItem = (session: ChatSession) => {
    const isEditing = editingSessionId === session.id;

    // Clean up AI hallucinations anywhere in the string, fallback to empty string if title is null
    let displayTitle = (session.title || "New Chat")
      .replace(/\*\*Title:\*\*/gi, '')
      .replace(/Title:/gi, '')
      .replace(/["']/g, '')
      .trim();

    return (
      <SidebarMenuItem key={session.id}>
        <div className="relative group w-full flex items-center min-w-0">
          {isEditing ? (
            <div className="flex-1 px-2 py-1 min-w-0">
              <Input
                autoFocus
                className="h-7 text-xs px-2 w-full bg-background"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleRenameSubmit(session.id)}
                onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(session.id)}
              />
            </div>
          ) : (
            <SidebarMenuButton
              isActive={session.id === activeSessionId}
              onClick={() => handleLoadChat(session.id)}
              className={cn("h-auto cursor-pointer flex-1 min-w-0", isStudioMode && opts.compact ? "py-1" : "py-1.5")}
              render={
                <div className="flex items-center gap-2.5 w-full min-w-0 pr-8">
                  {session.pinned && (
                    <ChatBubbleIcon className="w-[15px] h-[15px] shrink-0 text-muted-foreground/80" />
                  )}
                  {isStudioMode && session.id !== activeSessionId && isUnread(session) && (
                    <span className="size-1.5 shrink-0 rounded-full bg-sky-400" aria-label="Unread" />
                  )}
                  <span className="truncate block min-w-0 flex-1">{displayTitle}</span>
                  {/* Share Grid: this chat is shared with other people */}
                  {(session as any).grid && (
                    <Star className="w-3 h-3 shrink-0 fill-current text-foreground" aria-label="Shared chat" />
                  )}
                  {isStudioMode && !session.pinned && opts.showTime && (
                    <span className="shrink-0 -mr-6 text-xs text-muted-foreground group-hover:opacity-0 transition-opacity">{shortAge((opts.sortChats === "updated" && session.updated_at) || session.created_at)}</span>
                  )}
                </div>
              }
            />
          )}

          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="absolute right-2 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="start"
                sideOffset={8}
                className="w-[180px] z-[100] bg-white dark:bg-[#202123] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl"
              >
                <DropdownMenuItem
                  className="gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1] rounded-xl transition-colors"
                  onClick={() => {
                    setPinnedOpen(false);
                    setRecentOpen(false);
                    setShareSessionId(session.id);
                    setShareModalOpen(true);
                  }}
                >
                  <Share className="w-4 h-4 text-slate-500 dark:text-white/70" strokeWidth={2} />
                  Share
                </DropdownMenuItem>

                {!(session as any).shared && (<>
                <DropdownMenuItem
                  className="gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1] rounded-xl transition-colors"
                  onClick={() => {
                    setPinnedOpen(false);
                    setRecentOpen(false);
                    setEditingSessionId(session.id);
                    setEditingTitle(session.title);
                  }}
                >
                  <Pencil className="w-4 h-4 text-slate-500 dark:text-white/70" strokeWidth={2} />
                  Rename
                </DropdownMenuItem>
                </>)}

                <DropdownMenuItem
                  className="gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1] rounded-xl transition-colors"
                  onClick={() => {
                    setPinnedOpen(false);
                    setRecentOpen(false);
                    if (!session.pinned && pinnedSessions.length >= 5) {
                      toast.error("You can only pin up to 5 chats.");
                      return;
                    }
                    handleUpdateSession(session.id, { pinned: !session.pinned });
                  }}
                >
                  <Pin className="w-4 h-4 text-slate-500 dark:text-white/70" strokeWidth={2} />
                  {session.pinned ? "Unpin chat" : "Pin chat"}
                </DropdownMenuItem>

                {!isProjectMode && !isStudioMode && !(session as any).shared && (
                  <DropdownMenuSub onOpenChange={(open) => { if (open && projects === null) loadProjects(); }}>
                    <DropdownMenuSubTrigger className="gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] rounded-xl transition-colors data-popup-open:bg-slate-100 dark:data-popup-open:bg-[#343541]">
                      <FolderInput className="w-4 h-4 text-slate-500 dark:text-white/70" strokeWidth={2} />
                      Move to project
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                      sideOffset={8}
                      className="w-[200px] max-h-[320px] overflow-y-auto z-[101] bg-white dark:bg-[#202123] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl"
                    >
                      <DropdownMenuItem
                        className="gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] rounded-xl transition-colors"
                        onClick={() => { setPinnedOpen(false); setRecentOpen(false); setNewProjectName(""); setNewProjectFor(session.id); }}
                      >
                        <FolderPlus className="w-4 h-4 text-slate-500 dark:text-white/70" strokeWidth={2} />
                        New project
                      </DropdownMenuItem>
                      {projects === null ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-400"><Spinner className="size-3.5" />Loading…</div>
                      ) : projects.length > 0 && (
                        // Desktop app: This PC and Cloud are two lists, never one (the website lists cloud projects only)
                        (onDesktop()
                          ? [{ key: "pc", label: "This PC", list: projects.filter(onThisPc) }, { key: "cloud", label: "Cloud", list: projects.filter((p) => !onThisPc(p)) }]
                          : [{ key: "cloud", label: "", list: projects }]
                        ).filter((s) => s.list.length).map((s) => (
                          <React.Fragment key={s.key}>
                            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />
                            {s.label && (
                              <div className="flex items-center gap-1.5 px-3 pt-1 pb-1 text-[12px] text-muted-foreground">
                                {s.key === "pc" ? <Laptop className="size-3.5" /> : <Cloud className="size-3.5" />} {s.label}
                              </div>
                            )}
                            {s.list.map((p) => (
                              <DropdownMenuItem
                                key={p.id}
                                disabled={isMovingChat}
                                className="gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] rounded-xl transition-colors"
                                onClick={() => { setPinnedOpen(false); setRecentOpen(false); moveChatToProject(session.id, p); }}
                              >
                                <Folder className="w-4 h-4 shrink-0 text-slate-500 dark:text-white/70" strokeWidth={2} />
                                <span className="break-words min-w-0">{p.name}</span>
                              </DropdownMenuItem>
                            ))}
                          </React.Fragment>
                        ))
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />

                <DropdownMenuItem
                  className="gap-3 py-2 px-3 text-[14px] cursor-pointer text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-500/10 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-[#ef4444] rounded-xl transition-colors"
                  onClick={() => {
                    setPinnedOpen(false);
                    setRecentOpen(false);
                    setDeleteSessionId(session.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-[#ef4444]" strokeWidth={2} />
                  {(session as any).shared ? "Leave chat" : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarMenuItem>
    );
  };

  const menuItem = "gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1] rounded-xl transition-colors";
  const menuIcon = "w-4 h-4 text-slate-500 dark:text-white/70";
  const menuBox = (w: string) => `${w} z-[100] bg-white dark:bg-[#202123] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl`;
  // Display Options: a row that turns on / off, and a row that opens its choices
  const optionRow = (label: string, on: boolean, run: () => void, title?: string) => (
    <DropdownMenuItem key={label} className={cn(menuItem, "justify-between")} onClick={run} title={title}>
      {label}{on && <Check className="w-4 h-4" />}
    </DropdownMenuItem>
  );
  const optionSub = (label: string, value: string, choices: [string, boolean, () => void][]) => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] rounded-xl transition-colors data-popup-open:bg-slate-100 dark:data-popup-open:bg-[#343541]">
        <span className="flex-1">{label}</span>
        {value && <span className="text-[13px] text-muted-foreground">{value}</span>}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent sideOffset={8} className={menuBox("w-[210px] z-[101]")}>
        {choices.map(([l, on, run]) => optionRow(l, on, run))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  // One group: its row (icon, name, ⋯ menu, open / closed arrow) and its chats under it
  const renderGroup = (g: ChatGroup) => {
    const chats: ChatSession[] = g.chats
      .map((c) => sessions.find((s) => s.id === c.id) || c)
      .filter((s) => !hiddenChat(s) && (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()));
    if (searchQuery && chats.length === 0) return null;
    const isOpen = !collapsedGroups.includes(g.id);
    const Icon = groupIcon(g.icon);
    return (
      <div key={g.id}>
        <div className="group/grp relative flex items-center">
          <button
            type="button"
            onClick={() => toggleGroup(g.id)}
            className="flex-1 min-w-0 flex items-center gap-2.5 h-8 pl-2 pr-16 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
          >
            <Icon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <span className="truncate">{g.name}</span>
            {g.pinned && <Pin className="w-3 h-3 shrink-0 text-muted-foreground/60" />}
          </button>
          <div className="absolute right-1 flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover/grp:opacity-100 data-[state=open]:opacity-100 transition-opacity p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer" aria-label="Group options">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-[190px] z-[100] bg-white dark:bg-[#202123] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl">
                <DropdownMenuItem className={menuItem} onClick={() => setGroupDialog({ project: g.projectId, group: g })}>
                  <Pencil className={menuIcon} strokeWidth={2} /> Rename & icon
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={menuItem}
                  onClick={() => groupsApi.update(g.id, { pinned: !g.pinned }).then(() => toast.success(g.pinned ? "Group unpinned" : "Group pinned")).catch((e) => toast.error(e?.message || "Could not pin the group"))}
                >
                  {g.pinned ? <PinOff className={menuIcon} strokeWidth={2} /> : <Pin className={menuIcon} strokeWidth={2} />}
                  {g.pinned ? "Unpin group" : "Pin group"}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />
                <DropdownMenuItem
                  className={`${menuItem} text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-500/10 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-[#ef4444] dark:focus:text-[#ef4444]`}
                  onClick={() => setDeleteGroup(g)}
                >
                  <Trash2 className="w-4 h-4 text-[#ef4444]" strokeWidth={2} /> Delete group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button type="button" onClick={() => toggleGroup(g.id)} className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer" aria-label={isOpen ? "Close group" : "Open group"}>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", !isOpen && "-rotate-90")} />
            </button>
          </div>
        </div>
        {isOpen && (
          <SidebarMenu className="pl-4 mt-0.5 mb-1">
            {chats.length ? chats.map(renderSessionItem) : <div className="px-2 py-1.5 text-xs text-muted-foreground">No chats yet. Use a chat's ⋯ menu to add one.</div>}
          </SidebarMenu>
        )}
      </div>
    );
  };

  // Studio: the projects list (header with Display Options, then each project). The open sidebar and the icon
  // strip's chats popover both show it
  const studioProjects = (
            <div className="mt-1">
              <div className="group/projects flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium text-muted-foreground/70">{opts.archivedOnly ? "Archived" : opts.groupBy === "none" ? "Chats" : "Projects"}</span>
                <div className="flex items-center gap-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" aria-label="Display options" title="Display options">
                        <ListFilter className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="end" sideOffset={6} className={menuBox("w-[250px]")}>
                      {optionSub("Group By", opts.groupBy === "project" ? "Project" : "None", [
                        ["Project", opts.groupBy === "project", () => setOpt({ groupBy: "project" })],
                        ["None", opts.groupBy === "none", () => setOpt({ groupBy: "none" })],
                      ])}
                      {optionSub("Sort Conversations", { updated: "Last Updated", created: "Created", title: "Name" }[opts.sortChats], [
                        ["Last Updated", opts.sortChats === "updated", () => setOpt({ sortChats: "updated" })],
                        ["Created", opts.sortChats === "created", () => setOpt({ sortChats: "created" })],
                        ["Name", opts.sortChats === "title", () => setOpt({ sortChats: "title" })],
                      ])}
                      {optionSub("Sort Projects", { custom: "Custom Order", recent: "Recent", name: "Name" }[opts.sortProjects], [
                        ["Custom Order", opts.sortProjects === "custom", () => setOpt({ sortProjects: "custom" })],
                        ["Recent", opts.sortProjects === "recent", () => setOpt({ sortProjects: "recent" })],
                        ["Name", opts.sortProjects === "name", () => setOpt({ sortProjects: "name" })],
                      ])}
                      <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />
                      {optionSub("Filter", "", [
                        ["Unread only", opts.unreadOnly, () => setOpt({ unreadOnly: !opts.unreadOnly })],
                        ["Hide empty projects", opts.hideEmpty, () => setOpt({ hideEmpty: !opts.hideEmpty })],
                        ["Only the open project", opts.openOnly, () => setOpt({ openOnly: !opts.openOnly })],
                      ])}
                      {optionSub("Display", "", [
                        ["Show time", opts.showTime, () => setOpt({ showTime: !opts.showTime })],
                        ["Show project logos", opts.showLogos, () => setOpt({ showLogos: !opts.showLogos })],
                        ["Compact", opts.compact, () => setOpt({ compact: !opts.compact })],
                      ])}
                      {optionRow("Auto Pin", opts.autoPin, () => setOpt({ autoPin: !opts.autoPin }), "The open project stays at the top")}
                      {!IN_EDITOR && optionRow("Archived Only", opts.archivedOnly, () => setOpt({ archivedOnly: !opts.archivedOnly }))}
                      <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />
                      {optionRow("Mark All as Read", false, () => { markRead("all"); toast.success("All chats marked as read"); })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* Desktop app: open a folder from this computer as a project (like Antigravity); website: new cloud project */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!(window as any).classgridDesktop?.isDesktop) return setNewProjectOpen(true);
                      const made = await openLocalFolder();
                      if (made) { openStudioProject(made.id); window.dispatchEvent(new Event("studio:projects-changed")); }
                    }}
                    className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    aria-label={(window as any).classgridDesktop?.isDesktop ? "Open folder" : "New project"}
                    title={(window as any).classgridDesktop?.isDesktop ? "Open folder from this computer" : "New project"}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {loading && !sessions.length ? (
                <div className="px-2 py-1.5 space-y-3">
                  <div className="h-4 w-[80%] rounded-md bg-muted animate-pulse" />
                  <div className="h-4 w-[60%] rounded-md bg-muted animate-pulse" />
                  <div className="h-4 w-[70%] rounded-md bg-muted animate-pulse" />
                </div>
              ) : opts.groupBy === "none" ? (
                <SidebarMenu>
                  {!studioChats.length && <div className="px-2 py-1.5 text-xs text-muted-foreground">{opts.archivedOnly ? "No archived chats" : "No chats yet"}</div>}
                  {(showAllStudio || searchQuery ? studioChats : studioChats.slice(0, PREVIOUS_PAGE)).map(renderSessionItem)}
                  {!showAllStudio && !searchQuery && studioChats.length > PREVIOUS_PAGE && (
                    <button type="button" onClick={() => setShowAllStudio(true)} className="w-full px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer">
                      Show {studioChats.length - PREVIOUS_PAGE} more
                    </button>
                  )}
                </SidebarMenu>
              ) : studioFolderSections.map((s, i) => (
                <div key={s.key} className={i ? "mt-1 pt-1 border-t border-black/10 dark:border-white/[0.08]" : ""}>
                  {s.label && (
                    <p className="flex items-center gap-1.5 px-2 pt-1 pb-1 text-[12px] text-muted-foreground">
                      {s.key === "pc" ? <Laptop className="size-3.5" /> : <Cloud className="size-3.5" />} {s.label}
                    </p>
                  )}
                  {s.list.map((f) => {
                const isOpen = !closedFolders.includes(f.key) || !!searchQuery;
                const full = fullFolders.includes(f.key);
                const shown = full || searchQuery ? f.chats : f.chats.slice(0, 5);
                const isCurrent = (f.id || null) === (openProject || null);
                return (
                  <div
                    key={f.key}
                    className="mb-1"
                    onDragOver={(e) => { if (dragFolder.current) e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); dropFolder(f.key); }}
                  >
                    {/* The project's row: same look as a group row (icon, name, + new chat, open / closed arrow) */}
                    <div className="group/fld relative flex items-center" draggable onDragStart={() => { dragFolder.current = f.key; }} onDragEnd={() => { dragFolder.current = null; }}>
                      <button
                        type="button"
                        onClick={() => toggleFolder(f.key)}
                        className={cn("flex-1 min-w-0 flex items-center gap-2.5 h-8 pl-2 pr-16 rounded-md text-sm hover:bg-sidebar-accent transition-colors cursor-pointer", isCurrent ? "text-sidebar-foreground" : "text-muted-foreground")}
                      >
                        {f.logo && opts.showLogos
                          ? <img src={f.logo} alt="" className="w-4 h-4 shrink-0 rounded object-cover" />
                          : <Folder className="w-4 h-4 shrink-0" strokeWidth={2} />}
                        <span className="truncate">{f.name}</span>
                      </button>
                      <div className="absolute right-1 flex items-center">
                        {/* Desktop app: the project's menu, to get a copy on this computer or switch between it and the cloud */}
                        {placeActions(savedProject(f.id)).length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="opacity-0 group-hover/fld:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer" title="Project menu" aria-label={`${f.name} menu`}>
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="right" align="start" sideOffset={8} className={menuBox("w-[240px]")}>
                              {placeActions(savedProject(f.id)).map((a) => (
                                <DropdownMenuItem key={a.label} className={menuItem} onClick={() => { a.run(); }}>{a.label}</DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <button
                          type="button"
                          onClick={() => newChatIn(f.id)}
                          className="opacity-0 group-hover/fld:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                          title={f.id ? "New chat in this project" : "New chat with no project"}
                          aria-label={f.id ? `New chat in ${f.name}` : "New chat with no project"}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => toggleFolder(f.key)} className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer" aria-label={isOpen ? "Close project" : "Open project"}>
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", !isOpen && "-rotate-90")} />
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="pl-4 mt-0.5">
                        {f.groups.map(renderGroup)}
                        <SidebarMenu>
                          {shown.length ? shown.map(renderSessionItem) : !f.groups.length && <div className="px-2 py-1.5 text-xs text-muted-foreground">No chats yet</div>}
                          {!full && !searchQuery && f.chats.length > shown.length && (
                            <button
                              type="button"
                              onClick={() => setFullFolders((prev) => [...prev, f.key])}
                              className="w-full px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                            >
                              Show {f.chats.length - shown.length} more
                            </button>
                          )}
                        </SidebarMenu>
                      </div>
                    )}
                  </div>
                );
                  })}
                </div>
              ))}
            </div>
  );

  return (
    <>
      {/* Both layouts stay mounted and are only shown/hidden, so opening the sidebar never rebuilds the chat list */}
      <div className={isCollapsed ? "contents" : "hidden"}>
      <SidebarGroup className="pt-1">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="New Chat" 
                onClick={handleNewChat}
                isActive={!activeSessionId}
                render={
                  <div className="flex items-center gap-3 w-full cursor-pointer">
                    <SquarePen size={20} />
                    <span className="truncate font-medium">New Chat</span>
                  </div>
                }
              />
            </SidebarMenuItem>

            {!isProjectMode && !isStudioMode && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="Schedule"
                  onClick={() => navigate(`${baseAgentPath.replace("/project", "/agent")}/schedule`)}
                  render={
                    <div className="flex items-center gap-3 w-full cursor-pointer">
                      <Calendar size={20} />
                      <span className="truncate font-medium">Schedule</span>
                    </div>
                  }
                />
              </SidebarMenuItem>
            )}

            {!isStudioMode && (
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Library"
                onClick={() => navigate(`${baseAgentPath.replace("/project", "/agent")}/library`)}
                render={
                  <div className="flex items-center gap-3 w-full cursor-pointer">
                    <Library size={20} />
                    <span className="truncate font-medium">Library</span>
                  </div>
                }
              />
            </SidebarMenuItem>
            )}

            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Search"
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new Event("agent:open-search-palette"));
                }}
                render={
                  <div className="flex items-center gap-3 w-full cursor-pointer">
                    <Search size={20} />
                    <span className="truncate">Search</span>
                  </div>
                }
              />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Popover open={pinnedOpen} onOpenChange={setPinnedOpen}>
                <PopoverTrigger asChild>
                  <div className="w-full">
                    <SidebarMenuButton 
                      tooltip="Pinned Chats"
                      render={
                        <div className="flex items-center gap-3 w-full cursor-pointer">
                          <Pin size={20} />
                          <span className="truncate">Pinned Chats</span>
                        </div>
                      }
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" sideOffset={10} className="w-[280px] p-2 bg-white dark:bg-[#202123] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-2">Pinned</div>
                  <SidebarMenu>
                    {pinnedSessions.length === 0 && <div className="px-2 text-sm text-slate-400">No pinned chats</div>}
                    {pinnedSessions.map(renderSessionItem)}
                  </SidebarMenu>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Popover open={recentOpen} onOpenChange={setRecentOpen}>
                <PopoverTrigger asChild>
                  <div className="w-full">
                    <SidebarMenuButton 
                      tooltip={isStudioMode ? "Projects" : "Recent Chats"}
                      render={
                        <div className="flex items-center gap-3 w-full cursor-pointer">
                          <ChatBubbleIcon className="w-[20px] h-[20px]" />
                          <span className="truncate">{isStudioMode ? "Projects" : "Recent Chats"}</span>
                        </div>
                      }
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" sideOffset={10} className={cn("p-2 bg-white dark:bg-[#202123] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl max-h-[70vh] overflow-y-auto", isStudioMode ? "w-[300px]" : "w-[280px]")}>
                  {isStudioMode ? studioProjects : (<>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-2">Today</div>
                  <SidebarMenu className="mb-4">
                    {loading && (
                      <>
                        <div className="px-2 py-1.5 space-y-3">
                          <div className="h-4 w-[85%] rounded-md bg-muted animate-pulse" />
                          <div className="h-4 w-[65%] rounded-md bg-muted animate-pulse" />
                          <div className="h-4 w-[75%] rounded-md bg-muted animate-pulse" />
                        </div>
                      </>
                    )}
                    {!loading && todaySessions.length === 0 && <div className="px-2 text-sm text-slate-400">No chats today</div>}
                    {todaySessions.map(renderSessionItem)}
                  </SidebarMenu>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-2 mt-4">Previous</div>
                  <SidebarMenu>
                    {!loading && previousSessions.length === 0 && <div className="px-2 text-sm text-slate-400">No previous chats</div>}
                    {visiblePreviousSessions.map(renderSessionItem)}
                  </SidebarMenu>
                  </>)}
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      </div>
      <div className={isCollapsed ? "hidden" : "contents"}>
      <SidebarGroup className="pt-1">
        <div className="px-2 pb-3 mb-3 border-b border-border/50">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleNewChat}
                isActive={!activeSessionId}
                render={
                  <div className="flex items-center gap-3 w-full cursor-pointer">
                    <SquarePen size={20} />
                    <span className="font-medium text-sm">New Chat</span>
                  </div>
                }
              />
            </SidebarMenuItem>

            {!isProjectMode && !isStudioMode && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate(`${baseAgentPath.replace("/project", "/agent")}/schedule`)}
                  render={
                    <div className="flex items-center gap-3 w-full cursor-pointer">
                      <Calendar size={20} />
                      <span className="font-medium text-sm">Schedule</span>
                    </div>
                  }
                />
              </SidebarMenuItem>
            )}

            {!isStudioMode && (
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => navigate(`${baseAgentPath.replace("/project", "/agent")}/library`)}
                render={
                  <div className="flex items-center gap-3 w-full cursor-pointer">
                    <Library size={20} />
                    <span className="font-medium text-sm">Library</span>
                  </div>
                }
              />
            </SidebarMenuItem>
            )}
          </SidebarMenu>
        </div>

        <SidebarGroupContent>
          {offlineList && <div className="px-2 pb-2 text-xs text-muted-foreground">{OFFLINE_CHAT_NOTE}</div>}
          {inCodeMode && !isStudioMode && (
            <div className="mb-3">
              <div className="group/groups flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium text-muted-foreground/70">Groups</span>
                <button
                  type="button"
                  onClick={() => setGroupDialog({ project: openProject })}
                  className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover/groups:opacity-100 transition-opacity cursor-pointer"
                  aria-label="New group"
                  title="New group"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {sortedGroups.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setGroupDialog({ project: openProject })}
                  className="w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" strokeWidth={2} />
                  New group
                </button>
              ) : (
                sortedGroups.map(renderGroup)
              )}
            </div>
          )}
          <Accordion defaultValue={["pinned", "today", "previous"]} multiple className="w-full">
            {pinnedSessions.length > 0 && (
              <AccordionItem value="pinned" className="border-none mb-2">
                <AccordionTrigger className="px-2 py-1.5 hover:no-underline group/acc-trigger [&_[data-slot=accordion-trigger-icon]]:opacity-0 hover:[&_[data-slot=accordion-trigger-icon]]:opacity-100 flex items-center h-auto min-h-0 border-transparent focus-visible:ring-0 cursor-pointer">
                  <span className="text-xs font-medium text-muted-foreground/70">Pinned</span>
                </AccordionTrigger>
                <AccordionContent className="pb-0 pt-1 px-0">
                  <SidebarMenu>
                    {pinnedSessions.map(renderSessionItem)}
                  </SidebarMenu>
                </AccordionContent>
              </AccordionItem>
            )}

            {!isStudioMode && (loading || todaySessions.length > 0 || filtering) && (
            <AccordionItem value="today" className="border-none mb-2">
              <AccordionTrigger className="px-2 py-1.5 hover:no-underline group/acc-trigger [&_[data-slot=accordion-trigger-icon]]:opacity-0 hover:[&_[data-slot=accordion-trigger-icon]]:opacity-100 flex items-center h-auto min-h-0 border-transparent focus-visible:ring-0 cursor-pointer justify-between w-full">
                <span className="text-xs font-medium text-muted-foreground/70 truncate mr-2">
                  {dateFilter && (dateFilter.from || dateFilter.to) ? 
                    (dateFilter.to && dateFilter.from && dateFilter.to.getTime() !== dateFilter.from.getTime() 
                      ? `${format(dateFilter.from, 'MMM d')} - ${format(dateFilter.to, 'MMM d')}` 
                      : format(dateFilter.from || dateFilter.to!, 'MMM d')) 
                    : "Today"}
                </span>
                <div onClick={(e) => e.stopPropagation()} className={`pointer-events-auto shrink-0 flex items-center gap-1 justify-end transition-opacity ${filtering ? "" : "opacity-0 group-hover/acc-trigger:opacity-100 focus-within:opacity-100"}`}>
                  {dateFilter && (dateFilter.from || dateFilter.to) && (
                    <button 
                      onClick={() => setDateFilter(undefined)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <NikhilDateCalendar 
                     value={dateFilter} 
                     onChange={setDateFilter}
                     iconOnly={true}
                     className="h-6 w-7 p-1.5 flex items-center justify-center border-none shadow-none bg-transparent hover:bg-muted text-[11px]"
                     placeholder=""
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pt-1 px-0">
                <SidebarMenu>
                  {loading && (
                    <div className="px-2 py-1.5 space-y-3">
                      <div className="h-4 w-[80%] rounded-md bg-muted animate-pulse" />
                      <div className="h-4 w-[60%] rounded-md bg-muted animate-pulse" />
                      <div className="h-4 w-[70%] rounded-md bg-muted animate-pulse" />
                    </div>
                  )}
                  {!loading && todaySessions.length === 0 && <div className="px-2 text-xs text-muted-foreground py-2">{dateFilter && (dateFilter.from || dateFilter.to) ? "No chats in this period" : "No chats today"}</div>}
                  {todaySessions.map(renderSessionItem)}
                </SidebarMenu>
              </AccordionContent>
            </AccordionItem>
            )}

            {!isStudioMode && (previousSessions.length > 0 || filtering) && (
            <AccordionItem value="previous" className="border-none">
              <AccordionTrigger className="px-2 py-1.5 hover:no-underline group/acc-trigger [&_[data-slot=accordion-trigger-icon]]:opacity-0 hover:[&_[data-slot=accordion-trigger-icon]]:opacity-100 flex items-center h-auto min-h-0 border-transparent focus-visible:ring-0 cursor-pointer justify-between w-full">
                <span className="text-xs font-medium text-muted-foreground/70 truncate mr-2">Previous</span>
                <div onClick={(e) => e.stopPropagation()} className={`pointer-events-auto shrink-0 flex items-center gap-1 justify-end transition-opacity ${filtering ? "" : "opacity-0 group-hover/acc-trigger:opacity-100 focus-within:opacity-100"}`}>
                  {dateFilter && (dateFilter.from || dateFilter.to) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDateFilter(undefined);
                      }}
                      className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <NikhilDateCalendar 
                     value={dateFilter} 
                     onChange={setDateFilter}
                     iconOnly={true}
                     className="h-6 w-7 p-1.5 flex items-center justify-center border-none shadow-none bg-transparent hover:bg-muted text-[11px]"
                     placeholder=""
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pt-1 px-0">
                <SidebarMenu>
                  {!loading && previousSessions.length === 0 && <div className="px-2 text-xs text-muted-foreground py-2">{dateFilter && (dateFilter.from || dateFilter.to) ? "No chats in this period" : "No previous chats"}</div>}
                  {visiblePreviousSessions.map(renderSessionItem)}
                  {hiddenPreviousCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllPrevious(true)}
                      className="w-full px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                    >
                      Show {hiddenPreviousCount} more
                    </button>
                  )}
                </SidebarMenu>
              </AccordionContent>
            </AccordionItem>
            )}
          </Accordion>
          {isStudioMode && studioProjects}
          {/* Desktop app: chats the other accounts on this computer had; opening one lets this account go on with it */}
          {otherChats.some((a) => a.chats.some((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))) && (
            <div className="mt-3">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground/70">From your other accounts on this computer</div>
              {otherChats.map((a) => {
                const chats = a.chats.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
                if (!chats.length) return null;
                const full = fullOther.includes(a.userId) || !!searchQuery;
                const shown = full ? chats : chats.slice(0, 5);
                return (
                  <div key={a.userId} className="mb-1">
                    <div className="px-2 pt-1 pb-0.5 text-xs text-muted-foreground break-all">{a.email || "Another account"}</div>
                    <SidebarMenu>
                      {shown.map((c) => (
                        <SidebarMenuItem key={c.id}>
                          <SidebarMenuButton
                            isActive={activeOther === `${a.userId}/${c.id}`}
                            onClick={() => openOtherChat(a, c)}
                            className="h-auto cursor-pointer flex-1 min-w-0 py-1.5"
                            render={
                              <div className="flex items-center gap-2.5 w-full min-w-0">
                                <span className="truncate block min-w-0 flex-1">{c.title}</span>
                              </div>
                            }
                          />
                        </SidebarMenuItem>
                      ))}
                      {!full && chats.length > shown.length && (
                        <button
                          type="button"
                          onClick={() => setFullOther((prev) => [...prev, a.userId])}
                          className="w-full px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                        >
                          Show {chats.length - shown.length} more
                        </button>
                      )}
                    </SidebarMenu>
                  </div>
                );
              })}
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
      </div>

      {/* Share Modal - Exact ChatGPT Replica (Light & Dark Mode Support) */}
      {shareModalOpen && shareSessionId && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur-sm" onClick={() => { setShareModalOpen(false); setPublicShareUrl(null); setLinkCopied(false); }}>
          <div className="bg-white dark:bg-[#212121] text-slate-900 dark:text-[#ececf1] rounded-3xl w-[760px] max-w-[95vw] shadow-2xl overflow-hidden font-sans border-0 dark:border dark:border-white/10" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-[26px] font-bold truncate pr-4 text-slate-900 dark:text-white tracking-tight">
                {sessions.find(s => s.id === shareSessionId)?.title || "Share Chat"}
              </h3>
              <button
                onClick={() => { setShareModalOpen(false); setPublicShareUrl(null); setLinkCopied(false); }}
                className="text-slate-500 hover:text-slate-800 dark:text-white/70 dark:hover:text-white rounded-lg p-2 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Preview Card */}
            <div className="px-8 pt-6 pb-2">
              <div className="bg-white dark:bg-[#2f2f2f] rounded-2xl p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-none dark:border dark:border-white/10 relative overflow-hidden flex flex-col h-[380px]">
                
                {/* Simulated Chat Content - Using Exact Classgrid Chat Styling */}
                <div className="flex flex-col gap-6">
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center h-full pt-16">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-300 dark:text-white/20" />
                    </div>
                  ) : (
                    sharePreviewMessages
                      .filter((msg: any) => {
                        let contentStr = typeof msg.content === 'object' && msg.content !== null ? msg.content.content || JSON.stringify(msg.content) : String(msg.content || '');
                        if (typeof contentStr === 'string' && contentStr.trim().startsWith('{')) {
                           try {
                             const parsed = JSON.parse(contentStr);
                             if (parsed && typeof parsed.content === 'string') contentStr = parsed.content;
                           } catch(e) {}
                        }
                        if (msg.role === 'user') {
                            if (contentStr.trim().startsWith('[SYSTEM:')) return false;
                            return true;
                        }
                        const textOnly = contentStr.replace(/```[\s\S]*?```/g, "").trim();
                        return textOnly.length > 0;
                      })
                      .slice(0, 4)
                      .map((msg: any, idx: number) => {
                      const isUser = msg.role === 'user';
                      let safeContent = typeof msg.content === 'object' && msg.content !== null ? msg.content.content || JSON.stringify(msg.content) : String(msg.content || '');
                      if (typeof safeContent === 'string' && safeContent.trim().startsWith('{')) {
                           try {
                             const parsed = JSON.parse(safeContent);
                             if (parsed && typeof parsed.content === 'string') safeContent = parsed.content;
                           } catch(e) {}
                      }
                      return (
                        <div key={idx} className={isUser ? "bg-[#f1f1ef] dark:bg-[#2C2C2C] px-[14px] py-[6px] rounded-[16px] max-w-[85%] self-end" : "text-[15px] leading-[1.6] text-[#2C2C2B] dark:text-[#F0EFED] w-full"}>
                          {isUser ? (
                            <p className="text-[16px] leading-[24px] text-[#37352f] dark:text-[#F0EFED] break-words whitespace-pre-wrap">{safeContent}</p>
                          ) : (
                            <div className="whitespace-pre-wrap text-[14px]">{
                              safeContent
                                .replace(/```[\s\S]*?```/g, "")
                                .trim()
                            }</div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
                
                {/* The Fade Out Gradient (Adapts to Light/Dark) */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 dark:from-[#2f2f2f] dark:via-[#2f2f2f]/90 to-transparent flex items-end justify-end p-5">
                  {/* Classgrid Watermark */}
                  <span className="font-bold text-slate-900 dark:text-white text-xl tracking-tight select-none">CLASSGRID</span>
                </div>
              </div>
            </div>

            {/* Actions Grid (4 HUGE BUTTONS) */}
            <div className="px-8 pb-10 pt-6 flex items-center justify-center gap-7">
              
              {/* Copy Link */}
              <button
                className="flex flex-col items-center gap-3 group cursor-pointer"
                onClick={async () => {
                  if (publicShareUrl) {
                    await navigator.clipboard.writeText(publicShareUrl);
                    setLinkCopied(true);
                    toast.success("Link copied!");
                    setTimeout(() => setLinkCopied(false), 2000);
                  } else {
                    handleCreatePublicLink(shareSessionId);
                  }
                }}
                disabled={isCreatingLink}
              >
                <div className="w-[56px] h-[56px] rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-transform hover:scale-105 shadow-sm">
                  {isCreatingLink ? <Loader2 className="w-6 h-6 animate-spin" /> : linkCopied ? <Check className="w-6 h-6" /> : <Link2 className="w-6 h-6" />}
                </div>
                <span className="text-[12px] text-slate-400 dark:text-white/60 font-medium">Copy link</span>
              </button>

              {/* WhatsApp */}
              <button
                className="flex flex-col items-center gap-3 group cursor-pointer"
                onClick={() => handleSharePlatform('whatsapp')}
                disabled={isCreatingLink}
              >
                <div className={`w-[56px] h-[56px] rounded-full flex items-center justify-center transition-transform shadow-sm bg-primary text-primary-foreground hover:scale-105`}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <span className="text-[12px] text-slate-400 dark:text-white/60 font-medium">WhatsApp</span>
              </button>

              {/* LinkedIn */}
              <button
                className="flex flex-col items-center gap-3 group cursor-pointer"
                onClick={() => handleSharePlatform('linkedin')}
                disabled={isCreatingLink}
              >
                <div className={`w-[56px] h-[56px] rounded-full flex items-center justify-center transition-transform shadow-sm bg-primary text-primary-foreground hover:scale-105`}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>
                <span className="text-[12px] text-slate-400 dark:text-white/60 font-medium">LinkedIn</span>
              </button>

              {/* Email */}
              <button
                className="flex flex-col items-center gap-3 group cursor-pointer"
                onClick={() => handleShareEmail(shareSessionId)}
                disabled={isSharingEmail || sharedEmailSuccess}
              >
                <div className={`w-[56px] h-[56px] rounded-full flex items-center justify-center transition-transform shadow-sm ${sharedEmailSuccess ? 'bg-green-600 text-white hover:scale-105' : 'bg-primary text-primary-foreground hover:scale-105'}`}>
                  {sharedEmailSuccess ? <Check className="w-6 h-6" /> : isSharingEmail ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mail className="w-6 h-6" />}
                </div>
                <span className="text-[12px] text-slate-400 dark:text-white/60 font-medium">Email</span>
              </button>

            </div>
          </div>
        </div>,
        document.body
      )}
      <Dialog open={newProjectFor !== null} onOpenChange={(open) => { if (!open) setNewProjectFor(null); }}>
        <DialogContent className="sm:max-w-[440px]" overlayClassName="supports-backdrop-filter:backdrop-blur-none !backdrop-blur-none !bg-black/40">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-medium text-muted-foreground" htmlFor="move-new-project-name">Project name</label>
            <div className="relative">
              <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="move-new-project-name"
                autoFocus
                className="pl-9"
                placeholder="My project"
                maxLength={80}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createProjectAndMove(); }}
              />
            </div>
            <p className="text-[12.5px] text-muted-foreground">The chat moves into this project and continues in Project Mode.</p>
          </div>
          <DialogFooter>
            <Button variant="secondary" disabled={!newProjectName.trim() || isMovingChat} onClick={createProjectAndMove}>
              {isMovingChat && <Spinner className="size-4 mr-2" />}
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DangerConfirmDialog
        open={deleteSessionId !== null}
        onOpenChange={(open) => { if (!open) setDeleteSessionId(null); }}
        title={deleteIsShared ? "Leave chat" : "Delete chat"}
        description={deleteIsShared ? "This removes the shared chat from your list. It stays for the other people in it." : "This will permanently delete this chat and all its messages. This action cannot be undone."}
        warningMessage={deleteIsShared ? "You will leave this shared chat." : "This chat will be permanently deleted."}
        actionLabel={deleteIsShared ? "Leave chat" : "Delete chat"}
        isLoading={isDeletingSession}
        onConfirm={() => { if (deleteSessionId) handleDeleteSession(deleteSessionId); }}
      />
      {isStudioMode && <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} onCreated={(p) => openStudioProject(p.id)} />}
      <GroupDialog
        open={groupDialog !== null}
        project={groupDialog?.project || null}
        group={groupDialog?.group}
        sessionId={groupDialog?.sessionId}
        onClose={() => setGroupDialog(null)}
      />
      <DangerConfirmDialog
        open={deleteGroup !== null}
        onOpenChange={(open) => { if (!open && !isDeletingGroup) setDeleteGroup(null); }}
        title="Delete group"
        description={deleteGroup ? `"${deleteGroup.name}" will be deleted. Its chats are kept and go back to your chat list.` : ""}
        warningMessage="Only the group is deleted, not its chats."
        actionLabel="Delete group"
        isLoading={isDeletingGroup}
        onConfirm={async () => {
          if (!deleteGroup) return;
          setIsDeletingGroup(true);
          try { await groupsApi.remove(deleteGroup.id); toast.success("Group deleted"); setDeleteGroup(null); }
          catch (e: any) { toast.error(e?.message || "Could not delete the group"); }
          finally { setIsDeletingGroup(false); }
        }}
      />
    </>
  );
}
