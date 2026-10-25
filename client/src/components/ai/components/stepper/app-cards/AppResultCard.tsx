// The visual card for app tools that return pictures or media (Canva designs, Spotify songs), shown right under
// their step in the chat. Text-only apps (Slack, GitHub…) don't get one; their result stays in the step's details.
import React from 'react';
import { parseResult } from '../tool-results/primitives';
import { CanvaResult } from './CanvaCards';
import { SpotifyResult } from './SpotifyCards';
import { FailLine } from './shared';

export const APP_CARD_TOOLS = new Set(['canva_connector', 'spotify_connector']);

/** The tool's JSON as it came. Not run through parseResult: its secret masking blanks "sig=" / "X-Amz-Signature="
 * in links, which breaks Canva's signed image and download links (the user's own designs, shown as images here). */
function readResult(result: unknown): { data: any; text: string } {
  if (result !== null && typeof result === 'object') return { data: result, text: '' };
  const raw = String(result ?? '').trim();
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') return { data, text: '' };
  } catch { /* not JSON: an error or a sentence */ }
  return parseResult(raw);
}

export function AppResultCard({ tool, args, result }: { tool: string; args: any; result: unknown }) {
  const { data, text } = readResult(result);
  const brand = tool === 'canva_connector' ? 'canva' : 'spotify';
  // A tool error comes back as text ("Error: …"): show it plainly
  if (data === undefined) return /^error\b/i.test(text.trim()) ? <FailLine brand={brand} text={text.replace(/^error:\s*/i, '')} /> : null;
  return (
    <CardBoundary>
      {tool === 'canva_connector' ? <CanvaResult args={args ?? {}} data={data} /> : <SpotifyResult args={args ?? {}} data={data} />}
    </CardBoundary>
  );
}

/** In the reply itself (like ChatGPT apps): one card for every Canva / Spotify result of this reply, above the answer
 * text, once the work is done (while it works, the cards show under each step) */
export function AppReplyResults({ steps, done }: { steps?: any[]; done: boolean }) {
  if (!done) return null;
  const results = (steps || []).filter((s) => s?.type === 'tool' && s.status === 'success' && APP_CARD_TOOLS.has(s.tool) && s.result !== undefined && s.result !== null && s.result !== '');
  if (!results.length) return null;
  return (
    <div className="flex flex-col gap-2.5 mb-3 max-w-[560px]">
      {results.map((s, i) => <AppResultCard key={s.id ?? i} tool={s.tool} args={s.args} result={s.result} />)}
    </div>
  );
}

/** A card that can't be drawn must never break the chat */
class CardBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('[AppResultCard] card failed', err); }
  render() { return this.state.failed ? null : this.props.children; }
}
