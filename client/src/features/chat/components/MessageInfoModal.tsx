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

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { CheckCheck, Check, X } from "lucide-react";
import { ChatMessage, fetchMessageInfo, MessageInfo } from "../services/chatApi";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/marketing_ui/spinner";
import { DEFAULT_USER_AVATAR } from "@/lib/constants";
import React, { Suspense } from "react";

const ChatBubble = React.lazy(() => import('./ChatBubble').then(m => ({ default: m.ChatBubble })));

interface MessageInfoModalProps {
  message: ChatMessage | null;
  onClose: () => void;
}

export function MessageInfoModal({ message, onClose }: MessageInfoModalProps) {
  const { data: info, isLoading } = useQuery({
    queryKey: ['message-info', message?.id],
    queryFn: () => fetchMessageInfo(message!.thread_id, message!.id),
    enabled: !!message,
  });

  if (!message) return null;

  const createdTime = new Date(message.created_at);

  return (
    <Dialog open={!!message} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-md p-0 overflow-hidden bg-card border-border sm:rounded-2xl flex flex-col" 
        style={{ maxHeight: '88vh', height: '88vh' }}
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="p-4 bg-muted/50 border-b border-border shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold">Message Info</DialogTitle>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        {/* Message Preview — fixed height, no overflow */}
        <div 
          className="bg-[url('https://i.ibb.co/L5kHQxY/whatsapp-bg.png')] bg-cover border-b border-border flex flex-col items-end shrink-0 relative overflow-hidden"
          style={{ maxHeight: '220px', minHeight: '80px' }}
        >
          <div className="absolute inset-0 bg-[#efeae2]/90 dark:bg-[#0b141a]/90 backdrop-blur-[2px]" />
          <div className="relative z-10 w-full pointer-events-none p-3 flex justify-end overflow-hidden" style={{ maxHeight: '220px' }}>
            <div style={{ maxWidth: '85%' }}>
              <Suspense fallback={<div className="h-16 w-48 bg-muted/50 rounded-xl ml-auto animate-pulse" />}>
                <ChatBubble
                  message={message}
                  isMine={true}
                  currentUserId={message.sender_id}
                  onReply={() => {}}
                  onDelete={() => {}}
                  onEdit={() => {}}
                  onReact={() => {}}
                  showAvatar={false}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Scrollable Info Area */}
        <div className="flex-1 overflow-y-auto" style={{ overflowY: 'auto' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Spinner className="w-6 h-6 text-primary" />
            </div>
          ) : !info ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Failed to load message info
            </div>
          ) : (
            <div className="flex flex-col pb-6">

              {/* Sent Section */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                <Check className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-foreground text-sm uppercase tracking-wide">Sent</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">You</span>
                  </div>
                  <span className="font-medium text-sm text-foreground">You</span>
                </div>
                <span className="text-xs text-muted-foreground">{format(createdTime, "MMM d, h:mm a")}</span>
              </div>

              {/* Read By Section */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 mt-2">
                <CheckCheck className="w-5 h-5 text-[#53bdeb] shrink-0" />
                <span className="font-semibold text-foreground text-sm uppercase tracking-wide">Read by</span>
              </div>
              {info.readBy.length === 0 ? (
                <div className="px-4 py-4 border-b border-border/40">
                  <p className="text-sm text-muted-foreground italic">No one has read this yet.</p>
                </div>
              ) : (
                info.readBy.map(user => (
                  <div key={user.id} className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar && user.avatar.length > 2 ? user.avatar : DEFAULT_USER_AVATAR} 
                        alt="" 
                        className="w-10 h-10 rounded-full object-cover shrink-0 bg-primary/10 border border-border" 
                      />
                      <span className="font-medium text-sm text-foreground">{user.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(user.readAt), "MMM d, h:mm a")}</span>
                  </div>
                ))
              )}

              {/* Delivered To Section */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 mt-2">
                <CheckCheck className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-foreground text-sm uppercase tracking-wide">Delivered to</span>
              </div>
              {info.deliveredTo.length === 0 ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-muted-foreground italic">No pending deliveries.</p>
                </div>
              ) : (
                info.deliveredTo.map(user => (
                  <div key={user.id} className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar && user.avatar.length > 2 ? user.avatar : DEFAULT_USER_AVATAR} 
                        alt="" 
                        className="w-10 h-10 rounded-full object-cover shrink-0 bg-primary/10 border border-border" 
                      />
                      <span className="font-medium text-sm text-foreground">{user.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(createdTime, "MMM d, h:mm a")}</span>
                  </div>
                ))
              )}

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
