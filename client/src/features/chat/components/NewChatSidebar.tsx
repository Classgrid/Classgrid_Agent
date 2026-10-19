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

import { useState, useMemo } from "react";
import { ArrowLeft, Search, Users, Check, MessageSquarePlus, X, Filter, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Input } from "@/components/marketing_ui/input";
import { DEFAULT_USER_AVATAR } from "@/lib/constants";
import type { OrgUser, ChatGroup } from "../services/chatApi";
import { exploreGroups } from "../services/chatApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { GroupBlueMark } from "@/components/marketing_ui/group-blue-mark";

interface NewChatSidebarProps {
  onClose: () => void;
  users: OrgUser[];
  currentUserId: string;
  onSelectUser: (userId: string) => Promise<void>;
  isLoading: boolean;
  onNewGroup: () => void;
}

export function NewChatSidebar({
  onClose,
  users,
  currentUserId,
  onSelectUser,
  isLoading,
  onNewGroup,
}: NewChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string>("contacts");

  const { data: exploreData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["explore-groups"],
    queryFn: exploreGroups,
  });

  const queryClient = useQueryClient();

  const { mutate: requestJoin, isPending: isRequesting } = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiClient.post(`/api/group-chat/${groupId}/join-request`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Join request sent!");
      queryClient.invalidateQueries({ queryKey: ["explore-groups"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to send request");
    }
  });

  const { mutate: joinPublicGroup, isPending: isJoining } = useMutation({
    mutationFn: async (groupId: string) => {
      // Actually we need an endpoint to just join directly if it's public.
      // Or we can just use the join-request endpoint if the backend auto-approves public groups.
      // Wait, there is no direct join endpoint right now for public groups. Let's use join-request and the backend will need to handle it or we add a direct join endpoint.
      const res = await apiClient.post(`/api/group-chat/${groupId}/join`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Joined group successfully!");
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      onClose(); // Ideally navigate to the group
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to join group");
    }
  });

  const filteredUsers = useMemo(() => {
    let list = users.filter((u) => u._id !== currentUserId);
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          (u.email && u.email.toLowerCase().includes(query)) ||
          (u.role && u.role.toLowerCase().includes(query))
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, search, currentUserId]);

  const filteredGroups = useMemo(() => {
    let list = exploreData || [];
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(query));
    }
    return list;
  }, [exploreData, search]);

  return (
    <motion.div
      initial={{ x: "-100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
      className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-black"
    >
      {/* Header */}
      <div className="h-16 shrink-0 flex items-center px-4 gap-4 border-b border-border">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-foreground">New chat</h2>
      </div>

      {/* Search & Filter */}
      <div className="p-2 border-b border-border bg-white dark:bg-black flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 h-9 text-sm bg-[#fafafa] dark:bg-[#0f0f0f] border-none rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground placeholder:text-muted-foreground/70"
          />
        </div>
        <div className="flex bg-[#fafafa] dark:bg-[#0f0f0f] rounded-lg p-0.5 border border-border/50 shadow-sm">
          <button
            onClick={() => setFilterType("contacts")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filterType === "contacts" ? "bg-white dark:bg-black shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Contacts
          </button>
          <button
            onClick={() => setFilterType("groups")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filterType === "groups" ? "bg-white dark:bg-black shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Groups
          </button>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-[#fafafa] dark:bg-[#0f0f0f]">
        {isLoading || isGroupsLoading ? (
          <div className="flex justify-center p-8">
            <Spinner className="w-6 h-6 text-primary" />
          </div>
        ) : (
          <div className="flex flex-col py-2">
            {/* New Group Button */}
            <button
              onClick={onNewGroup}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 border-b border-border pb-3 pt-1">
                <p className="text-[17px] font-medium text-foreground">New group</p>
              </div>
            </button>

            {/* Explore Groups */}
            {filterType === "groups" && filteredGroups.length > 0 && (
              <>
                <div className="px-5 py-3 pt-5">
                  <p className="text-[14px] font-medium text-emerald-600 uppercase tracking-wide">Explore Groups</p>
                </div>
                {filteredGroups.map((group, index) => (
                  <div key={group.id} className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                      {group.avatar_url ? (
                        <img src={group.avatar_url} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 pb-3 pt-1 ${index !== filteredGroups.length - 1 ? 'border-b border-border' : ''}`}>
                      <p className="text-[17px] font-medium text-foreground flex items-center gap-1.5 truncate">
                        {group.name}
                        <GroupBlueMark isOfficial={!!(group.is_official || group.is_created_by_super_admin)} className="shrink-0" />
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-0.5">
                        {group.member_count} members • Admin: {group.creator?.name || 'Unknown'}
                      </p>
                      {group.creator?.email && (
                        <p className="text-[11px] text-muted-foreground/70 truncate">{group.creator.email}</p>
                      )}
                    </div>
                    <div className="shrink-0 pl-2">
                      {group.require_join_approval ? (
                        <button 
                          onClick={() => requestJoin(group.id)}
                          disabled={isRequesting || group.has_pending_request}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors flex items-center gap-1 ${
                            group.has_pending_request 
                              ? 'bg-muted text-muted-foreground cursor-not-allowed'
                              : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                          }`}
                        >
                          <UserPlus className="w-3 h-3" /> {group.has_pending_request ? "Requested" : "Request"}
                        </button>
                      ) : (
                        <button 
                          onClick={() => joinPublicGroup(group.id)}
                          disabled={isJoining}
                          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white text-xs font-semibold rounded-full transition-colors flex items-center gap-1"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Contacts */}
            {filterType === "contacts" && (
              <>
                <div className="px-5 py-3 pt-5 border-t border-border mt-2">
                  <p className="text-[14px] font-medium text-emerald-600 uppercase tracking-wide">Contacts on Classgrid</p>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground text-sm">
                    No contacts found matching "{search}"
                  </div>
                ) : (
                  filteredUsers.map((user, index) => {
                    const isSelected = selectedId === user._id;
                    return (
                    <button
                      key={user._id}
                      onClick={() => setSelectedId(isSelected ? null : user._id)}
                      className={`w-full flex items-center gap-4 px-4 py-2 transition-colors text-left group ${isSelected ? 'bg-primary/5' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      <div className={`relative w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden transition-opacity duration-200 ${isSelected ? 'opacity-60' : 'bg-primary/10 text-primary'}`}>
                        {user.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt=""
                            className="w-full h-full rounded-full object-cover bg-primary/10 border border-border/50"
                          />
                        ) : (
                          <img
                            src={DEFAULT_USER_AVATAR}
                            alt=""
                            className="w-full h-full rounded-full object-cover bg-primary/10 border border-border/50"
                          />
                        )}
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-background shadow-sm z-10">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className={`flex-1 min-w-0 pb-3 pt-1 ${index !== filteredUsers.length - 1 ? 'border-b border-border' : ''}`}>
                        <p className={`text-[17px] truncate transition-colors duration-200 ${isSelected ? 'text-primary font-medium' : 'text-foreground group-hover:text-foreground/90'}`}>{user.name}</p>
                        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                          {user.role ? (user.role === 'super_admin' ? 'Classgrid Staff' : user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : 'Member'} {user.email ? `• ${user.email}` : ""}
                        </p>
                      </div>
                      {isSelected && (
                        <div
                          className="shrink-0 p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-foreground -ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(null);
                          }}
                          title="Deselect"
                        >
                          <X className="w-5 h-5" />
                        </div>
                      )}
                    </button>
                  )})
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky Action Button */}
      <AnimatePresence>
        {selectedId !== null && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-20"
          >
            <button
              onClick={async () => {
                if (!selectedId) return;
                setIsSubmitting(true);
                try {
                  await onSelectUser(selectedId);
                  onClose();
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Spinner className="w-5 h-5 text-white" />
              ) : (
                <>
                  <MessageSquarePlus className="w-5 h-5" />
                  <span>Start Chat</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
