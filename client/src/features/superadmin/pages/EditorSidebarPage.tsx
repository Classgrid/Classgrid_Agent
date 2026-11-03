// Classgrid Code's left edge (classgrid-editor/patches/classgrid-left-strip.patch): the same chats sidebar as Project
// Mode's left side (Search, New Chat, Library, the project's chat history), as the icon strip or open. Its width is
// the editor's: the page tells the editor how wide it is. A chat picked here opens in the Agent panel on the right.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/marketing_ui/sidebar";
import { TooltipProvider } from "@/components/marketing_ui/tooltip";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { editorDesktop, editorSignedIn, useEditorProject } from "./EditorPanelPage";

const BASE = "/editor/sidebar/project";
const OPEN_KEY = "cg_editor_sidebar_open";
// The sidebar's own widths (marketing_ui/sidebar: 4.5rem as the icon strip, 16rem open)
const STRIP_WIDTH = 72;
const OPEN_WIDTH = 256;

export function EditorSidebarPage() {
  // The sidebar keeps its full layout in this narrow page (not the phone one): global.css, hooks/use-mobile
  useLayoutEffect(() => {
    document.documentElement.classList.add("cg-editor-sidebar");
    return () => document.documentElement.classList.remove("cg-editor-sidebar");
  }, []);

  const [open, setOpen] = useState(() => { try { return localStorage.getItem(OPEN_KEY) !== "0"; } catch { return true; } });
  useEffect(() => {
    editorDesktop()?.setStripWidth?.(open ? OPEN_WIDTH : STRIP_WIDTH);
    try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch { /* storage blocked */ }
  }, [open]);

  const signedIn = editorSignedIn();
  const ready = useEditorProject(signedIn);
  const { data: currentUser } = useCurrentUser();

  // A chat picked here (or New Chat) opens in the Agent panel; the chat the Agent panel shows is marked here
  const navigate = useNavigate();
  const { sessionId, section } = useParams();
  const shown = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    // Schedule and Library open in the Agent panel too, and this list stays the project's
    if (section) {
      editorDesktop()?.openChat?.(section);
      navigate(BASE, { replace: true });
      return;
    }
    const id = sessionId || null;
    if (shown.current === undefined) { shown.current = id; return; }
    if (id === shown.current) return;
    shown.current = id;
    editorDesktop()?.openChat?.(id);
  }, [sessionId, section, navigate]);
  useEffect(() => editorDesktop()?.onActiveChat?.((id) => {
    const want = id || null;
    if (want === "schedule" || want === "library" || want === shown.current) return;
    shown.current = want;
    navigate(want ? `${BASE}/${want}` : BASE, { replace: true });
  }), [navigate]);

  if (!signedIn || !ready) return <div className="h-[100dvh] bg-sidebar" />;
  return (
    <TooltipProvider>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <AppSidebar role="super_admin" user={currentUser ?? undefined} />
      </SidebarProvider>
    </TooltipProvider>
  );
}
