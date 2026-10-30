// Studio Mode's Screenshots tab: every screenshot the agent and its Browser worker took in this chat, newest first.
// New ones arrive live; click one to see it big, with the page it came from.
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Images, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { fetchWithRescue } from "@/lib/rescue";
import { getSocket } from "@/lib/socketClient";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const EASE = [0.22, 1, 0.36, 1] as const;

type Shot = { url: string; page?: string; title?: string; tool?: string; at: number };

// The chat open in Studio (/c/studio/<id>)
function useChatId() {
  const { pathname } = useLocation();
  const parts = pathname.split("/");
  const at = parts.indexOf("studio");
  return at !== -1 && parts[at + 1] ? parts[at + 1] : null;
}

const time = (at: number) => new Date(at).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" });
const host = (u?: string) => { try { return new URL(String(u)).host; } catch { return u || ""; } };

export function StudioShotsView() {
  const reduce = useReducedMotion();
  const chatId = useChatId();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    setShots([]);
    setOpen(null);
    if (!chatId) { setLoading(false); return; }
    let gone = false;
    setLoading(true);
    fetchWithRescue(`${backendUrl}/api/ai/studio/shots/${encodeURIComponent(chatId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (!gone) setShots(Array.isArray(d?.shots) ? d.shots : []); })
      .catch(() => {})
      .finally(() => { if (!gone) setLoading(false); });
    const socket = getSocket();
    const onShot = (s: Shot & { sessionId?: string }) => {
      if (s?.sessionId !== chatId || !s.url) return;
      setShots((list) => (list.some((x) => x.url === s.url) ? list : [s, ...list]));
      setOpen((i) => (i === null ? null : i + 1)); // the open one stays the same picture
    };
    socket?.on("studio:shot", onShot);
    return () => { gone = true; socket?.off("studio:shot", onShot); };
  }, [chatId]);

  // Arrow keys move through the open screenshot; Escape closes it
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : Math.min(shots.length - 1, i + 1)));
      else if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shots.length]);

  const iconBtn = "flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:hover:bg-transparent";
  const current = open !== null ? shots[open] : null;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 h-12 px-4 border-b border-border text-[13px] text-muted-foreground">
        <Images className="size-4" />
        <span>{shots.length ? `${shots.length} screenshot${shots.length === 1 ? "" : "s"} in this chat` : "Screenshots"}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 [scrollbar-width:thin]">
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[16/10] rounded-lg bg-secondary animate-pulse" />)}
          </div>
        ) : !shots.length ? (
          <div className="h-full flex items-center justify-center px-6">
            <div className="max-w-sm text-center flex flex-col items-center gap-3">
              <div className="flex items-center justify-center size-12 rounded-full border border-border"><Images className="size-5 text-muted-foreground" /></div>
              <p className="text-base font-medium">No screenshots yet</p>
              <p className="text-sm text-muted-foreground">{chatId ? "Screenshots the agent takes in the browser are saved here." : "Start a chat: screenshots the agent takes in the browser are saved here."}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {shots.map((s, i) => (
              <motion.button
                key={s.url}
                type="button"
                onClick={() => setOpen(i)}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="group flex flex-col text-left rounded-lg border border-border overflow-hidden bg-background hover:border-foreground/25 transition-colors"
              >
                <div className="aspect-[16/10] overflow-hidden bg-secondary">
                  <img src={s.url} alt={s.title || "Screenshot"} loading="lazy" className="size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
                </div>
                <div className="px-2.5 py-2 min-w-0">
                  <p className="truncate text-[12.5px] font-medium">{s.title || host(s.page) || "Screenshot"}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{host(s.page)} · {time(s.at)}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* One screenshot, big */}
      <AnimatePresence>
        {current && (
          <motion.div
            key="viewer"
            className="absolute inset-0 z-20 flex flex-col bg-[#f5f5f5] dark:bg-[#181818]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className="shrink-0 flex items-center gap-1 h-12 px-2 border-b border-border">
              <button className={iconBtn} onClick={() => setOpen(null)} title="Close" aria-label="Close"><X className="size-4" /></button>
              <div className="flex-1 min-w-0 px-1">
                <p className="truncate text-[13px] font-medium">{current.title || host(current.page)}</p>
                <p className="truncate text-[11.5px] text-muted-foreground">{time(current.at)} · {open! + 1} of {shots.length}</p>
              </div>
              <button className={iconBtn} disabled={open! >= shots.length - 1} onClick={() => setOpen((i) => Math.min(shots.length - 1, (i ?? 0) + 1))} title="Older" aria-label="Older"><ChevronLeft className="size-4" /></button>
              <button className={iconBtn} disabled={open === 0} onClick={() => setOpen((i) => Math.max(0, (i ?? 0) - 1))} title="Newer" aria-label="Newer"><ChevronRight className="size-4" /></button>
              <a className={iconBtn} href={current.url} target="_blank" rel="noopener noreferrer" download title="Download" aria-label="Download"><Download className="size-4" /></a>
              {current.page && <a className={iconBtn} href={current.page} target="_blank" rel="noopener noreferrer" title="Open the page" aria-label="Open the page"><ExternalLink className="size-4" /></a>}
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-3 flex items-start justify-center [scrollbar-width:thin]">
              <img src={current.url} alt={current.title || "Screenshot"} className="max-w-full h-auto rounded-md border border-border" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
