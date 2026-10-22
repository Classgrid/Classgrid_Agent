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
import { MessageSquare, Plus, Search, Pin, MoreHorizontal, Pencil, Trash2, Share, Copy, Mail, Check, Link2, FileText, ExternalLink, X, Loader2, SquarePen, Calendar, Library, FolderInput, FolderPlus, Folder, Star } from "lucide-react";
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

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  pinned?: boolean;
  ended?: boolean;
}

const ChatBubbleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path fill="none" d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092a10 10 0 1 0-4.777-4.719" />
  </svg>
);

export function AgentNestedMenu({ searchQuery = "" }: { searchQuery?: string }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [dateFilter, setDateFilter] = React.useState<{ from?: Date; to?: Date } | undefined>();

  const [pinnedOpen, setPinnedOpen] = React.useState(false);
  const [recentOpen, setRecentOpen] = React.useState(false);

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
  const [projects, setProjects] = React.useState<{ id: string; name: string }[] | null>(null);
  const [newProjectFor, setNewProjectFor] = React.useState<string | null>(null);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [isMovingChat, setIsMovingChat] = React.useState(false);
  const [isDeletingSession, setIsDeletingSession] = React.useState(false);

  React.useEffect(() => {
    const handleActiveSessionChanged = (e: any) => {
      setActiveSessionId(e.detail?.sessionId || null);
    };
    window.addEventListener("agent:active-session-changed", handleActiveSessionChanged);
    return () => window.removeEventListener("agent:active-session-changed", handleActiveSessionChanged);
  }, []);

  // silent: refresh in the background without the grey loading bars (used after the first load)
  const fetchSessions = (silent = false) => {
    if (!silent) setLoading(true);
    const endpoint = typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in") + "/api/ai/sessions"
      : "/api/ai/sessions";

    // Agent mode and Project mode keep separate chat lists (Project mode: the open project's chats, or all project chats on the Projects page)
    let listQuery = "?mode=agent";
    if (window.location.pathname.split("/").includes("project")) {
      let openProject: string | null = null;
      try { openProject = localStorage.getItem("cg_project_open"); } catch { /* storage blocked */ }
      listQuery = `?project=${openProject || "all"}`; // no project open: chats of all projects
    }
    fetchWithRescue(endpoint + listQuery, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.sessions) setSessions(data.sessions);
      })
      .catch(err => console.error("Failed to load sessions", err))
      .finally(() => setLoading(false));
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

    window.addEventListener("agent:refresh-sessions", handleRefresh);
    window.addEventListener("agent:session-created", handleCreated);
    return () => {
      window.removeEventListener("agent:refresh-sessions", handleRefresh);
      window.removeEventListener("agent:session-created", handleCreated);
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

  const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const pinnedSessions = filteredSessions.filter(s => s.pinned);
  const unpinnedSessions = filteredSessions.filter(s => !s.pinned);

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
  // Switching between Agent and Project mode shows that mode's own chats
  React.useEffect(() => { fetchSessions(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isProjectMode]);

  // Extract base path robustly by finding the 'agent' segment
  const pathParts = location.pathname.split('/');
  const agentIndex = pathParts.indexOf('agent') !== -1 ? pathParts.indexOf('agent') : pathParts.indexOf('project');
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

  const loadProjects = () => {
    fetchWithRescue(`${endpointPrefix}/api/ide/projects`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setProjects(Array.isArray(data.projects) ? data.projects.map((p: any) => ({ id: String(p.id), name: String(p.name || "Untitled") })) : []))
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
      try { localStorage.removeItem("cg_project_open"); } catch { /* storage blocked */ }
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
              className="h-auto py-1.5 cursor-pointer flex-1 min-w-0"
              render={
                <div className="flex items-center gap-2.5 w-full min-w-0 pr-8">
                  {session.pinned && (
                    <ChatBubbleIcon className="w-[15px] h-[15px] shrink-0 text-muted-foreground/80" />
                  )}
                  <span className="truncate block min-w-0 flex-1">{displayTitle}</span>
                  {/* Share Grid: this chat is shared with other people */}
                  {(session as any).grid && (
                    <Star className="w-3 h-3 shrink-0 fill-current text-amber-500 dark:text-amber-400" aria-label="Shared chat" />
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

                {!isProjectMode && !(session as any).shared && (
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
                        <>
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />
                          {projects.map((p) => (
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
                        </>
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

            {!isProjectMode && (
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
                      tooltip="Recent Chats"
                      render={
                        <div className="flex items-center gap-3 w-full cursor-pointer">
                          <ChatBubbleIcon className="w-[20px] h-[20px]" />
                          <span className="truncate">Recent Chats</span>
                        </div>
                      }
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" sideOffset={10} className="w-[280px] p-2 bg-white dark:bg-[#202123] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl max-h-[70vh] overflow-y-auto">
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

            {!isProjectMode && (
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
          </SidebarMenu>
        </div>

        <SidebarGroupContent>
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

            {(loading || todaySessions.length > 0 || filtering) && (
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

            {(previousSessions.length > 0 || filtering) && (
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
    </>
  );
}
