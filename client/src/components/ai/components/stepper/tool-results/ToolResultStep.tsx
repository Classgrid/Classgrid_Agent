// A tool step in the agent stepper, shown the way claude.ai shows tool calls:
//   1. the usual "Successfully used …" line with an arrow,
//   2. click → a small card with the step row ("Used Classgrid  Get my profile ›"),
//   3. click the row → a grey box with the Request and Response as plain label / value rows.
import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseResult, sanitize, maskSecretsInText, humanizeKey } from './primitives';
import { PlainData } from './PlainData';
import { ShimmerText } from '../ShimmerText';
import { AppResultCard, APP_CARD_TOOLS } from '../app-cards/AppResultCard';

interface ToolResultStepProps {
  tool: string;
  args?: any;
  /** Usually a string; a few tools (view_image, end_conversation) return an object */
  result?: unknown;
  status: 'loading' | 'success' | 'error';
  text: React.ReactNode;
  defaultOpen?: boolean;
}

/** Request args worth showing: drop empty values and the connector's operation (already in the row title) */
function requestFields(args: any) {
  if (!args || typeof args !== 'object') return null;
  const clean = sanitize(args);
  const entries = Object.entries(clean).filter(([k, v]) => k !== 'operation' && v !== undefined && v !== null && v !== '' && !(typeof v === 'object' && Object.keys(v).length === 0));
  return entries.length ? Object.fromEntries(entries) : null;
}

const APP_NAMES: Record<string, string> = {
  google_workspace_connector: 'Google Workspace', microsoft_workspace_connector: 'Microsoft', github_workspace_connector: 'GitHub',
  slack_workspace_connector: 'Slack', notion_connector: 'Notion', zoom_connector: 'Zoom', vercel_connector: 'Vercel', supabase_connector: 'Supabase',
  sanity_connector: 'Sanity', youtube_connector: 'YouTube', facebook_connector: 'Facebook', instagram_connector: 'Instagram',
  whatsapp_business_connector: 'WhatsApp', aws_ses_connector: 'AWS SES', canva_connector: 'Canva', spotify_connector: 'Spotify',
};

/** "Used Google Workspace  List drive files" / "Used Classgrid  Get my profile" */
function rowTitle(tool: string, args: any) {
  const app = APP_NAMES[tool] ?? 'Classgrid';
  const action = APP_NAMES[tool] && args?.operation ? String(args.operation) : tool;
  return { app, action: humanizeKey(action) };
}

export function ToolResultStep({ tool, args, result, status, text, defaultOpen = false }: ToolResultStepProps) {
  const [cardOpen, setCardOpen] = useState(defaultOpen);
  const [detailOpen, setDetailOpen] = useState(defaultOpen);
  const hasResult = result !== undefined && result !== null && result !== '';
  const canOpen = status !== 'loading' && (hasResult || !!requestFields(args));
  const { app, action } = rowTitle(tool, args);

  const body = useMemo(() => {
    if (!detailOpen) return null;
    return { request: requestFields(args), parsed: parseResult(result) };
  }, [detailOpen, args, result]);

  return (
    <div className="relative z-10 flex flex-col">
      <button
        type="button"
        disabled={!canOpen}
        onClick={() => canOpen && setCardOpen((o) => !o)}
        className={cn('flex items-center gap-3 p-1 pr-3 -ml-1 text-left rounded-lg', canOpen && 'cursor-pointer group')}
        aria-expanded={cardOpen}
      >
        {/* Tiny stepper dot (matches SimpleLogStepView) */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1">
          <div className={cn('h-1.5 w-1.5 rounded-full transition-colors', status === 'error' ? 'bg-red-400' : 'bg-slate-300 dark:bg-[#4a4a4a]')} />
        </div>
        <div className="flex items-center gap-1.5 font-medium text-[14px] text-slate-500 dark:text-[#8a8a8a] group-hover:text-slate-700 dark:group-hover:text-[#c9c9c9] transition-colors min-w-0">
          <ShimmerText active={status === 'loading'} className="min-w-0 break-words">{text}</ShimmerText>
          {canOpen && <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-transform', cardOpen && 'rotate-90')} />}
        </div>
      </button>

      {/* Apps with pictures or media (Canva, Spotify) show their card right under the step */}
      {status !== 'loading' && hasResult && APP_CARD_TOOLS.has(tool) && (
        <div className="ml-10 mr-2 mb-2 mt-0.5 max-w-[560px]">
          <AppResultCard tool={tool} args={args} result={result} />
        </div>
      )}

      {cardOpen && canOpen && (
        <div className="ml-10 mr-2 mb-2 mt-0.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#171717] overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5 text-[14px] border-b border-slate-200 dark:border-[#2a2a2a]">
            <span className="text-slate-400 dark:text-[#7d7d7d]">Loaded</span>
            <span className="text-slate-800 dark:text-[#e6e6e6]">{app}</span>
          </div>
          <button
            type="button"
            onClick={() => setDetailOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[14px] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1d1d1d] transition-colors"
            aria-expanded={detailOpen}
          >
            <span className="text-slate-400 dark:text-[#7d7d7d]">Used {app}</span>
            <span className="text-slate-800 dark:text-[#e6e6e6] min-w-0 break-words">{action}</span>
            <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', detailOpen && 'rotate-90')} />
          </button>

          {detailOpen && body && (
            <div className="mx-3 mb-3 flex flex-col gap-3 rounded-lg bg-[#f1f1ef] dark:bg-[#222222] px-3 py-2.5 max-h-[460px] overflow-y-auto [scrollbar-width:thin]">
              {body.request && (
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] text-slate-600 dark:text-[#a9a9a9]">Request</span>
                  <PlainData data={body.request} />
                </div>
              )}
              {(body.parsed.data !== undefined || body.parsed.text) && (
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] text-slate-600 dark:text-[#a9a9a9]">Response</span>
                  <ResponseBoundary fallback={<PlainText text={maskSecretsInText(typeof result === 'string' ? result : JSON.stringify(result ?? ''))} />}>
                    {body.parsed.data !== undefined ? (
                      <>
                        {body.parsed.text && <PlainText text={body.parsed.text} />}
                        <PlainData data={body.parsed.data} />
                      </>
                    ) : <PlainText text={body.parsed.text} />}
                  </ResponseBoundary>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlainText({ text }: { text: string }) {
  const [all, setAll] = useState(false);
  const long = text.length > 1500;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[13.5px] leading-[1.55] text-slate-800 dark:text-[#e2e2e2] whitespace-pre-wrap break-words">{all || !long ? text : `${text.slice(0, 1500)}…`}</p>
      {long && (
        <button type="button" onClick={() => setAll((a) => !a)} className="self-start text-[12.5px] text-slate-500 hover:text-slate-800 dark:text-[#8a8a8a] dark:hover:text-white cursor-pointer">
          {all ? 'Show less' : 'Show all'}
        </button>
      )}
    </div>
  );
}

/** A response that can't be shown must never break the chat: fall back to the raw text */
class ResponseBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('[ToolResultStep] response view failed, showing raw result', err); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
