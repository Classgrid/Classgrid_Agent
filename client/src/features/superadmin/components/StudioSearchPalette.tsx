// Studio's search (the "+" in the Files tab): one box that finds the project's files, your chats or your projects.
// The kind is picked from the menu on its left, like Antigravity's search.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Cloud, Folder, Laptop, Pin } from "lucide-react";
import { groupIcon, openProjectId, type ChatGroup } from "@/components/ai/components/chat-groups/chatGroups";
import { fetchWithRescue } from "@/lib/rescue";
import { cn } from "@/lib/utils";
import { openStudioProject } from "./StudioProjectPicker";
import { OPEN_PROJECT_FILE_EVENT } from "@/components/ai/components/stepper/ProjectToolSteps";
import { listLocalFiles, localFolderOf } from "../utils/localProject";
import { onDesktop, savedProject, thisComputerCopy, type LocalCopy } from "../utils/projectCopies";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const EASE = [0.22, 1, 0.36, 1] as const;
const PAGE = 10;

type Kind = "files" | "conversations" | "projects";
const KINDS: { kind: Kind; label: string; placeholder: string }[] = [
  { kind: "files", label: "Files", placeholder: "Search for files in the project..." },
  { kind: "conversations", label: "Conversations", placeholder: "Search for conversations..." },
  { kind: "projects", label: "Projects", placeholder: "Search for projects..." },
];

type Chat = { id: string; title: string; created_at: string; pinned?: boolean; project_id?: string; project_name?: string };
type Project = { id: string; name: string; repo: string | null; logo?: string | null; location?: "cloud" | "local"; localPath?: string | null; localCopies?: LocalCopy[] };
// A row: a file, chat or project; or, in Conversations, a project or group heading (head) that opens and closes with ^;
// or (desktop app) a "This PC" / "Cloud" label over its projects, or the line over "No project" (label: never
// picked, the arrow keys skip it)
type Row = { key: string; title: string; hint?: string; age?: string; icon: React.ReactNode; run: () => void; head?: boolean; open?: boolean; depth?: number; pin?: boolean; label?: "pc" | "cloud" | "none" };

// Desktop app: a project with a folder on this computer (a folder project, or a cloud project downloaded here)
const onThisPc = (p: Project | null | undefined) => !!p && (p.location === "local" || !!thisComputerCopy(p));
const pcPath = (p: Project) => (p.location === "local" ? p.localPath : thisComputerCopy(p)?.path) || null;
const labelRow = (side: "pc" | "cloud" | "none"): Row => ({ key: `label:${side}`, title: side === "pc" ? "This PC" : side === "cloud" ? "Cloud" : "", label: side, icon: null, run: () => {} });

function shortAge(at: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  if (mins < 60 * 24 * 30) return `${Math.floor(mins / (60 * 24))}d`;
  if (mins < 60 * 24 * 365) return `${Math.floor(mins / (60 * 24 * 30))}mo`;
  return `${Math.floor(mins / (60 * 24 * 365))}y`;
}

