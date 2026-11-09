// Studio Mode: the agent works in a real browser while you watch. The chat is on the left, and the right pane has
// tabs (Browser, Files, Terminal) like an agent manager. The live browser itself is joined to the Browser tab next.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bot, FileDiff, FileText, FolderGit2, FolderOpen, Globe, Images, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Plus, Search, Terminal, Upload, X } from "lucide-react";
import { AskAiPanel } from "@/components/ai/components/AskAiPanel";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useResumeGridInvite } from "@/components/ai/components/share-grid/GridJoinPage";
import { StudioProjectPicker, openLocalFolder, openStudioProject } from "../components/StudioProjectPicker";
import { StudioFilesView } from "../components/StudioFilesView";
import { StudioTerminalView, useAgentTerminal } from "../components/StudioTerminalView";
import { StudioReviewModal } from "../components/StudioReviewModal";
import { StudioProjectView } from "../components/StudioProjectView";
import { StudioBrowserView } from "../components/StudioBrowserView";
import { StudioLocalBrowserView, hasLocalBrowser } from "../components/StudioLocalBrowserView";
import { StudioShotsView } from "../components/StudioShotsView";
import { StudioUploadsView } from "../components/StudioUploadsView";
import { StudioLocalFileView, baseName } from "../components/StudioLocalFileView";
import { StudioAgentsView } from "../components/StudioAgentsView";
import { StudioReviewView } from "../components/StudioReviewView";
import { PushToGithubModal } from "../components/PushToGithubModal";
import { FileBadge, OPEN_LOCAL_FILE_EVENT, OPEN_PROJECT_FILE_EVENT } from "@/components/ai/components/stepper/ProjectToolSteps";
import { fetchWithRescue } from "@/lib/rescue";
import { toast } from "sonner";
import { useSidebar } from "@/components/marketing_ui/sidebar";
import { DesktopMenuBar, editAction, type MenuEntry, type MenuSpec } from "@/components/layout/DesktopMenuBar";
import { listLocalFiles, localFolderOf } from "../utils/localProject";
import { PROJECT_PLACE_EVENT, listenProjectSaved, onDesktop, thisComputerCopy, thisDeviceId } from "../utils/projectCopies";
import { Spinner } from "@/components/marketing_ui/spinner";

type TabKind = "browser" | "review" | "files" | "terminal" | "project" | "shots" | "uploads" | "file" | "agents";
type Tab = { id: string; kind: TabKind; path?: string }; // path: a "file" tab's file on this computer (desktop app)

const TAB_INFO: Record<TabKind, { label: string; Icon: typeof Globe }> = {
  browser: { label: "Browser", Icon: Globe },
  review: { label: "Review", Icon: FileDiff },
  files: { label: "Files", Icon: FolderOpen },
  terminal: { label: "Terminal", Icon: Terminal },
  project: { label: "Project", Icon: FolderGit2 },
  shots: { label: "Screenshots", Icon: Images },
  uploads: { label: "Uploads", Icon: Upload },
  file: { label: "File", Icon: FileText },
  agents: { label: "Agents", Icon: Bot },
};

// One easing for every slide in Studio: fast start, soft stop
const EASE = [0.22, 1, 0.36, 1] as const;
const PANE_KEY = "cg_studio_pane";
const SIDEBAR_KEY = "cg_studio_sidebar";
const SIDEBAR_HIDDEN_KEY = "cg_studio_sidebar_hidden";
const MIN_SIDEBAR = 256; // the normal sidebar width (16rem): it can only be dragged wider
const MAX_SIDEBAR = 500;
const MIN_PANE = 320;
const MIN_CHAT = 320;

// The pane's tabs and the selected one, kept across a refresh
const TABS_KEY = "cg_studio_tabs";
const TAB_KINDS = new Set<TabKind>(["browser", "review", "files", "terminal", "project", "shots", "uploads", "file", "agents"]);
function readTabs(): { tabs: Tab[]; active: string | null } {
  try {
    const saved = JSON.parse(localStorage.getItem(TABS_KEY) || "null");
    const tabs = Array.isArray(saved?.tabs) ? (saved.tabs as Tab[]).filter((t) => t && typeof t.id === "string" && TAB_KINDS.has(t.kind) && (t.kind !== "file" || typeof t.path === "string")) : [];
    if (tabs.length) return { tabs, active: tabs.some((t) => t.id === saved.active) ? saved.active : tabs[0]!.id };
  } catch { /* storage blocked */ }
  return { tabs: [{ id: "browser-1", kind: "browser" }], active: "browser-1" };
}

function readPane(): { open: boolean; width: number } {
  try {
    const saved = JSON.parse(localStorage.getItem(PANE_KEY) || "null");
    if (saved && typeof saved.width === "number") return { open: !!saved.open, width: saved.width }; // a refresh keeps the pane open or closed
  } catch { /* storage blocked */ }
  return { open: false, width: Math.round(window.innerWidth * 0.4) };
}

