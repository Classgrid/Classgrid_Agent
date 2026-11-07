// Chat groups in Project and Studio Mode: each project has its own groups (a name, an icon, pinned or not), and Studio
// with no project open has its own too. A chat is in at most one. Used by the left sidebar and by the chat's ⋮ menu; both refresh on "classgrid:chat-groups-changed".
import { useEffect, useState } from "react";
import {
  Book, Bookmark, Briefcase, Bug, Camera, Check, Code, Coffee, Flag, Flame, Folder, FolderMinus, FolderPlus, Globe, Heart,
  Lightbulb, Music, Rocket, Shield, Sparkles, Star, Target, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/marketing_ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/marketing_ui/dialog";
import { fetchWithRescue } from "@/lib/rescue";
import { cn } from "@/lib/utils";

export interface GroupChat { id: string; title: string; created_at: string; pinned?: boolean }
export interface ChatGroup { id: string; projectId: string | null; name: string; icon: string; pinned: boolean; chats: GroupChat[] }

export const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  folder: Folder, star: Star, heart: Heart, zap: Zap, rocket: Rocket, code: Code, bug: Bug, book: Book, briefcase: Briefcase, flag: Flag,
  bookmark: Bookmark, lightbulb: Lightbulb, target: Target, flame: Flame, coffee: Coffee, music: Music, camera: Camera, globe: Globe, shield: Shield, sparkles: Sparkles,
};
export const groupIcon = (id?: string) => GROUP_ICONS[id || ""] || Folder;

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const CHANGED = "classgrid:chat-groups-changed";

/** The project open in Project / Studio Mode, or null (Agent Mode, or no project open) */
export function openProjectId(): string | null {
  if (!window.location.pathname.split("/").some((x) => x === "studio" || x === "project")) return null;
  try { return sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open"); } catch { return null; }
}

async function call(path: string, init?: RequestInit) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide/groups${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  window.dispatchEvent(new Event(CHANGED)); // also after a failure: the lists go back to what the server has
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

// A change shows in every list at once (patchGroups), before the server answers; the answer then replaces it
const PATCH = "classgrid:chat-groups-patch";
const patchGroups = (fn: (list: ChatGroup[]) => ChatGroup[]) => window.dispatchEvent(new CustomEvent(PATCH, { detail: fn }));
export const groupsApi = {
  create: (project: string | null, body: { name: string; icon: string; sessionId?: string }) => call("", { method: "POST", body: JSON.stringify({ ...body, project: project || "none" }) }),
  update: (id: string, body: Partial<Pick<ChatGroup, "name" | "icon" | "pinned">>) => {
    patchGroups((list) => list.map((g) => (g.id === id ? { ...g, ...body } : g)));
    return call(`/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  remove: (id: string) => {
    patchGroups((list) => list.filter((g) => g.id !== id));
    return call(`/${id}`, { method: "DELETE" });
  },
  setChat: (id: string, sessionId: string, add: boolean) => {
    // the chat leaves its old group at once; the group it joins gets it with the server's answer
    patchGroups((list) => list.map((g) => (g.chats.some((c) => c.id === sessionId) && (!add || g.id !== id) ? { ...g, chats: g.chats.filter((c) => c.id !== sessionId) } : g)));
    return call(`/${id}/chats`, { method: "PUT", body: JSON.stringify({ sessionId, add }) });
  },
};

/** The groups of the open project (or, with no project open, the groups made without one), kept fresh */
export function useChatGroups(enabled: boolean, project: string | null) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  useEffect(() => {
    if (!enabled) { setGroups([]); return; }
    let alive = true;
    const load = () => fetchWithRescue(`${backendUrl}/api/ide/groups?project=${project || "none"}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { groups: [] }))
      .then((d) => { if (alive) setGroups(Array.isArray(d.groups) ? d.groups : []); })
      .catch(() => {});
    load();
    const patch = (e: Event) => { const fn = (e as CustomEvent<(list: ChatGroup[]) => ChatGroup[]>).detail; if (alive && typeof fn === "function") setGroups((l) => fn(l)); };
    window.addEventListener(PATCH, patch);
    window.addEventListener(CHANGED, load);
    window.addEventListener("agent:refresh-sessions", load);
    return () => { alive = false; window.removeEventListener(PATCH, patch); window.removeEventListener(CHANGED, load); window.removeEventListener("agent:refresh-sessions", load); };
  }, [enabled, project]);
  return groups;
}

