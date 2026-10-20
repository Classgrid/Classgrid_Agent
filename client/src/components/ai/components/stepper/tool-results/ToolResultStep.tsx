// A tool step in the agent stepper: the usual "Successfully used …" line, plus an arrow that opens
// what the tool was asked (Request) and what came back (Response), shown with a view made for that tool.
import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseResult, sanitize, maskSecretsInText, KeyValueTable, SectionLabel, TextBlock } from './primitives';
import { renderToolResult } from './renderers';

interface ToolResultStepProps {
  tool: string;
  args?: any;
  /** Usually a string; a few tools (view_image, end_conversation) return an object */
  result?: unknown;
  status: 'loading' | 'success' | 'error';
  text: React.ReactNode;
  defaultOpen?: boolean;
}

/** Request args worth showing: drop empty values and the connector's operation (already in the title) */
function requestFields(args: any) {
  if (!args || typeof args !== 'object') return null;
  const clean = sanitize(args);
  const entries = Object.entries(clean).filter(([k, v]) => k !== 'operation' && v !== undefined && v !== null && v !== '' && !(typeof v === 'object' && Object.keys(v).length === 0));
  return entries.length ? Object.fromEntries(entries) : null;
}

export function ToolResultStep({ tool, args, result, status, text, defaultOpen = false }: ToolResultStepProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasResult = result !== undefined && result !== null && result !== '';
  const canOpen = status !== 'loading' && (hasResult || !!requestFields(args));

  const body = useMemo(() => {
    if (!open) return null;
    const request = requestFields(args);
    const parsed = parseResult(result);
    return { request, parsed };
  }, [open, args, result]);

  return (
    <div className="relative z-10 flex flex-col">
      <button
        type="button"
        disabled={!canOpen}
        onClick={() => canOpen && setOpen((o) => !o)}
        className={cn('flex items-center gap-3 p-1 pr-3 -ml-1 text-left rounded-lg', canOpen && 'cursor-pointer group')}
        aria-expanded={open}
      >
        {/* Tiny stepper dot (matches SimpleLogStepView) */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1">
          <div className={cn('h-1.5 w-1.5 rounded-full transition-colors', status === 'error' ? 'bg-red-400' : 'bg-slate-300 dark:bg-[#4a4a4a]')} />
        </div>
        <div className="flex items-center gap-1.5 font-medium text-[14px] text-slate-500 dark:text-[#8a8a8a] group-hover:text-slate-700 dark:group-hover:text-[#c9c9c9] transition-colors min-w-0">
          <span className="truncate">{text}</span>
          {canOpen && <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-90')} />}
        </div>
      </button>

      {open && body && (
        <div className="ml-10 mr-2 mb-2 mt-1 flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-[#f9f9f9] dark:bg-[#151515] p-3 shadow-sm dark:shadow-none max-h-[520px] overflow-y-auto [scrollbar-width:thin]">
          {body.request && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Request</SectionLabel>
              <KeyValueTable data={body.request} maxRows={8} />
            </div>
          )}
          {(body.parsed.data !== undefined || body.parsed.text) && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Response</SectionLabel>
              <ResponseBoundary fallback={<TextBlock text={maskSecretsInText(typeof result === 'string' ? result : JSON.stringify(result ?? ''))} />}>
                {renderToolResult(tool, args, body.parsed)}
              </ResponseBoundary>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A view that breaks on unexpected data must never break the chat: fall back to the raw text */
class ResponseBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('[ToolResultStep] view failed, showing raw result', err); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
