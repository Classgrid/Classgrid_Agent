import { Children, Fragment, cloneElement, isValidElement, useSyncExternalStore, type ReactNode } from "react";

// A plugin, Web search or Deep research picked in the chat box (the "@" menu, or "@Name" typed by hand) shows as the
// app's logo and its name in the text, in the chat box and in the user's own message (owner, 2026-11-27). The text
// stays "@<name>" underneath: that is what is sent, saved and copied, and what the AI reads (the server tells the AI
// which apps were picked: server/src/utils/picked-apps.js, the same matching rule as here).

export type MentionItem = {
  name: string;
  /** The logo: an SVG file (the apps' logos on Classgrid's CDN) or one of the two SVGs below. */
  logo: string;
  /** A black logo: drawn light in dark mode (GitHub, Vercel, Sanity, ...). */
  invertInDarkMode?: boolean;
  invertInLightMode?: boolean;
};

// Web search and Deep research have logos of their own, drawn in the apps' logo style (flat colours that read on a
// light and a dark background). Kept here as SVG; the phone app has the same two (src/components/composer/mentionLogos.ts).
// A globe drawn the way people know "the web" (owner, 2026-11-27: the first one "is not looking like web"): a blue ball
// with a centre line, a meridian, the equator and two curved latitude lines. The phone has the same one.
export const WEB_SEARCH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#1A73E8"/><g fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"><path d="M12 1.6v20.8"/><ellipse cx="12" cy="12" rx="4.8" ry="10.4"/><path d="M1.6 12h20.8"/><path d="M3.2 6.9Q12 9.5 20.8 6.9"/><path d="M3.2 17.1Q12 14.5 20.8 17.1"/></g></svg>';
export const DEEP_RESEARCH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 2.5h9.2L19 7.3V19a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 3 19V4.5a2 2 0 0 1 2-2z" fill="#7C5CFF"/><path d="M14.2 2.5V6a1.3 1.3 0 0 0 1.3 1.3H19z" fill="#B9A8FF"/><path d="M6.5 9.5h6M6.5 12.5h4" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/><circle cx="15" cy="16" r="4" fill="#FFFFFF" stroke="#F5A623" stroke-width="2"/><path d="M18 19l3.4 3.4" fill="none" stroke="#F5A623" stroke-width="2.4" stroke-linecap="round"/></svg>';
const svgUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
export const WEB_SEARCH_LOGO = svgUrl(WEB_SEARCH_SVG);
export const DEEP_RESEARCH_LOGO = svgUrl(DEEP_RESEARCH_SVG);
export const SEARCH_MENTION_ITEMS: MentionItem[] = [
  { name: "Web search", logo: WEB_SEARCH_LOGO },
  { name: "Deep research", logo: DEEP_RESEARCH_LOGO },
];

/** The CSS filter of a logo (the site's --icon-invert variables, set per theme in global.css). */
export const logoFilter = (item: Pick<MentionItem, "invertInDarkMode" | "invertInLightMode">) =>
  item.invertInDarkMode ? "var(--icon-invert, none)" : item.invertInLightMode ? "var(--icon-invert-light, none)" : "none";

