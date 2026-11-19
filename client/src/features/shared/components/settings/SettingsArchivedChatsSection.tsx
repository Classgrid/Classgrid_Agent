// Settings > Archived chats (owner, 2026-11-19: "settings has no archived chats"; then "same as ChatGPT's"): every
// chat you archived, from Agent, Studio and your projects, in one list grouped by project, with search, a sort (last
// updated, created, A to Z) and a filter by project. Open one, bring it back to your chats, or delete it for good.
// (the chat menu's own "Archived chats" box, StudioChatMenu.tsx, still shows only the open project's)
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpDown, Check, ChevronDown, Folder, MessageSquare, Search } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/marketing_ui/dropdown-menu";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const DESKTOP = import.meta.env.VITE_DESKTOP === "1" || import.meta.env.VITE_EDITOR === "1";

type Chat = { id: string; title?: string; created_at: string; updated_at?: string; project_id?: string; project_name?: string };
type SortBy = "updated" | "created" | "az";
const NO_PROJECT = "__none__";

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
const whenOf = (c: Chat, sort: SortBy) => (sort === "created" ? c.created_at : c.updated_at || c.created_at);
// "Jul 9, 2026, 9:40 AM"
const dateTimeText = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};
const SORTS: { id: SortBy; label: string }[] = [
  { id: "updated", label: "Updated" },
  { id: "created", label: "Created" },
  { id: "az", label: "Alphabetical" },
];

export function SettingsArchivedChatsSection() {
  const navigate = useNavigate();
  const [list, setList] = useState<Chat[] | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortBy>("updated");
  const [place, setPlace] = useState<string>("all"); // "all", NO_PROJECT or a project id
  const [toDelete, setToDelete] = useState<Chat | null>(null);
  const [deleting, setDeleting] = useState(false);

  // All archived chats (no mode: Agent and Studio; studio=1 adds when each last had a message), plus the project
  // list's answer for each chat's project name
  const load = useCallback(async () => {
    const [all, projects] = await Promise.all([
      call("/sessions?archived=1&studio=1").catch(() => null),
      call("/sessions?archived=1&project=all&studio=1").catch(() => null),
    ]);
    const byId = new Map<string, Chat>();
    for (const s of (all?.res.ok ? all.data.sessions : []) || []) if (s?.id) byId.set(s.id, s);
    for (const s of (projects?.res.ok ? projects.data.sessions : []) || []) if (s?.id) byId.set(s.id, { ...byId.get(s.id), ...s });
    if (!all?.res.ok && !projects?.res.ok) toast.error("Could not load your archived chats");
    setList([...byId.values()]);
  }, []);
  useEffect(() => { load(); }, [load]);

  // The projects that have archived chats, for the filter
  const projectsInList = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of list || []) if (c.project_id) m.set(c.project_id, c.project_name || "Project");
    return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [list]);

  // Filtered, sorted and grouped by project ("No project" first, then the projects A to Z)
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = (list || []).filter((c) => {
      if (place === NO_PROJECT && c.project_id) return false;
      if (place !== "all" && place !== NO_PROJECT && c.project_id !== place) return false;
      return !q || cleanTitle(c.title).toLowerCase().includes(q) || String(c.project_name || "").toLowerCase().includes(q);
    });
    shown.sort((a, b) => (sort === "az"
      ? (cleanTitle(a.title) || "Untitled chat").localeCompare(cleanTitle(b.title) || "Untitled chat")
      : String(whenOf(b, sort)).localeCompare(String(whenOf(a, sort)))));
    const byGroup = new Map<string, { key: string; name: string; chats: Chat[] }>();
    for (const c of shown) {
      const key = c.project_id || NO_PROJECT;
      if (!byGroup.has(key)) byGroup.set(key, { key, name: c.project_id ? c.project_name || "Project" : "No project", chats: [] });
      byGroup.get(key)!.chats.push(c);
    }
    return [...byGroup.values()].sort((a, b) => (a.key === NO_PROJECT ? -1 : b.key === NO_PROJECT ? 1 : a.name.localeCompare(b.name)));
  }, [list, query, sort, place]);

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

  const placeLabel = place === "all" ? "All projects" : place === NO_PROJECT ? "No project" : projectsInList.find((p) => p.id === place)?.name || "Project";
  const pill = "h-9 px-3.5 rounded-full border border-border bg-muted/40 hover:bg-muted text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap";
  const textBtn = "h-8 px-3.5 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap";
  const total = (list || []).length;

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Archived chats</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Find chats you've archived and bring back the ones you want to keep using.</p>

      {/* Search, sort and project filter */}
      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search archived chats"
            className="w-full h-9 pl-10 pr-3 rounded-full bg-muted/40 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className={pill}>
              <ArrowUpDown className="size-3.5" />{SORTS.find((s) => s.id === sort)?.label}<ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {SORTS.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => setSort(s.id)}>
                  <span className="flex-1">{s.label}</span>{sort === s.id && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className={pill}>
              <Folder className="size-3.5" /><span className="max-w-[140px] truncate">{placeLabel}</span><ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setPlace("all")}>
                <span className="flex-1">All projects</span>{place === "all" && <Check className="size-4" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPlace(NO_PROJECT)}>
                <MessageSquare className="size-4" /><span className="flex-1">No project</span>{place === NO_PROJECT && <Check className="size-4" />}
              </DropdownMenuItem>
              {projectsInList.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setPlace(p.id)}>
                  <Folder className="size-4" /><span className="flex-1 truncate">{p.name}</span>{place === p.id && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* The chats, under their project */}
      <div className="mt-6">
        {list === null ? (
          <div className="flex flex-col gap-3">{[70, 55, 65].map((w, i) => <Skeleton key={i} className="h-4 rounded" style={{ width: `${w}%` }} />)}</div>
        ) : !groups.length ? (
          <p className="py-12 text-center text-[13px] text-muted-foreground">
            {total === 0 ? "You have no archived chats." : "No archived chats match."}
          </p>
        ) : groups.map((g) => (
          <section key={g.key} className="mb-6">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <Folder className="size-4 shrink-0 text-muted-foreground" />
                <h3 className="text-[15px] font-semibold text-foreground truncate">{g.name}</h3>
              </div>
              <span className="text-[13px] text-muted-foreground shrink-0">{g.chats.length} chat{g.chats.length === 1 ? "" : "s"}</span>
            </div>
            <div className="divide-y divide-border">
              {g.chats.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <button type="button" onClick={() => openChat(c)} className="flex-1 min-w-0 text-left cursor-pointer group">
                    <span className="block truncate text-sm font-medium text-[#3b82f6] group-hover:underline underline-offset-2">{cleanTitle(c.title) || "Untitled chat"}</span>
                    <span className="block text-[12px] text-muted-foreground truncate tabular-nums">{dateTimeText(whenOf(c, sort))}</span>
                  </button>
                  <button type="button" onClick={() => unarchive(c)} className={`${textBtn} bg-muted/60 hover:bg-muted text-foreground`}>Unarchive</button>
                  <button type="button" onClick={() => setToDelete(c)} className={`${textBtn} bg-red-500/10 hover:bg-red-500/20 text-red-500`}>Delete</button>
                </div>
              ))}
            </div>
          </section>
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
