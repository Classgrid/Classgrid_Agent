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

import { useState, useEffect } from "react";
import { Search, X, Calendar, User, ImageIcon, FileText, Link2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/marketing_ui/input";
import { Spinner } from "@/components/marketing_ui/spinner";
import { formatDistanceToNow } from "date-fns";
import { searchMessages, type ChatMessage } from "../services/chatApi";

interface SearchMessagesSidebarProps {
  onClose: () => void;
  onSelectMessage: (msg: ChatMessage, threadId: string) => void;
  currentThreadId?: string; // If provided, search only in this thread
}

type SearchResult = ChatMessage & { chat_threads: { id: string, name: string, type: string } };

export function SearchMessagesSidebar({ onClose, onSelectMessage, currentThreadId }: SearchMessagesSidebarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchGlobal, setSearchGlobal] = useState(!currentThreadId);
  const [filterSenderId, setFilterSenderId] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "photos" | "docs" | "links">("all");

  useEffect(() => {
    // If currentThreadId changes (e.g. user clicked a different chat), reset searchGlobal to false
    if (currentThreadId) {
      setSearchGlobal(false);
    }
  }, [currentThreadId]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchMessages(query, {
          threadId: searchGlobal ? undefined : currentThreadId,
          senderId: filterSenderId || undefined,
          hasMedia: filterType !== "all" ? true : undefined,
        });
        
        let finalResults = res.results || [];
        
        // Manual filtering for media types since backend just returns matching text
        if (filterType === "photos") {
          finalResults = finalResults.filter(r => r.message.includes("[IMAGE]"));
        } else if (filterType === "docs") {
          finalResults = finalResults.filter(r => r.message.includes("[PDF]") || r.message.includes("[DOC]"));
        } else if (filterType === "links") {
          finalResults = finalResults.filter(r => r.message.includes("http://") || r.message.includes("https://"));
        }

        setResults(finalResults);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, currentThreadId, filterSenderId, filterType, searchGlobal]);

  const stripTags = (text: string) => {
    return text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/^\[.*?\]\s*/, '');
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-[350px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted/80 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-foreground">Search Messages</h2>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        {currentThreadId && (
          <div className="flex items-center gap-2 mt-3 mb-1 px-1">
            <input 
              type="checkbox" 
              id="searchGlobal" 
              checked={searchGlobal}
              onChange={(e) => setSearchGlobal(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="searchGlobal" className="text-xs text-muted-foreground cursor-pointer select-none">
              Search across all chats
            </label>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("photos")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filterType === "photos" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <ImageIcon className="w-3 h-3" /> Photos
          </button>
          <button
            onClick={() => setFilterType("docs")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filterType === "docs" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <FileText className="w-3 h-3" /> Docs
          </button>
          <button
            onClick={() => setFilterType("links")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filterType === "links" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            <Link2 className="w-3 h-3" /> Links
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-muted/10">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="w-6 h-6 text-primary" />
          </div>
        ) : query.trim().length < 2 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-70">
            <Search className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm font-medium text-foreground">Search for messages</p>
            <p className="text-xs text-muted-foreground mt-1">Type at least 2 characters to search</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-70">
            <p className="text-sm font-medium text-foreground">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">Try different keywords or filters</p>
          </div>
        ) : (
          <div className="flex flex-col p-2 space-y-1">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => onSelectMessage(result, result.thread_id)}
                className="w-full text-left p-3 hover:bg-accent/50 rounded-lg transition-colors cursor-pointer group flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-foreground">
                    {result.sender_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(result.created_at), { addSuffix: false })}
                  </span>
                </div>
                {!currentThreadId && result.chat_threads && (
                  <div className="text-[11px] text-muted-foreground/80 font-medium bg-muted/50 px-2 py-0.5 rounded-sm w-fit">
                    in {result.chat_threads.name}
                  </div>
                )}
                <p className="text-[13px] text-muted-foreground mt-1 line-clamp-3 leading-snug">
                  {stripTags(result.message)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
