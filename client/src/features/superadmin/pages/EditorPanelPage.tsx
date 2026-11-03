// Classgrid Code's right side (classgrid-editor/extension): only the Agent panel, the same one as Project Mode's right
// side, filling the editor's panel. The login comes from the Classgrid app (Project Mode opens the editor signed in),
// so there's no login form here.
import { useEffect, useState } from "react";
import { AskAiPanel } from "@/components/ai";
import { apiClient } from "@/lib/apiClient";

// The folder open in the editor (classgrid-editor/extension/bridge.js)
const editorFolder = (): string | null => (window as unknown as { classgridDesktop?: { editorFolder?: string | null } }).classgridDesktop?.editorFolder || null;

export function EditorPanelPage() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  let signedIn = false;
  try { const t = localStorage.getItem("token"); signedIn = !!t && t !== "null"; } catch { /* storage blocked */ }

  // The editor's folder is the Agent's project, like the open project in Project Mode: its folder project (the same
  // one the Classgrid app opened, or a new one) is saved as the open project before the Agent shows
  const folder = editorFolder();
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
      .catch(() => { /* the Agent still opens */ })
      .finally(() => { if (!gone) setReady(true); });
    return () => { gone = true; };
  }, [folder, signedIn]);

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
