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


import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export type ContentTOCSection = {
  id: string;
  title: string;
};

type ContentTOCProps = {
  sections: ContentTOCSection[];
  /** Label at the top of the sidebar (e.g. "In this article") */
  label?: string;
  /** Back link href (e.g. "/changelog") */
  backHref?: string;
  /** Back link label (e.g. "All Updates") */
  backLabel?: string;
};

export function ContentTOC({
  sections,
  label = "On this page",
  backHref,
  backLabel,
}: ContentTOCProps) {
  const [mounted, setMounted] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const isProgrammaticScrollRef = useRef(false);
  const targetSectionRef = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0);

      if (isProgrammaticScrollRef.current && targetSectionRef.current) {
        const el = document.getElementById(targetSectionRef.current);
        if (el && Math.abs(el.getBoundingClientRect().top - 96) > 28) return;
      }

      let currentId = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && scrollTop >= el.offsetTop - 180) currentId = id;
      }
      setActiveSectionId(currentId);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [sectionIds]);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    isProgrammaticScrollRef.current = true;
    targetSectionRef.current = id;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    window.scrollTo({
      top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96),
      behavior: "smooth",
    });

    timeoutRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      targetSectionRef.current = null;
    }, 700);

    window.history.replaceState(null, "", `#${id}`);
    setActiveSectionId(id);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Scroll progress bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-border/70">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Left sidebar */}
      <aside className="fixed left-0 top-20 z-30 hidden h-[calc(100vh-80px)] w-[260px] overflow-y-auto border-r border-border bg-background [scrollbar-width:thin] scroll-smooth xl:block">
        <motion.div
          className="p-5"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {/* Back link */}
          {backHref && (
            <Link
              href={backHref}
              className="mb-5 flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          )}

          <motion.h3
            className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground/60"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.06 }}
          >
            {label}
          </motion.h3>

          <div className="space-y-0.5">
            {sections.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => handleClick(e, section.id)}
                className={cn(
                  "relative block overflow-hidden rounded-md px-2 py-2 text-sm leading-6 transition-colors duration-200",
                  activeSectionId === section.id
                    ? "font-semibold text-emerald-500"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeSectionId === section.id && (
                  <span className="pointer-events-none absolute inset-0 rounded-md border-l-2 border-emerald-500 bg-emerald-500/6" />
                )}
                <span className="relative mr-2 inline-block w-7 text-[11px] font-bold text-muted-foreground/50">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="relative inline text-[13px]">{section.title}</span>
              </a>
            ))}
          </div>
        </motion.div>
      </aside>
    </>
  );
}
