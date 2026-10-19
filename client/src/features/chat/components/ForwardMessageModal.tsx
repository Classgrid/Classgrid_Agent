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

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/marketing_ui/dialog";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Check, Search, Users } from "lucide-react";
import type { ChatThread } from "../services/chatApi";
import { getInitials } from "@/lib/utils";

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  threads: ChatThread[];
  onForward: (targetThreadIds: string[]) => Promise<void> | void;
  onNewGroup: () => void;
  selectedMessageCount: number;
}

export function ForwardMessageModal({
  isOpen,
  onClose,
  threads,
  onForward,
  onNewGroup,
  selectedMessageCount,
}: ForwardMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(new Set());
  const [isForwarding, setIsForwarding] = useState(false);

  const filteredThreads = threads.filter((t) => {
    const isAnnouncementMode = t.sendMessagesPolicy === "admin_only";
    const amIMember = t.myRole === "member";
    const isInputDisabled = (isAnnouncementMode || t.allowReplies === false) && amIMember;
    
    if (isInputDisabled) return false;
    
    return t.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleToggleSelect = (threadId: string) => {
    const next = new Set(selectedTargetIds);
    if (next.has(threadId)) {
      next.delete(threadId);
    } else {
      next.add(threadId);
    }
    setSelectedTargetIds(next);
  };

  const handleForward = async () => {
    if (selectedTargetIds.size > 0) {
      setIsForwarding(true);
      try {
        await onForward(Array.from(selectedTargetIds));
      } finally {
        setIsForwarding(false);
        setSelectedTargetIds(new Set());
        setSearchQuery("");
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 flex flex-col max-h-[85vh] bg-black border border-white/10 overflow-hidden text-white">
        <DialogHeader className="p-4 pb-2 border-b border-white/10 bg-black">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Forward message to</DialogTitle>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
            <Input
              placeholder="Search name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus-visible:ring-0 rounded-full h-10"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2 bg-[#0f0f0f]">

          <div className="px-2 py-1 mb-1 text-xs font-semibold text-white/50 uppercase tracking-wider">
            Recent chats
          </div>
          {filteredThreads.map((thread) => {
            const isSelected = selectedTargetIds.has(thread.id);
            return (
              <div
                key={thread.id}
                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => handleToggleSelect(thread.id)}
              >
                <div className="shrink-0 flex items-center justify-center">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/20 bg-transparent"}`}>
                    {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </div>
                </div>
                
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-white/5 text-white/80 font-bold">
                  {thread.avatar ? (
                    <img
                      src={thread.avatar}
                      alt={thread.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(thread.name)
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate text-white/90">{thread.name}</h4>
                  {thread.role && <p className="text-xs text-white/50 truncate">{thread.role}</p>}
                </div>
              </div>
            );
          })}
          {filteredThreads.length === 0 && (
            <div className="text-center text-white/50 py-8 text-sm">
              No chats found
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-[#0f0f0f] flex items-center justify-between">
          <div className="text-sm font-medium text-white/70">
            {selectedTargetIds.size > 0 ? `${selectedTargetIds.size} selected` : "No chats selected"}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Close
            </Button>
            <Button
              onClick={handleForward}
              disabled={selectedTargetIds.size === 0 || isForwarding}
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
            >
              {isForwarding ? (
                <>
                  <Spinner className="mr-2 w-4 h-4 text-white" />
                  Forwarding...
                </>
              ) : (
                <>Forward {selectedMessageCount > 0 ? selectedMessageCount : ""} {selectedMessageCount === 1 ? "message" : selectedMessageCount > 1 ? "messages" : ""}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
