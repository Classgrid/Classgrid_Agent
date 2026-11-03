// Classgrid Code's right side (classgrid-editor/extension): only the Agent panel, the same one as Project Mode's right
// side, filling the editor's panel. The login comes from the Classgrid app (Project Mode opens the editor signed in),
// so there's no login form here.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AskAiPanel } from "@/components/ai";
import { apiClient } from "@/lib/apiClient";

type EditorDesktop = {
  editorFolder?: string | null;
  openChat?: (id: string | null) => void;
  activeChat?: (id: string | null) => void;
  onOpenChat?: (fn: (id: string | null) => void) => () => void;
  onActiveChat?: (fn: (id: string | null) => void) => () => void;
  setStripWidth?: (width: number) => void;
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
          const list = JSON.parse(localStorage.getItem("cg_studio_projects") || "[]") as { id: string }[];
          const mine = { id: String(p.id), name: p.name, repo: p.repo || null, logo: p.logo || null, updatedAt: p.updatedAt, location: "local", localPath: p.localPath || folder };
          localStorage.setItem("cg_studio_projects", JSON.stringify([mine, ...list.filter((x) => x.id !== mine.id)]));
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
    const onResize = () => setWidth(window.innerWidth);
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
    </div>
  );
}
