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
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface KnowledgeBaseResult {
  title: string;
  source?: string;
  icon?: React.ReactNode;
}

interface KnowledgeBaseSearchViewProps {
  providerIcon?: React.ReactNode;
  results?: KnowledgeBaseResult[];
  error?: string;
}

export function KnowledgeBaseSearchView({ providerIcon, results = [], error }: KnowledgeBaseSearchViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (error) {
    return (
      <div className="flex flex-col">
        <div className="bg-white dark:bg-[#151515] rounded-xl border border-slate-200/60 dark:border-white/10 flex flex-col overflow-hidden shadow-sm dark:shadow-none w-full max-w-[550px]">
          <div className="px-4 py-3 flex items-center gap-2 text-[14px]">
            <span className="text-slate-500 dark:text-[#a3a3a3]">{error}</span>
            <span className="text-red-700 dark:text-[#ff7b72] font-medium">Failed</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col">
      <div className="flex items-start gap-3 p-1 pr-3 -ml-1">
        {/* Tiny Stepper Dot */}
        <div className="flex h-[44px] w-8 shrink-0 items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-[#4a4a4a] transition-colors" />
        </div>

        {/* The List Card */}
        <div className="flex-1 bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden shadow-sm dark:shadow-none max-w-[600px] mt-1 mb-2">
          
          {/* Top: Inner Accordion Trigger */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-4 py-3 text-[14px] text-slate-500 dark:text-[#9b9b9b] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors w-full text-left"
          >
            Found {results.length} results
            {providerIcon && <span className="ml-1 flex items-center opacity-80">{providerIcon}</span>}
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60 ml-0.5" />}
          </button>

        {/* Bottom: Results List */}
        {isExpanded && results.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col pb-2 [scrollbar-color:#D3D1CB_transparent] dark:[scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]">
            {results.map((result, index) => {
              return (
                <div 
                  key={index} 
                  className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                >
                  {/* Internal Icon */}
                  <div className="w-5 h-5 shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                    {result.icon ? result.icon : <FileText className="w-4 h-4" strokeWidth={2} />}
                  </div>
                  
                  {/* Title */}
                  <span className="flex-1 truncate text-[14px] text-slate-700 dark:text-[#c9c9c9] group-hover:text-slate-900 dark:group-hover:text-[#eeeeee] transition-colors leading-[22px]">
                    {typeof result.title === 'object' ? JSON.stringify(result.title) : result.title}
                  </span>

                  {/* Source / Category */}
                  {result.source && (
                    <span className="shrink-0 text-[12px] text-slate-400 dark:text-[#8a8a8a] truncate max-w-[180px]">
                      {typeof result.source === 'object' ? JSON.stringify(result.source) : result.source}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
