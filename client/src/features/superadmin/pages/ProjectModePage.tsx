import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, FolderGit2, Github, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AskAiPanel } from "@/components/ai";
import { AiHubModal } from "@/components/ai/components/AiHubModal";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const OPEN_PROJECT_KEY = "cg_project_open"; // which project this browser had open (per-viewer convenience)

type Project = { id: string; name: string; repo: string | null; lastOpenedAt: string | null; updatedAt: string };

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
  const [hubOpen, setHubOpen] = useState(false);

  const openProject = projects?.find((p) => p.id === openId) || null;
  const rememberOpen = (id: string | null) => {
    setOpenId(id);
    try { id ? localStorage.setItem(OPEN_PROJECT_KEY, id) : localStorage.removeItem(OPEN_PROJECT_KEY); } catch { /* storage blocked */ }
  };

  const loadProjects = useCallback(async () => {
    const { res, data } = await api("/projects");
    if (res.ok) setProjects(data.projects || []);
    else setProjects([]);
  }, []);
  useEffect(() => { if (isSuperAdmin) loadProjects(); }, [isSuperAdmin, loadProjects]);

  const loadRepos = useCallback(async () => {
    const { res, data } = await api("/github/repos");
    if (res.status === 409) { setGithubConnected(false); setRepos(null); return; }
    setGithubConnected(res.ok);
    setRepos(res.ok ? data.repos || [] : []);
  }, []);

  // Open = download the project's code fresh from GitHub, then show it in the editor
  const open = async (project: Project, replace = false) => {
    if (!project.repo) { setLinking(project); loadRepos(); return; }
    setBusyId(project.id);
    try {
      const { res, data } = await api(`/projects/${project.id}/open`, { method: "POST", body: JSON.stringify({ replace }) });
      if (res.status === 409 && data.error === "unsaved_changes") {
        if (window.confirm("This project has changes that are not pushed to GitHub. Download a fresh copy and lose them?")) return open(project, true);
        setFolder(`/home/workspace/chats/projects/${project.id}`);
        rememberOpen(project.id);
        return;
      }
      if (res.status === 409) { setGithubConnected(false); setLinking(project); return; }
      if (!res.ok) throw new Error(data.error || "Could not open this project");
      setFolder(data.folder);
      rememberOpen(project.id);
    } catch (e: any) {
      toast.error(e?.message || "Could not open this project");
    } finally {
      setBusyId(null);
    }
  };

  // Coming back to the page with a project open: download it fresh again
  useEffect(() => {
    if (openProject && !folder && busyId !== openProject.id) open(openProject);
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
    setLinking(data.project);
    loadRepos();
  };

  const rename = async () => {
    if (!renaming) return;
    const { res, data } = await api(`/projects/${renaming.id}`, { method: "PATCH", body: JSON.stringify({ name: renaming.name }) });
    if (!res.ok) return toast.error(data.error || "Could not rename the project");
    setProjects((list) => (list || []).map((p) => (p.id === renaming.id ? data.project : p)));
    setRenaming(null);
  };

  const remove = async (project: Project) => {
    if (!window.confirm(`Delete "${project.name}"? Its code stays on GitHub.`)) return;
    const { res } = await api(`/projects/${project.id}`, { method: "DELETE" });
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
    open(data.project);
  };

  const showEditor = isSuperAdmin && openProject && folder;

  return (
    <div className="h-full flex flex-col !bg-[#fafafa] dark:!bg-[#000000] text-foreground sm:pr-[400px]">
      <div className="shrink-0 flex items-center gap-3 h-8 box-content py-4 pl-16 pr-4 border-b border-border">{/* same height as the AI panel header, so both lines meet */}
        {showEditor ? (
          <>
            <button onClick={() => { rememberOpen(null); setFolder(null); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Projects
            </button>
            <span className="text-sm font-medium truncate">{openProject.name}</span>
            {openProject.repo && <span className="text-xs text-muted-foreground truncate">{openProject.repo}</span>}
          </>
        ) : (
          <span className="text-sm font-medium">Project Mode</span>
        )}
      </div>

      {showEditor ? (
        <iframe key={folder} src={`https://ide.classgrid.in/?folder=${encodeURIComponent(folder)}`} title="Code editor" className="flex-1 w-full border-0 [color-scheme:light] dark:[color-scheme:dark]" allow="clipboard-read; clipboard-write" />
      ) : !isSuperAdmin ? (
        <div className="flex-1" />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Projects</h1>
                <p className="text-muted-foreground text-sm">Your code stays on GitHub. Opening a project downloads it fresh.</p>
              </div>
              {projects && projects.length > 0 && newName === null && (
                <button onClick={() => setNewName("")} className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-full font-medium text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
                  <Plus className="size-4" /> New project
                </button>
              )}
            </div>

            {projects === null ? (
              <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
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
                        <button onClick={() => remove(p)} title="Delete" className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary"><Trash2 className="size-3.5" /></button>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground truncate">{p.repo || "No GitHub repo yet"}</span>
                    <span className="text-xs text-muted-foreground">{p.lastOpenedAt ? `Opened ${new Date(p.lastOpenedAt).toLocaleDateString()}` : "Never opened"}</span>
                    <button
                      onClick={() => open(p)}
                      disabled={busyId === p.id}
                      className="mt-auto self-start flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-sm hover:bg-secondary disabled:opacity-50"
                    >
                      {busyId === p.id ? <Loader2 className="size-4 animate-spin" /> : p.repo ? <Github className="size-4" /> : <Plus className="size-4" />}
                      {busyId === p.id ? "Downloading…" : p.repo ? "Open" : "Link GitHub repo"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {linking && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4" onClick={() => setLinking(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-semibold">Link a GitHub repo</h2>
              <p className="text-sm text-muted-foreground">For "{linking.name}". Its code is downloaded each time you open the project.</p>
            </div>
            {githubConnected === false ? (
              <button onClick={() => setHubOpen(true)} className="flex items-center justify-center gap-2 bg-foreground text-background px-4 py-2 rounded-full font-medium text-sm hover:opacity-90">
                <Github className="size-4" /> Connect GitHub
              </button>
            ) : repos === null ? (
              <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
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
            <button onClick={() => setLinking(null)} className="self-end px-3 py-1.5 rounded-full text-sm hover:bg-secondary">Later</button>
          </div>
        </div>
      )}

      <AskAiPanel open onOpenChange={() => {}} variant="overlay" />
      <AiHubModal isOpen={hubOpen} onClose={() => { setHubOpen(false); loadRepos(); }} />
    </div>
  );
}
