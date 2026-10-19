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

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Users, MessageSquare, MessageSquarePlus, MoreVertical, Star, CheckSquare, CheckCheck, X, Trash2, BellOff, Check, Image as ImageIcon, Video, FileText, Mic, BarChart2, Paperclip, BadgeCheck, XCircle, Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ChatThread } from "../services/chatApi";

import { Input } from "@/components/marketing_ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { DEFAULT_USER_AVATAR, DEFAULT_GROUP_AVATAR } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/marketing_ui/tooltip";
import { useUploadContext } from "../context/UploadContext";

interface ChatSidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (thread: ChatThread) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onMarkAllRead?: () => void;
  isLoading: boolean;
  onlineUsers?: Set<string>;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onBulkDelete?: (threadIds: string[]) => void;
  onBulkMute?: (threadIds: string[]) => void;
  onBulkClear?: (threadIds: string[]) => void;
  onOpenStarredMessages?: () => void;
  onOpenBlockedContacts?: () => void;
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const avatarColors = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function renderSnippet(text: string) {
  if (!text) return null;
  const match = text.match(/^\[(IMAGE|VIDEO|AUDIO|PDF|DOC|FILE|POLL)\]\s*(.*)$/);
  if (match) {
    const type = match[1];
    const content = match[2];
    const iconClass = "w-3.5 h-3.5 mr-1.5 inline-block opacity-70 -mt-0.5";
    switch (type) {
      case 'IMAGE': return <><ImageIcon className={iconClass} /> {content}</>;
      case 'VIDEO': return <><Video className={iconClass} /> {content}</>;
      case 'AUDIO': return <><Mic className={iconClass} /> {content}</>;
      case 'PDF':
      case 'DOC':
      case 'FILE': return <><FileText className={iconClass} /> {content}</>;
      case 'POLL': return <><BarChart2 className={iconClass} /> {content}</>;
      default: return <><Paperclip className={iconClass} /> {content}</>;
    }
  }
  if (text.startsWith('📎')) {
    return <><Paperclip className="w-3.5 h-3.5 mr-1.5 inline-block opacity-70 -mt-0.5" /> {text.replace('📎', '').trim()}</>;
  }

  // Strip any HTML tags (e.g. from mentions)
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.body.textContent?.trim() || "";
}

