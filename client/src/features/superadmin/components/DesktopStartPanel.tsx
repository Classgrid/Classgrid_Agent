// Desktop app, Project Mode start: three boxes (open a folder on this computer, clone a repository to a folder, or get
// one of the user's cloud projects), then the projects on this computer opened before. Works without GitHub.
import { useEffect, useRef, useState } from "react";
import { Cloud, Copy, FolderOpen, Github } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/marketing_ui/spinner";
import { openLocalFolder } from "./StudioProjectPicker";
import { fetchWithRescue } from "@/lib/rescue";

export type LocalWorkspace = { id: string; name: string; localPath?: string | null };
type Made = { id: string; name: string; repo: string | null; logo?: string | null; updatedAt: string; location: "local" | "cloud"; localPath: string | null; localCopies?: { deviceId: string; path: string; at?: string; here?: boolean }[]; mastero?: boolean; masteroPending?: boolean };
// A project on this computer (a folder, or a cloud project's copy here)
export type RecentProject = { id: string; name: string; path: string; open: () => void };
// One of the user's cloud projects: downloaded to a folder here (or opened, when it has a copy here already)
export type CloudProject = { id: string; name: string; logo?: string | null; action: "Download" | "Open"; open: () => void };

const desktop = () => (window as unknown as { classgridDesktop?: { cloneRepo?: (repo: string) => Promise<{ folder?: string; error?: string } | null> } }).classgridDesktop;
const SHOWN = 5;
// Where a folder is: the folder it sits in (C:\ for C:\CLASSGRIDPLATFORM)
const parentOf = (folder: string) => {
  const up = folder.replace(/[\\/]+$/, "").replace(/[\\/][^\\/]*$/, "");
  return /^[a-zA-Z]:$/.test(up) ? `${up}\\` : up || folder;
};

export async function makeLocalProject(folder: string, name?: string): Promise<Made | null> {
  const base = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
  const res = await fetchWithRescue(`${base}/api/ide/projects/local`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ localPath: folder, ...(name ? { name } : {}) }),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  if (!res?.ok || !data?.project) { toast.error(data?.error || "Couldn't open that folder"); return null; }
  const p = data.project;
  // (as the server says: a folder that became a Mastero project opens as that cloud project, its copy on this computer)
  return { id: String(p.id), name: p.name, repo: p.repo || null, logo: p.logo || null, updatedAt: p.updatedAt, location: p.location || "local", localPath: p.location === "cloud" ? null : p.localPath || folder, localCopies: p.localCopies, mastero: !!p.mastero, masteroPending: !!p.masteroPending };
}

// A box's open menu closes on a click anywhere else
function useClickAway(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);
  return ref;
}

const box = "h-[88px] w-full flex flex-col items-start justify-between rounded-lg bg-secondary/60 hover:bg-secondary px-4 py-3.5 text-left text-sm disabled:opacity-60";

