// Studio Mode's Review tab: the changes of this chat's newest answer. Every changed file is a section that opens to its
// diff (old and new line numbers; one column, or old and new side by side), with the "Files changed" list beside it
// (its width follows the drag handle). Find across the changes (match case, whole word, regular expression), collapse
// or expand all files, hide whitespace-only changes, fold unchanged lines, and Accept / Reject (all, or one file) on
// the same checkpoints as Project Mode.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, ChevronUp, ChevronsDownUp, ChevronsUpDown, Columns2, FileDiff, FoldVertical, ListTree, MoreVertical, RotateCw, Search, Space, X } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/marketing_ui/dropdown-menu";
import { FileBadge, latestCheckpointFor, markCheckpoint } from "@/components/ai/components/stepper/ProjectToolSteps";
import { fetchWithRescue } from "@/lib/rescue";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const LIST_KEY = "cg_studio_review_list";
const VIEW_KEY = "cg_studio_review_view";
const CONTEXT = 3; // unchanged lines kept around each change when folding

type ReviewFile = { file: string; added: number; removed: number; kind: string; diff: string };
type Row = { kind: "add" | "del" | "same" | "hunk" | "fold"; text: string; oldLine: number | null; newLine: number | null; hidden?: number };
type Pair = { left: Row | null; right: Row | null; full?: Row };
type View = { split: boolean; hideWs: boolean; fold: boolean };

async function api(path: string, init?: RequestInit) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// A unified diff as rows with their line numbers in the old and the new file
function diffRows(diff: string): Row[] {
  const rows: Row[] = [];
  let oldLine = 0;
  let newLine = 0;
  for (const l of diff.split("\n")) {
    if (/^(diff --git|index |--- |\+\+\+ |new file mode|deleted file mode)/.test(l)) continue;
    const hunk = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { oldLine = Number(hunk[1]); newLine = Number(hunk[2]); rows.push({ kind: "hunk", text: l, oldLine: null, newLine: null }); continue; }
    if (l.startsWith("\\")) continue;
    if (l.startsWith("+")) rows.push({ kind: "add", text: l.slice(1), oldLine: null, newLine: newLine++ });
    else if (l.startsWith("-")) rows.push({ kind: "del", text: l.slice(1), oldLine: oldLine++, newLine: null });
    else rows.push({ kind: "same", text: l.slice(1), oldLine: oldLine++, newLine: newLine++ });
  }
  return rows;
}

// Runs of removed lines and the added lines right after them
function runs(rows: Row[], each: (row: Row | null, dels: Row[] | null, adds: Row[] | null) => void) {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (r.kind !== "del" && r.kind !== "add") { each(r, null, null); continue; }
    const dels: Row[] = [];
    while (i < rows.length && rows[i]!.kind === "del") dels.push(rows[i++]!);
    const adds: Row[] = [];
    while (i < rows.length && rows[i]!.kind === "add") adds.push(rows[i++]!);
    i--;
    each(null, dels, adds);
  }
}

// Whitespace-only changes become unchanged lines, and added or removed blank lines are left out
function withoutWhitespace(rows: Row[]): Row[] {
  const squash = (t: string) => t.replace(/\s+/g, "");
  const out: Row[] = [];
  runs(rows, (row, dels, adds) => {
    if (row) { out.push(row); return; }
    for (let k = 0; k < Math.max(dels!.length, adds!.length); k++) {
      const d = dels![k], a = adds![k];
      if (d && a && squash(d.text) === squash(a.text)) out.push({ kind: "same", text: a.text, oldLine: d.oldLine, newLine: a.newLine });
      else { if (d) out.push(d); if (a) out.push(a); }
    }
  });
  return out.filter((r) => !((r.kind === "add" || r.kind === "del") && !r.text.trim()));
}

// Unchanged lines far from any change fold into one "N unchanged lines" row
function folded(rows: Row[]): Row[] {
  const near = new Array<boolean>(rows.length).fill(false);
  rows.forEach((r, i) => {
    if (r.kind === "add" || r.kind === "del") for (let k = Math.max(0, i - CONTEXT); k <= Math.min(rows.length - 1, i + CONTEXT); k++) near[k] = true;
  });
  const out: Row[] = [];
  let skipped = 0;
  rows.forEach((r, i) => {
    if (r.kind === "same" && !near[i]) { skipped++; return; }
    if (skipped) { out.push({ kind: "fold", text: "", oldLine: null, newLine: null, hidden: skipped }); skipped = 0; }
    out.push(r);
  });
  if (skipped) out.push({ kind: "fold", text: "", oldLine: null, newLine: null, hidden: skipped });
  return out;
}