export function ChatSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onNewGroup,
  onMarkAllRead,
  isLoading,
  onlineUsers,
  activeFilter,
  onFilterChange,
  onBulkDelete,
  onBulkMute,
  onBulkClear,
  onOpenBlockedContacts,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [draftsUpdate, setDraftsUpdate] = useState(0);

  // Get active uploads from the global UploadContext
  const { uploads } = useUploadContext();

  useEffect(() => {
    const handleDraftUpdate = () => setDraftsUpdate(v => v + 1);
    window.addEventListener('chat_draft_updated', handleDraftUpdate);
    return () => window.removeEventListener('chat_draft_updated', handleDraftUpdate);
  }, []);

  const toggleSelection = (threadId: string) => {
    setSelectedChats(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedChats.size > 0) {
      onBulkDelete(Array.from(selectedChats));
      setIsSelectionMode(false);
      setSelectedChats(new Set());
    }
  };

  const handleBulkMute = () => {
    if (onBulkMute && selectedChats.size > 0) {
      onBulkMute(Array.from(selectedChats));
      setIsSelectionMode(false);
      setSelectedChats(new Set());
    }
  };

  const handleBulkClear = () => {
    if (onBulkClear && selectedChats.size > 0) {
      onBulkClear(Array.from(selectedChats));
      setIsSelectionMode(false);
      setSelectedChats(new Set());
    }
  };

  const filtered = threads.filter((t) => {
    // Text search filter
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    
    if (activeFilter === "Archived") {
      return t.isArchived;
    }
    
    if (t.isArchived) return false;

    if (activeFilter === "Unread" && t.unread === 0) return false;
    if (activeFilter === "Mentions" && !t.unreadMentions) return false;
    if (activeFilter === "Groups" && t.type !== "group") return false;
    if (activeFilter === "Admins" && (t.type !== "dm" || !t.role || t.role.toLowerCase() !== "admin")) return false;
    if (activeFilter === "Faculty" && (t.type !== "dm" || !t.role || !t.role.toLowerCase().includes("faculty"))) return false;
    
    return true;
  });

  filtered.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const filters = ["All", "Unread", "Mentions", "Groups", "Admins", "Faculty", "Archived"];

  return (
    <div className="flex flex-col h-full w-full bg-background min-h-0">
      {/* Header */}
      <div className="pt-4 border-b border-border flex flex-col gap-3">
        <div className="px-4">
          <div className="flex items-center justify-between h-9">
            {isSelectionMode ? (
              <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { setIsSelectionMode(false); setSelectedChats(new Set()); }}
                    className="p-1.5 text-muted-foreground hover:bg-muted/80 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-foreground">{selectedChats.size} selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleBulkMute}
                    disabled={selectedChats.size === 0}
                    className="p-2 text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-full transition-colors disabled:opacity-50"
                    title="Mute selected"
                  >
                    <BellOff className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleBulkClear}
                    disabled={selectedChats.size === 0}
                    className="p-2 text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-full transition-colors disabled:opacity-50"
                    title="Clear selected"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    disabled={selectedChats.size === 0}
                    className="p-2 text-danger hover:bg-danger/10 focus:text-danger rounded-full transition-colors disabled:opacity-50"
                    title="Delete selected"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground ml-8">Chats</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onNewChat}
                    className="p-2 text-muted-foreground hover:bg-muted/80 rounded-full transition-colors"
                    title="New Chat"
                  >
                    <MessageSquarePlus className="w-5 h-5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-2 text-muted-foreground hover:bg-muted/80 rounded-full transition-colors outline-none"
                        title="Menu"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={onNewGroup} className="cursor-pointer py-2">
                        <Users className="w-4 h-4 mr-3" />
                        <span>New group</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer py-2" onClick={() => setIsSelectionMode(true)}>
                        <CheckSquare className="w-4 h-4 mr-3" />
                        <span>Select chats</span>
                      </DropdownMenuItem>
                      {onOpenBlockedContacts && (
                        <DropdownMenuItem className="cursor-pointer py-2" onClick={onOpenBlockedContacts}>
                          <Ban className="w-4 h-4 mr-3" />
                          <span>Blocked contacts</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={onMarkAllRead} className="cursor-pointer py-2 text-primary">
                        <CheckCheck className="w-4 h-4 mr-3" />
                        <span>Mark all as read</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search or start a new chat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === f
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-2.5 w-36 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? "No conversations match your search" : "No conversations yet"}
            </p>
            <button
              onClick={onNewChat}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Start a new conversation
            </button>
          </div>
        ) : (
          filtered.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const hasAvatar = thread.avatar && typeof thread.avatar === "string" && thread.avatar.startsWith("http");

            return (
              <button
                key={thread.id}
                onClick={() => {
                  if (isSelectionMode) toggleSelection(thread.id);
                  else onSelectThread(thread);
                }}
                className={`w-full h-auto flex items-center justify-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-accent/50 ${
                  isActive && !isSelectionMode ? "bg-accent" : ""
                } ${isSelectionMode ? "hover:bg-accent" : ""}`}
              >
                {isSelectionMode && (
                  <div className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors mr-1 ${
                    selectedChats.has(thread.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                  }`}>
                    {selectedChats.has(thread.id) && <Check className="w-3.5 h-3.5" />}
                  </div>
                )}
                
                {/* Avatar */}
                <div className="relative shrink-0">
                  {hasAvatar ? (
                    <img
                      src={thread.avatar!}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover bg-background border border-border/50"
                    />
                  ) : (
                    <img
                      src={thread.type === "group" ? DEFAULT_GROUP_AVATAR : DEFAULT_USER_AVATAR}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover bg-background border border-border/50"
                    />
                  )}
                  {thread.type === "dm" && (thread.otherUserId || thread.id) && onlineUsers?.has(thread.otherUserId || thread.id) && (
                    <span 
                      title="Online"
                      className="absolute bottom-0 right-0 z-10 block w-3 h-3 rounded-full bg-emerald-500 border-2 border-background animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                    />
                  )}
                  {thread.unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                      {thread.unread > 99 ? "99+" : thread.unread}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate flex items-center gap-1.5 ${thread.unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                      {thread.name}
                      {thread.isOfficial && (
                        <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20 shrink-0" title="Official Group" />
                      )}
                      {thread.isPinned && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground ml-1 rotate-45"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
                      )}
                    </span>
                    {thread.lastMessageAt && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  
                  {(() => {
                    // 1. Show upload progress if there's an active upload for this thread
                    const threadUploads = uploads[thread.id] || [];
                    const activeUpload = threadUploads.find(u => u.status === 'uploading');
                    const failedUpload = threadUploads.find(u => u.status === 'failed');
                    if (activeUpload) {
                      return (
                        <p className="text-xs truncate mt-0.5 text-blue-500 font-medium">
                          ⬆ Uploading... {activeUpload.progress}%
                        </p>
                      );
                    }
                    if (failedUpload) {
                      return (
                        <p className="text-xs truncate mt-0.5 text-red-500 font-medium">
                          ✕ Upload failed — tap to retry
                        </p>
                      );
                    }

                    // 2. Show draft if exists and thread is not active
                    const draftKey = `chat_draft_${thread.id}`;
                    const draftContent = localStorage.getItem(draftKey);
                    
                    if (draftContent && draftContent.trim() && thread.id !== activeThreadId) {
                      const doc = new DOMParser().parseFromString(draftContent, 'text/html');
                      const plainDraft = doc.body.textContent || "";
                      return (
                        <p className="text-xs truncate mt-0.5 text-orange-500 dark:text-orange-400 font-medium">
                          Draft: <span className="text-muted-foreground font-normal">{plainDraft}</span>
                        </p>
                      );
                    }
                    
                    // 3. Show last message
                    return thread.lastMessage ? (
                      <p className={`text-xs truncate mt-0.5 ${thread.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {renderSnippet(thread.lastMessage)}
                      </p>
                    ) : null;
                  })()}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
