// Studio Mode's Browser tab: the user's live browser (a real Chromium on the sandbox server). The agent drives it with
// its browser tools; the user watches it here, sees the agent's pointer (where it clicks, scrolls and types) and can
// click, scroll and type in it too (e.g. a password). The page takes the size of this tab.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, ExternalLink, FileImage, Globe, RotateCw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { getSocket } from "@/lib/socketClient";

const EASE = [0.22, 1, 0.36, 1] as const;
type Status = "starting" | "ready" | "error" | "closed";
type Pointer = { kind: string; x: number | null; y: number | null; at: number; dy?: number; key?: string; url?: string; text?: number };

const KEYS = new Set(["Enter", "Backspace", "Tab", "Escape", "Delete", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);
const AGENT_BUSY_MS = 5000;

const host = (u?: string) => { try { return new URL(/^[a-z]+:/i.test(String(u)) ? String(u) : `https://${u}`).host; } catch { return u || ""; } };
function pointerLabel(p: Pointer) {
  if (p.kind === "click" || p.kind === "move") return "Clicking";
  if (p.kind === "scroll") return (p.dy ?? 0) < 0 ? "Scrolling up" : "Scrolling down";
  if (p.kind === "type") return "Typing";
  if (p.kind === "key") return `Pressing ${p.key || "a key"}`;
  if (p.kind === "open") return `Opening ${host(p.url)}`;
  if (p.kind === "shot") return "Taking a screenshot";
  return "Working";
}

export function StudioBrowserView() {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Status>("starting");
  const [error, setError] = useState("");
  const [frame, setFrame] = useState<{ src: string; w: number; h: number } | null>(null);
  const [url, setUrl] = useState("");
  const [typed, setTyped] = useState<string | null>(null); // the address bar while the user types in it
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const [now, setNow] = useState(Date.now());
  const [clicks, setClicks] = useState<{ id: number; x: number; y: number }[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const wheel = useRef<{ dy: number; timer?: ReturnType<typeof setTimeout> }>({ dy: 0 });
  // The chat open in Studio (/c/studio/<id>): a full page screenshot is saved in its Screenshots
  const { pathname } = useLocation();
  const chatId = (() => { const parts = pathname.split("/"); const at = parts.indexOf("studio"); return at !== -1 && parts[at + 1] ? parts[at + 1] : null; })();
  const [fullBusy, setFullBusy] = useState(false);
  // Each chat has its own page in the browser: a new chat starts empty, an old chat opens its last page again
  useEffect(() => { if (status === "ready") input({ type: "chat", id: chatId }); }, [chatId, status]);
  const fullPage = () => {
    const socket = getSocket();
    if (!socket || fullBusy) return;
    setFullBusy(true);
    socket.timeout(60000).emit("studio:browser:fullshot", { sessionId: chatId }, (err: unknown, r: { ok: boolean; url?: string; error?: string }) => {
      setFullBusy(false);
      if (err || !r?.ok || !r.url) { toast.error(r?.error || "Could not take a full page screenshot"); return; }
      const url = r.url;
      toast.success(chatId ? "Full page screenshot saved in Screenshots" : "Full page screenshot ready", { action: { label: "Open", onClick: () => window.open(url, "_blank", "noopener,noreferrer") } });
    });
  };
  // While the chat's answer runs and the agent has used the browser in it, the browser is the agent's alone
  const [chatBusy, setChatBusy] = useState(false);
  const [droveThisRun, setDroveThisRun] = useState(false);
  useEffect(() => {
    const onGen = (e: Event) => {
      const on = !!(e as CustomEvent<{ on: boolean }>).detail?.on;
      setChatBusy(on);
      if (!on) setDroveThisRun(false);
    };
    window.addEventListener("agent:generating", onGen);
    return () => window.removeEventListener("agent:generating", onGen);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) { setStatus("error"); setError("Not connected. Refresh the page."); return; }
    const onMsg = (m: any) => {
      if (!m || typeof m !== "object") return;
      if (m.type === "status") { setStatus(m.status); if (m.error) setError(m.error); if (m.status === "ready") sendSize(); }
      else if (m.type === "frame") { setFrame({ src: `data:image/jpeg;base64,${m.data}`, w: m.w || 1280, h: m.h || 800 }); setStatus("ready"); }
      else if (m.type === "nav") setUrl(m.url && m.url !== "about:blank" ? m.url : "");
      else if (m.type === "error") setError(m.error || "");
      else if (m.type === "pointer") {
        setPointer(m);
        setNow(Date.now());
        setDroveThisRun(true);
        if (m.kind === "click" && m.x !== null) setClicks((c) => [...c.slice(-3), { id: m.at, x: m.x, y: m.y }]);
      }
    };
    socket.on("studio:browser", onMsg);
    const watch = () => socket.emit("studio:browser:watch");
    watch();
    socket.on("connect", watch); // back after the connection dropped
    return () => {
      socket.emit("studio:browser:unwatch");
      socket.off("studio:browser", onMsg);
      socket.off("connect", watch);
    };
  }, []);

  const input = (m: object) => getSocket()?.emit("studio:browser:input", m);
  const act = (a: object) => input({ type: "act", act: a });

  // The page takes the size of this tab: wider when the pane is wide or full screen
  const sendSize = () => {
    const box = boxRef.current;
    if (box && box.clientWidth > 0) input({ type: "viewport", w: box.clientWidth, h: box.clientHeight });
  };
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(sendSize, 300); });
    ro.observe(box);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, []);

  // The agent's pointer fades after a few seconds without a step
  useEffect(() => {
    if (!pointer) return;
    const t = setTimeout(() => setNow(Date.now()), AGENT_BUSY_MS + 50);
    return () => clearTimeout(t);
  }, [pointer]);
  const agentBusy = !!pointer && now - pointer.at < AGENT_BUSY_MS;
  const locked = agentBusy || (chatBusy && droveThisRun);

  // A point on the picture in page pixels
  const pagePoint = (e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img || !frame) return null;
    const r = img.getBoundingClientRect();
    return { x: Math.round(((e.clientX - r.left) / r.width) * frame.w), y: Math.round(((e.clientY - r.top) / r.height) * frame.h) };
  };
  // Page pixels -> % of the picture, for the pointer on top of it
  const pct = (x: number, y: number) => (frame ? { left: `${(x / frame.w) * 100}%`, top: `${(y / frame.h) * 100}%` } : { left: 0, top: 0 });

  const iconBtn = "flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-[color,background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:active:scale-100";
  const live = status === "ready" && !!frame;
  const canUse = live && !locked;

  return (
    <>
      <div className="shrink-0 flex items-center gap-1 h-12 px-2 border-b border-border">
        <button className={iconBtn} disabled={!canUse} onClick={() => act({ action: "back" })} title="Back" aria-label="Back"><ArrowLeft className="size-4" /></button>
        <button className={iconBtn} disabled={!canUse} onClick={() => act({ action: "forward" })} title="Forward" aria-label="Forward"><ArrowRight className="size-4" /></button>
        <button className={iconBtn} disabled={!canUse} onClick={() => act({ action: "reload" })} title="Reload" aria-label="Reload"><RotateCw className="size-4" /></button>
        <input
          data-no-ring
          disabled={locked}
          value={typed ?? url}
          onChange={(e) => setTyped(e.target.value)}
          onFocus={(e) => { setTyped(url); e.currentTarget.select(); }}
          onBlur={() => setTyped(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (typed ?? "").trim()) { act({ action: "open", url: typed!.trim() }); setTyped(null); e.currentTarget.blur(); }
            if (e.key === "Escape") { setTyped(null); e.currentTarget.blur(); }
          }}
          placeholder="Search or enter a website"
          className="flex-1 min-w-0 h-8 px-3 rounded-full border border-border bg-white dark:bg-[#1e1e1e] text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/30 disabled:opacity-60 transition-colors duration-200"
        />
        <a
          className={`${iconBtn} ${frame ? "" : "pointer-events-none opacity-40"}`}
          href={frame?.src}
          download="classgrid-browser.jpg"
          title="Save a screenshot"
          aria-label="Save a screenshot"
        ><Camera className="size-4" /></a>
        <button className={iconBtn} disabled={!live || fullBusy} onClick={fullPage} title="Full page screenshot (the whole page, top to bottom)" aria-label="Full page screenshot">
          {fullBusy ? <span className="size-3.5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" /> : <FileImage className="size-4" />}
        </button>
        <button className={iconBtn} disabled={!url} onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")} title="Open in a new tab" aria-label="Open in a new tab"><ExternalLink className="size-4" /></button>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={boxRef}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!canUse || e.metaKey) return;
          if (e.key.length === 1 && !e.ctrlKey && !e.altKey) { input({ type: "text", text: e.key }); e.preventDefault(); }
          else if (KEYS.has(e.key)) { input({ type: "key", key: e.key }); e.preventDefault(); }
          else if (e.ctrlKey && e.key.length === 1) { input({ type: "key", key: `Control+${e.key}` }); e.preventDefault(); }
        }}
        className="relative flex-1 min-h-0 overflow-auto outline-none bg-[#f5f5f5] dark:bg-[#141414]"
      >
        {frame && url ? (
          <div className="relative">
            <img
              ref={imgRef}
              src={frame.src}
              alt="Your live browser"
              draggable={false}
              onMouseDown={(e) => { boxRef.current?.focus(); const p = pagePoint(e); if (p) input({ type: "click", ...p }); e.preventDefault(); }}
              onWheel={(e) => {
                // Wheel moves are joined and sent a few times a second, not one message per tiny move
                wheel.current.dy += e.deltaY;
                if (wheel.current.timer) return;
                wheel.current.timer = setTimeout(() => {
                  const dy = Math.round(wheel.current.dy);
                  wheel.current = { dy: 0, timer: undefined };
                  if (dy) input({ type: "wheel", dy });
                }, 60);
              }}
              className="block w-full h-auto select-none cursor-default"
            />

            {/* Where the agent clicked: a ring that grows and fades */}
            <AnimatePresence>
              {clicks.map((c) => (
                <motion.span
                  key={c.id}
                  className="pointer-events-none absolute size-9 -ml-[18px] -mt-[18px] rounded-full border-2 border-sky-500"
                  style={pct(c.x, c.y)}
                  initial={{ scale: 0.3, opacity: 0.9 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: EASE }}
                  onAnimationComplete={() => setClicks((list) => list.filter((x) => x.id !== c.id))}
                />
              ))}
            </AnimatePresence>

            {/* The agent's pointer */}
            {pointer && pointer.x !== null && pointer.y !== null && (
              <motion.div
                className="pointer-events-none absolute z-10"
                initial={false}
                animate={{ ...pct(pointer.x, pointer.y), opacity: agentBusy ? 1 : 0.35 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                  <path d="M4 2.5 L4 19 L8.6 14.9 L11.6 21.5 L14.4 20.3 L11.4 13.8 L17.6 13.8 Z" fill="#0ea5e9" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                <AnimatePresence>
                  {agentBusy && (
                    <motion.span
                      initial={reduce ? false : { opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="absolute left-5 top-4 whitespace-nowrap rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm"
                    >
                      Agent · {pointerLabel(pointer)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center px-6">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
              className="max-w-sm text-center flex flex-col items-center gap-3"
            >
              <div className="flex items-center justify-center size-12 rounded-full border border-border">
                {status === "starting" ? <span className="size-5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" /> : <Globe className="size-5 text-muted-foreground" />}
              </div>
              <p className="text-base font-medium">
                {status === "starting" ? "Starting your browser…" : status === "error" ? "The browser could not start" : "No page open yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {status === "error"
                  ? error || "Try again in a moment."
                  : "Type a website above, or ask the agent to open one. You and the agent use the same browser: you can click, scroll and type in it too, for example to enter a password."}
              </p>
              {status === "error" && (
                <button onClick={() => { setStatus("starting"); setError(""); getSocket()?.emit("studio:browser:watch"); }} className="h-8 px-3 rounded-md border border-border text-[13px] hover:bg-secondary transition-colors">Try again</button>
              )}
            </motion.div>
          </div>
        )}

      </div>

      {/* The agent is working in the browser: the page is locked for the user until it is done */}
      <AnimatePresence>
        {locked && live && (
          <motion.div
            key="lock"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-0 z-20 cursor-not-allowed"
            onMouseDown={(e) => e.preventDefault()}
            onWheel={(e) => e.stopPropagation()}
            title="The agent is using the browser"
          >
            <div className="absolute inset-0 ring-2 ring-inset ring-sky-500/70" />
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#181818]/90 dark:bg-[#0f0f0f]/90 px-3 py-1.5 text-[12.5px] text-white shadow-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-sky-500/60 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
              </span>
              <span className="whitespace-nowrap">The agent is using the browser{pointer && agentBusy ? ` · ${pointerLabel(pointer)}` : ""}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
