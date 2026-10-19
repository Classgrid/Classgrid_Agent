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
import { UploadCloud, AlertCircle } from 'lucide-react';
import { ToolOutputContainer } from './ToolOutputContainer';

interface CdnUploadViewProps {
  fileName: string;
  fileSize?: string;
  url: string;
  status?: string;
  error?: string;
}

export function CdnUploadView({ fileName, url, status, error }: CdnUploadViewProps) {
  if (status === 'error' || (!url && status !== 'loading')) {
    return (
      <ToolOutputContainer
        icon={<AlertCircle className="text-red-500" strokeWidth={1.5} />}
        toolName="CDN"
        badge="Failed"
        actionName="Public file upload"
      >
        <div className="p-3 flex flex-col gap-2">
          <span className="text-[14px] leading-[20px] text-red-600 break-words">
            Failed to upload {fileName}.
          </span>
          {error && (
            <span className="text-[12px] text-red-500 font-mono mt-1">
              Error: {error}
            </span>
          )}
        </div>
      </ToolOutputContainer>
    );
  }

  return (
    <ToolOutputContainer
      icon={<UploadCloud className="text-slate-400 dark:text-[#a3a3a3]" strokeWidth={1.5} />}
      toolName="CDN"
      badge="Alpha"
      actionName="Public file upload"
    >
      <div className="p-3 flex flex-col gap-2">
        <span className="text-[14px] leading-[20px] text-slate-700 dark:text-[#d4d4d4] break-words">
          Uploaded {fileName} to the global CDN
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-blue-600 dark:text-blue-400 hover:underline font-mono truncate max-w-full"
          >
            {url}
          </a>
        )}
      </div>
    </ToolOutputContainer>
  );
}