const dialogCls = "gap-0 p-0 overflow-hidden rounded-xl bg-white dark:!bg-[#1e1e1e] ring-black/10 dark:ring-white/10 shadow-2xl";
const btn = "h-8 px-3 rounded-md text-[13px] transition-[background-color,opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";

/** New group (optionally with a chat put in it at once), or change a group's name and icon */
export function GroupDialog({ open, project, group, sessionId, onClose }: { open: boolean; project: string | null; group?: ChatGroup | null; sessionId?: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("folder");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(group?.name || ""); setIcon(group?.icon || "folder"); } }, [open, group]);
  const save = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      if (group) await groupsApi.update(group.id, { name: n, icon });
      else await groupsApi.create(project, { name: n, icon, sessionId });
      toast.success(group ? "Group saved" : sessionId ? `Added to ${n}` : "Group created");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Could not save the group");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent showCloseButton={false} overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-none" className={`sm:max-w-[24rem] ${dialogCls}`}>
        <div className="px-5 pt-4 pb-3">
          <DialogTitle className="text-[15px] font-medium">{group ? "Edit group" : "New group"}</DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">Groups keep this project's chats together in your list.</DialogDescription>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <input
            autoFocus
            data-no-ring
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            maxLength={60}
            placeholder="Group name"
            className="w-full h-9 px-3 rounded-md border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#161616] text-[13px] outline-none focus:border-black/30 dark:focus:border-white/25"
          />
          <div>
            <p className="text-[12px] text-muted-foreground mb-2">Icon</p>
            <div className="grid grid-cols-10 gap-1">
              {Object.entries(GROUP_ICONS).map(([id, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIcon(id)}
                  title={id}
                  className={cn("h-8 w-full rounded-md flex items-center justify-center transition-colors",
                    icon === id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-foreground")}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1a1a1a]">
          <button type="button" onClick={onClose} className={`${btn} border border-black/10 dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]`}>Cancel</button>
          <button type="button" onClick={save} disabled={!name.trim() || busy} className={`${btn} bg-foreground text-background font-medium hover:opacity-90`}>{busy ? "Saving…" : group ? "Save" : "Create"}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const subItem = "gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1] rounded-xl transition-colors";
const subIcon = "w-4 h-4 shrink-0 text-slate-500 dark:text-white/70";
const subCard = "z-[101] bg-white dark:bg-[#202123] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl";

/** "Add to group" in a chat's menu: New group, the groups shown in the sidebar (the chat's own one ticked) and Remove from group */
export function AddToGroupSub({ sessionId, groups, onNewGroup, triggerClassName }: {
  sessionId: string; groups: ChatGroup[]; onNewGroup: () => void; triggerClassName?: string;
}) {
  const current = groups.find((g) => g.chats.some((c) => c.id === sessionId));
  const move = (g: ChatGroup, add: boolean) => groupsApi.setChat(g.id, sessionId, add)
    .then(() => toast.success(add ? `Added to ${g.name}` : `Removed from ${g.name}`))
    .catch((e) => toast.error(e?.message || "Could not change the group"));
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn(subItem, "data-popup-open:bg-slate-100 dark:data-popup-open:bg-[#343541]", triggerClassName)}>
        <FolderPlus className={subIcon} strokeWidth={2} />
        {current ? "Move to group" : "Add to group"}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent sideOffset={8} className={`w-[210px] max-h-[340px] overflow-y-auto ${subCard}`}>
        <DropdownMenuItem className={subItem} onClick={onNewGroup}>
          <FolderPlus className={subIcon} strokeWidth={2} /> New group
        </DropdownMenuItem>
        {groups.length > 0 && <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />}
        {groups.map((g) => {
          const Icon = groupIcon(g.icon);
          return (
            <DropdownMenuItem key={g.id} className={subItem} onClick={() => { if (current?.id !== g.id) move(g, true); }}>
              <Icon className={subIcon} strokeWidth={2} />
              <span className="flex-1 min-w-0 truncate">{g.name}</span>
              {current?.id === g.id && <Check className="w-4 h-4 shrink-0" strokeWidth={2} />}
            </DropdownMenuItem>
          );
        })}
        {current && (
          <>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1.5 mx-1" />
            <DropdownMenuItem className={subItem} onClick={() => move(current, false)}>
              <FolderMinus className={subIcon} strokeWidth={2} /> Remove from group
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
