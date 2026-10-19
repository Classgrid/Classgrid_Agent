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

interface AgentStepperProps {
  children: React.ReactNode;
  className?: string;
}

export function AgentStepper({ children, className }: AgentStepperProps) {
  // Generate CSS for up to 30 children to cascade their animations
  const cascadeCss = Array.from({ length: 30 }).map((_, i) => `
    .stepper-container > *:nth-child(${i + 1}) { 
      animation-delay: ${i === 0 ? 0 : i * 70}ms; 
    }
  `).join('');

  return (
    // The pseudo-element creates the vertical connector line perfectly aligned with the dots
    <div className={cn("relative flex flex-col gap-2 pl-2 before:absolute before:top-6 before:bottom-4 before:left-[23px] before:w-[2px] before:bg-slate-200 dark:before:bg-[#2a2a2a] stepper-container", className)}>
      <style>{`
        .stepper-container > * {
          animation: stepFadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        .stepper-container > *:nth-child(1) {
          opacity: 1; /* First element (usually Thought) appears instantly */
          animation: none;
        }
        @keyframes stepFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stepper-container:has(.is-thinking)::before {
          display: none !important;
        }
        ${cascadeCss}
      `}</style>
      {children}
    </div>
  );
}
