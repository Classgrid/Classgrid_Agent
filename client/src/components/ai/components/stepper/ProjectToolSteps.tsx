import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FileText, Github } from 'lucide-react';
import { Spinner } from '@/components/marketing_ui/spinner';
import { cn } from '@/lib/utils';

// Steps of the Project Mode file tools, shown like a code editor's agent: "Edited calculator.ts +26 -0",
// and reading/searching grouped as "Exploring 2 files, 1 search".

export const PROJECT_EXPLORE_TOOLS = new Set(['view_project_file', 'search_project', 'list_project_files']);
export const PROJECT_EDIT_TOOLS = new Set(['write_project_file', 'edit_project_file']);

type Step = { id: string; tool: string; status?: string; args?: any; result?: string };

const baseName = (p = '') => String(p).replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop() || p || 'project';
const lineCount = (s = '') => (String(s) === '' ? 0 : String(s).split('\n').length);
const isError = (s?: Step) => !!s?.result && /^(error|no project is open)/i.test(String(s.result).trim());

const EXT_BADGE: Record<string, [string, string]> = {
  ts: ['TS', 'text-blue-600 dark:text-blue-400'], tsx: ['TS', 'text-blue-600 dark:text-blue-400'],
  js: ['JS', 'text-yellow-600 dark:text-yellow-400'], jsx: ['JS', 'text-yellow-600 dark:text-yellow-400'],
  py: ['PY', 'text-sky-600 dark:text-sky-400'], json: ['{}', 'text-amber-600 dark:text-amber-400'],
  md: ['M↓', 'text-slate-500'], css: ['#', 'text-pink-600 dark:text-pink-400'], html: ['<>', 'text-orange-600 dark:text-orange-400'],
};

function FileBadge({ path }: { path: string }) {
  const ext = baseName(path).split('.').pop()?.toLowerCase() || '';
  const badge = EXT_BADGE[ext];
  if (!badge) return <FileText className="size-3.5 shrink-0 text-muted-foreground" />;
  return <span className={cn('text-[10px] font-bold leading-none shrink-0', badge[1])}>{badge[0]}</span>;
}

function Row({ children, onClick, open }: { children: React.ReactNode; onClick?: () => void; open?: boolean }) {
  return (
    <div className="relative z-10 flex items-center gap-3 p-1 pr-3 -ml-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1">
        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-[#4a4a4a]" />
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn('flex min-w-0 items-center gap-1.5 text-[14px] text-slate-500 dark:text-[#8a8a8a] text-left', onClick && 'hover:text-foreground')}
      >
        {children}
        {onClick && (open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />)}
      </button>
    </div>
  );
}

const Name = ({ children }: { children: React.ReactNode }) => <span className="font-medium text-foreground/90 truncate">{children}</span>;

// Ask Project Mode to open a file in the code editor (at lines, or at a piece of text)
export const OPEN_PROJECT_FILE_EVENT = "classgrid:open-project-file";
const openInEditor = (detail: { path: string; startLine?: number; endLine?: number; find?: string; folder?: boolean }) =>
  window.dispatchEvent(new CustomEvent(OPEN_PROJECT_FILE_EVENT, { detail }));

function FileLink({ path, startLine, endLine, find }: { path: string; startLine?: number; endLine?: number; find?: string }) {
  return (
    <span
      role="link"
      tabIndex={0}
      title="Open in the editor"
      onClick={(e) => { e.stopPropagation(); openInEditor({ path, startLine, endLine, find }); }}
      onKeyDown={(e) => { if (e.key === "Enter") openInEditor({ path, startLine, endLine, find }); }}
      className="font-medium text-foreground/90 truncate cursor-pointer hover:underline"
    >
      {baseName(path)}
    </span>
  );
}

const ErrorLine = ({ step }: { step: Step }) => (isError(step) ? <div className="ml-10 -mt-1 mb-1 text-xs text-red-600 dark:text-red-500">{String(step.result).replace(/^error:\s*/i, "")}</div> : null);

