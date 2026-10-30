// Studio Mode's project picker above the chat input. The projects are the same ones as Project Mode, so a project
// made in either mode shows in both. A new project can start with a GitHub repo or without one.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Folder, FolderPlus, FolderX, Link2, Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/marketing_ui/dialog";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const PICK_KEY = "cg_project_open"; // the same open project as Project Mode: both views always show one project
const EASE = [0.22, 1, 0.36, 1] as const;

type Project = { id: string; name: string; repo: string | null; logo?: string | null; updatedAt: string };
type Repo = { fullName: string; private: boolean };

async function api(path: string, init?: RequestInit) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const LIST_KEY = "cg_studio_projects";

function readPick(): string | null {
  try { return sessionStorage.getItem(PICK_KEY) || localStorage.getItem(PICK_KEY); } catch { return null; }
}

// The last project list, shown at once while a fresh one loads (the server sorts it by the newest file edit, which is slow)
function readList(): Project[] | null {
  try {
    const list = JSON.parse(localStorage.getItem(LIST_KEY) || "null");
    return Array.isArray(list) ? list : null;
  } catch { return null; }
}

export function StudioProjectPicker() {
  const [projects, setProjects] = useState<Project[] | null>(readList);
  const [picked, setPicked] = useState<string | null>(readPick);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  // Same project actions as Project Mode's Projects page
  const [linking, setLinking] = useState<Project | null>(null);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const removeProject = async (p: Project) => {
    if (!window.confirm(`Delete the project "${p.name}"? Its code on Classgrid is removed (anything not pushed is lost). The GitHub repo is not touched.`)) return;
    const { res, data } = await api(`/projects/${p.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error(data.error || "Could not delete the project"); return; }
    setProjects((list) => (list || []).filter((x) => x.id !== p.id));
    if (picked === p.id) pick(null);
    toast.success(`Deleted ${p.name}`);
  };
  const replaceProject = (p: Project) => setProjects((list) => (list || []).map((x) => (x.id === p.id ? p : x)));
  const [place, setPlace] = useState<{ up: boolean; maxH: number }>({ up: false, maxH: 360 });
  const boxRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const load = useCallback(async () => {
    try {
      const { res, data } = await api("/projects");
      if (!res.ok) { setProjects((list) => list || []); return; }
      const list: Project[] = data.projects || [];
      setProjects(list);
      try { localStorage.setItem(LIST_KEY, JSON.stringify(list.map(({ id, name, repo, logo, updatedAt }) => ({ id, name, repo, logo, updatedAt })))); } catch { /* storage blocked */ }
    } catch {
      setProjects((list) => list || []);
    }
  }, []);

  // Two pickers (the new-chat screen and an open chat) stay the same: a pick in one shows in the other
  useEffect(() => {
    const onChange = (e: Event) => setPicked((e as CustomEvent<{ projectId: string | null }>).detail?.projectId ?? null);
    window.addEventListener("studio:project-changed", onChange);
    return () => window.removeEventListener("studio:project-changed", onChange);
  }, []);
  useEffect(() => { load(); }, [load]);
  // Opening the list loads the projects again, so a repo linked in Project Mode shows here at once
  useEffect(() => { if (open) load(); }, [open, load]);

  const pick = (id: string | null, made?: Project) => {
    if (made) setProjects((list) => [made, ...(list || []).filter((p) => p.id !== made.id)]);
    setPicked(id);
    try { id ? localStorage.setItem(PICK_KEY, id) : localStorage.removeItem(PICK_KEY); } catch { /* storage blocked */ }
    try { id ? sessionStorage.setItem(PICK_KEY, id) : sessionStorage.removeItem(PICK_KEY); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event("agent:refresh-sessions")); // the left list shows this project's chats
    window.dispatchEvent(new CustomEvent("studio:project-changed", { detail: { projectId: id } }));
    setOpen(false);
    setQ("");
  };

  // Close the list on a click outside it or on Escape
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
  }, [open]);

  const current = projects?.find((p) => p.id === picked) || null;
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (projects || []).filter((p) => !t || p.name.toLowerCase().includes(t) || (p.repo || "").toLowerCase().includes(t));
  }, [projects, q]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => {
          // The list fits the screen: it opens where there is more room and shrinks to that space, so it is never cut off
          const r = boxRef.current?.getBoundingClientRect();
          if (r) {
            const below = window.innerHeight - r.bottom - 12;
            const above = r.top - 12;
            const up = below < 300 && above > below;
            setPlace({ up, maxH: Math.max(160, Math.min(up ? above : below, 420)) });
          }
          setOpen((o) => !o);
        }}
        className="flex items-center gap-1.5 h-7 px-1.5 -ml-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        {current ? <Folder className="size-[15px]" /> : <FolderX className="size-[15px]" />}
        <span className="max-w-[14rem] truncate">{current ? current.name : "No project"}</span>
        {current && (
          <>
            <span className="text-muted-foreground/50">·</span>
            {current.repo ? (
              <span className="flex items-center gap-1 min-w-0">
                <img src="https://cdn.classgrid.in/classgrid_intgration/github-icon.svg" alt="" aria-hidden className="size-3.5 shrink-0 opacity-70 dark:invert" />
                <span className="max-w-[16rem] truncate">{current.repo}</span>
              </span>
            ) : (
              <span className="text-muted-foreground/70">No repo</span>
            )}
          </>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.2, ease: EASE }} className="flex">
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>

      <AnimatePresence>
      {open && (
        <motion.div
          key="list"
          initial={reduce ? false : { opacity: 0, y: place.up ? 6 : -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: place.up ? 4 : -4, scale: 0.98 }}
          transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
          style={{ maxHeight: place.maxH, transformOrigin: place.up ? "bottom left" : "top left" }}
          className={`absolute left-0 ${place.up ? "bottom-full mb-1.5" : "top-full mt-1.5"} flex flex-col z-50 w-[15.5rem] max-w-[calc(100vw-2rem)] rounded-lg border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1e1e1e] text-foreground shadow-2xl overflow-hidden`}
        >
          <label className="shrink-0 flex items-center gap-2 h-9 px-3 border-b border-black/10 dark:border-white/[0.08]">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              data-no-ring
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects"
              className="flex-1 min-w-0 bg-transparent border-0 p-0 text-[13px] shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground"
            />
          </label>
          <div className="flex-1 min-h-0 max-h-56 overflow-y-auto p-1">
            <p className="px-2 pt-1 pb-1 text-[12px] text-muted-foreground">Recent</p>
            {projects === null && <p className="px-2 py-1.5 text-[13px] text-muted-foreground">Loading…</p>}
            {projects !== null && !shown.length && (
              <p className="px-2 py-1.5 text-[13px] text-muted-foreground">{q.trim() ? `No project matches “${q}”.` : "No projects yet."}</p>
            )}
            {shown.map((p) => (
              <div key={p.id} className="group relative flex items-center rounded-md hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors duration-150">
                <button
                  type="button"
                  onClick={() => pick(p.id)}
                  title={p.repo || "No repo linked"}
                  className="flex-1 min-w-0 flex items-center gap-2.5 h-8 px-2 text-left text-[13px] text-foreground/85"
                >
                  {p.logo ? <img src={p.logo} alt="" className="size-[15px] shrink-0 rounded object-cover" /> : <Folder className="size-[15px] shrink-0 text-muted-foreground" />}
                  <span className="flex-1 min-w-0 truncate">{p.name}</span>
                  {p.id === picked && <Check className="size-3.5 shrink-0 group-hover:hidden" />}
                </button>
                <div className="hidden group-hover:flex items-center pr-1">
                  {[
                    { label: "Rename", Icon: Pencil, run: () => { setOpen(false); setRenaming(p); } },
                    { label: p.repo ? "Change repo" : "Link a repo", Icon: Link2, run: () => { setOpen(false); setLinking(p); } },
                    { label: "Delete", Icon: Trash2, run: () => removeProject(p) },
                  ].map(({ label, Icon, run }) => (
                    <button key={label} type="button" onClick={run} title={label} aria-label={label} className="flex items-center justify-center size-6 rounded text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors">
                      <Icon className="size-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="shrink-0 border-t border-black/10 dark:border-white/[0.08] p-1">
            <button
              type="button"
              onClick={() => { setOpen(false); setCreating(true); }}
              className="w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-left text-[13px] text-foreground/85 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors duration-150"
            >
              <FolderPlus className="size-[15px] text-muted-foreground" /> New project
            </button>
          </div>
          <div className="shrink-0 border-t border-black/10 dark:border-white/[0.08] p-1">
            <button
              type="button"
              onClick={() => pick(null)}
              className="w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-left text-[13px] text-foreground/85 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors duration-150"
            >
              <FolderX className="size-[15px] text-muted-foreground" />
              <span className="flex-1">No project</span>
              {!picked && <Check className="size-3.5" />}
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <NewProjectDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(p) => pick(p.id, p)}
      />
      <NewProjectDialog
        open={!!linking}
        linkTo={linking}
        onOpenChange={(o) => { if (!o) setLinking(null); }}
        onCreated={(p) => { replaceProject(p); setLinking(null); }}
      />
      <RenameDialog project={renaming} onClose={() => setRenaming(null)} onRenamed={(p) => { replaceProject(p); setRenaming(null); }} />
    </div>
  );
}

function NewProjectDialog({ open, onOpenChange, onCreated, linkTo = null }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (p: Project) => void;
  linkTo?: Project | null; // set: link (or change) the repo of this project instead of making a new one
}) {
  const reduce = useReducedMotion();
  const [name, setName] = useState("");
  const [withRepo, setWithRepo] = useState(false);
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [github, setGithub] = useState<"ok" | "missing" | "expired" | null>(null);
  const [repo, setRepo] = useState<string | null>(null);
  const [repoQ, setRepoQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(""); setWithRepo(!!linkTo); setRepo(linkTo?.repo || null); setRepoQ(""); setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open || !withRepo || repos !== null) return;
    (async () => {
      const { res, data } = await api("/github/repos");
      if (res.status === 409) { setGithub(data.error === "github_expired" ? "expired" : "missing"); setRepos([]); return; }
      setGithub(res.ok ? "ok" : null);
      setRepos(res.ok ? data.repos || [] : []);
    })();
  }, [open, withRepo, repos]);

  const shownRepos = useMemo(() => {
    const t = repoQ.trim().toLowerCase();
    return (repos || []).filter((r) => !t || r.fullName.toLowerCase().includes(t)).slice(0, 50);
  }, [repos, repoQ]);

  const create = async () => {
    if (linkTo) {
      if (!repo || busy) return;
      setBusy(true);
      try {
        const linked = await api(`/projects/${linkTo.id}`, { method: "PATCH", body: JSON.stringify({ repo }) });
        if (!linked.res.ok) { toast.error(linked.data.error || "Could not link the repo"); return; }
        onCreated(linked.data.project);
        toast.success(`Linked ${repo}`);
      } finally {
        setBusy(false);
      }
      return;
    }
    const n = name.trim();
    if (!n || busy || (withRepo && !repo)) return;
    setBusy(true);
    try {
      const made = await api("/projects", { method: "POST", body: JSON.stringify({ name: n }) });
      if (!made.res.ok) { toast.error(made.data.error || "Could not create the project"); return; }
      let project: Project = made.data.project;
      if (withRepo && repo) {
        const linked = await api(`/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ repo }) });
        if (linked.res.ok) project = linked.data.project;
        else toast.error(linked.data.error || "The project was made, but the repo could not be linked");
      }
      onCreated(project);
      onOpenChange(false);
      toast.success(`Created ${project.name}`);
    } finally {
      setBusy(false);
    }
  };

  const option = (on: boolean, title: string, text: string) => (
    <button
      type="button"
      onClick={() => setWithRepo(on)}
      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left rounded-md border transition-colors ${withRepo === on ? "border-black/25 dark:border-white/25 bg-black/[0.03] dark:bg-white/[0.04]" : "border-black/10 dark:border-white/[0.08] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"}`}
    >
      <span className={`mt-0.5 size-3.5 shrink-0 rounded-full border flex items-center justify-center ${withRepo === on ? "border-foreground" : "border-black/30 dark:border-white/30"}`}>
        <AnimatePresence>
          {withRepo === on && (
            <motion.span
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={reduce ? { opacity: 0 } : { scale: 0 }}
              transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}
              className="size-1.5 rounded-full bg-foreground"
            />
          )}
        </AnimatePresence>
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] text-foreground">{title}</span>
        <span className="block text-[12px] text-muted-foreground">{text}</span>
      </span>
    </button>
  );

  const field = "w-full h-9 px-3 rounded-md border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#161616] text-[13px] outline-none placeholder:text-muted-foreground focus:border-black/30 dark:focus:border-white/25";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-none"
        className="sm:max-w-[26rem] gap-0 p-0 overflow-hidden rounded-xl bg-white dark:!bg-[#1e1e1e] ring-black/10 dark:ring-white/10 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div>
            <DialogTitle className="text-[15px] font-medium">{linkTo ? (linkTo.repo ? "Change repo" : "Link a GitHub repo") : "New project"}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">{linkTo ? linkTo.name : "Shared with Project Mode and Studio Mode."}</DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="-mr-1.5 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5">
          {!linkTo && <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-muted-foreground">Name</span>
            <input
              autoFocus
              data-no-ring
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") create(); }}
              placeholder="my-project"
              maxLength={80}
              className={field}
            />
          </label>}

          {!linkTo && <div className="flex flex-col gap-1.5">
            <span className="text-[12px] text-muted-foreground">GitHub</span>
            {option(false, "Start without a repo", "You can link one later.")}
            {option(true, "Link a GitHub repo", "Pick one of your repos.")}
          </div>}

          <AnimatePresence initial={false}>
          {withRepo && (
            <motion.div
              key="repos"
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}
              className="overflow-hidden"
            >
            {github === "missing" || github === "expired" ? (
              <p className="text-[13px] text-muted-foreground">
                {github === "expired" ? "Your GitHub connection has expired." : "GitHub is not connected."} Connect it in Project Mode first.
              </p>
            ) : (
              <div className="rounded-md border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#161616] overflow-hidden">
                <label className="flex items-center gap-2 h-9 px-3 border-b border-black/10 dark:border-white/[0.08]">
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    data-no-ring
                    value={repoQ}
                    onChange={(e) => setRepoQ(e.target.value)}
                    placeholder="Search your repos"
                    className="flex-1 min-w-0 bg-transparent border-0 p-0 text-[13px] outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <div className="max-h-44 overflow-y-auto p-1">
                  {repos === null && <p className="px-2 py-1.5 text-[13px] text-muted-foreground">Loading your repos…</p>}
                  {repos !== null && !shownRepos.length && <p className="px-2 py-1.5 text-[13px] text-muted-foreground">No repo found.</p>}
                  {shownRepos.map((r) => (
                    <button
                      key={r.fullName}
                      type="button"
                      onClick={() => setRepo(r.fullName)}
                      className={`w-full flex items-center gap-2 h-8 px-2 rounded text-left text-[13px] ${repo === r.fullName ? "bg-black/[0.05] dark:bg-white/[0.07]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"}`}
                    >
                      <span className="flex-1 truncate">{r.fullName}</span>
                      {r.private && <span className="text-[11px] text-muted-foreground">Private</span>}
                      {repo === r.fullName && <Check className="size-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1a1a1a]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 rounded-md border border-black/10 dark:border-white/[0.1] text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-[background-color,transform] duration-150 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={create}
            disabled={linkTo ? !repo || busy || repo === linkTo.repo : !name.trim() || busy || (withRepo && !repo)}
            className="h-8 px-3 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-[opacity,transform] duration-150 active:scale-[0.97] disabled:active:scale-100"
          >
            {linkTo ? (busy ? "Linking…" : "Link repo") : busy ? "Creating…" : "Create project"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ project, onClose, onRenamed }: { project: Project | null; onClose: () => void; onRenamed: (p: Project) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (project) { setName(project.name); setBusy(false); } }, [project]);
  const save = async () => {
    const n = name.trim();
    if (!project || !n || busy || n === project.name) return;
    setBusy(true);
    try {
      const { res, data } = await api(`/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ name: n }) });
      if (!res.ok) { toast.error(data.error || "Could not rename the project"); return; }
      onRenamed(data.project);
      toast.success("Renamed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!project} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-none"
        className="sm:max-w-[22rem] gap-0 p-0 overflow-hidden rounded-xl bg-white dark:!bg-[#1e1e1e] ring-black/10 dark:ring-white/10 shadow-2xl"
      >
        <div className="px-5 pt-4 pb-3">
          <DialogTitle className="text-[15px] font-medium">Rename project</DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">The new name shows in Project Mode and Studio Mode.</DialogDescription>
        </div>
        <div className="px-5 pb-5">
          <input
            autoFocus
            data-no-ring
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            maxLength={80}
            className="w-full h-9 px-3 rounded-md border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#161616] text-[13px] outline-none focus:border-black/30 dark:focus:border-white/25"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1a1a1a]">
          <button type="button" onClick={onClose} className="h-8 px-3 rounded-md border border-black/10 dark:border-white/[0.1] text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-[background-color,transform] duration-150 active:scale-[0.97]">Cancel</button>
          <button type="button" onClick={save} disabled={!name.trim() || busy || name.trim() === project?.name} className="h-8 px-3 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-[opacity,transform] duration-150 active:scale-[0.97] disabled:active:scale-100">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
