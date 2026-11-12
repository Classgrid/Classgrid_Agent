// Studio's chat top bar, next to the sidebar button (website and desktop app), like Antigravity: "project / chat".
// The project opens the Project tab; the chat's name opens a short list of that project's other chats to switch to.
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/marketing_ui/dropdown-menu";
import { fetchWithRescue } from "@/lib/rescue";
import { useChatId } from "./StudioShotsView";
import { savedProject } from "../utils/projectCopies";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
type Chat = { id: string; title?: string | null; project_id?: string | null; project_name?: string | null; created_at?: string; updated_at?: string };

// The last list, kept while the app runs, so the bar shows at once when moving between chats
let lastChats: Chat[] = [];
const cleanTitle = (t?: string | null) => String(t || "New chat").replace(/\*\*Title:\*\*|Title:/gi, "").replace(/["']/g, "").trim() || "New chat";
const folderName = (name?: string | null) => String(name || "").split(/[\\/]/).filter(Boolean).pop() || name || "";

export function StudioChatCrumb() {
  const chatId = useChatId();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [chats, setChats] = useState<Chat[]>(lastChats);
  const [openProject, setOpenProject] = useState<string | null>(() => { try { return sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open"); } catch { return null; } });

  useEffect(() => {
    let off = false;
    const load = () => fetchWithRescue(`${backendUrl}/api/ai/sessions?project=all&studio=1`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!off && Array.isArray(d?.sessions)) { lastChats = d.sessions; setChats(d.sessions); } })
      .catch(() => {});
    load();
    // (a new chat, a new title, or a chat moved to a project)
    window.addEventListener("agent:refresh-sessions", load);
    const onProject = (e: Event) => setOpenProject((e as CustomEvent<{ projectId: string | null }>).detail?.projectId ?? null);
    window.addEventListener("studio:project-changed", onProject);
    return () => { off = true; window.removeEventListener("agent:refresh-sessions", load); window.removeEventListener("studio:project-changed", onProject); };
  }, [chatId]);

  const chat = chats.find((c) => c.id === chatId) || null;
  const projectId = chat ? chat.project_id || null : openProject;
  const projectName = folderName(chat?.project_name || (projectId ? savedProject(projectId)?.name : null)) || (projectId ? "Project" : "No project");
  // The same project's chats, newest first (or the chats with no project)
  const siblings = useMemo(() => chats
    .filter((c) => (c.project_id || null) === projectId)
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .slice(0, 30), [chats, projectId]);

  const base = (() => { const parts = pathname.split("/"); const at = parts.indexOf("studio"); return at === -1 ? "/c/studio" : parts.slice(0, at + 1).join("/"); })();
  const crumb = "min-w-0 truncate rounded-md px-1.5 py-0.5 text-[13.5px] transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06] cursor-pointer";

  return (
    <div className="studio-chat-crumb flex items-center gap-0.5 min-w-0 max-w-[min(32rem,calc(100%-3rem))]">
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("studio:open-tab", { detail: { kind: "project" } }))} className={`${crumb} shrink-0 max-w-[12rem] text-muted-foreground hover:text-foreground`} title="Open the Project tab">
        {projectName}
      </button>
      <span className="shrink-0 text-muted-foreground/60">/</span>
      {chatId ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={`${crumb} inline-flex items-center gap-1 text-foreground data-[state=open]:bg-black/[0.05] dark:data-[state=open]:bg-white/[0.06]`}>
              <span className="truncate">{cleanTitle(chat?.title)}</span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          {/* (a short list that stays inside the chat column) */}
          <DropdownMenuContent align="start" sideOffset={6} className="w-72 max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto z-[100] bg-white dark:bg-[#202123] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl [scrollbar-width:thin]">
            {/* A new chat in this same project, first in the list (owner, 2026-11-12: like the video's top bar) */}
            <DropdownMenuItem onClick={() => { navigate(base); window.dispatchEvent(new Event("agent:new-chat")); }} className="flex items-center gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1] rounded-xl transition-colors">
              <Plus className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">New chat</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-slate-200 dark:bg-white/10" />
            {siblings.length ? siblings.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => { if (c.id !== chatId) navigate(`${base}/${c.id}`); }} className="flex items-center gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1] rounded-xl transition-colors">
                <span className="min-w-0 flex-1 truncate">{cleanTitle(c.title)}</span>
                {c.id === chatId && <Check className="size-3.5 shrink-0" />}
              </DropdownMenuItem>
            )) : <div className="px-3 py-2 text-[14px] text-slate-500 dark:text-white/60">No other chats yet</div>}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="min-w-0 truncate px-1.5 text-[13.5px] text-muted-foreground">New chat</span>
      )}
    </div>
  );
}
