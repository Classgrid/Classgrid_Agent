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

import React, { useState, useEffect } from 'react';
import { FileText, Download, X, FileSpreadsheet, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentGenerationViewProps {
  fileName: string;
  pageCount?: number;
  size: string;
  hideAnimation?: boolean;
  onClick?: () => void;
}

export function DocumentGenerationView({ fileName, pageCount, size, hideAnimation, onClick }: DocumentGenerationViewProps) {
  const safeFileName = typeof fileName === 'object' ? JSON.stringify(fileName) : String(fileName || '');
  const [stage, setStage] = useState<'uploading' | 'processing' | 'complete'>(hideAnimation ? 'complete' : 'uploading');
  const [progress, setProgress] = useState(0);

  const extension = safeFileName.split('.').pop()?.toLowerCase();
  
  // Determine icons and colors based on extension
  let Icon = FileText;
  let iconBgClass = "bg-slate-100/50 dark:bg-white/5";
  let iconColorClass = "text-slate-500 dark:text-slate-400";
  let fileTypeLabel = "FILE";

  if (extension === 'pdf') {
    Icon = FileText;
    iconBgClass = "bg-red-100/50 dark:bg-red-900/20";
    iconColorClass = "text-red-600 dark:text-red-400";
    fileTypeLabel = "PDF";
  } else if (extension === 'xlsx' || extension === 'csv') {
    Icon = FileSpreadsheet;
    iconBgClass = "bg-emerald-100/50 dark:bg-emerald-900/20";
    iconColorClass = "text-emerald-600 dark:text-emerald-400";
    fileTypeLabel = extension.toUpperCase();
  } else if (extension === 'docx' || extension === 'doc') {
    Icon = FileIcon;
    iconBgClass = "bg-blue-100/50 dark:bg-blue-900/20";
    iconColorClass = "text-blue-600 dark:text-blue-400";
    fileTypeLabel = "DOCX";
  }

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Handle interval for progress
  useEffect(() => {
    if (hideAnimation || stage !== 'uploading') return;
    
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return 100;
        return Math.min(p + Math.floor(Math.random() * 20) + 5, 100);
      });
    }, 400);

    return () => clearInterval(interval);
  }, [stage, hideAnimation]);

  // Handle stage transitions based on progress
  useEffect(() => {
    if (progress >= 100 && stage === 'uploading') {
      setStage('processing');
    }
  }, [progress, stage]);

  useEffect(() => {
    if (stage === 'processing') {
      const timeout = setTimeout(() => {
        setStage('complete');
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [stage]);

  return (
    <div ref={containerRef} className="flex flex-col relative min-h-[70px]">
      
      {/* 1. Generating State (Progress Bar Chip) */}
      <div 
        className={cn(
          "absolute top-0 left-0 w-full max-w-[280px] bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 p-3 shadow-sm dark:shadow-none transition-all duration-500 ease-in-out origin-left",
          stage !== 'uploading' ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100 z-10"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-white/5 rounded-lg flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex flex-col flex-1 overflow-hidden pr-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-slate-700 dark:text-[#d4d4d4] truncate">
                {fileName}
              </span>
              <X className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            </div>
            
            <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-700 dark:bg-slate-300 transition-all duration-300 ease-out rounded-full" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Processing State (Shimmering Skeleton Card) */}
      <div 
        className={cn(
          "absolute top-0 left-0 bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between p-4 shadow-sm dark:shadow-none w-full max-w-[400px] transition-all duration-500 ease-in-out origin-left",
          stage === 'processing' ? "opacity-100 scale-100 translate-x-0 z-10" : "opacity-0 scale-95 -translate-x-4 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden w-full">
          {/* Skeleton Icon */}
          <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-200 dark:bg-[#2a2a2a] animate-pulse" />
          
          {/* Skeleton Text */}
          <div className="flex flex-col gap-2 overflow-hidden flex-1 py-1">
            <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-[#2a2a2a] animate-pulse" />
            <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-[#2a2a2a] animate-pulse" />
          </div>
        </div>

        {/* Skeleton Button */}
        <div className="shrink-0 h-8 w-8 rounded-full bg-slate-200 dark:bg-[#2a2a2a] animate-pulse ml-4" />
      </div>

      {/* 3. Final Complete State (Sleek File Card) */}
      <div 
        onClick={onClick}
        className={cn(
          "bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between p-4 shadow-sm dark:shadow-none w-full max-w-[400px] hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-all duration-500 ease-in-out group origin-left",
          onClick ? "cursor-pointer" : "",
          stage === 'complete' ? "opacity-100 scale-100 translate-x-0 z-10 relative" : "opacity-0 scale-95 pointer-events-none absolute top-0 left-0"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Dynamic Icon Box */}
          <div className={cn("h-10 w-10 shrink-0 rounded-lg flex items-center justify-center", iconBgClass, iconColorClass)}>
            <Icon className="h-5 w-5" />
          </div>
          
          {/* File Info */}
          <div className="flex flex-col overflow-hidden">
            <span className="text-[14px] font-medium text-slate-800 dark:text-[#eeeeee] truncate">
              {safeFileName}
            </span>
            <span className="text-[13px] text-slate-500 dark:text-[#8a8a8a] mt-0.5">
              {pageCount ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'} • ` : ''}{size} • {fileTypeLabel}
            </span>
          </div>
        </div>

        {/* Download Button */}
        <button 
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-slate-400 dark:text-[#666666] group-hover:text-slate-700 dark:group-hover:text-[#eeeeee] hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors ml-4"
          onClick={(e) => {
            e.stopPropagation();
            // Implement download logic here
          }}
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
      
    </div>
  );
}
