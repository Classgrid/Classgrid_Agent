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

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShimmerText } from './ShimmerText';

export type StepStatus = 'loading' | 'success' | 'error';

interface AgentStepAccordionProps {
  title: React.ReactNode;
  status: StepStatus;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  executionTimeMs?: number;
}

export function AgentStepAccordion({
  title,
  status: propStatus,
  defaultExpanded = false,
  children,
  icon,
  executionTimeMs
}: AgentStepAccordionProps) {
  // Steps stay collapsed until the user opens them; they never open on their own while running.
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  // Heavy step bodies (terminal output, search results) are only mounted once opened.
  const [hasOpened, setHasOpened] = useState(defaultExpanded);
  const [status, setStatus] = useState<StepStatus>(executionTimeMs ? 'loading' : propStatus);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const toggle = () => {
    setHasOpened(true);
    setIsExpanded(prev => !prev);
  };

  React.useEffect(() => {
    if (!executionTimeMs) {
      setStatus(propStatus);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const timeout = setTimeout(() => {
          setStatus(propStatus);
        }, executionTimeMs);
        observer.disconnect();
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [executionTimeMs, propStatus]);

  return (
    <div ref={containerRef} className="relative z-10 flex flex-col group/accordion">
      {/* Header */}
      <div 
        className="flex items-center gap-3 cursor-pointer group-hover/accordion:bg-muted/30 rounded-lg p-1 pr-3 -ml-1 transition-colors"
        onClick={toggle}
      >
        {/* Tiny Stepper Dot (matches ThoughtStepView) */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1">
          <div className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            status === 'loading' && "bg-muted-foreground/60 animate-pulse",
            status === 'success' && "bg-muted-foreground/40",
            status === 'error' && "bg-destructive/60"
          )} />
        </div>
        
        <div className={cn(
          "flex items-center gap-1.5 font-medium text-[14px]",
          status === 'error' ? "text-red-700 dark:text-[#ff7b72]" : "text-slate-600 dark:text-[#a3a3a3]"
        )}>
          {icon && <span className="text-muted-foreground flex shrink-0 [&>svg]:size-3.5">{icon}</span>}
          <ShimmerText active={status === 'loading'} className="min-w-0 break-words">{title}</ShimmerText>
          <div className="opacity-50 group-hover/accordion:opacity-100 transition-opacity flex items-center justify-center">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "grid transition-all duration-200 ease-in-out",
        isExpanded ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="pl-[36px] pr-2 pb-4">
            {hasOpened && children}
          </div>
        </div>
      </div>
    </div>
  );
}
