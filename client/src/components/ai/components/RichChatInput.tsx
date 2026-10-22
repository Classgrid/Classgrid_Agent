import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from "react";
import TurndownService from "turndown";
import { Marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

// The chat box with formatting shown while typing: links, bold, italic, inline code, code blocks, lists.
// It still works like the old textarea for the panel: `value` is markdown (that is what the AI gets),
// the element has .value / .selectionStart / .style / .scrollHeight / .focus(), and onChange / onPaste /
// onKeyDown get an event whose target is that element.

const ZWSP = "​"; // invisible spot after a formatted word, so typing goes on as plain text

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*", br: "" });
td.remove(["script", "style", "img", "meta", "head"] as any);
// What the user typed is kept as typed (no backslashes added before * _ # etc.)
(td as any).escape = (s: string) => s;
// A link whose text is the link itself goes to the AI as just the link
td.addRule("bareLink", {
  filter: (n: any) => n.nodeName === "A" && !!n.getAttribute("href") && (n.textContent || "").trim() === n.getAttribute("href"),
  replacement: (_c: string, n: any) => n.getAttribute("href"),
});
td.addRule("strike", { filter: ["del", "s", "strike"] as any, replacement: (c: string) => `~~${c}~~` });

const md = new Marked({ gfm: true, breaks: true });
md.use({
  renderer: {
    // Raw HTML in the text shows as text, never as page HTML
    html(t: any) {
      const s = typeof t === "string" ? t : t?.text || "";
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
  } as any,
});

const ALLOWED = {
  ALLOWED_TAGS: ["a", "b", "strong", "i", "em", "code", "pre", "ul", "ol", "li", "p", "br", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "del", "s"],
  ALLOWED_ATTR: ["href"],
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return td.turndown(html).split(ZWSP).join("").replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function markdownToHtml(value: string): string {
  if (!value) return "";
  const raw = md.parse(value) as string;
  return DOMPurify.sanitize(raw, ALLOWED as any) as unknown as string;
}

function textToHtml(text: string): string {
  return escapeHtml(text)
    .replace(URL_RE, (u) => `<a href="${u}">${u}</a>`)
    .replace(/\r?\n/g, "<br>");
}

function placeCaretAtEnd(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
}

function insertHtml(html: string) {
  document.execCommand("insertHTML", false, html);
}

export type RichChatTarget = HTMLDivElement & { value: string; selectionStart: number; selectionEnd: number };

type Props = {
  id?: string;
  name?: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onChange?: (e: { target: RichChatTarget; currentTarget: RichChatTarget }) => void;
  onPaste?: (e: React.ClipboardEvent<any>) => any;
  onKeyDown?: (e: React.KeyboardEvent<any>) => void;
};

const RichChatInput = forwardRef<any, Props>(function RichChatInput(
  { id, name, value, disabled, placeholder, className, onChange, onPaste, onKeyDown },
  ref
) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const lastValue = useRef<string | null>(null);

  // Markdown length of everything before the caret (used by the @ menu like a textarea's selectionStart)
  const caretOffset = useCallback((): number => {
    const el = elRef.current;
    if (!el) return 0;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !el.contains(sel.anchorNode)) return (lastValue.current || "").length;
    const r = document.createRange();
    r.selectNodeContents(el);
    try { r.setEnd(sel.anchorNode as Node, sel.anchorOffset); } catch { return (lastValue.current || "").length; }
    const box = document.createElement("div");
    box.appendChild(r.cloneContents());
    const before = htmlToMarkdown(box.innerHTML);
    const tail = (box.textContent || "").split(ZWSP).join("").match(/[\s ]*$/)?.[0] || "";
    return before.length + tail.length;
  }, []);

  // Make the div look like a textarea to the existing panel code
  const setNode = useCallback((node: HTMLDivElement | null) => {
    elRef.current = node;
    if (node && !(node as any).__richReady) {
      (node as any).__richReady = true;
      Object.defineProperty(node, "value", { configurable: true, get: () => lastValue.current ?? "" });
      Object.defineProperty(node, "selectionStart", { configurable: true, get: () => caretOffset() });
      Object.defineProperty(node, "selectionEnd", { configurable: true, get: () => caretOffset() });
      const nativeFocus = HTMLElement.prototype.focus;
      (node as any).focus = (opts?: FocusOptions) => {
        nativeFocus.call(node, opts);
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !node.contains(sel.anchorNode)) placeCaretAtEnd(node);
      };
    }
  }, [caretOffset]);

  useImperativeHandle(ref, () => elRef.current as any, []);

  // A new value from outside (send clears it, voice text, @ menu pick, saved draft): show it formatted
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const v = value || "";
    if (v === lastValue.current) return;
    lastValue.current = v;
    el.innerHTML = markdownToHtml(v);
    if (!v) el.style.height = "";
    if (document.activeElement === el) placeCaretAtEnd(el);
  }, [value]);

  // Same empty size as the old textarea (it showed 2 lines): never smaller than 2 lines + its padding
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const fit = () => {
      // measure a hidden copy of the old textarea with the very same classes, and use its height
      const ghost = document.createElement("textarea");
      ghost.className = el.className;
      ghost.placeholder = placeholder || "";
      ghost.setAttribute("aria-hidden", "true");
      ghost.tabIndex = -1;
      Object.assign(ghost.style, { position: "absolute", visibility: "hidden", pointerEvents: "none", left: "0", top: "0", width: `${el.offsetWidth}px` });
      (el.parentElement || document.body).appendChild(ghost);
      const h = ghost.getBoundingClientRect().height;
      ghost.remove();
      if (h > 0) el.style.minHeight = `${h}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [className, placeholder]);

  const emit = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    // An emptied box goes back to truly empty, so the placeholder shows again
    if (!(el.textContent || "").split(ZWSP).join("").trim() && !el.querySelector("li,pre")) el.innerHTML = "";
    const v = htmlToMarkdown(el.innerHTML);
    lastValue.current = v;
    onChange?.({ target: el as RichChatTarget, currentTarget: el as RichChatTarget });
  }, [onChange]);

  // Typed markdown turns into formatting right away: **bold**, *italic*, `code`, ~~strike~~, [text](link), and links
  const formatTyped = useCallback((typed: string | null) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    if ((node.parentElement as HTMLElement | null)?.closest("code,pre,a")) return;
    const text = (node.textContent || "").slice(0, sel.anchorOffset);
    const rules: Array<[RegExp, (m: RegExpMatchArray) => HTMLElement]> = [
      [/\*\*([^*\n]+?)\*\*$/, (m) => Object.assign(document.createElement("strong"), { textContent: m[1] })],
      [/~~([^~\n]+?)~~$/, (m) => Object.assign(document.createElement("del"), { textContent: m[1] })],
      [/`([^`\n]+?)`$/, (m) => Object.assign(document.createElement("code"), { textContent: m[1] })],
      [/(?<![*\w])\*([^*\s][^*\n]*?)\*$/, (m) => Object.assign(document.createElement("em"), { textContent: m[1] })],
      [/(?<![_\w])_([^_\s][^_\n]*?)_$/, (m) => Object.assign(document.createElement("em"), { textContent: m[1] })],
      [/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/, (m) => Object.assign(document.createElement("a"), { textContent: m[1], href: m[2] })],
    ];
    let start = -1, end = sel.anchorOffset, made: HTMLElement | null = null;
    for (const [re, make] of rules) {
      const m = text.match(re);
      if (!m) continue;
      start = text.length - m[0].length;
      made = make(m);
      break;
    }
    if (!made && (typed === " " || typed === " ")) {
      const m = text.match(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])\s$/);
      if (m) {
        const a = document.createElement("a");
        a.href = m[1] || "";
        a.textContent = m[1] || "";
        start = text.length - m[0].length;
        end = sel.anchorOffset - 1;
        made = a;
      }
    }
    if (!made || start < 0) return;
    const r = document.createRange();
    r.setStart(node, start);
    r.setEnd(node, end);
    r.deleteContents();
    r.insertNode(made);
    // caret after the formatted part, typing goes on as plain text
    const after = document.createTextNode(ZWSP);
    made.after(after);
    const caret = document.createRange();
    caret.setStart(after, 1);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
  }, []);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const ne = e.nativeEvent as InputEvent;
    if (ne.inputType === "insertText" && !ne.isComposing) formatTyped(ne.data);
    emit();
  }, [emit, formatTyped]);

  const wrapSelection = useCallback((tag: "code" | "a") => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const text = sel.toString();
    if (tag === "a") {
      const url = window.prompt("Link", /^https?:\/\//.test(text) ? text : "https://");
      if (!url || !/^https?:\/\//i.test(url.trim())) return;
      insertHtml(`<a href="${escapeHtml(url.trim())}">${escapeHtml(text || url.trim())}</a>${ZWSP}`);
    } else {
      insertHtml(`<code>${escapeHtml(text || "code")}</code>${ZWSP}`);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      emit();
      return;
    }
    if (mod && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); document.execCommand("bold"); emit(); }
      else if (k === "i") { e.preventDefault(); document.execCommand("italic"); emit(); }
      else if (k === "u") { e.preventDefault(); } // markdown has no underline
      else if (k === "e") { e.preventDefault(); wrapSelection("code"); emit(); }
      else if (k === "k") { e.preventDefault(); wrapSelection("a"); emit(); }
    }
  }, [onKeyDown, emit, wrapSelection]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    // The panel handles long text chips and pasted files first
    onPaste?.(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    const html = e.clipboardData?.getData("text/html") || "";
    const text = e.clipboardData?.getData("text/plain") || "";
    if (html && /<(a\s[^>]*href|strong|b|em|i|code|pre|ul|ol|h[1-6]|blockquote|del|s)[\s>]/i.test(html)) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      // Google Docs wraps the whole copy in a "not bold" <b>: unwrap it so everything doesn't turn bold
      doc.querySelectorAll('b[id^="docs-internal-guid"]').forEach((b) => b.replaceWith(...Array.from(b.childNodes)));
      const clean = DOMPurify.sanitize(doc.body.innerHTML, ALLOWED as any) as unknown as string;
      insertHtml(clean);
    } else if (text) {
      insertHtml(textToHtml(text));
    }
    emit();
    const el = elRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [onPaste, emit]);

  return (
    <div
      ref={setNode}
      id={id}
      data-name={name}
      data-no-ring="true"
      role="textbox"
      aria-multiline="true"
      aria-disabled={disabled || undefined}
      aria-placeholder={placeholder}
      data-placeholder={placeholder}
      contentEditable={!disabled}
      suppressContentEditableWarning
      spellCheck
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onClick={(e) => {
        // links inside the box don't open while typing; Ctrl/Cmd+click opens them
        const a = (e.target as HTMLElement).closest?.("a");
        if (a) { e.preventDefault(); if (e.ctrlKey || e.metaKey) window.open(a.getAttribute("href") || "", "_blank", "noopener"); }
      }}
      className={cn(
        "whitespace-pre-wrap break-words cursor-text",
        "empty:before:content-[attr(data-placeholder)] empty:before:opacity-50 empty:before:pointer-events-none",
        "[&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2",
        "[&_code]:bg-black/5 dark:[&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_pre]:my-1 [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:bg-black/5 dark:[&_pre]:bg-white/10 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:m-0 [&_p+p]:mt-2",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-foreground/30 [&_blockquote]:pl-2",
        "[&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_h1]:text-base [&_h2]:text-base [&_h3]:text-base",
        disabled && "cursor-default",
        className
      )}
    />
  );
});

export default RichChatInput;
