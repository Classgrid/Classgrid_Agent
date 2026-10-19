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
import { ChevronDown, ChevronRight } from 'lucide-react';

interface WebSearchResult {
  title: string;
  url: string;
  snippet?: string;
}

interface WebSearchViewProps {
  query?: string;
  searchDomain?: string;
  results?: WebSearchResult[];
  error?: string;
}

export function WebSearchView({ query, searchDomain, results = [], error }: WebSearchViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const safeError = typeof error === 'object' ? JSON.stringify(error) : String(error || '');
  const safeQuery = typeof query === 'object' ? JSON.stringify(query) : String(query || '');
  const safeSearchDomain = typeof searchDomain === 'object' ? JSON.stringify(searchDomain) : String(searchDomain || '');

  if (error) {
    return (
      <div className="flex flex-col">
        <div className="bg-white dark:bg-[#151515] rounded-xl border border-slate-200/60 dark:border-white/10 flex flex-col overflow-hidden shadow-sm dark:shadow-none w-full max-w-[550px]">
          <div className="px-4 py-3 flex items-center gap-2 text-[14px]">
            <span className="text-slate-500 dark:text-[#a3a3a3]">{safeError}</span>
            <span className="text-red-700 dark:text-[#ff7b72] font-medium">Failed</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* The List Card */}
      <div className="bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden shadow-sm dark:shadow-none w-full max-w-[600px]">
        
        {/* Top: The Search Query */}
        {query && (
          <div className="px-4 py-3.5 text-[14px] text-slate-500 dark:text-[#9b9b9b] border-b border-slate-200/80 dark:border-white/10 leading-relaxed font-sans">
            {safeQuery}
          </div>
        )}

        {/* Middle: Inner Accordion Trigger */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-4 py-3 text-[14px] text-slate-500 dark:text-[#9b9b9b] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors w-full text-left"
        >
          Searched the web {searchDomain && <span className="text-slate-900 dark:text-[#e2e2e2]">{safeSearchDomain}</span>}
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60 ml-0.5" />}
        </button>

        {/* Bottom: Results List */}
        {isExpanded && results.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col pb-3 [scrollbar-color:#D3D1CB_transparent] dark:[scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]">
            {results.map((result, index) => {
              let domain = "";
              try {
                domain = new URL(result.url).hostname;
              } catch (e) {
                domain = result.url;
              }
              
              // Google Favicon API
              const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
              
              return (
                <a 
                  key={index} 
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  {/* Favicon */}
                  <img 
                    src={faviconUrl} 
                    alt="" 
                    className="w-4 h-4 rounded-sm shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'/%3E%3Cpath d='M2 12h20'/%3E%3C/svg%3E";
                    }}
                  />
                  
                  {/* Title */}
                  <span className="flex-1 truncate text-[14px] text-slate-600 dark:text-[#c9c9c9] group-hover:text-slate-900 dark:group-hover:text-[#eeeeee] transition-colors leading-[22px]">
                    {result.title}
                  </span>

                  {/* Domain / Breadcrumb */}
                  <span className="shrink-0 text-[13.5px] text-slate-500 dark:text-[#8a8a8a] truncate max-w-[180px]">
                    {domain}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
