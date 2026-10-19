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
import { cn } from '@/lib/utils';

interface SimpleLogStepViewProps {
  text: React.ReactNode;
  icon?: React.ReactNode;
}

export function SimpleLogStepView({ text, icon }: SimpleLogStepViewProps) {
  return (
    <div className="relative z-10 flex flex-col">
      <div className="flex items-center gap-3 p-1 pr-3 -ml-1">
        {/* Tiny Stepper Dot (matches ThoughtStepView) */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-[#4a4a4a] transition-colors" />
        </div>
        
        <div className="flex items-center gap-2 font-medium text-[14px] text-slate-500 dark:text-[#8a8a8a]">
          {icon && <span className="flex shrink-0 opacity-80">{icon}</span>}
          <span>{text}</span>
        </div>
      </div>
    </div>
  );
}
