// Studio Mode's Guide tab: the Classgrid AI guide (the same pages the agent reads with read_classgrid_guide), view-only.
// Nothing here writes to the user's project or GitHub.
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const EASE = [0.22, 1, 0.36, 1] as const;

export const GUIDE_PAGES = [
  { page: "index", label: "Index" },
  { page: "agent-mode", label: "Agent Mode" },
  { page: "project-mode", label: "Project Mode" },
  { page: "studio-mode", label: "Studio Mode" },
  { page: "settings", label: "Settings" },
  { page: "connections", label: "Connections" },
] as const;
export type GuidePage = (typeof GUIDE_PAGES)[number]["page"];
export const isGuidePage = (p: unknown): p is GuidePage => GUIDE_PAGES.some((g) => g.page === p);

type Loaded = { page: string; title: string; markdown: string };

export function StudioGuideView({ page, onPageChange }: { page: GuidePage; onPageChange: (page: GuidePage) => void }) {
  const reduce = useReducedMotion();
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    setLoading(true);
    setFailed(false);
    fetchWithRescue(`${backendUrl}/api/ai/guide/${encodeURIComponent(page)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!gone) setDoc(d); })
      .catch(() => { if (!gone) { setDoc(null); setFailed(true); } })
      .finally(() => { if (!gone) setLoading(false); });
    return () => { gone = true; };
  }, [page]);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Page switcher */}
      <div className="shrink-0 flex items-center gap-1 h-12 px-3 border-b border-border overflow-x-auto [scrollbar-width:none]">
        <BookOpen className="size-4 shrink-0 text-muted-foreground mr-1" />
        {GUIDE_PAGES.map((g) => (
          <button
            key={g.page}
            onClick={() => onPageChange(g.page)}
            className={`shrink-0 h-7 px-2.5 rounded-md text-[12.5px] transition-colors ${g.page === page ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
        {loading && !doc ? (
          <div className="mx-auto w-full max-w-3xl flex flex-col gap-3">
            {[60, 90, 75, 85, 50].map((w, i) => <div key={i} className="h-4 rounded bg-secondary animate-pulse" style={{ width: `${w}%` }} />)}
          </div>
        ) : failed ? (
          <div className="h-full flex items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">Could not load this guide page. Please try again in a moment.</p>
          </div>
        ) : doc ? (
          <motion.div
            key={doc.page}
            className="mx-auto w-full max-w-3xl prose prose-sm dark:prose-invert"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              components={{
                // Links between guide pages switch the page here; web links open in a new tab
                a({ href, children }) {
                  const other = String(href || "").match(/(?:^|\/)(?:references\/)?([a-z-]+)\.md$/i)?.[1]?.toLowerCase();
                  const target = other === "skill" ? "index" : other;
                  if (isGuidePage(target)) {
                    return <button type="button" onClick={() => onPageChange(target)} className="underline underline-offset-2 text-foreground">{children}</button>;
                  }
                  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                },
                code({ className, children }) {
                  const block = className?.includes("language-") || String(children).replace(/\n$/, "").includes("\n");
                  if (block) return <code className={className}>{children}</code>;
                  return <code className={`bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[#c92a2a] dark:text-[#ff6b6b] px-[5px] py-[2px] rounded-[3px] text-[13px] font-mono break-words before:content-none after:content-none`}>{children}</code>;
                },
              }}
            >
              {doc.markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")}
            </ReactMarkdown>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