// ── The known names: the built-in plugins and the two search items (AskAiPanel), and the user's custom connectors ──
const lists: Record<string, MentionItem[]> = {};
let snapshot: MentionItem[] = [];
const listeners = new Set<() => void>();
export function registerMentionItems(key: string, items: MentionItem[]) {
  lists[key] = items;
  const seen = new Set<string>();
  snapshot = Object.values(lists).flat().filter((i) => {
    const k = i.name.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useMentionItems = () => useSyncExternalStore(subscribe, () => snapshot, () => snapshot);

// ── Finding "@Name" in text ──
export type MentionPart = { text: string } | { item: MentionItem; raw: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const reCache = new WeakMap<MentionItem[], RegExp | null>();
/**
 * "@" at the start or after a space or an opening bracket or quote (never inside an email address), then a known
 * name (the longest one, any letter case) that ends the word (not "@Gmailx" or "@Gmail.com").
 */
function mentionRe(items: MentionItem[]): RegExp | null {
  if (reCache.has(items)) return reCache.get(items) || null;
  const names = items.map((i) => i.name.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  const re = names.length
    ? new RegExp(`(?:^|(?<=[\\s(\\[{"'“‘]))@(${names.map(escapeRe).join("|")})(?![\\p{L}\\p{N}_-])(?!\\.[\\p{L}\\p{N}])`, "giu")
    : null;
  reCache.set(items, re);
  return re;
}
const itemFor = (items: MentionItem[], raw: string) => items.find((i) => i.name.trim().toLowerCase() === raw.toLowerCase());

/** The text cut into plain parts and known mentions ("raw" is the name as written, without the "@"). */
export function splitMentions(text: string, items: MentionItem[]): MentionPart[] {
  const re = mentionRe(items);
  if (!text || !re || !text.includes("@")) return [{ text }];
  const parts: MentionPart[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const item = itemFor(items, m[1] || "");
    if (!item || m.index === undefined) continue;
    if (m.index > at) parts.push({ text: text.slice(at, m.index) });
    parts.push({ item, raw: m[1] || "" });
    at = m.index + m[0].length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts.length ? parts : [{ text }];
}

/** A known mention that ends exactly at the end of `before` (the text up to the caret), or null. */
export function mentionAtEnd(before: string, items: MentionItem[]): { start: number; item: MentionItem; raw: string } | null {
  const re = mentionRe(items);
  if (!re || !before.includes("@")) return null;
  let last: { start: number; item: MentionItem; raw: string } | null = null;
  for (const m of before.matchAll(re)) {
    const item = itemFor(items, m[1] || "");
    if (item && m.index !== undefined && m.index + m[0].length === before.length) last = { start: m.index, item, raw: m[1] || "" };
  }
  return last;
}

// ── How a mention looks: the logo, then the name in the link blue, on a light blue background ──
const TOKEN_CLASS =
  "cg-mention inline rounded-md px-1 py-px mx-px font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/15 whitespace-nowrap [box-decoration-break:clone]";
const LOGO_CLASS = "inline-block size-[1em] align-[-0.15em] mr-1 object-contain select-none pointer-events-none";
// (the "@" is kept in the text, unseen, so a copied selection still reads "@Gmail")
const AT_CLASS = "inline-block w-0 overflow-hidden opacity-0 align-baseline";

/** One mention in a message (the user's own bubble). */
export function MentionToken({ item, raw }: { item: MentionItem; raw: string }) {
  return (
    <span className={TOKEN_CLASS} title={item.name}>
      <img src={item.logo} alt="" draggable={false} className={LOGO_CLASS} style={{ filter: logoFilter(item) }} />
      <span className={AT_CLASS}>@</span>
      {raw}
    </span>
  );
}

/** Text with its known mentions drawn as tokens. */
export function MentionText({ text, items }: { text: string; items: MentionItem[] }) {
  const parts = splitMentions(text, items);
  if (!parts.some((p) => "item" in p)) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) => ("item" in p ? <MentionToken key={i} item={p.item} raw={p.raw} /> : <Fragment key={i}>{p.text}</Fragment>))}
    </>
  );
}

/** Markdown children (strings, and elements such as bold or links) with the mentions in their plain strings drawn. */
export function WithMentions({ children }: { children?: ReactNode }) {
  const items = useMentionItems();
  const walk = (node: ReactNode): ReactNode =>
    typeof node === "string"
      ? <MentionText text={node} items={items} />
      : Array.isArray(node)
        ? Children.map(node, walk)
        : isValidElement(node) && (node.type === "strong" || node.type === "em" || node.type === "del")
          ? cloneElement(node as any, undefined, walk((node.props as any).children))
          : node;
  return <>{walk(children)}</>;
}

// ── The chat box (RichChatInput, a contenteditable): a mention is one piece the caret cannot enter ──
/** The box's element for one mention; turned back into "@<raw>" by the box's markdown rule. */
export function mentionNode(doc: Document, item: MentionItem, raw: string): HTMLSpanElement {
  const span = doc.createElement("span");
  span.setAttribute("data-mention", raw);
  span.setAttribute("contenteditable", "false");
  span.className = TOKEN_CLASS;
  span.title = item.name;
  const img = doc.createElement("img");
  img.src = item.logo;
  img.alt = "";
  img.draggable = false;
  img.className = LOGO_CLASS;
  img.style.filter = logoFilter(item);
  const at = doc.createElement("span");
  at.className = AT_CLASS;
  at.textContent = "@";
  span.append(img, at, doc.createTextNode(raw));
  return span;
}

/**
 * Every known "@Name" in the box's text becomes a mention node (not inside code, a code block or a link). A mention
 * that ends its line gets a space after it, so what is typed next is a new word ("@Gmail hi", never "@Gmailhi").
 */
export function decorateMentions(root: HTMLElement, items: MentionItem[]) {
  if (!items.length || !(root.textContent || "").includes("@")) return;
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => ((n.parentElement as HTMLElement | null)?.closest("code,pre,a,[data-mention]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if ((n.textContent || "").includes("@")) nodes.push(n as Text);
  for (const node of nodes) {
    const parts = splitMentions(node.textContent || "", items);
    if (!parts.some((p) => "item" in p)) continue;
    const frag = root.ownerDocument.createDocumentFragment();
    for (const p of parts) frag.append("item" in p ? mentionNode(root.ownerDocument, p.item, p.raw) : root.ownerDocument.createTextNode(p.text));
    node.replaceWith(frag);
  }
  root.querySelectorAll<HTMLElement>("[data-mention]").forEach((el) => {
    const next = el.nextSibling;
    if (!next || (next.nodeName === "BR")) el.after(root.ownerDocument.createTextNode(" "));
  });
}
