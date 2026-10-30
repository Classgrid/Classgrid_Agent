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
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Github } from 'lucide-react';
import { themeIcons } from 'seti-icons';
import { Spinner } from '@/components/marketing_ui/spinner';
import { CombinedReasoningBlock } from './CombinedReasoningBlock';
import { cn } from '@/lib/utils';
import { ShimmerText } from './ShimmerText';

// Steps of the Project Mode file tools, shown like a code editor's agent: "Edited calculator.ts +26 -0",
// and reading/searching grouped as "Exploring 2 files, 1 search".

export const PROJECT_EXPLORE_TOOLS = new Set(['view_project_file', 'search_project', 'list_project_files', 'search_project_by_meaning']);
export const PROJECT_EDIT_TOOLS = new Set(['write_project_file', 'edit_project_file']);

type Step = { id: string; tool: string; status?: string; args?: any; result?: string; helpers?: HelperLive[] };

const baseName = (p = '') => String(p).replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop() || p || 'project';
const lineCount = (s = '') => (String(s) === '' ? 0 : String(s).split('\n').length);
const isError = (s?: Step) => !!s?.result && /^(error|no project is open)/i.test(String(s.result).trim());

// File icons: the Seti set with VS Code's own Seti colours (the same icons as Studio's Files tab), for every file type
const setiIcon = themeIcons({
  blue: '#519aba', grey: '#4d5a5e', 'grey-light': '#6d8086', green: '#8dc149', orange: '#e37933',
  pink: '#f55385', purple: '#a074c4', red: '#cc3e44', white: '#d4d7d6', yellow: '#cbcb41', ignore: '#41535b',
});

