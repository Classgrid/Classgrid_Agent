// Stepper card for the agent's open_url tool: which page it opened (favicon, title, domain) and a short preview
// of what it read, styled like WebSearchView.
import React from "react";

interface OpenPageViewProps {
  url?: string;
  /** Raw tool result: JSON { url, content, id } on success, or an error sentence */
  result?: string;
  status?: "loading" | "success" | "error";
}

const GLOBE_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'/%3E%3Cpath d='M2 12h20'/%3E%3C/svg%3E";

export function OpenPageView({ url, result, status }: OpenPageViewProps) {
  let pageUrl = String(url || "");
  let preview = "";
  let error = "";
  if (result) {
    try {
      const parsed = JSON.parse(result);
      if (parsed?.url) pageUrl = parsed.url;
      preview = String(parsed?.content || "")
        .replace(/[#*_`>\[\]()!|-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);
    } catch {
      // Not JSON: the tool returned an error sentence
      if (status !== "loading") error = result;
    }
  }

  let domain = pageUrl;
  let path = "";
  try {
    const u = new URL(pageUrl);
    domain = u.hostname.replace(/^www\./, "");
    path = u.pathname === "/" ? "" : u.pathname;
  } catch { /* keep raw text */ }

  return (
    <div className="bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-none w-full max-w-[600px]">
      <a
        href={pageUrl || undefined}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2.5 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
      >
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt=""
          className="w-4 h-4 rounded-sm shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
          onError={(e) => { (e.target as HTMLImageElement).src = GLOBE_FALLBACK; }}
        />
        <span className="flex-1 truncate text-[14px] text-slate-600 dark:text-[#c9c9c9] group-hover:text-slate-900 dark:group-hover:text-[#eeeeee] transition-colors leading-[22px]">
          {domain}<span className="text-slate-400 dark:text-[#8a8a8a]">{path}</span>
        </span>
        {status === "loading" && <span className="shrink-0 text-[13px] text-slate-500 dark:text-[#8a8a8a]">Reading…</span>}
        {error && <span className="shrink-0 text-[13px] font-medium text-red-700 dark:text-[#ff7b72]">Failed</span>}
      </a>
      {preview && (
        <div className="px-4 pb-3 -mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-[#9b9b9b] line-clamp-2">
          {preview}
        </div>
      )}
      {error && (
        <div className="px-4 pb-3 -mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-[#9b9b9b]">{error}</div>
      )}
    </div>
  );
}
