// Studio Mode's Files tab: the picked project's files (from GitHub, or the sandbox for a project without a repo),
// a folder tree and a code view with line numbers, side by side on a wide pane with a drag line between them.
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { DocsImageViewer } from "@/components/ai/components/DocsImageViewer";
import { FILE_DRAG_TYPE } from "@/components/ai/components/stepper/ProjectToolSteps";

// Drag a file into the chat box to mention it
const dragFile = (e: React.DragEvent, path: string) => {
  e.dataTransfer.setData(FILE_DRAG_TYPE, path);
  e.dataTransfer.setData("text/plain", path);
  e.dataTransfer.effectAllowed = "copy";
};
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { themeIcons } from "seti-icons";
import { Check, ChevronRight, Copy, Folder, FolderOpen, FolderTree, ListTree, RotateCw, Search, X } from "lucide-react";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const EASE = [0.22, 1, 0.36, 1] as const;
const TREE_KEY = "cg_studio_tree_width";

type Entry = { path: string; type: "file" | "dir"; size: number | null };
type Listing = { source: "github" | "sandbox"; repo: string | null; branch: string | null; files: Entry[]; truncated?: boolean };
type OpenFile = { path: string; content?: string; binary?: boolean; image?: boolean; mime?: string; data?: string; truncated?: boolean; size?: number; error?: string; loading?: boolean; startLine?: number; endLine?: number };
type Node = { name: string; path: string; dir: boolean; children: Node[] };
type Reveal = { path: string; startLine?: number; endLine?: number; n: number };

// A path from the agent's file tools ("src/a.ts", "/data/src/a.ts" or the full sandbox path) as a project path
export function projectPath(raw: unknown): string | null {
  const path = String(raw || "").replace(/^\/data\//, "").replace(/^\/home\/workspace\/projects\/[^/]+\//, "").replace(/^\/+/, "");
  return path || null;
}
const FILE_TOOLS = new Set(["write_project_file", "edit_project_file"]);

async function api(path: string) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide${path}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function buildTree(files: Entry[]): Node[] {
  const root: Node = { name: "", path: "", dir: true, children: [] };
  const dirs = new Map<string, Node>([["", root]]);
  const ensureDir = (path: string): Node => {
    const found = dirs.get(path);
    if (found) return found;
    const slash = path.lastIndexOf("/");
    const parent = ensureDir(slash === -1 ? "" : path.slice(0, slash));
    const node: Node = { name: path.slice(slash + 1), path, dir: true, children: [] };
    parent.children.push(node);
    dirs.set(path, node);
    return node;
  };
  for (const f of files) {
    if (f.type === "dir") { ensureDir(f.path); continue; }
    const slash = f.path.lastIndexOf("/");
    ensureDir(slash === -1 ? "" : f.path.slice(0, slash)).children.push({ name: f.path.slice(slash + 1), path: f.path, dir: false, children: [] });
  }
  const sort = (n: Node) => {
    n.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) : a.dir ? -1 : 1));
    n.children.forEach(sort);
  };
  sort(root);
  return root.children;
}

// The search box: files whose name has the search text, as one flat list (best matches first, at most 300)
// The same results inside their folders (the folder button in the search box): matching files only, folders kept
function searchTree(nodes: Node[], keep: Set<string>): Node[] {
  return nodes.flatMap((n) => {
    if (!n.dir) return keep.has(n.path) ? [n] : [];
    const kids = searchTree(n.children, keep);
    return kids.length ? [{ ...n, children: kids }] : [];
  });
}
const dirPaths = (nodes: Node[]): string[] => nodes.flatMap((n) => (n.dir ? [n.path, ...dirPaths(n.children)] : []));
function searchFiles(files: Entry[], q: string): string[] {
  const score = (name: string) => (name === q ? 0 : name.startsWith(q) ? 1 : 2);
  return files
    .filter((f) => f.type === "file" && f.path.slice(f.path.lastIndexOf("/") + 1).toLowerCase().includes(q))
    .map((f) => f.path)
    .sort((a, b) => score(a.slice(a.lastIndexOf("/") + 1).toLowerCase()) - score(b.slice(b.lastIndexOf("/") + 1).toLowerCase()) || a.length - b.length)
    .slice(0, 300);
}

