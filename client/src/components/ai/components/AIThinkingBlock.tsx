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

import { Card } from "@/components/marketing_ui/card";
import { Loader } from "./ui/loader";
import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

export default function AIThinkingBlock({ thinkingContent, isFinished }: { thinkingContent?: string, isFinished?: boolean }) {
const contentRef = useRef<HTMLDivElement>(null);
const [expanded, setExpanded] = useState(true);

const ThinkingContent = thinkingContent || "";

const [timer, setTimer] = useState(0);

useEffect(() => {
  if (isFinished) return;
  const timerInterval = setInterval(() => {
    setTimer((prev) => prev + 1);
  }, 1000);

  return () => {
    clearInterval(timerInterval);
  };
}, [isFinished]);

// Auto-collapse when finished
useEffect(() => {
  if (isFinished) {
    setExpanded(false);
  }
}, [isFinished]);

// Auto-scroll to bottom of thought content as new text arrives
useEffect(() => {
  if (contentRef.current && !isFinished && expanded) {
    contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }
}, [ThinkingContent, isFinished, expanded]);

return (
  <>
    <div className="flex flex-col p-3 max-w-xl">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-start gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
        <p
          className="bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-base text-transparent animate-[shimmer_5s_linear_infinite]"
          style={{
            animation: isFinished ? "none" : "shimmer 5s linear infinite",
          }}
        >
          {isFinished ? `Worked for ${timer}s` : "Thinking"}
        </p>
        {!isFinished && (
          <span className="text-sm text-muted-foreground">
            {timer}s
          </span>
        )}
        <style>{`
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      </button>

      {/* Live streaming thought content */}
      {expanded && ThinkingContent && (
        <div
          ref={contentRef}
          className="mt-2 ml-5 max-h-[200px] overflow-y-auto text-[13px] leading-[20px] text-muted-foreground/80 italic whitespace-pre-wrap font-sans [scrollbar-width:thin] [scrollbar-color:rgba(150,150,150,0.3)_transparent]"
        >
          {ThinkingContent}
        </div>
      )}
    </div>
  </>
);
}
