// Studio Mode's Project tab: everything about the open project in one place (the same project as Project Mode):
// its name and logo, GitHub (repo, working branch, open pull request), Vercel, the last commit and the history.
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, ArrowUpFromLine, Check, ExternalLink, FolderGit2, GitBranch, GitCommitHorizontal, GitPullRequest, ImagePlus, Pencil, RotateCw, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchWithRescue } from "@/lib/rescue";
import { apiClient } from "@/lib/apiClient";
import { ImageCropperModal } from "@/components/marketing_ui/ImageCropperModal";
import { StudioProjectChooser } from "./StudioProjectPicker";
import { MasteroDialog, PushDialog, useFolderOnline } from "./StudioMastero";
import { MasteroOnlineCard } from "./MasteroOnlineCard";
import { onDesktop, thisComputerCopy, type LocalCopy } from "../utils/projectCopies";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const EASE = [0.22, 1, 0.36, 1] as const;

type Project = { id: string; name: string; repo: string | null; logo?: string | null; updatedAt?: string; location?: "cloud" | "local"; localPath?: string | null; localCopies?: LocalCopy[]; mastero?: boolean };
type Info = { repoUrl: string | null; branch: string | null; commit: { message: string; date: string | null; sha: string; url: string | null } | null; vercel: { name: string; dashboardUrl: string; appUrl: string; domain: string } | null };
type Commit = { sha: string; message: string; author: string | null; avatar: string | null; date: string | null; url: string | null };
type History = { branch: string | null; pr: { number: number; title: string; url: string } | null; commits: Commit[] };

async function api(path: string) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide${path}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function ago(at?: string | null) {
  if (!at) return "";
  const secs = Math.max(1, Math.round((Date.now() - new Date(at).getTime()) / 1000));
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 86400 * 30) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

const GITHUB_ICON = "https://cdn.classgrid.in/classgrid_intgration/github-icon.svg";
const VERCEL_ICON = "https://cdn.classgrid.in/classgrid_intgration/vercel-icon-svgrepo-com.svg";

