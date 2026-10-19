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
import { ChevronDown, ChevronRight, Mail, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailActionViewProps {
  to: string;
  subject: string;
  bodyPreview: string;
}

export function EmailActionView({ to, subject, bodyPreview }: EmailActionViewProps) {
  const safeTo = typeof to === 'object' ? JSON.stringify(to) : String(to || '');
  const safeSubject = typeof subject === 'object' ? JSON.stringify(subject) : String(subject || '');
  const safeBodyPreview = typeof bodyPreview === 'object' ? JSON.stringify(bodyPreview, null, 2) : String(bodyPreview || '');

  const [showAllEmails, setShowAllEmails] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  
  const emailList = safeTo.split(',').map(e => e.trim()).filter(Boolean);
  const hasManyEmails = emailList.length > 4;
  
  const filteredEmails = emailList.filter(email => 
    email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex flex-col relative">
      {/* The List Card */}
      <div className="bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden shadow-sm dark:shadow-none w-full max-w-[600px]">
        
        {/* Top: Email Metadata */}
        <div className="px-4 py-3 text-[14px] text-slate-600 dark:text-[#c9c9c9] border-b border-slate-200/80 dark:border-white/10 leading-relaxed font-sans space-y-1">
          <div className="flex items-start gap-2">
            <span className="text-slate-400 dark:text-[#666666] font-medium w-14 shrink-0">To:</span>
            <div className="text-slate-800 dark:text-[#eeeeee] flex-1 flex flex-wrap gap-x-1">
              {hasManyEmails ? (
                <>
                  <span>{emailList.slice(0, 4).join(', ')}</span>
                  <button 
                    onClick={() => setShowAllEmails(true)}
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline transition-all"
                  >
                    and {emailList.length - 4} others
                  </button>
                </>
              ) : (
                <span className="break-all">{safeTo}</span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-400 dark:text-[#666666] font-medium w-14 shrink-0">Subject:</span>
            <span className="text-slate-800 dark:text-[#eeeeee] font-medium">{safeSubject}</span>
          </div>
        </div>

        {/* Middle: Divider */}
        <div className="h-[1px] w-full bg-slate-200/80 dark:bg-white/10" />

        {/* Bottom: Email Body */}
        <div className="px-4 pb-4 pt-4">
          <div 
            className="bg-slate-50 dark:bg-[#1a1a1a] rounded-lg p-3 text-[13.5px] text-slate-600 dark:text-[#a3a3a3] whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar [scrollbar-color:#D3D1CB_transparent] dark:[scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] email-preview-content"
            dangerouslySetInnerHTML={{ __html: safeBodyPreview }}
          />
        </div>
      </div>

      {/* Floating Dialog for All Emails */}
      {showAllEmails && (
        <>
          {/* Invisible Backdrop to capture clicks without blurring or darkening */}
          <div 
            className="fixed inset-0 z-[90]" 
            onClick={() => {
              setShowAllEmails(false);
              setSearchQuery('');
            }} 
          />
          
          {/* Floating Card */}
          <div className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] max-h-[60vh] bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Header with Search */}
            <div className="flex flex-col border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-between px-4 py-3 pb-2">
                <h3 className="font-semibold text-slate-800 dark:text-[#eeeeee] text-[14px]">Recipients ({emailList.length})</h3>
                <button 
                  onClick={() => {
                    setShowAllEmails(false);
                    setSearchQuery('');
                  }}
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-3 pb-3">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search emails..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#222222] border border-slate-200 dark:border-white/10 rounded-md px-3 py-1.5 text-[13px] text-slate-800 dark:text-[#eeeeee] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
            </div>
            
            {/* Scroller List */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar [scrollbar-color:#D3D1CB_transparent] dark:[scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]">
              {filteredEmails.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {filteredEmails.map((email, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-white/5 text-[13px] text-slate-600 dark:text-[#c9c9c9] transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-8 text-center text-[13px] text-slate-500">
                  No emails found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
