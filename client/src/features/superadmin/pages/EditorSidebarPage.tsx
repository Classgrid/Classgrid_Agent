// Classgrid Code's left edge (classgrid-editor/patches/classgrid-left-strip.patch): the same chats sidebar as Project
// Mode's left side (Search, New Chat, Library, the project's chat history), as the icon strip or open. Its width is
// the editor's: the page tells the editor how wide it is. A chat picked here opens in the Agent panel on the right.
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/marketing_ui/sidebar";
import { TooltipProvider } from "@/components/marketing_ui/tooltip";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { editorDesktop, editorSignedIn, useEditorProject } from "./EditorPanelPage";

const BASE = "/editor/sidebar/project";
const OPEN_KEY = "cg_editor_sidebar_open";
const HIDDEN_KEY = "cg_editor_sidebar_hidden"; // the sidebar was dragged away
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
  // Like Project Mode: the sidebar can be dragged away completely; the sidebar button next to the logo in the title
  // bar brings it back
  const [stripHidden, setStripHidden] = useState(() => { try { return localStorage.getItem(HIDDEN_KEY) === "1"; } catch { return false; } });
  const hidden = stripHidden && !open;
  useEffect(() => {
    editorDesktop()?.setStripWidth?.(hidden ? 0 : open ? OPEN_WIDTH : STRIP_WIDTH);
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
      localStorage.setItem(HIDDEN_KEY, stripHidden ? "1" : "0");
    } catch { /* storage blocked */ }
  }, [open, hidden, stripHidden]);
  useEffect(() => { if (open) setStripHidden(false); }, [open]);
  // The title bar's sidebar button: a hidden sidebar comes back, otherwise it opens or folds to icons
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  useEffect(() => editorDesktop()?.onToggleSidebar?.(() => {
    if (hiddenRef.current) setStripHidden(false);
    else setOpen((o) => !o);
  }), []);
  // Drag the sidebar's edge: far left hides it completely, a little left folds it to icons, right opens it
  const [stripDragging, setStripDragging] = useState(false);
  const startStripDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    try { handle.setPointerCapture(e.pointerId); } catch { /* not captured */ }
    setStripDragging(true);
    let hideAtEnd = false; // (hidden only when the drag ends, so the drag keeps going while the sidebar is this narrow)
    const move = (ev: PointerEvent) => {
      if (ev.clientX < 36) { setOpen(false); hideAtEnd = true; }
      else if (ev.clientX < 160) { setOpen(false); hideAtEnd = false; setStripHidden(false); }
      else { hideAtEnd = false; setStripHidden(false); setOpen(true); }
    };
    const up = () => {
      setStripDragging(false);
      if (hideAtEnd) setStripHidden(true);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
  };

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
      <div onPointerDown={startStripDrag} className="group fixed inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none" title="Drag to hide or show the sidebar">
        <div className={`ml-auto h-full transition-all duration-200 ${stripDragging ? "w-[2px] bg-foreground/40" : "w-px bg-transparent group-hover:w-[2px] group-hover:bg-foreground/25"}`} />
      </div>
    </TooltipProvider>
  );
}
