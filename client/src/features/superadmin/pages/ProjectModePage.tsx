import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useParams } from "react-router-dom";
import { ArrowLeft, FolderGit2, Github, Pencil, Plus, Trash2 } from "lucide-react";
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

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const OPEN_PROJECT_KEY = "cg_project_open"; // which project this browser had open (per-viewer convenience)
const AI_PANEL_KEY = "cg_project_ai_closed"; // whether the AI panel was closed (per-viewer convenience)

type Project = { id: string; name: string; repo: string | null; lastOpenedAt: string | null; createdAt?: string; updatedAt: string };
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
    { side: "left", color: "#34d399", top: "28%", h: "55%", w: "70%", from: "-25%", to: "12%", delay: 0, duration: 10 },
    { side: "left", color: "#34d399", top: "40%", h: "40%", w: "50%", from: "-10%", to: "35%", delay: 0.8, duration: 13 },
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

export function ProjectModePage() {
  const { data: currentUser } = useCurrentUser();
  const isSuperAdmin = !!currentUser; // every logged-in user; each gets their own editor box with only their own projects
  const { sessionId } = useParams<{ sessionId?: string }>();

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(() => { try { return localStorage.getItem(OPEN_PROJECT_KEY); } catch { return null; } });
  const [folder, setFolder] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [linking, setLinking] = useState<Project | null>(null);
  const [repos, setRepos] = useState<{ fullName: string; private: boolean }[] | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [githubExpired, setGithubExpired] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  // The AI panel on the right can be closed (the editor then uses the full width) and opened again from the top bar
  const [aiOpen, setAiOpenState] = useState(() => { try { return localStorage.getItem(AI_PANEL_KEY) !== "1"; } catch { return true; } });
  // The editor's width slides together with the AI panel (same timing as the panel), on screens where the panel shows
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches);
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
  const [progress, setProgress] = useState<{ label: string; value: number; target: number } | null>(null);
  useEffect(() => {
    if (!progress || progress.value >= progress.target) return;
    const t = window.setTimeout(() => setProgress((p) => p && { ...p, value: Math.min(p.target, p.value + Math.max(0.4, (p.target - p.value) * 0.06)) }), 250);
    return () => window.clearTimeout(t);
  }, [progress]);

  const openProject = projects?.find((p) => p.id === openId) || null;
  const rememberOpen = (id: string | null) => {
    setOpenId(id);
    try { id ? localStorage.setItem(OPEN_PROJECT_KEY, id) : localStorage.removeItem(OPEN_PROJECT_KEY); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event("agent:refresh-sessions")); // the left list shows this project's chats
  };

  const loadProjects = useCallback(async () => {
    const { res, data } = await api("/projects");
    if (res.ok) setProjects(data.projects || []);
    else setProjects([]);
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
  }, [isSuperAdmin]);

  const loadRepos = useCallback(async () => {
    const { res, data } = await api("/github/repos");
    if (res.status === 409) { setGithubConnected(false); setGithubExpired(data.error === "github_expired"); setRepos(null); return; }
    setGithubConnected(res.ok);
    setRepos(res.ok ? data.repos || [] : []);
  }, []);

  // Open = download the project's code fresh from GitHub, then show it in the editor
  const open = async (project: Project, replace = false, resume = false) => {
    setBusyId(project.id);
    const wasOpen = openId;
    rememberOpen(project.id);
    setFolder(null);
    setProgress({ label: resume ? "Reconnecting to your project" : "Downloading the latest code from GitHub", value: 3, target: 70 });
    try {
      const { res, data } = await api(`/projects/${project.id}/open`, { method: "POST", body: JSON.stringify({ replace, resume }) });
      if (res.status === 409 && data.error === "unsaved_changes") {
        setBusyId(null);
        if (window.confirm("This project has changes that are not pushed to GitHub. Download a fresh copy and lose them?")) return open(project, true);
        setProgress(null);
        rememberOpen(wasOpen);
        return;
      }
      if (res.status === 409) { setProgress(null); rememberOpen(wasOpen); setGithubConnected(false); setLinking(project); loadRepos(); return; }
      if (!res.ok) throw new Error(data.error || "Could not open this project");
      setFolder(data.folder);
      setProgress({ label: "Starting the editor", value: 70, target: 95 });
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
    if (openProject && !folder && busyId !== openProject.id) open(openProject, false, true); // refresh: keep the code that is there
    if (projects && openId && !openProject) rememberOpen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, openId]);

  // A chat used while a project is open belongs to that project, so the AI there works on the project's code
  useEffect(() => {
    if (openId && sessionId && folder) api(`/projects/${openId}/chats`, { method: "POST", body: JSON.stringify({ sessionId }) });
  }, [openId, sessionId, folder]);

  const create = async () => {
    const name = (newName || "").trim();
    if (!name) return;
    const { res, data } = await api("/projects", { method: "POST", body: JSON.stringify({ name }) });
    if (!res.ok) return toast.error(data.error || "Could not create the project");
    setNewName(null);
    setProjects((list) => [data.project, ...(list || [])]);
    setLinking(data.project); // pick a repo, or start empty and make a repo later
    loadRepos();
  };

  const rename = async () => {
    if (!renaming) return;
    const { res, data } = await api(`/projects/${renaming.id}`, { method: "PATCH", body: JSON.stringify({ name: renaming.name }) });
    if (!res.ok) return toast.error(data.error || "Could not rename the project");
    setProjects((list) => (list || []).map((p) => (p.id === renaming.id ? data.project : p)));
    setRenaming(null);
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
      if (!openProject || !folder || !(detail?.path || detail?.plan)) return;
      const { res, data } = await api(`/projects/${openProject.id}/reveal`, { method: "POST", body: JSON.stringify(detail) });
      if (!res.ok) toast.error(data.error || "Could not open the file");
    };
    window.addEventListener(OPEN_PROJECT_FILE_EVENT, onOpenFile);
    return () => window.removeEventListener(OPEN_PROJECT_FILE_EVENT, onOpenFile);
  }, [openProject, folder]);

  // Review / Reject / Undo an AI answer's changes (from the buttons under each answer)
  type ReviewFile = { file: string; added: number; removed: number; kind: string; diff: string };
  const [review, setReview] = useState<{ sessionId: string; checkpoint: string; files: ReviewFile[] | null; open: string | null; busy: boolean } | null>(null);
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
      if (d.mode === "undo") {
        if (!window.confirm("Put the project back to how it was before this answer? Changes made after it, by you or the AI, are undone too.")) return;
        const { res, data } = await api(`${cpPath(d)}/undo`, { method: "POST", body: "{}" });
        if (res.ok) { markCheckpoint(d.checkpoint, { status: "undone" }); toast.success(`Undone: ${data.reverted} file${data.reverted === 1 ? "" : "s"} put back`); }
        else toast.error(data.error || "Could not undo");
        return;
      }
      setReview({ sessionId: d.sessionId, checkpoint: d.checkpoint, files: null, open: null, busy: false });
      loadReview(d);
    };
    window.addEventListener(REVIEW_CHECKPOINT_EVENT, onReview);
    return () => window.removeEventListener(REVIEW_CHECKPOINT_EVENT, onReview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProject]);
  const rejectChanges = async (file?: string) => {
    if (!review) return;
    if (!window.confirm(file ? `Throw away the AI's changes to ${file}?` : "Throw away all of this answer's changes?")) return;
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

  const showEditor = isSuperAdmin && openProject && (folder || progress);
  const editorLoaded = () => {
    setProgress((p) => p && { ...p, label: "Almost ready", target: 100 });
    window.setTimeout(() => setProgress(null), 1200);
  };

  return (
    <motion.div
      className="h-full flex flex-col !bg-[#fafafa] dark:!bg-[#000000] text-foreground"
      initial={false}
      animate={{ paddingRight: aiOpen && wide ? 400 : 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="shrink-0 flex items-center gap-3 h-8 box-content py-4 pl-16 pr-4 border-b border-border">{/* same height as the AI panel header, so both lines meet */}
        {showEditor ? (
          <>
            <button onClick={() => { rememberOpen(null); setFolder(null); setProgress(null); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Projects
            </button>
            <span className="text-sm font-medium truncate">{openProject.name}</span>
            {openProject.repo && <span className="text-xs text-muted-foreground truncate">{openProject.repo}</span>}
            {openProject.repo && folder && (
              <button onClick={handleOpenPushModal} disabled={pushing} className="ml-auto shrink-0 flex items-center gap-2 h-8 px-3 rounded-full border border-border text-sm hover:bg-secondary disabled:opacity-50">
                {pushing ? <Spinner className="size-4" /> : <Github className="size-4" />} Push to GitHub
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
      </div>

      {showEditor ? (
        <div className="relative flex-1 flex flex-col">
          {folder && !openProject.repo && (
            <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-amber-500/20 bg-amber-500/10 text-sm">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="flex-1 text-amber-700 dark:text-amber-400">This project has no GitHub repo yet. Code is only kept on GitHub, so make a repo and push your work.</span>
              <button
                onClick={() => {
                  setAiOpen(true);
                  setTimeout(() => window.dispatchEvent(new CustomEvent("agent:ask", { detail: { text: "Create a GitHub repo for this project and push the code to it." } })), 400);
                }}
                className="shrink-0 h-8 px-3 rounded-full border border-border bg-background text-sm text-foreground hover:bg-secondary"
              >
                Ask Agent to create repo
              </button>
            </div>
          )}
          {folder && (
            <iframe key={folder} src={`https://ide.classgrid.in/?folder=${encodeURIComponent(folder)}`} onLoad={editorLoaded} title="Code editor" className="flex-1 w-full border-0 [color-scheme:light] dark:[color-scheme:dark]" allow="clipboard-read; clipboard-write" />
          )}
          {progress && (
            <div className="absolute inset-0 isolate overflow-hidden flex items-center justify-center !bg-[#fafafa] dark:!bg-[#000000]">
              <LoadingSmoke />
              <Progress value={Math.round(progress.value)} className="w-[min(360px,80%)]">
                <ProgressLabel>{progress.label}</ProgressLabel>
                <ProgressValue />
              </Progress>
            </div>
          )}
        </div>
      ) : !isSuperAdmin ? (
        <div className="flex-1" />
      ) : githubConnected === false ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 flex flex-col gap-4 text-center">
            <Github className="size-8 mx-auto" />
            <h1 className="text-xl font-semibold">{githubExpired ? "Reconnect GitHub" : "Connect GitHub to use Project Mode"}</h1>
            <p className="text-sm text-muted-foreground">Project Mode needs your GitHub account. Your code is only kept on GitHub, never on our servers.</p>
            <button onClick={() => setHubOpen(true)} className="flex items-center justify-center gap-2 bg-foreground text-background px-4 py-2 rounded-full font-medium text-sm hover:opacity-90">
              <Github className="size-4" /> {githubExpired ? "Reconnect GitHub" : "Connect GitHub"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Projects</h1>
                <p className="text-muted-foreground text-sm">Your code stays on GitHub. Opening a project downloads it fresh.</p>
                {githubAccount && (
                  <div className="flex items-center gap-2.5 mt-4">
                    {githubAccount.avatar
                      ? <img src={githubAccount.avatar} alt="" className="size-8 rounded-full border border-border" />
                      : <div className="size-8 rounded-full border border-border flex items-center justify-center"><Github className="size-4" /></div>}
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

            {projects === null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-4 flex flex-col gap-2 min-h-[140px]">
                    <div className="flex items-center gap-2"><Skeleton className="size-5 rounded" /><Skeleton className="h-4 w-32" /></div>
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="mt-auto h-8 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(newName !== null || projects.length === 0) && (
                  <div className="rounded-xl border border-dashed border-border p-4 flex flex-col gap-3 min-h-[140px]">
                    {newName === null ? (
                      <button onClick={() => setNewName("")} className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <Plus className="size-6" /> Create project
                      </button>
                    ) : (
                      <>
                        <span className="text-sm font-medium">New project</span>
                        <input
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") setNewName(null); }}
                          placeholder="Project name"
                          maxLength={80}
                          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <div className="flex justify-end gap-2 mt-auto">
                          <button onClick={() => setNewName(null)} className="px-3 py-1.5 rounded-full text-sm hover:bg-secondary">Cancel</button>
                          <button onClick={create} disabled={!newName.trim()} className="px-3 py-1.5 rounded-full text-sm bg-foreground text-background disabled:opacity-50">Create</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {projects.map((p) => (
                  <div key={p.id} className="group rounded-xl border border-border bg-background p-4 flex flex-col gap-2 min-h-[140px] hover:bg-secondary/60 transition-colors">
                    {renaming?.id === p.id ? (
                      <input
                        autoFocus
                        value={renaming.name}
                        onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setRenaming(null); }}
                        onBlur={rename}
                        maxLength={80}
                        className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <div className="flex items-start gap-2">
                        <FolderGit2 className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        <span className="font-medium truncate flex-1">{p.name}</span>
                        <button onClick={() => setRenaming({ id: p.id, name: p.name })} title="Rename" className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary"><Pencil className="size-3.5" /></button>
                        <button onClick={() => setDeleting(p)} title="Delete" className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary"><Trash2 className="size-3.5" /></button>
                      </div>
                    )}
                    {p.repo
                      ? <span className="text-xs text-muted-foreground truncate">{p.repo}</span>
                      : <span className="text-xs text-muted-foreground">No GitHub repo yet · <button onClick={() => { setLinking(p); loadRepos(); }} className="underline hover:text-foreground">Link one</button></span>}
                    {p.createdAt && <span className="text-xs text-muted-foreground">Created {new Date(p.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    {p.updatedAt && <span className="text-xs text-muted-foreground">Last edited {new Date(p.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(p.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>}
                    <span className="text-xs text-muted-foreground">{p.lastOpenedAt ? `Opened ${new Date(p.lastOpenedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : "Never opened"}</span>
                    <button
                      onClick={() => { if (p.repo) open(p); else { setLinking(p); loadRepos(); } }}
                      disabled={busyId === p.id}
                      className="mt-auto self-start flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-sm hover:bg-secondary disabled:opacity-50"
                    >
                      {busyId === p.id ? <Spinner className="size-4" /> : p.repo ? <Github className="size-4" /> : <FolderGit2 className="size-4" />}
                      {busyId === p.id ? (p.repo ? "Downloading…" : "Opening…") : "Open"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                <Github className="size-4" /> {githubExpired ? "Reconnect GitHub" : "Connect GitHub"}
              </button>
            ) : repos === null ? (
              <div className="flex justify-center py-6"><Spinner className="size-5 text-muted-foreground" /></div>
            ) : repos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repos found on your GitHub account.</p>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto -mx-2">
                {repos.map((r) => (
                  <button key={r.fullName} onClick={() => linkRepo(r.fullName)} className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm hover:bg-secondary">
                    <Github className="size-4 shrink-0 text-muted-foreground" />
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

      <AskAiPanel open={aiOpen} onOpenChange={setAiOpen} variant="overlay" hideClearChat />
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
                  <span className="ml-2 text-green-600 dark:text-green-500">+{review.files.reduce((n, f) => n + f.added, 0)}</span>
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
                      <span className="shrink-0 text-xs text-green-600 dark:text-green-500">+{f.added}</span>
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
