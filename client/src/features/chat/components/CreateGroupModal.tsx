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

import { Input } from "@/components/marketing_ui/input";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, Check, Users } from "lucide-react";
import { fetchOrgUsers, createGroup } from "../services/chatApi";
import { Spinner } from "@/components/marketing_ui/spinner";


interface CreateGroupModalProps {
  onClose: () => void;
}

export function CreateGroupModal({ onClose }: CreateGroupModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["org-users"],
    queryFn: fetchOrgUsers,
  });

  const { mutate: handleCreate, isPending } = useMutation({
    mutationFn: () => createGroup(name, Array.from(selectedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      onClose();
    },
  });

  const filteredUsers = users.filter((u) => 
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh] border border-border animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Users className="w-5 h-5 text-primary" /> Create Group
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-hidden flex-1">
          {/* Group Name Input */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Group Name</label>
            <Input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Project Alpha Team"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border outline-none focus:ring-1 focus:ring-primary text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* User Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/30 border border-border outline-none focus:ring-1 focus:ring-primary text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto space-y-1 border border-border bg-muted/10 rounded-lg p-2 min-h-[200px]">
            {isLoading ? (
              <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-primary" /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No users found.</div>
            ) : (
              filteredUsers.map(u => (
                <button
                  key={u._id}
                  onClick={() => toggleUser(u._id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${selectedIds.has(u._id) ? "bg-primary/10" : "hover:bg-muted"}`}
                >
                  <div className="relative shrink-0">
                    {u.profilePicture ? (
                      <img src={u.profilePicture} className="w-9 h-9 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {u.name[0]?.toUpperCase()}
                      </div>
                    )}
                    {selectedIds.has(u._id) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.role.replace('_', ' ')}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between items-center bg-muted/20 rounded-b-xl">
          <span className="text-xs text-muted-foreground font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? 'member' : 'members'} selected
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button 
              onClick={() => handleCreate()} 
              disabled={!name.trim() || selectedIds.size === 0 || isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isPending && <Spinner className="w-4 h-4" />} Create Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
