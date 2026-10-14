import { useState } from "react";
import { Globe } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/marketing_ui/hover-card";
import { cn } from "@/lib/utils";
import { toRescueUrl } from "@/lib/rescue";

// A web page the agent used, from search_web (numbered per answer; the reply cites it as [id]).
export type ChatSource = { id: number; url: string; title: string; domain: string; snippet?: string };

const API_ORIGIN = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "https://api.classgrid.in";

// Site icons come from our backend (cached), so the browser never asks a third party.
function SiteIcon({ domain, className }: { domain: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [useRescue, setUseRescue] = useState(false);
  if (!domain || failed) return <Globe className={cn("shrink-0 opacity-70", className)} />;
  const iconUrl = `${API_ORIGIN}/api/ai/favicon?domain=${encodeURIComponent(domain)}`;
  return (
    <img
      src={useRescue ? toRescueUrl(iconUrl) : iconUrl}
      alt=""
      loading="lazy"
      onError={() => (useRescue ? setFailed(true) : setUseRescue(true))}
      className={cn("shrink-0 rounded-[3px] object-contain", className)}
    />
  );
}

/**
 * Text inside the report blocks (cards, review, points, rating) is plain text, so "[1]" markers the AI wrote
 * there would show as literal "[1]" next to the chip. This removes them and adds their ids to the block's cite.
 */
export function takeCitations(text: string | undefined, cite: number[] | undefined): { text: string; ids: number[] } {
  const ids = new Set<number>(Array.isArray(cite) ? cite.filter((n) => Number.isFinite(n)) : []);
  const cleaned = String(text || "")
    .replace(/\s*\[(\d{1,3}(?:\s*,\s*\d{1,3})*)\]/g, (_m, list: string) => {
      for (const n of list.split(",")) ids.add(Number(n.trim()));
      return "";
    })
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
  return { text: cleaned, ids: [...ids] };
}

/** The pill shown after a sentence: site icon + domain (+N when several pages back it). Hover lists them. */
export function SourceChip({ sources }: { sources: ChatSource[] }) {
  const first = sources[0];
  if (!first) return null;
  const extra = sources.length - 1;

  return (
    <HoverCard>
      <HoverCardTrigger
        href={first.url}
        target="_blank"
        rel="noreferrer"
        delay={120}
        closeDelay={120}
        className="mx-0.5 inline-flex h-[22px] max-w-[220px] -translate-y-px items-center gap-1 rounded-full bg-black/[0.06] px-2 align-middle text-[12px] font-medium leading-none text-[#5d5d5d] no-underline transition-colors hover:bg-black/[0.1] dark:bg-white/10 dark:text-[#cdcdcd] dark:hover:bg-white/[0.16]"
      >
        <SiteIcon domain={first.domain} className="h-3.5 w-3.5" />
        <span className="truncate">{first.domain || "source"}</span>
        {extra > 0 && <span className="shrink-0 opacity-70">+{extra}</span>}
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-[320px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl p-0">
        {sources.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="block border-b border-black/5 px-4 py-3 no-underline transition-colors last:border-b-0 hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]"
          >
            <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <SiteIcon domain={s.domain} className="h-4 w-4" />
              <span className="truncate">{s.domain}</span>
            </span>
            <span className="mt-1.5 line-clamp-2 block text-[14px] font-semibold leading-snug text-foreground">{s.title}</span>
            {s.snippet && (
              <span className="mt-1 line-clamp-2 block text-[12px] leading-[1.45] text-muted-foreground">{s.snippet}</span>
            )}
          </a>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
}
