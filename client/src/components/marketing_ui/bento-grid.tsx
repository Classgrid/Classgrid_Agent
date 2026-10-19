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

// @ts-nocheck
"use client";

import React, { type ComponentPropsWithoutRef, type ReactNode, useRef, useState, useCallback } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/marketing_ui/button";
import { Chip } from "@/components/marketing_ui/chip";

import { IconRenderer } from "./icon-renderer";

function darkenColor(hex: string, factor = 0.5): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.substring(4, 6), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon: React.ElementType | string;
  description: string;
  href: string;
  cta: string;
  color?: string;
  iconColor?: string;
  tag?: string;
  tagVariant?: "emerald" | "cyan" | "amber" | "rose" | "violet" | "blue" | "orange" | "default";
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[220px] grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  color = "from-emerald-400/20",
  iconColor = "#34d399",
  tag,
  tagVariant = "emerald",
  ...props
}: BentoCardProps) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out the mouse movement
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  // ── Rotating border ring state ──
  const [ringPhase, setRingPhase] = useState<"idle" | "flash" | "orbit">("idle");
  const ringTimer = useRef<NodeJS.Timeout | null>(null);
  const borderColorDark = darkenColor(iconColor, 0.15);

  const handleMouseEnter = useCallback(() => {
    setRingPhase("flash");
    if (ringTimer.current) clearTimeout(ringTimer.current);
    ringTimer.current = setTimeout(() => setRingPhase("orbit"), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setRingPhase("idle");
    if (ringTimer.current) clearTimeout(ringTimer.current);
  }, []);

  const showCta = Boolean(cta?.trim() && href?.trim());

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border transition-all duration-300",
        "bg-card border-black/20 shadow-sm dark:shadow-none dark:border-white/20",
        "hover:-translate-y-[6px] hover:shadow-[0_10px_40px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_10px_40px_rgba(0,0,0,0.6)] hover:border-primary/30",
        className
      )}
      {...(props as any)}
    >
      {/* ── Rotating border ring (Vercel-style) ── */}
      <style>{`
        @property --border-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes flashBorder { 0% { --border-angle: 0deg; } 100% { --border-angle: 360deg; } }
        @keyframes orbitBorder { 0% { --border-angle: 0deg; } 100% { --border-angle: 360deg; } }
      `}</style>
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          opacity: ringPhase !== "idle" ? 1 : 0,
          transition: "opacity 0.2s ease",
          border: "2.5px solid transparent",
          backgroundImage: `
            linear-gradient(var(--card, #111111), var(--card, #111111)),
            conic-gradient(
              from var(--border-angle),
              transparent 0%,
              ${borderColorDark} 10%,
              ${iconColor} 20%,
              transparent 40%
            )
          `,
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          animation:
            ringPhase === "flash"
              ? "flashBorder 0.3s linear forwards"
              : ringPhase === "orbit"
              ? "orbitBorder 4s linear infinite"
              : "none",
        }}
      />

      {/* Background Glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100 dark:hidden"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${springX}px ${springY}px,
              rgba(16, 185, 129, 0.02),
              transparent 80%
            )
          `,
        }}
      />
      
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100 hidden dark:block"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${springX}px ${springY}px,
              rgba(16, 185, 129, 0.06),
              transparent 80%
            )
          `,
        }}
      />

      {/* Hover border glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              300px circle at ${springX}px ${springY}px,
              ${iconColor}66,
              transparent 80%
            )
          `,
          WebkitMaskImage: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />

      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent opacity-10 pointer-events-none -z-10", color)} />
      {background && <div className="absolute inset-0 opacity-10 pointer-events-none -z-10">{background}</div>}

      <div className="p-6 relative z-20 flex flex-col h-full bg-transparent">
        <div className="flex transform-gpu flex-col gap-2 transition-all duration-300 lg:group-hover:-translate-y-4">
          <div className="flex h-10 w-10 items-center justify-center mb-1" style={{ color: iconColor, filter: `drop-shadow(0 0 6px ${iconColor}99)` }}>
            {typeof Icon === "string" ? <IconRenderer name={Icon} className="h-7 w-7" /> : <Icon className="h-7 w-7" />}
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              {name}
            </h3>
            {tag?.trim() ? (
              <Chip variant={tagVariant} className="text-[10px]">
                {tag}
              </Chip>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed font-medium">{description}</p>
        </div>

        {showCta ? (
          <div className="mt-auto pt-4 flex w-full flex-row items-center transition-all duration-300 lg:hidden">
            <Button variant="link" size="sm" className="pointer-events-auto p-0 text-emerald-400 hover:text-emerald-300" asChild>
              <a href={href}>{cta}<ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" /></a>
            </Button>
          </div>
        ) : null}

        {showCta ? (
          <div className="absolute bottom-6 hidden w-[calc(100%-3rem)] translate-y-10 transform-gpu flex-row items-center opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
            <Button variant="link" size="sm" className="pointer-events-auto p-0 text-emerald-400 hover:text-emerald-300" asChild>
              <a href={href}>{cta}<ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" /></a>
            </Button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

export { BentoCard, BentoGrid };