export function StudioModePage() {
  // Back from login with a Share Grid invite: open it
  useResumeGridInvite();
  const [pane, setPane] = useState(readPane);
  // Desktop app: Schedule and Library are pages, not chats, so they have no right pane (and no button for it)
  const { pathname } = useLocation();
  const pathParts = pathname.split("/");
  const pageId = pathParts[pathParts.indexOf("studio") + 1] || "";
  const toolPage = import.meta.env.VITE_DESKTOP === "1" && (pageId === "schedule" || pageId === "library" || pageId === "calls");
  const paneOpen = pane.open && !toolPage;
  const [maximized, setMaximized] = useState(false);
  // (the chat's "project / chat" bar hides while the pane fills the window: the chat isn't shown then)
  useEffect(() => {
    document.documentElement.classList.toggle("studio-pane-max", maximized && pane.open);
    return () => document.documentElement.classList.remove("studio-pane-max");
  }, [maximized, pane.open]);
  // A narrow pane shows its tabs as icons only (the name shows on hover)
  const compactTabs = !maximized && pane.width < 520;
  const [resizing, setResizing] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>(() => readTabs().tabs);
  const [active, setActive] = useState<string | null>(() => readTabs().active);
  useEffect(() => {
    try { localStorage.setItem(TABS_KEY, JSON.stringify({ tabs, active })); } catch { /* storage blocked */ }
  }, [tabs, active]);
  const rowRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // The agent's commands for the Terminal tab (kept here, so switching tabs keeps them)
  const terminal = useAgentTerminal();
  // The project picked above the chat input: the Files tab shows its files
  const [studioProject, setStudioProject] = useState<string | null>(() => {
    try { return (sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open")); } catch { return null; } // the same open project as Project Mode
  });
  useEffect(() => {
    const onChange = async (e: Event) => {
      const id = (e as CustomEvent<{ projectId: string | null }>).detail?.projectId ?? null;
      setStudioProject(id);
      const parts = window.location.pathname.split("/");
      const at = parts.indexOf("studio");
      const chatId = at !== -1 ? parts[at + 1] : "";
      if (!chatId) return;
      const base = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
      const res = await fetchWithRescue(`${base}/api/ai/sessions/${chatId}`, { credentials: "include" }).catch(() => null);
      const chat = res?.ok ? await res.json().catch(() => null) : null;
      if (chat && (chat.projectId || null) === id) return; // the open chat is already in this project
      // The open chat has no project yet: it joins the picked project and stays open
      if (id) {
        if (chat && !chat.projectId) {
          const linked = await fetchWithRescue(`${base}/api/ide/projects/${id}/chats`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: chatId }),
          }).catch(() => null);
          if (linked?.ok) { window.dispatchEvent(new Event("agent:refresh-sessions")); return; }
        }
      }
      // The open chat belongs to the old project: start a new chat for the new one (like Project Mode)
      if (window.location.pathname.split("/")[at + 1] === chatId) {
        window.history.pushState({}, "", parts.slice(0, at + 1).join("/"));
        window.dispatchEvent(new PopStateEvent("popstate"));
        window.dispatchEvent(new Event("agent:new-chat"));
      }
    };
    window.addEventListener("studio:project-changed", onChange);
    return () => window.removeEventListener("studio:project-changed", onChange);
  }, []);
  // The picked project's code is downloaded onto the sandbox for the agent (no code editor in Studio). Kept if it is
  // already there. Same checks as Project Mode first: GitHub connected, and the Classgrid app on the project's repo.
  const [filesReload, setFilesReload] = useState(0);
  const [gate, setGate] = useState<{ kind: "github" | "app"; installUrl?: string } | null>(null);
  const [openTick, setOpenTick] = useState(0);
  const [preparing, setPreparing] = useState(false); // the project's code is being downloaded for the agent
  useEffect(() => {
    setGate(null);
    if (!studioProject) return;
    let gone = false;
    const base = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
    (async () => {
      const repo = (() => {
        try { return (JSON.parse(localStorage.getItem("cg_studio_projects") || "[]") as { id: string; repo?: string | null }[]).find((x) => x.id === studioProject)?.repo || null; } catch { return null; }
      })();
      // (the GitHub app box is for the website only, never in the desktop app)
      if (repo && !(window as { classgridDesktop?: { isDesktop?: boolean } }).classgridDesktop?.isDesktop) {
        const st = await fetchWithRescue(`${base}/api/github-app/status?repo=${encodeURIComponent(repo)}`, { credentials: "include" }).catch(() => null);
        const app = st?.ok ? await st.json().catch(() => null) : null;
        if (gone) return;
        if (app?.ready && !app.installed) { setGate({ kind: "app", installUrl: app.installUrl }); return; }
      }
      setPreparing(true);
      const res = await fetchWithRescue(`${base}/api/ide/projects/${studioProject}/open`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: true, noEditor: true, deviceId: thisDeviceId() || undefined }),
      }).catch(() => null);
      if (!gone) setPreparing(false);
      if (gone || !res) return;
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFilesReload((n) => n + 1);
        if (data.backup) toast.info(`Your unpushed work from last time was saved on GitHub, in the branch ${data.backup}.`, { duration: 10000 });
        // Opened from this computer's copy: say what came from GitHub (nothing when it was already up to date)
        if (data.local && data.message && !/^Already up to date/.test(data.message)) toast.success(data.message, { duration: 6000 });
        return;
      }
      if (data.error === "github_not_connected") setGate({ kind: "github" });
      else toast.error(data.error || "Could not get this project's code ready");
    })();
    return () => { gone = true; setPreparing(false); };
  }, [studioProject, openTick]);
  // Desktop app: the project now opens on this computer (already up to date) or in the cloud (got ready again)
  useEffect(() => {
    const onPlace = (e: Event) => {
      const p = (e as CustomEvent<{ project?: { id: string } }>).detail?.project;
      if (!p || p.id !== studioProject) return;
      if (thisComputerCopy(p)?.here) setFilesReload((n) => n + 1);
      else setOpenTick((n) => n + 1);
    };
    window.addEventListener(PROJECT_PLACE_EVENT, onPlace);
    return () => window.removeEventListener(PROJECT_PLACE_EVENT, onPlace);
  }, [studioProject]);
  // Work saved to GitHub by itself after an answer: one short line
  useEffect(() => listenProjectSaved(), []);
  // Back from GitHub (app installed or GitHub connected): check again
  useEffect(() => {
    if (!gate) return;
    const again = () => { if (document.visibilityState === "visible") setOpenTick((n) => n + 1); };
    window.addEventListener("focus", again);
    document.addEventListener("visibilitychange", again);
    return () => { window.removeEventListener("focus", again); document.removeEventListener("visibilitychange", again); };
  }, [gate]);

  // The agent (or its Browser worker) uses the browser: the pane opens on the Browser tab, so the user watches it
  useEffect(() => {
    const onTool = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (d.phase !== "start" || !/^browser_/.test(String(d.tool || ""))) return;
      setPane((p) => (p.open ? p : { ...p, open: true }));
      setTabs((t) => {
        const b = t.find((x) => x.kind === "browser");
        if (b) { setActive(b.id); return t; }
        const id = `browser-${Date.now()}`;
        setActive(id);
        return [...t, { id, kind: "browser" }];
      });
    };
    window.addEventListener("agent:tool", onTool);
    return () => window.removeEventListener("agent:tool", onTool);
  }, []);

  // A file clicked in the agent's steps opens in the Files tab, at those lines
  const [reveal, setReveal] = useState<{ path: string; startLine?: number; endLine?: number; n: number } | null>(null);
  useEffect(() => {
    // The open project's files (paths from its root), or null when no project is open or they can't be listed
    const projectFiles = async (): Promise<string[] | null> => {
      const id = (() => { try { return (sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open")); } catch { return null; } })();
      if (!id) return null;
      const base = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
      const folder = localFolderOf(id);
      const res = folder ? null : await fetchWithRescue(`${base}/api/ide/projects/${id}/files`, { credentials: "include" }).catch(() => null);
      const data = folder ? await listLocalFiles(folder) : res?.ok ? await res.json().catch(() => null) : null;
      return Array.isArray(data?.files) ? data.files.filter((f: { path: string; type: string }) => f.type === "file").map((f: { path: string }) => f.path) : null;
    };
    const onOpenFile = async (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      // A file anywhere on this computer (desktop app, full path): its own file tab
      if (/^[A-Za-z]:[\\/]/.test(String(d.path || ""))) { window.dispatchEvent(new CustomEvent(OPEN_LOCAL_FILE_EVENT, { detail: { path: d.path } })); return; }
      if (d.plan && !d.path) {
        const files = await projectFiles();
        if (!files) { toast("The plan file opens in Files once a project is picked"); return; }
        const plans = files.filter((f) => /^plan\/[^/]+\.md$/i.test(f));
        if (!plans.length) { toast.error("There is no plan file in the plan/ folder yet"); return; }
        const words = String(d.planTitle || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
        const best = plans.reduce((a, b) => (words.filter((w) => b.toLowerCase().includes(w)).length > words.filter((w) => a.toLowerCase().includes(w)).length ? b : a), plans[plans.length - 1] as string);
        d.path = best;
      }
      if (!d.path || d.folder) return;
      // The AI named the file without all its folders ("extension.js", "desktop/main.js"): the project's file whose path
      // ends that way (the shortest path when there are several), instead of "File not found"
      const want = String(d.path).replace(/\\/g, "/").replace(/^\.?\/+/, "");
      const files = await projectFiles();
      if (files && !files.includes(want)) {
        const hits = files.filter((f) => f.toLowerCase() === want.toLowerCase() || f.toLowerCase().endsWith(`/${want.toLowerCase()}`)).sort((a, b) => a.length - b.length);
        if (hits.length) d.path = hits[0];
      }
      setPane((p) => ({ ...p, open: true }));
      setTabs((t) => (t.some((x) => x.kind === "files") ? t : [...t, { id: `files-${Date.now()}`, kind: "files" }]));
      setTabs((t) => { const f = t.find((x) => x.kind === "files"); if (f) setActive(f.id); return t; });
      setReveal({ path: String(d.path).replace(/^\/+/, ""), startLine: d.startLine, endLine: d.endLine, n: Date.now() });
    };
    window.addEventListener(OPEN_PROJECT_FILE_EVENT, onOpenFile);
    return () => window.removeEventListener(OPEN_PROJECT_FILE_EVENT, onOpenFile);
  }, []);

  // Desktop app: a file on this computer the agent worked on (or the user clicked) opens in its own tab, like a
  // code editor's agent; the same file opens in the tab it already has
  useEffect(() => {
    (window as unknown as { __cgStudioFiles?: boolean }).__cgStudioFiles = true;
    const onOpen = (e: Event) => {
      const path = String((e as CustomEvent<{ path?: string }>).detail?.path || "");
      if (!path) return;
      setPane((p) => (p.open ? p : { ...p, open: true }));
      setTabs((t) => {
        const same = t.find((x) => x.kind === "file" && x.path?.toLowerCase() === path.toLowerCase());
        if (same) { setActive(same.id); return t; }
        const id = `file-${Date.now()}`;
        setActive(id);
        return [...t, { id, kind: "file", path }];
      });
    };
    window.addEventListener(OPEN_LOCAL_FILE_EVENT, onOpen);
    return () => { window.removeEventListener(OPEN_LOCAL_FILE_EVENT, onOpen); (window as unknown as { __cgStudioFiles?: boolean }).__cgStudioFiles = false; };
  }, []);

  // Desktop app: the browser tab shows the open page's name and icon
  const [browserPage, setBrowserPage] = useState<{ url: string; title: string }>({ url: "", title: "" });
  useEffect(() => {
    const d = (window as unknown as { classgridDesktop?: { browserState?: () => Promise<{ url: string; title: string } | null>; onBrowser?: (fn: (m: any) => void) => () => void } }).classgridDesktop;
    if (!d?.onBrowser) return;
    d.browserState?.().then((st) => { if (st) setBrowserPage({ url: st.url || "", title: st.title || "" }); }).catch(() => {});
    return d.onBrowser((m) => { if (m?.type === "nav") setBrowserPage({ url: m.url || "", title: m.title || "" }); });
  }, []);

  // (read again when a project changes elsewhere: Mastero started or finished, renamed, a new photo)
  const [projectsSeen, setProjectsSeen] = useState(0);
  useEffect(() => {
    const again = () => setProjectsSeen((n) => n + 1);
    window.addEventListener("studio:projects-changed", again);
    return () => window.removeEventListener("studio:projects-changed", again);
  }, []);
  const studioProjectInfo = useMemo<{ name: string; repo: string | null; pushHere: boolean } | null>(() => {
    try {
      const list = JSON.parse(localStorage.getItem("cg_studio_projects") || "[]");
      const p = (Array.isArray(list) ? list : []).find((x: { id: string }) => x.id === studioProject);
      if (!p) return null;
      // The pane's Push is the cloud copy's push. It isn't for a project being made Mastero (nothing Mastero shows before
      // Finish), nor in the desktop app for a project whose copy is on this computer: its Push is in the Project tab
      const here = onDesktop() && (p.location === "local" || !!thisComputerCopy(p)?.here);
      return { name: p.name, repo: p.repo || null, pushHere: !!p.repo && !p.masteroPending && !here };
    } catch { return null; }
  }, [studioProject, filesReload, projectsSeen]);
  const studioProjectName = studioProjectInfo?.name || null;

  // Push to GitHub, like Project Mode's button: commit everything and push it (to the project's open pull request)
  const [pushOpen, setPushOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const confirmPush = async (message: string) => {
    if (!studioProject) return;
    setPushing(true);
    try {
      const base = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
      const res = await fetchWithRescue(`${base}/api/ide/projects/${studioProject}/push`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not push to GitHub");
      toast.success(data.message || "Pushed to GitHub");
      setPushOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not push to GitHub");
    } finally {
      setPushing(false);
    }
  };
  const { state: sidebarState, isMobile, toggleSidebar } = useSidebar();
  const [sidebarW, setSidebarW] = useState<number>(() => {
    try { const n = Number(localStorage.getItem(SIDEBAR_KEY)); if (n >= MIN_SIDEBAR) return Math.min(n, MAX_SIDEBAR); } catch { /* storage blocked */ }
    return 256;
  });
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(PANE_KEY, JSON.stringify(pane)); } catch { /* storage blocked */ }
  }, [pane]);

  // While the chat scrolls, the sidebar button fades out (styles/global.css); it comes back once scrolling stops
  const chatColRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const col = chatColRef.current;
    if (!col) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = (e: Event) => {
      // Scrolling the question list's own card is not the chat scrolling: the card stays open
      if (e.target instanceof Element && e.target.closest(".studio-question-dots")) return;
      document.documentElement.classList.add("studio-scrolling");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => document.documentElement.classList.remove("studio-scrolling"), 450);
    };
    col.addEventListener("scroll", onScroll, true); // the chat's own scrolling list is inside: catch its scroll too
    return () => { col.removeEventListener("scroll", onScroll, true); if (timer) clearTimeout(timer); document.documentElement.classList.remove("studio-scrolling"); };
  }, []);

  // The grey left sidebar of Studio Mode (styles/global.css), only while this page is open
  useEffect(() => {
    document.documentElement.classList.add("studio-mode");
    return () => document.documentElement.classList.remove("studio-mode");
  }, []);

  // The left sidebar's width (styles/global.css reads it), remembered between visits
  useEffect(() => {
    document.documentElement.style.setProperty("--studio-sidebar-width", `${sidebarW}px`);
    try { localStorage.setItem(SIDEBAR_KEY, String(sidebarW)); } catch { /* storage blocked */ }
  }, [sidebarW]);
  useEffect(() => () => { document.documentElement.style.removeProperty("--studio-sidebar-width"); }, []);

  // The icon strip can be dragged away completely; then the sidebar button brings the icon strip back
  const hidden = sidebarHidden && sidebarState === "collapsed" && !isMobile;
  useEffect(() => {
    document.documentElement.classList.toggle("studio-sidebar-hidden", hidden);
    try { localStorage.setItem(SIDEBAR_HIDDEN_KEY, sidebarHidden ? "1" : "0"); } catch { /* storage blocked */ }
    if (!hidden) return;
    const onTrigger = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.('[data-slot="sidebar-trigger"]')) return;
      e.stopPropagation();
      e.preventDefault();
      setSidebarHidden(false);
    };
    window.addEventListener("click", onTrigger, true);
    return () => window.removeEventListener("click", onTrigger, true);
  }, [hidden, sidebarHidden]);
  useEffect(() => () => { document.documentElement.classList.remove("studio-sidebar-hidden"); }, []);
  useEffect(() => { if (sidebarState === "expanded") setSidebarHidden(false); }, [sidebarState]);

  // Icon strip: drag its edge to the left to hide it completely
  const startStripDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setSidebarResizing(true);
    const move = (ev: PointerEvent) => setSidebarHidden(ev.clientX < 36);
    const up = () => {
      setSidebarResizing(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
  };

  const openTab = useCallback((kind: TabKind) => {
    // Files and Terminal open once; a Browser tab can be opened again
    const existing = kind !== "browser" ? tabs.find((t) => t.kind === kind) : undefined;
    if (existing) { setActive(existing.id); return; }
    const id = `${kind}-${Date.now()}`;
    setTabs((t) => [...t, { id, kind }]);
    setActive(id);
  }, [tabs]);

  // The chat's Overview menu: open the pane on Review, Files or Terminal
  useEffect(() => {
    const onOpen = (e: Event) => {
      const kind = (e as CustomEvent<{ kind: TabKind }>).detail?.kind;
      if (!kind || !(kind in TAB_INFO)) return;
      setPane((p) => (p.open ? p : { ...p, open: true }));
      openTab(kind);
    };
    window.addEventListener("studio:open-tab", onOpen);
    return () => window.removeEventListener("studio:open-tab", onOpen);
  }, [openTab]);
  // How many of the agent's background commands are running now (shown in the Overview menu)
  useEffect(() => {
    const running = new Set<string>();
    for (const t of terminal.entries) {
      const id = t.output.match(/(?:Started|Stopped) background command ([a-f0-9]{8})|Background command ([a-f0-9]{8}): finished/);
      const job = id?.[1] || id?.[2];
      if (!job) continue;
      if (t.tool === "start_background_command") running.add(job);
      else if (/Stopped background command|: finished/.test(t.output)) running.delete(job);
    }
    (window as any).__cgStudioBgCount = running.size;
    window.dispatchEvent(new CustomEvent("studio:bg-count", { detail: running.size }));
  }, [terminal.entries]);

  const closeTab = (id: string) => {
    setTabs((t) => {
      const next = t.filter((x) => x.id !== id);
      if (active === id) setActive(next.length ? next[next.length - 1].id : null);
      return next;
    });
  };

  // Drag the line between the chat and the pane (same handle as Project Mode): the two sides can come close
  const startResize = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const row = rowRef.current;
    if (!row) return;
    setResizing(true);
    const rect = row.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const width = Math.min(Math.max(rect.right - ev.clientX, MIN_PANE), rect.width - MIN_CHAT);
      setPane((p) => ({ ...p, width: Math.round(width) }));
    };
    const up = () => {
      setResizing(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
  };

  // Drag the line between the left sidebar and the chat: the sidebar gets wider, the chat never gets too narrow
  const startSidebarResize = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setSidebarResizing(true);
    document.documentElement.classList.add("studio-resizing");
    const move = (ev: PointerEvent) => {
      const right = paneOpen ? (maximized ? window.innerWidth : pane.width) : 48;
      const max = Math.min(MAX_SIDEBAR, window.innerWidth - right - MIN_CHAT);
      setSidebarW(Math.round(Math.min(Math.max(ev.clientX, MIN_SIDEBAR), Math.max(MIN_SIDEBAR, max))));
    };
    const up = () => {
      setSidebarResizing(false);
      document.documentElement.classList.remove("studio-resizing");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
  };

  // Desktop app: Studio's File / Edit / View / Help menu in the app's top bar, like Cursor
  const navigate = useNavigate();
  const titleSlot = import.meta.env.VITE_DESKTOP === "1" ? document.getElementById("cg-titlebar-slot") : null;
  const showTab = (kind: TabKind) => { setPane((p) => (p.open ? p : { ...p, open: true })); openTab(kind); };
  // File → Open Folder / Open File: the folder (or the file's folder) on this computer becomes Studio's project; a
  // picked file also opens beside the chat
  const openFolderProject = async (folder?: string) => {
    const made = await openLocalFolder(folder);
    if (!made) return false;
    openStudioProject(made.id);
    window.dispatchEvent(new Event("studio:projects-changed"));
    return true;
  };
  const openFileProject = async () => {
    const picked = await (window as { classgridDesktop?: { pickFile?: () => Promise<{ file?: string; folder?: string; error?: string } | null> } }).classgridDesktop?.pickFile?.();
    if (!picked) return;
    if (picked.error || !picked.file || !picked.folder) { toast.error(picked.error || "Couldn't open that file"); return; }
    if (await openFolderProject(picked.folder)) window.dispatchEvent(new CustomEvent(OPEN_PROJECT_FILE_EVENT, { detail: { path: picked.file } }));
  };
  const studioMenus: MenuSpec[] = [
    { label: "File", items: [
      { label: "New Chat", run: () => window.dispatchEvent(new CustomEvent("agent:new-chat")) },
      "-",
      { label: "Open File…", run: () => { void openFileProject(); } },
      { label: "Open Folder…", run: () => { void openFolderProject(); } },
      "-",
      { label: "New Browser Tab", run: () => showTab("browser") },
      { label: "New Terminal", run: () => showTab("terminal") },
      "-",
      { label: "Open Project Mode", run: () => navigate(window.location.pathname.startsWith("/superadmin") ? "/superadmin/project" : "/c/project") },
      "-",
      { label: "Close Window", run: () => window.close() },
    ] },
    { label: "Edit", items: [
      { label: "Undo", keys: "Ctrl+Z", run: () => editAction("undo") },
      { label: "Redo", keys: "Ctrl+Y", run: () => editAction("redo") },
      "-",
      { label: "Cut", keys: "Ctrl+X", run: () => editAction("cut") },
      { label: "Copy", keys: "Ctrl+C", run: () => editAction("copy") },
      { label: "Paste", keys: "Ctrl+V", run: () => editAction("paste") },
      "-",
      { label: "Select All", keys: "Ctrl+A", run: () => editAction("selectAll") },
    ] },
    { label: "View", items: [
      ...(["browser", "files", "terminal", "review", "project", "shots", "uploads", "agents"] as TabKind[]).map((kind) => ({ label: TAB_INFO[kind].label, run: () => showTab(kind) })),
      "-",
      { label: "Show or Hide Sidebar", run: toggleSidebar },
      { label: "Show or Hide Pane", run: () => { setMaximized(false); setPane((p) => ({ ...p, open: !p.open })); } },
    ] },
    { label: "Help", items: [
      // Home Page, Changelog and Support live here in the desktop app (not in the profile menu)
      ...([
        ["Docs", "https://classgrid.in/docs"],
        "-",
        ["Home Page", "https://classgrid.in"],
        ["Changelog", "https://classgrid.in/changelog"],
        ["Support", "https://classgrid.in/support/ticket"],
      ] as const).map((it): MenuEntry => (it === "-" ? "-" : { label: it[0], run: () => (window as any).classgridDesktop?.openExternal?.(it[1]) })),
    ] },
  ];

  const activeTab = tabs.find((t) => t.id === active) || null;

  const quick = reduce ? { duration: 0 } : { duration: 0.2, ease: EASE };
  const pill = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 40 };
  const iconBtn = "flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-[color,background-color,transform] duration-150 active:scale-[0.94]";

  return (
    <div ref={rowRef} className="flex w-full h-full !bg-[#fafafa] dark:!bg-[#121212] text-foreground overflow-hidden">
      {titleSlot && createPortal(<DesktopMenuBar menus={studioMenus} />, titleSlot)}
      {/* Chat */}
      <div ref={chatColRef} className={`studio-chat @container relative min-w-0 flex-1 flex flex-col ${maximized && paneOpen ? "hidden" : ""}`}>
        {/* One solid top bar (the sidebar button, "project / chat" and the chat's buttons sit on it): the messages scroll
            under it instead of showing behind them, like Antigravity */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[15] h-12 bg-background" />
        {!isMobile && !hidden && (
          <div
            onPointerDown={sidebarState === "expanded" ? startSidebarResize : startStripDrag}
            onDoubleClick={() => sidebarState === "expanded" && setSidebarW(MIN_SIDEBAR)}
            className="group absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize touch-none"
            title="Drag to resize"
          >
            <div className={`mx-auto h-full transition-all duration-200 ${sidebarResizing ? "w-[2px] bg-foreground/40" : "w-px bg-transparent group-hover:w-[2px] group-hover:bg-foreground/25"}`} />
          </div>
        )}
        {sidebarResizing && createPortal(<div className="fixed inset-0 z-[200] cursor-col-resize select-none" />, document.body)}
        <AnimatePresence>
          {!pane.open && !toolPage && (
            // Hidden pane: only one button in the top right corner brings it back
            <motion.button
              key="show-pane"
              onClick={() => setPane((p) => ({ ...p, open: true }))}
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              transition={{ ...quick, delay: reduce ? 0 : 0.12 }}
              whileTap={reduce ? undefined : { scale: 0.92 }}
              className="absolute top-3 right-3 z-20 flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
              title="Show pane"
              aria-label="Show pane"
            >
              <PanelRightOpen className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {/* Desktop app: no second download message (only "Get a copy on this computer" shows one) */}
          {preparing && !gate && !(window as { classgridDesktop?: { isDesktop?: boolean } }).classgridDesktop?.isDesktop && (
            <motion.div
              key="preparing"
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1e1e1e] pl-3 pr-3.5 h-8 shadow-lg text-[12px] text-muted-foreground"
            >
              <Spinner className="size-3 text-muted-foreground" />
              {studioProjectInfo?.repo ? `Downloading ${studioProjectInfo.name} from GitHub…` : `Getting ${studioProjectInfo?.name || "the project"} ready…`}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {gate && (
            <motion.div
              key="gate"
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[min(560px,calc(100%-6rem))] flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1e1e1e] px-4 py-3 shadow-xl"
            >
              <img src="https://cdn.classgrid.in/classgrid_intgration/github-icon.svg" alt="" aria-hidden className="size-5 shrink-0 dark:invert" />
              <p className="flex-1 min-w-0 text-[13px]">
                {gate.kind === "app"
                  ? <>The Classgrid app is not installed on <span className="font-medium">{studioProjectInfo?.repo}</span>. Set it up in Project Mode first.</>
                  : <>GitHub is not connected. Set it up in Project Mode first, then come back.</>}
              </p>
              {/* GitHub and the Classgrid app are set up in one place only: Project Mode */}
              <Link to={window.location.pathname.startsWith("/superadmin") ? "/superadmin/project" : "/c/project"} className="shrink-0 h-8 px-3 inline-flex items-center rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity">Go to Project Mode</Link>
            </motion.div>
          )}
        </AnimatePresence>
        <AskAiPanel
          open={true}
          onOpenChange={() => {}}
          variant="full-page"
          pageContext={{ path: "/c/studio", title: "Studio" }}
          inputHeader={<StudioProjectPicker />}
          studioMenu={!paneOpen}
        />
      </div>

      {/* Right pane: slides in and out from the right */}
      <AnimatePresence initial={false}>
        {paneOpen && (
          <motion.div
            key="pane"
            className={`relative shrink-0 border-l border-border !bg-sidebar ${maximized ? "flex-1" : ""}`}
            initial={reduce ? false : { width: 0, opacity: 0 }}
            animate={{ width: maximized ? "100%" : pane.width, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { width: 0, opacity: 0 }}
            transition={resizing || reduce ? { duration: 0 } : { duration: 0.38, ease: EASE }}
          >
            {!maximized && (
              <div
                onPointerDown={startResize}
                className="group absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none"
                title="Drag to resize"
              >
                <div className={`mx-auto h-full transition-all duration-200 ${resizing ? "w-[2px] bg-foreground/40" : "w-px bg-transparent group-hover:w-[2px] group-hover:bg-foreground/25"}`} />
              </div>
            )}
            {resizing && createPortal(<div className="fixed inset-0 z-[200] cursor-col-resize select-none" />, document.body)}

            {/* The content keeps its full width while the pane slides, so nothing squeezes */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="h-full flex flex-col" style={{ width: maximized ? "100%" : pane.width }}>
                {/* Tab bar */}
                <div className={`shrink-0 flex items-center gap-1 h-12 pr-2 border-b border-border ${maximized ? "pl-14" : "pl-2"}`}>
                  <div className="flex items-center gap-1 min-w-0 overflow-x-auto [scrollbar-width:none]">
                    <AnimatePresence initial={false}>
                      {tabs.map((t) => {
                        const info = TAB_INFO[t.kind];
                        const Icon = info.Icon;
                        const label = t.kind === "file" && t.path ? baseName(t.path) : t.kind === "browser" && browserPage.url ? browserPage.title || hostOf(browserPage.url) : info.label;
                        const on = t.id === active;
                        return (
                          <motion.div
                            key={t.id}
                            layout={!reduce}
                            initial={reduce ? false : { opacity: 0, scale: 0.92, x: -6 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                            transition={quick}
                            className={`group relative shrink-0 flex items-center gap-1.5 h-8 pl-2.5 pr-1 rounded-md text-sm cursor-pointer select-none transition-colors ${on ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                            onClick={() => setActive(t.id)}
                            title={compactTabs ? label : undefined}
                          >
                            {on && <motion.span layoutId="studio-tab-pill" className="absolute inset-0 rounded-md bg-secondary" transition={pill} />}
                            {t.kind === "file" && t.path
                              ? <span className="relative flex"><FileBadge path={t.path} /></span>
                              : t.kind === "browser" && browserPage.url ? <SiteIcon url={browserPage.url} /> : <Icon className="relative size-4 shrink-0" />}
                            {!compactTabs && <span className={`relative ${t.kind === "file" || t.kind === "browser" ? "max-w-[160px] truncate" : ""}`}>{label}</span>}
                            <button
                              onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                              className={`relative flex items-center justify-center size-5 rounded hover:bg-foreground/10 transition-[opacity,background-color] duration-150 ${on ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                              aria-label={`Close ${label}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                  <motion.button
                    layout={!reduce}
                    onClick={() => setActive(null)}
                    transition={quick}
                    className={`relative shrink-0 ${iconBtn} ${active === null ? "!text-foreground" : ""}`}
                    title="New tab"
                    aria-label="New tab"
                  >
                    {active === null && <motion.span layoutId="studio-tab-pill" className="absolute inset-0 rounded-md bg-secondary" transition={pill} />}
                    <Plus className="relative size-4" />
                  </motion.button>
                  <div className="ml-auto shrink-0 flex items-center gap-1">
                    {studioProjectInfo?.pushHere && (
                      <button
                        onClick={() => setPushOpen(true)}
                        disabled={pushing}
                        className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-[color,background-color,transform] duration-150 active:scale-[0.96] disabled:opacity-50"
                        title={`Push to GitHub (${studioProjectInfo.repo})`}
                      >
                        <img src="https://cdn.classgrid.in/classgrid_intgration/github-icon.svg" alt="" aria-hidden className="size-4 opacity-80 dark:invert" />
                        {(maximized || pane.width >= 560) && <span>Push</span>}
                      </button>
                    )}
                    <button
                      onClick={() => setMaximized((m) => !m)}
                      className={iconBtn}
                      title={maximized ? "Restore pane" : "Maximize pane"}
                      aria-label={maximized ? "Restore pane" : "Maximize pane"}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={maximized ? "min" : "max"}
                          initial={reduce ? false : { opacity: 0, rotate: -90, scale: 0.6 }}
                          animate={{ opacity: 1, rotate: 0, scale: 1 }}
                          exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.6 }}
                          transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}
                          className="flex"
                        >
                          {maximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                    <button
                      onClick={() => { setMaximized(false); setPane((p) => ({ ...p, open: false })); }}
                      className={iconBtn}
                      title="Hide pane"
                      aria-label="Hide pane"
                    >
                      <PanelRightClose className="size-4" />
                    </button>
                  </div>
                </div>

                {/* The live browser stays connected while another tab is open, so coming back shows it at once */}
                {tabs.some((t) => t.kind === "browser") && (
                  <div className={activeTab?.kind === "browser" ? "flex-1 min-h-0 flex flex-col" : "hidden"}>
                    {/* In the desktop app the browser runs on this computer; on the website it is the cloud browser */}
                    {hasLocalBrowser() ? <StudioLocalBrowserView paused={resizing || sidebarResizing} /> : <StudioBrowserView />}
                  </div>
                )}
                {/* Content: each tab fades in */}
                <AnimatePresence mode="wait" initial={false}>
                  {activeTab?.kind !== "browser" && <motion.div
                    key={activeTab?.id || "launcher"}
                    className="flex-1 min-h-0 flex flex-col"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={quick}
                  >
                    {activeTab?.kind === "files" && <StudioFilesView projectId={studioProject} projectName={studioProjectName} wide={maximized || pane.width >= 720} reloadKey={filesReload} reveal={reveal} />}
                    {activeTab?.kind === "terminal" && <StudioTerminalView entries={terminal.entries} onClear={terminal.clear} />}
                    {activeTab?.kind === "project" && <StudioProjectView projectId={studioProject} reloadKey={filesReload} />}
                    {activeTab?.kind === "shots" && <StudioShotsView />}
                    {activeTab?.kind === "uploads" && <StudioUploadsView />}
                    {activeTab?.kind === "file" && activeTab.path && <StudioLocalFileView path={activeTab.path} />}
                    {activeTab?.kind === "agents" && <StudioAgentsView />}
                    {activeTab?.kind === "review" && <StudioReviewView projectId={studioProject} onChanged={() => setFilesReload((n) => n + 1)} />}
                    {!activeTab && <Launcher onOpen={openTab} />}
                  </motion.div>}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <StudioReviewModal projectId={studioProject} onChanged={() => setFilesReload((n) => n + 1)} />
      <PushToGithubModal
        isOpen={pushOpen}
        onClose={() => setPushOpen(false)}
        onPush={confirmPush}
        projectName={studioProjectInfo?.name || "Project"}
        repoName={studioProjectInfo?.repo}
        isPushing={pushing}
      />
    </div>
  );
}

const hostOf = (u: string) => { try { return new URL(u).host; } catch { return u; } };

// A browser tab's site icon (the globe when there is none, or no internet)
function SiteIcon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const host = hostOf(url);
  useEffect(() => setFailed(false), [host]);
  if (failed || !/^https?:/.test(url) || /^(localhost|127\.0\.0\.1)(:|$)/.test(host)) return <Globe className="relative size-4 shrink-0" />;
  return <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`} alt="" onError={() => setFailed(true)} className="relative size-4 shrink-0 rounded-sm" />;
}

// The "+" page: search and open a tab
function Launcher({ onOpen }: { onOpen: (kind: TabKind) => void }) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const items = useMemo(
    () => (Object.keys(TAB_INFO) as TabKind[]).filter((k) => k !== "file" && TAB_INFO[k].label.toLowerCase().includes(q.trim().toLowerCase())),
    [q],
  );
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-8">
      <div className="mx-auto w-full max-w-xl">
        <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-white dark:bg-[#1e1e1e] text-sm focus-within:border-foreground/30">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            data-no-ring
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && items[0]) onOpen(items[0]); }}
            placeholder="Search tabs: browser, files, terminal, project…"
            className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="mt-3 flex flex-col">
          {items.map((kind, i) => {
            const { label, Icon } = TAB_INFO[kind];
            return (
              <motion.button
                key={kind}
                onClick={() => onOpen(kind)}
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: reduce ? 0 : 0.22, ease: EASE, delay: reduce ? 0 : 0.04 * i }}
                className="flex items-center gap-3 h-10 px-3 rounded-md text-sm text-foreground hover:bg-secondary text-left transition-colors"
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </motion.button>
            );
          })}
          {!items.length && <p className="px-3 py-2 text-sm text-muted-foreground">No tab matches “{q}”.</p>}
        </div>
      </div>
    </div>
  );
}

// An empty tab's message rises in softly
function EmptyRise({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="max-w-sm text-center flex flex-col items-center gap-3"
      initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: reduce ? 0 : 0.4, ease: EASE, delay: reduce ? 0 : 0.06 }}
    >
      {children}
    </motion.div>
  );
}

