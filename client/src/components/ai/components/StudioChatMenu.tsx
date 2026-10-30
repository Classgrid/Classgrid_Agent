// The chat's ⋮ menu in every mode (Agent, Project, Studio): Rename, Pin, Archive, Archived chats, Copy and Delete
// (plus "Files in chat" where the chat has that panel). Same look as the sidebar's chat menu.
import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Copy, Link2, MoreVertical, Pencil, Pin, Trash2, FileText, Hash } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/marketing_ui/dialog";
import { fetchWithRescue } from "@/lib/rescue";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/marketing_ui/tooltip";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const item = "gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1] rounded-xl transition-colors";
const icon = "w-4 h-4 text-slate-500 dark:text-white/70";
const card = "z-[100] bg-white dark:bg-[#202123] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl";

type Msg = { role: string; content: string };

async function call(path: string, init?: RequestInit) {
  const res = await fetchWithRescue(`${backendUrl}/api/ai${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// The mode part of the address (/c/agent, /c/project or /c/studio), so chats open in the same mode
function modeBase() {
  const parts = window.location.pathname.split("/");
  const at = ["studio", "project", "agent"].map((m) => parts.indexOf(m)).find((i) => i !== -1);
  return at !== undefined ? parts.slice(0, at + 1).join("/") : "/c/agent";
}
const inProject = () => window.location.pathname.split("/").some((x) => x === "studio" || x === "project");

// Back to a new chat in the same mode (after archiving the open chat)
function goToNewChat() {
  window.history.pushState({}, "", modeBase());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.dispatchEvent(new Event("agent:new-chat"));
}

export function StudioChatMenu({ sessionId, isPinned, onTogglePin, onDelete, messages, onFilesInChat }: {
  sessionId: string; isPinned: boolean; onTogglePin: () => void; onDelete: () => void; messages: Msg[]; onFilesInChat?: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${what} copied`); } catch { toast.error("Could not copy"); }
  };
  const chatText = () => messages
    .filter((m) => m.content?.trim())
    .map((m) => `**${m.role === "user" ? "You" : "Classgrid AI"}:**\n\n${m.content.trim()}`)
    .join("\n\n---\n\n");

  const archive = async () => {
    const { res, data } = await call(`/sessions/${sessionId}/archive`, { method: "POST", body: JSON.stringify({ archived: true }) });
    if (!res.ok) { toast.error(data.error || "Could not archive the chat"); return; }
    toast.success("Chat archived");
    window.dispatchEvent(new Event("agent:refresh-sessions"));
    goToNewChat();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer" aria-label="Chat options">
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className={`w-[200px] ${card}`}>
          {onFilesInChat && (
            <DropdownMenuItem className={item} onClick={onFilesInChat}>
              <FileText className={icon} strokeWidth={2} /> Files in chat
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className={item} onClick={() => setRenaming(true)}>
            <Pencil className={icon} strokeWidth={2} /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onClick={onTogglePin}>
            <Pin className={icon} strokeWidth={2} /> {isPinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onClick={archive}>
            <Archive className={icon} strokeWidth={2} /> Archive
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onClick={() => setShowArchived(true)}>
            <ArchiveRestore className={icon} strokeWidth={2} /> Archived chats
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1" />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={item}>
              <Copy className={icon} strokeWidth={2} /> Copy
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className={`w-[190px] ${card}`}>
              <DropdownMenuItem className={item} onClick={() => copy(window.location.href, "Link")}>
                <Link2 className={icon} strokeWidth={2} /> Copy link
              </DropdownMenuItem>
              <DropdownMenuItem className={item} onClick={() => copy(chatText(), "Chat")}>
                <FileText className={icon} strokeWidth={2} /> Copy chat
              </DropdownMenuItem>
              <DropdownMenuItem className={item} onClick={() => copy(sessionId, "Chat ID")}>
                <Hash className={icon} strokeWidth={2} /> Copy chat ID
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1" />
          <DropdownMenuItem className={`${item} text-[#ef4444] focus:text-[#ef4444] dark:focus:text-[#ef4444] focus:bg-red-50 dark:focus:bg-red-500/10`} onClick={onDelete}>
            <Trash2 className="w-4 h-4" strokeWidth={2} /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameChatDialog sessionId={sessionId} open={renaming} onClose={() => setRenaming(false)} />
      <ArchivedChatsDialog open={showArchived} onClose={() => setShowArchived(false)} />
    </>
  );
}

const dialogCls = "gap-0 p-0 overflow-hidden rounded-xl bg-white dark:!bg-[#1e1e1e] ring-black/10 dark:ring-white/10 shadow-2xl";
const btn = "h-8 px-3 rounded-md text-[13px] transition-[background-color,opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";

function RenameChatDialog({ sessionId, open, onClose }: { sessionId: string; open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTitle("");
    call(`/sessions/${sessionId}`).then(({ data }) => setTitle(data.session?.title || "")).catch(() => {});
  }, [open, sessionId]);
  const save = async () => {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const { res, data } = await call(`/sessions/${sessionId}`, { method: "PUT", body: JSON.stringify({ title: t }) });
      if (!res.ok) { toast.error(data.error || "Could not rename the chat"); return; }
      window.dispatchEvent(new Event("agent:refresh-sessions"));
      toast.success("Renamed");
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent showCloseButton={false} overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-none" className={`sm:max-w-[22rem] ${dialogCls}`}>
        <div className="px-5 pt-4 pb-3">
          <DialogTitle className="text-[15px] font-medium">Rename chat</DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">The new name shows in your chat list.</DialogDescription>
        </div>
        <div className="px-5 pb-5">
          <input
            autoFocus
            data-no-ring
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            maxLength={120}
            className="w-full h-9 px-3 rounded-md border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#161616] text-[13px] outline-none focus:border-black/30 dark:focus:border-white/25"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1a1a1a]">
          <button type="button" onClick={onClose} className={`${btn} border border-black/10 dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]`}>Cancel</button>
          <button type="button" onClick={save} disabled={!title.trim() || busy} className={`${btn} bg-foreground text-background font-medium hover:opacity-90`}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// The open project's archived chats (Studio and Project Mode share them): open one, or bring it back to the list
function ArchivedChatsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [list, setList] = useState<{ id: string; title: string; created_at: string }[] | null>(null);
  const load = async () => {
    let project: string | null = null;
    if (inProject()) { try { project = sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open"); } catch { /* storage blocked */ } }
    const { res, data } = await call(`/sessions?archived=1${project ? `&project=${project}` : "&mode=agent"}`);
    setList(res.ok ? data.sessions || [] : []);
  };
  useEffect(() => { if (open) { setList(null); load(); } }, [open]);
  const unarchive = async (id: string) => {
    const { res, data } = await call(`/sessions/${id}/archive`, { method: "POST", body: JSON.stringify({ archived: false }) });
    if (!res.ok) { toast.error(data.error || "Could not bring the chat back"); return; }
    setList((l) => (l || []).filter((x) => x.id !== id));
    window.dispatchEvent(new Event("agent:refresh-sessions"));
    toast.success("Back in your chats");
  };
  const openChat = (id: string) => {
    window.history.pushState({}, "", `${modeBase()}/${id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent showCloseButton={false} overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-none" className={`sm:max-w-[28rem] ${dialogCls}`}>
        <div className="px-5 pt-4 pb-3 border-b border-black/10 dark:border-white/[0.08]">
          <DialogTitle className="text-[15px] font-medium">Archived chats</DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">{inProject() ? "This project's archived chats." : "Your archived chats."} They are not deleted.</DialogDescription>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {list === null ? (
            <div className="p-3 flex flex-col gap-2">{[70, 55, 65].map((w, i) => <div key={i} className="h-4 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />)}</div>
          ) : !list.length ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">No archived chats.</p>
          ) : list.map((c) => (
            <div key={c.id} className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
              <button type="button" onClick={() => openChat(c.id)} className="flex-1 min-w-0 text-left">
                <span className="block truncate text-[13px]">{c.title || "Untitled chat"}</span>
                <span className="block text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
              </button>
              <button type="button" onClick={() => unarchive(c.id)} className={`${btn} h-7 px-2.5 text-[12px] border border-black/10 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]`}>Unarchive</button>
            </div>
          ))}
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1a1a1a]">
          <button type="button" onClick={onClose} className={`${btn} border border-black/10 dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]`}>Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Studio: open this same chat in Project Mode (the same project and chat, with the code editor)
export function OpenInProjectButton({ sessionId }: { sessionId: string }) {
  const open = async () => {
    // The chat's own project opens (not just the projects list): ask which project this chat belongs to
    const { res, data } = await call(`/sessions/${sessionId}`).catch(() => ({ res: null as Response | null, data: {} as any }));
    const projectId = res?.ok ? data.projectId : null;
    if (projectId) {
      try { localStorage.setItem("cg_project_open", projectId); sessionStorage.setItem("cg_project_open", projectId); } catch { /* storage blocked */ }
    }
    const parts = window.location.pathname.split("/");
    const at = parts.indexOf("studio");
    const base = at !== -1 ? [...parts.slice(0, at), "project"].join("/") : "/c/project";
    window.history.pushState({}, "", `${base}/${sessionId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return (
    <TooltipProvider delay={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={open}
            aria-label="Open in Project Mode"
            className="flex items-center gap-1.5 h-8 pl-1.5 pr-2.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" aria-hidden="true">
              <rect width="24" height="24" rx="6" fill="#f97316" />
              <path d="M9.4 8.3L5.9 12l3.5 3.7M14.6 8.3l3.5 3.7-3.5 3.7M13.1 7l-2.2 10" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Open
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Open in Project Mode</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