const LANG: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
  json: "json", md: "markdown", css: "css", scss: "scss", html: "html", xml: "xml", svg: "xml", py: "python",
  cpp: "cpp", cc: "cpp", c: "c", h: "cpp", hpp: "cpp", java: "java", go: "go", rs: "rust", rb: "ruby", php: "php",
  sh: "bash", yml: "yaml", yaml: "yaml", sql: "sql", kt: "kotlin", swift: "swift", cs: "csharp", env: "dotenv",
};
const ext = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

// File icons: the Seti set with VS Code's own Seti colours (the same icons VS Code and Antigravity show)
const setiIcon = themeIcons({
  blue: "#519aba", grey: "#4d5a5e", "grey-light": "#6d8086", green: "#8dc149", orange: "#e37933",
  pink: "#f55385", purple: "#a074c4", red: "#cc3e44", white: "#d4d7d6", yellow: "#cbcb41", ignore: "#41535b",
});
function FileBadge({ name }: { name: string }) {
  const { svg, color } = useMemo(() => setiIcon(name), [name]);
  return <span aria-hidden className="size-4 shrink-0 flex items-center justify-center [&_svg]:size-[18px] [&_svg]:fill-current" style={{ color }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function StudioFilesView({ projectId, projectName, wide, reloadKey = 0, reveal = null }: {
  projectId: string | null; projectName?: string | null; wide: boolean; reloadKey?: number; reveal?: Reveal | null;
}) {
  const reduce = useReducedMotion();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set());
  const [file, setFile] = useState<OpenFile | null>(null);
  // Open files as tabs (like an editor); their text is kept so switching tabs is instant
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const fileCache = useRef(new Map<string, OpenFile>());
  const activePath = useRef<string | null>(null);
  const [treeShown, setTreeShown] = useState(true);
  const [copied, setCopied] = useState(false);
  const [treeW, setTreeW] = useState(() => {
    try { const n = Number(localStorage.getItem(TREE_KEY)); if (n >= 200) return n; } catch { /* storage blocked */ }
    return 280;
  });
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Live: files the agent is writing right now, and files it just changed (they flash for a few seconds)
  const [writing, setWriting] = useState<Set<string>>(new Set());
  const [changed, setChanged] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const { res, data } = await api(`/projects/${projectId}/files`);
      if (!res.ok) {
        setError(data.error === "github_not_connected" ? "Connect GitHub in Project Mode to see this project's files." : data.error || "Could not load the files");
        return;
      }
      setListing(data);
    } catch {
      setError("Could not load the files");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { setListing(null); setFile(null); setOpenPaths([]); fileCache.current.clear(); activePath.current = null; setOpenDirs(new Set()); load(); }, [load]);
  // The project's code just got ready on the sandbox: load the list again (keeps the open file and folders)
  useEffect(() => { if (reloadKey) load(); }, [reloadKey, load]);

  const tree = useMemo(() => buildTree(listing?.files || []), [listing]);
  // Search box above the tree: while it has text, the tree shows only matching files, with their folders open
  const [query, setQuery] = useState("");
  // The tree is filtered just after each key press, so typing itself never waits for it
  const q = useDeferredValue(query.trim().toLowerCase());
  const matches = useMemo(() => (q ? searchFiles(listing?.files || [], q) : []), [listing, q]);
  const [inFolders, setInFolders] = useState(false);
  const matchTree = useMemo(() => (q && inFolders ? searchTree(tree, new Set(matches)) : []), [q, inFolders, tree, matches]);
  const matchDirs = useMemo(() => new Set(dirPaths(matchTree)), [matchTree]);

  const openFile = async (path: string, lines?: { startLine?: number; endLine?: number }) => {
    if (!projectId) return;
    activePath.current = path;
    setOpenPaths((list) => (list.includes(path) ? list : [...list, path]));
    const cached = fileCache.current.get(path);
    setFile(cached ? { ...cached, ...lines } : { path, loading: true, ...lines });
    try {
      const { res, data } = await api(`/projects/${projectId}/file?path=${encodeURIComponent(path)}`);
      const next: OpenFile = res.ok ? { path, ...data, loading: false } : { path, error: data.error || "Could not open the file", loading: false };
      if (res.ok) fileCache.current.set(path, next);
      if (activePath.current === path) setFile({ ...next, ...lines });
    } catch {
      if (activePath.current === path && !cached) setFile({ path, error: "Could not open the file", loading: false });
    }
  };
  const showTab = (path: string) => {
    const cached = fileCache.current.get(path);
    if (cached) { activePath.current = path; setFile(cached); } else openFile(path);
  };
  const closeTab = (path: string) => {
    fileCache.current.delete(path);
    setOpenPaths((list) => {
      const i = list.indexOf(path);
      const next = list.filter((x) => x !== path);
      if (activePath.current === path) {
        const neighbour = next[Math.min(i, next.length - 1)];
        if (neighbour) showTab(neighbour); else { activePath.current = null; setFile(null); }
      }
      return next;
    });
  };

  // A file from the agent's steps: open its folders, load the list again (the agent may have just made it) and open it
  useEffect(() => {
    if (!reveal || !projectId) return;
    const parts = reveal.path.split("/");
    setOpenDirs((s) => { const next = new Set(s); for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join("/")); return next; });
    load();
    openFile(reveal.path, { startLine: reveal.startLine, endLine: reveal.endLine });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal?.n, projectId]);

  // The agent writes or edits a file: show it while it happens, then load the list again and show the new code
  const fileRef = useRef<OpenFile | null>(null);
  fileRef.current = file;
  useEffect(() => {
    if (!projectId) return;
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const onTool = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!FILE_TOOLS.has(d.tool)) return;
      const path = projectPath(d.args?.path);
      if (!path) return;
      if (d.phase === "start") {
        setWriting((s) => new Set(s).add(path));
        return;
      }
      setWriting((s) => { const next = new Set(s); next.delete(path); return next; });
      if (typeof d.result === "string" && /^\s*error/i.test(d.result)) return;
      setChanged((s) => new Set(s).add(path));
      setTimeout(() => setChanged((s) => { const next = new Set(s); next.delete(path); return next; }), 4000);
      const parts = path.split("/");
      setOpenDirs((s) => { const next = new Set(s); for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join("/")); return next; });
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(load, 300); // several quick edits: one reload
      fileCache.current.delete(path); // a tab of this file shows the new text when it is opened again
      const open = fileRef.current;
      if (!open || open.path === path || !open.content) openFile(path);
    };
    window.addEventListener("agent:tool", onTool);
    return () => { window.removeEventListener("agent:tool", onTool); if (reloadTimer) clearTimeout(reloadTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, load]);

  const toggleDir = (path: string) => setOpenDirs((s) => {
    const next = new Set(s);
    if (next.has(path)) next.delete(path); else next.add(path);
    return next;
  });

  // Drag the line between the code and the tree
  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(true);
    let last = treeW;
    const move = (ev: PointerEvent) => {
      last = Math.round(Math.min(Math.max(rect.right - ev.clientX, 200), rect.width - 260));
      setTreeW(last);
    };
    const up = () => {
      setDragging(false);
      try { localStorage.setItem(TREE_KEY, String(last)); } catch { /* storage blocked */ }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const copy = async () => {
    if (!file?.content) return;
    try { await navigator.clipboard.writeText(file.content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  const iconBtn = "flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-[color,background-color,transform] duration-150 active:scale-[0.94]";

  if (!projectId) {
    return <Message title="No project picked" text="Pick a project above the chat input to see its files here." />;
  }

  const showTree = !file || treeShown;
  // The folder list stays next to the code on a narrow pane too (it takes at most part of the width there)
  const split = !!file && treeShown;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-2 h-10 px-3 border-b border-border">
        <span className="text-[12px] text-muted-foreground shrink-0">Workspace</span>
        <span className="text-[13px] truncate">{projectName || "Project"}</span>
        {listing?.branch && (
          <span className="flex items-center gap-1 min-w-0 px-1.5 h-5 rounded border border-black/10 dark:border-white/[0.08] text-[11px] text-muted-foreground" title={listing.repo || undefined}>
            <img src="https://cdn.classgrid.in/classgrid_intgration/github-icon.svg" alt="" aria-hidden className="size-3 opacity-70 dark:invert" />
            <span className="truncate">{listing.branch}</span>
          </span>
        )}
        <AnimatePresence>
          {writing.size > 0 && (
            <motion.span
              initial={reduce ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -4 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
              className="flex items-center gap-1.5 min-w-0 text-[12px] text-muted-foreground"
            >
              <span className="relative flex size-1.5 shrink-0">
                <span className="absolute inline-flex size-full rounded-full bg-sky-400 opacity-75 animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-sky-400" />
              </span>
              <span className="truncate">Writing {[...writing][0].split("/").pop()}{writing.size > 1 ? ` +${writing.size - 1}` : ""}</span>
            </motion.span>
          )}
        </AnimatePresence>
        <div className="ml-auto flex items-center gap-0.5 shrink-0">
          {file?.content !== undefined && (
            <button onClick={copy} className={iconBtn} title="Copy file" aria-label="Copy file">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          )}
          {file && (
            <button onClick={() => setTreeShown((t) => !t)} className={`${iconBtn} ${treeShown ? "text-foreground bg-black/[0.05] dark:bg-white/[0.06]" : ""}`} title={treeShown ? "Hide file tree" : "Show file tree"} aria-label="Toggle file tree">
              <ListTree className="size-3.5" />
            </button>
          )}
          <button onClick={load} className={iconBtn} title="Refresh" aria-label="Refresh">
            <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div ref={boxRef} className="relative flex-1 min-h-0 flex">
        {/* Code */}
        {file && (!showTree || split) && (
          <motion.div
            className="flex-1 min-w-0 flex flex-col"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
          >
            <FileTabs paths={openPaths} active={file.path} onShow={showTab} onClose={closeTab} />
            <PathBar path={file.path} projectName={projectName || "Project"} tree={tree} onOpen={openFile} />
            <CodeView file={file} />
          </motion.div>
        )}

        {/* Drag line between the code and the tree */}
        {split && (
          <div onPointerDown={startDrag} className="group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize touch-none" title="Drag to resize">
            <div className={`mx-auto h-full transition-all duration-200 ${dragging ? "w-[2px] bg-foreground/40" : "w-px bg-border group-hover:w-[2px] group-hover:bg-foreground/25"}`} />
          </div>
        )}
        {dragging && createPortal(<div className="fixed inset-0 z-[200] cursor-col-resize select-none" />, document.body)}

        {/* Tree */}
        {showTree && (
          <div className={`min-h-0 flex flex-col ${split ? "shrink-0" : "flex-1"}`} style={split ? { width: treeW, maxWidth: wide ? undefined : "45%" } : undefined}>
            {listing && tree.length > 0 && (
              <div className="shrink-0 px-2 pt-2 pb-1">
                <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-black/10 dark:border-white/[0.08] focus-within:border-black/25 dark:focus-within:border-white/20 transition-colors">
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    data-no-ring
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
                    placeholder="Filter files…"
                    className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} className="shrink-0 flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground" aria-label="Clear search">
                      <X className="size-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setInFolders((v) => !v)}
                    className={`shrink-0 flex items-center justify-center size-6 rounded transition-colors ${inFolders ? "text-foreground bg-black/[0.07] dark:bg-white/[0.1]" : "text-muted-foreground hover:text-foreground"}`}
                    title={inFolders ? "Show results as a list" : "Show results in their folders"}
                    aria-label={inFolders ? "Show results as a list" : "Show results in their folders"}
                    aria-pressed={inFolders}
                  >
                    <FolderTree className="size-3.5" />
                  </button>
                </label>
              </div>
            )}
          <div className="flex-1 min-h-0 overflow-y-auto py-1.5">
            {error ? (
              <p className="px-4 py-3 text-[13px] text-muted-foreground">{error}</p>
            ) : !listing ? (
              <div className="px-3 pt-1 flex flex-col gap-2">
                {[70, 55, 80, 45, 65, 50].map((w, i) => <div key={i} className="h-4 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />)}
              </div>
            ) : !tree.length ? (
              <p className="px-4 py-3 text-[13px] text-muted-foreground">
                {listing.source === "sandbox" ? "No files yet. Open the project in Project Mode, or let the agent make some." : "This repo has no files yet."}
              </p>
            ) : q ? (
              !matches.length ? (
                <p className="px-4 py-3 text-[13px] text-muted-foreground">No files match “{query.trim()}”.</p>
              ) : inFolders ? (
                <Tree nodes={matchTree} depth={0} openDirs={matchDirs} toggleDir={() => {}} openFile={openFile} current={file?.path || null} writing={writing} changed={changed} still />
              ) : (
                <div className="px-1">
                  {matches.map((path) => {
                    const slash = path.lastIndexOf("/");
                    return (
                      <button
                        key={path}
                        onClick={() => openFile(path)}
                        draggable
                        onDragStart={(e) => dragFile(e, path)}
                        title={path}
                        className={`w-full flex items-center gap-2 h-8 px-2 text-left rounded-md transition-colors ${file?.path === path ? "bg-black/[0.07] dark:bg-white/[0.08] text-foreground" : "text-foreground/85 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-foreground"}`}
                      >
                        <FileBadge name={path.slice(slash + 1)} />
                        <span className="shrink-0 text-[13px]">{path.slice(slash + 1)}</span>
                        {slash > 0 && <span className="min-w-0 truncate text-[12px] text-muted-foreground">{path.slice(0, slash)}</span>}
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <Tree nodes={tree} depth={0} openDirs={openDirs} toggleDir={toggleDir} openFile={openFile} current={file?.path || null} writing={writing} changed={changed} />
            )}
            {listing?.truncated && <p className="px-4 py-2 text-[12px] text-muted-foreground">Only part of this big repo is shown.</p>}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tree({ nodes, depth, openDirs, toggleDir, openFile, current, writing, changed, still = false }: {
  nodes: Node[]; depth: number; openDirs: Set<string>; toggleDir: (p: string) => void; openFile: (p: string) => void; current: string | null;
  writing: Set<string>; changed: Set<string>; still?: boolean; // still: search results, shown at once without the open/close animation
}) {
  const reduce = useReducedMotion();
  return (
    <div className={depth ? "relative ml-[15px] border-l border-black/10 dark:border-white/[0.07]" : ""}>
      {nodes.map((n) => {
        const open = openDirs.has(n.path);
        return (
          <div key={n.path}>
            <button
              onClick={() => (n.dir ? toggleDir(n.path) : openFile(n.path))}
              draggable={!n.dir}
              onDragStart={n.dir ? undefined : (e) => dragFile(e, n.path)}
              className={`w-full flex items-center gap-1.5 h-7 pr-2 text-left text-[13px] rounded-md transition-colors duration-500 ${changed.has(n.path) ? "bg-sky-400/10 text-foreground" : current === n.path ? "bg-black/[0.07] dark:bg-white/[0.08] text-foreground" : "text-foreground/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-foreground"}`}
              style={{ paddingLeft: 8 }}
              title={n.path}
            >
              {n.dir ? (
                <>
                  <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: reduce ? 0 : 0.15, ease: EASE }} className="flex shrink-0">
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </motion.span>
                  {open ? <FolderOpen className="size-4 shrink-0 text-muted-foreground" /> : <Folder className="size-4 shrink-0 text-muted-foreground" />}
                </>
              ) : (
                <>
                  <span className="w-3.5 shrink-0" />
                  <FileBadge name={n.name} />
                </>
              )}
              <span className="truncate">{n.name}</span>
              {!n.dir && writing.has(n.path) && <span className="ml-auto shrink-0 text-[11px] text-sky-400">Writing…</span>}
              {!n.dir && !writing.has(n.path) && changed.has(n.path) && <span className="ml-auto shrink-0 size-1.5 rounded-full bg-sky-400" title="Just changed" />}
            </button>
            {still ? (n.dir && open && (
              <Tree nodes={n.children} depth={depth + 1} openDirs={openDirs} toggleDir={toggleDir} openFile={openFile} current={current} writing={writing} changed={changed} still />
            )) : <AnimatePresence initial={false}>
              {n.dir && open && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
                  className="overflow-hidden"
                >
                  <Tree nodes={n.children} depth={depth + 1} openDirs={openDirs} toggleDir={toggleDir} openFile={openFile} current={current} writing={writing} changed={changed} />
                </motion.div>
              )}
            </AnimatePresence>}
          </div>
        );
      })}
    </div>
  );
}

// The open files, one tab each, in a row that slides sideways when there are many
function FileTabs({ paths, active, onShow, onClose }: { paths: string[]; active: string; onShow: (p: string) => void; onClose: (p: string) => void }) {
  const reduce = useReducedMotion();
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rowRef.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(active)}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [active, paths.length, reduce]);
  if (!paths.length) return null;
  return (
    <div ref={rowRef} className="shrink-0 flex items-stretch h-9 overflow-x-auto overflow-y-hidden border-b border-black/10 dark:border-white/[0.08] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/20">
      <AnimatePresence initial={false}>
        {paths.map((p) => {
          const on = p === active;
          const name = p.split("/").pop() || p;
          return (
            <motion.div
              key={p}
              data-tab={p}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, width: 0 }}
              transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
              onClick={() => onShow(p)}
              title={p}
              className={`group relative shrink-0 flex items-center gap-1.5 pl-3 pr-1.5 text-[12.5px] cursor-pointer select-none border-r border-black/10 dark:border-white/[0.06] transition-colors ${on ? "bg-white dark:bg-[#1e1e1e] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"}`}
            >
              {on && <motion.span layoutId="studio-file-tab" className="absolute inset-x-0 top-0 h-[2px] bg-foreground/70" transition={{ duration: reduce ? 0 : 0.2, ease: EASE }} />}
              <span draggable onDragStart={(e) => dragFile(e, p)} className="flex items-center gap-1.5" title={`${p} (drag into the chat to mention it)`}>
                <FileBadge name={name} />
                <span className="max-w-[160px] truncate">{name}</span>
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(p); }}
                className={`flex items-center justify-center size-5 rounded hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-opacity ${on ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                aria-label={`Close ${name}`}
              >
                <X className="size-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// The open file's path; each part opens a card with that folder's files and folders, to open any other file
function PathBar({ path, projectName, tree, onOpen }: { path: string; projectName: string; tree: Node[]; onOpen: (p: string) => void }) {
  const reduce = useReducedMotion();
  const parts = path.split("/");
  const [menu, setMenu] = useState<{ dir: string; left: number } | null>(null);
  const [menuDirs, setMenuDirs] = useState<Set<string>>(new Set());
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => { if (!barRef.current?.contains(e.target as globalThis.Node)) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
  }, [menu]);
  useEffect(() => { setMenu(null); }, [path]);

  // The folders along the open file's path start open inside the card
  const openAt = (dir: string, el: HTMLElement) => {
    const box = barRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const next = new Set<string>();
    for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join("/"));
    setMenuDirs(next);
    setMenu((m) => (m?.dir === dir ? null : { dir, left: box ? Math.max(0, r.left - box.left - 6) : 0 }));
  };
  const childrenOf = (dir: string): Node[] => {
    if (!dir) return tree;
    let nodes = tree;
    for (const name of dir.split("/")) {
      const next = nodes.find((n) => n.dir && n.name === name);
      if (!next) return [];
      nodes = next.children;
    }
    return nodes;
  };
  const toggle = (p: string) => setMenuDirs((s) => { const next = new Set(s); if (next.has(p)) next.delete(p); else next.add(p); return next; });
  const segments = [{ label: projectName, dir: "" }, ...parts.map((name, i) => ({ label: name, dir: i === parts.length - 1 ? parts.slice(0, i).join("/") : parts.slice(0, i + 1).join("/") }))];
  const noSets = useMemo(() => new Set<string>(), []);

  return (
    <div ref={barRef} className="relative shrink-0 flex items-center gap-0.5 h-8 px-2 text-[12px] text-muted-foreground overflow-x-auto overflow-y-visible whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-0.5 shrink-0">
          {i > 0 && <ChevronRight className="size-3 shrink-0 opacity-50" />}
          <button
            type="button"
            onClick={(e) => openAt(seg.dir, e.currentTarget)}
            className={`flex items-center gap-1 h-6 px-1.5 rounded transition-colors ${i === segments.length - 1 ? "text-foreground" : ""} ${menu?.dir === seg.dir && menu ? "bg-black/[0.06] dark:bg-white/[0.08] text-foreground" : "hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"}`}
          >
            {i === segments.length - 1 ? <FileBadge name={seg.label} /> : i > 0 ? <Folder className="size-3.5 opacity-70" /> : null}
            <span>{seg.label}</span>
          </button>
        </span>
      ))}
      {menu && createPortal(
        <AnimatePresence>
          <motion.div
            key={menu.dir}
            initial={reduce ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}
            onPointerDown={(e) => e.stopPropagation()}
            style={(() => { const r = barRef.current?.getBoundingClientRect(); return { position: "fixed" as const, top: (r?.bottom || 0) + 4, left: Math.min((r?.left || 0) + menu.left, window.innerWidth - 300) }; })()}
            className="z-[150] w-[280px] max-h-[360px] overflow-y-auto rounded-lg border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1e1e1e] shadow-2xl p-1 chat-scrollbar"
          >
            {childrenOf(menu.dir).length
              ? <Tree nodes={childrenOf(menu.dir)} depth={0} openDirs={menuDirs} toggleDir={toggle} openFile={(p) => { onOpen(p); setMenu(null); }} current={path} writing={noSets} changed={noSets} />
              : <p className="px-2.5 py-2 text-[12px] text-muted-foreground">Nothing in this folder.</p>}
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

// The colouring files of an older Classgrid version are gone after an update: this tab needs a refresh
const isOldVersion = (e: unknown) => /dynamically imported module|Importing a module script failed|MIME type|Failed to load module script|Loading chunk/i.test(String((e as Error)?.message || e));

function CodeView({ file }: { file: OpenFile }) {
  // Shiki colours code with VS Code's own rules and its Dark+ / Light+ themes; it loads only when a file opens
  const [html, setHtml] = useState<string | null>(null);
  const [oldVersion, setOldVersion] = useState(false);
  useEffect(() => {
    setHtml(null);
    if (file.content === undefined || file.content.length > 300_000) return;
    let gone = false;
    const lang = LANG[ext(file.path)] || "text";
    const theme = document.documentElement.classList.contains("dark") ? "dark-plus" : "light-plus";
    import("shiki")
      .then(async ({ codeToHtml }) => {
        try {
          return await codeToHtml(file.content!, { lang, theme });
        } catch (e) {
          if (isOldVersion(e) && !gone) setOldVersion(true);
          return codeToHtml(file.content!, { lang: "text", theme });
        }
      })
      .then((out) => { if (!gone) setHtml(out); })
      .catch((e) => { if (isOldVersion(e) && !gone) setOldVersion(true); });
    return () => { gone = true; };
  }, [file.content, file.path]);
  const lines = file.content === undefined ? 0 : file.content.split("\n").length;
  const scrollRef = useRef<HTMLDivElement>(null);
  const from = file.startLine || 0;
  const to = file.endLine || file.startLine || 0;
  useEffect(() => {
    if (!from || !scrollRef.current) return;
    scrollRef.current.scrollTop = Math.max(0, (from - 4) * 20); // 20px a line (12.5px text, 1.6 line height)
  }, [from, html, file.content]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {oldVersion && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border text-[12.5px] text-muted-foreground">
          <span className="flex-1 min-w-0">Classgrid was updated. Refresh to see the code in colour.</span>
          <button onClick={() => window.location.reload()} className="shrink-0 h-7 px-3 rounded-md border border-border text-foreground hover:bg-secondary transition-colors">Refresh</button>
        </div>
      )}
      {file.loading ? (
        <div className="px-4 pt-2 flex flex-col gap-2">
          {[60, 80, 40, 70, 55].map((w, i) => <div key={i} className="h-3.5 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      ) : file.error ? (
        <p className="px-4 py-3 text-[13px] text-muted-foreground">{file.error}</p>
      ) : file.image && file.data ? (
        // A picture: shown as it is, on a light checkerboard so see-through parts are visible
        <div className="flex-1 min-h-0 overflow-auto flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-[#1e1e1e]">
          <div className="max-w-full rounded-md border border-border bg-[length:16px_16px] bg-[linear-gradient(45deg,#0000000d_25%,transparent_25%,transparent_75%,#0000000d_75%),linear-gradient(45deg,#0000000d_25%,transparent_25%,transparent_75%,#0000000d_75%)] [background-position:0_0,8px_8px] dark:bg-[linear-gradient(45deg,#ffffff0d_25%,transparent_25%,transparent_75%,#ffffff0d_75%),linear-gradient(45deg,#ffffff0d_25%,transparent_25%,transparent_75%,#ffffff0d_75%)]">
            {/* Click it to open the same image viewer as the rest of Classgrid */}
            <DocsImageViewer
              images={[{ id: file.path, src: `data:${file.mime};base64,${file.data}`, alt: file.path.split("/").pop() || "Picture" }]}
              renderThumbnails={(imgs, openImage) => (
                <img src={imgs[0]!.src} alt={imgs[0]!.alt} onClick={(e) => openImage(imgs[0]!, e)} className="block max-w-full max-h-[70vh] object-contain cursor-zoom-in" />
              )}
            />
          </div>
          {typeof file.size === "number" && <p className="text-[12px] text-muted-foreground">{file.size < 1024 ? `${file.size} B` : file.size < 1048576 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / 1048576).toFixed(1)} MB`}</p>}
        </div>
      ) : file.binary ? (
        <p className="px-4 py-3 text-[13px] text-muted-foreground">{typeof file.size === "number" && file.size > 8 * 1024 * 1024 ? "This picture is too big to show here." : "This file can't be shown as text."}</p>
      ) : (
        <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-auto bg-white dark:bg-[#1e1e1e] font-mono text-[12.5px] leading-[1.6]">
          {from > 0 && <div aria-hidden className="pointer-events-none absolute left-0 right-0 bg-[#264f78]/25 dark:bg-[#264f78]/40" style={{ top: 8 + (from - 1) * 20, height: (to - from + 1) * 20 }} />}
          <div className="flex min-w-max py-2">
            <div className="sticky left-0 shrink-0 pl-3 pr-4 text-right text-[#237893] dark:text-[#6e7681] select-none bg-white dark:bg-[#1e1e1e]">
              {Array.from({ length: lines }, (_, i) => <div key={i} className={from && i + 1 >= from && i + 1 <= to ? "text-foreground" : undefined}>{i + 1}</div>)}
            </div>
            {html === null
              ? <pre className="pr-6 whitespace-pre text-foreground/90">{file.content}</pre>
              : <div className="pr-6 [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:whitespace-pre [&_code]:font-mono" dangerouslySetInnerHTML={{ __html: html }} />}
          </div>
          {file.truncated && <p className="px-4 pb-3 text-[12px] text-muted-foreground">Only the first 1 MB is shown.</p>}
        </div>
      )}
    </div>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-sm text-center flex flex-col items-center gap-2">
        <div className="flex items-center justify-center size-12 rounded-full border border-border">
          <FolderOpen className="size-5 text-muted-foreground" />
        </div>
        <p className="text-base font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
