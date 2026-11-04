// Classgrid Code's AI panel top line (classgrid-editor): the project / chat name, the chats sidebar button, the chat
// search (our same search, in the middle of the window) and + for a new chat. The chats sidebar opens inside the AI
// panel itself, not in the editor's own sidebar: New Conversation, your conversations with their project, and
// Settings (the same Settings tab as the gear in the title bar).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, PanelLeft, Pin, Plus, Search, Settings } from "lucide-react";
import { fetchWithRescue } from "@/lib/rescue";
import { cn } from "@/lib/utils";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
type Chat = { id: string; title: string; created_at: string; pinned?: boolean; project_id?: string; project_name?: string };
type EditorDesktop = { editorFolder?: string | null; openSettings?: () => Promise<unknown> };
const desk = () => (window as unknown as { classgridDesktop?: EditorDesktop }).classgridDesktop;

const cleanTitle = (t: string) => (t || "New Chat").replace(/\*\*Title:\*\*/gi, "").replace(/Title:/gi, "").replace(/["']/g, "").trim();
function shortAge(at: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  if (mins < 60 * 24 * 30) return `${Math.floor(mins / (60 * 24))}d`;
  if (mins < 60 * 24 * 365) return `${Math.floor(mins / (60 * 24 * 30))}mo`;
  return `${Math.floor(mins / (60 * 24 * 365))}y`;
}
const folderName = (p?: string | null) => (p ? p.split(/[\\/]/).filter(Boolean).pop() || p : "");

const iconButton = "flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors";

export function EditorChatHeader({ sessionId }: { sessionId: string | null }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<Chat[] | null>(null);

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
  useEffect(() => { if (open) load(); }, [open, load]);
  // (the new chat's title arrives a moment after it starts)
  useEffect(() => { if (sessionId && chats && !chats.some((c) => c.id === sessionId)) { const t = setTimeout(load, 1500); return () => clearTimeout(t); } }, [sessionId, chats, load]);

  const current = chats?.find((c) => c.id === sessionId);
  const project = current?.project_name ? folderName(current.project_name) : folderName(desk()?.editorFolder);
  const title = current ? cleanTitle(current.title) : "New chat";

  const sorted = useMemo(() => [...(chats || [])].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || +new Date(b.created_at) - +new Date(a.created_at)), [chats]);

  const newChat = () => {
    setOpen(false);
    navigate("/editor/project");
    window.dispatchEvent(new Event("agent:new-chat"));
  };
  const openChat = (id: string) => { setOpen(false); navigate(`/editor/project/${id}`); };
  const togglePin = async (c: Chat) => {
    setChats((list) => (list || []).map((x) => (x.id === c.id ? { ...x, pinned: !c.pinned } : x)));
    try {
      await fetchWithRescue(`${backendUrl}/api/ai/sessions/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinned: !c.pinned }), credentials: "include" });
      window.dispatchEvent(new Event("agent:refresh-sessions"));
    } catch { load(); }
  };

  return (
    <>
      <div className="flex items-center gap-1 h-9 px-2 shrink-0 shadow-[inset_0_-1px_0_var(--border)]">
        <button type="button" onClick={() => setOpen((o) => !o)} className={iconButton} title="Chats" aria-label="Chats">
          <PanelLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0 truncate text-[13px] px-1">
          {project && <span className="text-muted-foreground">{project} / </span>}
          <span className="text-foreground font-medium">{title}</span>
        </div>
        <button type="button" onClick={() => window.dispatchEvent(new Event("agent:open-search-palette"))} className={iconButton} title="Search chats" aria-label="Search chats">
          <Search className="size-4" />
        </button>
        <button type="button" onClick={newChat} className={iconButton} title="New chat" aria-label="New chat">
          <Plus className="size-4" />
        </button>
      </div>

      {/* The chats sidebar, inside the AI panel (below its top line) */}
      {open && (
        <>
          <div className="absolute inset-x-0 bottom-0 top-9 z-40 bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-0 top-9 z-50 w-[280px] max-w-[85%] flex flex-col bg-background border-r border-border shadow-xl">
            <div className="p-2.5">
              <button type="button" onClick={newChat} className="flex items-center gap-2 w-full h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted transition-colors">
                <Plus className="size-4" /> New Conversation
              </button>
            </div>
            <div className="px-3.5 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">Conversations</div>
            <div className="flex-1 min-h-0 overflow-y-auto px-1.5 pb-2">
              {chats === null && <div className="px-2.5 py-2 text-xs text-muted-foreground">Loading…</div>}
              {chats !== null && sorted.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">No conversations yet</div>}
              {sorted.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openChat(c.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") openChat(c.id); }}
                  className={cn("group relative rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors", c.id === sessionId ? "bg-muted" : "hover:bg-muted/60")}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 truncate text-[13px]">{cleanTitle(c.title)}</span>
                    {c.pinned && <Pin className="size-3 text-muted-foreground group-hover:hidden" />}
                    <span className="text-[11px] text-muted-foreground group-hover:hidden">{shortAge(c.created_at)}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); togglePin(c); }}
                      className="hidden group-hover:flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground"
                      title={c.pinned ? "Unpin" : "Pin"}
                      aria-label={c.pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className={cn("size-3.5", c.pinned && "fill-current")} />
                    </button>
                  </div>
                  {c.project_name && (
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground truncate">
                      <Folder className="size-3 shrink-0" /> <span className="truncate">{folderName(c.project_name)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border p-1.5">
              <button type="button" onClick={() => { setOpen(false); desk()?.openSettings?.(); }} className="flex items-center gap-2 w-full h-9 px-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Settings className="size-4" /> Settings
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
