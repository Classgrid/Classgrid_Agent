// Studio Mode's Browser tab in the desktop app: the AI's browser runs in the app on this computer (the user's own
// internet, their localhost servers, sound, its own saved logins). The page itself is a native view that the app puts
// on top of the box below; this tab tells the app where the box is on screen and keeps the toolbar.
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, ExternalLink, Globe, History, RotateCw, Search, Video, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/marketing_ui/spinner";

const EASE = [0.22, 1, 0.36, 1] as const;
const AGENT_BUSY_MS = 5000;

type Nav = { url: string; title: string; canGoBack: boolean; canGoForward: boolean; loading: boolean };
type Pointer = { kind: string; at: number; dy?: number; key?: string; url?: string };
type Rect = { x: number; y: number; width: number; height: number };
type DesktopBrowser = {
  browserShow: (rect: Rect) => void;
  browserHide: () => void;
  browserChat: (id: string | null) => void;
  browserHome?: () => Promise<boolean>; // (nothing open: Google, unless the AI's page is on its way; older apps lack it)
  browserState: () => Promise<(Nav & { pointerAt: number }) | null>;
  browserAct: (step: { action: string; url?: string }) => Promise<{ ok: boolean; error?: string }>;
  browserShot: () => Promise<string | null>;
  browserHistory: (q?: string) => Promise<{ url: string; title: string; at: number }[]>;
  browserHistoryClear: () => Promise<boolean>;
  browserHistoryRemove?: (url: string, at: number) => Promise<boolean>;
  onBrowser: (fn: (msg: any) => void) => () => void;
};
const desktop = () => (window as unknown as { classgridDesktop?: Partial<DesktopBrowser> }).classgridDesktop;
// Site icons come from our server (as on the AI's source chips)
const API_ORIGIN = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
// The app can show its own browser here (an older app can't)
export const hasLocalBrowser = () => typeof desktop()?.browserShow === "function";

// Things that open above the page (menus, dialogs, toasts): the native view would cover them, so it steps aside
const OVERLAYS = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper], [data-sonner-toast]';

const host = (u?: string) => { try { return new URL(/^[a-z]+:/i.test(String(u)) ? String(u) : `https://${u}`).host; } catch { return u || ""; } };
function pointerLabel(p: Pointer) {
  if (p.kind === "click") return "Clicking";
  if (p.kind === "scroll") return (p.dy ?? 0) < 0 ? "Scrolling up" : "Scrolling down";
  if (p.kind === "type") return "Typing";
  if (p.kind === "key") return `Pressing ${p.key || "a key"}`;
  if (p.kind === "open") return `Opening ${host(p.url)}`;
  if (p.kind === "shot") return "Taking a screenshot";
  if (p.kind === "select") return "Choosing";
  if (p.kind === "js") return "Running code";
  return "Working";
}

