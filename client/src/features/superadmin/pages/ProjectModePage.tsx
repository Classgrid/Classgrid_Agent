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
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useParams } from "react-router-dom";
import { ArrowLeft, FolderGit2, GitBranch, GitCommitHorizontal, ImagePlus, PanelBottom, PanelLeft, Plus, Search } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { SidebarTrigger, useSidebar } from "@/components/marketing_ui/sidebar";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { AskAiPanel } from "@/components/ai";
import { AiHubModal } from "@/components/ai/components/AiHubModal";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { fetchWithRescue } from "@/lib/rescue";
import { Progress, ProgressLabel, ProgressValue } from "@/components/marketing_ui/progress";
import { OPEN_PROJECT_FILE_EVENT, REVIEW_CHECKPOINT_EVENT, markCheckpoint } from "@/components/ai/components/stepper/ProjectToolSteps";
import { PushToGithubModal } from "../components/PushToGithubModal";
import { ImageCropperModal } from "@/components/marketing_ui/ImageCropperModal";
import { apiClient } from "@/lib/apiClient";
import { localFolderOf } from "../utils/localProject";
import { DesktopStartPanel, makeLocalProject, type CloudProject, type LocalWorkspace, type RecentProject } from "../components/DesktopStartPanel";
import { DesktopMenuBar, editorMenus } from "@/components/layout/DesktopMenuBar";
import { openLocalFolder } from "../components/StudioProjectPicker";
import { ProjectPlaceSwitch } from "../components/ProjectPlaceSwitch";
import { PROJECT_PLACE_EVENT, getCopyOnThisComputer, linkFolderRepo, listenProjectSaved, saveThisComputerCopy, thisComputerCopy, thisDeviceId, type LocalCopy } from "../utils/projectCopies";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const OPEN_PROJECT_KEY = "cg_project_open"; // which project this browser had open (per-viewer convenience)
const STRIP_HIDDEN_KEY = "cg_project_sidebar_hidden"; // desktop app: the left sidebar was dragged away
// This page was loaded by a refresh while in Project Mode (then the open project stays open)
let reloadedInProject = (() => {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "reload" && new URL(nav.name).pathname.split("/").includes("project");
  } catch { return false; }
})();
const AI_PANEL_KEY = "cg_project_ai_closed"; // whether the AI panel was closed (per-viewer convenience)

type Project = { id: string; name: string; repo: string | null; logo?: string | null; lastOpenedAt: string | null; createdAt?: string; updatedAt: string; location?: "cloud" | "local"; localPath?: string | null; localCopies?: LocalCopy[] };
type GithubAccount = { login: string | null; name: string | null; email: string | null; avatar: string | null };

async function api(path: string, init?: RequestInit) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// Project mode: shown inside the normal layout (left sidebar). The middle shows the user's projects; an open project
// shows the code editor (OpenVSCode Server on the sandbox at ide.classgrid.in; each user is let into their own editor
// box via their Classgrid login). The right side is the AI panel in its overlay layout.
// Classgrid green and orange smoke that drifts in slowly from the left and right sides behind the loading bar
function LoadingSmoke() {
  const reduce = useReducedMotion();
  // side, color, size/position, how far it drifts in, timing
  const puffs = [
    { side: "left", color: "#a3a3a3", top: "28%", h: "55%", w: "70%", from: "-25%", to: "12%", delay: 0, duration: 10 },
    { side: "left", color: "#a3a3a3", top: "40%", h: "40%", w: "50%", from: "-10%", to: "35%", delay: 0.8, duration: 13 },
    { side: "right", color: "#f97316", top: "28%", h: "55%", w: "70%", from: "25%", to: "-12%", delay: 0.3, duration: 11 },
    { side: "right", color: "#f97316", top: "40%", h: "40%", w: "50%", from: "10%", to: "-35%", delay: 1.1, duration: 14 },
  ] as const;
  return (
    <>
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute rounded-full pointer-events-none -z-10 blur-[60px]"
          style={{ [p.side]: "-10%", top: p.top, height: p.h, width: p.w, background: `radial-gradient(closest-side, ${p.color}, ${p.color}00)` }}
          initial={{ opacity: 0, x: p.from }}
          animate={reduce ? { opacity: 0.8, x: p.to } : { opacity: [0, 0.85, 0.65, 0.85], x: [p.from, p.to], y: ["4%", "-6%", "0%"], scale: [0.9, 1.1, 1] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeInOut", repeat: reduce ? 0 : Infinity, repeatType: "reverse" }}
        />
      ))}
    </>
  );
}

// Our GitHub logo (black), turned white in dark mode
// onDark: for buttons with the opposite colours (black in light mode, white in dark mode)
function GithubIcon({ className = "size-4", onDark = false }: { className?: string; onDark?: boolean }) {
  return <img src="https://cdn.classgrid.in/classgrid_intgration/github-icon.svg" alt="" aria-hidden className={`${className} ${onDark ? "invert dark:invert-0" : "dark:invert"}`} />;
}

// The project's picture, or the folder icon when it has none
function ProjectLogo({ logo, className = "size-32" }: { logo?: string | null; className?: string }) {
  return logo
    ? <img src={logo} alt="" className={`${className} shrink-0 rounded-xl border border-border object-cover`} />
    : <span className={`${className} shrink-0 rounded-xl border border-border flex items-center justify-center`}><FolderGit2 className="size-10 text-muted-foreground" /></span>;
}

