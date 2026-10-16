import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FileText, Github, Loader2 } from 'lucide-react';
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
const openInEditor = (detail: { path: string; startLine?: number; endLine?: number; find?: string }) =>
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
  const real = String(step.result || '').match(/\+(\d+) -(\d+)\)\.?\s*$/);
  const added = real ? Number(real[1]) : step.tool === 'write_project_file' ? lineCount(step.args?.content) : edits.reduce((n, e) => n + lineCount(e.new_text), 0);
  const removed = real ? Number(real[2]) : edits.reduce((n, e) => n + lineCount(e.old_text), 0);
  const failed = isError(step);

  return (
    <div className="flex flex-col">
      <Row onClick={loading ? undefined : () => setOpen(!open)} open={open}>
        <span className="shrink-0">{loading ? 'Editing' : failed ? 'Could not edit' : step.tool === 'write_project_file' && !step.args?.overwrite ? 'Created' : 'Edited'}</span>
        <FileBadge path={path} />
        <FileLink path={path} find={edits[0]?.new_text?.split("\n").find((l) => l.trim()) || undefined} />
        {!failed && <span className="shrink-0 text-xs text-green-600 dark:text-green-500">+{added}</span>}
        {!failed && <span className="shrink-0 text-xs text-red-600 dark:text-red-500">-{removed}</span>}
        {loading && <Loader2 className="size-3.5 shrink-0 animate-spin" />}
      </Row>
      <ErrorLine step={step} />
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
  const isOpen = open ?? loading;
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
        <span className="shrink-0">{loading ? 'Exploring' : 'Explored'}</span>
        <Name>{parts}</Name>
        {loading && <Loader2 className="size-3.5 shrink-0 animate-spin" />}
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
      {loading && <Loader2 className="size-3.5 shrink-0 animate-spin" />}
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

export function FilesChangedSummary({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState(false);
  const byFile = new Map<string, FileChange>();
  const add = (c: FileChange) => {
    const prev = byFile.get(c.path) || { path: c.path, added: 0, removed: 0 };
    byFile.set(c.path, { path: c.path, added: prev.added + c.added, removed: prev.removed + c.removed });
  };
  for (const s of steps || []) {
    if (s.status === 'loading' || isError(s)) continue;
    if (PROJECT_EDIT_TOOLS.has(s.tool)) {
      const real = String(s.result || '').match(/\+(\d+) -(\d+)\)\.?\s*$/);
      const p = String(s.args?.path || '').replace(/^\/data\/project\//, '').replace(/^\/home\/workspace\/projects\/[^/]+\//, '');
      if (real && p) add({ path: p, added: Number(real[1]), removed: Number(real[2]) });
    } else if (s.tool === 'run_code' || s.tool === 'execute_terminal_command') {
      changesFromRun(s.result).forEach(add);
    }
  }
  const files = [...byFile.values()];
  if (!files.length) return null;
  const added = files.reduce((n, f) => n + f.added, 0);
  const removed = files.reduce((n, f) => n + f.removed, 0);
  return (
    <div className="mt-3 rounded-xl border border-border bg-secondary/30">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-2.5 text-[14px] text-slate-500 dark:text-[#8a8a8a] hover:text-foreground">
        <span>{files.length} file{files.length > 1 ? 's' : ''} changed</span>
        <span className="text-green-600 dark:text-green-500">+{added}</span>
        <span className="text-red-600 dark:text-red-500">-{removed}</span>
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </button>
      {open && <div className="border-t border-border px-4 py-1">{files.map((f) => <ChangeRow key={f.path} change={f} />)}</div>}
    </div>
  );
}