// Side by side: unchanged lines on both sides, removed lines on the left beside the added lines on the right
function pairs(rows: Row[]): Pair[] {
  const out: Pair[] = [];
  runs(rows, (row, dels, adds) => {
    if (row) { out.push(row.kind === "same" ? { left: row, right: row } : { left: null, right: null, full: row }); return; }
    for (let k = 0; k < Math.max(dels!.length, adds!.length); k++) out.push({ left: dels![k] || null, right: adds![k] || null });
  });
  return out;
}

// The line numbers stay put while the diff scrolls sideways: a solid background with the row's tint on top
const NUMBER_BG: Record<string, string> = {
  add: "[background:linear-gradient(rgba(22,130,93,0.12),rgba(22,130,93,0.12)),#ffffff] dark:[background:linear-gradient(rgba(78,201,176,0.09),rgba(78,201,176,0.09)),#000000]",
  del: "[background:linear-gradient(rgba(205,49,49,0.10),rgba(205,49,49,0.10)),#ffffff] dark:[background:linear-gradient(rgba(244,135,113,0.09),rgba(244,135,113,0.09)),#000000]",
  none: "bg-white dark:bg-[#000000]",
};
const ROW_BG: Record<string, string> = { add: "bg-[#16825d]/12 dark:bg-[#4ec9b0]/[0.09]", del: "bg-[#cd3131]/10 dark:bg-[#f48771]/[0.09]", none: "" };
const SIGN: Record<string, string> = { add: "+", del: "-" };
const SIGN_COLOR: Record<string, string> = { add: "text-[#16825d] dark:text-[#4ec9b0]", del: "text-[#cd3131] dark:text-[#f48771]" };
const GREEN = "text-[#16825d] dark:text-[#4ec9b0]";
const RED = "text-[#cd3131] dark:text-[#f48771]";

const nameOf = (p: string) => p.split("/").pop() || p;
const dirOf = (p: string) => p.split("/").slice(0, -1).join("/");
const tone = (r: Row | null) => (r && (r.kind === "add" || r.kind === "del") ? r.kind : "none");
const lineNo = (n: number | null | undefined) => (n === null || n === undefined ? "" : n);
const textOf = (r: Row | null) => (r && r.kind !== "hunk" && r.kind !== "fold" ? r.text : "");

function readView(): View {
  try { return { split: false, hideWs: false, fold: false, ...JSON.parse(localStorage.getItem(VIEW_KEY) || "{}") }; } catch { return { split: false, hideWs: false, fold: false }; }
}

