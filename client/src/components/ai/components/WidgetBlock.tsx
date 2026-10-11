import { useEffect, useMemo, useRef, useState } from "react";

// ```widget: a small interactive card the AI writes itself (HTML + CSS + JS), for anything no built-in block covers
// (polls, sliders, matching, ordering, reveal cards, mini quizzes, calculators...).
// It runs in a sandboxed iframe with no same-origin access (no cookies, token or storage of this app) and a CSP
// that blocks all network requests except https images/fonts.
// The frame loads once and draws LIVE while the AI is still writing (like ChatGPT): every new piece of code is
// posted in, styles and HTML show at once, and the scripts run when the block is complete. Messages back:
//   classgrid.ask("text")  → sends that text as the user's next message (only from a click inside the card)
//   automatic height updates so the card fits its content.

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 2400;

function themeVars(dark: boolean) {
  // Neutral accent like ChatGPT (white buttons in dark mode, black in light); green/red only for right/wrong
  return dark
    ? "--cg-bg:transparent;--cg-card:#1A1A19;--cg-card-2:#262625;--cg-text:#F0EFED;--cg-muted:#A6A6A3;--cg-border:rgba(255,255,255,.12);--cg-accent:#F0EFED;--cg-accent-text:#1A1A19;--cg-success:#34D399;--cg-danger:#F87171;--cg-warning:#FBBF24;"
    : "--cg-bg:transparent;--cg-card:#FFFFFF;--cg-card-2:#F4F4F3;--cg-text:#2C2C2B;--cg-muted:#6B6B69;--cg-border:rgba(0,0,0,.1);--cg-accent:#2C2C2B;--cg-accent-text:#FFFFFF;--cg-success:#059669;--cg-danger:#DC2626;--cg-warning:#D97706;";
}

// Runs inside the iframe (serialized with toString, so it must not use anything from this module)
function frameMain(ID: string) {
  const post = (m: Record<string, unknown>) => parent.postMessage(Object.assign({ cgWidget: ID }, m), "*");
  (window as any).classgrid = { ask: (t: unknown) => post({ type: "ask", text: String(t || "") }) };

  const size = () => {
    const b = document.body;
    if (b) post({ type: "height", value: Math.ceil(b.getBoundingClientRect().height) });
  };
  window.addEventListener("load", size);
  document.addEventListener("load", size, true); // images and fonts that load later
  document.addEventListener("click", () => setTimeout(size, 50), true);
  if ((window as any).ResizeObserver) new ResizeObserver(size).observe(document.body);

  const root = document.getElementById("cg-root") as HTMLElement;
  const styleEl = document.createElement("style");
  document.head.appendChild(styleEl);
  let lastCss = "";
  let lastMarkup = "";
  let ran = false;
  let pending: { code: string; done: boolean } | null = null;

  // The page has already loaded when the card's scripts run, so "wait for load" listeners fire right away
  const docAdd = document.addEventListener.bind(document);
  (document as any).addEventListener = (type: string, fn: any, opts?: any) =>
    ran && type === "DOMContentLoaded" ? setTimeout(fn, 0) : docAdd(type, fn, opts);
  const winAdd = window.addEventListener.bind(window);
  (window as any).addEventListener = (type: string, fn: any, opts?: any) =>
    ran && (type === "load" || type === "DOMContentLoaded") ? setTimeout(fn, 0) : winAdd(type, fn, opts);

  const render = () => {
    if (!pending) return;
    const { code, done } = pending;
    pending = null;
    let css = "";
    const scripts: string[] = [];
    let markup = code.replace(/<style[^>]*>([\s\S]*?)(<\/style>|$)/gi, (_m, c) => { css += c + "\n"; return ""; });
    markup = markup.replace(/<script[^>]*>([\s\S]*?)(<\/script>|$)/gi, (_m, c, end) => { if (end) scripts.push(c); return ""; });
    markup = markup.replace(/<[^>]*$/, ""); // a tag that is only half written
    if (css !== lastCss) { styleEl.textContent = css; lastCss = css; }
    if (!ran && markup !== lastMarkup) { root.innerHTML = markup; lastMarkup = markup; }
    if (done && !ran) {
      ran = true;
      for (const s of scripts) {
        const el = document.createElement("script");
        el.textContent = s;
        root.appendChild(el);
      }
      setTimeout(size, 50);
      setTimeout(size, 400);
    }
    size();
  };

  winAdd("message", (e: MessageEvent) => {
    const m = e.data;
    if (e.source !== parent || !m || m.cgWidget !== ID || m.type !== "code") return;
    pending = { code: String(m.code || ""), done: !!m.done };
    requestAnimationFrame(render); // at most one redraw per frame while the AI types
    setTimeout(render, 120); // rAF can be paused when the tab is in the background
  });
  post({ type: "ready" });
}

