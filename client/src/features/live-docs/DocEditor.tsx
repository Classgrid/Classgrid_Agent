// Editing a live doc's text yourself. The doc is Markdown, and it is kept exactly as typed (a table, a formula or a
// code block is never rewritten behind the writer's back), so the editor is the text itself with help around it:
//   - buttons and the usual keys (Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+E) put the formatting in
//   - beside the text (under a "Preview" tab on a narrow screen) the doc shows as it will look, as you type
// (owner, 2026-11-16: the bare text box showed only raw text.)
import { useDeferredValue, useRef, useState } from "react";
import { Bold, Code, Heading2, Italic, Link2, List, ListOrdered, Quote, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocMarkdown } from "./DocText";

type Tool = { name: string; keys?: string; Icon: typeof Bold; run: (text: string, from: number, to: number) => { text: string; from: number; to: number } };

/** Puts `before` and `after` round the picked words (or round `sample` when nothing is picked). */
const wrap = (before: string, after: string, sample: string) => (text: string, from: number, to: number) => {
  const picked = text.slice(from, to) || sample;
  return { text: text.slice(0, from) + before + picked + after + text.slice(to), from: from + before.length, to: from + before.length + picked.length };
};
/** Starts every picked line with `mark` (numbered: 1. 2. 3.). */
const lines = (mark: string | "numbers", sample: string) => (text: string, from: number, to: number) => {
  const start = text.lastIndexOf("\n", from - 1) + 1;
  const endAt = text.indexOf("\n", to);
  const end = endAt === -1 ? text.length : endAt;
  const picked = text.slice(start, end) || sample;
  const out = picked.split("\n").map((line, i) => `${mark === "numbers" ? `${i + 1}. ` : mark}${line}`).join("\n");
  return { text: text.slice(0, start) + out + text.slice(end), from: start, to: start + out.length };
};
const TABLE = "| Column 1 | Column 2 |\n|---|---|\n| First | Second |\n";

const TOOLS: Tool[] = [
  { name: "Heading", Icon: Heading2, run: lines("## ", "Heading") },
  { name: "Bold", keys: "Ctrl+B", Icon: Bold, run: wrap("**", "**", "bold words") },
  { name: "Italic", keys: "Ctrl+I", Icon: Italic, run: wrap("*", "*", "slanted words") },
  { name: "Code", keys: "Ctrl+E", Icon: Code, run: wrap("`", "`", "code") },
  { name: "Link", keys: "Ctrl+K", Icon: Link2, run: (text, from, to) => { const picked = text.slice(from, to) || "link words"; const out = `[${picked}](https://)`; return { text: text.slice(0, from) + out + text.slice(to), from: from + picked.length + 3, to: from + out.length - 1 }; } },
  { name: "List", Icon: List, run: lines("- ", "First point") },
  { name: "Numbered list", Icon: ListOrdered, run: lines("numbers", "First step") },
  { name: "Quote", Icon: Quote, run: lines("> ", "Quoted words") },
  { name: "Table", Icon: Table, run: (text, from) => { const lead = from > 0 && text[from - 1] !== "\n" ? "\n\n" : ""; return { text: text.slice(0, from) + lead + TABLE + text.slice(from), from: from + lead.length + 2, to: from + lead.length + 10 }; } },
];
const KEYS: Record<string, string> = { b: "Bold", i: "Italic", e: "Code", k: "Link" };

export function DocEditor({ value, onChange, narrow }: { value: string; onChange: (text: string) => void; /** One column with Write / Preview tabs (Studio's pane). */ narrow?: boolean }) {
  const box = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const shown = useDeferredValue(value);

  const use = (tool: Tool) => {
    const el = box.current;
    if (!el) return;
    const next = tool.run(value, el.selectionStart, el.selectionEnd);
    onChange(next.text);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(next.from, next.to); });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.name}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setTab("write"); use(tool); }}
            title={tool.keys ? `${tool.name} (${tool.keys})` : tool.name}
            aria-label={tool.name}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <tool.Icon className="size-4" />
          </button>
        ))}
        <span className="flex-1" />
        <div role="tablist" aria-label="Write or preview" className={cn("grid grid-cols-2 gap-0.5 rounded-lg bg-black/[0.05] p-0.5 dark:bg-white/[0.08]", !narrow && "lg:hidden")}>
          {(["write", "preview"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("h-7 rounded-md px-2.5 text-[12.5px] font-medium", tab === t ? "bg-background text-foreground shadow-sm dark:bg-white/[0.16]" : "text-muted-foreground hover:text-foreground")}>
              {t === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
      </div>
      <div className={cn("grid", !narrow && "lg:grid-cols-2")}>
        <textarea
          ref={box}
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            const tool = (e.ctrlKey || e.metaKey) && !e.altKey ? TOOLS.find((t) => t.name === KEYS[e.key.toLowerCase()]) : undefined;
            if (tool) { e.preventDefault(); use(tool); }
          }}
          spellCheck
          aria-label="The doc's text, in Markdown"
          className={cn("h-[68vh] w-full resize-none bg-background p-4 font-mono text-[13.5px] leading-6 outline-none", tab === "preview" && (narrow ? "hidden" : "max-lg:hidden"))}
        />
        <div className={cn("h-[68vh] overflow-y-auto p-5", narrow ? tab === "write" && "hidden" : cn("lg:border-l lg:border-border", tab === "write" && "max-lg:hidden"))} aria-label="How the doc will look">
          <DocMarkdown text={shown} />
        </div>
      </div>
    </div>
  );
}
