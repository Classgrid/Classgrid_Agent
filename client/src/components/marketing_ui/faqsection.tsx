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


import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/marketing_ui/button";
import { cn } from "@/lib/utils";

type FAQItem = {
  question: string;
  answer: string;
};

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  buttonLabel?: string;
  buttonHref?: string;
  faqsLeft: FAQItem[];
  faqsRight: FAQItem[];
  className?: string;
}

function FAQRow({
  faq,
  index,
  columnIndex,
}: {
  faq: FAQItem;
  index: number;
  columnIndex: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.45,
        ease: "easeOut",
        delay: columnIndex * 0.08 + index * 0.06,
      }}
      className="border-b border-slate-200/70 dark:border-white/10"
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 min-h-[72px] py-5 text-left text-[18px] font-medium leading-snug text-slate-900 transition-colors hover:text-emerald-500 focus-visible:outline-none dark:text-white dark:hover:text-emerald-400"
        aria-expanded={open}
      >
        <span>{faq.question}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
          className="mt-1 shrink-0 text-slate-400 dark:text-slate-500"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.38, ease: [0.33, 1, 0.68, 1] },
              opacity: { duration: 0.25, ease: "easeOut" },
            }}
            style={{ overflow: "hidden" }}
          >
            <div className="pb-6 pr-4 text-base leading-7 text-muted-foreground">
              {faq.answer}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection({
  title,
  subtitle,
  description,
  buttonLabel,
  buttonHref,
  faqsLeft,
  faqsRight,
  className,
}: FAQSectionProps) {
  const columns = [faqsLeft, faqsRight].filter((col) => col.length > 0);
  const hasHeaderContent = Boolean(title?.trim() || subtitle?.trim() || description?.trim());

  if (!columns.length && !hasHeaderContent) {
    return null;
  }

  return (
    <section className={cn("mx-auto w-full max-w-6xl px-4 py-20", className)}>
      {hasHeaderContent ? (
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mx-auto mb-6 h-1.5 w-24 rounded-full bg-orange-500"
          />

          {subtitle?.trim() ? (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
              className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-500"
            >
              {subtitle}
            </motion.p>
          ) : null}

          {title?.trim() ? (
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.12 }}
              className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-5xl"
            >
              {title}
            </motion.h2>
          ) : null}

          {description?.trim() ? (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
              className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground"
            >
              {description}
            </motion.p>
          ) : null}

          {buttonLabel?.trim() && buttonHref?.trim() ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.28 }}
              className="mt-8"
            >
              <Button
                asChild
                className="px-7"
              >
                <Link href={buttonHref}>{buttonLabel}</Link>
              </Button>
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}

      {columns.length > 0 ? (
        <div className="flex flex-col md:flex-row gap-x-16 text-left items-start">
          <div className="flex-1 w-full">
            {faqsLeft.map((faq, index) => (
              <FAQRow
                key={`left-${index}`}
                faq={faq}
                index={index}
                columnIndex={0}
              />
            ))}
          </div>
          {faqsRight.length > 0 && (
            <div className="flex-1 w-full">
              {faqsRight.map((faq, index) => (
                <FAQRow
                  key={`right-${index}`}
                  faq={faq}
                  index={index}
                  columnIndex={1}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
