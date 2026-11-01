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

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export type CurrentUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  organization_id?: string;
  [key: string]: any;
};

// Desktop app: the signed-in user is also kept here, so with no internet the app still opens and the chats saved on
// this computer can be read (only for the same person as the saved login token)
const DESKTOP_USER_KEY = "cg_desktop_user";
const keepsDesktopUser = () => typeof window !== "undefined" && !!(window as any).classgridDesktop?.saveChat;
function savedDesktopUser(): CurrentUser | null {
  try {
    const token = localStorage.getItem("token");
    const saved = JSON.parse(localStorage.getItem(DESKTOP_USER_KEY) || "null");
    if (!token || !saved) return null;
    const payload = JSON.parse(atob((token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.id && String(payload.id) === String(saved._id || saved.id) ? saved : null;
  } catch { return null; }
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        // Fallback for OAuth and SSO: Extract token from URL if it exists
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get("token") || params.get("sso_token");
        if (urlToken) {
          localStorage.setItem("token", urlToken);
          // Remove token from URL for security/cleanliness
          params.delete("token");
          params.delete("sso_token");
          const newSearch = params.toString() ? `?${params.toString()}` : "";
          window.history.replaceState({}, document.title, window.location.pathname + newSearch);
        }

        const res = await apiClient.get<CurrentUser | { user: CurrentUser; token?: string }>("/api/auth/me");
        
        // Save refreshed token from /api/auth/me response
        if ("token" in res.data && res.data.token) {
          localStorage.setItem("token", res.data.token);
        }

        const data = "user" in res.data ? res.data.user : res.data;
        if (data && !data._id && data.id) {
          data._id = data.id;
        }
        if (keepsDesktopUser() && data) { try { localStorage.setItem(DESKTOP_USER_KEY, JSON.stringify(data)); } catch { /* storage full */ } }
        return data;
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === "401" || code === "403" || !localStorage.getItem("token")) return null; // Not logged in
        // Desktop app, server can't be reached: open as the saved user (saved chats are readable offline)
        if (keepsDesktopUser() && (code === "UNKNOWN" || code === "502" || code === "503" || code === "504")) {
          const saved = savedDesktopUser();
          if (saved) return saved;
        }
        throw err;
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
    retry: (failureCount) => failureCount < 30,
    retryDelay: 2000,
  });
}
