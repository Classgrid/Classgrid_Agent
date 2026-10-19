<!--
─────────────────────────────────────────────────────────
🚨 HOSTING & ARCHITECTURE RULE 🚨
1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
2. FRONTEND IS HOSTED ON VERCEL
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 NAMING CONVENTION RULE 🚨
1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 CRITICAL AI AND SYSTEM RULES 🚨
1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
─────────────────────────────────────────────────────────
-->

# Vercel Design System & UX Analysis Report
**Purpose:** Technical breakdown of the Vercel/Turborepo marketing site to inform the Classgrid platform identity and marketing page development.

---

## 1. Header & Navigation (The "Morphing" Experience)
The header is the most sophisticated component of the Vercel design system, characterized by fluid transitions and a clean, technical aesthetic.

### **Navigation Mechanism**
*   **Engine:** Built using **Radix UI Navigation Menu** primitives.
*   **Animations:** Utilizes "Shared Layout" transitions (likely via **Framer Motion**). When switching between 'Products', 'Solutions', and 'Resources', the dropdown container (the "blob") does not re-render. Instead, it **morphs** its dimensions and position to fit the new content.
*   **Glassmorphism:** The header background uses `backdrop-filter: blur(12px)` and a semi-transparent background (`rgba(0,0,0,0.8)` in dark mode) to create a premium depth effect.

### **Dropdown Layouts**
| Category | Primary Columns | Key Sub-items |
| :--- | :--- | :--- |
| **Products** | AI Cloud, Core Platform, Security | v0, AI SDK, CI/CD, Observability, WAF |
| **Solutions** | Use Cases, Tools, Users | AI Apps, Marketing Sites, Platform Engineers |
| **Resources** | Company, Learn, Open Source | Docs, Academy, Blog, Next.js, Turborepo |

---

## 2. Hero Section & Branding
The Hero section is designed for maximum developer impact, using "Industrial Minimalism."

*   **Typography:** The site uses the **Geist** font family. Headlines are extremely bold and use a subtle text-gradient or inner glow in dark mode.
*   **Visual Elements:** 
    *   **3D Grids:** A perspective grid that recedes into the background, creating a sense of "Platform Scale."
    *   **Neo-Accents:** Subtle radial gradients (Pulse colors like Cyan and Magenta) are used to break the monochrome black-and-white theme.
*   **Sticky Counter:** A real-time counter showing "Compute minutes saved" adds quantitative social proof above the fold.

---

## 3. Demo Page (Lead Conversion Design)
The "Talk to Sales" page (`/contact/sales`) follows a strict conversion blueprint.

*   **Split Layout (50/50 Desktop):**
    *   **Left (Value Prop):** Large headlines with specific ROI metrics (e.g., "6x faster build and deploy").
    *   **Right (Lead Form):** A focused input block. Form fields use `#0A0A0A` backgrounds with sharp `#FFFFFF` borders on focus.
*   **Social Proof Strip:** A horizontal band of logos from high-authority brands (eBay, Sonos, TripAdvisor) is placed immediately below the hero to build trust.
*   **Full Header:** Unlike many conversion pages, Vercel maintains the full site header here, allowing users to return to product research if they aren't ready to book a demo.

---

## 4. Footer & Bottom Utility Bar
The footer follows a high-density "Information Matrix" approach, ensuring every major feature of the Vercel ecosystem is discoverable.

### **Structure & Columns**
The footer is split into two primary horizontal tiers:
*   **Tier 1 (Utility Grid):** 6 columns with no explicit headings, focusing on core product modules like *Templates*, *Next.js*, *CI/CD*, and *Docs*.
*   **Tier 2 (Categorized Directory):** 5 categorized columns with uppercase headings:
    *   **FRAMEWORKS:** Next.js, Nuxt, Svelte, Nitro, Turbo.
    *   **SDKS:** AI SDK, Workflow SDK (NEW), Flags SDK, Chat SDK.
    *   **USE CASES:** Composable commerce, Multi-tenant platforms, Design engineers.
    *   **COMPANY:** About, Careers, Press, Privacy Policy.
    *   **COMMUNITY:** Open source, Events, GitHub, LinkedIn, YouTube.

### **Visual Details**
*   **"NEW" Badges:** Strategic use of a rounded-rectangle "NEW" badge next to cutting-edge features (e.g., AI Gateway, Vercel Agent) to draw attention without cluttering the layout.
*   **Bottom Utility Strip:**
    *   **System Status:** A live indicator ("ALL SYSTEMS NORMAL") with a pulsing/static blue square.
    *   **Theme Switcher:** A localized, pinned utility in the bottom-right corner allowing 3-way switching (System, Light, Dark). This is a critical pattern for "Developer Identity" platforms.

## 5. Design Foundation (Tokens)
*   **Color Palette (Dark Mode):**
    *   Background: `#000000` (Pure Black)
    *   Surface: `#0A0A0A` (Secondary Cards)
    *   Border: `#333333` (Subtle UI borders)
    *   Primary Text: `#FFFFFF`
    *   Secondary Text: `#888888`
*   **Animations:**
    *   **Reveal:** `fade-in` + `slide-up` (usually a 20px-40px vertical drift).
    *   **Hovers:** Micro-interactions on buttons using `invert` effects or glowing borders.

## 6. Application to Classgrid Platform
We should adopt the following specific patterns for the Classgrid identity pages:
1.  **Identity Path Selector:** Use the "Morphing Dropdown" logic when the user selects their `org_type` (Engineering vs. Coaching).
2.  **Information-Dense Footer:** Replicate the 6-column grid for the Classgrid footer to showcase our diverse feature sets (Admission, Academics, Canteen, Payroll, etc.) as distinct "Categories."
3.  **Live Status:** Implement a "Classgrid Status" indicator in the footer to build institutional trust.
4.  **Black/White Hierarchy:** For the DTE Admission portal, use the high-contrast dark mode to imply a "Legal & Secure" environment.

---
**Report updated on:** 2026-04-10
**Author:** Antigravity AI Engineering
# 🚀 CLASSGRID NEXT.JS MARKETING CODEX

