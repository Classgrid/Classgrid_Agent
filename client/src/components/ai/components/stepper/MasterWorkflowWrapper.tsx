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

// Two modes:
// - Sandbox (no `isFinished` prop): a timer finishes the demo after totalTimeMs, then it loops.
// - Production (`isFinished` passed): the chat decides when the work is done (streaming ended, no step loading).
//   No timers and no loop; the summary shows the real time (durationMs), or the step count for older messages.
function formatWorked(ms: number) {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec} sec`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min} min ${sec} sec` : `${min} min`;
}

export function MasterWorkflowWrapper({
  children,
  title,
  totalTimeMs = 15000, // default to 15s for the sandbox workflows
  isFinished: finishedProp,
  durationMs,
  stepCount,
}: {
  children: React.ReactNode,
  title?: string,
  totalTimeMs?: number,
  isFinished?: boolean,
  durationMs?: number,
  stepCount?: number,
}) {
  const controlled = finishedProp !== undefined;
  const [timerFinished, setIsFinished] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loopKey, setLoopKey] = useState(0);
  const isFinished = controlled ? !!finishedProp : timerFinished;

  useEffect(() => {
    if (controlled) return; // production: no demo timer / loop
    // 1. Finish the workflow
    const finishTimeout = setTimeout(() => {
      setIsFinished(true);
      
      // 2. Wait 3 seconds, then reset and loop!
      const resetTimeout = setTimeout(() => {
        setIsFinished(false);
        setIsExpanded(false);
        setLoopKey(prev => prev + 1); // Remounts children to restart animation
      }, 3000);
      
      return () => clearTimeout(resetTimeout);
    }, totalTimeMs);
    
    return () => clearTimeout(finishTimeout);
  }, [totalTimeMs, loopKey, controlled]);

  const label = controlled
    ? (durationMs && durationMs > 0
        ? `Worked for ${formatWorked(durationMs)}`
        : stepCount
          ? `Worked through ${stepCount} ${stepCount === 1 ? "step" : "steps"}`
          : "Worked")
    : `Worked for ${Math.round(totalTimeMs / 1000)} sec`;

  return (
    <div className="relative" key={loopKey}>
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
            {/* Solid colour: the old shimmer gradient faded to white, so "sec" vanished on the light theme */}
            <span className="font-medium text-[14px] text-slate-600 dark:text-[#cfcfcf]">
              {label}
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
