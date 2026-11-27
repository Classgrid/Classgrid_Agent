// A person's live docs (chat.classgrid.in/docs): the ones they own and the ones shared with them by name, pinned
// ones first. A doc opens on its own page; "Open beside the chat" opens it in Studio.
// The pages the AI published and the videos it made (chat.classgrid.in/p/<id>) are listed with the docs, marked
// "Page" or "Video", and open on their own page; a video shows its first picture as its icon.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { AppWindow, ArrowLeft, FileText, Film, Globe2, Lock, Pin, Search, Users } from "lucide-react";
import { ClassgridLogoIcon } from "@/components/layout/ClassgridLogoIcon";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";
import * as api from "./liveDocsApi";
import type { DocRow } from "./liveDocsApi";
import { listPages, type PageRow } from "./pageArtifacts";
import { PersonPhoto } from "./DocPeople";
import { PickMenu, type PickChoice } from "./PickMenu";
import { studioDocPath } from "./docContext";

const ago = (d: string) => { try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ""; } };
type Tab = "mine" | "shared";
const ROLE_WORDS = { owner: "Owner", editor: "Can edit", commenter: "Can comment", viewer: "Can read" } as const;

/** A row of the list: a live doc, or a published page or video. */
type Item = DocRow & { kind: "doc" | "page" | "video"; poster: string };
const docItem = (d: DocRow): Item => ({ ...d, kind: "doc", poster: "" });
// (a page is not edited by the AI the way a doc is, so its row never says "by the AI")
const pageItem = (p: PageRow): Item => ({
  id: p.id, title: p.title, visibility: p.visibility, role: p.role, shared: p.shared, ownerName: p.ownerName, ownerPhoto: p.ownerPhoto,
  pinned: p.pinned, lastBy: "user", createdAt: p.createdAt, updatedAt: p.updatedAt, kind: p.kind, poster: p.video?.poster || "",
});
const itemLink = (d: Item) => (d.kind === "doc" ? `/docs/${d.id}` : `/p/${d.id}`);

// Which kinds the list shows, remembered on this device
type Show = "all" | Item["kind"];
const SHOW_CHOICES: PickChoice<Show>[] = [
  { value: "all", name: "All" },
  { value: "doc", name: "Docs" },
  { value: "page", name: "Pages" },
  { value: "video", name: "Videos" },
];
const SHOW_KEY = "classgrid:docs-list-kind";
function savedShow(): Show {
  try {
    const saved = localStorage.getItem(SHOW_KEY);
    return SHOW_CHOICES.some((c) => c.value === saved) ? (saved as Show) : "all";
  } catch {
    return "all";
  }
}

/** The row's icon: a video's first picture, or the icon of its kind. */
function ItemIcon({ item }: { item: Item }) {
  const [noPoster, setNoPoster] = useState(false);
  if (item.kind === "video" && item.poster && !noPoster) {
    return <img src={item.poster} alt="" loading="lazy" onError={() => setNoPoster(true)} className="size-full rounded-[11px] object-cover" />;
  }
  const Icon = item.kind === "video" ? Film : item.kind === "page" ? AppWindow : FileText;
  return <Icon className="size-[18px]" />;
}

