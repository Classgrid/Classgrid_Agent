// Incognito chat (like claude.ai): a ghost button on a new chat, a dark "Incognito" bar with a close button. The server
// saves it like any chat but hidden from the user's lists; this browser keeps its id and messages in local storage (so a
// refresh keeps it), and closing incognito deletes the chat on the server.
import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Ghost icon: round top, wavy bottom, two eyes */
export function GhostIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 20.5V11a7 7 0 0 1 14 0v9.5l-2.33-1.75-2.34 1.75L12 18.75l-2.33 1.75L7.33 18.75 5 20.5Z" />
      <circle cx="9.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Filled ghost for the dark bar */
export function GhostIconSolid({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="currentColor" d="M12 3.5a7.5 7.5 0 0 0-7.5 7.5v10.2a.6.6 0 0 0 .96.48l1.87-1.4 1.97 1.48a.6.6 0 0 0 .72 0L12 20.28l1.98 1.48a.6.6 0 0 0 .72 0l1.97-1.48 1.87 1.4a.6.6 0 0 0 .96-.48V11A7.5 7.5 0 0 0 12 3.5Z" />
      <circle cx="9.4" cy="11" r="1.25" className="fill-white dark:fill-[#0f0f0f]" />
      <circle cx="14.6" cy="11" r="1.25" className="fill-white dark:fill-[#0f0f0f]" />
    </svg>
  );
}

/** The ghost button at the top right of a new chat */
export function IncognitoButton({ onClick }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Incognito chat"
      aria-label="Start an incognito chat"
      className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
    >
      <GhostIcon className="h-5 w-5" />
    </button>
  );
}

/** The dark bar above an incognito chat (slides in after the opening animation) */
export function IncognitoBar({ onClose }: { onClose: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <div className="shrink-0 flex items-center justify-between h-12 px-4 sm:px-5 text-[#141413] dark:text-white">
      <div className="flex items-center gap-2.5">
        <motion.span
          initial={{ opacity: 0, scale: 0.4, rotate: -14 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.25 }}
          className="flex"
        >
          <GhostIconSolid className="h-5 w-5" />
        </motion.span>
        <motion.span
          initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.32 }}
          className="text-[15px] font-medium"
        >
          Incognito
        </motion.span>
      </div>
      <motion.button
        type="button"
        onClick={onClose}
        aria-label="Leave incognito"
        title="Leave incognito"
        initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.38 }}
        whileTap={{ scale: 0.88 }}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[#141413]/70 hover:text-[#141413] hover:bg-black/5 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
      >
        <X className="h-5 w-5" />
      </motion.button>
    </div>
  );
}

// ─── Local storage (per browser): the open incognito chat, kept until it is closed ───
const KEY = 'cg_incognito_chat';
export function loadIncognitoChat(): any[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.messages) ? parsed.messages : null;
  } catch { return null; }
}
export function loadIncognitoSessionId(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    const id = raw ? JSON.parse(raw)?.sessionId : null;
    return typeof id === 'string' && id ? id : null;
  } catch { return null; }
}
export function saveIncognitoChat(messages: any[], sessionId?: string | null) {
  try { localStorage.setItem(KEY, JSON.stringify({ messages, sessionId: sessionId || loadIncognitoSessionId(), savedAt: Date.now() })); } catch { /* storage full or blocked */ }
}
/** Closes the incognito chat: deletes it on the server (messages, history cache) and forgets it in this browser */
export function clearIncognitoChat() {
  const sessionId = loadIncognitoSessionId();
  try { localStorage.removeItem(KEY); } catch { /* blocked */ }
  if (!sessionId) return;
  const api = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'https://api.classgrid.in';
  fetch(`${api}/api/ai/sessions/${sessionId}`, { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => { /* gone already or offline */ });
}
