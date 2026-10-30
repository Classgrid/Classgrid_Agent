// Studio Mode's Review tab: the changes of this chat's newest answer, file by file. The diff of one file with line
// numbers, the "Files changed" list beside it (its width follows the drag handle), find in the diff, and Accept /
// Reject (all, or one file) on the same checkpoints as Project Mode.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronUp, FileDiff, ListTree, RotateCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { latestCheckpointFor, markCheckpoint } from "@/components/ai/components/stepper/ProjectToolSteps";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const LIST_KEY = "cg_studio_review_list";

type ReviewFile = { file: string; added: number; removed: number; kind: string; diff: string };
type Row = { kind: "add" | "del" | "same" | "hunk"; text: string; line: number | null };

async function api(path: string, init?: RequestInit) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// A unified diff as rows with the line number they have in the new file (removed lines: in the old file)
function diffRows(diff: string): Row[] {
  const rows: Row[] = [];
  let oldLine = 0;
  let newLine = 0;
  for (const l of diff.split("\n")) {
    if (/^(diff --git|index |--- |\+\+\+ |new file mode|deleted file mode)/.test(l)) continue;
    const hunk = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { oldLine = Number(hunk[1]); newLine = Number(hunk[2]); rows.push({ kind: "hunk", text: l, line: null }); continue; }
    if (l.startsWith("+")) rows.push({ kind: "add", text: l.slice(1), line: newLine++ });
    else if (l.startsWith("-")) rows.push({ kind: "del", text: l.slice(1), line: oldLine++ });
    else if (l.startsWith("\\")) continue;
    else { rows.push({ kind: "same", text: l.slice(1), line: newLine++ }); oldLine++; }
  }
  return rows;
}

// The line numbers stay put while the diff scrolls sideways: a solid background with the row's tint on top
const NUMBER_BG: Record<Row["kind"], string> = {
  add: "[background:linear-gradient(rgba(22,130,93,0.12),rgba(22,130,93,0.12)),#ffffff] dark:[background:linear-gradient(rgba(78,201,176,0.09),rgba(78,201,176,0.09)),#1e1e1e]",
  del: "[background:linear-gradient(rgba(205,49,49,0.10),rgba(205,49,49,0.10)),#ffffff] dark:[background:linear-gradient(rgba(244,135,113,0.09),rgba(244,135,113,0.09)),#1e1e1e]",
  same: "bg-white dark:bg-[#1e1e1e]",
  hunk: "bg-white dark:bg-[#1e1e1e]",
};

const nameOf = (p: string) => p.split("/").pop() || p;
const dirOf = (p: string) => p.split("/").slice(0, -1).join("/");

