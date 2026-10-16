import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Github, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AskAiPanel } from "@/components/ai";
import { AiHubModal } from "@/components/ai/components/AiHubModal";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";

// Project mode: shown inside the normal layout (left sidebar). The middle is the code editor (OpenVSCode Server on
// the sandbox at ide.classgrid.in, which lets in only super admins via their Classgrid login), the right side is the
// AI panel in its overlay layout.
export function ProjectModePage() {
  const { data: currentUser } = useCurrentUser();
  const isSuperAdmin = (currentUser as any)?.role === "super_admin";
  // The open chat's sandbox folder (the same /data the AI writes to); no chat open = the editor's own workspace
  const { sessionId } = useParams<{ sessionId?: string }>();
  const chatFolder = sessionId ? `/home/workspace/chats/${sessionId}` : "/home/workspace";
  const [openedFolder, setOpenedFolder] = useState<string | null>(null);
  const ideFolder = openedFolder ?? chatFolder;
  useEffect(() => setOpenedFolder(null), [sessionId]);

  // GitHub: repos come from the user's own GitHub plugin (AI Hub); a picked repo is copied into the chat's project/ folder
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [repos, setRepos] = useState<{ fullName: string; private: boolean }[]>([]);
  const [repo, setRepo] = useState("");
  const [opening, setOpening] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  const loadRepos = useCallback(async () => {
    try {
      const res = await fetchWithRescue(`${backendUrl}/api/ide/github/repos`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) { setGithubConnected(false); return; }
      if (!res.ok) throw new Error(data.error);
      setGithubConnected(true);
      setRepos(data.repos || []);
    } catch {
      setGithubConnected(null);
    }
  }, []);
  useEffect(() => { if (isSuperAdmin) loadRepos(); }, [isSuperAdmin, loadRepos]);

  const openRepo = async (replace = false) => {
    if (!sessionId || !repo) return;
    setOpening(true);
    try {
      const res = await fetchWithRescue(`${backendUrl}/api/ide/github/open`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, repo, replace }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.error === "unsaved_changes") {
        if (window.confirm("The project in this chat has changes that are not pushed to GitHub. Replace it anyway?")) return openRepo(true);
        return;
      }
      if (res.status === 409) { setGithubConnected(false); return; }
      if (!res.ok) throw new Error(data.error || "Could not download this repo");
      setOpenedFolder(data.folder);
      toast.success(`${repo} is open`);
    } catch (e: any) {
      toast.error(e?.message || "Could not download this repo");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="h-full flex flex-col !bg-[#fafafa] dark:!bg-[#000000] text-foreground sm:pr-[400px]">
      <div className="shrink-0 flex items-center gap-3 h-8 box-content py-4 pl-16 pr-4 border-b border-border">{/* same height as the AI panel header, so both lines meet */}
        <span className="text-sm font-medium">Project Mode</span>
        {isSuperAdmin && githubConnected === false && (
          <button onClick={() => setHubOpen(true)} className="ml-auto flex items-center gap-2 h-8 px-3 rounded-md border border-border text-sm hover:bg-secondary">
            <Github className="size-4" /> Connect GitHub
          </button>
        )}
        {isSuperAdmin && githubConnected && (
          <div className="ml-auto flex items-center gap-2">
            <select
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="h-8 max-w-[260px] rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Pick a GitHub repo</option>
              {repos.map((r) => <option key={r.fullName} value={r.fullName}>{r.fullName}{r.private ? " (private)" : ""}</option>)}
            </select>
            <button
              onClick={() => openRepo()}
              disabled={!repo || !sessionId || opening}
              title={!sessionId ? "Start a chat first" : undefined}
              className="flex items-center gap-2 h-8 px-3 rounded-md border border-border text-sm hover:bg-secondary disabled:opacity-50"
            >
              {opening ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />} Open
            </button>
          </div>
        )}
      </div>
      {isSuperAdmin ? (
        <iframe key={ideFolder} src={`https://ide.classgrid.in/?folder=${encodeURIComponent(ideFolder)}`} title="Code editor" className="flex-1 w-full border-0 [color-scheme:light] dark:[color-scheme:dark]" allow="clipboard-read; clipboard-write" />
      ) : (
        <div className="flex-1" />
      )}
      <AskAiPanel open onOpenChange={() => {}} variant="overlay" />
      <AiHubModal isOpen={hubOpen} onClose={() => { setHubOpen(false); loadRepos(); }} />
    </div>
  );
}
