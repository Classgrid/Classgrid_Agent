// Studio's Agents tab: every chat the agent is working in right now, across all projects, and the latest chats of
// each project, so many agents can be watched from one place. Click a chat to open it.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Cloud, Folder, Laptop, Users } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { fetchWithRescue } from "@/lib/rescue";
import { onDesktop, savedProject, thisComputerCopy, type LocalCopy } from "../utils/projectCopies";

type Chat = { id: string; title: string; created_at: string; updated_at?: string; project_id?: string; project_name?: string; project_logo?: string | null };
type Project = { id: string; location?: "cloud" | "local"; localPath?: string | null; localCopies?: LocalCopy[] };
type Working = { sessionId: string; since: number; helpers: number; helpersOnly?: boolean };

const API = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const RECENT_PER_PROJECT = 6;

const ago = (t?: string | number) => {
  if (!t) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
};

export function StudioAgentsView() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [working, setWorking] = useState<Working[]>([]);
  // Where each project is (This PC or Cloud); the saved project list stands in until it loads
  const [places, setPlaces] = useState<Map<string, Project>>(new Map());
  const [, tick] = useState(0);

  useEffect(() => {
    let off = false;
    const loadChats = () => fetchWithRescue(`${API}/api/ai/sessions?project=all&studio=1`, { credentials: "include" })
      .then((r) => r.json()).then((d) => { if (!off && Array.isArray(d?.sessions)) setChats(d.sessions); }).catch(() => { if (!off) setChats((c) => c ?? []); });
    const loadWorking = () => fetchWithRescue(`${API}/api/ai/working`, { credentials: "include" })
      .then((r) => r.json()).then((d) => { if (!off && Array.isArray(d?.working)) setWorking(d.working); }).catch(() => {});
    loadChats();
    loadWorking();
    fetchWithRescue(`${API}/api/ide/projects`, { credentials: "include" })
      .then((r) => r.json()).then((d) => { if (!off && Array.isArray(d?.projects)) setPlaces(new Map(d.projects.map((p: Project) => [String(p.id), p]))); }).catch(() => {});
    const fast = setInterval(() => { loadWorking(); tick((n) => n + 1); }, 3000);
    const slow = setInterval(loadChats, 20000);
    return () => { off = true; clearInterval(fast); clearInterval(slow); };
  }, []);

  const projectOf = (id: string) => places.get(id) || (savedProject(id) as Project | null);
  // Desktop app: a project with a folder on this computer (a folder project, or a cloud project downloaded here)
  const onThisPc = (id: string) => { const p = projectOf(id); return !!p && (p.location === "local" || !!thisComputerCopy(p)); };
  // Website: a chat of a folder project (This PC) never shows; it lives only in the desktop app
  const hidden = (c: Chat | undefined) => !onDesktop() && !!c?.project_id && projectOf(c.project_id)?.location === "local";
  const byId = useMemo(() => new Map((chats || []).map((c) => [c.id, c])), [chats]);
  const busy = new Set(working.map((w) => w.sessionId));
  const shownWorking = working.filter((w) => !hidden(byId.get(w.sessionId)));
  const projects = useMemo(() => {
    const groups = new Map<string, { id: string | null; name: string; logo?: string | null; chats: Chat[] }>();
    for (const c of chats || []) {
      if (hidden(c)) continue;
      const key = c.project_id || "none";
      if (!groups.has(key)) groups.set(key, { id: c.project_id || null, name: c.project_name || "No project", logo: c.project_logo, chats: [] });
      groups.get(key)!.chats.push(c);
    }
    const when = (c: Chat) => new Date(c.updated_at || c.created_at).getTime();
    return [...groups.values()]
      .map((g) => ({ ...g, chats: g.chats.sort((a, b) => when(b) - when(a)).slice(0, RECENT_PER_PROJECT) }))
      .sort((a, b) => when(b.chats[0]!) - when(a.chats[0]!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, places]);
  // Desktop app: This PC and Cloud are two lists, never one (This PC first). Chats with no project come after them
  const sections = onDesktop()
    ? [
        { key: "pc", label: "This PC", list: projects.filter((p) => p.id && onThisPc(p.id)) },
        { key: "cloud", label: "Cloud", list: projects.filter((p) => p.id && !onThisPc(p.id)) },
        { key: "none", label: "", list: projects.filter((p) => !p.id) },
      ].filter((s) => s.list.length)
    : [{ key: "all", label: "", list: projects }];

  const open = (id: string) => navigate(`/c/studio/${id}`);
  const row = "w-full flex items-center gap-2.5 px-3 h-9 rounded-md text-left text-sm hover:bg-secondary transition-colors";

  if (!chats) return <div className="flex-1 flex items-center justify-center"><Spinner className="size-5" /></div>;
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
        <section>
          <h2 className="px-3 mb-1.5 text-xs font-medium text-muted-foreground">Working now{shownWorking.length ? ` · ${shownWorking.length}` : ""}</h2>
          {shownWorking.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No agent is working right now.</p>}
          {shownWorking.map((w) => {
            const c = byId.get(w.sessionId);
            return (
              <button key={w.sessionId} onClick={() => open(w.sessionId)} className={row}>
                <Spinner className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{c?.title || "New chat"}</span>
                {c?.project_name && <span className="shrink-0 max-w-[30%] truncate text-xs text-muted-foreground">{c.project_name}</span>}
                {w.helpers > 0 && <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3" />{w.helpers}</span>}
                <span className="shrink-0 w-10 text-right text-xs text-muted-foreground tabular-nums">{w.helpersOnly ? "" : ago(w.since)}</span>
              </button>
            );
          })}
        </section>

        {sections.map((s) => (
          <div key={s.key} className="flex flex-col gap-6">
            {s.label && (
              <p className="-mb-4 flex items-center gap-1.5 px-3 text-[12px] text-muted-foreground">
                {s.key === "pc" ? <Laptop className="size-3.5" /> : <Cloud className="size-3.5" />} {s.label}
              </p>
            )}
        {s.list.map((p) => (
          <section key={p.name + (p.chats[0]?.id || "")}>
            <h2 className="px-3 mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {p.logo ? <img src={p.logo} alt="" className="size-3.5 rounded-sm" /> : <Folder className="size-3.5" />}
              <span className="truncate">{p.name}</span>
            </h2>
            {p.chats.map((c) => (
              <button key={c.id} onClick={() => open(c.id)} className={row}>
                {busy.has(c.id) ? <Spinner className="size-3.5 shrink-0" /> : <Bot className="size-3.5 shrink-0 text-muted-foreground" />}
                <span className="min-w-0 flex-1 truncate">{c.title || "New chat"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{busy.has(c.id) ? "Working" : ago(c.updated_at || c.created_at)}</span>
              </button>
            ))}
          </section>
        ))}
          </div>
        ))}
      </div>
    </div>
  );
}
