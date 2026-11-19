// Settings > Archived chats (owner, 2026-11-19: "settings has no archived chats"): every chat you archived, from Agent,
// Studio and your projects, in one list. Open one, bring it back to your chats, or delete it for good.
// (the chat menu's own "Archived chats" box, StudioChatMenu.tsx, still shows only the open project's)
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArchiveRestore, Search, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const DESKTOP = import.meta.env.VITE_DESKTOP === "1" || import.meta.env.VITE_EDITOR === "1";

type Chat = { id: string; title?: string; created_at: string; updated_at?: string; project_id?: string; project_name?: string };

async function call(path: string, init?: RequestInit) {
  const res = await fetchWithRescue(`${backendUrl}/api/ai${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const cleanTitle = (t: unknown) => String(t || "").replace(/\*\*Title:\*\*/gi, "").replace(/Title:/gi, "").replace(/["']/g, "").trim();
const dateText = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

export function SettingsArchivedChatsSection() {
  const navigate = useNavigate();
  const [list, setList] = useState<Chat[] | null>(null);
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Chat | null>(null);
  const [deleting, setDeleting] = useState(false);

  // All archived chats (no mode: Agent and Studio), plus the project list's answer for each chat's project name
  const load = useCallback(async () => {
    const [all, projects] = await Promise.all([
      call("/sessions?archived=1").catch(() => null),
      call("/sessions?archived=1&project=all&studio=1").catch(() => null),
    ]);
    const byId = new Map<string, Chat>();
    for (const s of (all?.res.ok ? all.data.sessions : []) || []) if (s?.id) byId.set(s.id, s);
    for (const s of (projects?.res.ok ? projects.data.sessions : []) || []) if (s?.id) byId.set(s.id, { ...byId.get(s.id), ...s });
    if (!all?.res.ok && !projects?.res.ok) toast.error("Could not load your archived chats");
    setList([...byId.values()].sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at))));
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list || []).filter((c) => !q || cleanTitle(c.title).toLowerCase().includes(q) || String(c.project_name || "").toLowerCase().includes(q));
  }, [list, query]);

  const openChat = (c: Chat) => {
    if (c.project_id) {
      try { localStorage.setItem("cg_project_open", c.project_id); sessionStorage.setItem("cg_project_open", c.project_id); } catch { /* storage blocked */ }
      navigate(`/c/studio/project/${c.id}`);
    } else {
      navigate(`${DESKTOP ? "/c/studio" : "/c/agent"}/${c.id}`);
    }
  };

  // The chat leaves this list at once; the server is told behind (it comes back if that fails)
  const unarchive = async (c: Chat) => {
    const before = list;
    setList((l) => (l || []).filter((x) => x.id !== c.id));
    toast.success("Back in your chats");
    const { res, data } = await call(`/sessions/${c.id}/archive`, { method: "POST", body: JSON.stringify({ archived: false }) });
    if (!res.ok) { setList(before); toast.error(data.error || "Could not bring the chat back"); return; }
    window.dispatchEvent(new Event("agent:refresh-sessions"));
  };

  const remove = async () => {
    if (!toDelete) return;
    const c = toDelete;
    setDeleting(true);
    const { res, data } = await call(`/sessions/${c.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error(data.error || "Could not delete the chat"); return; }
    setList((l) => (l || []).filter((x) => x.id !== c.id));
    setToDelete(null);
    toast.success("Chat deleted");
  };

  const btn = "h-8 px-3 rounded-full text-[12.5px] font-medium border border-border hover:bg-muted cursor-pointer flex items-center gap-1.5";

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Archived chats</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Chats you archived are hidden from your chat list but not deleted. Bring one back any time.</p>

      {list && list.length > 6 && (
        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search archived chats"
            className="w-full h-9 pl-9 pr-3 rounded-full bg-muted/60 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card mt-5 divide-y divide-border">
        {list === null ? (
          <div className="p-5 flex flex-col gap-3">{[70, 55, 65].map((w, i) => <Skeleton key={i} className="h-4 rounded" style={{ width: `${w}%` }} />)}</div>
        ) : !shown.length ? (
          <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">{query ? "No archived chats match your search." : "You have no archived chats."}</p>
        ) : shown.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => openChat(c)} className="flex-1 min-w-0 text-left cursor-pointer group">
              <span className="block truncate text-sm text-foreground group-hover:underline underline-offset-2">{cleanTitle(c.title) || "Untitled chat"}</span>
              <span className="block text-[12px] text-muted-foreground truncate">
                {dateText(c.created_at)}{c.project_name ? ` · ${c.project_name}` : ""}
              </span>
            </button>
            <button type="button" onClick={() => unarchive(c)} className={btn} title="Bring back to your chats">
              <ArchiveRestore className="size-3.5" /><span className="hidden sm:inline">Unarchive</span>
            </button>
            <button type="button" onClick={() => setToDelete(c)} title="Delete"
              className="size-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-500 cursor-pointer">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <DangerConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => { if (!o && !deleting) setToDelete(null); }}
        title="Delete this chat?"
        description={toDelete ? `"${cleanTitle(toDelete.title) || "Untitled chat"}"` : undefined}
        warningMessage="The chat and all its messages are deleted for good. This can't be undone."
        actionLabel="Delete"
        isLoading={deleting}
        onConfirm={remove}
      />
    </div>
  );
}
