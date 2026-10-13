// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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
import "@/styles/global.css";

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
} else {
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

// Vercel trigger