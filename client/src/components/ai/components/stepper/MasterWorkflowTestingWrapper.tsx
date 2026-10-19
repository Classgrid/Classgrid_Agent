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

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MasterWorkflowTestingWrapper({
  children,
  title,
  totalTimeMs = 10000 // 5s thinking + 5s execution
}: {
  children: React.ReactNode,
  title?: string,
  totalTimeMs?: number
}) {
  const [isFinished, setIsFinished] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    console.log('MasterBox Mounted! totalTimeMs:', totalTimeMs);
    const timeout = setTimeout(() => {
      console.log('MasterBox Timeout Fired!');
      setIsFinished(true);
    }, totalTimeMs);
    return () => clearTimeout(timeout);
  }, [totalTimeMs]);

  return (
    <div className="relative">
      {/* Master Box Header - Only visible when finished */}
      {isFinished && (
        <button
          className="flex items-center gap-3 cursor-pointer hover:bg-muted/30 rounded-lg p-1 pr-3 -ml-1 transition-colors w-full text-left mb-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* No Stepper Dot for Master Box */}

          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isExpanded ? "rotate-90" : "")}
            />
            <span className="font-medium text-[14px] text-slate-600 dark:text-[#cfcfcf]">
              Worked for {Math.round(totalTimeMs / 1000)} sec
            </span>
          </div>
        </button>
      )}

      {/* Children container */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isFinished && !isExpanded ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto",
        isFinished && isExpanded ? "mt-2" : ""
      )}>
        {children}
      </div>
    </div>
  );
}