## 1. STRATEGIC DESIGN AESTHETIC
We are building a Next.js (App Router) marketing payload that fuses **Vercel's ultra-premium developer aesthetic** with the **Enterprise Trust Markers of an Educational ERP** (like EduplusCampus & vmedulife).
*   **Theme:** Strict Dark/Light mode support using Shadcn UI.
*   **Vibe:** Fast, precise, glowing neon on dark surfaces, with extensive use of glassmorphism.

---

## 2. THE GLOBAL HEADER & FOOTER (Inspired by Vercel)

### 🔹 Header Bar (Glassmorphism)
*   **Sticky Position:** Blurs the content scrolling beneath it using `backdrop-blur-md bg-white/70 dark:bg-black/70`.
*   **Left Component:** Sleek Classgrid logo.
*   **Center Navigation:** Dropdown menus built using Radix/Shadcn `NavigationMenu` for `Solutions`, `Modules`, `Pricing`, and `Resources`.
*   **Right CTAs:** 
    *   `Login`: Ghost button style.
    *   `Book Demo`: Ultra high-contrast solid button (Solid Black in Light Mode, Solid White in Dark Mode).

### 🔹 Footer Stack
*   **Theme Toggle:** Bottom-right corner toggle switching seamlessly between Light, Dark, and System states.
*   **Columns:** 5 massive columns distinguishing between `Platform` (Attendance, Admission), `Use Cases` (School, College, Coaching), and `Legal`.
*   **System Status:** Tiny green pinging dot on the bottom left reading "All systems operational. Zero lag." to communicate reliability.

---

## 3. THE HERO SECTION (Inspired by Turborepo)

*   **Background:** Instead of stock university images, use a retro-futuristic grid array (`[background-size:24px_24px]`).
*   **Animation Motif:** A glowing, real-time "infrastructure speed" pulse.
*   **Headline:** *The Operating System for Modern Education.*
*   **Scale Counters:** A glowing ticker that rapidly rolls up to our simulated scale metric (e.g. "Managing 500,000+ Students").
*   **4-Branch Splitting:** Directly under the Hero call-to-actions, four massive glowing cards visually separate the traffic funnel instantly into:
    1.  **School**
    2.  **College / Engineering**
    3.  **Junior College**
    4.  **Coaching Platform**

---

## 4. THE INTEGRATION ECOSYSTEM (Inspired by vmedulife + 21st.dev)

To absolutely crush the competition in proving our system's interoperability, we are deploying an infinite-scroll "Integration Hero".

**Implementation Strategy:** Using the `ruixen.ui` `IntegrationHero` component you added, we will map out genuine integrations to trigger high-tech credibility.

*   **Target Images to Replace in `ICONS_ROW1` and `ICONS_ROW2`:**
    *   `AWS S3` (For document storage)
    *   `Razorpay` (For fee/canteen splitting)
    *   `Zoom` / `Google Meet` (For online classes)
    *   `Agora` (For Live Events / Admissions)
    *   `Brevo` (For Email Dispatch)
    *   `
    *   `Supabase` (For Postgres Real-time auth)
    *   `Redis` (For Zero-loss Chat)

*   **Layout Impact:** The `animate-scroll-left` and `animate-scroll-right` infinite fading loops mapped to our real SaaS stack will prove we build like Silicon Valley, not like a legacy campus software.

---

## 5. QUICK LEAD-CAPTURE DEMO FORM (Inspired by EduplusCampus)

*   **The Hook:** A floating action bar or heavily stylized lower-third section asking: *"Are you looking for smart solutions to automate your campus?"*
*   **The Form:** 
    *   Name
    *   Institution Name
    *   Phone Number
    *   Role (Admin / Principal / Professor)
*   **Execution:** Using Shadcn `Form` with Zod validation. Keep it ultra-minimal with floating labels. Strip away friction so we capture leads massively.

---

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue } from "framer-motion";

// --- Utility ---
// function cn(...inputs: ClassValue[]) {
//     return twMerge(clsx(inputs));
// }

// --- Types ---
export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";

interface FlipCardProps {
    src: string;
    index: number;
    total: number;
    phase: AnimationPhase;
    target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}
# Vercel Design System & UX Analysis Report
**Purpose:** Technical breakdown of the Vercel/Turborepo marketing site to inform the Classgrid platform identity and marketing page development.

---

## 1. Header & Navigation (The "Morphing" Experience)
The header is the most sophisticated component of the Vercel design system, characterized by fluid transitions and a clean, technical aesthetic.

### **Navigation Mechanism**
*   **Engine:** Built using **Radix UI Navigation Menu** primitives.
*   **Animations:** Utilizes "Shared Layout" transitions (likely via **Framer Motion**). When switching between 'Products', 'Solutions', and 'Resources', the dropdown container (the "blob") does not re-render. Instead, it **morphs** its dimensions and position to fit the new content.
*   **Glassmorphism:** The header background uses `backdrop-filter: blur(12px)` and a semi-transparent background (`rgba(0,0,0,0.8)` in dark mode) to create a premium depth effect.

### **Dropdown Layouts**
| Category | Primary Columns | Key Sub-items |
| :--- | :--- | :--- |
| **Products** | AI Cloud, Core Platform, Security | v0, AI SDK, CI/CD, Observability, WAF |
| **Solutions** | Use Cases, Tools, Users | AI Apps, Marketing Sites, Platform Engineers |
| **Resources** | Company, Learn, Open Source | Docs, Academy, Blog, Next.js, Turborepo |

---

## 2. Hero Section & Branding
The Hero section is designed for maximum developer impact, using "Industrial Minimalism."

*   **Typography:** The site uses the **Geist** font family. Headlines are extremely bold and use a subtle text-gradient or inner glow in dark mode.
*   **Visual Elements:** 
    *   **3D Grids:** A perspective grid that recedes into the background, creating a sense of "Platform Scale."
    *   **Neo-Accents:** Subtle radial gradients (Pulse colors like Cyan and Magenta) are used to break the monochrome black-and-white theme.
*   **Sticky Counter:** A real-time counter showing "Compute minutes saved" adds quantitative social proof above the fold.

---

## 3. Demo Page (Lead Conversion Design)
The "Talk to Sales" page (`/contact/sales`) follows a strict conversion blueprint.

*   **Split Layout (50/50 Desktop):**
    *   **Left (Value Prop):** Large headlines with specific ROI metrics (e.g., "6x faster build and deploy").
    *   **Right (Lead Form):** A focused input block. Form fields use `#0A0A0A` backgrounds with sharp `#FFFFFF` borders on focus.
