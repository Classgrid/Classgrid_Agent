/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// trigger
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

import { App } from "@/app/App";
import { AppProviders } from "@/app/providers";
import { warmPages } from "@/lib/desktopPageCache";
import { queryClient } from "@/lib/queryClient";
import "@/styles/global.css";

// Local testing and the desktop app (never the website build): the API calls also send the saved login token, so the
// app stays logged in when it talks to the live server (whose login cookie is made for .classgrid.in, not localhost)
const isDesktopApp = import.meta.env.VITE_DESKTOP === "1";
// Desktop app only: Studio Mode's colors everywhere (global.css, html.desktop-app)
if (isDesktopApp) document.documentElement.classList.add("desktop-app");
// Desktop app: Google Sans, for Studio's new-chat greeting (AskAiPanel)
if (isDesktopApp) {
  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500&display=swap";
  document.head.appendChild(font);
}
// Classgrid Code's Agent panel (the editor build): inside the editor's own window, so no top bar of ours (global.css)
const isEditorPanel = import.meta.env.VITE_EDITOR === "1";
if (isEditorPanel) document.documentElement.classList.add("cg-editor");
// Desktop app: our own top bar in the window's title bar row, like Cursor (the window buttons sit on its right; pages
// such as Project Mode put their bar into #cg-titlebar-slot). The app sits below it (global.css).
if (isDesktopApp && !isEditorPanel) {
  const bar = document.createElement("div");
  bar.id = "cg-titlebar";
  bar.innerHTML = '<img src="/favicon.ico" alt="" class="cg-titlebar-icon"><div id="cg-titlebar-slot"></div>';
  document.body.prepend(bar);
  let dark: boolean | null = null;
  const sendTheme = () => {
    const now = document.documentElement.classList.contains("dark");
    if (now !== dark) { dark = now; (window as any).classgridDesktop?.setTitleBar?.(now); }
  };
  sendTheme();
  new MutationObserver(sendTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  // While the welcome screen plays: every page's first data is fetched in advance (after this file has set up the
  // login on fetch, below), so no page shows loading bars on its first visit
  setTimeout(() => warmPages(queryClient), 0);
}
if (import.meta.env.DEV || isDesktopApp) {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let token: string | null = null;
    try { token = localStorage.getItem("token"); } catch { /* storage blocked */ }
    if (token && token !== "null" && /^(\/api\/|https?:\/\/localhost(:\d+)?\/api\/|https:\/\/api\.classgrid\.in\/api\/)/.test(url)) {
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      init = { ...init, headers };
    }
    return realFetch(input, init);
  };
}

// Desktop app: hand the login token to the app, so it can run this user's project tools on this computer
if (isDesktopApp) {
  const desktop = (window as any).classgridDesktop;
  let lastToken: string | null = null;
  const sendToken = () => {
    let token: string | null = null;
    try { token = localStorage.getItem("token"); } catch { /* storage blocked */ }
    if (token === "null") token = null;
    if (token !== lastToken) { lastToken = token; desktop?.setToken?.(token); }
  };
  sendToken();
  setInterval(sendToken, 3000);
}

// Handle Vite dynamic import errors (usually happens after a new deployment when chunks change hashes)
window.addEventListener('unhandledrejection', (event) => {
  const isChunkLoadError = event.reason && (
    event.reason.name === 'ChunkLoadError' ||
    event.reason.message?.includes('Failed to fetch dynamically imported module') ||
    event.reason.message?.includes('Importing a module script failed')
  );

  if (isChunkLoadError) {
    console.error('Detected chunk load error. Attempting to reload the page to fetch the latest assets.');
    
    // Prevent infinite reload loops using sessionStorage
    const reloadKey = 'vite_chunk_reload_flag';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(reloadKey, now.toString());
      window.location.reload();
    } else {
      console.error('Already attempted to reload recently. Stopping to prevent infinite loop.');
    }
  }
});

// Also handle the same error if it manifests as a normal error event (e.g. MIME type error in script tag)
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"')
  ) {
    const reloadKey = 'vite_chunk_reload_flag';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(reloadKey, now.toString());
      window.location.reload();
    }
  }
});

// Initialize PostHog if key is available
if (typeof window !== 'undefined' && import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (posthog) => {
      // Keep desktop events separate from marketing site
      posthog.register({ app_source: 'desktop_app' });
    }
  });
}

// Intercept OAuth callback redirects in popup windows
const params = new URLSearchParams(window.location.search);
const hasIntegrationCallback = params.has('integration_success') || params.has('integration_error');