export function ProjectEditStep({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const path = step.args?.path || '';
  const loading = step.status === 'loading';
  const edits: { old_text?: string; new_text?: string }[] = step.tool === 'edit_project_file' ? (step.args?.edits || []) : [];
  // The real change comes back from the tool ("+208 -0"); until then (or for old chats) it is estimated from the request
  const real = String(step.result || '').match(/\+(\d+) -(\d+)\)\./);
  const added = real ? Number(real[1]) : step.tool === 'write_project_file' ? lineCount(step.args?.content) : edits.reduce((n, e) => n + lineCount(e.new_text), 0);
  const removed = real ? Number(real[2]) : edits.reduce((n, e) => n + lineCount(e.old_text), 0);
  const failed = isError(step);

  return (
    <div className="flex flex-col">
      <Row onClick={loading ? undefined : () => setOpen(!open)} open={open}>
        <span className="shrink-0">{loading ? 'Editing' : failed ? 'Could not edit' : step.tool === 'write_project_file' ? 'Created' : 'Edited'}</span>
        <FileBadge path={path} />
        <FileLink path={path} find={edits[0]?.new_text?.split("\n").find((l) => l.trim()) || undefined} />
        {!failed && <span className="shrink-0 text-xs text-green-600 dark:text-green-500">+{added}</span>}
        {!failed && <span className="shrink-0 text-xs text-red-600 dark:text-red-500">-{removed}</span>}
        {loading && <Spinner className="size-3.5 shrink-0" />}
      </Row>
      <ErrorLine step={step} />
      {!failed && /Editor problems in this file now/.test(String(step.result || '')) && (
        <div className="ml-10 -mt-1 mb-1 text-xs text-amber-600 dark:text-amber-500 whitespace-pre-line">
          {String(step.result).split('Editor problems in this file now')[1]?.replace(/^\s*\((\d+)\):/, '$1 problem(s) in the editor:')}
        </div>
      )}
      {open && (
        <div className="ml-10 mr-2 mb-2 rounded-lg border border-border overflow-hidden text-[12px] font-mono">
          <div className="px-3 py-1.5 border-b border-border text-muted-foreground font-sans text-xs truncate">{path}</div>
          <div className="max-h-[320px] overflow-auto">
            {failed && <div className="px-3 py-2 text-red-600 dark:text-red-500 font-sans">{step.result}</div>}
            {step.tool === 'write_project_file'
              ? String(step.args?.content || '').split('\n').slice(0, 200).map((l, i) => (
                  <div key={i} className="px-3 whitespace-pre bg-green-500/10 text-green-800 dark:text-green-300">+ {l}</div>
                ))
              : edits.map((e, i) => (
                  <div key={i} className={cn(i > 0 && 'border-t border-border')}>
                    {String(e.old_text || '').split('\n').map((l, j) => <div key={`o${j}`} className="px-3 whitespace-pre bg-red-500/10 text-red-800 dark:text-red-300">- {l}</div>)}
                    {String(e.new_text || '').split('\n').map((l, j) => <div key={`n${j}`} className="px-3 whitespace-pre bg-green-500/10 text-green-800 dark:text-green-300">+ {l}</div>)}
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExploreItem({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const loading = step.status === 'loading';
  const result = String(step.result || '');

  if (step.tool === 'search_project') {
    const matches = !result || /^no matches/i.test(result.trim()) || isError(step) ? [] : result.trim().split('\n');
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 py-1 text-[14px] text-slate-500 dark:text-[#8a8a8a]">
          <button type="button" disabled={!matches.length} onClick={() => setOpen(!open)} className="flex min-w-0 items-center gap-1.5 hover:text-foreground disabled:hover:text-inherit">
            <span className="shrink-0">{loading ? 'Searching' : 'Searched'}</span>
            <Name>{step.args?.query}</Name>
            {!loading && <span className="shrink-0 rounded-full bg-secondary px-2 text-xs">{matches.length} result{matches.length === 1 ? '' : 's'}</span>}
          </button>
        </div>
        {open && (
          <div className="mb-1 ml-1 max-h-[220px] overflow-auto rounded-md border border-border font-mono text-[12px]">
            {matches.slice(0, 100).map((m, i) => {
              const hit = m.match(/^(.+?):(\d+):/);
              return (
                <div
                  key={i}
                  onClick={hit ? () => openInEditor({ path: hit[1] || "", startLine: Number(hit[2]), endLine: Number(hit[2]) }) : undefined}
                  className={cn("px-2 py-0.5 truncate", hit && "cursor-pointer hover:bg-secondary")}
                >
                  {m}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (step.tool === 'list_project_files') {
    const entries = isError(step) ? [] : result.split('\n').slice(1).filter((l) => l && l !== '(empty)');
    const dir = step.args?.path || 'project';
    return (
      <div className="flex flex-col">
        <button type="button" disabled={!entries.length} onClick={() => setOpen(!open)} className="flex min-w-0 items-center gap-1.5 py-1 text-[14px] text-slate-500 dark:text-[#8a8a8a] hover:text-foreground">
          <span className="shrink-0">{loading ? 'Analyzing' : 'Analyzed'}</span>
          <Folder className="size-3.5 shrink-0" />
          <Name>{baseName(dir)}</Name>
          {entries.length > 0 && (open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />)}
        </button>
        {open && (
          <div className="mb-1 ml-5 max-h-[220px] overflow-auto text-[13px]">
            {entries.slice(0, 200).map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 py-0.5 text-slate-500 dark:text-[#8a8a8a]">
                {e.endsWith('/') ? <Folder className="size-3.5 shrink-0" /> : <FileBadge path={e} />}
                {e.endsWith("/") ? <span className="truncate">{e}</span> : <span onClick={() => openInEditor({ path: (step.args?.path ? String(step.args.path).replace(/\/+$/, "") + "/" : "") + e })} className="truncate cursor-pointer hover:underline">{e}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // view_project_file: "Analyzed calculator.ts #L1-26"
  const range = result.match(/\(lines (\d+)-(\d+) of \d+\)/);
  return (
    <div className="flex items-center gap-1.5 py-1 text-[14px] text-slate-500 dark:text-[#8a8a8a]">
      <span className="shrink-0">{loading ? 'Analyzing' : isError(step) ? 'Could not open' : 'Analyzed'}</span>
      <FileBadge path={step.args?.path} />
      <FileLink path={step.args?.path} startLine={range ? Number(range[1]) : undefined} endLine={range ? Number(range[2]) : undefined} />
      {range && <span className="shrink-0 text-xs opacity-70">#L{range[1]}-{range[2]}</span>}
    </div>
  );
}

export function ProjectExploreGroup({ steps }: { steps: Step[] }) {
  const loading = steps.some((s) => s.status === 'loading');
  const [open, setOpen] = useState<boolean | null>(null);
  // Open while the AI explores. Between two steps nothing is loading for a moment; closing right then made the
  // list flash shut and open again, so it only closes after a short quiet time.
  const [busy, setBusy] = useState(loading);
  useEffect(() => {
    if (loading) { setBusy(true); return; }
    const t = setTimeout(() => setBusy(false), 1500);
    return () => clearTimeout(t);
  }, [loading]);
  const isOpen = open ?? busy;
  const files = steps.filter((s) => s.tool === 'view_project_file').length;
  const searches = steps.filter((s) => s.tool === 'search_project').length;
  const folders = steps.filter((s) => s.tool === 'list_project_files').length;
  const parts = [
    files && `${files} file${files > 1 ? 's' : ''}`,
    searches && `${searches} search${searches > 1 ? 'es' : ''}`,
    folders && `${folders} folder${folders > 1 ? 's' : ''}`,
  ].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col">
      <Row onClick={() => setOpen(!isOpen)} open={isOpen}>
        <span className="shrink-0">{busy ? 'Exploring' : 'Explored'}</span>
        <Name>{parts}</Name>
        {busy && <Spinner className="size-3.5 shrink-0" />}
      </Row>
      {isOpen && <div className="ml-10 flex flex-col">{steps.map((s) => <ExploreItem key={s.id} step={s} />)}</div>}
    </div>
  );
}

export function ProjectPushStep({ step }: { step: Step }) {
  const loading = step.status === 'loading';
  const failed = isError(step) || /failed/i.test(String(step.result || ''));
  const repo = String(step.result || '').match(/to ([\w.-]+\/[\w.-]+)/)?.[1];
  return (
    <Row>
      <Github className="size-3.5 shrink-0" />
      <span className="shrink-0">{loading ? 'Pushing to GitHub' : failed ? 'Push failed' : 'Pushed to GitHub'}</span>
      {repo && <Name>{repo}</Name>}
      {loading && <Spinner className="size-3.5 shrink-0" />}
    </Row>
  );
}

// Files a code/terminal run changed in the project ("FILES CHANGED IN PROJECT:" from the server), and the
// files a whole answer changed, like a code editor's "3 files changed +21 -5".
type FileChange = { path: string; added: number; removed: number };

export function changesFromRun(result?: string): FileChange[] {
  const part = String(result || '').split('FILES CHANGED IN PROJECT:')[1];
  if (!part) return [];
  return part.trim().split('\n').map((l) => l.match(/^\+(\d+) -(\d+) (.+)$/)).filter(Boolean)
    .map((m) => ({ path: m![3] || '', added: Number(m![1]), removed: Number(m![2]) }));
}

function ChangeRow({ change, verb }: { change: FileChange; verb?: string }) {
  const dir = change.path.includes('/') ? change.path.slice(0, change.path.lastIndexOf('/')) : '';
  return (
    <div className="flex min-w-0 items-center gap-1.5 py-1 text-[14px] text-slate-500 dark:text-[#8a8a8a]">
      {verb && <span className="shrink-0">{verb}</span>}
      <FileBadge path={change.path} />
      <FileLink path={change.path} />
      <span className="shrink-0 text-xs text-green-600 dark:text-green-500">+{change.added}</span>
      <span className="shrink-0 text-xs text-red-600 dark:text-red-500">-{change.removed}</span>
      {dir && !verb && <span className="truncate text-xs opacity-60">{dir}</span>}
    </div>
  );
}

export function ProjectRunChanges({ result }: { result?: string }) {
  const changes = changesFromRun(result);
  if (!changes.length) return null;
  return <div className="ml-10 -mt-1 mb-1 flex flex-col">{changes.map((c) => <ChangeRow key={c.path} change={c} verb="Changed" />)}</div>;
}

// Project Mode shows the review window for an answer's checkpoint (Review = see and accept/reject, Undo = go back)
export const REVIEW_CHECKPOINT_EVENT = "classgrid:review-checkpoint";
const reviewCheckpoint = (detail: { sessionId: string; checkpoint: string; mode: 'review' | 'undo' }) =>
  window.dispatchEvent(new CustomEvent(REVIEW_CHECKPOINT_EVENT, { detail }));

// What the user did with an answer's changes (kept, rejected, undone, or single files rejected). Remembered in this
// browser so the box under the answer stays right after a refresh; the files themselves are changed on the server.
type CheckpointState = { status?: 'kept' | 'rejected' | 'undone'; rejectedFiles?: string[] };
const CHECKPOINT_STATE_EVENT = "classgrid:checkpoint-state";
const cpKey = (id: string) => `cg_cp_${id}`;
const readCheckpointState = (id?: string): CheckpointState => {
  if (!id) return {};
  try { return JSON.parse(localStorage.getItem(cpKey(id)) || "{}"); } catch { return {}; }
};
export function markCheckpoint(id: string, change: CheckpointState) {
  const next = { ...readCheckpointState(id), ...change };
  if (change.rejectedFiles) next.rejectedFiles = [...new Set([...(readCheckpointState(id).rejectedFiles || []), ...change.rejectedFiles])];
  try { localStorage.setItem(cpKey(id), JSON.stringify(next)); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent(CHECKPOINT_STATE_EVENT, { detail: { id, state: next } }));
}

export function FilesChangedSummary({ steps, checkpoint, sessionId }: { steps: Step[]; checkpoint?: string; sessionId?: string }) {
  const [open, setOpen] = useState(false);
  const [cpState, setCpState] = useState<CheckpointState>(() => readCheckpointState(checkpoint));
  useEffect(() => {
    setCpState(readCheckpointState(checkpoint));
    const onState = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.id === checkpoint) setCpState(d.state); };
    window.addEventListener(CHECKPOINT_STATE_EVENT, onState);
    return () => window.removeEventListener(CHECKPOINT_STATE_EVENT, onState);
  }, [checkpoint]);
  const byFile = new Map<string, FileChange>();
  const add = (c: FileChange) => {
    const prev = byFile.get(c.path) || { path: c.path, added: 0, removed: 0 };
    byFile.set(c.path, { path: c.path, added: prev.added + c.added, removed: prev.removed + c.removed });
  };
  for (const s of steps || []) {
    if (s.status === 'loading' || isError(s)) continue;
    if (PROJECT_EDIT_TOOLS.has(s.tool)) {
      const real = String(s.result || '').match(/\+(\d+) -(\d+)\)\./);
      const p = String(s.args?.path || '').replace(/^\/data\/project\//, '').replace(/^\/data\//, '').replace(/^\/home\/workspace\/projects\/[^/]+\//, '');
      if (real && p) add({ path: p, added: Number(real[1]), removed: Number(real[2]) });
    } else if (s.tool === 'run_code' || s.tool === 'execute_terminal_command') {
      changesFromRun(s.result).forEach(add);
    }
  }
  const files = [...byFile.values()];
  if (!files.length) return null;
  const rejected = new Set(cpState.rejectedFiles || []);
  const allRejected = files.every((f) => rejected.has(f.path));
  const status = cpState.status || (allRejected ? 'rejected' : undefined);
  const done = status === 'rejected' || status === 'undone';
  const live = files.filter((f) => !done && !rejected.has(f.path));
  const added = (done ? files : live).reduce((n, f) => n + f.added, 0);
  const removed = (done ? files : live).reduce((n, f) => n + f.removed, 0);
  const title = status === 'undone' ? 'Changes undone' : status === 'rejected' ? 'Changes rejected' : status === 'kept' ? `${files.length} file${files.length > 1 ? 's' : ''} changed · kept`
    : `${live.length} file${live.length === 1 ? '' : 's'} changed${rejected.size ? ` · ${rejected.size} rejected` : ''}`;
  return (
    <div className="mt-3 rounded-xl border border-border bg-secondary/30">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-2.5 text-[14px] text-slate-500 dark:text-[#8a8a8a] hover:text-foreground">
        <span>{title}</span>
        {!done && <span className="text-green-600 dark:text-green-500">+{added}</span>}
        {!done && <span className="text-red-600 dark:text-red-500">-{removed}</span>}
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {checkpoint && sessionId && inProjectMode() && !status && (
          <span className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span role="button" tabIndex={0} onClick={() => reviewCheckpoint({ sessionId, checkpoint, mode: 'review' })} className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground hover:bg-secondary">Review</span>
            <span role="button" tabIndex={0} onClick={() => reviewCheckpoint({ sessionId, checkpoint, mode: 'undo' })} className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground hover:bg-secondary">Undo</span>
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-1">
          {files.map((f) => (
            <div key={f.path} className={cn((done || rejected.has(f.path)) && 'line-through opacity-50')}>
              <ChangeRow change={f} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A file the AI names in its answer (`src/App.tsx`, `calculator.ts:25`, `logger.ts#L10-20`), shown as a link that
// opens it in the Project Mode editor at that line. Only in Project Mode; elsewhere it stays normal code.
const FILE_MENTION = /^((?:[\w.@-]+\/)*[\w@-][\w.@-]*\.(?:tsx?|jsx?|mjs|cjs|json|md|mdx|html?|css|scss|sass|less|py|rb|go|rs|java|kt|php|c|h|cpp|hpp|cs|swift|vue|svelte|ya?ml|toml|ini|env|txt|sh|sql|graphql|xml|svg|prisma|dart|lock|tsbuildinfo|gitignore|config))(?::(\d+)(?:-(\d+))?|#L(\d+)(?:-L?(\d+))?|,?\s*\(?lines?\s*(\d+)(?:\s*[-–]\s*(\d+))?\)?)?$/i;

const inProjectMode = () => typeof window !== 'undefined' && window.location.pathname.split('/').includes('project');
// A folder named in the answer (`src/components/`): needs a "/" so normal words never match
const FOLDER_MENTION = /^(?:\.\/)?((?:[\w@-][\w.@-]*\/)+(?:[\w@-][\w@-]*)?)\/?$/;

export function parseFileMention(text: string) {
  if (!inProjectMode()) return null;
  const t = String(text).trim();
  const folder = t.match(FOLDER_MENTION);
  if (folder && folder[1] && !/\.[A-Za-z][A-Za-z0-9]*$/.test(folder[1].replace(/\/$/, ''))) {
    return { path: folder[1].replace(/\/$/, ''), folder: true, label: t };
  }
  const m = t.match(FILE_MENTION);
  if (!m || !m[1]) return null;
  // Code like res.json / process.env / package.lock looks like a file name; without a folder in front, skip those words
  if (!m[1].includes('/') && /^(res|req|process|window|document|module|exports|this|self|app|router|response|request|data|obj|config|os|fs|path|console|json|math|object|array|string|promise|error|event|e|err|ctx|props|state)\./i.test(m[1])) return null;
  const start = Number(m[2] || m[4] || m[6]) || undefined;
  const end = Number(m[3] || m[5] || m[7]) || start;
  return { path: m[1], startLine: start, endLine: end, label: String(text).trim() };
}

// A link the AI wrote to a project file or folder ([App.tsx](src/App.tsx), /data/src, the editor path, or this
// site's own address with a file path): opens in the editor instead of going to a web page.
export function parseProjectLink(href?: string) {
  if (!href || !inProjectMode()) return null;
  let p = String(href).trim();
  if (/^(mailto:|tel:|#)/i.test(p)) return null;
  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p);
      if (u.host !== window.location.host) return null; // a real website
      p = decodeURIComponent(u.pathname) + u.hash;
    } catch { return null; }
  }
  p = p.replace(/^file:\/\//i, '').replace(/^\/home\/workspace\/projects\/[^/]+\/?/, '').replace(/^\/data\/?/, '').replace(/^\.\//, '').replace(/^\//, '');
  if (!p || /^(c|superadmin|agent|chat|org|dept|faculty|student|api)(\/|$)/.test(p)) return null; // our own app pages
  const line = p.match(/(?:#L|:)(\d+)(?:-L?(\d+))?$/);
  const path = p.replace(/(?:#L|:)\d+(?:-L?\d+)?$/, '').replace(/\/$/, '');
  if (!path) return null;
  const isFolder = !/\.[A-Za-z][A-Za-z0-9]*$/.test(path);
  return { path, folder: isFolder, startLine: line ? Number(line[1]) : undefined, endLine: line ? Number(line[2] || line[1]) : undefined };
}

export function FileMentionChip({ path, startLine, endLine, label, folder }: { path: string; startLine?: number; endLine?: number; label: React.ReactNode; folder?: boolean }) {
  const go = () => openInEditor({ path, startLine, endLine, folder });
  return (
    <span
      role="link"
      tabIndex={0}
      title={folder ? `Show ${path} in the editor` : startLine ? `Open ${path} at line ${startLine}` : `Open ${path}`}
      onClick={go}
      onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
      className="inline-flex max-w-full items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 align-baseline font-mono text-[0.85em] text-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-500/20 hover:underline"
    >
      {folder ? <Folder className="size-3.5 shrink-0" /> : <FileBadge path={path} />}
      {/* Long paths break onto the next line instead of pushing the chat wider than a narrow panel */}
      <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
    </span>
  );
}
