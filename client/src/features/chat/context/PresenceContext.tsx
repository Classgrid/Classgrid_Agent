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

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useChatBlocks } from "../hooks/useChatBlocks";

const SUPABASE_CHAT_URL =
  import.meta.env.VITE_SUPABASE_CHAT_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  "https://bumxgscngzjadyozdpce.supabase.co";

const SUPABASE_CHAT_KEY =
  import.meta.env.VITE_SUPABASE_CHAT_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "";

let _presenceSb: ReturnType<typeof createClient> | null = null;

function getPresenceSupabase() {
  if (!_presenceSb && SUPABASE_CHAT_URL && SUPABASE_CHAT_KEY) {
    _presenceSb = createClient(SUPABASE_CHAT_URL, SUPABASE_CHAT_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: 'presence-sb-key' },
    });
  }
  return _presenceSb;
}

interface PresenceContextValue {
  onlineUsers: Set<string>;
}

const PresenceContext = createContext<PresenceContextValue>({
  onlineUsers: new Set(),
});

export function useOnlineUsers() {
  return useContext(PresenceContext).onlineUsers;
}

interface PresenceProviderProps extends PropsWithChildren {
  userId: string | null;
}

export function PresenceProvider({ userId, children }: PresenceProviderProps) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    const sb = getPresenceSupabase();
    if (!sb) return;

    const channel = sb.channel("classgrid-global-presence", {
      config: { presence: { key: userId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const ids = new Set<string>();
      Object.keys(state).forEach((id) => ids.add(id));
      setOnlineUsers(ids);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ onlineAt: new Date().toISOString() });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  // Blocking: nobody on either side of a block sees the other online, on any screen (chat, profiles, dots).
  // useChatBlocks keeps the block list live over the user's WebSocket channel.
  const { hiddenIds } = useChatBlocks(userId);
  const visibleOnlineUsers = useMemo(
    () => (hiddenIds.size ? new Set([...onlineUsers].filter((id) => !hiddenIds.has(id))) : onlineUsers),
    [onlineUsers, hiddenIds]
  );

  return (
    <PresenceContext.Provider value={{ onlineUsers: visibleOnlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
}
