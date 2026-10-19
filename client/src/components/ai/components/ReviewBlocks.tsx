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
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { DocsImageViewer, type DocsViewerImage } from "./DocsImageViewer";
import { SourceChip, takeCitations, type ChatSource } from "./SourceChip";

// ```review and ```scores blocks: a report-style rating (title, website, big score, summary, verdict)
// and a score breakdown with one bar per category, like ChatGPT's website reviews.

export type ReviewData = {
  title?: string;
  website?: string;
  date?: string;
  score?: number | string;
  max?: number | string;
  scoreLabel?: string;
  summary?: string;
  verdict?: string;
  image?: string;
  cite?: number[];
};

export type ScoresData = { title?: string; max?: number | string; items?: { label?: string; score?: number | string }[] };

function toNumber(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function formatScore(n: number) {
  return Number.isInteger(n) ? `${n}.0` : `${Math.round(n * 10) / 10}`;
}

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

// Green for good, amber for middling, red for weak
function barColor(ratio: number) {
  if (ratio >= 0.7) return "bg-emerald-500";
  if (ratio >= 0.5) return "bg-amber-500";
  return "bg-red-500";
}

export function ReviewSummary({ data, sources }: { data: ReviewData; sources?: ChatSource[] }) {
  const [imageFailed, setImageFailed] = useState(false);
  const max = toNumber(data.max, 10);
  const score = data.score !== undefined ? Math.min(Math.max(toNumber(data.score, 0), 0), max) : null;
  const website = typeof data.website === "string" && /^https?:\/\//i.test(data.website) ? data.website : "";
  const host = website ? hostOf(website) : "";
  const { text: summary, ids } = takeCitations(data.summary, data.cite);
  const cited = (sources || []).filter((s) => ids.includes(s.id));
  const image = !imageFailed && typeof data.image === "string" && /^https:\/\//i.test(data.image) ? data.image : "";
  const images = useMemo<DocsViewerImage[]>(
    () => (image ? [{ id: "review-image", src: image, alt: data.title || "", ...(host ? { sourceUrl: website, sourceLabel: host } : {}) }] : []),
    [image, data.title, host, website],
  );

  return (
    <div className="my-5">
      {data.title && (
        <h2 className="text-[1.5em] font-semibold leading-[1.3] text-[#2C2C2B] dark:text-[#F0EFED]">{data.title}</h2>
      )}
      {(host || data.date) && (
        <p className="mt-1.5 text-[15px] text-black/55 dark:text-white/55">
          {host && (
            <>
              Website:{" "}
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-[#2C2C2B] underline decoration-dotted underline-offset-4 hover:opacity-80 dark:text-[#F0EFED]"
              >
                {host}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </>
          )}
          {host && data.date && " · "}
          {data.date && <>Reviewed {data.date}</>}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-5 sm:flex-row">
        {image && (
          <DocsImageViewer
            images={images}
            renderThumbnails={(imgs, open) => (
              <button
                type="button"
                onClick={(e) => imgs[0] && open(imgs[0], e)}
                className="h-48 w-full shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-black/10 bg-black/5 sm:h-[200px] sm:w-[224px] dark:border-white/10 dark:bg-white/5"
                aria-label="Open image"
              >
                <img
                  src={image}
                  alt={data.title || ""}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setImageFailed(true)}
                  className="h-full w-full object-cover object-top"
                />
              </button>
            )}
          />
        )}
        <div className="min-w-0 flex-1">
          {score !== null && (
            <p className="text-[44px] font-semibold leading-none tracking-[-0.02em] text-[#2C2C2B] dark:text-[#F0EFED]">
              {formatScore(score)}/{max}
            </p>
          )}
          {data.scoreLabel && <p className="mt-2 text-[15px] text-black/55 dark:text-white/55">{data.scoreLabel}</p>}
          {(summary || cited.length > 0) && (
            <p className="mt-3 text-[16px] leading-[26px] text-[#2C2C2B] dark:text-[#F0EFED]">
              {summary}
              {cited.length > 0 && <> <SourceChip sources={cited} /></>}
            </p>
          )}
          {data.verdict && (
            <p className="mt-3 text-[16px] font-medium text-emerald-600 dark:text-emerald-400">Verdict: {data.verdict}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ScoreBreakdown({ data }: { data: ScoresData }) {
  const max = toNumber(data.max, 10);
  const items = (Array.isArray(data.items) ? data.items : []).filter((it) => it && it.label).slice(0, 12);
  if (items.length === 0) return null;

  return (
    <div className="my-5">
      {data.title && (
        <h3 className="mb-3 text-[1.25em] font-semibold leading-[1.3] text-[#2C2C2B] dark:text-[#F0EFED]">{data.title}</h3>
      )}
      <div className="space-y-3">
        {items.map((it, i) => {
          const score = Math.min(Math.max(toNumber(it.score, 0), 0), max);
          const ratio = max > 0 ? score / max : 0;
          return (
            <div key={i} className="rounded-xl border border-black/10 px-5 py-4 dark:border-white/10">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[16px] text-[#2C2C2B] dark:text-[#F0EFED]">{it.label}</span>
                <span className="shrink-0 text-[16px] font-semibold tabular-nums text-[#2C2C2B] dark:text-[#F0EFED]">
                  {formatScore(score)}/{max}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className={`h-full rounded-full ${barColor(ratio)}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
