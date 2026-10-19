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
import { DocsImageViewer, type DocsViewerImage } from "./DocsImageViewer";
import { SourceChip, takeCitations, type ChatSource } from "./SourceChip";

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function viewerImage(id: string, src: string, alt: string): DocsViewerImage {
  const host = hostOf(src);
  return { id, src, alt, ...(host ? { sourceUrl: `https://${host}`, sourceLabel: host } : {}) };
}

/** An image the AI put in its answer (markdown ![alt](url)): rounded thumbnail, opens the full-screen viewer. */
export function AnswerImage({ src, alt }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const images = useMemo(() => (src ? [viewerImage("answer-image", src, alt || "")] : []), [src, alt]);
  if (!src || failed) return null;
  return (
    <DocsImageViewer
      images={images}
      renderThumbnails={(imgs, open) => (
        <span className="my-3 block">
          <img
            src={src}
            alt={alt || ""}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            onClick={(e) => imgs[0] && open(imgs[0], e)}
            className="max-h-[360px] max-w-full cursor-zoom-in rounded-xl border border-black/10 object-cover dark:border-white/10"
          />
        </span>
      )}
    />
  );
}

export type SourceCardItem = { title?: string; text?: string; image?: string; cite?: number[] };

/**
 * ```cards block: one row per point — rounded thumbnail on the left, bold title and text on the right,
 * source chip at the end (like ChatGPT's review layout). All row images open in one viewer with "2 / 3".
 */
export function SourceCards({ items, sources }: { items: SourceCardItem[]; sources?: ChatSource[] }) {
  const [broken, setBroken] = useState<Set<number>>(() => new Set());
  const rows = useMemo(
    () => items.filter((it) => it && (it.title || it.text)).slice(0, 12),
    [items],
  );
  const images = useMemo(
    () =>
      rows
        .map((row, i) => (row.image && /^https:\/\//i.test(row.image) && !broken.has(i) ? viewerImage(`card-${i}`, row.image, row.title || "") : null))
        .filter((img): img is DocsViewerImage => img !== null),
    [rows, broken],
  );

  return (
    <DocsImageViewer
      images={images}
      renderThumbnails={(imgs, open) => (
        <div className="my-4 divide-y divide-black/10 dark:divide-white/10">
          {rows.map((row, i) => {
            const img = imgs.find((x) => x.id === `card-${i}`);
            const { text: rowText, ids } = takeCitations(row.text, row.cite);
            const cited = (sources || []).filter((s) => ids.includes(s.id));
            return (
              <div key={i} className="flex gap-4 py-5 first:pt-1 last:pb-1 sm:gap-6">
                {img && (
                  <button
                    type="button"
                    onClick={(e) => open(img, e)}
                    className="h-20 w-28 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-black/10 bg-black/5 sm:h-[136px] sm:w-[184px] dark:border-white/10 dark:bg-white/5"
                    aria-label={`Open image: ${row.title || "image"}`}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setBroken((prev) => new Set(prev).add(i))}
                      className="h-full w-full object-cover"
                    />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  {row.title && (
                    <p className="text-[17px] font-semibold leading-snug text-[#2C2C2B] dark:text-[#F0EFED]">{row.title}</p>
                  )}
                  {(rowText || cited.length > 0) && (
                    <p className="mt-1.5 text-[16px] leading-[26px] text-[#2C2C2B] dark:text-[#F0EFED]">
                      {rowText}
                      {cited.length > 0 && <> <SourceChip sources={cited} /></>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    />
  );
}
