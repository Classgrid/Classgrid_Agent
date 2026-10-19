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

"use client";

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
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
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */


import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download, Trash2, Crop } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  type?: "image" | "video";
  /** Use this to make an image span 2 columns or rows in the bento grid */
  className?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  className?: string;
  maxDisplay?: number;
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export interface ImageLightboxProps {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}

/* ─── slide variants for arrow-key / swipe navigation ─── */
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.94,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring" as const, stiffness: 380, damping: 32 },
      opacity: { duration: 0.22 },
      scale: { duration: 0.25 },
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.94,
    transition: {
      x: { type: "spring" as const, stiffness: 380, damping: 32 },
      opacity: { duration: 0.18 },
      scale: { duration: 0.18 },
    },
  }),
};

/**
 * Premium Image Gallery — Bento Grid + Full-Screen Lightbox
 * Mobile: swipe left/right to navigate, pinch to zoom, tap outside to close
 * Desktop: arrow keys, prev/next buttons, keyboard Escape
 */
export function ImageGallery({ images, className, maxDisplay, onRemove, onEdit }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [direction, setDirection] = useState(0);
  const clickedImageRef = useRef<GalleryImage | null>(null);
  const hasNavigatedRef = useRef(false);

  const selectedIndex = selectedImage
    ? images.findIndex((img) => img.id === selectedImage.id)
    : -1;

  const goNext = useCallback(() => {
    if (selectedIndex === -1) return;
    hasNavigatedRef.current = true;
    setDirection(1);
    setSelectedImage(images[(selectedIndex + 1) % images.length]);
  }, [selectedIndex, images]);

  const goPrev = useCallback(() => {
    if (selectedIndex === -1) return;
    hasNavigatedRef.current = true;
    setDirection(-1);
    setSelectedImage(images[(selectedIndex - 1 + images.length) % images.length]);
  }, [selectedIndex, images]);

  const openImage = useCallback((img: GalleryImage) => {
    clickedImageRef.current = img;
    hasNavigatedRef.current = false;
    setDirection(0);
    setSelectedImage(img);
  }, []);

  const closeImage = useCallback(() => {
    if (hasNavigatedRef.current && clickedImageRef.current) {
      setSelectedImage(clickedImageRef.current);
      hasNavigatedRef.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSelectedImage(null);
          clickedImageRef.current = null;
        });
      });
    } else {
      setSelectedImage(null);
      clickedImageRef.current = null;
    }
  }, []);

  const isOnClickedImage =
    selectedImage &&
    clickedImageRef.current &&
    selectedImage.id === clickedImageRef.current.id;

  // ── Lock body scroll when lightbox is open ──
  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedImage]);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === "Escape") closeImage();
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, closeImage, goNext, goPrev]);

  // ── Touch swipe handlers ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only treat as horizontal swipe if dx dominates dy
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext(); // swipe left → next
      else goPrev();        // swipe right → prev
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [goNext, goPrev]);

  return (
    <>
      {/* ──────────── BENTO GRID ──────────── */}
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[250px] w-full h-full",
          className
        )}
      >
        {(maxDisplay ? images.slice(0, maxDisplay) : images).map((img, index) => {
          const isLastDisplayed = maxDisplay && index === maxDisplay - 1;
          const remainingCount = maxDisplay ? images.length - maxDisplay : 0;
          const showOverlay = isLastDisplayed && remainingCount > 0;
          
          return (
            <motion.div
              key={img.id}
            layoutId={`gallery-image-${img.id}`}
            className={cn(
              "group relative overflow-hidden rounded-2xl bg-card border border-border cursor-pointer",
              img.className
            )}
            onClick={() => openImage(img)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
          >
            {img.type === "video" ? (
              <video
                src={img.src}
                className="w-full h-full absolute inset-0 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                preload="metadata"
                muted
              />
            ) : (
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full absolute inset-0 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
            )}
            
            {img.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                  <div className="w-0 h-0 border-l-[10px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20 z-10" />
            
            {showOverlay && (
              <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center">
                <span className="text-white text-3xl font-bold">+{remainingCount}</span>
              </div>
            )}
            
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-30"
                title="Remove image"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {onEdit && img.type !== "video" && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(img.id); }}
                className="absolute top-2 right-10 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500 z-30"
                title="Crop / Edit image"
              >
                <Crop className="w-4 h-4" />
              </button>
            )}
            
            {img.caption && !showOverlay && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-white text-sm font-medium">{img.caption}</p>
              </div>
            )}
          </motion.div>
          );
        })}
      </div>

      {/* ──────────── FULL SCREEN LIGHTBOX ──────────── */}
      {selectedImage && (
        <ImageLightbox
          images={images}
          initialIndex={selectedIndex}
          onClose={closeImage}
        />
      )}
    </>
  );
}

export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const selectedImage = images[selectedIndex];

  const goNext = useCallback(() => {
    setDirection(1);
    setSelectedIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goNext, goPrev]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [goNext, goPrev]);

  return (
    <AnimatePresence>
        {selectedImage && (
          <motion.div
            key="lightbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl"
            onClick={onClose}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* ── Top bar: counter + actions ── */}
            <div
              className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between z-[110] pointer-events-none"
            >
              <div className="text-white/70 text-sm font-semibold tracking-widest drop-shadow-md">
                {selectedIndex + 1} / {images.length}
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="p-3 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all border border-white/10 pointer-events-auto"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (selectedImage) {
                      const a = document.createElement("a");
                      a.href = selectedImage.src;
                      a.download = selectedImage.alt || "download";
                      a.click();
                    }
                  }}
                  aria-label="Download media"
                >
                  <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  className="p-3 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all border border-white/10 pointer-events-auto"
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  aria-label="Close gallery"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* ── Image area with side nav buttons ── */}
            <div
              className="flex-1 flex items-center justify-center relative w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prev button */}
              {images.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-2 sm:left-6 z-[110] w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white backdrop-blur-md transition-all shrink-0 pointer-events-auto"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              )}

              {/* Image container — fills remaining space */}
              <div className="w-full h-full flex items-center justify-center px-4 sm:px-24 py-16">
                {/* Removed isOnClickedImage logic, we always use AnimatePresence for standalone lightbox */}
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    {selectedImage.type === "video" ? (
                      <motion.video
                        key={selectedImage.id}
                        src={selectedImage.src}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="block max-w-full max-h-full w-auto rounded-xl shadow-2xl ring-1 ring-white/10 object-contain"
                        controls
                        autoPlay
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <motion.img
                        key={selectedImage.id}
                        src={selectedImage.src}
                        alt={selectedImage.alt}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="block max-w-full max-h-full w-auto rounded-xl shadow-2xl ring-1 ring-white/10 object-contain"
                        style={{ touchAction: "pinch-zoom" }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </AnimatePresence>
              </div>

              {/* Next button */}
              {images.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-2 sm:right-6 z-[110] w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white backdrop-blur-md transition-all shrink-0 pointer-events-auto"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              )}
            </div>

            {/* ── Swipe hint — shown on mobile only ── */}
            <div className="sm:hidden absolute bottom-4 inset-x-0 text-center text-[11px] text-white/50 select-none tracking-wide pointer-events-none">
              Swipe left or right to navigate
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
