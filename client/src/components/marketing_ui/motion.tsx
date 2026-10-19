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


import {
  motion,
  AnimatePresence,
  useInView,
  type Variants,
} from "framer-motion";
import { useRef, type ReactNode, type ElementType } from "react";

// ─── Shared viewport settings ─────────────────────────────────────────────────
export const viewportOnce = { once: true, margin: "-80px" } as const;

// ─── Core Variants ────────────────────────────────────────────────────────────
const VARIANTS = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeInLeft: {
    hidden: { opacity: 0, x: -44 },
    visible: { opacity: 1, x: 0 },
  },
  fadeInRight: {
    hidden: { opacity: 0, x: 44 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.94 },
    visible: { opacity: 1, scale: 1 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
} satisfies Record<string, Variants>;

const DEFAULT_TRANSITION = { duration: 0.6, ease: "easeOut" };

// ─── 1. Section Wrapper — fadeUp on scroll ────────────────────────────────────
interface MotionSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}

export function MotionSection({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: MotionSectionProps) {
  const MotionTag = motion(Tag as "div");
  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={VARIANTS.fadeUp}
      transition={{ ...DEFAULT_TRANSITION, delay }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

// ─── 2. Split Layout — Image ──────────────────────────────────────────────────
// imagePosition: "left" | "right"
interface MotionSplitProps {
  children: ReactNode;
  className?: string;
  imagePosition?: "left" | "right";
  delay?: number;
}

/** Wrap the IMAGE side of a two-column layout */
export function MotionImage({
  children,
  className,
  imagePosition = "left",
  delay = 0,
}: MotionSplitProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={imagePosition === "left" ? VARIANTS.fadeInLeft : VARIANTS.fadeInRight}
      transition={{ ...DEFAULT_TRANSITION, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Wrap the TEXT side of a two-column layout */
export function MotionText({
  children,
  className,
  imagePosition = "left",
  delay = 0,
}: MotionSplitProps) {
  // Text is on the OPPOSITE side from the image
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={imagePosition === "left" ? VARIANTS.fadeInRight : VARIANTS.fadeInLeft}
      transition={{ ...DEFAULT_TRANSITION, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── 3. Stagger Container + Children ─────────────────────────────────────────
interface StaggerProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}

/** Wraps children and staggers their entrance */
export function MotionStagger({
  children,
  className,
  stagger = 0.1,
  delayChildren = 0,
}: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered child — use INSIDE MotionStagger */
interface StaggerChildProps {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof VARIANTS;
}
export function MotionChild({
  children,
  className,
  variant = "fadeUp",
}: StaggerChildProps) {
  return (
    <motion.div
      variants={{
        hidden: VARIANTS[variant].hidden,
        visible: {
          ...VARIANTS[variant].visible,
          transition: DEFAULT_TRANSITION,
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── 4. Heading / Paragraph / Buttons with preset delays ─────────────────────
interface MotionTextItemProps {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span";
  delay?: number;
  variant?: keyof typeof VARIANTS;
}

function MotionTextItem({
  children,
  className,
  as: Tag = "div",
  delay = 0,
  variant = "fadeUp",
}: MotionTextItemProps) {
  const MotionTag = motion(Tag as "div");
  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={VARIANTS[variant]}
      transition={{ ...DEFAULT_TRANSITION, delay }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

export function MotionHeading(props: MotionTextItemProps) {
  return <MotionTextItem {...props} delay={props.delay ?? 0} as={props.as ?? "h2"} />;
}
export function MotionParagraph(props: MotionTextItemProps) {
  return <MotionTextItem {...props} delay={props.delay ?? 0.12} as={props.as ?? "p"} />;
}
export function MotionButtons(props: MotionTextItemProps) {
  return <MotionTextItem {...props} delay={props.delay ?? 0.22} as={props.as ?? "div"} />;
}

// ─── 5. Card (fadeUp + hover lift + stagger-compatible) ──────────────────────
interface MotionCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverScale?: number;
}

/** Standalone card — animates itself */
export function MotionCard({
  children,
  className,
  delay = 0,
  hoverScale = 1.015,
}: MotionCardProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={VARIANTS.fadeUp}
      transition={{ ...DEFAULT_TRANSITION, delay }}
      whileHover={{ scale: hoverScale, y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Card grid — stagger children automatically */
interface CardGridProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
}
export function MotionCardGrid({
  children,
  className,
  stagger = 0.08,
}: CardGridProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Card used INSIDE a MotionCardGrid — gets stagger for free */
export function MotionCardItem({
  children,
  className,
  hoverScale = 1.015,
}: MotionCardProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 32 },
        visible: { opacity: 1, y: 0, transition: DEFAULT_TRANSITION },
      }}
      whileHover={{ scale: hoverScale, y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── 6. Scale-In (logos, icons, badges) ──────────────────────────────────────
interface MotionScaleProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}
export function MotionScaleIn({ children, className, delay = 0 }: MotionScaleProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={VARIANTS.scaleIn}
      transition={{ ...DEFAULT_TRANSITION, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── 7. Button (hover + tap) ──────────────────────────────────────────────────
interface MotionButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}
export function MotionButton({
  children,
  className,
  onClick,
  type = "button",
  disabled,
}: MotionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.965 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={className}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

// ─── 8. Tab pill — shared layout animation ───────────────────────────────────
/** Place this INSIDE an active tab button. layoutId must match across all tabs */
export function MotionTabPill({
  layoutId = "activeTab",
  className,
}: {
  layoutId?: string;
  className?: string;
}) {
  return (
    <motion.span
      layoutId={layoutId}
      className={className}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
    />
  );
}

// ─── 9. AnimatePresence tab content switcher ─────────────────────────────────
interface MotionTabContentProps {
  children: ReactNode;
  tabKey: string;
  className?: string;
}
export function MotionTabContent({
  children,
  tabKey,
  className,
}: MotionTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── 10. FAQ Accordion row ───────────────────────────────────────────────────
interface MotionAccordionProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}
export function MotionAccordion({
  isOpen,
  children,
  className,
}: MotionAccordionProps) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Animated arrow icon for FAQ rows */
export function MotionAccordionArrow({
  isOpen,
  className,
}: {
  isOpen: boolean;
  className?: string;
}) {
  return (
    <motion.span
      animate={{ rotate: isOpen ? 180 : 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={className}
    >
      ▾
    </motion.span>
  );
}

// ─── 11. Fade-in (generic) ────────────────────────────────────────────────────
interface MotionFadeProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}
export function MotionFade({ children, className, delay = 0 }: MotionFadeProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={VARIANTS.fadeIn}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── 12. Floating element (subtle loop) ──────────────────────────────────────
interface MotionFloatProps {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
}
export function MotionFloat({
  children,
  className,
  amplitude = 8,
  duration = 4,
}: MotionFloatProps) {
  return (
    <motion.div
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ repeat: Infinity, duration, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Re-export for convenience
export { motion, AnimatePresence };
