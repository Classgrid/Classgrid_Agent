// Classgrid Code's Review tab (classgrid-editor/extension "classgrid.openReview"): the same Review as the app's
// Studio (StudioReviewView: every changed file with its diff coloured by Shiki, Accept / Reject / Undo), as a tab
// in the editor like Settings. It opens on the answer "Review" was pressed for (/editor/review/<chat>?cp=<answer>);
// a later press reaches it as a message from the extension.
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StudioReviewView } from "@/features/superadmin/components/StudioReviewView";
import { REVIEW_CHECKPOINT_EVENT } from "@/components/ai/components/stepper/ProjectToolSteps";
import { editorDesktop } from "./EditorPanelPage";

export function EditorReviewPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const cp = new URLSearchParams(window.location.search).get("cp") || null;
  // The editor's folder project, saved by the Agent panel before it shows (an answer the editor kept no copies of is
  // on the server, under this project)
  const projectId = (() => { try { return sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open"); } catch { return null; } })();
  // "Review" pressed again in the Agent panel: another answer of this chat shows, or the tab moves to that chat
  useEffect(() => editorDesktop()?.onReviewAnswer?.((d) => {
    if (!d?.chat) return;
    if (d.chat !== sessionId) { navigate(`/editor/review/${d.chat}${d.cp ? `?cp=${d.cp}` : ""}`); return; }
    if (d.cp) window.dispatchEvent(new CustomEvent(REVIEW_CHECKPOINT_EVENT, { detail: { sessionId: d.chat, checkpoint: d.cp, mode: "review" } }));
  }), [sessionId, navigate]);
  return (
    <div className="cg-editor-review h-[100dvh] flex flex-col bg-background text-foreground">
      <StudioReviewView projectId={projectId} initialCheckpoint={cp} />
    </div>
  );
}
