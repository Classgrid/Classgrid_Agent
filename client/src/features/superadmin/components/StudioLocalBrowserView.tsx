// Studio Mode's Browser tab in the desktop app: the AI's browser runs in the app on this computer (the user's own
// internet, their localhost servers, sound, its own saved logins). The page itself is a native view that the app puts
// on top of the box below; this tab tells the app where the box is on screen and keeps the toolbar.
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, ExternalLink, Globe, RotateCw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

const EASE = [0.22, 1, 0.36, 1] as const;
const AGENT_BUSY_MS = 5000;

type Nav = { url: string; title: string; canGoBack: boolean; canGoForward: boolean; loading: boolean };
type Pointer = { kind: string; at: number; dy?: number; key?: string; url?: string };
type Rect = { x: number; y: number; width: number; height: number };
type DesktopBrowser = {
  browserShow: (rect: Rect) => void;
  browserHide: () => void;
  browserChat: (id: string | null) => void;
  browserState: () => Promise<(Nav & { pointerAt: number }) | null>;
  browserAct: (step: { action: string; url?: string }) => Promise<{ ok: boolean; error?: string }>;
  browserShot: () => Promise<string | null>;
  onBrowser: (fn: (msg: any) => void) => () => void;
};
const desktop = () => (window as unknown as { classgridDesktop?: Partial<DesktopBrowser> }).classgridDesktop;
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
    d.browserState?.().then((s) => { if (s) setNav(s); }).catch(() => {});
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

  const iconBtn = "flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-[color,background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:active:scale-100";

  return (
    <>
      <div className="shrink-0 flex items-center gap-1 h-12 px-2 border-b border-border">
        <button className={iconBtn} disabled={!nav.canGoBack} onClick={() => act({ action: "back" })} title="Back" aria-label="Back"><ArrowLeft className="size-4" /></button>
        <button className={iconBtn} disabled={!nav.canGoForward} onClick={() => act({ action: "forward" })} title="Forward" aria-label="Forward"><ArrowRight className="size-4" /></button>
        <button className={iconBtn} disabled={!hasPage} onClick={() => act({ action: "reload" })} title="Reload" aria-label="Reload">
          <RotateCw className={`size-4 ${nav.loading ? "animate-spin" : ""}`} />
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
        <button className={iconBtn} disabled={!hasPage} onClick={saveShot} title="Save a screenshot" aria-label="Save a screenshot"><Camera className="size-4" /></button>
        <button className={iconBtn} disabled={!hasPage} onClick={() => nav.url && (window as unknown as { classgridDesktop?: { openExternal?: (u: string) => void } }).classgridDesktop?.openExternal?.(nav.url)} title="Open in your own browser" aria-label="Open in your own browser"><ExternalLink className="size-4" /></button>
      </div>

      {/* The page itself is drawn by the app over this box */}
      <div ref={boxRef} className="relative flex-1 min-h-0 bg-[#f5f5f5] dark:bg-[#141414]">
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
