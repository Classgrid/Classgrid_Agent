// Studio Mode's Project tab: everything about the open project in one place (the same project as Project Mode):
// its name and logo, GitHub (repo, working branch, open pull request), Vercel, the last commit and the history.
import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, FolderGit2, GitBranch, GitCommitHorizontal, GitPullRequest, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const EASE = [0.22, 1, 0.36, 1] as const;

type Project = { id: string; name: string; repo: string | null; logo?: string | null; updatedAt?: string };
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

  useEffect(() => { setProject(null); setInfo(null); setHistory(null); load(); }, [load]);
  useEffect(() => { if (reloadKey) load(); }, [reloadKey, load]);

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm text-center flex flex-col items-center gap-2">
          <div className="flex items-center justify-center size-12 rounded-full border border-border"><FolderGit2 className="size-5 text-muted-foreground" /></div>
          <p className="text-base font-medium">No project picked</p>
          <p className="text-sm text-muted-foreground">Pick a project above the chat input on a new chat to see its details here.</p>
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
        <motion.div {...rise(0)} className="flex items-center gap-3">
          {project?.logo
            ? <img src={project.logo} alt="" className="size-11 shrink-0 rounded-lg border border-black/10 dark:border-white/[0.08] object-cover" />
            : <span className="size-11 shrink-0 rounded-lg border border-black/10 dark:border-white/[0.08] flex items-center justify-center"><FolderGit2 className="size-5 text-muted-foreground" /></span>}
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium truncate">{project?.name || (loading ? "Loading…" : "Project")}</p>
            <p className="text-[12px] text-muted-foreground">Shared with Project Mode{project?.updatedAt ? ` · edited ${ago(project.updatedAt)}` : ""}</p>
          </div>
          <Link to={window.location.pathname.startsWith("/superadmin") ? "/superadmin/project" : "/c/project"} className="shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-black/10 dark:border-white/10 text-[12px] text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors">
            Open in Project Mode
          </Link>
          <button onClick={load} className="shrink-0 flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors" title="Refresh" aria-label="Refresh">
            <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        {/* GitHub */}
        <motion.div {...rise(1)} className={`${card} p-3`}>
          <div className="flex items-center gap-2">
            <img src={GITHUB_ICON} alt="" aria-hidden className="size-4 dark:invert" />
            <span className="text-[13px] font-medium">GitHub</span>
            <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded ${project?.repo && !githubMissing ? "text-[#16825d] dark:text-[#4ec9b0] bg-[#16825d]/10" : "text-muted-foreground bg-black/[0.04] dark:bg-white/[0.05]"}`}>
              {githubMissing ? "Not connected" : project?.repo ? "Connected" : "No repo"}
            </span>
          </div>
          {githubMissing ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[12px] text-muted-foreground">GitHub is not connected. Set it up in Project Mode first.</p>
              <Link to={window.location.pathname.startsWith("/superadmin") ? "/superadmin/project" : "/c/project"} className="shrink-0 h-7 px-2.5 inline-flex items-center rounded-md bg-foreground text-background text-[12px] font-medium hover:opacity-90">Go to Project Mode</Link>
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
            <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded ${info?.vercel ? "text-[#16825d] dark:text-[#4ec9b0] bg-[#16825d]/10" : "text-muted-foreground bg-black/[0.04] dark:bg-white/[0.05]"}`}>
              {info?.vercel ? "Connected" : "Not connected"}
            </span>
          </div>
          {info?.vercel ? (
            <div className="mt-2 flex flex-col gap-1.5 text-[12px] text-foreground/80">
              <a href={info.vercel.appUrl} target="_blank" rel="noreferrer" className={linkCls}><span className="truncate">{info.vercel.domain}</span><ExternalLink className="size-3 shrink-0 opacity-60" /></a>
              <a href={info.vercel.dashboardUrl} target="_blank" rel="noreferrer" className={`${linkCls} text-muted-foreground`}><span className="truncate">Vercel project: {info.vercel.name}</span></a>
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-muted-foreground">{project?.repo ? "No Vercel project uses this repo yet, or Vercel is not connected." : "Link a GitHub repo first."}</p>
          )}
        </motion.div>

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
    </div>
  );
}
