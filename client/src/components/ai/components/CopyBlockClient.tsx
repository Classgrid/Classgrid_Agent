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

import { useState } from 'react';
import { Check, Copy, Mail, MessageSquare, Terminal } from 'lucide-react';

export function CopyBlockClient({ text, label = 'copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-6 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#18181b] overflow-hidden text-sm shadow-sm dark:shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-end px-3 py-1.5 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#1f1f23] min-h-[36px]">
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5"
          title="Copy text"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 text-slate-700 dark:text-zinc-300 text-[15px] leading-relaxed whitespace-pre-wrap break-words font-sans">
        {text}
      </div>
    </div>
  );
}
