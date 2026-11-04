// Classgrid Code's AI panel top line (classgrid-editor): the chats sidebar button, the project / chat name, the chat
// search, ⋯ (the chat's menu: Rename, Pin, Add to group, Copy, Delete), + for a new chat, X to close the panel, and the
// switch for the right side box (Files Changed, Uploads). It sits at the very top of the right side, level with the
// editor tabs (the side has no title row of its own).
// The chats sidebar opens inside the AI panel itself: the same chat list as Studio's left sidebar (pinned chats, projects
// with their groups, each chat's menu), showing only this computer's chats, plus Settings (the same Settings tab as
// the gear in the title bar).
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PanelLeft, PanelRight, Plus, Search, Settings, X } from "lucide-react";
import { fetchWithRescue } from "@/lib/rescue";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/marketing_ui/sidebar";
import { AgentNestedMenu } from "./AgentSidebar";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
type Chat = { id: string; title: string; created_at: string; pinned?: boolean; project_id?: string; project_name?: string };
type EditorDesktop = { editorFolder?: string | null; openSettings?: () => Promise<unknown>; closePanel?: () => Promise<unknown> };
const desk = () => (window as unknown as { classgridDesktop?: EditorDesktop }).classgridDesktop;

const cleanTitle = (t: string) => (t || "New Chat").replace(/\*\*Title:\*\*/gi, "").replace(/Title:/gi, "").replace(/["']/g, "").trim();
const folderName = (p?: string | null) => (p ? p.split(/[\\/]/).filter(Boolean).pop() || p : "");

export const editorIconButton = "flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors";

export function EditorChatHeader({ sessionId, menu, side }: { sessionId: string | null; menu?: ReactNode; side?: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [chats, setChats] = useState<Chat[] | null>(null);

  // (only for the name in the top line)
  const load = useCallback(() => {
    fetchWithRescue(`${backendUrl}/api/ai/sessions?project=all&studio=1`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setChats(Array.isArray(d.sessions) ? d.sessions : []))
      .catch(() => setChats((c) => c || []));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("agent:refresh-sessions", load);
    window.addEventListener("agent:session-created", load);
    return () => {
      window.removeEventListener("agent:refresh-sessions", load);
      window.removeEventListener("agent:session-created", load);
    };
  }, [load]);
  // (the new chat's title arrives a moment after it starts)
  useEffect(() => { if (sessionId && chats && !chats.some((c) => c.id === sessionId)) { const t = setTimeout(load, 1500); return () => clearTimeout(t); } }, [sessionId, chats, load]);
  // Opening a chat (or a new one) from the sidebar closes it
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const current = chats?.find((c) => c.id === sessionId);
  const project = current?.project_name ? folderName(current.project_name) : folderName(desk()?.editorFolder);
  const title = current ? cleanTitle(current.title) : "New chat";

  const newChat = () => {
    setOpen(false);
    navigate("/editor/project");
    window.dispatchEvent(new Event("agent:new-chat"));
  };

  return (
    <>
      <div className="flex items-center gap-1 h-[35px] px-2 shrink-0 shadow-[inset_0_-1px_0_var(--border)]">
        <button type="button" onClick={() => setOpen((o) => !o)} className={cn(editorIconButton, open && "text-foreground bg-muted")} title="Chats" aria-label="Chats">
          <PanelLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0 truncate text-[13px] px-1">
          {project && <span className="text-muted-foreground">{project} / </span>}
          <span className="text-foreground font-medium">{title}</span>
        </div>
        <button type="button" onClick={() => window.dispatchEvent(new Event("agent:open-search-palette"))} className={editorIconButton} title="Search chats" aria-label="Search chats">
          <Search className="size-4" />
        </button>
        {menu}
        <button type="button" onClick={newChat} className={editorIconButton} title="New chat" aria-label="New chat">
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => desk()?.closePanel?.()} className={editorIconButton} title="Close" aria-label="Close">
          <X className="size-4" />
        </button>
        {side && (
          <button type="button" onClick={() => setSideOpen((o) => !o)} className={cn(editorIconButton, sideOpen && "text-foreground bg-muted")} title="Files Changed and Uploads" aria-label="Files Changed and Uploads">
            <PanelRight className="size-4" />
          </button>
        )}
      </div>

      {/* The chats sidebar, inside the AI panel (below its top line): Studio's own chat list */}
      {open && (
        <>
          <div className="absolute inset-x-0 bottom-0 top-[35px] z-40 bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-0 top-[35px] z-50 w-[300px] max-w-[88%] flex flex-col bg-background border-r border-border shadow-xl">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SidebarProvider defaultOpen className="!min-h-0 h-auto">
                <div className="w-full">
                  <AgentNestedMenu />
                </div>
              </SidebarProvider>
            </div>
            <div className="border-t border-border p-1.5">
              <button type="button" onClick={() => { setOpen(false); desk()?.openSettings?.(); }} className="flex items-center gap-2 w-full h-9 px-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Settings className="size-4" /> Settings
              </button>
            </div>
          </div>
        </>
      )}

      {/* The right side box (Files Changed, Uploads), inside the AI panel */}
      {side && sideOpen && (
        <div className="absolute right-0 bottom-0 top-[35px] z-30 w-[280px] max-w-[85%] flex flex-col bg-background border-l border-border shadow-xl">
          {side}
        </div>
      )}
    </>
  );
}
