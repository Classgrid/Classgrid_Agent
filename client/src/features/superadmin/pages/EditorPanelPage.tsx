// Classgrid Code's right side (classgrid-editor/extension): only the Agent panel, the same one as Project Mode's right
// side, filling the editor's panel. The login comes from the Classgrid app (Project Mode opens the editor signed in),
// so there's no login form here.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AskAiPanel } from "@/components/ai";
import { apiClient } from "@/lib/apiClient";
import { StudioSearchPalette } from "@/features/superadmin/components/StudioSearchPalette";
import { FileBadge } from "@/features/superadmin/components/StudioFilesView";
import { OPEN_PROJECT_FILE_EVENT } from "@/components/ai/components/stepper/ProjectToolSteps";
import { remember } from "@/features/superadmin/utils/projectCopies";

type EditorDesktop = {
  editorFolder?: string | null;
  openChat?: (id: string | null) => void;
  activeChat?: (id: string | null) => void;
  onOpenChat?: (fn: (id: string | null) => void) => () => void;
  onActiveChat?: (fn: (id: string | null) => void) => () => void;
  setStripWidth?: (width: number) => void;
  onToggleSidebar?: (fn: () => void) => () => void;
  openInEditor?: (folder: string, file?: string, line?: number) => Promise<unknown>;
  openPath?: (path: string) => Promise<unknown>;
};
// classgrid-editor/extension/bridge.js
export const editorDesktop = (): EditorDesktop | undefined => (window as unknown as { classgridDesktop?: EditorDesktop }).classgridDesktop;

export const editorSignedIn = () => {
  try { const t = localStorage.getItem("token"); return !!t && t !== "null"; } catch { return false; }
};

// The editor's folder is the Agent's project, like the open project in Project Mode: its folder project (the same
// one the Classgrid app opened, or a new one) is saved as the open project before the page shows. The Agent panel and
// the chats sidebar both do this, so both list and use the same project.
export function useEditorProject(signedIn: boolean) {
  const folder = editorDesktop()?.editorFolder || null;
  const [ready, setReady] = useState(!folder);
  useEffect(() => {
    if (!folder || !signedIn) return;
    let gone = false;
    apiClient.post("/api/ide/projects/local", { localPath: folder })
      .then(({ data }) => {
        const p = data?.project;
        if (!p?.id) return;
        try {
          localStorage.setItem("cg_project_open", String(p.id));
          sessionStorage.setItem("cg_project_open", String(p.id));
          // The saved list gets the project as the server says it is (a Mastero project is a cloud project with its copy here)
          remember({ ...p, id: String(p.id), localPath: p.location === "cloud" ? null : p.localPath || folder });
        } catch { /* storage blocked */ }
      })
      .catch(() => { /* the page still opens */ })
      .finally(() => { if (!gone) setReady(true); });
    return () => { gone = true; };
  }, [folder, signedIn]);
  return ready;
}

export function EditorPanelPage() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    // (not while a big window like the AI Hub has the page cover the whole window: the panel keeps its own width, so
    // the chat behind the AI Hub stays as it is instead of being laid out window-wide and cut off)
    const onResize = () => { if (!document.documentElement.classList.contains("cg-want-cover")) setWidth(window.innerWidth); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const signedIn = editorSignedIn();
  const ready = useEditorProject(signedIn);

  // A chat picked in the chats sidebar on the left edge opens here, and the chat shown here is marked there
  const navigate = useNavigate();
  const { sessionId } = useParams();
  useEffect(() => editorDesktop()?.onOpenChat?.((id) => {
    navigate(id ? `/editor/project/${id}` : "/editor/project");
    if (!id) window.dispatchEvent(new Event("agent:new-chat"));
  }), [navigate]);
  useEffect(() => { editorDesktop()?.activeChat?.(sessionId || null); }, [sessionId]);
  // A file name clicked in the chat (a step, a link, Files Changed) opens in this editor at its line; a folder or a
  // full path outside the project opens where it is
  useEffect(() => {
    const onOpenFile = (e: Event) => {
      const detail = (e as CustomEvent<{ path?: string; startLine?: number; folder?: boolean }>).detail;
      const d = editorDesktop();
      const path = String(detail?.path || "").trim();
      if (!d || !path) return;
      // (a full path, like C:\\x\\y.ts, opens as it is; a project path opens from the folder open in the editor)
      const full = /^[a-z]:[\\/]/i.test(path);
      const folder = d.editorFolder || "";
      if (full || !folder) { d.openPath?.(path); return; }
      if (detail?.folder) { d.openPath?.(`${folder.replace(/[\\/]+$/, "")}/${path}`); return; }
      d.openInEditor?.(folder, path, detail?.startLine);
    };
    window.addEventListener(OPEN_PROJECT_FILE_EVENT, onOpenFile);
    return () => window.removeEventListener(OPEN_PROJECT_FILE_EVENT, onOpenFile);
  }, []);
  // The chat search (the chats sidebar's search box, or Ctrl+K): Studio's search, in the middle of the whole window
  // like the AI Hub (the left sidebar is too narrow for it)
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener("agent:open-search-palette", open);
    return () => window.removeEventListener("agent:open-search-palette", open);
  }, []);

  if (!signedIn) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background p-6 text-center">
        <div className="max-w-[260px] space-y-2">
          <p className="text-[15px] font-medium text-foreground">Open your project from Classgrid</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">Sign in to the Classgrid app and open this project from Project Mode. Your Agent shows up here, already signed in.</p>
        </div>
      </div>
    );
  }
  if (!ready) return <div className="cg-editor-panel h-[100dvh] bg-background" />;
  return (
    <div className="cg-editor-panel h-[100dvh] bg-background">
      <AskAiPanel open onOpenChange={() => {}} variant="overlay" hideClearChat overlayWidth={width} />
      <StudioSearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialKind="conversations"
        fileIcon={(name) => <FileBadge name={name} />}
        onOpenChat={(id) => navigate(`/editor/project/${id}`)}
        inPanel
      />
    </div>
  );
}
