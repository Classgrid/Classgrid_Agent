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
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, FileText, ArrowRight, Command, Loader2, MessageSquare, LayoutDashboard } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { resolveDashboardConfig } from "@/config/sidebar";
import { fetchWithRescue } from "@/lib/rescue";

type SearchResult = {
  id: string;
  title: string;
  created_at: string;
  type: "page" | "chat";
};

const ChatBubbleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path fill="none" d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092a10 10 0 1 0-4.777-4.719" />
  </svg>
);

export function AiChatSearchPalette({
  open,
  onOpenChange,
  mode = "global",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "global" | "chat";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveMode = location.pathname.includes('/agent') ? 'chat' : mode;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      // Small delay to ensure the modal is rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Search Pages (from sidebar config)
      const allPages: SearchResult[] = [];
      if (effectiveMode === "global" && q.trim().length > 0) {
        const config = resolveDashboardConfig(location.pathname);
        config.sections.forEach(section => {
          section.items.forEach(item => {
            if (item.label.toLowerCase().includes(q.toLowerCase())) {
              allPages.push({
                id: item.to || "",
                title: item.label,
                created_at: section.label || "Page",
                type: "page"
              });
            }
          });
        });
      }

      // 2. Search Chats
      let chatResults: SearchResult[] = [];
      if (effectiveMode === "chat") {
        const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
          ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
          : "";
        // Same lists as the sidebar: Agent mode leaves out project chats; Project mode shows the open project's
        // chats, or all project chats on the Projects page
        let listQuery = "?mode=agent";
        if (location.pathname.split("/").includes("project")) {
          let openProject: string | null = null;
          try { openProject = (sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open")); } catch { /* storage blocked */ }
          listQuery = `?project=${openProject || "all"}`;
        }
        const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions${listQuery}`, { credentials: "include" });
        const data = await res.json();
        if (data.sessions) {
          let filtered = data.sessions;
          if (q.trim()) {
            filtered = filtered.filter((s: any) => (s.title || "").toLowerCase().includes(q.toLowerCase()));
          } else {
            // If query is empty, only show top 3 recent chats
            filtered = filtered.slice(0, 3);
          }
          
          chatResults = filtered.map((s: any) => ({
               id: s.id,
               title: s.title,
               created_at: s.created_at,
               type: "chat"
            }));
        }
      }

      setResults([...allPages, ...chatResults]);
      setActiveIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [location.pathname, effectiveMode]);

  // Initial fetch for recent chats when opened
  useEffect(() => {
    if (open && !query.trim()) {
      doSearch("");
    }
  }, [open, query, doSearch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      // Don't clear results here anymore, because we want to show recent chats
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigateTo(results[activeIndex].id, results[activeIndex].type);
    }
  }

  function navigateTo(id: string, type: "chat" | "page") {
    onOpenChange(false);
    if (type === "page") {
      navigate(id);
    } else {
      const pathParts = location.pathname.split('/');
      // A project chat opens in Project Mode, an Agent chat in Agent mode
      const modeIndex = pathParts.indexOf('project') !== -1 ? pathParts.indexOf('project') : pathParts.indexOf('agent');
      const baseAgentPath = modeIndex !== -1
        ? pathParts.slice(0, modeIndex + 1).join('/')
        : '/superadmin/agent';
      navigate(`${baseAgentPath}/${id}`);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Highlight matching text in results
  function highlightMatch(text: string, q: string) {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300 rounded-sm px-0.5 font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[130] bg-black/60"
            onClick={() => onOpenChange(false)}
          />

          {/* Command Palette */}
          <motion.div
            key="search-palette"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-[12vh] z-[131] mx-auto w-[min(92vw,580px)]"
          >
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.12] bg-white/95 dark:bg-[#0a0a0a]/95 shadow-[0_25px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/[0.08] px-4 py-3">
                <Search className="h-5 w-5 shrink-0 text-slate-900 dark:text-white/40" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  data-no-ring="true"
                  placeholder={effectiveMode === "global" ? "Search pages..." : "Search chat history..."}
                  className="flex-1 bg-transparent text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/35 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 border-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                {loading && (
                  <Spinner className="h-4 w-4 shrink-0 text-slate-900 dark:text-white/30" />
                )}
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:text-white/40">
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[60vh] overflow-y-auto overscroll-contain">
                {/* Empty state ONLY when absolutely no recent chats are found */}
                {!query.trim() && !loading && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white/25">
                      <Command className="h-4 w-4" />
                      <span className="text-[13px]">{effectiveMode === "global" ? "Type to search pages..." : "Type to search your chat history"}</span>
                    </div>
                  </div>
                )}

                {/* No results */}
                {query.trim().length >= 2 && !loading && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <Search className="h-6 w-6 text-slate-900 dark:text-white/15" />
                    <p className="text-[13px] text-slate-900 dark:text-white/40">
                      {effectiveMode === "global" 
                        ? `No pages found for "${query}"`
                        : `No chats found for "${query}"`
                      }
                    </p>
                  </div>
                )}

                {/* Results list */}
                {results.length > 0 && (
                  <div className="p-1.5">
                    {!query.trim() && (
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                        Recent chats
                      </div>
                    )}
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        data-index={index}
                        onClick={() => navigateTo(result.id, result.type)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100 cursor-pointer",
                          activeIndex === index
                            ? "bg-slate-100 dark:bg-white/[0.07]"
                            : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                        )}
                      >
                        {result.type === "page" ? (
                          <LayoutDashboard className={cn(
                            "mt-0.5 h-4 w-4 shrink-0 transition-colors",
                            activeIndex === index ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white/30"
                          )} />
                        ) : (
                          <ChatBubbleIcon className={cn(
                            "mt-0.5 h-4 w-4 shrink-0 transition-colors",
                            activeIndex === index ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white/30"
                          )} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[14px] font-medium truncate transition-colors",
                              activeIndex === index ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-white/80"
                            )}>
                              {result.type === "chat" 
                                ? highlightMatch((result.title || "New Chat").replace(/\*\*Title:\*\*/gi, '').replace(/Title:/gi, '').replace(/["']/g, '').trim(), query)
                                : highlightMatch(result.title, query)
                              }
                            </span>
                            <span className="shrink-0 rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider">
                              {result.type === "page" ? result.created_at : "Chat History"}
                            </span>
                          </div>
                          {result.type === "chat" && (
                            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-900 dark:text-white/35">
                              {new Date(result.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <ArrowRight className={cn(
                          "mt-1 h-3.5 w-3.5 shrink-0 transition-all",
                          activeIndex === index
                            ? "text-emerald-600 dark:text-emerald-400 translate-x-0 opacity-100"
                            : "text-slate-900 dark:text-white/20 -translate-x-1 opacity-0"
                        )} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {results.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/[0.06] px-4 py-2">
                  <div className="flex items-center gap-3 text-[11px] text-slate-900 dark:text-white/30">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] px-1 py-0.5 text-[10px]">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] px-1 py-0.5 text-[10px]">↵</kbd>
                      Open
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] px-1 py-0.5 text-[10px]">Esc</kbd>
                      Close
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-900 dark:text-white/25">{results.length} result{results.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
