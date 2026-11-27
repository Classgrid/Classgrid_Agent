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
import type { DocsViewerImage } from "./DocsImageViewer";

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

/**
 * A picture as the image viewer takes it: a web picture also names its site, shown as a link under it.
 * For an answer's own pictures (AnswerImages.tsx) and a picture clicked inside a ```widget card (WidgetBlock.tsx).
 */
export function viewerImage(id: string, src: string, alt: string): DocsViewerImage {
  const host = hostOf(src);
  return { id, src, alt, ...(host ? { sourceUrl: `https://${host}`, sourceLabel: host } : {}) };
}