export function StudioReviewView({ projectId, onChanged }: { projectId: string | null; onChanged?: () => void }) {
  const { pathname } = useLocation();
  const chatId = (() => { const parts = pathname.split("/"); const at = parts.indexOf("studio"); return at !== -1 && parts[at + 1] ? parts[at + 1] : null; })();
  const [checkpoint, setCheckpoint] = useState<string | null>(null);
  const [files, setFiles] = useState<ReviewFile[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listShown, setListShown] = useState(true);
  const [listWidth, setListWidth] = useState(() => { try { return Number(localStorage.getItem(LIST_KEY)) || 300; } catch { return 300; } });
  const [find, setFind] = useState<string | null>(null);
  const [hit, setHit] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);

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
    setCurrent((c) => (c && list.some((f) => f.file === c) ? c : list[0]?.file || null));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [projectId, chatId]);

  const file = files?.find((f) => f.file === current) || null;
  const rows = useMemo(() => (file ? diffRows(file.diff) : []), [file]);
  const q = (find || "").trim().toLowerCase();
  const hits = useMemo(() => (q ? rows.map((r, i) => (r.kind !== "hunk" && r.text.toLowerCase().includes(q) ? i : -1)).filter((i) => i >= 0) : []), [rows, q]);
  useEffect(() => { setHit(0); }, [q, current]);
  useEffect(() => {
    if (!hits.length) return;
    diffRef.current?.querySelector(`[data-row="${hits[hit]}"]`)?.scrollIntoView({ block: "center" });
  }, [hit, hits]);

  const reject = async (one?: string) => {
    if (!checkpoint) return;
    if (!window.confirm(one ? `Throw away the agent's changes to ${one}?` : "Throw away all of this answer's changes?")) return;
    setBusy(true);
    const { res, data } = await api(`${cpPath(checkpoint)}/reject`, { method: "POST", body: JSON.stringify({ file: one }) });
    setBusy(false);
    if (!res.ok) { toast.error(data.error || "Could not reject the changes"); return; }
    markCheckpoint(checkpoint, one ? { rejectedFiles: [one] } : { status: "rejected" });
    toast.success(one ? `${one} put back` : `Rejected: ${data.reverted} file${data.reverted === 1 ? "" : "s"} put back`);
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
  const totalAdd = files?.reduce((n, f) => n + f.added, 0) || 0;
  const totalDel = files?.reduce((n, f) => n + f.removed, 0) || 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Title, totals and actions */}
      <div className="shrink-0 flex items-center gap-2 h-12 px-4 border-b border-border">
        <span className="text-[14px] font-medium">Review</span>
        {!!files?.length && (
          <span className="text-[12.5px] text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"}
            <span className="ml-2 text-[#16825d] dark:text-[#4ec9b0]">+{totalAdd}</span>
            <span className="ml-1 text-[#cd3131] dark:text-[#f48771]">-{totalDel}</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!!files?.length && (
            <>
              <button className={btn} disabled={busy} onClick={() => reject()}>Reject all</button>
              <button className={btn} disabled={busy} onClick={accept}>Accept all</button>
            </>
          )}
          <button className={iconBtn} onClick={() => setFind(find === null ? "" : null)} title="Find in the changes" aria-label="Find in the changes"><Search className="size-4" /></button>
          <button className={iconBtn} onClick={() => setListShown((s) => !s)} title={listShown ? "Hide the files list" : "Show the files list"} aria-label="Files list"><ListTree className="size-4" /></button>
          <button className={iconBtn} onClick={load} title="Refresh" aria-label="Refresh"><RotateCw className="size-4" /></button>
        </div>
      </div>

      {/* Find */}
      {find !== null && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
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
            className="flex-1 min-w-0 h-8 px-3 rounded-md border border-border bg-white dark:bg-[#1e1e1e] text-[13px] outline-none focus:border-foreground/30"
          />
          <span className="shrink-0 text-[12px] text-muted-foreground w-20 text-center">{q ? (hits.length ? `${hit + 1} of ${hits.length}` : "No results") : ""}</span>
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
          {/* The diff of one file */}
          <div className="flex-1 min-w-0 flex flex-col">
            {file && (
              <div className="shrink-0 flex items-center gap-2 h-10 px-4 border-b border-border text-[13px]">
                <span className="truncate font-medium">{nameOf(file.file)}</span>
                {dirOf(file.file) && <span className="truncate text-[12px] text-muted-foreground">{dirOf(file.file)}</span>}
                <span className="shrink-0 text-[12px] text-[#16825d] dark:text-[#4ec9b0]">+{file.added}</span>
                <span className="shrink-0 text-[12px] text-[#cd3131] dark:text-[#f48771]">-{file.removed}</span>
                <button className={`${btn} ml-auto shrink-0`} disabled={busy} onClick={() => reject(file.file)}>Reject file</button>
              </div>
            )}
            <div ref={diffRef} className="flex-1 min-h-0 overflow-auto bg-white dark:bg-[#1e1e1e] font-mono text-[12.5px] leading-[1.6] [scrollbar-width:thin]">
              <div className="min-w-max py-1">
                {rows.map((r, i) => (
                  <div
                    key={i}
                    data-row={i}
                    className={`flex ${r.kind === "add" ? "bg-[#16825d]/12 dark:bg-[#4ec9b0]/[0.09]" : r.kind === "del" ? "bg-[#cd3131]/10 dark:bg-[#f48771]/[0.09]" : ""} ${hits[hit] === i ? "outline outline-1 outline-sky-500" : ""}`}
                  >
                    <span className={`sticky left-0 shrink-0 w-12 pr-3 text-right select-none text-[#237893] dark:text-[#6e7681] ${NUMBER_BG[r.kind]}`}>{r.line ?? ""}</span>
                    <span className={`shrink-0 w-4 select-none ${r.kind === "add" ? "text-[#16825d] dark:text-[#4ec9b0]" : r.kind === "del" ? "text-[#cd3131] dark:text-[#f48771]" : "text-transparent"}`}>{r.kind === "add" ? "+" : r.kind === "del" ? "-" : " "}</span>
                    <span className={`pr-6 whitespace-pre ${r.kind === "hunk" ? "text-muted-foreground" : ""} ${q && r.kind !== "hunk" && r.text.toLowerCase().includes(q) ? "bg-amber-300/30" : ""}`}>{r.text || " "}</span>
                  </div>
                ))}
              </div>
            </div>
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
                    onClick={() => setCurrent(f.file)}
                    className={`w-full flex items-center gap-2 px-4 py-1.5 text-left text-[13px] hover:bg-secondary transition-colors ${f.file === current ? "bg-secondary" : ""}`}
                    title={f.file}
                  >
                    <span className="truncate">{nameOf(f.file)}</span>
                    <span className="truncate text-[11.5px] text-muted-foreground">{dirOf(f.file)}</span>
                    <span className="ml-auto shrink-0 text-[11.5px] text-[#16825d] dark:text-[#4ec9b0]">+{f.added}</span>
                    <span className="shrink-0 text-[11.5px] text-[#cd3131] dark:text-[#f48771]">-{f.removed}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
