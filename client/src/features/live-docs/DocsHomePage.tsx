// A person's live docs (chat.classgrid.in/docs): the ones they own and the ones shared with them by name, pinned
// ones first. A doc opens on its own page; "Open beside the chat" opens it in Studio.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, FileText, Globe2, Lock, Pin, Search, Users } from "lucide-react";
import { ClassgridLogoIcon } from "@/components/layout/ClassgridLogoIcon";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";
import * as api from "./liveDocsApi";
import type { DocRow } from "./liveDocsApi";
import { PersonPhoto } from "./DocPeople";
import { studioDocPath } from "./docContext";

const ago = (d: string) => { try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ""; } };
type Tab = "mine" | "shared";
const ROLE_WORDS = { owner: "Owner", editor: "Can edit", commenter: "Can comment", viewer: "Can read" } as const;

export function DocsHomePage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<{ mine: DocRow[]; shared: DocRow[] } | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("mine");
  const [find, setFind] = useState("");

  useEffect(() => {
    document.title = "Docs · Classgrid";
    api.listDocs()
      .then((r) => { setDocs({ mine: r.docs || [], shared: r.shared || [] }); if (!(r.docs || []).length && (r.shared || []).length) setTab("shared"); })
      .catch((e) => setError(api.errorText(e, "Your docs could not be loaded. Please try again.")));
  }, []);

  const rows = useMemo(() => {
    const list = (tab === "mine" ? docs?.mine : docs?.shared) || [];
    const words = find.trim().toLowerCase();
    return list
      .filter((d) => !words || d.title.toLowerCase().includes(words) || d.ownerName.toLowerCase().includes(words))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [docs, tab, find]);

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
              <li key={d.id} className="group flex items-center gap-3 py-1">
                <Link to={`/docs/${d.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-accent">
                  <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
                    <FileText className="size-[18px]" />
                    {d.pinned && <span className="absolute -right-1.5 -top-1.5 inline-flex size-[18px] items-center justify-center rounded-full bg-foreground text-background"><Pin className="size-2.5" fill="currentColor" /></span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block [overflow-wrap:anywhere] text-[14.5px] font-medium">{d.title}</span>
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
                <button
                  type="button"
                  onClick={() => navigate(studioDocPath(d.id))}
                  title="Open beside the chat"
                  aria-label={`Open ${d.title} beside the chat`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                >
                  <ClassgridLogoIcon size={22} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default DocsHomePage;
