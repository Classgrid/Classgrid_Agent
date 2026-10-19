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

"use client";

import React, { useEffect, useRef, useState } from "react";

const SENT_H = 40; // 2 lines × 20px
const GAP = 4;
const MAX_H = 180;
const FADE = 16;

interface TypewriterAccordionProps {
  sentences: string[];
  onComplete?: () => void;
}

export function TypewriterAccordion({ sentences, onComplete }: TypewriterAccordionProps) {
  const [fade, setFade] = useState({ top: false, bottom: true });
  const viewportRef = useRef<HTMLDivElement>(null);

  const count = sentences.length;
  
  // Auto-scroll to keep typing cursor in view
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [sentences]);

  const onScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    setFade({
      top: el.scrollTop > 1,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
    });
  };

  const isScrollable = viewportRef.current ? viewportRef.current.scrollHeight > MAX_H : false;
  const showTop = fade.top;
  const showBottom = isScrollable ? fade.bottom : false;
  const mask = isScrollable
    ? `linear-gradient(to bottom, transparent 0, #000 ${showTop ? FADE : 0}px, #000 calc(100% - ${showBottom ? FADE : 0}px), transparent 100%)`
    : "none";

  return (
    <div className="flex flex-col w-[360px] max-w-full font-sans">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* VIEWPORT STREAM */}
      <div className="min-h-0 overflow-hidden">
        <div
          ref={viewportRef}
          className="mt-1.5 overflow-hidden transition-[height] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] overflow-y-auto"
          style={{ 
            maxHeight: `${MAX_H}px`, 
            WebkitMaskImage: mask, 
            maskImage: mask,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          onScroll={onScroll}
        >
          <style>{`.overflow-y-auto::-webkit-scrollbar { display: none; }`}</style>
          
          <div className="flex flex-col gap-2">
            {sentences.map((line, i) => (
              <p 
                key={i} 
                className="m-0 leading-[20px] text-[13px] font-[425] text-slate-500 dark:text-[#737373] tracking-tight animate-[fadeIn_420ms_cubic-bezier(0.22,1,0.36,1)]"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