export function FileBadge({ path }: { path: string }) {
  const { svg, color } = setiIcon(baseName(path));
  return <span aria-hidden className="size-3.5 shrink-0 inline-flex items-center justify-center [&_svg]:size-4 [&_svg]:fill-current" style={{ color }} dangerouslySetInnerHTML={{ __html: svg }} />;
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
        <ShimmerText active={loading} className="shrink-0">{loading ? 'Editing' : failed ? 'Could not edit' : step.tool === 'write_project_file' ? 'Created' : 'Edited'}</ShimmerText>
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

  if (step.tool === 'search_project_by_meaning') {
    const places = [...result.matchAll(/^\d+\. (.+?):(\d+)-(\d+) \(match ([\d.]+)\)/gm)].map((m) => ({ file: m[1] || '', start: Number(m[2]), end: Number(m[3]) }));
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 py-1 text-[14px] text-slate-500 dark:text-[#8a8a8a]">
          <button type="button" disabled={!places.length} onClick={() => setOpen(!open)} className="flex min-w-0 items-center gap-1.5 hover:text-foreground disabled:hover:text-inherit">
            <ShimmerText active={loading} className="shrink-0">{loading ? 'Searching by meaning' : 'Searched by meaning'}</ShimmerText>
            <Name>{step.args?.query}</Name>
            {!loading && <span className="shrink-0 rounded-full bg-secondary px-2 text-xs">{places.length} place{places.length === 1 ? '' : 's'}</span>}
          </button>
        </div>
        {open && (
          <div className="mb-1 ml-1 max-h-[220px] overflow-auto rounded-md border border-border font-mono text-[12px]">
            {places.map((p, i) => (
              <div key={i} onClick={() => openInEditor({ path: p.file, startLine: p.start, endLine: p.end })} className="cursor-pointer truncate px-2 py-0.5 hover:bg-secondary">
                {p.file}:{p.start}-{p.end}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step.tool === 'search_project') {
    // The first line is the real total ("Found in 487 files (912 matching lines)…"); the rest are the shown lines
    const total = result.match(/^Found in (\d+) files? \((\d+) matching/);
    const matches = !result || /^no matches/i.test(result.trim()) || isError(step) ? [] : result.trim().split('\n').filter((l) => !/^Found in \d+ file/.test(l));
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 py-1 text-[14px] text-slate-500 dark:text-[#8a8a8a]">
          <button type="button" disabled={!matches.length} onClick={() => setOpen(!open)} className="flex min-w-0 items-center gap-1.5 hover:text-foreground disabled:hover:text-inherit">
            <span className="shrink-0">{loading ? 'Searching' : 'Searched'}</span>
            <Name>{step.args?.query}</Name>
            {!loading && <span className="shrink-0 rounded-full bg-secondary px-2 text-xs">{total ? `${total[1]} file${total[1] === '1' ? '' : 's'}` : `${matches.length} result${matches.length === 1 ? '' : 's'}`}</span>}
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
  const searches = steps.filter((s) => s.tool === 'search_project' || s.tool === 'search_project_by_meaning').length;
  const folders = steps.filter((s) => s.tool === 'list_project_files').length;
  const parts = [
    files && `${files} file${files > 1 ? 's' : ''}`,
    searches && `${searches} search${searches > 1 ? 'es' : ''}`,
    folders && `${folders} folder${folders > 1 ? 's' : ''}`,
  ].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col">
      <Row onClick={() => setOpen(!isOpen)} open={isOpen}>
        <ShimmerText active={busy} className="shrink-0">{busy ? 'Exploring' : 'Explored'}</ShimmerText>
        <Name>{parts}</Name>
        {busy && <Spinner className="size-3.5 shrink-0" />}
      </Row>
      {isOpen && <div className="ml-10 flex flex-col">{steps.map((s) => <ExploreItem key={s.id} step={s} />)}</div>}
    </div>
  );
}

// "Sending 3 helpers" with each helper's task; when done, each helper's answer opens under its task
type HelperResult = { task: string; answer: string; failed: boolean };
function parseHelpers(result?: string): HelperResult[] {
  return String(result || '')
    .split(/\n\n(?=Helper \d+ \()/)
    .map((part) => {
      const m = part.match(/^Helper \d+ \(([\s\S]*?)\)( failed: ([\s\S]*)|:\n([\s\S]*))$/);
      if (!m) return null;
      return { task: m[1], answer: (m[3] ?? m[4] ?? '').trim(), failed: !!m[2]?.startsWith(' failed') };
    })
    .filter(Boolean) as HelperResult[];
}

// What one helper is doing right now (sent live while the helpers work)
// Each read/search is shown the same way as the main Agent's own steps
export type HelperLive = { state: string; actions: { id: string; tool: string; args: any; result?: string; status: string }[]; text: string };

// A box with its own scroll and a height limit, so live helper work doesn't push the page around.
// It keeps showing the newest lines, unless the user scrolled up to read.
function FollowBox({ children, className, follow }: { children: React.ReactNode; className?: string; follow: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [follow]);
  return (
    <div
      ref={ref}
      onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24; }}
      className={cn('overflow-y-auto overscroll-contain pr-1', className)}
    >
      {children}
    </div>
  );
}

function HelperItem({ task, answer, failed, loading, live }: { task: string; answer?: string; failed?: boolean; loading?: boolean; live?: HelperLive }) {
  // Helpers seen working in this session start open, so their live work is visible
  const [openState, setOpen] = useState<boolean | null>(null);
  const open = openState ?? !!live;
  const running = loading && live?.state !== 'done' && live?.state !== 'failed';
  const report = answer || live?.text || '';
  const canOpen = !!report || !!live?.actions.length;
  const isFailed = failed || live?.state === 'failed';
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => canOpen && setOpen(!open)}
        disabled={!canOpen}
        className={cn('flex min-w-0 items-start gap-1.5 py-1 text-[13px] text-left text-slate-500 dark:text-[#8a8a8a]', canOpen && 'hover:text-foreground')}
      >
        {running ? <Spinner className="size-3 shrink-0" /> : <span className={cn('size-1.5 shrink-0 rounded-full', isFailed ? 'bg-red-500' : 'bg-emerald-500')} />}
        <span className="min-w-0 break-words">{task}</span>
        {canOpen && (open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />)}
      </button>
      {open && (
        <div className="ml-3 mb-2 flex flex-col gap-1.5 border-l border-border pl-3">
          {!!live?.actions.length && (
            <>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Work</div>
              <FollowBox className="max-h-[240px]" follow={`${live.actions.length}:${live.actions[live.actions.length - 1]?.result?.length || 0}:${live.state}`}>
                {live.actions.map((a, i) => a.tool === '__thought'
                  ? <CombinedReasoningBlock key={a.id} sentences={String(a.result || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)} isStreaming={!!running && i === live.actions.length - 1 && !live.text} />
                  : <ExploreItem key={a.id} step={a} />)}
                {running && live.state === 'running' && !live.text && !live.actions.some((a) => a.status === 'loading') && live.actions[live.actions.length - 1]?.tool !== '__thought' && (
                  // Same glowing "Thinking" as the main answer
                  <p className="py-1 w-fit bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-[13px] font-medium text-transparent" style={{ animation: "shimmer 2.5s linear infinite" }}>
                    Thinking
                    <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
                  </p>
                )}
              </FollowBox>
            </>
          )}
          {report && (
            <>
              {!!live?.actions.length && <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Result</div>}
              <FollowBox className="max-h-[260px]" follow={report.length}>
                <div className="whitespace-pre-wrap text-[13px] text-foreground/80">{report}</div>
              </FollowBox>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectHelpersStep({ step }: { step: Step }) {
  const loading = step.status === 'loading';
  // Only the first 5 tasks run (the server takes up to 5 helpers)
  const rawTasks: unknown[] = Array.isArray(step.args?.helpers) && step.args.helpers.length ? step.args.helpers : Array.isArray(step.args?.tasks) ? step.args.tasks : [];
  const tasks: string[] = rawTasks.map((t: any) => String(typeof t === 'string' ? t : t?.task ?? '')).filter((t: string) => t.trim()).slice(0, 5);
  const results = loading ? [] : parseHelpers(step.result);
  const n = loading ? tasks.length : results.length || tasks.length;
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? true;
  return (
    <div className="flex flex-col">
      <Row onClick={() => setOpen(!isOpen)} open={isOpen}>
        <ShimmerText active={loading} className="shrink-0">{loading ? `Sending ${n} helper${n === 1 ? '' : 's'}` : `${n} helper${n === 1 ? '' : 's'} explored`}</ShimmerText>
        {loading && <Spinner className="size-3.5 shrink-0" />}
      </Row>
      {isOpen && (
        <div className="ml-10 flex flex-col">
          {loading || !results.length
            ? tasks.map((t, i) => <HelperItem key={i} task={t} loading={loading} live={step.helpers?.[i]} answer={loading ? undefined : String(step.result || '')} />)
            : results.map((r, i) => <HelperItem key={i} task={r.task} answer={r.answer} failed={r.failed} live={step.helpers?.[i]} />)}
        </div>
      )}
    </div>
  );
}

// Background commands: "Started in background npm run dev", "Checked background command: running", "Stopped"
export const PROJECT_BACKGROUND_TOOLS = new Set(['start_background_command', 'check_background_command', 'stop_background_command']);

export function ProjectBackgroundStep({ step }: { step: Step }) {
  const loading = step.status === 'loading';
  const result = String(step.result || '');
  const failed = isError(step) || /^no background command/i.test(result);
  const [open, setOpen] = useState(false);
  let label: string;
  let name: string | null = null;
  if (step.tool === 'start_background_command') {
    label = loading ? 'Starting in background' : failed ? 'Could not start in background' : 'Started in background';
    name = (String(step.args?.command || '').split('\n')[0] ?? '').slice(0, 80);
  } else if (step.tool === 'stop_background_command') {
    label = loading ? 'Stopping background command' : failed ? 'Could not stop background command' : 'Stopped background command';
  } else {
    const state = /still running/.test(result) ? 'running' : /finished \(exit code (\d+)\)/.test(result) ? `finished (exit ${result.match(/exit code (\d+)/)?.[1]})` : null;
    label = loading ? 'Checking background command' : failed ? 'Background command not found' : `Background command ${state || 'checked'}`;
    if (step.args?.run_inside) name = String(step.args.run_inside).slice(0, 80);
  }
  const canOpen = !loading && !!result;
  return (
    <div className="flex flex-col">
      <Row onClick={canOpen ? () => setOpen(!open) : undefined} open={open}>
        <ShimmerText active={loading} className="shrink-0">{label}</ShimmerText>
        {name && <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground/90">{name}</code>}
        {loading && <Spinner className="size-3.5 shrink-0" />}
      </Row>
      {open && <pre className="ml-10 mb-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-2 font-mono text-[12px] text-foreground/80">{result}</pre>}
    </div>
  );
}

// A command step like a coding agent's: "● Terminal  Install the packages", then IN (the command) and OUT (the
// result) in one box. Long text is cut with a Show more.
function ClampedBlock({ text, lines = 6 }: { text: string; lines?: number }) {
  const [all, setAll] = useState(false);
  const rows = text.split('\n');
  const long = rows.length > lines || text.length > 1200;
  const shown = all || !long ? text : rows.slice(0, lines).join('\n').slice(0, 1200);
  return (
    <div className="min-w-0 flex-1">
      <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-foreground/85">{shown}</pre>
      {long && (
        <button type="button" onClick={() => setAll(!all)} className="mt-1 text-[12px] text-muted-foreground hover:text-foreground">
          {all ? 'Show less' : `Show more (${rows.length} lines)`}
        </button>
      )}
    </div>
  );
}

export function TerminalStep({ name, description, command, output, status }: { name: string; description?: string; command: string; output?: string; status?: string }) {
  const loading = status === 'loading';
  const failed = !loading && (/^(error|tool error)/i.test(String(output || '').trim()) || /EXIT CODE: [1-9]/.test(String(output || '')));
  // Click the title to open or close the IN / OUT box (open while it runs, closed after, until the user chooses)
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? loading;
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <button type="button" onClick={() => setOpen(!isOpen)} className="group flex min-w-0 items-center gap-2.5 pl-2.5 text-left">
        {loading
          ? <Spinner className="size-3 shrink-0" />
          : <span className={cn('size-2 shrink-0 rounded-full', failed ? 'bg-red-500' : 'bg-emerald-500')} />}
        <ShimmerText active={loading} className="shrink-0 text-[14px] font-semibold text-foreground">{name}</ShimmerText>
        {description && <span className="truncate text-[14px] text-muted-foreground group-hover:text-foreground">{description}</span>}
        {isOpen ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
      </button>
      {isOpen && <div className="ml-7 overflow-hidden rounded-lg border border-border bg-muted/40 text-[12.5px]">
        <div className="flex gap-3 px-3 py-2">
          <span className="w-8 shrink-0 pt-px font-mono text-[11px] text-muted-foreground">IN</span>
          <ClampedBlock text={command || '…'} lines={4} />
        </div>
        {(loading || output) && (
          <div className="flex gap-3 border-t border-border px-3 py-2">
            <span className="w-8 shrink-0 pt-px font-mono text-[11px] text-muted-foreground">OUT</span>
            {loading && !output
              ? <span className="text-muted-foreground">Running…</span>
              : <ClampedBlock text={String(output || '').trim() || '(no output)'} />}
          </div>
        )}
      </div>}
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
      <ShimmerText active={loading} className="shrink-0">{loading ? 'Pushing to GitHub' : failed ? 'Push failed' : 'Pushed to GitHub'}</ShimmerText>
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
// Every answer with changes in a chat, oldest first, whatever happened to them (kept, pushed, rejected): Studio's
// Review tab shows them all
const chatCheckpoints = new Map<string, string[]>();
export const checkpointsFor = (sessionId: string) => chatCheckpoints.get(sessionId) || [];
export const latestCheckpointFor = (sessionId: string) => checkpointsFor(sessionId).at(-1) || null;
export const CHECKPOINTS_CHANGED_EVENT = "classgrid:checkpoints-changed";
const addCheckpoint = (sessionId: string, checkpoint: string) => {
  const list = chatCheckpoints.get(sessionId) || [];
  if (list.includes(checkpoint)) return;
  chatCheckpoints.set(sessionId, [...list, checkpoint]);
  window.dispatchEvent(new CustomEvent(CHECKPOINTS_CHANGED_EVENT, { detail: { sessionId } }));
};
export function reviewLatestChanges(sessionId: string) {
  const checkpoint = latestCheckpointFor(sessionId);
  if (!checkpoint) return false;
  reviewCheckpoint({ sessionId, checkpoint, mode: 'review' });
  return true;
}

// What the user did with an answer's changes (kept, rejected, undone, or single files rejected). Remembered in this
// browser so the box under the answer stays right after a refresh; the files themselves are changed on the server.
type CheckpointState = { status?: 'kept' | 'rejected' | 'undone'; rejectedFiles?: string[] };
const CHECKPOINT_STATE_EVENT = "classgrid:checkpoint-state";
const cpKey = (id: string) => `cg_cp_${id}`;
export const readCheckpointState = (id?: string): CheckpointState => {
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
  useEffect(() => { if (checkpoint && sessionId) addCheckpoint(sessionId, checkpoint); }, [checkpoint, sessionId]);
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