export function DocsHomePage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<{ mine: Item[]; shared: Item[] } | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("mine");
  const [find, setFind] = useState("");
  const [show, setShow] = useState<Show>(savedShow);
  const pickShow = (next: Show) => {
    setShow(next);
    try { localStorage.setItem(SHOW_KEY, next); } catch { /* the choice is then kept only until the page is left */ }
  };

  useEffect(() => {
    document.title = "Docs · Classgrid";
    // (the docs are the list; pages that can't be loaded leave the docs shown on their own)
    Promise.all([api.listDocs(), listPages().catch(() => ({ mine: [] as PageRow[], shared: [] as PageRow[] }))])
      .then(([r, pages]) => {
        const mine = [...(r.docs || []).map(docItem), ...pages.mine.map(pageItem)];
        const shared = [...(r.shared || []).map(docItem), ...pages.shared.map(pageItem)];
        setDocs({ mine, shared });
        if (!mine.length && shared.length) setTab("shared");
      })
      .catch((e) => setError(api.errorText(e, "Your docs could not be loaded. Please try again.")));
  }, []);

  const rows = useMemo(() => {
    const list = (tab === "mine" ? docs?.mine : docs?.shared) || [];
    const words = find.trim().toLowerCase();
    return list
      .filter((d) => show === "all" || d.kind === show)
      .filter((d) => !words || d.title.toLowerCase().includes(words) || d.ownerName.toLowerCase().includes(words))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [docs, tab, find, show]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-3 sm:px-5">
          <Link to="/agent" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground" title="Back to chat" aria-label="Back to chat">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-[16px] font-semibold">Docs</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 pb-24 pt-5 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Which docs" className="inline-grid grid-cols-2 gap-1 rounded-xl bg-black/[0.05] p-1 dark:bg-white/[0.08]">
            {(["mine", "shared"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn("h-8 rounded-lg px-3.5 text-[13.5px] font-medium transition-colors", tab === t ? "bg-background text-foreground shadow-sm dark:bg-white/[0.16]" : "text-muted-foreground hover:text-foreground")}
              >
                {t === "mine" ? "Your docs" : "Shared with you"}{docs ? ` (${(t === "mine" ? docs.mine : docs.shared).length})` : ""}
              </button>
            ))}
          </div>
          <label className="flex h-10 min-w-0 flex-1 basis-56 items-center gap-2 rounded-xl bg-black/[0.05] px-3 dark:bg-white/[0.08] focus-within:ring-1 focus-within:ring-foreground/30">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a doc" aria-label="Find a doc" data-no-ring className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground" />
          </label>
          <PickMenu
            label={SHOW_CHOICES.find((c) => c.value === show)?.name || "All"}
            value={show}
            choices={SHOW_CHOICES}
            onPick={pickShow}
            className="h-10 rounded-xl border-0 bg-black/[0.05] pl-3 pr-2.5 text-[14px] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
          />
        </div>

        {error ? (
          <p className="mt-10 text-center text-[14px] text-muted-foreground">{error}</p>
        ) : !docs ? (
          <div className="mt-16 flex justify-center"><Spinner className="size-6" /></div>
        ) : rows.length === 0 ? (
          <div className="mt-14 flex flex-col items-center px-6 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/60"><FileText className="size-6" strokeWidth={1.6} /></span>
            <p className="mt-4 text-[15px] font-medium">{find.trim() ? "No doc matches" : tab === "mine" ? "No docs yet" : "Nothing shared with you yet"}</p>
            <p className="mt-1 max-w-sm text-[13.5px] leading-5 text-muted-foreground">
              {find.trim() ? "Try other words." : tab === "mine" ? "Ask Classgrid AI in a chat to write a plan, notes or a report as a doc, and it shows here." : "When someone shares a doc with your email, it shows here."}
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {rows.map((d) => (
              <li key={`${d.kind}-${d.id}`} className="group flex items-center gap-3 py-1">
                <Link to={itemLink(d)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-accent">
                  <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
                    <ItemIcon item={d} />
                    {d.pinned && <span className="absolute -right-1.5 -top-1.5 inline-flex size-[18px] items-center justify-center rounded-full bg-foreground text-background"><Pin className="size-2.5" fill="currentColor" /></span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 [overflow-wrap:anywhere] text-[14.5px] font-medium">{d.title}</span>
                      {d.kind !== "doc" && (
                        <span className="shrink-0 rounded-md bg-black/[0.05] px-1.5 py-px text-[11.5px] font-medium text-muted-foreground dark:bg-white/[0.08]">
                          {d.kind === "video" ? "Video" : "Page"}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                      {tab === "shared" ? (
                        <>
                          <PersonPhoto name={d.ownerName || "?"} photo={d.ownerPhoto} size="xs" className="size-4 text-[9px]" />
                          <span className="[overflow-wrap:anywhere]">{d.ownerName || "Someone"} · {ROLE_WORDS[d.role]} · edited {ago(d.updatedAt)}</span>
                        </>
                      ) : (
                        <>
                          {d.visibility === "link" ? <Globe2 className="size-3.5 shrink-0" /> : d.shared ? <Users className="size-3.5 shrink-0" /> : <Lock className="size-3.5 shrink-0" />}
                          <span className="[overflow-wrap:anywhere]">{d.visibility === "link" ? "Anyone with the link" : d.shared ? "Shared" : "Private"} · edited {ago(d.updatedAt)}{d.lastBy === "ai" ? " by the AI" : ""}</span>
                        </>
                      )}
                    </span>
                  </span>
                </Link>
                {/* (a video opens on its own page only) */}
                {d.kind !== "video" && <button
                  type="button"
                  onClick={() => navigate(d.kind === "page" ? studioDocPath(d.id, undefined, "page") : studioDocPath(d.id))}
                  title="Open beside the chat"
                  aria-label={`Open ${d.title} beside the chat`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                >
                  <ClassgridLogoIcon size={22} />
                </button>}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default DocsHomePage;
