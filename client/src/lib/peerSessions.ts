// Session-to-session messaging (the Classgrid app and Classgrid Code, like Claude Code's peer messages): this window's
// link to its host. The host (desktop/sessions.js, the editor extension) owns the registry, the pipe and the token;
// this file only (1) tells it busy/idle, (2) hears messages and notices from other sessions, (3) tells it which
// messages were read. On the website none of this runs: every function is a no-op there.
//
// host -> UI  "cg-peer-message" {id, from:{sessionId,name,kind}, text, notifyIdle, receivedAt}
//             "cg-peer-notice"  {kind:"idle"|"exit"|"read", messageId, from:{sessionId,name}}
// UI -> host  "cg-session-status" {status:"busy"|"idle"}   "cg-peer-read" {ids}
// Reached as window.classgridDesktop.onPeerMessage / onPeerNotice / setSessionStatus / peerRead (the app's preload and
// the editor's bridge.js); an editor host that only posts window messages ({type:"cg-peer-message", ...}) or
// dispatches a "cg-peer-message" DOM event works too.

export type PeerFrom = { sessionId: string; name: string; kind?: string };
export type PeerMessage = { id: string; from: PeerFrom; text: string; notifyIdle?: boolean; receivedAt?: number };
export type PeerNotice = { kind: "idle" | "exit" | "read"; messageId?: string; from: PeerFrom };

type PeerHost = {
  onPeerMessage?: (cb: (m: PeerMessage) => void) => (() => void) | void;
  onPeerNotice?: (cb: (n: PeerNotice) => void) => (() => void) | void;
  setSessionStatus?: (status: "busy" | "idle") => unknown;
  sessionStatus?: (status: "busy" | "idle") => unknown; // the editor extension's name for it
  peerRead?: (ids: string[]) => unknown;
  peerInbox?: () => Promise<PeerMessage[]> | PeerMessage[];
};
const host = (): PeerHost | null => (typeof window !== "undefined" ? ((window as any).classgridDesktop as PeerHost | undefined) ?? null : null);

// Only the apps have a host that can carry messages
export const peerMessagingAvailable = () => {
  const h = host();
  return !!h && (typeof h.setSessionStatus === "function" || typeof h.sessionStatus === "function" || typeof h.onPeerMessage === "function");
};

let lastStatus: "busy" | "idle" | null = null;
// Tell the host whether an AI turn is running (it keeps the registry file's busy/idle and holds messages while busy)
export function reportSessionStatus(status: "busy" | "idle", force = false) {
  if (!force && lastStatus === status) return;
  lastStatus = status;
  try { const h = host(); void (h?.setSessionStatus ?? h?.sessionStatus)?.call(h, status); } catch { /* host gone */ }
}

// These messages were shown to the AI: the host drops them from the inbox (and tells the sender "read")
export function markPeerRead(ids: string[]) {
  const list = ids.filter(Boolean);
  if (!list.length) return;
  try { void host()?.peerRead?.(list); } catch { /* host gone */ }
}

// Unread messages still waiting in the host's inbox (one that came while a turn ran and no later step picked it up)
export async function peerInboxNow(): Promise<PeerMessage[]> {
  try { const r = await host()?.peerInbox?.(); return Array.isArray(r) ? r.filter(validMessage) : []; } catch { return []; }
}

const validMessage = (m: any): m is PeerMessage => !!m && typeof m.id === "string" && typeof m.text === "string" && !!m.from && typeof m.from === "object";

// Calls onMessage / onNotice for everything other sessions send to this one; returns the unsubscribe function.
// A message the host sends twice (a resend after a turn ended) is passed again only if it was not handled yet: the
// caller decides, so nothing is dropped here except a duplicate delivered by two routes at the same moment.
export function subscribePeers(onMessage: (m: PeerMessage) => void, onNotice: (n: PeerNotice) => void): () => void {
  const offs: Array<() => void> = [];
  const h = host();
  const lastDelivered = new Map<string, number>();
  const deliver = (m: PeerMessage) => {
    if (!validMessage(m)) return;
    const now = Date.now();
    if (now - (lastDelivered.get(m.id) || 0) < 300) return; // the same message through two routes
    lastDelivered.set(m.id, now);
    onMessage(m);
  };
  const noticeKeys = new Map<string, number>();
  const deliverNotice = (n: PeerNotice) => {
    if (!n || (n.kind !== "idle" && n.kind !== "exit" && n.kind !== "read") || !n.from) return;
    const key = `${n.kind}|${n.messageId || ""}|${n.from.sessionId}`;
    const now = Date.now();
    if (now - (noticeKeys.get(key) || 0) < 300) return;
    noticeKeys.set(key, now);
    onNotice(n);
  };
  // notices first: registering onPeerMessage makes the host flush its queue, and an earlier notice would be lost
  try { const off = h?.onPeerNotice?.(deliverNotice); if (typeof off === "function") offs.push(off); } catch { /* older host */ }
  try { const off = h?.onPeerMessage?.(deliver); if (typeof off === "function") offs.push(off); } catch { /* older host */ }
  if (typeof window !== "undefined") {
    const onWindowMessage = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "cg-peer-message") deliver(d.message || d.payload || d);
      else if (d.type === "cg-peer-notice") deliverNotice(d.notice || d.payload || d);
    };
    const onDomMessage = (e: Event) => deliver((e as CustomEvent).detail);
    const onDomNotice = (e: Event) => deliverNotice((e as CustomEvent).detail);
    if (peerMessagingAvailable()) {
      window.addEventListener("message", onWindowMessage);
      window.addEventListener("cg-peer-message", onDomMessage);
      window.addEventListener("cg-peer-notice", onDomNotice);
      offs.push(() => {
        window.removeEventListener("message", onWindowMessage);
        window.removeEventListener("cg-peer-message", onDomMessage);
        window.removeEventListener("cg-peer-notice", onDomNotice);
      });
    }
  }
  return () => { for (const off of offs) { try { off(); } catch { /* ignore */ } } };
}

// The text that starts the new turn: who sent it, then what they wrote
export const PEER_PREFIX = "[Peer message from @";
export function peerPrompt(m: PeerMessage): string {
  return `${PEER_PREFIX}${m.from.name} (session ${m.from.sessionId}, message ${m.id})]: ${m.text}${m.notifyIdle ? "\nThey asked to be told when you finish." : ""}`;
}

export type ParsedPeer = { name: string; sessionId: string; messageId: string; text: string; notifyIdle: boolean };
// A chat message that is a peer message (live, or loaded from the server where only the text is kept); null when it is not
export function parsePeerContent(content: unknown): ParsedPeer | null {
  const t = String(content || "");
  if (!t.startsWith(PEER_PREFIX)) return null;
  const m = t.match(/^\[Peer message from @(.*?) \(session ([^,)]*), message ([^)]*)\)\]: ([\s\S]*)$/);
  if (!m) return null;
  let text = m[4] ?? "";
  let notifyIdle = false;
  if (text.endsWith("\nThey asked to be told when you finish.")) { notifyIdle = true; text = text.slice(0, -"\nThey asked to be told when you finish.".length); }
  return { name: m[1] ?? "", sessionId: m[2] ?? "", messageId: m[3] ?? "", text, notifyIdle };
}
export const isPeerContent = (content: unknown) => typeof content === "string" && content.startsWith(PEER_PREFIX);

export const peerNoticeText = (n: PeerNotice) =>
  n.kind === "idle" ? `Session @${n.from.name} finished its turn` : n.kind === "exit" ? `Session @${n.from.name} closed` : `Session @${n.from.name} read your message`;
