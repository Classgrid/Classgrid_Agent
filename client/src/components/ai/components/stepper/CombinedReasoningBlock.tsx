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

import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

/**
 * CombinedReasoningBlock - Shows AI reasoning LIVE as it streams in.
 * 
 * Phase 1: Shimmer "Thinking..." (no sentences yet)
 * Phase 2: Live typing - sentences stream in from SSE, displayed immediately
 * Phase 3: Finished - collapsible accordion
 */
type CombinedReasoningBlockProps = { sentences: string[]; isStreaming?: boolean; autoFinishMs?: number };

// Module-level so ReactMarkdown sees stable component types and doesn't remount every sentence on each render.
const sentenceMarkdownComponents = {
  p({ children, ...props }: any) {
    return <span {...props}>{children}</span>;
  },
  strong({ children, ...props }: any) {
    return <strong className="font-semibold text-slate-600 dark:text-slate-400" {...props}>{children}</strong>;
  },
  em({ children, ...props }: any) {
    return <em className="italic" {...props}>{children}</em>;
  },
  a({ href, children, ...props }: any) {
    const external = href && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="inline-flex items-center gap-0.5 font-medium text-blue-500 dark:text-blue-400 underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-300"
        {...props}
      >
        {children}
        {external && <svg className="inline w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.5 3H9v5.5M9 3L3 9" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </a>
    );
  },
  code({ node, inline, className, children, ...props }: any) {
    const codeString = String(children).replace(/\n$/, "");
    const isActuallyInline = !className?.includes('language-') && !codeString.includes('\n');

    if (isActuallyInline) {
      return (
        <code className="bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 shadow-sm text-[#c92a2a] dark:text-[#ff6b6b] px-[5px] py-[2px] rounded-[3px] text-[13px] font-mono break-words mx-0.5" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 px-[5px] py-[2px] rounded-[3px] text-[12px] font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre({ children, ...props }: any) {
    return <pre className="my-1 overflow-x-auto" {...props}>{children}</pre>;
  }
};

// Only a sentence whose text changed is re-parsed; earlier sentences of a live thought stay cached.
const SentenceMarkdown = React.memo(({ text }: { text: string }) => (
  <ReactMarkdown components={sentenceMarkdownComponents}>{text}</ReactMarkdown>
));

const sameSentences = (a: string[], b: string[]) =>
  a === b || (a.length === b.length && a.every((s, i) => s === b[i]));

// Parents rebuild the sentences array on every render, so compare by content:
// finished thoughts in older messages then skip re-rendering entirely.
export const CombinedReasoningBlock = React.memo(
  CombinedReasoningBlockInner,
  (prev, next) =>
    prev.isStreaming === next.isStreaming &&
    prev.autoFinishMs === next.autoFinishMs &&
    sameSentences(prev.sentences || [], next.sentences || [])
);

function CombinedReasoningBlockInner({ sentences, isStreaming = true, autoFinishMs }: CombinedReasoningBlockProps) {
  const [timer, setTimer] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [localIsStreaming, setLocalIsStreaming] = useState(isStreaming);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Sync with prop if it changes
  useEffect(() => {
    setLocalIsStreaming(isStreaming);
  }, [isStreaming]);

  // Auto-finish after a delay (useful for static testing pages)
  useEffect(() => {
    if (autoFinishMs && autoFinishMs > 0 && localIsStreaming) {
      const timeout = setTimeout(() => {
        setLocalIsStreaming(false);
      }, autoFinishMs);
      return () => clearTimeout(timeout);
    }
  }, [autoFinishMs, localIsStreaming]);

  const hasSentences = sentences && sentences.length > 0;
  // We're "finished" only when streaming stops AND we have content
  const isFinished = hasSentences && !localIsStreaming;

  // Timer logic for the 'Thinking' label (e.g. 1s, 2s)
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  // Auto-scroll viewport as new sentences stream in
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [sentences]);

  return (
    <div className={`relative z-10 flex flex-col group/accordion mb-2 combined-reasoning-block`}>
      <button
        onClick={() => { if (!localIsStreaming) setExpanded((prev) => !prev) }}
        className={`flex items-center gap-3 rounded-lg p-1 pr-3 -ml-1 transition-colors ${
          !localIsStreaming ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default'
        }`}
      >
        {/* Stepper Dot Area */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1 relative z-20">
          {hasSentences && (
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 transition-colors" />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!localIsStreaming && hasSentences && (
            <ChevronRight
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            />
          )}
          <p
            className={
              isFinished
                ? "text-[14px] font-medium text-muted-foreground"
                : "bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-[14px] font-medium text-transparent"
            }
            style={isFinished ? {} : { animation: "shimmer 2.5s linear infinite" }}
          >
            {isFinished ? "Thought" : "Thinking"}
          </p>
          {!isFinished && (
            <span className="text-sm text-muted-foreground relative z-20">
              {timer}s
            </span>
          )}
        </div>
      </button>

      {/* Live Streaming Content - ALWAYS visible while streaming or expanded */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          (localIsStreaming && hasSentences) || (expanded && hasSentences) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pl-[36px] pr-2 pb-4">
            <div className="flex flex-col w-[360px] max-w-full font-sans">
              <div
                ref={viewportRef}
                className="mt-1.5 overflow-y-auto"
                style={{
                  maxHeight: '180px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <style>{`.overflow-y-auto::-webkit-scrollbar { display: none; }`}</style>
                <div className="flex flex-col gap-2">
                  {sentences.map((line, i) => (
                    <div
                      key={i}
                      className="m-0 leading-[20px] text-[13px] font-[425] text-slate-500 dark:text-[#737373] tracking-tight animate-[fadeIn_420ms_cubic-bezier(0.22,1,0.36,1)] [&>p]:inline [&>p]:m-0"
                    >
                      <SentenceMarkdown text={line} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isFinished && (
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      )}
    </div>
  );
}
