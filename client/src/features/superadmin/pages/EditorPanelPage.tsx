// Classgrid Code's right side (classgrid-editor/extension): only the Agent panel, the same one as Project Mode's right
// side, filling the editor's panel. The login comes from the Classgrid app (Project Mode opens the editor signed in),
// so there's no login form here.
import { useEffect, useState } from "react";
import { AskAiPanel } from "@/components/ai";

export function EditorPanelPage() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  let signedIn = false;
  try { const t = localStorage.getItem("token"); signedIn = !!t && t !== "null"; } catch { /* storage blocked */ }
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
  return (
    <div className="cg-editor-panel h-[100dvh] bg-background">
      <AskAiPanel open onOpenChange={() => {}} variant="overlay" hideClearChat overlayWidth={width} />
    </div>
  );
}
