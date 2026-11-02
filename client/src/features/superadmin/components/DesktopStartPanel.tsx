// Desktop app, Project Mode start: open a folder on this computer, download (clone) a repository to it, or pick one of
// the folders opened before. Works without GitHub.
import { useState } from "react";
import { Folder, FolderOpen, Copy, Github } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/marketing_ui/spinner";
import { openLocalFolder } from "./StudioProjectPicker";
import { fetchWithRescue } from "@/lib/rescue";

export type LocalWorkspace = { id: string; name: string; localPath?: string | null };
type Made = { id: string; name: string; repo: string | null; logo?: string | null; updatedAt: string; location: "local"; localPath: string | null };

const desktop = () => (window as unknown as { classgridDesktop?: { cloneRepo?: (repo: string) => Promise<{ folder?: string; error?: string } | null> } }).classgridDesktop;
const SHOWN = 5;

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
  return { id: String(p.id), name: p.name, repo: p.repo || null, logo: p.logo || null, updatedAt: p.updatedAt, location: "local", localPath: p.localPath || folder };
}

export function DesktopStartPanel({ workspaces, githubRepos, onOpen }: {
  workspaces: LocalWorkspace[];
  githubRepos?: string[] | null; // the user's GitHub repos, when GitHub is connected
  onOpen: (project: Made | LocalWorkspace) => void;
}) {
  const [cloning, setCloning] = useState(false);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState<"folder" | "clone" | null>(null);
  const [all, setAll] = useState(false);

  const openFolder = async () => {
    setBusy("folder");
    try { const p = await openLocalFolder(); if (p) onOpen({ ...p, location: "local", localPath: p.localPath || null }); }
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
      if (p) { setCloning(false); setAddress(""); onOpen(p); }
    } finally { setBusy(null); }
  };

  const q = address.trim().toLowerCase();
  const matches = (githubRepos || []).filter((r) => !q || r.toLowerCase().includes(q)).slice(0, 6);
  const shown = all ? workspaces : workspaces.slice(0, SHOWN);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      <img src="/logo.png" alt="" className="size-16" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Classgrid Code</h1>
      <p className="mt-1 text-sm text-muted-foreground">Work on a folder on this computer. No GitHub needed.</p>

      <div className="mt-8 w-full flex flex-col gap-3">
        <button
          onClick={openFolder}
          disabled={busy !== null}
          className="h-11 w-full flex items-center justify-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {busy === "folder" ? <Spinner className="size-4" /> : <FolderOpen className="size-4" />} Open Folder
        </button>
        <div className="relative w-full">
          <button
            onClick={() => setCloning((v) => !v)}
            disabled={busy !== null}
            className="h-11 w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary disabled:opacity-60"
          >
            {busy === "clone" ? <Spinner className="size-4" /> : <Copy className="size-4" />} {busy === "clone" ? "Downloading…" : "Clone Repository"}
          </button>
          {cloning && busy === null && (
            <div className="absolute left-0 right-0 top-12 z-20 rounded-lg border border-border bg-background shadow-lg p-2">
              <input
                autoFocus
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") clone(address); if (e.key === "Escape") setCloning(false); }}
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
      </div>

      {workspaces.length > 0 && (
        <div className="mt-10 w-full">
          <h2 className="text-sm font-medium mb-2">Workspaces</h2>
          <div className="flex flex-col gap-2">
            {shown.map((w) => (
              <button
                key={w.id}
                onClick={() => onOpen(w)}
                className="w-full text-left rounded-lg border border-border bg-background px-3 py-2.5 hover:bg-secondary flex items-start gap-2.5"
              >
                <Folder className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex flex-col">
                  <span className="text-sm truncate">{w.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{w.localPath || "This computer"}</span>
                </span>
              </button>
            ))}
          </div>
          {workspaces.length > SHOWN && (
            <button onClick={() => setAll((v) => !v)} className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground">
              {all ? "Show less" : "Show more…"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