export function StudioLocalBrowserView({ paused = false }: { paused?: boolean }) {
  const reduce = useReducedMotion();
  const [nav, setNav] = useState<Nav>({ url: "", title: "", canGoBack: false, canGoForward: false, loading: false });
  const [typed, setTyped] = useState<string | null>(null); // the address bar while the user types in it
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const [now, setNow] = useState(Date.now());
  const boxRef = useRef<HTMLDivElement>(null);
  // The chat open in Studio (/c/studio/<id>): each chat has its own page in the browser
  const { pathname } = useLocation();
  const chatId = (() => { const parts = pathname.split("/"); const at = parts.indexOf("studio"); return at !== -1 && parts[at + 1] ? parts[at + 1] ?? null : null; })();
  useEffect(() => { desktop()?.browserChat?.(chatId); }, [chatId]);

  // The address bar and the agent's steps, from the app
  useEffect(() => {
    const d = desktop();
    if (!d?.onBrowser) return;
    // Nothing open yet: Google
    // (nothing open yet: the app decides whether Google is needed, so an "open" the AI is making at this very moment
    // is never replaced by Google; an older app without browserHome opens Google here as before)
    d.browserState?.().then((s) => {
      if (s) setNav(s);
      if (s?.url) return;
      if (d.browserHome) d.browserHome().catch(() => {});
      else d.browserAct?.({ action: "open", url: "https://www.google.com/" }).catch(() => {});
    }).catch(() => {});
    return d.onBrowser((m) => {
      if (!m || typeof m !== "object") return;
      if (m.type === "nav") setNav(m);
      else if (m.type === "pointer") { setPointer(m); setNow(Date.now()); }
    });
  }, []);

  // The page sits exactly over the box, and follows it when the pane moves or resizes. It steps aside while the tab
  // is hidden, no page is open, the pane is being resized, or a menu or dialog opens over it.
  const hasPage = !!nav.url;
  useEffect(() => {
    const d = desktop();
    if (!d?.browserShow || !d.browserHide) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const box = boxRef.current;
      let rect: Rect | null = null;
      if (box && hasPage && !paused && document.visibilityState === "visible") {
        const r = box.getBoundingClientRect();
        const covered = [...document.querySelectorAll(OVERLAYS)].some((el) => {
          const o = el.getBoundingClientRect();
          return o.width > 0 && o.height > 0 && o.left < r.right && o.right > r.left && o.top < r.bottom && o.bottom > r.top;
        });
        if (r.width >= 20 && r.height >= 20 && !covered) rect = { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
      }
      const next = rect ? JSON.stringify(rect) : "hide";
      if (next !== last) {
        last = next;
        if (rect) d.browserShow!(rect);
        else d.browserHide!();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); d.browserHide!(); };
  }, [hasPage, paused]);

  // The agent's step label fades after a few seconds without a step
  useEffect(() => {
    if (!pointer) return;
    const t = setTimeout(() => setNow(Date.now()), AGENT_BUSY_MS + 50);
    return () => clearTimeout(t);
  }, [pointer]);
  const agentBusy = !!pointer && now - pointer.at < AGENT_BUSY_MS;

  const act = (step: { action: string; url?: string }) => {
    desktop()?.browserAct?.(step).then((r) => { if (r && !r.ok && r.error) toast.error(r.error); }).catch(() => {});
  };
  const saveShot = async () => {
    const data = await desktop()?.browserShot?.().catch(() => null);
    if (!data) { toast.error("Could not take a screenshot"); return; }
    const a = document.createElement("a");
    a.href = data;
    a.download = "classgrid-browser.png";
    a.click();
  };

  // History, like Chrome's (the page steps aside while this panel is open: it is a dialog)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQ, setHistoryQ] = useState("");
  const [historyRows, setHistoryRows] = useState<{ url: string; title: string; at: number }[]>([]);
  useEffect(() => {
    if (!historyOpen) return;
    const t = setTimeout(() => { desktop()?.browserHistory?.(historyQ).then((r) => setHistoryRows(r || [])).catch(() => {}); }, 120);
    return () => clearTimeout(t);
  }, [historyOpen, historyQ]);
  const [clearAsk, setClearAsk] = useState(false);
  // Today, Yesterday, or the day's date
  const dayLabel = (t: number) => {
    const d = new Date(t);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  };
  // The same page opened again right after (a reload, coming back to it) shows once, at its newest time
  const historyShown = historyRows.filter((h, i) => i === 0 || historyRows[i - 1]!.url !== h.url || dayLabel(historyRows[i - 1]!.at) !== dayLabel(h.at));

  const iconBtn = "flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-[color,background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:active:scale-100";

  return (
    <>
      <div className="shrink-0 flex items-center gap-1 h-12 px-2 border-b border-border">
        <button className={iconBtn} disabled={!nav.canGoBack} onClick={() => act({ action: "back" })} title="Back" aria-label="Back"><ArrowLeft className="size-4" /></button>
        <button className={iconBtn} disabled={!nav.canGoForward} onClick={() => act({ action: "forward" })} title="Forward" aria-label="Forward"><ArrowRight className="size-4" /></button>
        <button className={iconBtn} disabled={!hasPage} onClick={() => act({ action: "reload" })} title="Reload" aria-label="Reload">
          {nav.loading ? <Spinner className="size-4" /> : <RotateCw className="size-4" />}
        </button>
        <input
          data-no-ring
          value={typed ?? nav.url}
          onChange={(e) => setTyped(e.target.value)}
          onFocus={(e) => { setTyped(nav.url); e.currentTarget.select(); }}
          onBlur={() => setTyped(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (typed ?? "").trim()) { act({ action: "open", url: typed!.trim() }); setTyped(null); e.currentTarget.blur(); }
            if (e.key === "Escape") { setTyped(null); e.currentTarget.blur(); }
          }}
          placeholder="Search, enter a website or localhost:3000"
          className="flex-1 min-w-0 h-8 px-3 rounded-full border border-border bg-white dark:bg-[#1e1e1e] text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/30 transition-colors duration-200"
        />
        {agentBusy && pointer && (
          <span className="hidden sm:flex items-center gap-1.5 shrink-0 max-w-[40%] rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-medium text-white" title="The agent is using the browser">
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            <span className="truncate">Agent · {pointerLabel(pointer)}</span>
          </span>
        )}
        {typeof desktop()?.browserHistory === "function" && (
          <button className={iconBtn} onClick={() => setHistoryOpen((v) => !v)} title="History" aria-label="History"><History className="size-4" /></button>
        )}
        <button className={iconBtn} disabled={!hasPage} onClick={saveShot} title="Save a screenshot" aria-label="Save a screenshot"><Camera className="size-4" /></button>
        {typeof (window as unknown as { classgridDesktop?: { openRecordings?: () => void } }).classgridDesktop?.openRecordings === "function" && (
          <button className={iconBtn} onClick={() => (window as unknown as { classgridDesktop?: { openRecordings?: () => void } }).classgridDesktop?.openRecordings?.()} title="Videos of the agent using the browser" aria-label="Videos of the agent using the browser"><Video className="size-4" /></button>
        )}
        <button className={iconBtn} disabled={!hasPage} onClick={() => nav.url && (window as unknown as { classgridDesktop?: { openExternal?: (u: string) => void } }).classgridDesktop?.openExternal?.(nav.url)} title="Open in your own browser" aria-label="Open in your own browser"><ExternalLink className="size-4" /></button>
      </div>

      {/* The page itself is drawn by the app over this box */}
      <div ref={boxRef} className="relative flex-1 min-h-0 bg-[#f5f5f5] dark:bg-[#141414]">
        {historyOpen && (
          <div role="dialog" aria-label="History" className="absolute inset-0 z-20 flex flex-col bg-background">
            {/* Search with its icon inside, Clear (asks once more), Close */}
            <div className="shrink-0 flex items-center gap-2 px-3 h-14 border-b border-border">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input autoFocus data-no-ring value={historyQ} onChange={(e) => setHistoryQ(e.target.value)} placeholder="Search history"
                  className="w-full h-9 pl-9 pr-3 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-sm outline-none placeholder:text-muted-foreground focus:bg-black/[0.06] dark:focus:bg-white/[0.08] transition-colors" />
              </div>
              {historyRows.length > 0 && (clearAsk ? (
                <>
                  <button className="h-8 px-3 rounded-full text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer" onClick={() => setClearAsk(false)}>Cancel</button>
                  <button className="h-8 px-3 rounded-full text-[13px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/15 cursor-pointer" onClick={() => { desktop()?.browserHistoryClear?.().then(() => setHistoryRows([])).catch(() => {}); setClearAsk(false); }}>Clear all</button>
                </>
              ) : (
                <button className="h-8 px-3 rounded-full text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer" onClick={() => setClearAsk(true)}>Clear</button>
              ))}
              <button className={iconBtn} onClick={() => { setHistoryOpen(false); setClearAsk(false); }} title="Close" aria-label="Close"><X className="size-4" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pb-3">
              {!historyRows.length && (
                <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <History className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium">{historyQ ? "Nothing matches your search" : "No history yet"}</p>
                  {!historyQ && <p className="text-xs text-muted-foreground">Pages you and the agent open show up here</p>}
                </div>
              )}
              {historyShown.map((h, i) => {
                const host = (() => { try { return new URL(h.url).host.replace(/^www\./, ""); } catch { return h.url; } })();
                const newDay = i === 0 || dayLabel(historyShown[i - 1]!.at) !== dayLabel(h.at);
                return (
                  <div key={`${h.at}-${h.url}`}>
                    {/* The day stays at the top while its pages scroll under it */}
                    {newDay && <div className="sticky top-0 z-10 px-5 pt-4 pb-2 bg-background text-xs font-semibold text-muted-foreground">{dayLabel(h.at)}</div>}
                    <div className="group mx-2 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors">
                      <button onClick={() => { act({ action: "open", url: h.url }); setHistoryOpen(false); }} className="min-w-0 flex-1 flex items-center gap-3 text-left cursor-pointer">
                        <span className="flex items-center justify-center size-8 shrink-0 rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
                          <img src={`${API_ORIGIN}/api/ai/favicon?domain=${encodeURIComponent(host)}`} alt="" className="size-4 rounded-sm" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">{h.title || host}</span>
                          <span className="block truncate text-xs text-muted-foreground">{host}</span>
                        </span>
                      </button>
                      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground tabular-nums group-hover:hidden">{new Date(h.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                      <button title="Remove from history" aria-label="Remove from history"
                        onClick={() => { desktop()?.browserHistoryRemove?.(h.url, h.at).then(() => setHistoryRows((rows) => rows.filter((r) => !(r.url === h.url && r.at === h.at)))).catch(() => {}); }}
                        className="hidden group-hover:flex items-center justify-center size-7 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!hasPage && (
          <div className="h-full flex items-center justify-center px-6">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
              className="max-w-sm text-center flex flex-col items-center gap-3"
            >
              <div className="flex items-center justify-center size-12 rounded-full border border-border">
                <Globe className="size-5 text-muted-foreground" />
              </div>
              <p className="text-base font-medium">No page open yet</p>
              <p className="text-sm text-muted-foreground">
                Type a website above, or ask the agent to open one. This browser runs on your computer, so it can open your own local servers too, like localhost:3000. You and the agent use the same browser, and it keeps your logins.
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
