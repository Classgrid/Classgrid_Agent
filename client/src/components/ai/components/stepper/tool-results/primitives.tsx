// Shared pieces for showing what a tool sent and got back (key-value rows, tables, links, chips).
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// ─── Data helpers ───

/** Keys whose values must never be shown in the chat */
const SECRET_KEY = /(pass(word|wd)?|secret|token|api[_-]?keys?|private[_-]?(key|code)|access[_-]?key|key[_-]?id|refresh|otp|hash|salt|credential|authorization|cookie|signature|session[_-]?id|start[_-]?url|zak|enrollment[_-]?code|class[_-]?code|organization[_-]?code|honor[_-]?code)/i;
/** Keys dropped completely: internal fields, and paging links (they carry the page's access token) */
const HIDDEN_KEY = /^(__v|_rev|password_reset.*|paging|nextPageToken|prevPageToken)$/i;

/** Mask secrets that show up inside plain text (logs, .env files, terminal output) */
export function maskSecretsInText(text: string) {
  return text
    .replace(/\b([A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|PASSWD|URI|DSN|CREDENTIALS?)[A-Z0-9_]*)(\s*[=:]\s*)(["']?)[^\s"']+\4/g, '$1$3$4••••••$4')
    .replace(/((?:access_token|api_key|apikey|token|sig|signature|X-Amz-Signature|X-Amz-Credential)=)[^&\s"']+/gi, '$1••••••')
    .replace(/\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}/g, '$1_$2_••••••')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}/g, 'sk-••••••')
    .replace(/(mongodb(\+srv)?:\/\/[^:\s]+:)[^@\s]+@/g, '$1••••••@');
}

export function sanitize(value: any, depth = 0): any {
  if (depth > 8 || value === null || value === undefined) return value;
  if (typeof value === 'string') {
    // Huge base64 / binary blobs (e.g. view_image) are not readable and would freeze the page
    if (value.length > 2000 && !/\s/.test(value.slice(0, 2000))) return '[binary data]';
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (HIDDEN_KEY.test(k)) continue;
      out[k] = SECRET_KEY.test(k) && v !== null && v !== '' && typeof v !== 'boolean' ? '••••••' : sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Tool results arrive as strings: JSON, JSON after a sentence ("Found 3 users: [...]"), or plain text */
export function parseResult(result?: unknown): { data: any; text: string } {
  if (result !== null && typeof result === 'object') return { data: sanitize(result), text: '' };
  const raw = maskSecretsInText(String(result ?? '').trim());
  if (!raw) return { data: undefined, text: '' };
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return undefined; } };
  const direct = tryParse(raw);
  if (direct !== undefined && typeof direct === 'object') return { data: sanitize(direct), text: '' };
  // JSON block inside text
  const start = raw.search(/[[{]/);
  if (start > -1) {
    const open = raw[start];
    const close = open === '[' ? ']' : '}';
    const end = raw.lastIndexOf(close);
    if (end > start) {
      const inner = tryParse(raw.slice(start, end + 1));
      if (inner !== undefined && typeof inner === 'object') {
        const before = raw.slice(0, start).trim();
        const after = raw.slice(end + 1).trim();
        return { data: sanitize(inner), text: [before, after].filter(Boolean).join('\n') };
      }
    }
  }
  return { data: undefined, text: raw };
}

/** If an object just wraps a list ({ files: [...] }, { data: { items: [...] } }), return that list and the rest */
export function unwrapList(data: any): { list: any[] | null; rest: Record<string, any> } {
  if (Array.isArray(data)) return { list: data, rest: {} };
  if (!data || typeof data !== 'object') return { list: null, rest: {} };
  const entries = Object.entries(data);
  const arrays = entries.filter(([, v]) => Array.isArray(v) && (v as any[]).length > 0 && typeof (v as any[])[0] === 'object');
  if (arrays.length === 1) {
    const [key, list] = arrays[0]!;
    const rest = Object.fromEntries(entries.filter(([k]) => k !== key));
    return { list: list as any[], rest };
  }
  const inner = data.data ?? data.result ?? data.results;
  if (inner && typeof inner === 'object' && inner !== data) {
    const deeper = unwrapList(inner);
    if (deeper.list) return deeper;
  }
  return { list: null, rest: data };
}

/** First non-empty value among candidate keys (dot paths allowed) */
export function pick(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) return v;
  }
  return undefined;
}

export function humanizeKey(key: string) {
  const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const URL_RE = /^https?:\/\/\S+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function formatDate(value: string | number) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const hasTime = typeof value === 'number' || /[T ]\d{2}:\d{2}/.test(String(value));
  return d.toLocaleString(undefined, hasTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function isDateLike(value: any) {
  return typeof value === 'string' && ISO_DATE.test(value.trim());
}

/** Slack-style "1697123456.000200" seconds, or ms numbers, as a Date value */
export function toDateValue(value: any): string | number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && /^\d{10}(\.\d+)?$/.test(value)) return Math.round(parseFloat(value) * 1000);
  if (typeof value === 'string' && /^\d{13}$/.test(value)) return Number(value);
  if (typeof value === 'number' && value > 1e9) return value < 1e11 ? value * 1000 : value;
  return value;
}

export function shortText(value: any, max = 140) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ─── Small UI pieces ───

const muted = 'text-slate-400 dark:text-[#7a7a7a]';

export function Muted({ children }: { children: React.ReactNode }) {
  return <span className={muted}>{children}</span>;
}

/** Show a link as host + path only: query strings can hold signatures or tokens */
export function linkLabel(href: string) {
  try {
    const u = new URL(href);
    const path = u.pathname === '/' ? '' : decodeURIComponent(u.pathname);
    const label = `${u.host}${path}`;
    return label.length > 70 ? `${label.slice(0, 69)}…` : label;
  } catch { return href; }
}

export function LinkValue({ href, children }: { href: string; children?: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-[#7cb7ff] hover:underline break-all"
      onClick={(e) => e.stopPropagation()}
    >
      {children ?? linkLabel(href)}
    </a>
  );
}

/** One value, shown the right way: date, link, email, yes/no, list, or text */
export function Value({ value }: { value: any }) {
  if (value === null || value === undefined || value === '') return <Muted>None</Muted>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number') return <span className="tabular-nums">{value.toLocaleString()}</span>;
  if (typeof value === 'string') {
    const v = value.trim();
    if (v === '••••••') return <Muted>Hidden</Muted>;
    if (URL_RE.test(v)) return <LinkValue href={v} />;
    if (EMAIL_RE.test(v)) return <LinkValue href={`mailto:${v}`}>{v}</LinkValue>;
    if (isDateLike(v)) return <span>{formatDate(v)}</span>;
    return <span className="whitespace-pre-wrap break-words">{v}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <Muted>None</Muted>;
    if (value.every((v) => typeof v !== 'object' || v === null)) return <span className="break-words">{value.map((v) => String(v)).join(', ')}</span>;
    return <span>{value.length} items</span>;
  }
  return <span className="break-words">{shortText(value)}</span>;
}

/** Label → value rows, like a profile card. Nested objects become their own small section. */
export function KeyValueTable({ data, depth = 0, maxRows = 14 }: { data: Record<string, any>; depth?: number; maxRows?: number }) {
  const [showAll, setShowAll] = useState(false);
  const entries = Object.entries(data ?? {});
  const flat = entries.filter(([, v]) => !(v && typeof v === 'object' && !Array.isArray(v)) || depth >= 2);
  const nested = entries.filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v) && depth < 2);
  const shown = showAll ? flat : flat.slice(0, maxRows);
  if (entries.length === 0) return <Muted>Nothing returned</Muted>;
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[minmax(90px,32%)_1fr] gap-x-4 gap-y-1.5 text-[13.5px]">
        {shown.map(([k, v]) => (
          <React.Fragment key={k}>
            <span className={cn(muted, 'truncate')}>{humanizeKey(k)}</span>
            <span className="text-slate-800 dark:text-[#e6e6e6] min-w-0">
              {Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' ? <MiniList items={v} /> : <Value value={v} />}
            </span>
          </React.Fragment>
        ))}
      </div>
      {flat.length > maxRows && <ShowMore shown={shown.length} total={flat.length} open={showAll} onToggle={() => setShowAll((s) => !s)} />}
      {nested.map(([k, v]) => (
        <div key={k} className="mt-2 flex flex-col gap-1.5">
          <SectionLabel>{humanizeKey(k)}</SectionLabel>
          <KeyValueTable data={v} depth={depth + 1} maxRows={maxRows} />
        </div>
      ))}
    </div>
  );
}

function MiniList({ items }: { items: any[] }) {
  return (
    <span className="flex flex-col gap-0.5">
      {items.slice(0, 5).map((it, i) => (
        <span key={i} className="truncate">{String(pick(it, ['name', 'title', 'label', 'email', 'id']) ?? shortText(it, 80))}</span>
      ))}
      {items.length > 5 && <Muted>+{items.length - 5} more</Muted>}
    </span>
  );
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[12.5px] font-medium text-slate-500 dark:text-[#8a8a8a]">
      <span>{children}</span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-[#2a2a2a]" />
      {right}
    </div>
  );
}

export function ShowMore({ shown, total, open, onToggle }: { shown: number; total: number; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="self-start mt-1 text-[12.5px] font-medium text-slate-500 hover:text-slate-800 dark:text-[#8a8a8a] dark:hover:text-white cursor-pointer"
    >
      {open ? 'Show less' : `Show all ${total} (${total - shown} more)`}
    </button>
  );
}

const CHIP_TONES: Array<[RegExp, string]> = [
  [/^(active|open|success|succeeded|completed|done|resolved|approved|ready|published|live|accepted|sent|paid|connected|yes|true)$/i, 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'],
  [/^(pending|in[ _-]?progress|queued|scheduled|draft|waiting|processing|building|review|tentative)$/i, 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'],
  [/^(failed|error|closed|cancel(l)?ed|rejected|blocked|inactive|deleted|expired|unpaid|declined|no|false|banned)$/i, 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'],
];

export function Chip({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const text = String(children ?? '');
  const toneClass = tone ?? CHIP_TONES.find(([re]) => re.test(text.trim()))?.[1] ?? 'bg-slate-100 text-slate-600 dark:bg-[#2a2a2a] dark:text-[#b5b5b5]';
  return <span className={cn('inline-flex items-center rounded-md px-1.5 py-[1px] text-[11.5px] font-medium leading-[18px] whitespace-nowrap', toneClass)}>{children}</span>;
}

export function Avatar({ name, src, size = 28 }: { name?: string; src?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials = (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };
  if (src && !broken && /^https?:\/\//.test(src)) {
    return <img src={src} alt={name ?? ''} style={style} onError={() => setBroken(true)} className="shrink-0 rounded-full object-cover bg-slate-100 dark:bg-[#2a2a2a]" />;
  }
  return <span style={style} className="shrink-0 rounded-full bg-slate-200 text-slate-600 dark:bg-[#2a2a2a] dark:text-[#c9c9c9] flex items-center justify-center font-semibold">{initials}</span>;
}

/** Table for a list of objects; picks the most useful columns */
const COLUMN_PRIORITY = ['name', 'title', 'subject', 'full_name', 'label', 'email', 'role', 'status', 'type', 'state', 'count', 'amount', 'price', 'date', 'created_at', 'createdAt', 'updated_at', 'updatedAt', 'due', 'due_date', 'url'];

export function DataTable({ rows, columns, max = 8 }: { rows: any[]; columns?: string[]; max?: number }) {
  const [showAll, setShowAll] = useState(false);
  const objects = rows.filter((r) => r && typeof r === 'object');
  if (objects.length === 0) return <Value value={rows} />;
  const keys = columns ?? (() => {
    const counts = new Map<string, number>();
    objects.slice(0, 30).forEach((r) => Object.entries(r).forEach(([k, v]) => {
      if (v !== null && v !== '' && typeof v !== 'object') counts.set(k, (counts.get(k) ?? 0) + 1);
    }));
    const all = [...counts.keys()].filter((k) => !/^(_id|id|uuid)$/i.test(k) || counts.size <= 2);
    const score = (k: string) => { const i = COLUMN_PRIORITY.indexOf(k); return i === -1 ? 100 + (30 - (counts.get(k) ?? 0)) : i; };
    return all.sort((a, b) => score(a) - score(b)).slice(0, 4);
  })();
  const shown = showAll ? objects : objects.slice(0, max);
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#2a2a2a] [scrollbar-width:thin]">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#1b1b1b]">
              {keys.map((k) => (
                <th key={k} className="px-3 py-1.5 text-left font-medium text-slate-500 dark:text-[#8a8a8a] whitespace-nowrap">{humanizeKey(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-[#232323]">
                {keys.map((k) => (
                  <td key={k} className="px-3 py-1.5 align-top text-slate-800 dark:text-[#e0e0e0] max-w-[260px]">
                    <span className="line-clamp-2"><Value value={r[k]} /></span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {objects.length > max && <ShowMore shown={shown.length} total={objects.length} open={showAll} onToggle={() => setShowAll((s) => !s)} />}
    </div>
  );
}

/** Generic list of cards: icon/avatar, title, subtitle, meta line, chip, link */
export interface ListItemSpec {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  chip?: React.ReactNode;
  href?: string;
  leading?: React.ReactNode;
  body?: React.ReactNode;
}

export function ItemList({ items, max = 6, empty = 'Nothing found' }: { items: ListItemSpec[]; max?: number; empty?: string }) {
  const [showAll, setShowAll] = useState(false);
  if (items.length === 0) return <Muted>{empty}</Muted>;
  const shown = showAll ? items : items.slice(0, max);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-[#232323] rounded-lg border border-slate-200 dark:border-[#2a2a2a] overflow-hidden">
        {shown.map((it, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2 bg-white/60 dark:bg-transparent">
            {it.leading && <div className="mt-0.5 shrink-0">{it.leading}</div>}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-[13.5px] font-medium text-slate-800 dark:text-[#ececec]">
                  {it.href ? <LinkValue href={it.href}>{it.title}</LinkValue> : it.title}
                </span>
                {it.chip}
              </div>
              {it.subtitle && <div className="truncate text-[12.5px] text-slate-500 dark:text-[#9a9a9a]">{it.subtitle}</div>}
              {it.body && <div className="mt-1 text-[12.5px] text-slate-600 dark:text-[#b0b0b0] line-clamp-3 whitespace-pre-wrap">{it.body}</div>}
            </div>
            {it.meta && <div className="shrink-0 text-right text-[12px] text-slate-400 dark:text-[#7a7a7a] whitespace-nowrap">{it.meta}</div>}
          </div>
        ))}
      </div>
      {items.length > max && <ShowMore shown={shown.length} total={items.length} open={showAll} onToggle={() => setShowAll((s) => !s)} />}
    </div>
  );
}

export function TextBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 900;
  return (
    <div className="flex flex-col gap-1">
      <div className={cn('rounded-lg bg-white/60 dark:bg-[#1b1b1b] border border-slate-200 dark:border-[#2a2a2a] px-3 py-2 font-mono text-[12.5px] leading-relaxed text-slate-700 dark:text-[#d4d4d4] whitespace-pre-wrap break-words overflow-y-auto [scrollbar-width:thin]', !open && 'max-h-[240px]')}>
        {open || !long ? text : `${text.slice(0, 900)}…`}
      </div>
      {long && <ShowMore shown={900} total={text.length} open={open} onToggle={() => setOpen((o) => !o)} />}
    </div>
  );
}

export function StatTiles({ stats }: { stats: Array<{ label: string; value: any }> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-slate-200 dark:border-[#2a2a2a] px-3 py-2 bg-white/60 dark:bg-transparent">
          <div className="text-[12px] text-slate-500 dark:text-[#8a8a8a] truncate">{s.label}</div>
          <div className="text-[18px] font-semibold text-slate-900 dark:text-white tabular-nums truncate"><Value value={s.value} /></div>
        </div>
      ))}
    </div>
  );
}
