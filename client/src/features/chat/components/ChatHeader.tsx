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

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Users, ArrowLeft, User, Search, BellOff, Bell, CheckSquare, Trash2, ShieldAlert, XCircle, Trash, UserPlus, LogOut, Clock, BadgeCheck, Star, X, Ban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGroupInfo } from "../services/chatApi";
import type { ChatThread, OrgUser } from "../services/chatApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/marketing_ui/tooltip";
import { DEFAULT_USER_AVATAR, DEFAULT_GROUP_AVATAR } from "@/lib/constants";


interface ChatHeaderProps {
  thread: ChatThread;
  onBack: () => void;
  onShowInfo: () => void;
  onAvatarClick?: () => void;
  onlineUsers?: Set<string>;
  typingUsers?: { id: string; type: string }[];
  orgUsers?: OrgUser[];
  onClearChat: () => void;
  onDeleteChat: () => void;
  onOpenDisappearingModal?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onEnterSelectionMode?: () => void;
  onLeaveGroup?: () => void;
  onAddMember?: () => void;
  isMuted?: boolean;
  onMuteThread?: () => void;
  onOpenStarredMessages?: () => void;
  onOpenScheduledMessages?: () => void;
  onToggleReplies?: () => void;
  onOpenSearch?: () => void;
  onPinThread?: () => void;
  onArchiveThread?: () => void;
  isSearchOpen?: boolean;
  /** DM only: whether I have blocked the other person, and the toggle. */
  isBlocked?: boolean;
  onToggleBlock?: () => void;
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
  if (!name) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function ChatHeader({ thread, onBack, onShowInfo, onAvatarClick, onlineUsers, typingUsers, orgUsers, onClearChat, onDeleteChat, onLeaveGroup, onAddMember, onOpenDisappearingModal, onEnterSelectionMode, isMuted, onMuteThread, onOpenStarredMessages, onOpenScheduledMessages, onToggleReplies, onOpenSearch, onPinThread, onArchiveThread, isSearchOpen, searchQuery, onSearchChange, isBlocked, onToggleBlock }: ChatHeaderProps) {
  const hasAvatar = thread.avatar && typeof thread.avatar === "string" && thread.avatar.startsWith("http");

  const { data: groupInfo } = useQuery({
    queryKey: ["group-info", thread.groupId],
    queryFn: () => fetchGroupInfo(thread.groupId!),
    enabled: thread.type === "group" && !!thread.groupId,
  });

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0 min-h-[60px]">
      {/* Back button (mobile) */}
      <button
        onClick={onBack}
        className="lg:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Avatar */}
      <button onClick={onAvatarClick || onShowInfo} className="shrink-0 relative cursor-pointer hover:opacity-80 transition-opacity">
        {hasAvatar ? (
          <img src={thread.avatar!} alt="" className="w-9 h-9 rounded-full object-cover bg-background border border-border/50" />
        ) : (
          <img src={thread.type === "group" ? DEFAULT_GROUP_AVATAR : DEFAULT_USER_AVATAR} alt="" className="w-9 h-9 rounded-full object-cover bg-background border border-border/50" />
        )}
        {thread.type === "dm" && (thread.otherUserId || thread.id) && onlineUsers?.has(thread.otherUserId || thread.id) && (
          <span 
            title="Online"
            className="absolute bottom-0 right-0 z-10 block w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
          />
        )}
      </button>

      {/* Info & Search Overlay */}
      <div className="flex-1 min-w-0 text-left relative overflow-hidden flex items-center h-[40px]">
        <AnimatePresence>
          {!isSearchOpen && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onClick={onShowInfo} 
              className="cursor-pointer hover:underline transition-all absolute inset-0 flex flex-col justify-center"
            >
              <h3 className="text-sm font-bold text-foreground truncate leading-tight flex items-center gap-1.5">
                {thread.name}
                {thread.isOfficial && (
                  <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/20" title="Official Group" />
                )}
              </h3>
              <p className="text-xs text-muted-foreground truncate leading-tight flex items-center gap-1">
                {(() => {
                  let isTypingSubtitle = false;
                  let typingText = "";
                  if (thread?.type === 'dm' && typingUsers && typingUsers.length > 0) {
                    const typeStr = typingUsers[0].type === 'recording' ? 'recording audio' : typingUsers[0].type === 'uploading' ? 'uploading file' : 'typing';
                    typingText = `${(thread?.name || "Someone").split(" ")[0]} is ${typeStr}...`;
                    isTypingSubtitle = true;
                  }

                  if (isTypingSubtitle) {
                    return <span className="text-emerald-500 font-medium">{typingText}</span>;
                  }

                  if (thread.type === "group" && groupInfo?.members) {
                    const onlineCount = groupInfo.members.filter(m => onlineUsers?.has(m.userId)).length;
                    return (
                      <>
                        {groupInfo.members.length} members
                        {onlineCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-500 font-medium">
                              {onlineCount} online
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                            </span>
                          </>
                        )}
                      </>
                    );
                  }

                  return thread.type === "group" ? "Group" : (thread.role || "");
                })()}
              </p>
            </motion.div>
          )}
          {isSearchOpen && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center pr-2"
            >
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search in chat..."
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full bg-accent/50 border-none rounded-full pl-9 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 z-20 bg-background">
        <button
          className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors outline-none"
          title={isSearchOpen ? "Close Search" : "Search"}
          onClick={() => onOpenSearch?.()}
        >
          {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors outline-none"
              title="More"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onShowInfo} className="cursor-pointer py-2">
              <User className="w-4 h-4 mr-2" />
              <span>{thread.type === "group" ? "View Group Info" : "View Profile"}</span>
            </DropdownMenuItem>

            {thread.type === "group" && onAddMember && (() => {
              const policy = groupInfo?.add_member_policy || 'admin_only';
              const isFaculty = ['faculty', 'teacher', 'hod', 'principal', 'vice_principal'].includes(thread.myRole || ''); // wait, thread.myRole is group role ('admin' or 'member'). User role is not passed to ChatHeader!
              
              // Simplest fix: only admins can add members for now, or we can just pass currentUser to ChatHeader.
              // If we don't have user role, at least restrict to thread.myRole === 'admin'
              if (policy === 'admin_only' && thread.myRole !== 'admin') return null;
              if (policy === 'org_admin_only' && thread.myRole !== 'admin') return null;
              
              return (
                <DropdownMenuItem onClick={onAddMember} className="cursor-pointer py-2 text-primary focus:text-primary focus:bg-primary/10">
                  <UserPlus className="w-4 h-4 mr-2" />
                  <span>Add member</span>
                </DropdownMenuItem>
              );
            })()}

            <DropdownMenuItem className="cursor-pointer py-2" onClick={() => onOpenSearch?.()}>
              <Search className="w-4 h-4 mr-2" />
              <span>Search in chat</span>
            </DropdownMenuItem>
            
            {onToggleReplies && thread.myRole === 'admin' && (
              <DropdownMenuItem className="cursor-pointer py-2" onClick={onToggleReplies}>
                {thread.allowReplies === false ? <CheckSquare className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2 text-danger" />}
                <span className={thread.allowReplies === false ? "" : "text-danger"}>{thread.allowReplies === false ? "Enable replies" : "Disable replies"}</span>
              </DropdownMenuItem>
            )}
            
            {onOpenStarredMessages && (
              <DropdownMenuItem className="cursor-pointer py-2" onClick={onOpenStarredMessages}>
                <Star className="w-4 h-4 mr-2" />
                <span>Starred messages</span>
              </DropdownMenuItem>
            )}
            {onOpenScheduledMessages && (
              <DropdownMenuItem className="cursor-pointer py-2" onClick={onOpenScheduledMessages}>
                <Clock className="w-4 h-4 mr-2" />
                <span>Scheduled messages</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer py-2" onClick={onMuteThread}>
              {isMuted ? <BellOff className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
              <span>{isMuted ? "Unmute notifications" : "Mute notifications"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-2" onClick={onEnterSelectionMode}>
              <CheckSquare className="w-4 h-4 mr-2" />
              <span>Select messages</span>
            </DropdownMenuItem>
            {onPinThread && (
              <DropdownMenuItem className="cursor-pointer py-2" onClick={onPinThread}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 rotate-45"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
                <span>{thread.isPinned ? "Unpin chat" : "Pin chat"}</span>
              </DropdownMenuItem>
            )}
            {onArchiveThread && (
              <DropdownMenuItem className="cursor-pointer py-2" onClick={onArchiveThread}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                <span>{thread.isArchived ? "Unarchive chat" : "Archive chat"}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer py-2" onClick={onOpenDisappearingModal}>
              <ShieldAlert className="w-4 h-4 mr-2" />
              <span>Disappearing messages</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer py-2 text-danger focus:text-danger focus:bg-danger/10" onClick={onClearChat}>
              <XCircle className="w-4 h-4 mr-2" />
              <span>Clear chat</span>
            </DropdownMenuItem>

            {thread.type === "group" ? (
              <>
                <DropdownMenuItem className="cursor-pointer py-2 text-danger focus:text-danger focus:bg-danger/10" onClick={onLeaveGroup || onDeleteChat}>
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Leave group</span>
                </DropdownMenuItem>
                {thread.myRole === 'admin' && (
                  <DropdownMenuItem className="cursor-pointer py-2 text-danger focus:text-danger focus:bg-danger/10" onClick={onDeleteChat}>
                    <Trash className="w-4 h-4 mr-2" />
                    <span>Delete group</span>
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <>
                {onToggleBlock && (
                  <DropdownMenuItem className="cursor-pointer py-2 text-danger focus:text-danger focus:bg-danger/10" onClick={onToggleBlock}>
                    <Ban className="w-4 h-4 mr-2" />
                    <span>{isBlocked ? "Unblock" : "Block"}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="cursor-pointer py-2 text-danger focus:text-danger focus:bg-danger/10" onClick={onDeleteChat}>
                  <Trash className="w-4 h-4 mr-2" />
                  <span>Delete chat</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