*   **Social Proof Strip:** A horizontal band of logos from high-authority brands (eBay, Sonos, TripAdvisor) is placed immediately below the hero to build trust.
*   **Full Header:** Unlike many conversion pages, Vercel maintains the full site header here, allowing users to return to product research if they aren't ready to book a demo.

---

## 4. Footer & Bottom Utility Bar
The footer follows a high-density "Information Matrix" approach, ensuring every major feature of the Vercel ecosystem is discoverable.

### **Structure & Columns**
The footer is split into two primary horizontal tiers:
*   **Tier 1 (Utility Grid):** 6 columns with no explicit headings, focusing on core product modules like *Templates*, *Next.js*, *CI/CD*, and *Docs*.
*   **Tier 2 (Categorized Directory):** 5 categorized columns with uppercase headings:
    *   **FRAMEWORKS:** Next.js, Nuxt, Svelte, Nitro, Turbo.
    *   **SDKS:** AI SDK, Workflow SDK (NEW), Flags SDK, Chat SDK.
    *   **USE CASES:** Composable commerce, Multi-tenant platforms, Design engineers.
    *   **COMPANY:** About, Careers, Press, Privacy Policy.
    *   **COMMUNITY:** Open source, Events, GitHub, LinkedIn, YouTube.

### **Visual Details**
*   **"NEW" Badges:** Strategic use of a rounded-rectangle "NEW" badge next to cutting-edge features (e.g., AI Gateway, Vercel Agent) to draw attention without cluttering the layout.
*   **Bottom Utility Strip:**
    *   **System Status:** A live indicator ("ALL SYSTEMS NORMAL") with a pulsing/static blue square.
    *   **Theme Switcher:** A localized, pinned utility in the bottom-right corner allowing 3-way switching (System, Light, Dark). This is a critical pattern for "Developer Identity" platforms.

## 5. Design Foundation (Tokens)
*   **Color Palette (Dark Mode):**
    *   Background: `#000000` (Pure Black)
    *   Surface: `#0A0A0A` (Secondary Cards)
    *   Border: `#333333` (Subtle UI borders)
    *   Primary Text: `#FFFFFF`
    *   Secondary Text: `#888888`
*   **Animations:**
    *   **Reveal:** `fade-in` + `slide-up` (usually a 20px-40px vertical drift).
    *   **Hovers:** Micro-interactions on buttons using `invert` effects or glowing borders.

## 6. Application to Classgrid Platform
We should adopt the following specific patterns for the Classgrid identity pages:
1.  **Identity Path Selector:** Use the "Morphing Dropdown" logic when the user selects their `org_type` (Engineering vs. Coaching).
2.  **Information-Dense Footer:** Replicate the 6-column grid for the Classgrid footer to showcase our diverse feature sets (Admission, Academics, Canteen, Payroll, etc.) as distinct "Categories."
3.  **Live Status:** Implement a "Classgrid Status" indicator in the footer to build institutional trust.
4.  **Black/White Hierarchy:** For the DTE Admission portal, use the high-contrast dark mode to imply a "Legal & Secure" environment.

---
**Report updated on:** 2026-04-10
**Author:** Antigravity AI Engineering
# 🚀 CLASSGRID NEXT.JS MARKETING CODEX

## 1. STRATEGIC DESIGN AESTHETIC
We are building a Next.js (App Router) marketing payload that fuses **Vercel's ultra-premium developer aesthetic** with the **Enterprise Trust Markers of an Educational ERP** (like EduplusCampus & vmedulife).
*   **Theme:** Strict Dark/Light mode support using Shadcn UI.
*   **Vibe:** Fast, precise, glowing neon on dark surfaces, with extensive use of glassmorphism.

---

## 2. THE GLOBAL HEADER & FOOTER (Inspired by Vercel)

### 🔹 Header Bar (Glassmorphism)
*   **Sticky Position:** Blurs the content scrolling beneath it using `backdrop-blur-md bg-white/70 dark:bg-black/70`.
*   **Left Component:** Sleek Classgrid logo.
*   **Center Navigation:** Dropdown menus built using Radix/Shadcn `NavigationMenu` for `Solutions`, `Modules`, `Pricing`, and `Resources`.
*   **Right CTAs:** 
    *   `Login`: Ghost button style.
    *   `Book Demo`: Ultra high-contrast solid button (Solid Black in Light Mode, Solid White in Dark Mode).

### 🔹 Footer Stack
*   **Theme Toggle:** Bottom-right corner toggle switching seamlessly between Light, Dark, and System states.
*   **Columns:** 5 massive columns distinguishing between `Platform` (Attendance, Admission), `Use Cases` (School, College, Coaching), and `Legal`.
*   **System Status:** Tiny green pinging dot on the bottom left reading "All systems operational. Zero lag." to communicate reliability.

---

## 3. THE HERO SECTION (Inspired by Turborepo)

*   **Background:** Instead of stock university images, use a retro-futuristic grid array (`[background-size:24px_24px]`).
*   **Animation Motif:** A glowing, real-time "infrastructure speed" pulse.
*   **Headline:** *The Operating System for Modern Education.*
*   **Scale Counters:** A glowing ticker that rapidly rolls up to our simulated scale metric (e.g. "Managing 500,000+ Students").
*   **4-Branch Splitting:** Directly under the Hero call-to-actions, four massive glowing cards visually separate the traffic funnel instantly into:
    1.  **School**
    2.  **College / Engineering**
    3.  **Junior College**
    4.  **Coaching Platform**

---

## 4. THE INTEGRATION ECOSYSTEM (Inspired by vmedulife + 21st.dev)

To absolutely crush the competition in proving our system's interoperability, we are deploying an infinite-scroll "Integration Hero".

**Implementation Strategy:** Using the `ruixen.ui` `IntegrationHero` component you added, we will map out genuine integrations to trigger high-tech credibility.

