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
import { ArrowLeft, Search, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@/components/marketing_ui/spinner";
import { DEFAULT_USER_AVATAR } from "@/lib/constants";
import { toast } from "sonner";
import type { OrgUser } from "../services/chatApi";

interface AddGroupMemberSidebarProps {
  onClose: () => void;
  onBack: () => void;
  users: OrgUser[];
  currentUserId: string;
  onAddMembers: (memberIds: string[]) => Promise<void>;
  isLoading: boolean;
  existingMemberIds?: string[];
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AddGroupMemberSidebar({
  onClose,
  onBack,
  users,
  currentUserId,
  onAddMembers,
  isLoading,
  existingMemberIds = [],
}: AddGroupMemberSidebarProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingSet = useMemo(() => new Set(existingMemberIds), [existingMemberIds]);

  const filteredAndSortedUsers = useMemo(() => {
    let list = users.filter((u) => u._id !== currentUserId && u.role !== 'super_admin' && !existingSet.has(u._id));

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
  }, [users, search, currentUserId, existingSet]);

  const selectedUsersList = useMemo(() => {
    return users.filter(u => selectedIds.has(u._id));
  }, [users, selectedIds]);

  const toggleUser = (userId: string) => {
    const next = new Set(selectedIds);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedIds(next);
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      await onAddMembers(Array.from(selectedIds));
      setSelectedIds(new Set());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ x: "-100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
      className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-black overflow-hidden"
    >
      <div className="flex flex-col w-full h-full relative">
        {/* Header */}
        <div className="h-16 shrink-0 flex items-center px-4 gap-4 border-b border-border bg-white dark:bg-black">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-foreground leading-tight">Add members</h2>
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
          </div>
        </div>

        {/* Selected Chips & Search Area */}
        <div className="p-3 border-b border-border bg-white dark:bg-black flex flex-col gap-3">
          {selectedUsersList.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {selectedUsersList.map(user => (
                <div key={user._id} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-1 border border-border">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[9px] flex items-center justify-center shrink-0">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  <span className="text-xs font-medium truncate max-w-[100px]">{user.name}</span>
                  <button onClick={() => toggleUser(user._id)} className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={selectedIds.size === 0 ? "Search name or role" : ""}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[#fafafa] dark:bg-[#0f0f0f] relative">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner className="w-6 h-6 text-primary" />
            </div>
          ) : (
            <div className="flex flex-col py-2 pb-24">
              {filteredAndSortedUsers.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground text-sm">
                  {search ? `No contacts found matching "${search}"` : "No users available to add"}
                </div>
              ) : (
                filteredAndSortedUsers.map((user, index) => {
                  const isSelected = selectedIds.has(user._id);
                  return (
                    <button
                      key={user._id}
                      onClick={() => toggleUser(user._id)}
                      className="w-full flex items-center gap-4 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left group relative"
                    >
                      <div className={`relative shrink-0 transition-opacity duration-200 ${isSelected ? 'opacity-60' : 'opacity-100'}`}>
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center overflow-hidden">
                          {user.profilePicture ? (
                            <img
                              src={user.profilePicture}
                              alt=""
                              className="w-full h-full object-cover bg-primary/10 border border-border/50"
                            />
                          ) : (
                            <img
                              src={DEFAULT_USER_AVATAR}
                              alt=""
                              className="w-full h-full object-cover bg-primary/10 border border-border/50"
                            />
                          )}
                        </div>
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className={`flex-1 min-w-0 pb-3 pt-1 ${index !== filteredAndSortedUsers.length - 1 ? 'border-b border-border' : ''}`}>
                        <p className={`text-[17px] truncate transition-opacity duration-200 ${isSelected ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {user.name}
                        </p>
                        <p className="text-[13px] text-muted-foreground truncate">
                          {user.role === 'super_admin' ? 'Classgrid Staff' : user.role === 'org_admin' ? 'Organization Admin' : user.metadata?.job_role ? user.metadata.job_role : user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
        
        {/* Sticky Action Button */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-20 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.1)]"
            >
              <button
                onClick={handleAdd}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Spinner className="w-5 h-5 text-white" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Add {selectedIds.size} Member{selectedIds.size !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
