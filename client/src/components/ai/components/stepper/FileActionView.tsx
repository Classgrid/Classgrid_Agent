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
import { Laptop } from 'lucide-react';
import { ToolOutputContainer } from './ToolOutputContainer';

interface FileActionViewProps {
  fileName: string;
}

export function FileActionView({ fileName }: FileActionViewProps) {
  return (
    <ToolOutputContainer
      icon={<Laptop className="text-slate-400 dark:text-[#a3a3a3]" strokeWidth={1.5} />}
      toolName="Computer"
      badge="Alpha"
      actionName="Shared file"
    >
      <div className="p-3">
        <span className="text-[14px] leading-[20px] text-slate-700 dark:text-[#d4d4d4] break-words">
          Uploaded {typeof fileName === 'object' ? JSON.stringify(fileName) : fileName} to the computer
        </span>
      </div>
    </ToolOutputContainer>
  );
}
