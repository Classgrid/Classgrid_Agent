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

import React from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

interface EmailSentViewProps {
  toCount: number;
  subject: string;
}

export function EmailSentView({ toCount, subject }: EmailSentViewProps) {
  return (
    <div className="flex flex-col">
      {/* The Success Card */}
      <div className="bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between p-4 shadow-sm dark:shadow-none w-full max-w-[400px]">
        
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Success Icon Box */}
          <div className="h-10 w-10 shrink-0 bg-slate-100/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg flex items-center justify-center relative">
            <Send className="h-5 w-5 ml-0.5" />
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#151515] rounded-full p-[1px]">
              <CheckCircle2 className="h-4 w-4 text-slate-800 dark:text-slate-100" />
            </div>
          </div>
          
          {/* Info */}
          <div className="flex flex-col overflow-hidden">
            <span className="text-[14px] font-medium text-slate-800 dark:text-[#eeeeee] truncate">
              Email successfully sent
            </span>
            <span className="text-[13px] text-slate-500 dark:text-[#8a8a8a] mt-0.5 truncate">
              Delivered to {toCount} {toCount === 1 ? 'recipient' : 'recipients'}
            </span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
