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

import React, { useState } from "react";
import { X, Clock, ShieldAlert } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { useMutation } from "@tanstack/react-query";
import { setDisappearingMessages } from "../services/chatApi";
import { toast } from "sonner";

interface DisappearingMessagesModalProps {
  threadId: string;
  currentTtl?: number; // in seconds
  onClose: () => void;
  onSaved?: (ttl: number) => void;
}

export function DisappearingMessagesModal({ threadId, currentTtl = 0, onClose, onSaved }: DisappearingMessagesModalProps) {
  const [ttl, setTtl] = useState(currentTtl);

  const { mutate, isPending } = useMutation({
    mutationFn: (newTtl: number) => setDisappearingMessages(threadId, newTtl),
    onSuccess: (data) => {
      const savedTtl = Number(data?.ttl ?? ttl);
      onSaved?.(savedTtl);
      toast.success("Disappearing messages updated");
      onClose();
    },
    onError: () => {
      toast.error("Failed to update disappearing messages");
    }
  });

  const options = [
    { label: "24 hours", value: 24 * 60 * 60 },
    { label: "7 days", value: 7 * 24 * 60 * 60 },
    { label: "90 days", value: 90 * 24 * 60 * 60 },
    { label: "Off", value: 0 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Disappearing messages</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex justify-center text-muted-foreground py-2">
            <Clock className="w-12 h-12 opacity-50" />
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Make messages in this chat disappear for everyone after the selected duration. Anyone in the chat can change this setting.
          </p>

          <div className="space-y-2 mt-6">
            {options.map((option) => (
              <label 
                key={option.value}
                className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium">{option.label}</span>
                <input
                  type="radio"
                  name="disappearing_timer"
                  value={option.value}
                  checked={ttl === option.value}
                  onChange={() => setTtl(option.value)}
                  className="w-4 h-4 text-primary bg-background border-border focus:ring-primary"
                />
              </label>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Messages sent before changing this setting will not be affected.
          </p>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={() => mutate(ttl)}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center min-w-[80px]"
          >
            {isPending ? <Spinner className="w-4 h-4" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
