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


import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PortableText } from "@portabletext/react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Testimonial = {
  _id?: string;
  name?: string;
  role?: string;
  company?: string;
  quote?: any;
  rating?: number;
  avatarUrl?: string;
  avatarAlt?: string;
  institutionLogoUrl?: string;
  institutionLogoAlt?: string;
};

function renderStars(rating: number) {
  const total = 5;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "h-5 w-5",
            index < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700"
          )}
        />
      ))}
    </div>
  );
}

/* ─── Single testimonial card ─── */
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  if (!testimonial) return null;
  const safeName = testimonial.name?.trim() || "";
  const roleLine = testimonial.role?.trim() || "";
  const companyLine = testimonial.company?.trim() || "";
  const quote = testimonial.quote;
  const rating = Math.max(1, Math.min(5, testimonial.rating ?? 5));

  return (
    <div className="flex flex-col md:flex-row w-full h-full rounded-3xl bg-gradient-to-br from-[#f0fdf4] to-white dark:from-[#0a2418] dark:to-[#05130d] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] md:min-h-[420px] overflow-hidden border border-emerald-100 dark:border-white/[0.05]">
      {/* Left side – large avatar */}
      <div className="w-full md:w-[35%] shrink-0 h-[340px] md:h-auto flex relative bg-emerald-100 dark:bg-emerald-950/50">
        {testimonial.avatarUrl ? (
          <img
            src={testimonial.avatarUrl}
            alt={testimonial.avatarAlt ?? safeName}
            className="w-full h-full object-cover object-[center_15%] md:object-center absolute inset-0"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-white bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-800 dark:to-emerald-950">
            {safeName ? safeName.charAt(0).toUpperCase() : "U"}
          </div>
        )}
      </div>

      {/* Right side – content */}
      <div className="w-full md:w-[65%] flex flex-col justify-between p-7 md:p-12">
        <div className="flex flex-col gap-6 md:gap-8">
          {/* Header: institution logo + quote icon */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 flex-1 pr-4">
              {testimonial.institutionLogoUrl && (
                <img
                  src={testimonial.institutionLogoUrl}
                  alt={testimonial.institutionLogoAlt ?? companyLine ?? "Institution logo"}
                  className="h-14 md:h-16 w-auto object-contain max-w-[150px]"
                />
              )}
              {companyLine && (
                <span className="text-lg md:text-xl font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide leading-tight line-clamp-2">
                  {companyLine}
                </span>
              )}
              {!testimonial.institutionLogoUrl && !companyLine && (
                <div className="h-14 md:h-16" />
              )}
            </div>
            <Quote
              className="h-10 w-10 md:h-12 md:w-12 text-emerald-500/30 dark:text-emerald-400/20 rotate-180 shrink-0"
              fill="currentColor"
            />
          </div>

          {/* Stars & Verification */}
          <div className="flex items-center gap-3">
            {renderStars(rating)}
            <span className="text-xs md:text-sm font-medium text-muted-foreground/80">
              Verified Review
            </span>
          </div>

          {/* Quote body */}
          {quote ? (
            <div className="text-[15px] md:text-lg leading-relaxed text-muted-foreground">
              {Array.isArray(quote) ? (
                <PortableText value={quote} />
              ) : (
                <p>{String(quote).trim()}</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer: name & role */}
        <div className="mt-6 flex flex-col gap-1">
          {safeName ? (
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              - {safeName}
            </p>
          ) : null}
          {(roleLine || companyLine) && (
            <div className="text-base text-muted-foreground font-medium mt-1">
              {roleLine ? <p>{roleLine},</p> : null}
              {companyLine ? (
                <p>{companyLine}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main carousel component ─── */
export default function TestimonialCarouselV2({
  testimonials,
  useFallbackContent = true,
  autoPlayInterval = 5000,
}: {
  testimonials: Testimonial[];
  useFallbackContent?: boolean;
  autoPlayInterval?: number;
}) {
  const data = (testimonials && testimonials.length > 0 ? testimonials : []).filter(Boolean);
  if (!data.length && !useFallbackContent) return null;
  if (!data.length) return null;

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = data.length;

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current]
  );

  /* Auto-play: slide every interval */
  useEffect(() => {
    if (total <= 1) return;

    timerRef.current = setInterval(goNext, autoPlayInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, autoPlayInterval, goNext]);

  return (
    <div className="relative w-full max-w-[900px] mx-auto">
      {/* Card viewport — True flex-track slider for Hostinger-style slide */}
      <div className="overflow-hidden w-full rounded-3xl">
        <motion.div
          className="flex py-1"
          style={{ width: `${total * 100}%` }}
          animate={{ x: `-${current * (100 / total)}%` }}
          transition={{ type: "spring", stiffness: 150, damping: 25, mass: 1 }}
        >
          {data.map((testimonial, idx) => (
            <div key={idx} className="shrink-0 relative" style={{ width: `${100 / total}%` }}>
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous testimonial"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-emerald-700 shadow-lg backdrop-blur-sm border border-emerald-200 transition-all duration-200 hover:scale-105 hover:bg-white dark:bg-[#0a1f16]/90 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-[#0d2a1c]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goNext}
            aria-label="Next testimonial"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-emerald-700 shadow-lg backdrop-blur-sm border border-emerald-200 transition-all duration-200 hover:scale-105 hover:bg-white dark:bg-[#0a1f16]/90 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-[#0d2a1c]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="flex justify-center mt-8 gap-2.5">
          {data.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "h-3 w-3 bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "h-2.5 w-2.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