if (hasIntegrationCallback) {
  const successProvider = params.get('integration_success');
  const errorProvider = params.get('integration_error');
  const payload = successProvider 
    ? { type: 'integration_success', provider: successProvider } 
    : { type: 'integration_error', provider: errorProvider };

  // 1. Try postMessage (works if window.opener is preserved)
  if (window.opener && window.opener !== window) {
    window.opener.postMessage(payload, '*');
  }
  
  // 2. Try localStorage as a fallback (works even if window.opener is null due to COOP)
  localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
  
  // 3. Close the popup
  setTimeout(() => window.close(), 100);
  
  // 4. STOP React from rendering so the heavy app doesn't load
  const root = document.getElementById("root");
  if (root) {
      root.innerHTML = "<div style='display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;'>Authenticating... You can close this window.</div>";
  }
} else if (window.location.hostname === "chat.classgrid.in" || (import.meta.env.DEV && params.has("cgcheck"))) {
  // VPN / proxy / Tor visitors get a blank page and the app never loads; everyone else first passes the
  // Cloudflare Turnstile "Verify you are human" check (owner, 2026-11-01). See /api/net-check.
  netCheckBlocked().then((blocked) => (blocked ? showBlankPage() : humanCheck().then(renderApp)));
} else {
  renderApp();
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <PostHogProvider client={posthog}>
          <AppProviders>
            <App />
          </AppProviders>
        </PostHogProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

async function netCheckBlocked(): Promise<boolean> {
  const okKey = "cg_net_ok_until";
  try { if (Number(sessionStorage.getItem(okKey)) > Date.now()) return false; } catch { /* storage blocked */ }
  try {
    const res = await fetch((import.meta.env.VITE_API_URL || "https://api.classgrid.in") + "/api/net-check", { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data?.blocked) return true;
    try { sessionStorage.setItem(okKey, String(Date.now() + 10 * 60 * 1000)); } catch { /* storage blocked */ }
  } catch { /* check failed: let the visitor in */ }
  return false;
}

// Cloudflare Turnstile check, like the "Verify you are human" page on grok.com. Passing it is remembered
// in this browser for a day.
function humanCheck(): Promise<void> {
  const passKey = "cg_human_until";
  try { if (Number(localStorage.getItem(passKey)) > Date.now()) return Promise.resolve(); } catch { /* storage blocked */ }
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAELIHhXQqcev5Im7";
  const api = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
  const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const fg = dark ? "#ededed" : "#111111";
  const muted = dark ? "#a1a1a1" : "#555555";
  const line = dark ? "#2a2a2a" : "#e5e5e5";
  document.documentElement.style.background = dark ? "#0a0a0a" : "#ffffff";
  document.body.style.background = dark ? "#0a0a0a" : "#ffffff";

  return new Promise((resolve) => {
    const root = document.getElementById("root")!;
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${fg}">
        <div style="flex:1;width:100%;max-width:640px;margin:0 auto;padding:18vh 20px 40px;box-sizing:border-box">
          <h1 style="font-size:40px;font-weight:600;margin:0 0 12px">chat.classgrid.in</h1>
          <h2 style="font-size:22px;font-weight:500;margin:0 0 12px">Checking that you're human</h2>
          <p style="font-size:15px;line-height:1.6;color:${muted};margin:0 0 28px">This keeps Classgrid safe from bots. It only takes a moment.</p>
          <div id="cg-turnstile"></div>
          <p id="cg-turnstile-msg" style="font-size:14px;color:${muted};margin:16px 0 0"></p>
        </div>
        <div style="border-top:1px solid ${line};max-width:640px;width:calc(100% - 40px);margin:0 auto;padding:16px 0 24px;text-align:center;font-size:13px;color:${muted}">Protected by Cloudflare</div>
      </div>`;
    const msg = (t: string) => { const el = document.getElementById("cg-turnstile-msg"); if (el) el.textContent = t; };

    const pass = () => {
      try { localStorage.setItem(passKey, String(Date.now() + 24 * 60 * 60 * 1000)); } catch { /* storage blocked */ }
      root.innerHTML = "";
      resolve();
    };

    const w = window as any;
    const render = () => {
      w.turnstile.render("#cg-turnstile", {
        sitekey: siteKey,
        theme: dark ? "dark" : "light",
        callback: async (token: string) => {
          msg("Checking…");
          try {
            const res = await fetch(api + "/api/net-check/human", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
            const data = await res.json();
            if (data?.ok) return pass();
            msg("That didn't work. Please try again.");
            w.turnstile.reset("#cg-turnstile");
          } catch {
            pass(); // our server can't be reached: don't lock the visitor out
          }
        },
        "error-callback": () => { msg("The check couldn't load. Please refresh the page."); },
      });
    };

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = render;
    script.onerror = () => pass(); // Cloudflare blocked or down: let the visitor in
    document.head.appendChild(script);
  });
}

function showBlankPage() {
  const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  document.documentElement.style.background = dark ? "#0a0a0a" : "#ffffff";
  document.body.style.background = dark ? "#0a0a0a" : "#ffffff";
  document.body.innerHTML = "";
}

// Vercel trigger// redeploy: code restored to cbb3de8

// redeploy trigger
