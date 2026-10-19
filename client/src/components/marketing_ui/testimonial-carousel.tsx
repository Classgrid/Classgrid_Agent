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


import { BadgeCheck, Quote, Star } from "lucide-react";
import { PortableText } from "@portabletext/react";

import { cn } from "@/lib/utils";
import { Chip } from "@/components/marketing_ui/chip";

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

const cardHeightClasses = [
  "min-h-[232px]",
  "min-h-[260px]",
  "min-h-[246px]",
  "min-h-[272px]",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function renderStars(rating: number) {
  const total = 5;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "h-3.5 w-3.5",
            index < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-300 text-slate-300 dark:fill-slate-700 dark:text-slate-700"
          )}
        />
      ))}
    </div>
  );
}

function ensureMinimumItems(items: Testimonial[], minimum: number) {
  if (items.length >= minimum) {
    return items;
  }

  const expanded: Testimonial[] = [];
  let index = 0;

  while (expanded.length < minimum) {
    expanded.push(items[index % items.length]);
    index += 1;
  }

  return expanded;
}

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  const safeName = testimonial.name?.trim() || "";
  const roleLine = [testimonial.role, testimonial.company].filter(Boolean).join(", ");
  const quote = testimonial.quote;
  const rating = Math.max(1, Math.min(5, testimonial.rating ?? 5));

  return (
    <article
      className={cn(
        "group w-[290px] rounded-2xl bg-[linear-gradient(180deg,rgba(6,57,45,0.96),rgba(3,31,25,0.98))] p-6 ring-1 ring-emerald-900/45 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:bg-[linear-gradient(180deg,rgba(8,70,55,0.98),rgba(4,38,30,0.98))] hover:shadow-[0_16px_36px_rgba(16,185,129,0.12)] sm:w-[330px]",
        cardHeightClasses[index % cardHeightClasses.length]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-emerald-950/70 ring-1 ring-emerald-800/70">
            {testimonial.avatarUrl ? (
              <img
                src={testimonial.avatarUrl}
                alt={testimonial.avatarAlt ?? safeName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-emerald-100">
                {getInitials(safeName || roleLine || "")}
              </div>
            )}
          </div>
          <div className="space-y-1">
            {safeName ? (
              <p className="text-base font-semibold text-white">{safeName}</p>
            ) : null}
            {roleLine ? (
              <p className="text-sm text-emerald-100/70">{roleLine}</p>
            ) : null}
          </div>
        </div>
        <Quote className="h-5 w-5 text-emerald-200/35" />
      </div>

      {quote ? (
        <div className="mt-4 text-base leading-7 text-emerald-50/85">
          {Array.isArray(quote) ? <PortableText value={quote} /> : <p>{String(quote).trim()}</p>}
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renderStars(rating)}
          <Chip variant="emerald" icon={<BadgeCheck />}>
            Verified
          </Chip>
        </div>
        {testimonial.institutionLogoUrl ? (
          <img
            src={testimonial.institutionLogoUrl}
            alt={testimonial.institutionLogoAlt ?? testimonial.company ?? "Institution logo"}
            className="h-8 w-auto object-contain opacity-90"
          />
        ) : null}
      </div>
    </article>
  );
}

function TestimonialMarqueeRow({
  testimonials,
  duration,
}: {
  testimonials: Testimonial[];
  duration: number;
}) {
  // Duplicate cards for a seamless infinite loop
  const loopedTestimonials = [...testimonials, ...testimonials];

  return (
    // mask - overflow hidden + padding so cards don't get clipped at the rounded corners
    <div className="group overflow-hidden px-10">
      {/* track - NO overflow hidden; animation only */}
      <div
        className="flex w-max gap-6 [backface-visibility:hidden] [transform:translate3d(0,0,0)] [transform-style:preserve-3d] will-change-transform motion-reduce:transform-none group-hover:[animation-play-state:paused]"
        style={{ animation: `testimonial-scroll ${duration}s linear infinite` }}
      >
        {loopedTestimonials.map((testimonial, index) => (
          <TestimonialCard
            key={`${testimonial._id ?? testimonial.name ?? "testimonial"}-${index}`}
            testimonial={testimonial}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

export default function TestimonialCarousel({
  testimonials,
  useFallbackContent = true,
}: {
  testimonials: Testimonial[];
  useFallbackContent?: boolean;
}) {
  const data = testimonials && testimonials.length > 0 ? testimonials : [];
  if (!data.length && !useFallbackContent) {
    return null;
  }
  if (!data.length) {
    return null;
  }
  const baseLane = ensureMinimumItems(data, 6);
  const laneA = baseLane;
  const laneB =
    baseLane.length > 1 ? [...baseLane.slice(1), baseLane[0]] : baseLane;

  return (
    // outer - rounded corners + overflow hidden (clips the scrolling track)
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 py-10 dark:border-emerald-800/30 dark:bg-[linear-gradient(180deg,rgba(4,25,20,0.6),rgba(2,15,12,0.8))]">
      <div className="space-y-6">
        <TestimonialMarqueeRow testimonials={laneA} duration={32} />
        <TestimonialMarqueeRow testimonials={laneB} duration={36} />
      </div>

      <style>{`
        @keyframes testimonial-scroll {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