function buildShell(id: string, dark: boolean) {
  const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:; media-src https:; form-action 'none'; base-uri 'none'";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{${themeVars(dark)}color-scheme:${dark ? "dark" : "light"}}
*{box-sizing:border-box}
html,body{margin:0;padding:0;}body{display:flow-root;background:transparent;color:var(--cg-text);font:16px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}
button{font:inherit;color:inherit;cursor:pointer}
img{max-width:100%}
</style></head><body><div id="cg-root"></div>
<script>(${frameMain.toString()})(${JSON.stringify(id)});</script></body></html>`;
}

export function WidgetBlock({ code, done, onAsk }: { code: string; done: boolean; onAsk?: (text: string) => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);
  // Seconds shown next to "Working" while the card is being written (same look as "Thinking 2s")
  const [workSecs, setWorkSecs] = useState(0);
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setWorkSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [done]);
  const id = useMemo(() => Math.random().toString(36).slice(2), []);
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  // The shell has no card code in it, so it never reloads while the AI is writing
  const shell = useMemo(() => buildShell(id, dark), [id, dark]);
  const onAskRef = useRef(onAsk);
  onAskRef.current = onAsk;
  const latest = useRef({ code, done });
  latest.current = { code, done };
  const ready = useRef(false);
  const lastAsk = useRef(0);

  const send = () => {
    const win = frameRef.current?.contentWindow;
    if (win && ready.current) win.postMessage({ cgWidget: id, type: "code", ...latest.current }, "*");
  };

  useEffect(send, [code, done]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || e.source !== frame.contentWindow) return;
      const msg = e.data;
      if (!msg || typeof msg !== "object" || msg.cgWidget !== id) return;
      if (msg.type === "ready") {
        ready.current = true;
        send();
      } else if (msg.type === "height" && Number.isFinite(msg.value)) {
        setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, msg.value)));
      } else if (msg.type === "ask" && typeof msg.text === "string" && msg.text.trim()) {
        // Only a real click inside the card may send a message: the iframe must have focus, at most once every 1.5 s
        const now = Date.now();
        if (document.activeElement !== frame || now - lastAsk.current < 1500) return;
        lastAsk.current = now;
        onAskRef.current?.(msg.text.trim().slice(0, 1000));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="my-4">
      <iframe
        ref={frameRef}
        title="Interactive card"
        sandbox="allow-scripts"
        srcDoc={shell}
        className="block w-full border-0 bg-transparent"
        style={{ height, colorScheme: dark ? "dark" : "light" }}
      />
      {!done && (
        <div className="mt-2 flex items-center gap-1.5">
          <p
            className="bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-[14px] font-medium text-transparent"
            style={{ animation: "cgWorkShimmer 2.5s linear infinite" }}
          >
            Working
          </p>
          <span className="text-sm text-muted-foreground">{workSecs}s</span>
          <style>{`@keyframes cgWorkShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        </div>
      )}
    </div>
  );
}
