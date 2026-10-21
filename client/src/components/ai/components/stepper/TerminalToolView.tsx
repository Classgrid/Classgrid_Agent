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
import { Laptop } from 'lucide-react';
import { ToolOutputContainer } from './ToolOutputContainer';
import { Spinner } from '@/components/marketing_ui/spinner';
import { cn } from '@/lib/utils';

interface TerminalToolViewProps {
  command: string;
  output: string;
  /** The command is still running: show a spinner next to "Waiting for output..." */
  running?: boolean;
}

export function TerminalToolView({ command, output, running = false }: TerminalToolViewProps) {
  const [activeTab, setActiveTab] = useState<'command' | 'output'>('output');

  // Extremely basic pseudo-syntax highlighting for the Command view
  const formatCommand = (cmd: string) => {
    return cmd.split(' ').map((word, i) => {
      if (['&&', '||', '>', '2>&1', ';', 'for', 'in', 'do', 'done'].includes(word)) return <span key={i} className="text-red-500 dark:text-[#ff7b72]">{word} </span>;
      if (['mkdir', 'pdftoppm', 'echo', 'tesseract'].includes(word)) return <span key={i} className="text-purple-600 dark:text-[#d2a8ff]">{word} </span>;
      if (word.startsWith('-')) return <span key={i} className="text-blue-500 dark:text-[#79c0ff]">{word} </span>;
      if (word.startsWith('/')) return <span key={i} className="text-cyan-600 dark:text-[#a5d6ff]">{word} </span>;
      return <span key={i} className="text-slate-800 dark:text-[#e6edf3]">{word} </span>;
    });
  };

  return (
    <ToolOutputContainer
      icon={<Laptop className="text-slate-400 dark:text-[#a3a3a3]" strokeWidth={1.5} />}
      toolName="Computer"
      badge="Alpha"
      actionName="Terminal"
    >
      <div className="flex flex-col h-full w-full">
        {/* Pill Tabs (Inside Border, Top) */}
        <div className="flex items-center gap-1 p-1.5">
          <button
            onClick={() => setActiveTab('command')}
            className={cn(
              "px-[10px] h-[28px] flex items-center rounded-full text-[14px] font-medium transition-colors",
              activeTab === 'command' 
                ? "bg-[#211B170D] text-[#2C2C2B] dark:bg-[#2a2a2a] dark:text-white" 
                : "text-slate-500 hover:text-[#2C2C2B] dark:text-[#a3a3a3] dark:hover:text-white"
            )}
          >
            Command
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={cn(
              "px-[10px] h-[28px] flex items-center rounded-full text-[14px] font-medium transition-colors",
              activeTab === 'output' 
                ? "bg-[#211B170D] text-[#2C2C2B] dark:bg-[#2a2a2a] dark:text-white" 
                : "text-slate-500 hover:text-[#2C2C2B] dark:text-[#a3a3a3] dark:hover:text-white"
            )}
          >
            Output
          </button>
        </div>

        {/* Terminal Output Area */}
        <div 
          className="m-2 mt-0 p-3 bg-[#F9F8F7] dark:bg-[#202020] rounded-lg font-mono text-[13px] whitespace-pre-wrap overflow-x-auto max-h-[400px] border border-slate-200 dark:border-transparent [scrollbar-color:#D3D1CB_transparent] dark:[scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]"
        >
          {activeTab === 'command' ? (
            <div className="leading-relaxed">{formatCommand(typeof command === 'object' ? JSON.stringify(command) : String(command || ''))}</div>
          ) : (
            <div className="leading-relaxed text-slate-600 dark:text-[#d4d4d4]">
              {typeof output === 'object' ? JSON.stringify(output, null, 2) : running && (!output || output === 'Waiting for output...') ? (
                <span className="inline-flex items-center gap-2"><Spinner className="size-3.5 shrink-0" />Waiting for output...</span>
              ) : (output || 'Waiting for output...')}
            </div>
          )}
        </div>
      </div>
    </ToolOutputContainer>
  );
}
