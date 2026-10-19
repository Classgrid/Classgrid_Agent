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


import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type ShowcaseSlide = {
  src: string;
  label: string;
  subtitle: string;
  highlights: string[];
  alt?: string;
};

const DEFAULT_CARD_DATA: ShowcaseSlide[] = [
  {
    src: "/dashboards/attendance-dashboard.png",
    label: "AI-Powered Attendance",
    subtitle: "Automate roll calls using geo-fencing and facial recognition.",
    highlights: ["Real-time syncing across mobile and web", "Auto-alert triggers for absentees"],
  },
  {
    src: "/dashboards/fee-ledger.png",
    label: "Financial Ledger",
    subtitle: "Track every transaction in real-time.",
    highlights: ["Automated reconciliation", "Parent-app payment gateway integrations"],
  },
  {
    src: "/dashboards/timetable-view.png",
    label: "Smart Timetabling",
    subtitle: "Conflict-free schedule generation powered by logic.",
    highlights: ["Proxy assignment engine", "Drag-and-drop visual interface"],
  },
  {
    src: "/dashboards/results-analytics.png",
    label: "Results Analytics",
    subtitle: "Deep insights into student and class performance.",
    highlights: ["Predictive dropout modeling", "Subject-wise mastery tracking"],
  },
  {
    src: "/dashboards/parent-portal.png",
    label: "Parent Portal",
    subtitle: "Complete visibility for every parent.",
    highlights: ["Instant push notifications", "Two-way communication channels"],
  },
  {
    src: "/dashboards/bus-tracking.png",
    label: "IoT Transport & Bus Tracking",
    subtitle: "Live GPS mapping mapped directly to student IDs.",
    highlights: ["Geo-fenced arrival alerts", "Route optimization AI"],
  },
  {
    src: "/dashboards/ai-proctoring.png",
    label: "AI Proctoring Engine",
    subtitle: "Automated exam integrity for remote testing.",
    highlights: ["Gaze tracking and flag logs", "Secure browser lock-down"],
  },
  {
    src: "/dashboards/library-system.png",
    label: "Library System",
    subtitle: "Complete digital library and physical book management.",
    highlights: ["Barcode and RFID scanning", "Overdue fine automation"],
  },
  {
    src: "/dashboards/hrms-payroll.png",
    label: "HRMS & Payroll",
    subtitle: "Streamlined staff management and compliance.",
    highlights: ["One-click salary disbursement", "Leave workflow tracking"],
  },
  {
    src: "/dashboards/lead-crm.png",
    label: "Admission CRM",
    subtitle: "End-to-end lead tracking for increased enrollment.",
    highlights: ["Automated drip campaigns", "WhatsApp API integration"],
  },
];

const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
    scale: 0.95,
    filter: "blur(10px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
    scale: 0.95,
    filter: "blur(10px)",
  }),
};

const MotionDiv = motion.div as any;

export default function IntroAnimation({ slides }: { slides?: ShowcaseSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const cardData = slides && slides.length > 0 ? slides : DEFAULT_CARD_DATA;
  const currentCard = cardData[currentIndex];

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % cardData.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [cardData.length, isPaused]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % cardData.length);
  }, [cardData.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + cardData.length) % cardData.length);
  }, [cardData.length]);

  return (
    <div className="relative flex h-full w-full select-none flex-col items-center justify-start bg-background pt-4">
      <div
        className="relative flex aspect-[16/9] w-full max-w-4xl items-center justify-center group/section"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <MotionDiv
            key={currentIndex}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 40,
              mass: 1,
            }}
            className="absolute inset-0 cursor-pointer"
          >
            <div className="group/image relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-border bg-card shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
              <div className="pointer-events-none absolute inset-0 z-10 rounded-3xl ring-1 ring-inset ring-white/10 dark:ring-white/5" />

              <img
                src={currentCard.src}
                alt={currentCard.alt ?? currentCard.label}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-105"
              />
            </div>
          </MotionDiv>
        </AnimatePresence>

        <button
          onClick={goPrev}
          className="absolute left-0 z-40 flex h-12 w-12 -translate-x-6 items-center justify-center rounded-full border border-border bg-background/50 text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:opacity-100 group-hover/section:opacity-100 md:-translate-x-12 opacity-0"
          aria-label="Previous card"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={goNext}
          className="absolute right-0 z-40 flex h-12 w-12 translate-x-6 items-center justify-center rounded-full border border-border bg-background/50 text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:opacity-100 group-hover/section:opacity-100 md:translate-x-12 opacity-0"
          aria-label="Next card"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-8 grid w-full max-w-4xl items-start gap-6 px-4 md:mt-12 md:grid-cols-2 md:gap-12">
        <AnimatePresence initial={false} mode="wait">
          <MotionDiv
            key={`${currentIndex}-content`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
            className="flex flex-col space-y-2 text-left"
          >
            <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-3xl">
              {currentCard.label}
            </h3>
            <p className="text-base font-medium text-muted-foreground md:text-lg">
              {currentCard.subtitle}
            </p>
          </MotionDiv>
        </AnimatePresence>

        <AnimatePresence initial={false} mode="wait">
          <MotionDiv
            key={`${currentIndex}-highlights`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
            className="flex flex-col space-y-3"
          >
            {currentCard.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start">
                <svg className="mt-0.5 mr-3 h-5 w-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium text-muted-foreground">
                  {highlight}
                </span>
              </div>
            ))}
          </MotionDiv>
        </AnimatePresence>
      </div>

      <div className="mt-12 flex w-full max-w-md justify-center gap-2 px-4">
        {cardData.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setDirection(i > currentIndex ? 1 : -1);
              setCurrentIndex(i);
            }}
            className="relative h-1.5 flex-1 rounded-full transition-all duration-500 hover:bg-gray-400 dark:hover:bg-gray-500"
            style={{
              backgroundColor: i === currentIndex ? "currentColor" : "rgba(150, 150, 150, 0.2)",
              color: i === currentIndex ? "black" : "transparent",
            }}
            aria-label={`Go to card ${i + 1}`}
          >
            <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${i === currentIndex ? "bg-foreground opacity-100" : "opacity-0"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
