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
import { Database, TableProperties } from 'lucide-react';
import { ToolOutputContainer } from './ToolOutputContainer';
import { cn } from '@/lib/utils';

interface DatabaseQueryViewProps {
  query: string;
  results?: any[];
}

export function DatabaseQueryView({ query, results }: DatabaseQueryViewProps) {
  const [activeTab, setActiveTab] = useState<'query' | 'results'>('results');

  // Extremely basic pseudo-syntax highlighting for MongoDB/SQL queries
  const formatQuery = (q: string) => {
    return q.split(/(\s+|\(|\)|\{|\}|,|:|;)/).map((word, i) => {
      if (['db', 'find', 'findOne', 'select', 'from', 'where', 'limit', 'insert', 'update'].includes(word.toLowerCase())) return <span key={i} className="text-purple-600 dark:text-[#d2a8ff]">{word}</span>;
      if (['{', '}', '(', ')', ',', ':'].includes(word)) return <span key={i} className="text-slate-500 dark:text-slate-400">{word}</span>;
      if (word.startsWith('"') || word.startsWith("'")) return <span key={i} className="text-green-600 dark:text-[#a5d6ff]">{word}</span>;
      return <span key={i} className="text-slate-800 dark:text-[#e6edf3]">{word}</span>;
    });
  };

  return (
    <ToolOutputContainer
      icon={<Database className="text-slate-400 dark:text-[#a3a3a3]" strokeWidth={1.5} />}
      toolName="Computer"
      badge="Alpha"
      actionName="Database Query"
    >
      <div className="flex flex-col h-full w-full">
        {/* Pill Tabs */}
        <div className="flex items-center gap-1 p-1.5">
          <button
            onClick={() => setActiveTab('query')}
            className={cn(
              "px-[10px] h-[28px] flex items-center rounded-full text-[14px] font-medium transition-colors",
              activeTab === 'query' 
                ? "bg-[#211B170D] text-[#2C2C2B] dark:bg-[#2a2a2a] dark:text-white" 
                : "text-slate-500 hover:text-[#2C2C2B] dark:text-[#a3a3a3] dark:hover:text-white"
            )}
          >
            Query
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={cn(
              "px-[10px] h-[28px] flex items-center rounded-full text-[14px] font-medium transition-colors",
              activeTab === 'results' 
                ? "bg-[#211B170D] text-[#2C2C2B] dark:bg-[#2a2a2a] dark:text-white" 
                : "text-slate-500 hover:text-[#2C2C2B] dark:text-[#a3a3a3] dark:hover:text-white"
            )}
          >
            Results
          </button>
        </div>

        {/* Database Output Area */}
        <div 
          className="m-2 mt-0 p-3 bg-[#F9F8F7] dark:bg-[#202020] rounded-lg font-mono text-[13px] whitespace-pre-wrap overflow-x-auto max-h-[400px] border border-slate-200 dark:border-transparent [scrollbar-color:#D3D1CB_transparent] dark:[scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]"
        >
          {activeTab === 'query' ? (
            <div className="leading-relaxed">{formatQuery(query)}</div>
          ) : (
            <div className="leading-relaxed">
              {results && results.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 dark:text-slate-400">{"["}</span>
                  {results.slice(0, 5).map((item, index) => {
                    // Sanitize sensitive fields from being rendered in the UI
                    const sanitizedItem = { ...item };
                    const sensitiveKeys = ['password', 'hash', 'salt', 'token', 'secret', 'otp', 'biometric', '__v'];
                    
                    Object.keys(sanitizedItem).forEach(key => {
                      const lowerKey = key.toLowerCase();
                      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                         sanitizedItem[key] = "[REDACTED]";
                      }
                    });

                    return (
                      <div key={index} className="pl-4">
                        <span className="text-slate-500 dark:text-slate-400">{"{"}</span>
                        {Object.entries(sanitizedItem).map(([key, value], i, arr) => {
                          const displayValue = typeof value === 'object' && value !== null 
                            ? JSON.stringify(value) 
                            : (typeof value === 'string' ? `"${value}"` : `${value}`);
                          return (
                            <div key={key} className="pl-4">
                              <span className="text-blue-600 dark:text-blue-400">"{key}"</span>
                              <span className="text-slate-500 dark:text-slate-400">: </span> 
                              <span className="text-emerald-600 dark:text-[#a5d6ff]">
                                {displayValue}
                              </span>
                              {i < arr.length - 1 ? <span className="text-slate-500 dark:text-slate-400">,</span> : ''}
                            </div>
                          );
                        })}
                        <span className="text-slate-500 dark:text-slate-400">{"}"}</span>
                        {index < Math.min(results.length, 5) - 1 ? <span className="text-slate-500 dark:text-slate-400">,</span> : ''}
                      </div>
                    );
                  })}
                  {results.length > 5 && (
                    <div className="pl-4 text-slate-500 dark:text-slate-400 italic">
                      ... and {results.length - 5} more items. (Hidden for UI performance)
                    </div>
                  )}
                  <span className="text-slate-500 dark:text-slate-400">{"]"}</span>
                </div>
              ) : (
                <div className="text-slate-500 dark:text-[#d4d4d4] flex items-center gap-2">
                  <TableProperties className="h-4 w-4" />
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolOutputContainer>
  );
}