export function StudioReviewView({ projectId, onChanged }: { projectId: string | null; onChanged?: () => void }) {
  const { pathname } = useLocation();
  const chatId = (() => { const parts = pathname.split("/"); const at = parts.indexOf("studio"); return at !== -1 && parts[at + 1] ? parts[at + 1] : null; })();
  const [checkpoint, setCheckpoint] = useState<string | null>(null);
  const [files, setFiles] = useState<ReviewFile[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set()); // the file sections that are open
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listShown, setListShown] = useState(true);
  const [listWidth, setListWidth] = useState(() => { try { return Number(localStorage.getItem(LIST_KEY)) || 300; } catch { return 300; } });
  const [view, setView] = useState<View>(readView);
  const [find, setFind] = useState<string | null>(null);
  const [findOpts, setFindOpts] = useState({ caseSensitive: false, wholeWord: false, regex: false });
  const [hit, setHit] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);

  const setOption = (key: keyof View) => setView((v) => {
    const next = { ...v, [key]: !v[key] };
    try { localStorage.setItem(VIEW_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
    return next;
  });

  const cpPath = (cp: string) => `/projects/${projectId}/checkpoints/${chatId}/${cp}`;
  const load = async () => {
    setError("");
    const cp = chatId ? latestCheckpointFor(chatId) : null;
    setCheckpoint(cp);
    if (!projectId || !chatId || !cp) { setFiles([]); return; }
    setFiles(null);
    const { res, data } = await api(cpPath(cp));
    if (!res.ok) { setError(data.error || "Could not load the changes"); setFiles([]); return; }
    const list: ReviewFile[] = data.files || [];
    setFiles(list);
    setOpen((o) => new Set([...o].filter((f) => list.some((x) => x.file === f))));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [projectId, chatId]);

  // Each file's rows (and side-by-side pairs) with the view options applied
  const prepared = useMemo(() => {
    const map = new Map<string, { rows: Row[]; pairs: Pair[] }>();
    for (const f of files || []) {
      let r = diffRows(f.diff);
      if (view.hideWs) r = withoutWhitespace(r);
      if (view.fold) r = folded(r);
      map.set(f.file, { rows: r, pairs: view.split ? pairs(r) : [] });
    }
    return map;
  }, [files, view.hideWs, view.fold, view.split]);

  // Find across all files: match case, whole word, or a regular expression
  const q = find || "";
  const matcher = useMemo(() => {
    if (!q.trim()) return null;
    try {
      const flags = findOpts.caseSensitive ? "" : "i";
      if (findOpts.regex) return new RegExp(q, flags);
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(findOpts.wholeWord ? `\\b${escaped}\\b` : escaped, flags);
    } catch { return null; }
  }, [q, findOpts]);
  const matches = (t: string) => !!matcher && !!t && matcher.test(t);
  const hits = useMemo(() => {
    if (!matcher) return [] as { file: string; idx: number }[];
    const out: { file: string; idx: number }[] = [];
    for (const f of files || []) {
      const p = prepared.get(f.file);
      if (!p) continue;
      if (view.split) p.pairs.forEach((x, i) => { if (matches(textOf(x.left)) || matches(textOf(x.right))) out.push({ file: f.file, idx: i }); });
      else p.rows.forEach((r, i) => { if (matches(textOf(r))) out.push({ file: f.file, idx: i }); });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matcher, prepared, files, view.split]);
  useEffect(() => { setHit(0); }, [matcher, view.split]);
  const current = hits[hit];
  useEffect(() => {
    if (!current) return;
    setOpen((o) => (o.has(current.file) ? o : new Set([...o, current.file])));
    requestAnimationFrame(() => diffRef.current?.querySelector(`[data-hit="${CSS.escape(`${current.file}|${current.idx}`)}"]`)?.scrollIntoView({ block: "center" }));
  }, [current]);
  const isCurrent = (file: string, idx: number) => !!current && current.file === file && current.idx === idx;

  const toggle = (file: string) => setOpen((o) => { const n = new Set(o); if (n.has(file)) n.delete(file); else n.add(file); return n; });
  const showFile = (file: string) => {
    setOpen((o) => new Set([...o, file]));
    requestAnimationFrame(() => diffRef.current?.querySelector(`[data-file="${CSS.escape(file)}"]`)?.scrollIntoView({ block: "start" }));
  };

  // Reject asks first in our own confirm card (the same one as deleting a chat)
  const [confirmReject, setConfirmReject] = useState<{ file?: string } | null>(null);
  const reject = (one?: string) => { if (checkpoint) setConfirmReject({ file: one }); };
  const doReject = async (one?: string) => {
    if (!checkpoint) return;
    setBusy(true);
    const { res, data } = await api(`${cpPath(checkpoint)}/reject`, { method: "POST", body: JSON.stringify({ file: one }) });
    setBusy(false);
    if (!res.ok) { toast.error(data.error || "Could not reject the changes"); return; }
    markCheckpoint(checkpoint, one ? { rejectedFiles: [one] } : { status: "rejected" });
    toast.success(one ? `${one} put back` : `Rejected: ${data.reverted} file${data.reverted === 1 ? "" : "s"} put back`);
    setConfirmReject(null);
    onChanged?.();
    load();
  };
  const accept = () => {
    if (!checkpoint) return;
    markCheckpoint(checkpoint, { status: "kept" });
    toast.success("Changes kept");
    load();
  };

  // Drag the line between the diff and the list
  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const box = bodyRef.current?.getBoundingClientRect();
    if (!box) return;
    let last = listWidth;
    const move = (ev: PointerEvent) => {
      last = Math.round(Math.min(box.width - 220, Math.max(180, box.right - ev.clientX)));
      setListWidth(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      try { localStorage.setItem(LIST_KEY, String(last)); } catch { /* storage blocked */ }
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const iconBtn = "flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40";
  const btn = "h-7 px-2.5 rounded-md text-[12.5px] border border-border hover:bg-secondary transition-colors disabled:opacity-40";
  const menuItem = "gap-3 py-2 px-3 text-[13.5px] cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-[#2a2a2a] focus:bg-slate-100 dark:focus:bg-[#2a2a2a]";
  const menuCard = "z-[100] bg-white dark:bg-[#202020] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-2xl";
  const optBtn = (on: boolean) => `flex items-center justify-center h-6 min-w-6 px-1 rounded text-[11.5px] font-mono transition-colors ${on ? "bg-sky-500/20 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`;
  const totalAdd = files?.reduce((n, f) => n + f.added, 0) || 0;
  const totalDel = files?.reduce((n, f) => n + f.removed, 0) || 0;
  const allOpen = !!files?.length && files.every((f) => open.has(f.file));
  const mark = (on: boolean) => (on ? "bg-amber-300/30" : "");
  const foldRow = (key: string | number, hidden: number | undefined, attrs: Record<string, string>) => (
    <button key={key} {...attrs} onClick={() => setOption("fold")} className="w-full text-left px-4 py-0.5 text-[12px] text-muted-foreground bg-black/[0.03] dark:bg-white/[0.03] hover:text-foreground">
      ⋯ {hidden} unchanged line{hidden === 1 ? "" : "s"}
    </button>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Title, totals and actions */}
      <div className="shrink-0 flex items-center gap-2 h-12 px-4 border-b border-border">
        <span className="text-[14px] font-medium">Review</span>
        {!!files?.length && (
          <span className="text-[12.5px] text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"}
            <span className={`ml-2 ${GREEN}`}>+{totalAdd}</span>
            <span className={`ml-1 ${RED}`}>-{totalDel}</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!!files?.length && (
            <>
              <button className={btn} disabled={busy} onClick={() => reject()}>Reject all</button>
              <button className={btn} disabled={busy} onClick={accept}>Accept all</button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={iconBtn} title="View options" aria-label="View options"><MoreVertical className="size-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className={`w-[250px] ${menuCard}`}>
              <DropdownMenuItem className={menuItem} onClick={() => setOption("split")}>
                <Columns2 className="size-4 text-muted-foreground" /> View split diff {view.split && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItem} onClick={() => setOption("hideWs")}>
                <Space className="size-4 text-muted-foreground" /> Hide whitespace changes {view.hideWs && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItem} onClick={() => setOpen(allOpen ? new Set() : new Set((files || []).map((f) => f.file)))}>
                {allOpen ? <ChevronsDownUp className="size-4 text-muted-foreground" /> : <ChevronsUpDown className="size-4 text-muted-foreground" />} {allOpen ? "Collapse all" : "Expand all"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1" />
              <DropdownMenuItem className={menuItem} onClick={() => setOption("fold")}>
                <FoldVertical className="size-4 text-muted-foreground" /> Collapse unchanged lines {view.fold && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button className={`${iconBtn} ${find !== null ? "bg-secondary text-foreground" : ""}`} onClick={() => setFind(find === null ? "" : null)} title="Find in the changes" aria-label="Find in the changes"><Search className="size-4" /></button>
          <button className={`${iconBtn} ${listShown ? "bg-secondary text-foreground" : ""}`} onClick={() => setListShown((s) => !s)} title={listShown ? "Hide the files list" : "Show the files list"} aria-label="Files list"><ListTree className="size-4" /></button>
          <button className={iconBtn} onClick={load} title="Refresh" aria-label="Refresh"><RotateCw className="size-4" /></button>
        </div>
      </div>

      {/* Find */}
      {find !== null && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
          <div className="flex-1 min-w-0 flex items-center h-8 pl-3 pr-1 rounded-md border border-border bg-white dark:bg-[#1e1e1e] focus-within:border-foreground/30">
            <input
              autoFocus
              data-no-ring
              value={find}
              onChange={(e) => setFind(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hits.length) setHit((h) => (e.shiftKey ? (h - 1 + hits.length) % hits.length : (h + 1) % hits.length));
                if (e.key === "Escape") setFind(null);
              }}
              placeholder="Find"
              className="flex-1 min-w-0 bg-transparent text-[13px] outline-none"
            />
            <button className={optBtn(findOpts.caseSensitive)} onClick={() => setFindOpts((o) => ({ ...o, caseSensitive: !o.caseSensitive }))} title="Match case">Aa</button>
            <button className={optBtn(findOpts.wholeWord)} onClick={() => setFindOpts((o) => ({ ...o, wholeWord: !o.wholeWord }))} title="Match whole word"><span className="underline underline-offset-2">ab</span></button>
            <button className={optBtn(findOpts.regex)} onClick={() => setFindOpts((o) => ({ ...o, regex: !o.regex }))} title="Use regular expression">.*</button>
          </div>
          <span className="shrink-0 text-[12px] text-muted-foreground w-20 text-center">{q.trim() ? (hits.length ? `${hit + 1} of ${hits.length}` : "No results") : ""}</span>
          <button className={iconBtn} disabled={!hits.length} onClick={() => setHit((h) => (h - 1 + hits.length) % hits.length)} aria-label="Previous"><ChevronUp className="size-4" /></button>
          <button className={iconBtn} disabled={!hits.length} onClick={() => setHit((h) => (h + 1) % hits.length)} aria-label="Next"><ChevronDown className="size-4" /></button>
          <button className={iconBtn} onClick={() => setFind(null)} aria-label="Close"><X className="size-4" /></button>
        </div>
      )}

      {files === null ? (
        <div className="px-4 py-4 flex flex-col gap-2">
          {[70, 50, 60].map((w, i) => <div key={i} className="h-4 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      ) : !files.length ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-sm text-center flex flex-col items-center gap-3">
            <div className="flex items-center justify-center size-12 rounded-full border border-border"><FileDiff className="size-5 text-muted-foreground" /></div>
            <p className="text-base font-medium">Nothing to review</p>
            <p className="text-sm text-muted-foreground">{error || (checkpoint ? "No changes left from the newest answer." : "When the agent changes files in this chat, its changes show here to accept or reject.")}</p>
          </div>
        </div>
      ) : (
        <div ref={bodyRef} className="flex-1 min-h-0 flex">
          {/* Every changed file: a section that opens to its diff */}
          <div ref={diffRef} className="flex-1 min-w-0 overflow-auto dark:bg-[#000000] [scrollbar-width:thin]">
            {files.map((f) => {
              const isOpen = open.has(f.file);
              const p = prepared.get(f.file);
              return (
                <div key={f.file} data-file={f.file} className="border-b border-border">
                  <div className="sticky top-0 z-10 flex items-center gap-2 h-10 px-3 bg-[#f5f5f5] dark:bg-[#000000] border-b border-border text-[13px]">
                    <button onClick={() => toggle(f.file)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <FileBadge path={f.file} />
                      <span className="truncate font-medium">{nameOf(f.file)}</span>
                      {dirOf(f.file) && <span className="truncate text-[11.5px] text-muted-foreground">{dirOf(f.file)}</span>}
                      <span className={`ml-auto shrink-0 text-[12px] ${GREEN}`}>+{f.added}</span>
                      <span className={`shrink-0 text-[12px] ${RED}`}>-{f.removed}</span>
                      {isOpen ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                    </button>
                    {isOpen && <button className={`${btn} shrink-0`} disabled={busy} onClick={() => reject(f.file)}>Reject file</button>}
                  </div>
                  {isOpen && p && (
                    <div className="bg-white dark:bg-[#000000] font-mono text-[12.5px] leading-[1.6]">
                      {!view.split ? (
                        <div className="py-1">
                          {p.rows.map((r, i) => {
                            const attrs = { "data-hit": `${f.file}|${i}` };
                            if (r.kind === "fold") return foldRow(i, r.hidden, attrs);
                            return (
                              <div key={i} {...attrs} className={`flex ${ROW_BG[tone(r)]} ${isCurrent(f.file, i) ? "outline outline-1 outline-sky-500" : ""}`}>
                                <span className={`shrink-0 flex select-none text-[#237893] dark:text-[#6e7681] ${NUMBER_BG[tone(r)]}`}>
                                  <span className="w-9 pr-2 text-right">{lineNo(r.oldLine)}</span>
                                  <span className="w-9 pr-2 text-right">{lineNo(r.newLine)}</span>
                                </span>
                                <span className={`shrink-0 w-4 select-none ${SIGN_COLOR[r.kind] || "text-transparent"}`}>{SIGN[r.kind] || " "}</span>
                                <span className={`min-w-0 flex-1 pr-4 whitespace-pre-wrap break-words ${r.kind === "hunk" ? "text-muted-foreground" : ""} ${mark(matches(textOf(r)))}`}>{r.text || " "}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Old on the left, new on the right
                        <div className="pb-1">
                          <div className="grid grid-cols-2 border-b border-border text-[11.5px] font-sans text-muted-foreground">
                            <div className="px-3 py-1">Before</div>
                            <div className="px-3 py-1 border-l border-border">After</div>
                          </div>
                          {p.pairs.map((x, i) => {
                            const attrs = { "data-hit": `${f.file}|${i}` };
                            if (x.full) return x.full.kind === "fold"
                              ? foldRow(i, x.full.hidden, attrs)
                              : <div key={i} {...attrs} className="px-4 text-muted-foreground whitespace-pre overflow-hidden text-ellipsis">{x.full.text}</div>;
                            return (
                              <div key={i} {...attrs} className={`grid grid-cols-2 ${isCurrent(f.file, i) ? "outline outline-1 outline-sky-500" : ""}`}>
                                {(["left", "right"] as const).map((side) => {
                                  const r = x[side];
                                  const t = r && r.kind !== "same" ? tone(r) : "none";
                                  return (
                                    <div key={side} className={`flex min-w-0 ${side === "right" ? "border-l border-border" : ""} ${r ? ROW_BG[t] : "bg-black/[0.02] dark:bg-white/[0.02]"}`}>
                                      <span className="shrink-0 w-11 pr-2 text-right select-none text-[#237893] dark:text-[#6e7681]">{r ? lineNo(side === "left" ? r.oldLine : r.newLine) : ""}</span>
                                      <span className={`shrink-0 w-4 select-none ${r && r.kind !== "same" ? SIGN_COLOR[r.kind] : "text-transparent"}`}>{r && r.kind !== "same" ? SIGN[r.kind] : " "}</span>
                                      <span className={`min-w-0 pr-3 whitespace-pre-wrap break-all ${mark(matches(textOf(r)))}`}>{r ? r.text || " " : ""}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Drag handle + the files changed */}
          {listShown && (
            <>
              <div onPointerDown={startDrag} className="relative shrink-0 w-px bg-border cursor-col-resize after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-[''] hover:bg-sky-500/60 transition-colors" title="Drag to resize" />
              <div className="shrink-0 min-h-0 overflow-y-auto py-2 [scrollbar-width:thin]" style={{ width: listWidth }}>
                <div className="px-4 pb-1 text-[12px] font-medium text-muted-foreground">Files changed</div>
                {files.map((f) => (
                  <button
                    key={f.file}
                    onClick={() => showFile(f.file)}
                    className={`w-full flex items-center gap-2 px-4 py-1.5 text-left text-[13px] hover:bg-secondary transition-colors ${open.has(f.file) ? "text-foreground" : "text-foreground/80"}`}
                    title={f.file}
                  >
                    <FileBadge path={f.file} />
                    <span className="truncate">{nameOf(f.file)}</span>
                    <span className="truncate text-[11.5px] text-muted-foreground">{dirOf(f.file)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <DangerConfirmDialog
        open={!!confirmReject}
        onOpenChange={(o) => { if (!o && !busy) setConfirmReject(null); }}
        title={confirmReject?.file ? "Reject this file's changes" : "Reject all changes"}
        description={confirmReject?.file
          ? `The agent's changes to ${confirmReject.file} will be thrown away and the file put back as it was before this answer.`
          : "All of this answer's changes will be thrown away and every file put back as it was before this answer."}
        warningMessage="This can't be undone."
        actionLabel={confirmReject?.file ? "Reject file" : "Reject all"}
        isLoading={busy}
        onConfirm={() => doReject(confirmReject?.file)}
      />
    </div>
  );
}