export function DesktopStartPanel({ recent, cloud, githubRepos, onOpen, onConnectGithub }: {
  recent: RecentProject[];
  cloud: CloudProject[] | null; // null: GitHub isn't connected, so cloud projects can't be downloaded yet
  githubRepos?: string[] | null; // the user's GitHub repos, when GitHub is connected
  onOpen: (project: Made | LocalWorkspace) => void;
  onConnectGithub?: () => void;
}) {
  const [menu, setMenu] = useState<"clone" | "cloud" | null>(null);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState<"folder" | "clone" | null>(null);
  const [all, setAll] = useState(false);
  const cloneRef = useClickAway(menu === "clone", () => setMenu(null));
  const cloudRef = useClickAway(menu === "cloud", () => setMenu(null));

  const openFolder = async () => {
    setBusy("folder");
    try { const p = await openLocalFolder(); if (p) onOpen(p); }
    finally { setBusy(null); }
  };
  const clone = async (repo: string) => {
    const given = repo.trim();
    if (!given) return;
    setBusy("clone");
    try {
      const r = await desktop()?.cloneRepo?.(given);
      if (!r) return;
      if (r.error || !r.folder) { toast.error(r.error || "Couldn't download that repository"); return; }
      const p = await makeLocalProject(r.folder);
      if (p) { setMenu(null); setAddress(""); onOpen(p); }
    } finally { setBusy(null); }
  };

  const q = address.trim().toLowerCase();
  const matches = (githubRepos || []).filter((r) => !q || r.toLowerCase().includes(q)).slice(0, 6);
  const shown = all ? recent : recent.slice(0, SHOWN);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="" className="size-10" />
        <h1 className="text-2xl font-semibold tracking-tight">Classgrid Code</h1>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <button onClick={openFolder} disabled={busy !== null} className={box}>
          {busy === "folder" ? <Spinner className="size-4" /> : <FolderOpen className="size-4" />}
          <span>Open folder</span>
        </button>

        <div ref={cloneRef} className="relative">
          <button onClick={() => setMenu((m) => (m === "clone" ? null : "clone"))} disabled={busy !== null} className={box}>
            {busy === "clone" ? <Spinner className="size-4" /> : <Copy className="size-4" />}
            <span>{busy === "clone" ? "Downloading…" : "Clone repo"}</span>
          </button>
          {menu === "clone" && busy === null && (
            <div className="absolute left-0 top-[96px] z-20 w-[min(26rem,80vw)] rounded-lg border border-border bg-background shadow-lg p-2">
              <input
                autoFocus
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") clone(address); if (e.key === "Escape") setMenu(null); }}
                placeholder="Repository address (https://… or owner/name)"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {matches.length > 0 && (
                <div className="mt-1 flex flex-col">
                  <span className="px-2 pt-1 pb-0.5 text-[11px] text-muted-foreground">Clone from GitHub</span>
                  {matches.map((r) => (
                    <button key={r} onClick={() => clone(r)} className="flex items-center gap-2 px-2 h-8 rounded-md text-left text-sm hover:bg-secondary">
                      <Github className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{r}</span>
                    </button>
                  ))}
                </div>
              )}
              {address.trim() && (
                <button onClick={() => clone(address)} className="mt-1 w-full h-8 rounded-md text-sm text-left px-2 hover:bg-secondary">
                  Clone <span className="font-medium">{address.trim()}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={cloudRef} className="relative">
          <button onClick={() => setMenu((m) => (m === "cloud" ? null : "cloud"))} disabled={busy !== null} className={box}>
            <Cloud className="size-4" />
            <span>Cloud projects</span>
          </button>
          {menu === "cloud" && (
            <div className="absolute right-0 top-[96px] z-20 w-[min(22rem,80vw)] rounded-lg border border-border bg-background shadow-lg p-1.5">
              {cloud === null ? (
                <div className="p-3 flex flex-col gap-2 text-sm">
                  <span className="text-muted-foreground">Connect GitHub to download your cloud projects.</span>
                  <button onClick={() => { setMenu(null); onConnectGithub?.(); }} className="self-start h-8 px-3 rounded-full border border-border text-sm hover:bg-secondary">Connect GitHub</button>
                </div>
              ) : cloud.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No cloud projects yet.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto flex flex-col">
                  {cloud.map((c) => (
                    <div key={c.id} className="flex items-center gap-2.5 px-2 h-11 rounded-md hover:bg-secondary/60">
                      {c.logo
                        ? <img src={c.logo} alt="" className="size-6 shrink-0 rounded-md border border-border object-cover" />
                        : <span className="size-6 shrink-0 rounded-md border border-border flex items-center justify-center"><Cloud className="size-3.5 text-muted-foreground" /></span>}
                      <span className="flex-1 min-w-0 truncate text-sm">{c.name}</span>
                      <button onClick={() => { setMenu(null); c.open(); }} className="shrink-0 h-7 px-3 rounded-full border border-border text-xs hover:bg-secondary">{c.action}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
            <span>This PC</span>
            {recent.length > SHOWN && (
              <button onClick={() => setAll((v) => !v)} className="hover:text-foreground">{all ? "Show less" : `View all (${recent.length})`}</button>
            )}
          </div>
          <div className="flex flex-col">
            {shown.map((r) => (
              <button key={r.id} onClick={r.open} title={r.path} className="h-9 -mx-2 px-2 rounded-md flex items-center justify-between gap-4 text-left hover:bg-secondary/60">
                <span className="truncate text-sm">{r.name}</span>
                <span className="truncate text-xs text-muted-foreground max-w-[55%]">{parentOf(r.path)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
