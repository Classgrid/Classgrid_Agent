// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */


import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";

export interface DocsViewerImage {
  id: string;
  src: string;
  alt: string;
  /** Optional: the page or site the image comes from, shown as a link at the bottom (web-search images) */
  sourceUrl?: string;
  sourceLabel?: string;
}

interface DocsImageViewerProps {
  images: DocsViewerImage[];
  /** Render function for the thumbnail grid — you control how thumbnails look */
  renderThumbnails: (images: DocsViewerImage[], openImage: (img: DocsViewerImage, event?: React.MouseEvent) => void) => React.ReactNode;
  /** If set, auto-open this image index on mount */
  defaultOpenIndex?: number;
  /** Callback when lightbox closes */
  onClose?: () => void;
}

/**
 * DocsImageViewer — incident.io style image viewer for the Ask AI panel.
 *
 * Features:
 * - Origin-point scale animation (zooms from thumbnail position)
 * - White backdrop (light) / dark backdrop (dark mode)
 * - Close via: click image, click backdrop, Escape, scroll
 * - Close (X) button in top-right
 * - Portaled to document.body so it escapes any parent transforms
 */
export function DocsImageViewer({ images, renderThumbnails, defaultOpenIndex, onClose }: DocsImageViewerProps) {
  const [selectedImage, setSelectedImage] = useState<DocsViewerImage | null>(null);
  const thumbnailRectRef = useRef<DOMRect | null>(null);
  const [zoom, setZoom] = useState(1);

  // Auto-open if defaultOpenIndex is provided
  useEffect(() => {
    if (defaultOpenIndex !== undefined && images[defaultOpenIndex]) {
      setSelectedImage(images[defaultOpenIndex]);
    }
  }, [defaultOpenIndex, images]);

  const openImage = useCallback((img: DocsViewerImage, event?: React.MouseEvent) => {
    if (event?.currentTarget) {
      thumbnailRectRef.current = (event.currentTarget as HTMLElement).getBoundingClientRect();
    }
    setSelectedImage(img);
  }, []);

  const lightboxRef = useRef<HTMLDivElement | null>(null);

  const closeImage = useCallback(() => {
    setSelectedImage(null);
    setZoom(1);
    onClose?.();
  }, [onClose]);

  // ── Lock body scroll when open ──
  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedImage]);

  // ── Several images: "2 / 5" counter and previous / next (buttons and arrow keys) ──
  const currentIndex = selectedImage ? images.findIndex((img) => img.id === selectedImage.id) : -1;
  const hasMany = images.length > 1;
  const showAt = useCallback((delta: number) => {
    if (images.length < 2) return;
    const from = selectedImage ? images.findIndex((img) => img.id === selectedImage.id) : 0;
    const next = images[(from + delta + images.length) % images.length];
    if (next) {
      thumbnailRectRef.current = null;
      setZoom(1);
      setSelectedImage(next);
    }
  }, [images, selectedImage]);

  // ── Keyboard: Escape to close, arrows to browse ──
  // Captured on window and stopped there, so a dialog the viewer was opened from (e.g. the feedback box)
  // doesn't also close on the same Escape.
  useEffect(() => {
    if (!selectedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeImage(); }
      else if (e.key === "ArrowRight") showAt(1);
      else if (e.key === "ArrowLeft") showAt(-1);
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [selectedImage, closeImage, showAt]);

  // ── Presses inside the viewer never count as "outside" clicks for a dialog underneath ──
  // (that dialog would close and lose what was typed). Clicks still reach the viewer, so it closes as usual.
  useEffect(() => {
    if (!selectedImage) return;
    const keepInsideViewer = (e: Event) => {
      if (lightboxRef.current && e.target instanceof Node && lightboxRef.current.contains(e.target)) e.stopPropagation();
    };
    const types = ["pointerdown", "mousedown", "touchstart"] as const;
    types.forEach((t) => window.addEventListener(t, keepInsideViewer, true));
    return () => types.forEach((t) => window.removeEventListener(t, keepInsideViewer, true));
  }, [selectedImage]);

  // ── Zoom with mouse scroll ──
  useEffect(() => {
    if (!selectedImage) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        return Math.min(Math.max(0.5, prev + delta), 4);
      });
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [selectedImage]);

  // ── Compute origin-point offset for the scale animation ──
  const getOriginOffset = useCallback(() => {
    const rect = thumbnailRectRef.current;
    if (!rect || typeof window === "undefined") return { x: 0, y: 0 };
    return {
      x: (rect.left + rect.width / 2) - window.innerWidth / 2,
      y: (rect.top + rect.height / 2) - window.innerHeight / 2,
    };
  }, []);

  return (
    <>
      {/* ── Thumbnails (controlled by parent) ── */}
      {renderThumbnails(images, openImage)}

      {/* ── Fullscreen Lightbox (portaled to body) ── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedImage && (() => {
            const origin = getOriginOffset();
            return (
              <motion.div
                key="docs-lightbox-backdrop"
                ref={lightboxRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-0 z-[10050] flex items-center justify-center bg-white/95 dark:bg-black/95 backdrop-blur-sm cursor-zoom-out"
                onClick={closeImage}
              >
                {/* ── Top Right Controls ── */}
                <div className="absolute top-4 right-4 z-[10051] flex items-center gap-2">
                  <button
                    className="p-2.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black/60 dark:text-white/60 transition-all cursor-pointer"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const response = await fetch(selectedImage.src);
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = blobUrl;
                        link.download = `Classgrid_AI_Image_${selectedImage.id}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(blobUrl);
                      } catch (error) {
                        console.error("Download failed", error);
                        window.open(selectedImage.src, "_blank");
                      }
                    }}
                    title="Download Image"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    className="p-2.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black/60 dark:text-white/60 transition-all cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); closeImage(); }}
                    aria-label="Close viewer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* ── Image ── */}
                <div
                  className="w-full h-full flex items-center justify-center p-6 sm:p-12"
                  onClick={(e) => { e.stopPropagation(); closeImage(); }}
                >
                  <motion.img
                    key={selectedImage.id}
                    src={selectedImage.src}
                    alt={selectedImage.alt}
                    className="block max-w-full max-h-full w-auto object-contain rounded-lg shadow-2xl cursor-zoom-in"
                    style={{ touchAction: "pinch-zoom", transform: `scale(${zoom})`, transition: "transform 0.15s ease-out" }}
                    initial={{
                      opacity: 0,
                      scale: 0.12,
                      x: origin.x,
                      y: origin.y,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: 0,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.12,
                      x: origin.x,
                      y: origin.y,
                    }}
                    transition={{
                      duration: 0.28,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* ── Counter + previous / next (only with several images) ── */}
                {hasMany && (
                  <>
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[10051] rounded-full bg-black/10 px-3 py-1 text-[13px] font-medium tabular-nums text-black/70 dark:bg-white/10 dark:text-white/80 select-none">
                      {currentIndex + 1} / {images.length}
                    </div>
                    <button
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-[10051] p-2.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black/60 dark:text-white/70 transition-all cursor-pointer sm:left-6"
                      onClick={(e) => { e.stopPropagation(); showAt(-1); }}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-[10051] p-2.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black/60 dark:text-white/70 transition-all cursor-pointer sm:right-6"
                      onClick={(e) => { e.stopPropagation(); showAt(1); }}
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* ── Source link (web images) or the close hint ── */}
                {selectedImage.sourceUrl ? (
                  <a
                    href={selectedImage.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[10051] max-w-[80vw] truncate rounded-full bg-black/70 px-4 py-2 text-[14px] font-medium text-white underline underline-offset-4 hover:bg-black/80 dark:bg-white/15 dark:hover:bg-white/25"
                  >
                    {selectedImage.sourceLabel || selectedImage.sourceUrl}
                  </a>
                ) : (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10051] text-black/25 dark:text-white/25 text-[10px] tracking-wide select-none pointer-events-none">
                    Click or press Esc to close
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