*   **Target Images to Replace in `ICONS_ROW1` and `ICONS_ROW2`:**
    *   `AWS S3` (For document storage)
    *   `Razorpay` (For fee/canteen splitting)
    *   `Zoom` / `Google Meet` (For online classes)
    *   `Agora` (For Live Events / Admissions)
    *   `Brevo` (For Email Dispatch)
    *   `
    *   `Supabase` (For Postgres Real-time auth)
    *   `Redis` (For Zero-loss Chat)

*   **Layout Impact:** The `animate-scroll-left` and `animate-scroll-right` infinite fading loops mapped to our real SaaS stack will prove we build like Silicon Valley, not like a legacy campus software.

---

## 5. QUICK LEAD-CAPTURE DEMO FORM (Inspired by EduplusCampus)

*   **The Hook:** A floating action bar or heavily stylized lower-third section asking: *"Are you looking for smart solutions to automate your campus?"*
*   **The Form:** 
    *   Name
    *   Institution Name
    *   Phone Number
    *   Role (Admin / Principal / Professor)
*   **Execution:** Using Shadcn `Form` with Zod validation. Keep it ultra-minimal with floating labels. Strip away friction so we capture leads massively.

---

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue } from "framer-motion";

// --- Utility ---
// function cn(...inputs: ClassValue[]) {
//     return twMerge(clsx(inputs));
// }

// --- Types ---
export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";

interface FlipCardProps {
    src: string;
    index: number;
    total: number;
    phase: AnimationPhase;
    target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}

// --- FlipCard Component ---
const IMG_WIDTH = 60;  // Reduced from 100
const IMG_HEIGHT = 85; // Reduced from 140

function FlipCard({
    src,
    index,
    total,
    phase,
    target,
}: FlipCardProps) {
    return (
        <motion.div
            // Smoothly animate to the coordinates defined by the parent
            animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
            }}
            transition={{
                type: "spring",
                stiffness: 40,
                damping: 15,
            }}

            // Initial style
            style={{
                position: "absolute",
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                transformStyle: "preserve-3d", // Essential for the 3D hover effect
                perspective: "1000px",
            }}
            className="cursor-pointer group"
        >
            <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ rotateY: 180 }}
            >
                {/* Front Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-gray-200"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <img
                        src={src}
                        alt={`hero-${index}`}
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent" />
                </div>

                {/* Back Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-gray-900 flex flex-col items-center justify-center p-4 border border-gray-700"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <div className="text-center">
                        <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-1">View</p>
                        <p className="text-xs font-medium text-white">Details</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// --- Main Hero Component ---
const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000; // Virtual scroll range

// Unsplash Images
const IMAGES = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=300&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80",
    "https://images.unsplash.com/photo-1506765515384-028b60a970df?w=300&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&q=80",
    "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?w=300&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=80",
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=300&q=80",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=300&q=80",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=300&q=80",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=300&q=80",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=300&q=80",
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=300&q=80",
    "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=300&q=80",
    "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=300&q=80",
    "https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=300&q=80",
];

// Helper for linear interpolation
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export default function IntroAnimation() {
    const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Container Size ---
    useEffect(() => {
        if (!containerRef.current) return;

        const handleResize = (entries: ResizeObserverEntry[]) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        };

        const observer = new ResizeObserver(handleResize);
        observer.observe(containerRef.current);

        // Initial set
        setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
        });

        return () => observer.disconnect();
    }, []);

    // --- Virtual Scroll Logic ---
    const virtualScroll = useMotionValue(0);
    const scrollRef = useRef(0); // Keep track of scroll value without re-renders

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Prevent default to stop browser overscroll/bounce
            e.preventDefault();

            const newScroll = Math.min(Math.max(scrollRef.current + e.deltaY, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
        };

        // Touch support
        let touchStartY = 0;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            touchStartY = touchY;

            const newScroll = Math.min(Math.max(scrollRef.current + deltaY, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
        };

        // Attach listeners to container instead of window for portability
        container.addEventListener("wheel", handleWheel, { passive: false });
        container.addEventListener("touchstart", handleTouchStart, { passive: false });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            container.removeEventListener("wheel", handleWheel);
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
        };
    }, [virtualScroll]);

    // 1. Morph Progress: 0 (Circle) -> 1 (Bottom Arc)
    // Happens between scroll 0 and 600
    const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
    const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });

    // 2. Scroll Rotation (Shuffling): Starts after morph (e.g., > 600)
    // Rotates the bottom arc as user continues scrolling
    const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
    const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });

    // --- Mouse Parallax ---
    const mouseX = useMotionValue(0);
    const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;

            // Normalize -1 to 1
            const normalizedX = (relativeX / rect.width) * 2 - 1;
            // Move +/- 100px
            mouseX.set(normalizedX * 100);
        };
        container.addEventListener("mousemove", handleMouseMove);
        return () => container.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX]);

    // --- Intro Sequence ---
    useEffect(() => {
        const timer1 = setTimeout(() => setIntroPhase("line"), 500);
        const timer2 = setTimeout(() => setIntroPhase("circle"), 2500);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    // --- Random Scatter Positions ---
    const scatterPositions = useMemo(() => {
        return IMAGES.map(() => ({
            x: (Math.random() - 0.5) * 1500,
            y: (Math.random() - 0.5) * 1000,
            rotation: (Math.random() - 0.5) * 180,
            scale: 0.6,
            opacity: 0,
        }));
    }, []);

    // --- Render Loop (Manual Calculation for Morph) ---
    const [morphValue, setMorphValue] = useState(0);
    const [rotateValue, setRotateValue] = useState(0);
    const [parallaxValue, setParallaxValue] = useState(0);

    useEffect(() => {
        const unsubscribeMorph = smoothMorph.on("change", setMorphValue);
        const unsubscribeRotate = smoothScrollRotate.on("change", setRotateValue);
        const unsubscribeParallax = smoothMouseX.on("change", setParallaxValue);
        return () => {
            unsubscribeMorph();
            unsubscribeRotate();
            unsubscribeParallax();
        };
    }, [smoothMorph, smoothScrollRotate, smoothMouseX]);

    // --- Content Opacity ---
    // Fade in content when arc is formed (morphValue > 0.8)
    const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
    const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#FAFAFA] overflow-hidden">
            {/* Container */}
            <div className="flex h-full w-full flex-col items-center justify-center perspective-1000">

                {/* Intro Text (Fades out) */}
                <div className="absolute z-0 flex flex-col items-center justify-center text-center pointer-events-none top-1/2 -translate-y-1/2">
                    <motion.h1
                        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
                        transition={{ duration: 1 }}
                        className="text-2xl font-medium tracking-tight text-gray-800 md:text-4xl"
                    >
                        The future is built on AI.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 0.5 - morphValue } : { opacity: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="mt-4 text-xs font-bold tracking-[0.2em] text-gray-500"
                    >
                        SCROLL TO EXPLORE
                    </motion.p>
                </div>

                {/* Arc Active Content (Fades in) */}
                <motion.div
                    style={{ opacity: contentOpacity, y: contentY }}
                    className="absolute top-[10%] z-10 flex flex-col items-center justify-center text-center pointer-events-none px-4"
                >
                    <h2 className="text-3xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-4">
                        Explore Our Vision
                    </h2>
                    <p className="text-sm md:text-base text-gray-600 max-w-lg leading-relaxed">
                        Discover a world where technology meets creativity. <br className="hidden md:block" />
                        Scroll through our curated collection of innovations designed to shape the future.
                    </p>
                </motion.div>

                {/* Main Container */}
                <div className="relative flex items-center justify-center w-full h-full">
                    {IMAGES.slice(0, TOTAL_IMAGES).map((src, i) => {
                        let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

                        // 1. Intro Phases (Scatter -> Line)
                        if (introPhase === "scatter") {
                            target = scatterPositions[i];
                        } else if (introPhase === "line") {
                            const lineSpacing = 70; // Adjusted for smaller images (60px width + 10px gap)
                            const lineTotalWidth = TOTAL_IMAGES * lineSpacing;
                            const lineX = i * lineSpacing - lineTotalWidth / 2;
                            target = { x: lineX, y: 0, rotation: 0, scale: 1, opacity: 1 };
                        } else {
                            // 2. Circle Phase & Morph Logic

                            // Responsive Calculations
                            const isMobile = containerSize.width < 768;
                            const minDimension = Math.min(containerSize.width, containerSize.height);

                            // A. Calculate Circle Position
                            const circleRadius = Math.min(minDimension * 0.35, 350);

                            const circleAngle = (i / TOTAL_IMAGES) * 360;
                            const circleRad = (circleAngle * Math.PI) / 180;
                            const circlePos = {
                                x: Math.cos(circleRad) * circleRadius,
                                y: Math.sin(circleRad) * circleRadius,
                                rotation: circleAngle + 90,
                            };

                            // B. Calculate Bottom Arc Position
                            // "Rainbow" Arch: Convex up. Center is highest point.

                            // Radius:
                            const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
                            const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);

                            // Position:
                            const arcApexY = containerSize.height * (isMobile ? 0.35 : 0.25);
                            const arcCenterY = arcApexY + arcRadius;

                            // Spread angle:
                            const spreadAngle = isMobile ? 100 : 130;
                            const startAngle = -90 - (spreadAngle / 2);
                            const step = spreadAngle / (TOTAL_IMAGES - 1);

                            // Apply Scroll Rotation (Shuffle) with Bounds
                            // We want to clamp rotation so images don't disappear.
                            // Map scroll range [600, 3000] to a limited rotation range.
                            // Range: [-spreadAngle/2, spreadAngle/2] keeps them roughly in view.
                            // We map 0 -> 1 (progress of scroll loop) to this range.

                            // Note: rotateValue comes from smoothScrollRotate which maps [600, 3000] -> [0, 360]
                            // We need to adjust that mapping in the hook above, OR adjust it here.
                            // Better to adjust it here relative to the spread.

                            // Let's interpret rotateValue (0 to 360) as a progress 0 to 1
                            const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);

                            // Calculate bounded rotation:
                            // Move from 0 (centered) to -spreadAngle (all the way left) or similar.
                            // Let's allow scrolling through the list.
                            // Total sweep needed to see all items if we start at one end?
                            // If we start centered, we can go +/- spreadAngle/2.

                            // User wants to "stop on the last image".
                            // Let's map scroll to: 0 -> -spreadAngle (shifts items left)
                            const maxRotation = spreadAngle * 0.8; // Don't go all the way, keep last item visible
                            const boundedRotation = -scrollProgress * maxRotation;

                            const currentArcAngle = startAngle + (i * step) + boundedRotation;
                            const arcRad = (currentArcAngle * Math.PI) / 180;

                            const arcPos = {
                                x: Math.cos(arcRad) * arcRadius + parallaxValue,
                                y: Math.sin(arcRad) * arcRadius + arcCenterY,
                                rotation: currentArcAngle + 90,
                                scale: isMobile ? 1.4 : 1.8, // Increased scale for active state
                            };

                            // C. Interpolate (Morph)
                            target = {
                                x: lerp(circlePos.x, arcPos.x, morphValue),
                                y: lerp(circlePos.y, arcPos.y, morphValue),
                                rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
                                scale: lerp(1, arcPos.scale, morphValue),
                                opacity: 1,
                            };
                        }

                        return (
                            <FlipCard
                                key={i}
                                src={src}
                                index={i}
                                total={TOTAL_IMAGES}
                                phase={introPhase} // Pass intro phase for initial animations
                                target={target}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );# 🚀 CLASSGRID NEXT.JS MARKETING: DEEP ARCHITECTURAL CODEX

This is the exact UI mapping based on our deep scan of Vercel, Turborepo, EduplusCampus, and vmedulife. Use these exact specifications when scaffolding `app/page.tsx`.

---

## 🏗️ 1. VERCEL.COM: THE HEADER & FOOTER ENGINE
Vercel is the gold standard for "Platform" marketing. 

### A. The Top Header
*   **Background:** Do not use solid colors. Use a blur filter: `bg-black/50 backdrop-blur-md` with `sticky top-0 z-50`.
*   **Logo:** Left-aligned. Simple white triangle abstract, `h-8 w-8`.
*   **Center Navigation (Radix/Shadcn):** 
    *   Items: `Solutions`, `Features`, `Developers`, `Pricing`.
    *   Hover effect: When hovering, a very subtle pill `bg-white/10 rounded-md` instantly appears behind the text.
*   **CTAs (Right side):**
    *   "Contact Sales" (Ghost button: `text-sm text-gray-400 hover:text-white`).
    *   "Sign Up" (Solid contrast: `bg-white text-black px-4 py-2 hover:bg-gray-200 rounded-md font-medium`).

### B. The Vercel Footer 
*   **Spacing:** Enormous negative space. Use `pt-32 pb-16`.
*   **Link Columns:** 5 columns. Headings (`Products`, `Resources`, `Company`, `Legal`) must be `text-white font-semibold text-sm mb-4`.
*   **Links:** `text-gray-500 hover:text-gray-300 text-sm transition-colors`.
*   **Theme Toggle & Status:** Bottom right corner. A sleek segmented control for (Sun / Moon / System). Bottom left corner: A pulsating green dot `bg-green-500 rounded-full animate-pulse` with text "All systems normal".

---

## ⚡ 2. TURBOREPO: THE HERO SECTION & ANIMATION
We are replacing standard boring university stock photos with a highly technical, futuristic Turborepo aesthetic to show Classgrid's immense data engine.

### A. The Hero Container
*   **Background Grid:** `bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]`.
*   **Headline:** `text-7xl font-extrabold tracking-tighter`. Apply a metallic gradient texture: `bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500/80`.
*   *(Example Line: "The Operating System for Modern Campuses.")*
*   **The Glowing Lines Animation:** Use Framer Motion to draw lines tracing across the background grid, using `strokeDashoffset` from `1000` to `0` infinitely to look like data moving through pipelines.

### B. The Funnel Breakout (Directly under Hero)
*   Instead of making the user scroll, present 4 glowing cards instantly:
    1. Schools (Automate K-12)
    2. Junior Colleges (11th & 12th Sync)
    3. Degree Colleges (Complex Semesters)
    4. Coaching Institutes (Batch Management)
*   **Hover Effect:** When a card is hovered, a radial gradient `from-blue-500/20` follows the user's mouse cursor across the card borders.

---

## 🏫 3. EDUPLUS CAMPUS: ENTERPRISE TRUST MARKERS
Eduplus uses traditional B2B trust factors. We will elevate them.

### A. Hero-Adjacent Smart Form (Lead Capture)
*   **Headline:** "Are you looking for smart solutions to automate your campus?"
*   **Execution:** We don't hide the contact form on another page. We put a sleek glassmorphic Shadcn Form card floating on the right side of the hero, or right below it.
*   **Necessary Fields:** 
    *   Full Name
    *   Institution Name
    *   Designation (Dropdown: Principal / Trustee / Admin)
    *   Phone Number
    *   *Button:* "Book a 15-Min Demo"

### B. Client Logo Marquee
*   Immediately following the Hero, a massive horizontal reel of University Logos.
*   **Style:** `filter grayscale opacity-50`. They turn to full color `hover:grayscale-0 hover:opacity-100 transition-all` when the mouse hovers over them.

---

## 🛠️ 4. VMEDULIFE: INTEGRATION ECOSYSTEM
The code you pulled from 21st.dev (`IntegrationHero`) is the exact answer to VMEdulife's integration section!

*   **Header:** "250+ top apps are available to integrate seamlessly with your workflow."
*   **The Scrolling Implementation:** We will embed the `IntegrationHero` component right here.
*   **The Data:** Swap the generic links in your `ICONS_ROW1` array with our exact tech partners to prove Classgrid's power:
    *   Zoom / Google Meet (Live Classes)
    *   AWS S3 (Document storage)
    *   Brevo / AWS SNS (Messaging)
    *   Razorpay (Fee Collection)
    *   Agora (WebRTC Live Streams)
    *   mongodb (Backend Infrastructure proof)

}


// --- FlipCard Component ---
const IMG_WIDTH = 60;  // Reduced from 100
const IMG_HEIGHT = 85; // Reduced from 140

function FlipCard({
    src,
    index,
    total,
    phase,
    target,
}: FlipCardProps) {
    return (
        <motion.div
            // Smoothly animate to the coordinates defined by the parent
            animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
            }}
            transition={{
                type: "spring",
                stiffness: 40,
                damping: 15,
            }}

            // Initial style
            style={{
                position: "absolute",
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                transformStyle: "preserve-3d", // Essential for the 3D hover effect
                perspective: "1000px",
            }}
            className="cursor-pointer group"
        >
            <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ rotateY: 180 }}
            >
                {/* Front Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-gray-200"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <img
                        src={src}
                        alt={`hero-${index}`}
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent" />
                </div>

                {/* Back Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-gray-900 flex flex-col items-center justify-center p-4 border border-gray-700"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <div className="text-center">
                        <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-1">View</p>
                        <p className="text-xs font-medium text-white">Details</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// --- Main Hero Component ---
const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000; // Virtual scroll range

// Unsplash Images
const IMAGES = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=300&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80",
    "https://images.unsplash.com/photo-1506765515384-028b60a970df?w=300&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&q=80",
    "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?w=300&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=80",
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=300&q=80",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=300&q=80",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=300&q=80",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=300&q=80",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=300&q=80",
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=300&q=80",
    "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=300&q=80",
    "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=300&q=80",
    "https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=300&q=80",
];

// Helper for linear interpolation
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export default function IntroAnimation() {
    const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Container Size ---
    useEffect(() => {
        if (!containerRef.current) return;

        const handleResize = (entries: ResizeObserverEntry[]) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        };

        const observer = new ResizeObserver(handleResize);
        observer.observe(containerRef.current);

        // Initial set
        setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
        });

        return () => observer.disconnect();
    }, []);

    // --- Virtual Scroll Logic ---
    const virtualScroll = useMotionValue(0);
    const scrollRef = useRef(0); // Keep track of scroll value without re-renders

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Prevent default to stop browser overscroll/bounce
            e.preventDefault();

            const newScroll = Math.min(Math.max(scrollRef.current + e.deltaY, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
        };

        // Touch support
        let touchStartY = 0;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            touchStartY = touchY;

            const newScroll = Math.min(Math.max(scrollRef.current + deltaY, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
        };

        // Attach listeners to container instead of window for portability
        container.addEventListener("wheel", handleWheel, { passive: false });
        container.addEventListener("touchstart", handleTouchStart, { passive: false });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            container.removeEventListener("wheel", handleWheel);
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
        };
    }, [virtualScroll]);

    // 1. Morph Progress: 0 (Circle) -> 1 (Bottom Arc)
    // Happens between scroll 0 and 600
    const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
    const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });

    // 2. Scroll Rotation (Shuffling): Starts after morph (e.g., > 600)
    // Rotates the bottom arc as user continues scrolling
    const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
    const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });

    // --- Mouse Parallax ---
    const mouseX = useMotionValue(0);
    const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;

            // Normalize -1 to 1
            const normalizedX = (relativeX / rect.width) * 2 - 1;
            // Move +/- 100px
            mouseX.set(normalizedX * 100);
        };
        container.addEventListener("mousemove", handleMouseMove);
        return () => container.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX]);

    // --- Intro Sequence ---
    useEffect(() => {
        const timer1 = setTimeout(() => setIntroPhase("line"), 500);
        const timer2 = setTimeout(() => setIntroPhase("circle"), 2500);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    // --- Random Scatter Positions ---
    const scatterPositions = useMemo(() => {
        return IMAGES.map(() => ({
            x: (Math.random() - 0.5) * 1500,
            y: (Math.random() - 0.5) * 1000,
            rotation: (Math.random() - 0.5) * 180,
            scale: 0.6,
            opacity: 0,
        }));
    }, []);

    // --- Render Loop (Manual Calculation for Morph) ---
    const [morphValue, setMorphValue] = useState(0);
    const [rotateValue, setRotateValue] = useState(0);
    const [parallaxValue, setParallaxValue] = useState(0);

    useEffect(() => {
        const unsubscribeMorph = smoothMorph.on("change", setMorphValue);
        const unsubscribeRotate = smoothScrollRotate.on("change", setRotateValue);
        const unsubscribeParallax = smoothMouseX.on("change", setParallaxValue);
        return () => {
            unsubscribeMorph();
            unsubscribeRotate();
            unsubscribeParallax();
        };
    }, [smoothMorph, smoothScrollRotate, smoothMouseX]);

    // --- Content Opacity ---
    // Fade in content when arc is formed (morphValue > 0.8)
    const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
    const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#FAFAFA] overflow-hidden">
            {/* Container */}
            <div className="flex h-full w-full flex-col items-center justify-center perspective-1000">

                {/* Intro Text (Fades out) */}
                <div className="absolute z-0 flex flex-col items-center justify-center text-center pointer-events-none top-1/2 -translate-y-1/2">
                    <motion.h1
                        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
                        transition={{ duration: 1 }}
                        className="text-2xl font-medium tracking-tight text-gray-800 md:text-4xl"
                    >
                        The future is built on AI.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 0.5 - morphValue } : { opacity: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="mt-4 text-xs font-bold tracking-[0.2em] text-gray-500"
                    >
                        SCROLL TO EXPLORE
                    </motion.p>
                </div>

                {/* Arc Active Content (Fades in) */}
                <motion.div
                    style={{ opacity: contentOpacity, y: contentY }}
                    className="absolute top-[10%] z-10 flex flex-col items-center justify-center text-center pointer-events-none px-4"
                >
                    <h2 className="text-3xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-4">
                        Explore Our Vision
                    </h2>
                    <p className="text-sm md:text-base text-gray-600 max-w-lg leading-relaxed">
                        Discover a world where technology meets creativity. <br className="hidden md:block" />
                        Scroll through our curated collection of innovations designed to shape the future.
                    </p>
                </motion.div>

                {/* Main Container */}
                <div className="relative flex items-center justify-center w-full h-full">
                    {IMAGES.slice(0, TOTAL_IMAGES).map((src, i) => {
                        let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

                        // 1. Intro Phases (Scatter -> Line)
                        if (introPhase === "scatter") {
                            target = scatterPositions[i];
                        } else if (introPhase === "line") {
                            const lineSpacing = 70; // Adjusted for smaller images (60px width + 10px gap)
                            const lineTotalWidth = TOTAL_IMAGES * lineSpacing;
                            const lineX = i * lineSpacing - lineTotalWidth / 2;
                            target = { x: lineX, y: 0, rotation: 0, scale: 1, opacity: 1 };
                        } else {
                            // 2. Circle Phase & Morph Logic

                            // Responsive Calculations
                            const isMobile = containerSize.width < 768;
                            const minDimension = Math.min(containerSize.width, containerSize.height);

                            // A. Calculate Circle Position
                            const circleRadius = Math.min(minDimension * 0.35, 350);

                            const circleAngle = (i / TOTAL_IMAGES) * 360;
                            const circleRad = (circleAngle * Math.PI) / 180;
                            const circlePos = {
                                x: Math.cos(circleRad) * circleRadius,
                                y: Math.sin(circleRad) * circleRadius,
                                rotation: circleAngle + 90,
                            };

                            // B. Calculate Bottom Arc Position
                            // "Rainbow" Arch: Convex up. Center is highest point.

                            // Radius:
                            const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
                            const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);

                            // Position:
                            const arcApexY = containerSize.height * (isMobile ? 0.35 : 0.25);
                            const arcCenterY = arcApexY + arcRadius;

                            // Spread angle:
                            const spreadAngle = isMobile ? 100 : 130;
                            const startAngle = -90 - (spreadAngle / 2);
                            const step = spreadAngle / (TOTAL_IMAGES - 1);

                            // Apply Scroll Rotation (Shuffle) with Bounds
                            // We want to clamp rotation so images don't disappear.
                            // Map scroll range [600, 3000] to a limited rotation range.
                            // Range: [-spreadAngle/2, spreadAngle/2] keeps them roughly in view.
                            // We map 0 -> 1 (progress of scroll loop) to this range.

                            // Note: rotateValue comes from smoothScrollRotate which maps [600, 3000] -> [0, 360]
                            // We need to adjust that mapping in the hook above, OR adjust it here.
                            // Better to adjust it here relative to the spread.

                            // Let's interpret rotateValue (0 to 360) as a progress 0 to 1
                            const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);

                            // Calculate bounded rotation:
                            // Move from 0 (centered) to -spreadAngle (all the way left) or similar.
                            // Let's allow scrolling through the list.
                            // Total sweep needed to see all items if we start at one end?
                            // If we start centered, we can go +/- spreadAngle/2.

                            // User wants to "stop on the last image".
                            // Let's map scroll to: 0 -> -spreadAngle (shifts items left)
                            const maxRotation = spreadAngle * 0.8; // Don't go all the way, keep last item visible
                            const boundedRotation = -scrollProgress * maxRotation;

                            const currentArcAngle = startAngle + (i * step) + boundedRotation;
                            const arcRad = (currentArcAngle * Math.PI) / 180;

                            const arcPos = {
                                x: Math.cos(arcRad) * arcRadius + parallaxValue,
                                y: Math.sin(arcRad) * arcRadius + arcCenterY,
                                rotation: currentArcAngle + 90,
                                scale: isMobile ? 1.4 : 1.8, // Increased scale for active state
                            };

                            // C. Interpolate (Morph)
                            target = {
                                x: lerp(circlePos.x, arcPos.x, morphValue),
                                y: lerp(circlePos.y, arcPos.y, morphValue),
                                rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
                                scale: lerp(1, arcPos.scale, morphValue),
                                opacity: 1,
                            };
                        }

                        return (
                            <FlipCard
                                key={i}
                                src={src}
                                index={i}
                                total={TOTAL_IMAGES}
                                phase={introPhase} // Pass intro phase for initial animations
                                target={target}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );# 🚀 CLASSGRID NEXT.JS MARKETING: DEEP ARCHITECTURAL CODEX

This is the exact UI mapping based on our deep scan of Vercel, Turborepo, EduplusCampus, and vmedulife. Use these exact specifications when scaffolding `app/page.tsx`.

---

## 🏗️ 1. VERCEL.COM: THE HEADER & FOOTER ENGINE
Vercel is the gold standard for "Platform" marketing. 

### A. The Top Header
*   **Background:** Do not use solid colors. Use a blur filter: `bg-black/50 backdrop-blur-md` with `sticky top-0 z-50`.
*   **Logo:** Left-aligned. Simple white triangle abstract, `h-8 w-8`.
*   **Center Navigation (Radix/Shadcn):** 
    *   Items: `Solutions`, `Features`, `Developers`, `Pricing`.
    *   Hover effect: When hovering, a very subtle pill `bg-white/10 rounded-md` instantly appears behind the text.
*   **CTAs (Right side):**
    *   "Contact Sales" (Ghost button: `text-sm text-gray-400 hover:text-white`).
    *   "Sign Up" (Solid contrast: `bg-white text-black px-4 py-2 hover:bg-gray-200 rounded-md font-medium`).

### B. The Vercel Footer 
*   **Spacing:** Enormous negative space. Use `pt-32 pb-16`.
*   **Link Columns:** 5 columns. Headings (`Products`, `Resources`, `Company`, `Legal`) must be `text-white font-semibold text-sm mb-4`.
*   **Links:** `text-gray-500 hover:text-gray-300 text-sm transition-colors`.
*   **Theme Toggle & Status:** Bottom right corner. A sleek segmented control for (Sun / Moon / System). Bottom left corner: A pulsating green dot `bg-green-500 rounded-full animate-pulse` with text "All systems normal".

---

## ⚡ 2. TURBOREPO: THE HERO SECTION & ANIMATION
We are replacing standard boring university stock photos with a highly technical, futuristic Turborepo aesthetic to show Classgrid's immense data engine.

### A. The Hero Container
*   **Background Grid:** `bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]`.
*   **Headline:** `text-7xl font-extrabold tracking-tighter`. Apply a metallic gradient texture: `bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500/80`.
*   *(Example Line: "The Operating System for Modern Campuses.")*
*   **The Glowing Lines Animation:** Use Framer Motion to draw lines tracing across the background grid, using `strokeDashoffset` from `1000` to `0` infinitely to look like data moving through pipelines.

### B. The Funnel Breakout (Directly under Hero)
*   Instead of making the user scroll, present 4 glowing cards instantly:
    1. Schools (Automate K-12)
    2. Junior Colleges (11th & 12th Sync)
    3. Degree Colleges (Complex Semesters)
    4. Coaching Institutes (Batch Management)
*   **Hover Effect:** When a card is hovered, a radial gradient `from-blue-500/20` follows the user's mouse cursor across the card borders.

---

## 🏫 3. EDUPLUS CAMPUS: ENTERPRISE TRUST MARKERS
Eduplus uses traditional B2B trust factors. We will elevate them.

### A. Hero-Adjacent Smart Form (Lead Capture)
*   **Headline:** "Are you looking for smart solutions to automate your campus?"
*   **Execution:** We don't hide the contact form on another page. We put a sleek glassmorphic Shadcn Form card floating on the right side of the hero, or right below it.
*   **Necessary Fields:** 
    *   Full Name
    *   Institution Name
    *   Designation (Dropdown: Principal / Trustee / Admin)
    *   Phone Number
    *   *Button:* "Book a 15-Min Demo"

### B. Client Logo Marquee
*   Immediately following the Hero, a massive horizontal reel of University Logos.
*   **Style:** `filter grayscale opacity-50`. They turn to full color `hover:grayscale-0 hover:opacity-100 transition-all` when the mouse hovers over them.

---

## 🛠️ 4. VMEDULIFE: INTEGRATION ECOSYSTEM
The code you pulled from 21st.dev (`IntegrationHero`) is the exact answer to VMEdulife's integration section!

*   **Header:** "250+ top apps are available to integrate seamlessly with your workflow."
*   **The Scrolling Implementation:** We will embed the `IntegrationHero` component right here.
*   **The Data:** Swap the generic links in your `ICONS_ROW1` array with our exact tech partners to prove Classgrid's power:
    *   Zoom / Google Meet (Live Classes)
    *   AWS S3 (Document storage)
    *   Brevo / AWS SNS (Messaging)
    *   Razorpay (Fee Collection)
    *   Agora (WebRTC Live Streams)
    *   mongodb (Backend Infrastructure proof)

}