export function StudioProjectView({ projectId, reloadKey = 0 }: { projectId: string | null; reloadKey?: number }) {
  const reduce = useReducedMotion();
  const [project, setProject] = useState<Project | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [githubMissing, setGithubMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  // Desktop app: Mastero (a folder project onto a new GitHub repo) and Push (this computer's changes to its repo)
  const [gitDialog, setGitDialog] = useState<"mastero" | "push" | null>(null);
  // Desktop app: what the project's folder already has online (its GitHub repo, its Vercel project), read on this computer
  const folderHere = project ? (project.location === "local" ? project.localPath : thisComputerCopy(project)?.path) : null;
  const folderOnline = useFolderOnline(onDesktop() ? folderHere : null);
  const folderRepo = !project?.repo ? folderOnline?.repo || null : null; // on GitHub, not linked yet
  // Rename the project here (the new name shows in Project Mode and Studio)
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);
  const saveName = async () => {
    const name = (renaming || "").trim();
    if (!projectId || !project || renameBusy) return;
    if (!name || name === project.name) { setRenaming(null); return; }
    setRenameBusy(true);
    try {
      const res = await fetchWithRescue(`${backendUrl}/api/ide/projects/${projectId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const saved = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(saved.error || "Could not rename the project"); return; }
      setProject(saved.project);
      setRenaming(null);
      window.dispatchEvent(new Event("studio:projects-changed"));
      toast.success("Renamed");
    } finally {
      setRenameBusy(false);
    }
  };
  // Project logo: pick a picture, crop it (same crop tool as Project Mode), it is saved to R2
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
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
    if (!projectId) return;
    setLogoBusy(true);
    try {
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const { data } = await apiClient.post("/api/user/upload-url", { fileName: `project-logo-${Date.now()}.${ext}`, fileType: blob.type });
      const put = await fetch(data.uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": blob.type } });
      if (!put.ok) throw new Error("upload failed");
      const res = await fetchWithRescue(`${backendUrl}/api/ide/projects/${projectId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: data.publicUrl }),
      });
      const saved = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(saved.error || "Could not save the logo");
      setProject(saved.project);
      window.dispatchEvent(new Event("studio:projects-changed")); // the left list and the pickers show the new logo at once
      toast.success("Logo updated");
    } catch (err: any) {
      toast.error(err?.message && err.message !== "upload failed" ? err.message : "Could not upload the logo");
      throw err; // the crop window shows it failed
    } finally {
      setLogoBusy(false);
    }
  };

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await api("/projects");
      const p = (list.data.projects || []).find((x: Project) => x.id === projectId) || null;
      setProject(p);
      if (!p?.repo) { setInfo(null); setHistory(null); return; }
      const [gi, hi] = await Promise.all([api(`/projects/${projectId}/github`), api(`/projects/${projectId}/commits`)]);
      const missing = gi.data.error === "github_not_connected" || gi.data.error === "github_expired" || hi.data.error === "github_not_connected";
      setGithubMissing(missing);
      setInfo(gi.res.ok ? gi.data : null);
      setHistory(hi.res.ok ? hi.data : null);
      if (!missing && (!gi.res.ok || !hi.res.ok)) setError(hi.data.error || gi.data.error || "Could not load the project's details");
    } catch {
      setError("Could not load the project's details");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { setProject(null); setInfo(null); setHistory(null); setRenaming(null); load(); }, [load]);
  useEffect(() => { if (reloadKey) load(); }, [reloadKey, load]);

  if (!projectId) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-md flex flex-col gap-4">
          <div className="text-center flex flex-col items-center gap-2">
            <div className="flex items-center justify-center size-12 rounded-full border border-border"><FolderGit2 className="size-5 text-muted-foreground" /></div>
            <p className="text-base font-medium">No project picked</p>
            <p className="text-sm text-muted-foreground">Pick a project or make a new one, with or without a GitHub repo.</p>
          </div>
          <StudioProjectChooser picked={null} />
        </div>
      </div>
    );
  }

  const card = "rounded-lg border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1e1e1e]";
  const label = "text-[11px] uppercase tracking-wide text-muted-foreground";
  const linkCls = "inline-flex items-center gap-1 min-w-0 hover:text-foreground hover:underline underline-offset-2";
  const rise = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.24, ease: EASE, delay: reduce ? 0 : i * 0.04 },
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-4 py-4 flex flex-col gap-3">
        {/* Name and logo */}
        <motion.div {...rise(0)} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={logoBusy || !project}
            className="group relative size-11 shrink-0 rounded-lg border border-black/10 dark:border-white/[0.08] overflow-hidden flex items-center justify-center"
            title={project?.logo ? "Change logo" : "Add a logo"}
            aria-label={project?.logo ? "Change logo" : "Add a logo"}
          >
            {project?.logo
              ? <img src={project.logo} alt="" className="size-full object-cover" />
              : <FolderGit2 className="size-5 text-muted-foreground" />}
            <span className={`absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity ${logoBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              {logoBusy ? <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <ImagePlus className="size-4" />}
            </span>
          </button>
          <div className="min-w-[10rem] flex-1">
            {renaming !== null ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  data-no-ring
                  value={renaming}
                  onChange={(e) => setRenaming(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setRenaming(null); }}
                  maxLength={80}
                  disabled={renameBusy}
                  className="min-w-0 flex-1 h-7 px-2 rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616] text-[14px] font-medium outline-none focus:border-black/30 dark:focus:border-white/25"
                />
                <button onClick={saveName} disabled={renameBusy} className="shrink-0 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]" title="Save name" aria-label="Save name">
                  {renameBusy ? <span className="size-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" /> : <Check className="size-3.5" />}
                </button>
                <button onClick={() => setRenaming(null)} disabled={renameBusy} className="shrink-0 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]" title="Cancel" aria-label="Cancel">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="group/name flex items-center gap-1 min-w-0">
                <p className="text-[15px] font-medium truncate">{project?.name || (loading ? "Loading…" : "Project")}</p>
                {project && (
                  <button onClick={() => setRenaming(project.name)} className="shrink-0 flex items-center justify-center size-6 rounded-md text-muted-foreground opacity-0 group-hover/name:opacity-100 focus-visible:opacity-100 hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-opacity" title="Rename project" aria-label="Rename project">
                    <Pencil className="size-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-[12px] text-muted-foreground">Shared with Project Mode{project?.updatedAt ? ` · edited ${ago(project.updatedAt)}` : ""}</p>
          </div>
          {/* (a narrow pane puts the buttons on their own line under the name) */}
          <div className="ml-auto flex items-center gap-2">
            {onDesktop() && project && !project.mastero && (project.location === "local" || thisComputerCopy(project)?.here) && (
              <button onClick={() => setGitDialog("mastero")} className="shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md bg-foreground text-background text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer" title="Make a GitHub repo for this project and push your code to it">
                <img src={GITHUB_ICON} alt="" aria-hidden className="size-3.5 invert dark:invert-0" /> Mastero
              </button>
            )}
            {onDesktop() && project?.repo && project.mastero && (project.location === "local" || thisComputerCopy(project)?.here) && (
              <button onClick={() => setGitDialog("push")} className="shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md bg-foreground text-background text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer" title="Push this computer's changes to GitHub">
                <ArrowUpFromLine className="size-3.5" /> Push
              </button>
            )}
            <button onClick={() => setSwitching((s) => !s)} className={`shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-black/10 dark:border-white/10 text-[12px] hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors ${switching ? "text-foreground bg-black/[0.04] dark:bg-white/[0.05]" : "text-muted-foreground"}`}>
              <ArrowLeftRight className="size-3.5" /> Switch
            </button>
            <Link to={window.location.pathname.startsWith("/superadmin") ? "/superadmin/project" : "/c/project"} className="shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-black/10 dark:border-white/10 text-[12px] text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors">
              Open in Project Mode
            </Link>
            <button onClick={load} className="shrink-0 flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors" title="Refresh" aria-label="Refresh">
              <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </motion.div>

        {project && <MasteroDialog project={project} already={folderOnline} open={gitDialog === "mastero"} onClose={() => setGitDialog(null)} onDone={(p) => { setProject(p); load(); }} />}
        {project && <PushDialog project={project} open={gitDialog === "push"} onClose={() => setGitDialog(null)} onDone={load} />}

        {/* Switch to another project, or make a new one */}
        {switching && (
          <motion.div {...rise(0)}>
            <StudioProjectChooser picked={projectId} onDone={() => setSwitching(false)} />
          </motion.div>
        )}

        {/* GitHub */}
        <motion.div {...rise(1)} className={`${card} p-3`}>
          <div className="flex items-center gap-2">
            <img src={GITHUB_ICON} alt="" aria-hidden className="size-4 dark:invert" />
            <span className="text-[13px] font-medium">GitHub</span>
            <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded ${(project?.repo || folderRepo) && !githubMissing ? "text-[#16825d] dark:text-[#4ec9b0] bg-[#16825d]/10" : "text-muted-foreground bg-black/[0.04] dark:bg-white/[0.05]"}`}>
              {githubMissing ? "Not connected" : project?.repo ? "Connected" : folderRepo ? "On GitHub" : "No repo"}
            </span>
          </div>
          {githubMissing ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[12px] text-muted-foreground">GitHub is not connected. Set it up in Project Mode first.</p>
              <Link to={window.location.pathname.startsWith("/superadmin") ? "/superadmin/project" : "/c/project"} className="shrink-0 h-7 px-2.5 inline-flex items-center rounded-md bg-foreground text-background text-[12px] font-medium hover:opacity-90">Go to Project Mode</Link>
            </div>
          ) : !project?.repo && folderRepo ? (
            <div className="mt-2 flex flex-col gap-1.5 text-[12px] text-foreground/80">
              <a href={`https://github.com/${folderRepo}`} target="_blank" rel="noreferrer" className={linkCls}>
                <span className="truncate">{folderRepo}</span><ExternalLink className="size-3 shrink-0 opacity-60" />
              </a>
              <span className="text-muted-foreground">This folder is on GitHub already. Mastero keeps this repo, so nothing is made twice.</span>
            </div>
          ) : !project?.repo ? (
            <p className="mt-2 text-[12px] text-muted-foreground">No repo linked. Link one from the project picker (🔗 on the project), or ask the agent to make a repo.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5 text-[12px] text-foreground/80">
              <a href={info?.repoUrl || `https://github.com/${project.repo}`} target="_blank" rel="noreferrer" className={linkCls}>
                <span className="truncate">{project.repo}</span><ExternalLink className="size-3 shrink-0 opacity-60" />
              </a>
              {history?.branch && (
                <span className="flex items-center gap-1.5 text-muted-foreground"><GitBranch className="size-3.5" /> Agent works on <span className="text-foreground/80">{history.branch}</span></span>
              )}
              {history?.pr && (
                <a href={history.pr.url} target="_blank" rel="noreferrer" className={`${linkCls} text-muted-foreground`}>
                  <GitPullRequest className="size-3.5 shrink-0" /> <span className="truncate">Open pull request #{history.pr.number}: {history.pr.title}</span>
                </a>
              )}
            </div>
          )}
        </motion.div>

        {/* Vercel */}
        <motion.div {...rise(2)} className={`${card} p-3`}>
          <div className="flex items-center gap-2">
            <img src={VERCEL_ICON} alt="" aria-hidden className="size-4 dark:invert" />
            <span className="text-[13px] font-medium">Vercel</span>
            <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded ${info?.vercel || folderOnline?.vercel ? "text-[#16825d] dark:text-[#4ec9b0] bg-[#16825d]/10" : "text-muted-foreground bg-black/[0.04] dark:bg-white/[0.05]"}`}>
              {info?.vercel ? "Connected" : folderOnline?.vercel ? "Deployed" : "Not connected"}
            </span>
          </div>
          {info?.vercel ? (
            <div className="mt-2 flex flex-col gap-1.5 text-[12px] text-foreground/80">
              <a href={info.vercel.appUrl} target="_blank" rel="noreferrer" className={linkCls}><span className="truncate">{info.vercel.domain}</span><ExternalLink className="size-3 shrink-0 opacity-60" /></a>
              <a href={info.vercel.dashboardUrl} target="_blank" rel="noreferrer" className={`${linkCls} text-muted-foreground`}><span className="truncate">Vercel project: {info.vercel.name}</span></a>
            </div>
          ) : folderOnline?.vercel ? (
            <div className="mt-2 flex flex-col gap-1.5 text-[12px] text-foreground/80">
              <span className="truncate">Vercel project: {folderOnline.vercel}</span>
              <span className="text-muted-foreground">This folder was deployed with Vercel. Connect Vercel in AI Hub to see its live link here.</span>
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-muted-foreground">{project?.repo || folderRepo ? "No Vercel project uses this repo yet, or Vercel is not connected." : "Link a GitHub repo first."}</p>
          )}
        </motion.div>

        {/* Mastero project, desktop app: the open chat's link and QR code for chat.classgrid.in (online only when the user takes it there) */}
        {onDesktop() && project?.mastero && (
          <motion.div {...rise(3)}>
            <MasteroOnlineCard className={card} />
          </motion.div>
        )}

        {/* Last commit */}
        {info?.commit && (
          <motion.div {...rise(3)} className={`${card} p-3`}>
            <p className={label}>Last commit{info.branch ? ` on ${info.branch}` : ""}</p>
            <div className="mt-1.5 flex items-start gap-2 text-[13px]">
              <GitCommitHorizontal className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{info.commit.message}</p>
                <p className="text-[12px] text-muted-foreground">
                  {info.commit.url ? <a href={info.commit.url} target="_blank" rel="noreferrer" className="font-mono hover:text-foreground">{info.commit.sha}</a> : <span className="font-mono">{info.commit.sha}</span>}
                  {info.commit.date ? ` · ${ago(info.commit.date)}` : ""}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* History */}
        {project?.repo && !githubMissing && (
          <motion.div {...rise(4)} className={card}>
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <p className={label}>History{history?.branch ? ` · ${history.branch}` : ""}</p>
            </div>
            {error ? (
              <p className="px-3 pb-3 text-[12px] text-muted-foreground">{error}</p>
            ) : !history ? (
              <div className="px-3 pb-3 flex flex-col gap-2">
                {[80, 60, 70, 50].map((w, i) => <div key={i} className="h-4 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />)}
              </div>
            ) : !history.commits.length ? (
              <p className="px-3 pb-3 text-[12px] text-muted-foreground">No commits yet.</p>
            ) : (
              <div className="pb-1.5">
                {history.commits.map((c, i) => (
                  <motion.a
                    key={c.sha + i}
                    href={c.url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    initial={reduce ? false : { opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: reduce ? 0 : 0.18, ease: EASE, delay: reduce ? 0 : Math.min(i, 12) * 0.02 }}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    {c.avatar
                      ? <img src={c.avatar} alt="" className="size-5 shrink-0 rounded-full" />
                      : <span className="size-5 shrink-0 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px]">{c.message}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{c.author || "Unknown"} · {ago(c.date)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{c.sha}</span>
                  </motion.a>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoFile} />
      <ImageCropperModal
        isOpen={!!cropSrc}
        onClose={() => setCropSrc(null)}
        imageSrc={cropSrc || ""}
        aspectRatio={1}
        title="Crop project logo"
        onCropComplete={saveLogo}
      />
    </div>
  );
}