const cleanTitle = (t: string) => (t || "New Chat").replace(/\*\*Title:\*\*/gi, "").replace(/Title:/gi, "").replace(/["']/g, "").trim();

// The chats, projects and groups it last loaded (shown at once the next time it opens)
const lastLists: { chats: Chat[] | null; projects: Project[] | null; groups: ChatGroup[] | null } = { chats: null, projects: null, groups: null };

export function StudioSearchPalette({ open, onClose, files: givenFiles, recent = [], onOpenFile, fileIcon, initialKind = "files", onOpenChat }: {
  open: boolean;
  onClose: () => void;
  files?: string[]; // the project's file paths (left out: the open project's files are loaded here)
  recent?: string[]; // open file tabs: shown first
  onOpenFile?: (path: string) => void; // left out: the file opens in the Files tab
  fileIcon: (name: string) => React.ReactNode;
  initialKind?: Kind; // the left sidebar's search starts on Conversations
  onOpenChat?: (id: string) => void; // left out: the chat opens in Studio
}) {
  const reduce = useReducedMotion();
  const [kind, setKind] = useState<Kind>(initialKind);
  // Opened from the left sidebar (no Files tab around it): the open project's files are loaded here
  const [loadedFiles, setLoadedFiles] = useState<string[] | null>(null);
  const files = givenFiles || loadedFiles || [];
  const openFile = onOpenFile || ((path: string) => window.dispatchEvent(new CustomEvent(OPEN_PROJECT_FILE_EVENT, { detail: { path } })));
  useEffect(() => {
    if (!open || givenFiles || kind !== "files") return;
    const id = openProjectId();
    if (!id) { setLoadedFiles([]); return; }
    const folder = localFolderOf(id);
    (folder ? listLocalFiles(folder) : fetchWithRescue(`${backendUrl}/api/ide/projects/${id}/files`, { credentials: "include" }).then((r) => r.json()))
      .then((d) => setLoadedFiles(Array.isArray(d.files) ? d.files.filter((f: { type: string }) => f.type === "file").map((f: { path: string }) => f.path) : []))
      .catch(() => setLoadedFiles([]));
  }, [open, kind, givenFiles]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [more, setMore] = useState(false);
  // (the last lists show at once when it opens again, and are refreshed behind them)
  const [chats, setChatsState] = useState<Chat[] | null>(() => lastLists.chats);
  const [projects, setProjectsState] = useState<Project[] | null>(() => lastLists.projects);
  const [groups, setGroupsState] = useState<ChatGroup[] | null>(() => lastLists.groups);
  const setChats = (v: Chat[] | null | ((c: Chat[] | null) => Chat[] | null)) => setChatsState((c) => { const n = typeof v === "function" ? v(c) : v; lastLists.chats = n; return n; });
  const setProjects = (v: Project[] | null | ((p: Project[] | null) => Project[] | null)) => setProjectsState((p) => { const n = typeof v === "function" ? v(p) : v; lastLists.projects = n; return n; });
  const setGroups = (v: ChatGroup[] | null | ((g: ChatGroup[] | null) => ChatGroup[] | null)) => setGroupsState((g) => { const n = typeof v === "function" ? v(g) : v; lastLists.groups = n; return n; });
  // Conversations: which project and group headings are open (the open project starts open)
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set([`p:${openProjectId() || "none"}`]));
  const toggleKey = (key: string) => setOpenKeys((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) { setKind(initialKind); setQ(""); setActive(0); setMore(false); setMenuOpen(false); setOpenKeys(new Set([`p:${openProjectId() || "none"}`])); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);
  useEffect(() => { setActive(0); setMore(false); }, [q, kind]);

  // Chats and projects load when their kind is first shown
  useEffect(() => {
    if (!open) return;
    if (kind === "conversations") {
      fetchWithRescue(`${backendUrl}/api/ai/sessions?project=all&studio=1`, { credentials: "include" })
        .then((r) => r.json()).then((d) => setChats(Array.isArray(d.sessions) ? d.sessions : [])).catch(() => setChats((c) => c || []));
      fetchWithRescue(`${backendUrl}/api/ide/groups?project=all`, { credentials: "include" })
        .then((r) => r.json()).then((d) => setGroups(Array.isArray(d.groups) ? d.groups : [])).catch(() => setGroups((g) => g || []));
    }
    if (kind === "projects" || kind === "conversations") {
      fetchWithRescue(`${backendUrl}/api/ide/projects`, { credentials: "include" })
        .then((r) => r.json()).then((d) => setProjects(Array.isArray(d.projects) ? d.projects : [])).catch(() => setProjects((p) => p || []));
    }
  }, [open, kind]);

  const close = () => { setMenuOpen(false); onClose(); };
  const goChat = (id: string) => {
    if (onOpenChat) return onOpenChat(id);
    const parts = window.location.pathname.split("/");
    const at = parts.indexOf("studio");
    window.history.pushState({}, "", `${at !== -1 ? parts.slice(0, at + 1).join("/") : "/c/studio"}/${id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const rows = useMemo<Row[]>(() => {
    const t = q.trim().toLowerCase();
    if (kind === "files") {
      const name = (p: string) => p.slice(p.lastIndexOf("/") + 1);
      const score = (p: string) => { const n = name(p).toLowerCase(); return n === t ? 0 : n.startsWith(t) ? 1 : n.includes(t) ? 2 : 3; };
      const list = t
        ? files.filter((p) => p.toLowerCase().includes(t)).sort((a, b) => score(a) - score(b) || a.length - b.length)
        : [...recent.filter((p) => files.includes(p)).reverse(), ...files.filter((p) => !recent.includes(p))];
      return list.slice(0, 300).map((p) => {
        const dir = p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
        return { key: p, title: name(p), hint: dir || ".", icon: fileIcon(name(p)), run: () => { openFile(p); close(); } };
      });
    }
    const names = new Map((projects || []).map((p) => [p.id, p]));
    const projectOf = (id: string) => names.get(id) || (savedProject(id) as Project | null);
    // Website: folder projects (This PC) and their chats are never listed; they live only in the desktop app
    const hidden = (id: string | null | undefined) => !onDesktop() && !!id && projectOf(id)?.location === "local";
    if (kind === "conversations") {
      // Each project with ^: its pinned chats, its groups (each with ^, pinned groups first), then its other chats
      const match = (c: Chat) => !t || cleanTitle(c.title).toLowerCase().includes(t);
      const byId = new Map((chats || []).map((c) => [c.id, c]));
      const inGroup = new Set((groups || []).flatMap((g) => g.chats.map((c) => c.id)));
      type F = { key: string; id: string | null; name: string; logo: string | null; pinned: Chat[]; groups: ChatGroup[]; chats: Chat[]; newest: number };
      const folders = new Map<string, F>();
      const folder = (id: string | null, name?: string) => {
        const key = id || "none";
        if (!folders.has(key)) {
          const p = id ? names.get(id) : null;
          folders.set(key, { key, id, name: id ? p?.name || name || "Project" : "No project", logo: p?.logo || null, pinned: [], groups: [], chats: [], newest: 0 });
        }
        return folders.get(key)!;
      };
      for (const c of chats || []) {
        if (inGroup.has(c.id) && !c.pinned) continue;
        if (hidden(c.project_id)) continue;
        const f = folder(c.project_id || null, c.project_name);
        (c.pinned ? f.pinned : f.chats).push(c);
        f.newest = Math.max(f.newest, new Date(c.created_at).getTime());
      }
      for (const g of [...(groups || [])].sort((a, b) => Number(b.pinned) - Number(a.pinned))) if (!hidden(g.projectId)) folder(g.projectId || null).groups.push(g);
      const chatRow = (c: Chat, depth: number, pin = false): Row => ({
        key: c.id, title: cleanTitle(c.title), age: shortAge(c.created_at), icon: null, depth, pin, run: () => { goChat(c.id); close(); },
      });
      const folderRows = (f: F, out: Row[]) => {
        const pinned = f.pinned.filter(match);
        const loose = f.chats.filter(match);
        const grouped = f.groups
          .map((g) => ({ g, list: g.chats.map((c) => byId.get(c.id) || c).filter((c) => !c.pinned && match(c)) }))
          .filter((x) => !t || x.list.length);
        const count = pinned.length + loose.length + grouped.reduce((n, x) => n + x.list.length, 0);
        if (!count && (t || !f.groups.length)) return;
        const pk = `p:${f.key}`;
        const open = !!t || openKeys.has(pk);
        out.push({
          key: pk, head: true, open, depth: 0, title: f.name, hint: String(count),
          icon: f.logo ? <img src={f.logo} alt="" className="size-4 shrink-0 rounded object-cover" /> : <Folder className="size-4 shrink-0 text-muted-foreground" />,
          run: () => toggleKey(pk),
        });
        if (!open) return;
        pinned.forEach((c) => out.push(chatRow(c, 1, true)));
        for (const { g, list } of grouped) {
          const gk = `g:${g.id}`;
          const gOpen = !!t || openKeys.has(gk);
          const Icon = groupIcon(g.icon);
          out.push({ key: gk, head: true, open: gOpen, depth: 1, title: g.name, hint: String(list.length), pin: g.pinned, icon: <Icon className="size-4 shrink-0 text-muted-foreground" />, run: () => toggleKey(gk) });
          if (gOpen) list.forEach((c) => out.push(chatRow(c, 2)));
        }
        loose.forEach((c) => out.push(chatRow(c, 1)));
      };
      const sorted = [...folders.values()].sort((a, b) => b.newest - a.newest);
      const rowsOf = (list: F[]) => { const out: Row[] = []; list.forEach((f) => folderRows(f, out)); return out; };
      if (!onDesktop()) return rowsOf(sorted);
      // Desktop app: This PC and Cloud are two lists, never one. Chats with no project come after them
      const pc = rowsOf(sorted.filter((f) => f.id && onThisPc(projectOf(f.id))));
      const cloud = rowsOf(sorted.filter((f) => f.id && !onThisPc(projectOf(f.id))));
      const none = rowsOf(sorted.filter((f) => !f.id));
      return [
        ...(pc.length ? [labelRow("pc"), ...pc] : []),
        ...(cloud.length ? [labelRow("cloud"), ...cloud] : []),
        ...(none.length && (pc.length || cloud.length) ? [labelRow("none")] : []),
        ...none,
      ];
    }
    const projectRow = (p: Project, side: "pc" | "cloud"): Row => ({
      key: p.id,
      title: p.name,
      // This PC: the folder it is in; Cloud: its GitHub repo
      hint: side === "pc" ? pcPath(p) || p.name : p.repo || "No repo",
      icon: p.logo ? <img src={p.logo} alt="" className="size-4 shrink-0 rounded object-cover" /> : <Folder className="size-4 shrink-0 text-muted-foreground" />,
      run: () => { openStudioProject(p.id); close(); },
    });
    const found = (projects || [])
      .filter((p) => !hidden(p.id))
      .filter((p) => !t || p.name.toLowerCase().includes(t) || (p.repo || "").toLowerCase().includes(t) || (onDesktop() && (pcPath(p) || "").toLowerCase().includes(t)));
    if (!onDesktop()) return found.map((p) => projectRow(p, "cloud"));
    // Desktop app: This PC first, then Cloud, each under its own label
    const pc = found.filter(onThisPc).map((p) => projectRow(p, "pc"));
    const cloud = found.filter((p) => !onThisPc(p)).map((p) => projectRow(p, "cloud"));
    return [...(pc.length ? [labelRow("pc"), ...pc] : []), ...(cloud.length ? [labelRow("cloud"), ...cloud] : [])];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, q, files, recent, chats, projects, groups, openKeys]);

  const shown = more || kind !== "files" ? rows : rows.slice(0, PAGE);
  const loading = (kind === "conversations" && (chats === null || groups === null)) || (kind === "projects" && projects === null) || (kind === "files" && !givenFiles && loadedFiles === null);

  useEffect(() => { listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);
  // A "This PC" / "Cloud" label is never the picked row: the pick moves to the row under it
  useEffect(() => { if (shown[active]?.label) setActive(active + 1); }, [rows, active]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = (i: number, by: 1 | -1) => {
    let n = i + by;
    while (shown[n]?.label) n += by;
    return n < 0 || n >= shown.length ? i : n;
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); if (menuOpen) setMenuOpen(false); else close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => step(i, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => step(i, -1)); }
    else if (e.key === "Enter" && shown[active]) { e.preventDefault(); shown[active].run(); }
  };

  const current = KINDS.find((k) => k.kind === kind)!;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bg" data-cg-big-window="" className="fixed inset-0 z-[130]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            key="box"
            initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
            className="fixed inset-x-0 top-[10vh] z-[131] mx-auto w-[min(92vw,640px)]"
            onKeyDown={onKey}
          >
            <div className="rounded-xl border border-black/10 dark:border-white/[0.1] bg-white dark:bg-[#1e1e1e] text-foreground shadow-2xl overflow-hidden">
              <div className="relative flex items-center gap-2 h-12 px-2 border-b border-black/10 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="shrink-0 flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-black/[0.05] dark:bg-white/[0.07] text-[13px] font-medium hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
                >
                  {current.label}
                  <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform duration-200", menuOpen && "rotate-180")} />
                </button>
                <input
                  ref={inputRef}
                  data-no-ring
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={current.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-transparent border-0 p-0 text-[14px] shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground"
                />
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      key="kinds"
                      initial={reduce ? false : { opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: reduce ? 0 : 0.15, ease: EASE }}
                      style={{ transformOrigin: "top left" }}
                      className="absolute left-2 top-full mt-1 z-10 w-44 p-1 rounded-lg border border-black/10 dark:border-white/[0.1] bg-white dark:bg-[#252526] shadow-xl"
                    >
                      {KINDS.map((k) => (
                        <button
                          key={k.kind}
                          type="button"
                          onClick={() => { setKind(k.kind); setMenuOpen(false); inputRef.current?.focus(); }}
                          className="w-full flex items-center justify-between h-8 px-2.5 rounded-md text-[13px] text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
                        >
                          {k.label}
                          {k.kind === kind && <Check className="size-3.5" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div ref={listRef} className="max-h-[56vh] overflow-y-auto overscroll-contain p-1.5">
                {loading && (
                  <div className="p-2 flex flex-col gap-2.5">{[70, 55, 65].map((w, i) => <div key={i} className="h-4 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />)}</div>
                )}
                {!loading && !rows.length && (
                  <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                    {q.trim() ? `Nothing matches “${q}”.` : kind === "files" ? "No files yet." : kind === "conversations" ? "No conversations yet." : "No projects yet."}
                  </p>
                )}
                {!loading && shown.map((r, i) => r.label === "none" ? (
                  <div key={r.key} className="my-1 border-t border-black/10 dark:border-white/[0.08]" />
                ) : r.label ? (
                  <p key={r.key} className={cn("flex items-center gap-1.5 px-3 pt-1 pb-1 text-[12px] text-muted-foreground", i > 0 && "mt-1 pt-2 border-t border-black/10 dark:border-white/[0.08]")}>
                    {r.label === "pc" ? <Laptop className="size-3.5" /> : <Cloud className="size-3.5" />} {r.title}
                  </p>
                ) : (
                  <button
                    key={r.key}
                    type="button"
                    data-index={i}
                    onClick={r.run}
                    onMouseEnter={() => setActive(i)}
                    style={kind === "conversations" ? { paddingLeft: 12 + (r.depth || 0) * 20 } : undefined}
                    className={cn("w-full flex items-center gap-2.5 h-10 px-3 rounded-lg text-left transition-colors duration-100", active === i ? "bg-black/[0.05] dark:bg-white/[0.07]" : "")}
                  >
                    {kind === "conversations" && (
                      r.head
                        ? <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-200", !r.open && "-rotate-90")} />
                        : <span className="size-3.5 shrink-0" />
                    )}
                    {r.icon}
                    <span className="min-w-0 flex items-center gap-2 flex-1">
                      <span className={cn("truncate text-[14px]", r.head && r.depth === 0 && "font-medium")}>{r.title}</span>
                      {r.pin && <Pin className="size-3 shrink-0 text-muted-foreground" aria-label="Pinned" />}
                      {r.hint && <span className="min-w-0 truncate text-[13px] text-muted-foreground">{r.hint}</span>}
                    </span>
                    {r.age && <span className="shrink-0 text-[12px] text-muted-foreground">{r.age}</span>}
                  </button>
                ))}
                {!loading && kind === "files" && !more && rows.length > PAGE && (
                  <button type="button" onClick={() => setMore(true)} className="w-full h-9 px-3 rounded-lg text-left text-[13px] text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors">
                    Show {rows.length - PAGE} more...
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