function timeAgo(iso: string) {
  const secs = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Like Vercel: the repo link, the branch, and the last commit (message and how long ago)
function ProjectGitInfo({ project }: { project: Project }) {
  const [info, setInfo] = useState<{
    repoUrl: string | null;
    branch: string | null;
    commit: { message: string; date: string | null; sha: string; url: string | null } | null;
    vercel?: { name: string; dashboardUrl: string; appUrl: string; domain: string } | null;
  } | null>(null);
  useEffect(() => {
    let live = true;
    api(`/projects/${project.id}/github`).then(({ res, data }) => { if (live) setInfo(res.ok ? data : { repoUrl: null, branch: null, commit: null }); }).catch(() => {});
    return () => { live = false; };
  }, [project.id, project.repo]);
  const repoUrl = info?.repoUrl || `https://github.com/${project.repo}`;
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {info === null ? (
        <Skeleton className="h-4 w-64 max-w-full" />
      ) : info.commit ? (
        <a href={info.commit.url || repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-foreground hover:underline min-w-0 max-w-full w-fit">
          <GitCommitHorizontal className="size-4 shrink-0" />
          <span className="truncate">{info.commit.message || info.commit.sha}</span>
        </a>
      ) : null}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 flex-wrap">
        <a href={repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground min-w-0 max-w-full">
          <GithubIcon className="size-3.5 shrink-0" /><span className="truncate">{project.repo}</span>
        </a>
        {info === null ? (
          <Skeleton className="h-3 w-24" />
        ) : (
          <>
            {info.branch && <span className="flex items-center gap-1 shrink-0">· <GitBranch className="size-3.5" />{info.branch}</span>}
            {info.commit?.date && <span className="shrink-0">· {timeAgo(info.commit.date)}</span>}
          </>
        )}
      </div>
      {info?.vercel && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 flex-wrap">
          <a href={info.vercel.dashboardUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground min-w-0 max-w-full">
            <img src="https://cdn.classgrid.in/classgrid_intgration/vercel-icon-svgrepo-com.svg" alt="" aria-hidden className="size-3.5 shrink-0 dark:invert" />
            <span className="truncate">{info.vercel.name}</span>
          </a>
          <span className="shrink-0">·</span>
          <a href={info.vercel.appUrl} target="_blank" rel="noreferrer" className="hover:text-foreground underline underline-offset-2 truncate min-w-0">{info.vercel.domain}</a>
        </div>
      )}
    </div>
  );
}

const NEW_PROJECT_LINES = [
  "Starting your new project",
  "You can ask the Agent to build a website or an app",
  "You can ask it to write, fix or explain code",
  "You can ask it to make a GitHub repo and push your code",
  "Getting your editor ready",
];

export function ProjectModePage() {
  const { data: currentUser } = useCurrentUser();
  const isSuperAdmin = !!currentUser; // every logged-in user; each gets their own editor box with only their own projects
  const { sessionId } = useParams<{ sessionId?: string }>();

  // The last project list (shared with Studio Mode) shows at once, so a remembered project opens straight away
  // instead of waiting on the projects page for the server's list; the fresh list replaces it when it comes
  const [projects, setProjects] = useState<Project[] | null>(() => {
    try {
      const list = JSON.parse(localStorage.getItem("cg_studio_projects") || "null");
      return Array.isArray(list) && list.length ? (list as Project[]) : null;
    } catch { return null; }
  });
  // No project opens by itself: Project Mode starts on the project list until the user opens one
  // The project open in this tab (shared with Studio Mode). It opens by itself only on a refresh of Project Mode or a
  // link to one of its chats; coming here from Studio or Agent mode starts on the project list.
  const [openId, setOpenId] = useState<string | null>(() => {
    const parts = window.location.pathname.split("/");
    if (!reloadedInProject && !parts[parts.indexOf("project") + 1]) {
      try { localStorage.removeItem(OPEN_PROJECT_KEY); sessionStorage.removeItem(OPEN_PROJECT_KEY); } catch { /* storage blocked */ }
      return null;
    }
    try { return sessionStorage.getItem(OPEN_PROJECT_KEY) || localStorage.getItem(OPEN_PROJECT_KEY); } catch { return null; }
  });
  useEffect(() => { reloadedInProject = false; }, []); // only the first visit after the refresh counts
  const [folder, setFolder] = useState<string | null>(null);
  // Desktop app: the open project is a folder on this computer (no cloud editor; the AI works on it through the app)
  const [localFolder, setLocalFolder] = useState<string | null>(null);
  // ...open in Classgrid Code, our editor, in its own window (opened), or why it couldn't start (error)
  const [localEditor, setLocalEditor] = useState<{ folder: string; url?: string; opened?: boolean; error?: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [linking, setLinking] = useState<Project | null>(null);
  const [appGate, setAppGate] = useState<{ project: Project; installUrl: string } | null>(null);
  const appInstalledRef = useRef<Record<string, boolean>>({}); // repos the Projects page already found the app on
  const [repos, setRepos] = useState<{ fullName: string; private: boolean }[] | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [githubExpired, setGithubExpired] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  // The AI panel on the right can be closed (the editor then uses the full width) and opened again from the top bar
  // The AI panel starts closed every time and opens only when the user clicks the Agent button
  const [aiOpen, setAiOpenState] = useState(false);
  // The editor's width slides together with the AI panel (same timing as the panel), on screens where the panel shows
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches);
  // The AI panel starts at its normal 400 px and can be dragged wider; the editor's space follows it at once
  const [aiWidth, setAiWidth] = useState(400);
  const [aiResizing, setAiResizing] = useState(false);
  // Dragging the AI panel very wide folds the left sidebar, so the page in the middle keeps its room; dragging it
  // back opens the sidebar again (only when it was folded this way)
  const { setOpen: setSidebarOpen, isMobile: sidebarMobile, state: sidebarState } = useSidebar();
  const sidebarFoldedRef = useRef(false);
  useEffect(() => {
    if (sidebarMobile || !wide) return;
    const left = window.innerWidth - (aiOpen ? aiWidth : 0);
    if (left < 1000 && !sidebarFoldedRef.current) { sidebarFoldedRef.current = true; setSidebarOpen(false); }
    else if (left > 1100 && sidebarFoldedRef.current) { sidebarFoldedRef.current = false; setSidebarOpen(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiWidth, aiOpen, wide, sidebarMobile]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const reduceMotion = useReducedMotion();
  const setAiOpen = (v: boolean) => {
    setAiOpenState(v);
    try { v ? localStorage.removeItem(AI_PANEL_KEY) : localStorage.setItem(AI_PANEL_KEY, "1"); } catch { /* storage blocked */ }
  };
  // Opening a project: download, then the editor loads. The bar moves toward each step's target while it waits.
  const [progress, setProgress] = useState<{ label: string; value: number; target: number; lines?: string[] } | null>(null);
  // A new project (no GitHub repo yet) has nothing to download: show a new line every 3 seconds instead
  useEffect(() => {
    const lines = progress?.lines;
    if (!lines?.length) return;
    const t = window.setInterval(() => setProgress((p) => {
      if (!p?.lines) return p;
      const i = p.lines.indexOf(p.label);
      return { ...p, label: p.lines[Math.min(i + 1, p.lines.length - 1)] ?? p.label };
    }), 3000);
    return () => window.clearInterval(t);
  }, [progress?.lines]);
  useEffect(() => {
    if (!progress || progress.value >= progress.target) return;
    const t = window.setTimeout(() => setProgress((p) => p && { ...p, value: Math.min(p.target, p.value + Math.max(0.4, (p.target - p.value) * 0.06)) }), 250);
    return () => window.clearTimeout(t);
  }, [progress]);
  // A folder project in the desktop app: open it in Classgrid Code (older app versions keep the folder card)
  const [editorTry, setEditorTry] = useState(0);
  useEffect(() => {
    setLocalEditor(null);
    const startEditor = (window as any).classgridDesktop?.startEditor;
    if (!localFolder || !startEditor) return;
    let gone = false;
    setLocalEditor({ folder: localFolder });
    setProgress({ label: "Opening Classgrid Code", value: 10, target: 90 });
    Promise.resolve(startEditor(localFolder))
      .catch((e: any) => ({ error: e?.message || "The code editor didn't start." }))
      .then((r: { url?: string; opened?: boolean; error?: string } | null) => {
        if (gone) return;
        if (r?.url) { setLocalEditor({ folder: localFolder, url: r.url }); return; }
        if (r?.opened) { setLocalEditor({ folder: localFolder, opened: true }); setProgress(null); return; }
        setLocalEditor({ folder: localFolder, error: r?.error || "The code editor didn't start." });
        setProgress(null);
      });
    return () => { gone = true; };
  }, [localFolder, editorTry]);
  // ...and its window sits in the code area (desktop/codeeditor.js): it follows the area's place and size, and hides
  // while another page or a window of the app (a dialog, a menu, the AI hub) is open over the area
  const editorAreaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const placeEditor = (window as { classgridDesktop?: { placeEditor?: (folder: string | null, rect: { x: number; y: number; width: number; height: number } | null) => void } }).classgridDesktop?.placeEditor;
    const el = editorAreaRef.current;
    if (!placeEditor || !localEditor?.opened || !localFolder || !el) return;
    let last = "";
    let frame = 0;
    const send = () => {
      frame = 0;
      const covered = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')).some((d) => d.getClientRects().length > 0);
      const r = el.getBoundingClientRect();
      const rect = covered || document.hidden || r.width < 2 || r.height < 2 ? null : { x: r.left, y: r.top, width: r.width, height: r.height };
      const key = JSON.stringify(rect);
      if (key === last) return;
      last = key;
      placeEditor(localFolder, rect);
    };
    const soon = () => { if (!frame) frame = window.requestAnimationFrame(send); };
    send();
    const resized = new ResizeObserver(soon);
    resized.observe(el);
    const changed = new MutationObserver(soon);
    changed.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", soon);
    document.addEventListener("visibilitychange", soon);
    const timer = window.setInterval(soon, 500); // (side panels sliding in or out)
    return () => {
      resized.disconnect();
      changed.disconnect();
      window.removeEventListener("resize", soon);
      document.removeEventListener("visibilitychange", soon);
      window.clearInterval(timer);
      if (frame) window.cancelAnimationFrame(frame);
      placeEditor(null, null);
    };
  }, [localEditor?.opened, localFolder]);

  const openProject = projects?.find((p) => p.id === openId) || null;
  const rememberOpen = (id: string | null) => {
    setOpenId(id);
    // sessionStorage is per tab: with projects open in two tabs, each tab's AI works on its own project
    // (localStorage is shared by all tabs and only kept as the fallback)
    try { id ? localStorage.setItem(OPEN_PROJECT_KEY, id) : localStorage.removeItem(OPEN_PROJECT_KEY); } catch { /* storage blocked */ }
    try { id ? sessionStorage.setItem(OPEN_PROJECT_KEY, id) : sessionStorage.removeItem(OPEN_PROJECT_KEY); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event("agent:refresh-sessions")); // the left list shows this project's chats
  };

  const freshList = useRef(false); // the list came from the server (not the saved one)
  const loadProjects = useCallback(async () => {
    const { res, data } = await api("/projects");
    freshList.current = true;
    if (res.ok) {
      setProjects(data.projects || []);
      try { localStorage.setItem("cg_studio_projects", JSON.stringify((data.projects || []).map(({ id, name, repo, logo, updatedAt, location, localPath, localCopies }: Project) => ({ id, name, repo, logo, updatedAt, location, localPath, localCopies })))); } catch { /* storage blocked */ }
    }
    else setProjects((list) => list || []);
  }, []);
  useEffect(() => { if (isSuperAdmin) loadProjects(); }, [isSuperAdmin, loadProjects]);
  // A project without a repo: check now and then, so a repo the AI made for it shows up here
  const openWithoutRepo = !!openProject && !openProject.repo;
  useEffect(() => {
    if (!openWithoutRepo) return;
    const t = setInterval(() => loadProjects(), 15000);
    return () => clearInterval(t);
  }, [openWithoutRepo, loadProjects]);

  const [githubAccount, setGithubAccount] = useState<GithubAccount | null>(null);
  // GitHub must be connected to use Project Mode at all (code is only kept on GitHub)
  const checkGithub = useCallback(() => {
    api("/github/me").then(({ res, data }) => {
      setGithubAccount(res.ok ? data : null);
      if (res.status === 409) { setGithubConnected(false); setGithubExpired(data.error === "github_expired"); }
      else if (res.ok) { setGithubConnected(true); setGithubExpired(false); }
    }).catch(() => setGithubAccount(null));
  }, []);
  useEffect(() => {
    if (!isSuperAdmin) return;
    checkGithub();
    // Connected or disconnected somewhere else (AI Hub panel, another tab): check again
    const again = () => { checkGithub(); loadProjects(); };
    const onVisible = () => { if (document.visibilityState === "visible") again(); };
    window.addEventListener("classgrid:integrations-changed", again);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("classgrid:integrations-changed", again);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isSuperAdmin, checkGithub, loadProjects]);

  const loadRepos = useCallback(async () => {
    const { res, data } = await api("/github/repos");
    if (res.status === 409) { setGithubConnected(false); setGithubExpired(data.error === "github_expired"); setRepos(null); return; }
    setGithubConnected(res.ok);
    setRepos(res.ok ? data.repos || [] : []);
  }, []);

  // Open = download the project's code fresh from GitHub, then show it in the editor
  const open = async (project: Project, replace = false, resume = false) => {
    // A must, like connecting GitHub: a project with a repo opens only once the Classgrid app is installed on it
    if (project.repo && !appInstalledRef.current[project.repo]) {
      const res = await fetchWithRescue(`${backendUrl}/api/github-app/status?repo=${encodeURIComponent(project.repo)}`, { credentials: "include" }).catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (data?.ready && !data.installed) { setAppGate({ project, installUrl: data.installUrl }); return; }
    }
    setAppGate(null);
    setBusyId(project.id);
    const wasOpen = openId;
    // Opening a different project starts a fresh chat for it: the old chat stays with its own project (chats are
    // kept per project), so the AI never mixes two projects
    if (!resume && chatProjectRef.current && chatProjectRef.current !== project.id) {
      chatProjectRef.current = null;
      const parts = window.location.pathname.split("/");
      const i = parts.indexOf("project");
      if (i !== -1 && parts.length > i + 1) window.history.pushState({}, "", parts.slice(0, i + 1).join("/"));
      window.dispatchEvent(new Event("agent:new-chat"));
    }
    const onDesktopApp = !!(window as { classgridDesktop?: { isDesktop?: boolean } }).classgridDesktop?.isDesktop;
    // Desktop app, a folder project: if its folder is on GitHub now (the user asked the agent to make a repo and push),
    // it is linked to that repo first, so the same project works in the cloud too. Nothing is pushed or uploaded.
    if (onDesktopApp && project.location === "local" && !resume) {
      const linked = await linkFolderRepo(project).catch(() => null);
      if (linked) {
        const p = linked as unknown as Project;
        setProjects((list) => (list || []).map((x) => (x.id === p.id ? p : x)));
        return open(p, replace, resume);
      }
    }
    // Desktop app, a cloud project with no copy on this computer yet: pick a folder and clone the repo there (a real
    // git clone, connected to the same repo); each later open gets the latest from GitHub into it
    if (onDesktopApp && project.location !== "local" && project.repo && !thisComputerCopy(project) && !resume) {
      setBusyId(null);
      const cloned = await getCopyOnThisComputer(project);
      if (!cloned) return;
      const p = cloned as unknown as Project;
      setProjects((list) => (list || []).map((x) => (x.id === p.id ? p : x)));
      return open(p, replace, resume);
    }
    rememberOpen(project.id);
    setFolder(null);
    setLocalFolder(null);
    const newLines = !resume && !project.repo ? NEW_PROJECT_LINES : undefined;
    setProgress({ label: resume ? "Reconnecting to your project" : newLines ? (newLines[0] ?? "") : "Downloading the latest code from GitHub", value: 3, target: 70, lines: newLines });
    try {
      // A folder on this computer: nothing to download, it is already here
      // (a cloud project with a copy on this computer asks the server: it gets the latest there first, or opens in the cloud)
      const here = project.location === "local" ? project.localPath || localFolderOf(project.id) : thisComputerCopy(project) ? null : localFolderOf(project.id);
      if (here) { setProgress(null); setLocalFolder(here); return; }
      const { res, data } = await api(`/projects/${project.id}/open`, { method: "POST", body: JSON.stringify({ replace, resume, deviceId: thisDeviceId() || undefined }) });
      // This computer's copy couldn't be opened (app not connected, clashing changes, copy deleted): say why
      if (res.status === 409 && data.code) {
        if (data.project) setProjects((list) => (list || []).map((p) => (p.id === project.id ? data.project : p)));
        throw new Error(data.error || "Could not open this project on this computer");
      }
      if (res.status === 409 && data.error === "unsaved_changes") {
        setBusyId(null);
        setProgress(null);
        rememberOpen(wasOpen);
        setConfirm({ kind: "fresh", project }); // asks in our own confirm card
        return;
      }
      if (res.status === 409) { setProgress(null); rememberOpen(wasOpen); setGithubConnected(false); setLinking(project); loadRepos(); return; }
      if (!res.ok) throw new Error(data.error || "Could not open this project");
      if (data.local) { setProgress(null); setLocalFolder(data.localPath || project.localPath || "this computer"); if (data.message) toast.success(data.message, { duration: 6000 }); return; }
      setFolder(data.folder);
      setProgress((p) => (p?.lines ? { ...p, value: Math.max(p.value, 70), target: 95 } : { label: "Starting the editor", value: 70, target: 95 }));
      if (data.backup) toast(`Your unsaved work from last time was saved to the GitHub branch "${data.backup}".`, { duration: 12000 });
      if (data.installing) toast("Installing the project's packages in the background. Red marks in the editor go away when it finishes (about a minute the first time).");
    } catch (e: any) {
      setProgress(null);
      rememberOpen(wasOpen);
      toast.error(e?.message || "Could not open this project");
    } finally {
      setBusyId(null);
    }
  };

  // Coming back to the page with a project open: download it fresh again
  useEffect(() => {
    if (openProject && !folder && !localFolder && busyId !== openProject.id) open(openProject, false, true); // refresh: keep the code that is there
    if (projects && freshList.current && openId && !openProject) rememberOpen(null); // only once the server's list says it is gone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, openId]);

  // Desktop app: the project's place changed (a copy here, "On this computer" / "In the cloud", or also in the cloud).
  // On this computer it is already up to date; in the cloud the effect above downloads it fresh.
  useEffect(() => {
    const onPlace = (e: Event) => {
      const p = (e as CustomEvent<{ project?: Project }>).detail?.project;
      if (!p) return;
      if (p.id === openId) {
        const copy = thisComputerCopy(p);
        setProgress(null);
        setFolder(null);
        setLocalFolder(copy?.here ? copy.path : p.location === "local" ? p.localPath || null : null);
      }
      setProjects((list) => (list || []).map((x) => (x.id === p.id ? { ...x, ...p } : x)));
    };
    window.addEventListener(PROJECT_PLACE_EVENT, onPlace);
    return () => window.removeEventListener(PROJECT_PLACE_EVENT, onPlace);
  }, [openId]);
  // Work saved to GitHub by itself after an answer: one short line
  useEffect(() => listenProjectSaved(), []);

  // A chat used while a project is open belongs to that project, so the AI there works on the project's code
  // (a chat that already belongs to another project is never moved; the server keeps it there)
  const chatProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (openId && sessionId && folder) {
      chatProjectRef.current = openId;
      api(`/projects/${openId}/chats`, { method: "POST", body: JSON.stringify({ sessionId }) }).then(({ res, data }) => {
        // The open chat belongs to another project (e.g. the page was reloaded on an old chat): start a new chat
        // for this project, else the AI would keep working on the other project's code
        if (res.status !== 409 || data.error !== "chat_in_other_project") return;
        const parts = window.location.pathname.split("/");
        const i = parts.indexOf("project");
        if (i !== -1 && parts.length > i + 1) window.history.pushState({}, "", parts.slice(0, i + 1).join("/"));
        window.dispatchEvent(new Event("agent:new-chat"));
      });
    }
  }, [openId, sessionId, folder]);

  // Project logo: pick a picture, crop it (same crop tool as the profile page), it is saved to R2
  const [newLogo, setNewLogo] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [logoFor, setLogoFor] = useState<string | null>(null); // "new" or a project id
  const [logoBusy, setLogoBusy] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const pickLogo = (forId: string) => { setLogoFor(forId); logoInputRef.current?.click(); };
  const onLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Pick a picture for the logo."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(`Please select an image smaller than 5MB. This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  const saveLogo = async (blob: Blob) => {
    const target = logoFor;
    if (!target) return;
    setLogoBusy(target);
    try {
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const { data } = await apiClient.post("/api/user/upload-url", { fileName: `project-logo-${Date.now()}.${ext}`, fileType: blob.type });
      const put = await fetch(data.uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": blob.type } });
      if (!put.ok) throw new Error("upload failed");
      if (target === "new") setNewLogo(data.publicUrl);
      else {
        const { res, data: saved } = await api(`/projects/${target}`, { method: "PATCH", body: JSON.stringify({ logo: data.publicUrl }) });
        if (!res.ok) throw new Error(saved.error || "Could not save the logo");
        setProjects((list) => (list || []).map((p) => (p.id === target ? saved.project : p)));
        toast.success("Logo updated");
      }
    } catch (err: any) {
      toast.error(err?.message && err.message !== "upload failed" ? err.message : "Could not upload the logo");
      throw err; // the crop window shows it failed
    } finally {
      setLogoBusy(null);
    }
  };

  const create = async () => {
    const name = (newName || "").trim();
    if (!name) return;
    // Desktop app: a project is a folder on this computer, so after the name and logo it asks which folder
    const desktopApp = (window as { classgridDesktop?: { isDesktop?: boolean; pickFolder?: () => Promise<string | null> } }).classgridDesktop;
    if (desktopApp?.isDesktop && desktopApp.pickFolder) {
      const folder = await desktopApp.pickFolder();
      if (!folder) return;
      const made = await api("/projects/local", { method: "POST", body: JSON.stringify({ name, localPath: folder }) });
      if (!made.res.ok) return toast.error(made.data.error || "Could not create the project");
      let project = made.data.project as Project;
      if (newLogo) {
        const withLogo = await api(`/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ logo: newLogo }) });
        if (withLogo.res.ok) project = withLogo.data.project;
      }
      setNewName(null);
      setNewLogo(null);
      setProjects((list) => [project, ...(list || []).filter((x) => x.id !== project.id)]);
      open(project);
      return;
    }
    const { res, data } = await api("/projects", { method: "POST", body: JSON.stringify({ name, logo: newLogo }) });
    if (!res.ok) return toast.error(data.error || "Could not create the project");
    setNewName(null);
    setNewLogo(null);
    setProjects((list) => [data.project, ...(list || [])]);
    setLinking(data.project); // pick a repo, or start empty and make a repo later
    loadRepos();
  };

  const [renameBusy, setRenameBusy] = useState(false);
  const rename = async () => {
    if (!renaming || renameBusy || !renaming.name.trim()) return;
    setRenameBusy(true);
    try {
      const { res, data } = await api(`/projects/${renaming.id}`, { method: "PATCH", body: JSON.stringify({ name: renaming.name }) });
      if (!res.ok) { toast.error(data.error || "Could not rename the project"); return; }
      setProjects((list) => (list || []).map((p) => (p.id === renaming.id ? data.project : p)));
      setRenaming(null);
      toast.success("Project saved");
    } catch {
      toast.error("Could not rename the project");
    } finally {
      setRenameBusy(false);
    }
  };

  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const remove = async (project: Project) => {
    setDeleteBusy(true);
    const { res } = await api(`/projects/${project.id}`, { method: "DELETE" }).finally(() => setDeleteBusy(false));
    setDeleting(null);
    if (!res.ok) return toast.error("Could not delete the project");
    setProjects((list) => (list || []).filter((p) => p.id !== project.id));
    if (openId === project.id) { rememberOpen(null); setFolder(null); }
    toast.success(`"${project.name}" deleted`);
  };

  const linkRepo = async (repo: string) => {
    if (!linking) return;
    const { res, data } = await api(`/projects/${linking.id}`, { method: "PATCH", body: JSON.stringify({ repo }) });
    if (!res.ok) return toast.error(data.error || "Could not link the repo");
    setProjects((list) => (list || []).map((p) => (p.id === linking.id ? data.project : p)));
    setLinking(null);
    toast.success(`Linked ${repo}. Click Open on the project when you want to start.`); // never opens the editor by itself
  };

  const [pushing, setPushing] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);

  const handleOpenPushModal = () => {
    if (!openProject) return;
    setIsPushModalOpen(true);
  };

  const handleConfirmPush = async (message: string) => {
    if (!openProject) return;
    setPushing(true);
    try {
      const { res, data } = await api(`/projects/${openProject.id}/push`, { method: "POST", body: JSON.stringify({ message }) });
      if (!res.ok) throw new Error(data.error || "Could not push to GitHub");
      toast.success(data.message || "Pushed to GitHub");
      setIsPushModalOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not push to GitHub");
    } finally {
      setPushing(false);
    }
  };

  // A file clicked in the chat steps opens in the editor at those lines
  useEffect(() => {
    const onOpenFile = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // A folder on this computer: the file opens in Classgrid Code when it is open, otherwise in the user's code editor
      if (openProject && localFolder && !folder && detail?.path && (localEditor?.url || localEditor?.opened)) { (window as any).classgridDesktop?.revealInEditor?.(localFolder, String(detail.path), detail.startLine, detail.endLine); return; }
      if (openProject && localFolder && !folder && detail?.path) { (window as any).classgridDesktop?.openInEditor?.(localFolder, String(detail.path), detail.startLine); return; }
      if (!openProject || !folder || !(detail?.path || detail?.plan)) return;
      const { res, data } = await api(`/projects/${openProject.id}/reveal`, { method: "POST", body: JSON.stringify(detail) });
      if (!res.ok) toast.error(data.error || "Could not open the file");
    };
    window.addEventListener(OPEN_PROJECT_FILE_EVENT, onOpenFile);
    return () => window.removeEventListener(OPEN_PROJECT_FILE_EVENT, onOpenFile);
  }, [openProject, folder, localFolder, localEditor?.url, localEditor?.opened]);

  // Review / Reject / Undo an AI answer's changes (from the buttons under each answer)
  type ReviewFile = { file: string; added: number; removed: number; kind: string; diff: string };
  const [review, setReview] = useState<{ sessionId: string; checkpoint: string; files: ReviewFile[] | null; open: string | null; busy: boolean } | null>(null);
  // Undo, Reject and "download a fresh copy" ask first in our own confirm card (the same one as Studio)
  const [confirm, setConfirm] = useState<{ kind: "undo"; sessionId: string; checkpoint: string } | { kind: "reject"; file?: string } | { kind: "fresh"; project: Project } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const cpPath = (r: { sessionId: string; checkpoint: string }) => `/projects/${openProject?.id}/checkpoints/${r.sessionId}/${r.checkpoint}`;
  const loadReview = async (r: { sessionId: string; checkpoint: string }) => {
    const { res, data } = await api(cpPath(r));
    if (!res.ok) { toast.error(data.error || "Could not load the changes"); setReview(null); return; }
    setReview({ ...r, files: data.files || [], open: null, busy: false });
  };
  useEffect(() => {
    const onReview = async (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!openProject || !d?.checkpoint) return;
      if (d.mode === "undo") { setConfirm({ kind: "undo", sessionId: d.sessionId, checkpoint: d.checkpoint }); return; }
      setReview({ sessionId: d.sessionId, checkpoint: d.checkpoint, files: null, open: null, busy: false });
      loadReview(d);
    };
    window.addEventListener(REVIEW_CHECKPOINT_EVENT, onReview);
    return () => window.removeEventListener(REVIEW_CHECKPOINT_EVENT, onReview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProject]);
  const undo = async (d: { sessionId: string; checkpoint: string }) => {
    setConfirmBusy(true);
    const { res, data } = await api(`${cpPath(d)}/undo`, { method: "POST", body: "{}" });
    setConfirmBusy(false);
    setConfirm(null);
    if (res.ok) { markCheckpoint(d.checkpoint, { status: "undone" }); toast.success(`Undone: ${data.reverted} file${data.reverted === 1 ? "" : "s"} put back`); }
    else toast.error(data.error || "Could not undo");
  };
  const rejectChanges = (file?: string) => { if (review) setConfirm({ kind: "reject", file }); };
  const doReject = async (file?: string) => {
    if (!review) return;
    setConfirm(null);
    setReview({ ...review, busy: true });
    const { res, data } = await api(`${cpPath(review)}/reject`, { method: "POST", body: JSON.stringify({ file }) });
    if (res.ok) {
      markCheckpoint(review.checkpoint, file ? { rejectedFiles: [file] } : { status: "rejected" });
      toast.success(file ? `${file} put back` : `Rejected: ${data.reverted} file${data.reverted === 1 ? "" : "s"} put back`);
      if (!file) { setReview(null); return; }
    }
    else toast.error(data.error || "Could not reject the changes");
    loadReview(review);
  };

  // Back from GitHub's install page: open the waiting project once the app is installed on its repo
  useEffect(() => {
    if (!appGate) return;
    const recheck = () => { if (document.visibilityState === "visible") open(appGate.project); };
    window.addEventListener("focus", recheck);
    return () => window.removeEventListener("focus", recheck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appGate]);

  // The AI pushes through the Classgrid GitHub app, so the app must be installed on the open project's repo
  const [appInstall, setAppInstall] = useState<{ installed: boolean; installUrl?: string } | null>(null);
  useEffect(() => {
    const repo = openProject?.repo;
    if (!repo) { setAppInstall(null); return; }
    const check = async () => {
      const res = await fetchWithRescue(`${backendUrl}/api/github-app/status?repo=${encodeURIComponent(repo)}`, { credentials: "include" }).catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      setAppInstall(data?.ready ? { installed: !!data.installed, installUrl: data.installUrl } : null);
    };
    check();
    window.addEventListener("focus", check); // back from GitHub's install page
    return () => window.removeEventListener("focus", check);
  }, [openProject?.repo]);
  // Projects page card: shown to everyone with GitHub connected until the Classgrid app is installed on their
  // project repos (or on their account, when they have no repo yet). It has no close button: it must be seen.
  const [appCard, setAppCard] = useState<{ repos: string[]; installUrl: string } | null>(null);
  useEffect(() => {
    if (!githubConnected || !projects) return;
    const repos = [...new Set(projects.map((p) => p.repo).filter(Boolean))] as string[];
    let stop = false;
    const get = async (path: string) => {
      const res = await fetchWithRescue(`${backendUrl}/api/github-app/${path}`, { credentials: "include" }).catch(() => null);
      return res?.ok ? await res.json().catch(() => null) : null;
    };
    const check = async () => {
      const info = await get(`info?login=${encodeURIComponent(githubAccount?.login || "")}`);
      if (stop) return;
      if (!info?.ready) { setAppCard(null); return; }
      const status = await Promise.all(repos.map(async (repo) => ({ repo, data: await get(`status?repo=${encodeURIComponent(repo)}`) })));
      if (stop) return;
      status.forEach((s) => { appInstalledRef.current[s.repo] = !!s.data?.installed; });
      const missing = status.filter((s) => s.data?.ready && !s.data.installed).map((s) => s.repo);
      setAppCard(missing.length || (!repos.length && !info.installed) ? { repos: missing, installUrl: info.installUrl } : null);
    };
    check();
    window.addEventListener("focus", check); // back from GitHub's install page
    return () => { stop = true; window.removeEventListener("focus", check); };
  }, [githubConnected, projects, githubAccount?.login]);

  // GitHub sends the user back here (?github_app=installed) after installing the app
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("github_app") !== "installed") return;
    toast.success("Classgrid app installed");
    url.searchParams.delete("github_app");
    window.history.replaceState(null, "", url.toString());
  }, []);

  // Desktop app: the start panel (open a folder, clone a repo, the cloud projects to download, the projects on this
  // computer opened before)
  const isDesktop = !!(window as { classgridDesktop?: { isDesktop?: boolean } }).classgridDesktop?.isDesktop;
  const openWorkspace = (w: LocalWorkspace & Partial<Project>) => {
    const full = { repo: null, updatedAt: new Date().toISOString(), lastOpenedAt: null, ...w, location: "local" as const } as Project;
    setProjects((list) => (list && !list.some((x) => x.id === full.id) ? [full, ...list] : list));
    open(full);
  };
  // (a name that is a whole path, like "C:\gridx", shows as its folder's name)
  const shortName = (name: string) => name.split(/[\\/]/).filter(Boolean).pop() || name;
  const recentProjects: RecentProject[] = (projects || []).flatMap((p) => {
    const path = p.location === "local" ? p.localPath : thisComputerCopy(p)?.path;
    return path ? [{ id: p.id, name: shortName(p.name), path, open: () => (p.location === "local" ? openWorkspace(p) : open(p)) }] : [];
  });
  const cloudProjects: CloudProject[] = (projects || []).filter((p) => p.location !== "local").map((p) => ({
    id: p.id, name: shortName(p.name), logo: p.logo, action: p.repo && !thisComputerCopy(p) ? "Download" : "Open", open: () => open(p),
  }));
  useEffect(() => { if (isDesktop && githubConnected) loadRepos(); }, [isDesktop, githubConnected, loadRepos]);

  // Desktop app: one thin top bar like Cursor. The built-in editor's own top bar is hidden (desktop/editor.js), so its
  // search box and layout buttons are here; the editor runs them through the Classgrid add-on
  const editorFrameRef = useRef<HTMLIFrameElement>(null);
  const canCommand = !!(window as { classgridDesktop?: { editorCommand?: unknown } }).classgridDesktop?.editorCommand;
  const editorCommand = (command: string) => {
    editorFrameRef.current?.contentWindow?.focus(); // the search box needs the keyboard inside the editor
    (window as any).classgridDesktop?.editorCommand?.(command);
  };

  // Desktop app: Project Mode's bar goes into the app's own top bar, in the window's title bar row (client/src/main.tsx)
  const titleSlot = isDesktop ? document.getElementById("cg-titlebar-slot") : null;
  const inTitleBar = (bar: React.ReactElement) => (titleSlot ? createPortal(bar, titleSlot) : bar);

  // The built-in editor's own "Open Folder" / "New Window" (desktop/main.js): that folder opens here as a project
  const openProjectRef = useRef(openProject);
  openProjectRef.current = openProject;
  const openWorkspaceRef = useRef(openWorkspace);
  openWorkspaceRef.current = openWorkspace;
  const rememberOpenRef = useRef(rememberOpen);
  rememberOpenRef.current = rememberOpen;
  useEffect(() => {
    const listen = (window as any).classgridDesktop?.onOpenFolderProject;
    if (!listen) return;
    return listen(async (picked: string | null) => {
      if (!picked) { if (openProjectRef.current) saveThisComputerCopy(openProjectRef.current); rememberOpenRef.current(null); setFolder(null); setLocalFolder(null); setProgress(null); return; }
      const p = await makeLocalProject(picked);
      if (p) openWorkspaceRef.current(p);
    });
  }, []);

  // The top bar's File → Open Folder: Windows' own folder picker, then that folder opens as a project
  const pickAndOpenFolder = async () => {
    const p = await openLocalFolder();
    if (p) openWorkspace({ ...p, location: "local", localPath: p.localPath || null });
  };

  // A new Classgrid window from the editor's "New Window" (desktop/main.js): ?openFolder= opens that folder here
  const openFolderParamDone = useRef(false);
  useEffect(() => {
    if (openFolderParamDone.current || !projects) return;
    const url = new URL(window.location.href);
    const picked = url.searchParams.get("openFolder");
    if (!picked) return;
    openFolderParamDone.current = true;
    url.searchParams.delete("openFolder");
    window.history.replaceState(null, "", url.toString());
    makeLocalProject(picked).then((p) => { if (p) openWorkspaceRef.current(p); });
  }, [projects]);

  // Desktop app: the left sidebar can be dragged away completely (like Studio Mode); the sidebar button brings it back
  const [stripHidden, setStripHidden] = useState(() => {
    try { return localStorage.getItem(STRIP_HIDDEN_KEY) === "1"; } catch { return false; }
  });
  const [stripDragging, setStripDragging] = useState(false);
  const hideStrip = isDesktop && stripHidden && sidebarState === "collapsed" && !sidebarMobile;
  useEffect(() => {
    document.documentElement.classList.toggle("studio-sidebar-hidden", hideStrip);
    try { localStorage.setItem(STRIP_HIDDEN_KEY, stripHidden ? "1" : "0"); } catch { /* storage blocked */ }
    if (!hideStrip) return;
    const onTrigger = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.('[data-slot="sidebar-trigger"]')) return;
      e.stopPropagation();
      e.preventDefault();
      setStripHidden(false);
    };
    window.addEventListener("click", onTrigger, true);
    return () => window.removeEventListener("click", onTrigger, true);
  }, [hideStrip, stripHidden]);
  useEffect(() => () => { document.documentElement.classList.remove("studio-sidebar-hidden"); }, []);
  useEffect(() => { if (sidebarState === "expanded") setStripHidden(false); }, [sidebarState]);
  // Drag the sidebar's edge: far left hides it completely, a little left folds it to icons, right opens it
  const startStripDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setStripDragging(true);
    const move = (ev: PointerEvent) => {
      if (ev.clientX < 36) { setSidebarOpen(false); setStripHidden(true); }
      else if (ev.clientX < 160) { setSidebarOpen(false); setStripHidden(false); }
      else { setStripHidden(false); setSidebarOpen(true); }
    };
    const up = () => {
      setStripDragging(false);
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
  const showEditor = isSuperAdmin && (githubConnected !== false || !!localFolder) && openProject && (folder || progress || localFolder); // no GitHub: back to the Connect GitHub screen (a folder on this computer needs no GitHub)
  const editorLoaded = () => {
    setProgress((p) => p && { ...p, label: "Almost ready", target: 100 });
    window.setTimeout(() => setProgress(null), 1200);
  };

  return (
    <motion.div
      className="relative h-full flex flex-col !bg-[#fafafa] dark:!bg-[#000000] text-foreground"
      initial={false}
      animate={{ paddingRight: aiOpen && wide ? aiWidth : 0 }}
      transition={reduceMotion || aiResizing ? { duration: 0 } : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      {isDesktop && !sidebarMobile && (
        <div onPointerDown={startStripDrag} className="group absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize touch-none" title="Drag to hide or show the sidebar">
          <div className={`mx-auto h-full transition-all duration-200 ${stripDragging ? "w-[2px] bg-foreground/40" : "w-px bg-transparent group-hover:w-[2px] group-hover:bg-foreground/25"}`} />
        </div>
      )}
      {stripDragging && createPortal(<div className="fixed inset-0 z-[200] cursor-col-resize select-none" />, document.body)}
      {inTitleBar(<div className={titleSlot ? "flex-1 min-w-0 h-full flex items-center gap-3" : "shrink-0 flex items-center gap-3 h-8 box-content py-4 pl-16 pr-4 border-b border-border"}>{/* same height as the AI panel header, so both lines meet */}
        {titleSlot && <SidebarTrigger />}
        {titleSlot && canCommand && localFolder && !folder && localEditor?.url && <DesktopMenuBar menus={editorMenus(editorCommand, pickAndOpenFolder)} />}
        {showEditor ? (
          <>
            <button onClick={() => { saveThisComputerCopy(openProject); rememberOpen(null); setFolder(null); setLocalFolder(null); setProgress(null); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Projects
            </button>
            <span className="text-sm font-medium truncate" title={openProject.name}>{titleSlot ? (openProject.name.split(/[\\/]/).filter(Boolean).pop() || openProject.name) : openProject.name}</span>
            {openProject.repo && <span className="text-xs text-muted-foreground truncate">{openProject.repo}</span>}
            {/* Desktop app: get a copy on this computer, or switch between this computer and the cloud */}
            {/* (not in the desktop app's top bar: the owner removed "Also use in the cloud" there) */}
            {!titleSlot && <ProjectPlaceSwitch project={openProject} />}
            {isDesktop && canCommand && localFolder && !folder && localEditor?.url && (
              <>
                <div className="flex-1 min-w-0 flex justify-center">
                  <button onClick={() => editorCommand("workbench.action.quickOpen")} title="Search files (Ctrl+P)" className="flex items-center justify-center gap-2 h-7 w-full max-w-[420px] min-w-0 px-3 rounded-md border border-border bg-secondary/40 text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Search className="size-3.5 shrink-0" />
                    <span className="truncate">{openProject.name.split(/[\\/]/).filter(Boolean).pop() || openProject.name}</span>
                  </button>
                </div>
                <button onClick={() => editorCommand("workbench.action.toggleSidebarVisibility")} title="Show or hide the file list" aria-label="Show or hide the file list" className="shrink-0 flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <PanelLeft className="size-4" />
                </button>
                <button onClick={() => editorCommand("workbench.action.togglePanel")} title="Show or hide the terminal" aria-label="Show or hide the terminal" className="shrink-0 flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <PanelBottom className="size-4" />
                </button>
              </>
            )}
            {openProject.repo && folder && (
              <button onClick={handleOpenPushModal} disabled={pushing} title="Push to GitHub" aria-label="Push to GitHub" className="ml-auto shrink-0 flex items-center gap-2 h-8 px-3 rounded-full border border-border text-sm hover:bg-secondary disabled:opacity-50">
                {pushing ? <Spinner className="size-4" /> : <GithubIcon className="size-4" />}
                {/* Normal panel size: full text. Once the AI panel is dragged wider: only the GitHub icon */}
                {aiWidth <= 440 && <span>Push to GitHub</span>}
              </button>
            )}
          </>
        ) : (
          <span className="text-sm font-medium">Project Mode</span>
        )}
        {!aiOpen && (
          <button
            onClick={() => setAiOpen(true)}
            className={`${showEditor && openProject?.repo && folder ? "" : "ml-auto"} shrink-0 flex items-center h-8 px-3 rounded-full border border-border bg-background text-sm text-foreground hover:bg-secondary`}
            title="Open the AI agent"
          >
            Agent
          </button>
        )}
      </div>)}

      {showEditor ? (
        <div className="relative flex-1 flex flex-col">
          {folder && !openProject.repo && (
            <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 border-b border-amber-500/20 bg-amber-500/10 text-sm overflow-hidden">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="flex-1 min-w-[14rem] text-amber-700 dark:text-amber-400">This project has no GitHub repo yet. Code is only kept on GitHub, so make a repo and push your work.</span>
              <button
                onClick={() => {
                  setAiOpen(true);
                  setTimeout(() => window.dispatchEvent(new CustomEvent("agent:ask", { detail: { text: "Create a GitHub repo for this project and push the code to it." } })), 400);
                }}
                className="shrink-0 max-w-full h-8 px-3 rounded-full border border-border bg-background text-sm text-foreground hover:bg-secondary whitespace-nowrap truncate"
              >
                Ask Agent to create repo
              </button>
            </div>
          )}
          {folder && openProject.repo && appInstall && !appInstall.installed && (
            <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 border-b border-amber-500/20 bg-amber-500/10 text-sm overflow-hidden">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="flex-1 min-w-[14rem] text-amber-700 dark:text-amber-400">Install the Classgrid app on {openProject.repo}.</span>
              <a
                href={appInstall.installUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 max-w-full h-8 px-3 inline-flex items-center gap-2 rounded-full border border-border bg-background text-sm text-foreground hover:bg-secondary whitespace-nowrap truncate"
              >
                <GithubIcon className="size-4" /> Install Classgrid app
              </a>
            </div>
          )}
          {localFolder && !folder && localEditor?.url && (
            <iframe ref={editorFrameRef} key={localEditor.url} src={localEditor.url} onLoad={editorLoaded} title="Code editor" className="flex-1 w-full border-0 [color-scheme:light] dark:[color-scheme:dark]" allow="clipboard-read; clipboard-write" />
          )}
          {localFolder && !folder && localEditor?.opened && (
            <div ref={editorAreaRef} className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <FolderGit2 className="size-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Your project is open in Classgrid Code</h3>
              <p className="text-sm text-muted-foreground font-mono break-all max-w-xl">{localFolder}</p>
              <p className="text-sm text-muted-foreground max-w-md">Edit your files and chat with the Agent there. Files the AI mentions open there too.</p>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setEditorTry((n) => n + 1)} className="h-9 px-4 rounded-full border border-border bg-background text-sm text-foreground hover:bg-secondary">Open Classgrid Code</button>
                <button type="button" onClick={() => (window as any).classgridDesktop?.openFolder?.(localFolder)} className="h-9 px-4 rounded-full border border-border bg-background text-sm text-foreground hover:bg-secondary">Show in File Explorer</button>
              </div>
            </div>
          )}
          {localFolder && !folder && !localEditor?.url && !localEditor?.opened && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <FolderGit2 className="size-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">This project is a folder on your computer</h3>
              <p className="text-sm text-muted-foreground font-mono break-all max-w-xl">{localFolder}</p>
              <p className="text-sm text-muted-foreground max-w-md">The AI reads, edits and runs commands in this folder through the Classgrid app. To edit by hand, open it in your own code editor.</p>
              {localEditor?.error && <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md">{localEditor.error}</p>}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => (window as any).classgridDesktop?.openInEditor?.(localFolder)} className="h-9 px-4 rounded-full border border-border bg-background text-sm text-foreground hover:bg-secondary">Open in VS Code</button>
                <button type="button" onClick={() => (window as any).classgridDesktop?.openFolder?.(localFolder)} className="h-9 px-4 rounded-full border border-border bg-background text-sm text-foreground hover:bg-secondary">Show in File Explorer</button>
              </div>
            </div>
          )}
          {folder && (
            <iframe key={folder} src={`https://ide.classgrid.in/?folder=${encodeURIComponent(folder)}`} onLoad={editorLoaded} title="Code editor" className="flex-1 w-full border-0 [color-scheme:light] dark:[color-scheme:dark]" allow="clipboard-read; clipboard-write" />
          )}
          {progress && (
            <div className="absolute inset-0 isolate overflow-hidden flex items-center justify-center !bg-[#fafafa] dark:!bg-[#000000]">
              <LoadingSmoke />
              <Progress value={Math.round(progress.value)} className="w-[min(360px,80%)]">
                <ProgressLabel>
                  {/* each line comes in word by word (fade, lift, unblur) and fades out before the next */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={progress.label}
                      className="inline-block"
                      initial="hidden"
                      animate="show"
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.2, ease: "easeIn" } }}
                      variants={{ hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.045 } } }}
                    >
                      {progress.label.split(" ").map((w, i) => (
                        <motion.span
                          key={i}
                          className="inline-block whitespace-pre"
                          variants={{
                            hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(4px)" },
                            show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
                          }}
                        >
                          {w + (i < progress.label.split(" ").length - 1 ? " " : "")}
                        </motion.span>
                      ))}
                    </motion.span>
                  </AnimatePresence>
                </ProgressLabel>
                <ProgressValue />
              </Progress>
            </div>
          )}
        </div>
      ) : !isSuperAdmin ? (
        <div className="flex-1" />
      ) : githubConnected === false && isDesktop ? (
        <div className="flex-1 overflow-y-auto px-6 py-12">
          <DesktopStartPanel recent={recentProjects} cloud={null} onOpen={openWorkspace} onConnectGithub={() => setHubOpen(true)} />
        </div>
      ) : githubConnected === false ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 flex flex-col gap-4 text-center">
            <GithubIcon className="size-8 mx-auto" />
            <h1 className="text-xl font-semibold">{githubExpired ? "Reconnect GitHub" : "Connect GitHub to use Project Mode"}</h1>
            <p className="text-sm text-muted-foreground">Project Mode needs your GitHub account. Your code is only kept on GitHub, never on our servers.</p>
            <button onClick={() => setHubOpen(true)} className="flex items-center justify-center gap-2 bg-foreground text-background px-4 py-2 rounded-full font-medium text-sm hover:opacity-90">
              <GithubIcon className="size-4" onDark /> {githubExpired ? "Reconnect GitHub" : "Connect GitHub"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {isDesktop ? (
            <div className="pt-8">
              <DesktopStartPanel recent={recentProjects} cloud={cloudProjects} githubRepos={repos?.map((r) => r.fullName)} onOpen={openWorkspace} />
            </div>
          ) : (
          <div className="max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Projects</h1>
                <p className="text-muted-foreground text-sm">Your code stays on GitHub. Opening a project downloads it fresh.</p>
                {githubAccount && (
                  <div className="flex items-center gap-2.5 mt-4">
                    {githubAccount.avatar
                      ? <img src={githubAccount.avatar} alt="" className="size-8 rounded-full border border-border" />
                      : <div className="size-8 rounded-full border border-border flex items-center justify-center"><GithubIcon className="size-4" /></div>}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">
                        {githubAccount.name}{githubAccount.login && githubAccount.login !== githubAccount.name ? <span className="text-muted-foreground font-normal"> @{githubAccount.login}</span> : null}
                      </span>
                      {githubAccount.email && <span className="text-xs text-muted-foreground truncate">{githubAccount.email}</span>}
                    </div>
                  </div>
                )}
              </div>
              {projects && projects.length > 0 && newName === null && (
                <button onClick={() => setNewName("")} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-full font-medium text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
                  <Plus className="size-4" /> New project
                </button>
              )}
            </div>

            {appCard && (
              <div className="max-w-3xl mb-4 rounded-xl border border-border bg-background p-5 flex items-center gap-4">
                <GithubIcon className="size-8 shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="font-medium">{appCard.repos.length ? "Install the Classgrid app" : "New: the Classgrid GitHub app"}</span>
                  <span className="text-sm text-muted-foreground">
                    {appCard.repos.length
                      ? `Required for ${appCard.repos.join(", ")}.`
                      : "Required for the repositories you work on."}
                  </span>
                </div>
                <a href={appCard.installUrl} target="_blank" rel="noreferrer" className="shrink-0 flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-full font-medium text-sm hover:opacity-90 whitespace-nowrap">
                  <GithubIcon className="size-4" onDark /> Install app
                </a>
              </div>
            )}

            {projects === null ? (
              <div className="flex flex-col gap-4 max-w-3xl">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <Skeleton className="size-32 shrink-0 rounded-xl" />
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-72 max-w-full" />
                      </div>
                      <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-64 max-w-full" />
                    <Skeleton className="h-3 w-48 max-w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-w-3xl">
                {(newName !== null || projects.length === 0) && (
                  <div className="rounded-xl border border-dashed border-border p-4 flex flex-col gap-3 min-h-[140px]">
                    {newName === null ? (
                      <button onClick={() => setNewName("")} className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <Plus className="size-6" /> Create project
                      </button>
                    ) : (
                      <>
                        <span className="text-sm font-medium">New project</span>
                        <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => pickLogo("new")}
                          title={newLogo ? "Change logo" : "Add logo"}
                          className="size-32 shrink-0 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1.5 overflow-hidden hover:bg-secondary text-muted-foreground"
                        >
                          {logoBusy === "new" ? <Spinner className="size-6" /> : newLogo ? <img src={newLogo} alt="" className="size-full object-cover" /> : <><ImagePlus className="size-8" /><span className="text-xs">Add logo</span></>}
                        </button>
                        <input
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") setNewName(null); }}
                          placeholder="Project name"
                          maxLength={80}
                          className="h-9 flex-1 min-w-0 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        </div>
                        <div className="flex justify-end gap-2 mt-auto">
                          <button onClick={() => { setNewName(null); setNewLogo(null); }} className="px-3 py-1.5 rounded-full text-sm hover:bg-secondary">Cancel</button>
                          <button onClick={create} disabled={!newName.trim()} className="px-3 py-1.5 rounded-full text-sm bg-foreground text-background disabled:opacity-50">Create</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {projects.map((p) => (
                  <div key={p.id} className="group rounded-xl border border-border bg-background p-5 flex flex-col gap-3 hover:bg-secondary/60 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      {renaming?.id === p.id ? (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickLogo(p.id)}
                          title="Change logo"
                          className="size-32 shrink-0 rounded-xl border border-dashed border-border flex items-center justify-center overflow-hidden hover:bg-secondary"
                        >
                          {logoBusy === p.id ? <Spinner className="size-6" /> : p.logo ? <img src={p.logo} alt="" className="size-full object-cover" /> : <ImagePlus className="size-8 text-muted-foreground" />}
                        </button>
                      ) : logoBusy === p.id ? (
                        <span className="size-32 shrink-0 rounded-xl border border-border flex items-center justify-center"><Spinner className="size-6" /></span>
                      ) : (
                        <ProjectLogo logo={p.logo} />
                      )}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        {renaming?.id === p.id ? (
                          <input
                            autoFocus
                            value={renaming.name}
                            onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setRenaming(null); }}
                            maxLength={80}
                            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        ) : (
                          <span className="font-medium truncate">{p.name}</span>
                        )}
                        <span className="text-xs text-muted-foreground truncate">
                          {[
                            p.createdAt && `Created ${new Date(p.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`,
                            p.updatedAt && `Last edited ${new Date(p.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, ${new Date(p.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`,
                            p.lastOpenedAt ? `Opened ${new Date(p.lastOpenedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : "Never opened",
                          ].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <button
                        onClick={() => { if (p.repo || p.location === "local") open(p); else { setLinking(p); loadRepos(); } }}
                        disabled={busyId === p.id || (p.location === "local" && !isDesktop)}
                        title={p.location === "local" && !isDesktop ? "This project is only on a computer. Open it in the Classgrid desktop app." : undefined}
                        className="self-start shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-sm hover:bg-secondary disabled:opacity-50"
                      >
                        {busyId === p.id ? <Spinner className="size-4" /> : p.repo ? <GithubIcon className="size-4" /> : <FolderGit2 className="size-4" />}
                        {busyId === p.id ? (p.repo ? "Downloading…" : "Opening…") : "Open"}
                      </button>
                    </div>
                    <div className="flex items-end gap-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        {p.repo
                          ? <ProjectGitInfo project={p} />
                          : p.location === "local"
                            ? (isDesktop
                              ? <span className="text-xs text-muted-foreground truncate block" title={p.localPath || undefined}>On this computer · {p.localPath}</span>
                              : <span className="text-xs text-muted-foreground">Not connected to a repo · only on a computer. To use it here, open the Classgrid desktop app and ask the agent to make a GitHub repo and push it.</span>)
                            : <span className="text-xs text-muted-foreground">No GitHub repo yet · <button onClick={() => { setLinking(p); loadRepos(); }} className="underline hover:text-foreground">Link one</button></span>}
                      </div>
                      {renaming?.id === p.id ? (
                        <>
                          <Button variant="outline" onClick={() => setRenaming(null)} disabled={renameBusy} className="shrink-0">Cancel</Button>
                          <Button onClick={rename} disabled={renameBusy || !renaming.name.trim()} className="shrink-0">
                            {renameBusy && <Spinner className="size-4" />} Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" onClick={() => setRenaming({ id: p.id, name: p.name })} className="shrink-0">Edit</Button>
                          <Button variant="destructive" onClick={() => setDeleting(p)} className="shrink-0">Delete</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoFile} />
      <ImageCropperModal
        isOpen={!!cropSrc}
        onClose={() => setCropSrc(null)}
        imageSrc={cropSrc || ""}
        aspectRatio={1}
        title="Crop project logo"
        onCropComplete={saveLogo}
      />

      <DangerConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o && !confirmBusy) setConfirm(null); }}
        title={confirm?.kind === "fresh" ? "Download a fresh copy" : confirm?.kind === "undo" ? "Undo this answer" : confirm?.file ? "Reject this file's changes" : "Reject all changes"}
        description={confirm?.kind === "fresh"
          ? "This project has changes that are not pushed to GitHub. A fresh copy from GitHub replaces them."
          : confirm?.kind === "undo"
            ? "The project goes back to how it was before this answer. Changes made after it are undone too."
            : confirm?.file
              ? `The agent's changes to ${confirm.file} will be thrown away and the file put back as it was before this answer.`
              : "All of this answer's changes will be thrown away and every file put back as it was before this answer."}
        warningMessage="This can't be undone."
        actionLabel={confirm?.kind === "fresh" ? "Download fresh copy" : confirm?.kind === "undo" ? "Undo" : confirm?.file ? "Reject file" : "Reject all"}
        isLoading={confirmBusy}
        onConfirm={() => {
          if (confirm?.kind === "fresh") { const p = confirm.project; setConfirm(null); open(p, true); }
          else if (confirm?.kind === "undo") undo(confirm);
          else if (confirm) doReject(confirm.file);
        }}
      />

      <DangerConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o && !deleteBusy) setDeleting(null); }}
        title="Delete project"
        description={`Delete "${deleting?.name || ""}" from Project Mode.`}
        confirmationSteps={deleting ? [{ label: "To confirm, type the project name", value: deleting.name }] : []}
        warningMessage="Its code stays on GitHub. Only the project here is deleted."
        actionLabel="Delete project"
        isLoading={deleteBusy}
        onConfirm={() => deleting && remove(deleting)}
      />

      {appGate && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4" onClick={() => setAppGate(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-semibold">Install the Classgrid app</h2>
              <p className="text-sm text-muted-foreground">Required for {appGate.project.repo}.</p>
            </div>
            <a href={appGate.installUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-foreground text-background px-4 py-2 rounded-full font-medium text-sm hover:opacity-90">
              <GithubIcon className="size-4" onDark /> Install app
            </a>
            <div className="flex justify-end">
              <button onClick={() => setAppGate(null)} className="px-3 py-1.5 rounded-full text-sm hover:bg-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {linking && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4" onClick={() => setLinking(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div>
              {/* Step 1 (must): connect GitHub. Step 2 (optional): pick a repo, or enter without one */}
              {githubConnected === false ? (
                <>
                  <h2 className="text-lg font-semibold">Connect GitHub</h2>
                  <p className="text-sm text-muted-foreground">Connecting GitHub is needed before you can open "{linking.name}". Your code is only kept on GitHub.</p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">Link a GitHub repo</h2>
                  <p className="text-sm text-muted-foreground">For "{linking.name}". Pick a repo below, or enter the project without a repo. You or the Agent can make a repo any time.</p>
                </>
              )}
            </div>
            {githubConnected === false ? (
              <button onClick={() => setHubOpen(true)} className="flex items-center justify-center gap-2 bg-foreground text-background px-4 py-2 rounded-full font-medium text-sm hover:opacity-90">
                <GithubIcon className="size-4" onDark /> {githubExpired ? "Reconnect GitHub" : "Connect GitHub"}
              </button>
            ) : repos === null ? (
              <div className="flex justify-center py-6"><Spinner className="size-5 text-muted-foreground" /></div>
            ) : repos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repos found on your GitHub account.</p>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto -mx-2">
                {repos.map((r) => (
                  <button key={r.fullName} onClick={() => linkRepo(r.fullName)} className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm hover:bg-secondary">
                    <GithubIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{r.fullName}</span>
                    {r.private && <span className="text-xs text-muted-foreground">private</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              {githubConnected ? (
                <button
                  onClick={() => { const p = linking; setLinking(null); open(p); }}
                  className="px-3 py-1.5 rounded-full border border-border text-sm hover:bg-secondary"
                  title="Open the project without a repo. You or the Agent can make one any time and push the code."
                >
                  Enter project without a repo
                </button>
              ) : <span />}
              {/* Only closes the box (no "Later" wording: it read as if GitHub could be skipped) */}
              {githubConnected && <button onClick={() => setLinking(null)} className="px-3 py-1.5 rounded-full text-sm hover:bg-secondary">Cancel</button>}
            </div>
          </div>
        </div>
      )}

      <AskAiPanel open={aiOpen} onOpenChange={setAiOpen} variant="overlay" hideClearChat overlayWidth={aiWidth} onOverlayWidthChange={setAiWidth} onOverlayResizingChange={setAiResizing} />
      <PushToGithubModal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        onPush={handleConfirmPush}
        projectName={openProject?.name || "Project"}
        repoName={openProject?.repo}
        isPushing={pushing}
      />
      {review && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4" onClick={() => setReview(null)}>
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-background" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Review changes</h2>
              {review.files && (
                <span className="text-sm text-muted-foreground">
                  {review.files.length} file{review.files.length === 1 ? "" : "s"}
                  <span className="ml-2 text-[#16a34a] dark:text-[#22c55e]">+{review.files.reduce((n, f) => n + f.added, 0)}</span>
                  <span className="ml-1 text-red-600 dark:text-red-500">-{review.files.reduce((n, f) => n + f.removed, 0)}</span>
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button disabled={review.busy || !review.files?.length} onClick={() => rejectChanges()} className="px-3 py-1.5 rounded-full border border-border text-sm hover:bg-secondary disabled:opacity-50">Reject all</button>
                <button onClick={() => { markCheckpoint(review.checkpoint, { status: "kept" }); setReview(null); toast.success("Changes kept"); }} className="px-3 py-1.5 rounded-full bg-foreground text-background text-sm hover:opacity-90">Accept all</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {review.files === null ? (
                <div className="flex justify-center py-10"><Spinner className="size-5 text-muted-foreground" /></div>
              ) : review.files.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground">No changes left from this answer.</p>
              ) : review.files.map((f) => (
                <div key={f.file} className="border-b border-border last:border-b-0">
                  <div className="flex items-center gap-2 px-5 py-2.5">
                    <button onClick={() => setReview({ ...review, open: review.open === f.file ? null : f.file })} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:text-foreground">
                      <span className="truncate font-medium">{f.file}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{f.kind}</span>
                      <span className="shrink-0 text-xs text-[#16a34a] dark:text-[#22c55e]">+{f.added}</span>
                      <span className="shrink-0 text-xs text-red-600 dark:text-red-500">-{f.removed}</span>
                    </button>
                    <button disabled={review.busy} onClick={() => rejectChanges(f.file)} className="shrink-0 px-2.5 py-1 rounded-md border border-border text-xs hover:bg-secondary disabled:opacity-50">Reject</button>
                  </div>
                  {review.open === f.file && (
                    <pre className="mx-5 mb-3 max-h-[45vh] overflow-auto rounded-lg border border-border text-[12px] leading-5">
                      {f.diff.split("\n").filter((l) => !/^(diff --git|index |--- |\+\+\+ )/.test(l)).map((l, i) => (
                        <div key={i} className={l.startsWith("+") ? "px-3 bg-green-500/10 text-green-800 dark:text-green-300" : l.startsWith("-") ? "px-3 bg-red-500/10 text-red-800 dark:text-red-300" : l.startsWith("@@") ? "px-3 text-muted-foreground" : "px-3"}>{l || " "}</div>
                      ))}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AiHubModal isOpen={hubOpen} onClose={() => { setHubOpen(false); loadRepos(); checkGithub(); }} />
    </motion.div>
  );
}
