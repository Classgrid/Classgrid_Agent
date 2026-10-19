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

# 🚀 CLASSGRID MARKETING SITE — BUILD PROMPT

---

> ⚠️ **CRITICAL FILE LOCATION:** The three Classgrid reference files are located in the **main platform repo**. Their full paths are:
> - `c:\Users\nikhi\OneDrive\Documents\Classgrid\classgrid_platform\docs\CLASSGRID_PAGES_REFERENCE.md` (54KB, 888 lines)
> - `c:\Users\nikhi\OneDrive\Documents\Classgrid\classgrid_platform\docs\CLASSGRID_PAGES_DEEP_DIVE.md` (50KB, 758 lines)
> - `c:\Users\nikhi\OneDrive\Documents\Classgrid\classgrid_platform\docs\CLASSGRID_DESIGN_SYSTEM.md` (5KB, 100 lines)
>
> If you cannot access them from this workspace, copy them into this project's `docs/` folder first:
> ```powershell
> mkdir docs
> copy "c:\Users\nikhi\OneDrive\Documents\Classgrid\classgrid_platform\docs\CLASSGRID_PAGES_REFERENCE.md" docs\
> copy "c:\Users\nikhi\OneDrive\Documents\Classgrid\classgrid_platform\docs\CLASSGRID_PAGES_DEEP_DIVE.md" docs\
> copy "c:\Users\nikhi\OneDrive\Documents\Classgrid\classgrid_platform\docs\CLASSGRID_DESIGN_SYSTEM.md" docs\
> ```

You are building the **Classgrid Marketing & Acquisition Website** (`classgrid.in`).

## Step 1: Read These Three Files FIRST (Mandatory)

Before writing ANY code, you MUST read these three files in full. They are your Single Source of Truth:

1. **`docs/CLASSGRID_PAGES_REFERENCE.md`** (888 lines) — The technical architecture bible. Contains:
   - 4-pillar architecture (Backend, Dashboard, Android, Marketing)
   - All 67 backend route files, 59 database models, 34 services
   - 5-tier role system (SuperAdmin, OrgAdmin, Faculty, Student, Parent)
   - 13 academic hierarchy structure types
   - All 41 platform modules with route/model/function mapping
   - Full Privacy Policy, Terms of Service, Security Trust Center, Cookie Policy
   - Demo & Checkout API bridge specifications

2. **`docs/CLASSGRID_PAGES_DEEP_DIVE.md`** (758 lines) — The content bible. Contains:
   - 500+ word deep-dive for every major module (why it exists, how it works, what to showcase)
   - Full marketing copy for all 20 pages (headlines, sub-headlines, CTAs, section breakdowns)
   - Exact form fields for the Demo page
   - Pricing table with feature matrix
   - Testimonial copy and case study structure

3. **`docs/CLASSGRID_DESIGN_SYSTEM.md`** (100 lines) — The design system bible. Contains:
   - Morphing navigation dropdown mechanics
   - Hero section patterns (Industrial Minimalism)
   - Demo/Lead conversion page blueprint (50/50 split)
   - Information-dense footer structure (6-column grid)
   - Color palette, animation tokens, and glassmorphism specs
   - Specific application patterns for Classgrid pages

## Step 2: Initialize the Project

```bash
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Then install:
```bash
npm install framer-motion @splinetool/react-spline lucide-react react-hook-form zod @hookform/resolvers
npx shadcn@latest init
```

## Step 3: Build the 20 Pages

Build these pages in this exact order using the App Router (`src/app/`):

| Priority | Route | Page |
|----------|-------|------|
| 1 | `/` | Home (Hero + Social Proof + Module Grid) |
| 2 | `/features` | Features (Tabbed Bento Grid of all 41 modules) |
| 3 | `/pricing` | Pricing (3-tier comparison cards) |
| 4 | `/demo` | Demo Request (Form → POST to api.classgrid.in) |
| 5 | `/about` | About Us (Story + Team + Values) |
| 6 | `/tour` | Product Tour (Interactive stepper) |
| 7 | `/use-cases/students` | Student Use Case |
| 8 | `/use-cases/teachers` | Teacher Use Case |
| 9 | `/use-cases/institutes` | Institute Use Case |
| 10 | `/integrations` | Integrations Grid |
| 11 | `/reviews` | Testimonials |
| 12 | `/case-studies` | Case Studies |
| 13 | `/faq` | FAQ Accordion |
| 14 | `/contact` | Contact Forms |
| 15 | `/support` | Help Center |
| 16 | `/blog` | Blog (Sanity CMS placeholder) |
| 17 | `/compare` | Competitor Comparison |
| 18 | `/changelog` | Release Notes |
| 19 | `/campaigns` | Ad Landing Pages |
| 20 | `/terms` `/privacy` `/security` | Legal Pages |

## Step 4: Classgrid Design Rules (The UX Architecture)

> **CRITICAL:** You must follow these exact structural guidelines derived from Vercel, Turborepo, and VMEdulife.

### 1. THE VERCEL HEADER & FOOTER ENGINE
*   **Header:** `bg-black/50 backdrop-blur-md` with `sticky top-0 z-50`. Left-aligned logo. Radix/Shadcn dropdown menus for navigation. Right side has "Contact Sales" (Ghost button) and "Sign Up" (Solid white button).
*   **Footer:** Enormous negative space (`pt-32 pb-16`). 5 columns of links. Include a Theme Toggle (Sun/Moon/System) in the bottom right, and a pulsating green "All systems normal" dot in the bottom left.

### 2. THE TURBOREPO HERO SECTION
*   **Background Grid:** `bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]`.
*   **Headline:** `text-7xl font-extrabold tracking-tighter`. Apply metallic gradient texture: `bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500`.
*   **Glowing Lines Animation:** Use Framer Motion to draw lines tracing across the background grid (`strokeDashoffset` from 1000 to 0).
*   **The 4-Card Breakout:** Directly below the hero CTA, place 4 glowing cards for: Schools, Junior Colleges, Degree Colleges, and Coaching Institutes. Hovering reveals a radial gradient that follows the mouse cursor.

### 3. EDUPLUS CAMPUS: ENTERPRISE TRUST MARKERS
*   **Smart Form (Lead Capture):** A sleek glassmorphic Shadcn Form card floating near the Hero. Fields: Name, Institution, Designation (Principal/Trustee/Admin), Phone. Button: "Book a 15-Min Demo".
*   **Client Logo Marquee:** Immediately following the Hero, a massive horizontal reel of grayscale University Logos that turn full color on hover.

### 4. VMEDULIFE: INTEGRATION ECOSYSTEM
*   **Implementation:** Embed an infinite scrolling `IntegrationHero` component powered by Framer Motion / CSS Keyframes.
*   **Data Layout:** Show explicit integration icons for Zoom, Google Meet, AWS S3, Brevo, Razorpay, Agora, and Redis. This proves backend infrastructure superiority.

### 5. GLOBAL TOKENS
1. **Dark theme by default.** Pure black `#000000` background with `#0A0A0A` surface cards.
2. **Industrial Minimalism.** Clean, technical, premium feel. NOT playful, NOT colorful.
3. **Typography:** Headings = `Geist Sans` or `Inter`, Body = `Geist Sans` or `DM Sans`.
4. **Animations:** Scroll reveals (`fade-in` + `slide-up`), micro-hover interactions, zero looping 3D elements (except where explicitly requested).

## Step 5: API Integration

The Demo form on `/demo` submits to the live backend:
```
POST https://api.classgrid.in/api/public/request-demo
Body: { institutionName, orgType, adminName, adminEmail, adminPhone, state, city }
```

The Pricing checkout redirects to Razorpay:
```
POST https://api.classgrid.in/api/public/checkout
Body: { plan, orgId, billingCycle }
```

## Step 6: Content Rules

- Use the EXACT marketing copy from `CLASSGRID_PAGES_DEEP_DIVE.md`
- Use the EXACT legal text from `CLASSGRID_PAGES_REFERENCE.md` Chapter 8
- Do NOT hallucinate features. Only mention the 41 modules documented in the reference.
- Do NOT use placeholder text like "Lorem ipsum" or "[Your Company]"
- Every feature claim must be backed by a real module from the reference

## Step 7: File Structure

```
src/
├── app/
│   ├── layout.tsx          (Root layout with Geist font + metadata)
│   ├── page.tsx            (Home)
│   ├── about/page.tsx
│   ├── features/page.tsx
│   ├── pricing/page.tsx
│   ├── demo/page.tsx
│   ├── tour/page.tsx
│   ├── use-cases/
│   │   ├── students/page.tsx
│   │   ├── teachers/page.tsx
│   │   └── institutes/page.tsx
│   ├── integrations/page.tsx
│   ├── reviews/page.tsx
│   ├── case-studies/page.tsx
│   ├── blog/page.tsx
│   ├── faq/page.tsx
│   ├── contact/page.tsx
│   ├── support/page.tsx
│   ├── compare/page.tsx
│   ├── changelog/page.tsx
│   ├── campaigns/page.tsx
│   ├── terms/page.tsx
│   ├── privacy/page.tsx
│   └── security/page.tsx
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx       (Glassmorphism header with morphing dropdown)
│   │   └── Footer.tsx       (6-column information matrix + status indicator)
│   ├── sections/            (Reusable page sections)
│   └── ui/                  (Shadcn primitives)
├── lib/
│   └── utils.ts
└── styles/
    └── globals.css
```

## IMPORTANT REMINDERS
- This site has NO database. It is a static marketing site that POSTs to the existing backend.
- The "Login" button in the navbar links to `https://app.classgrid.in/login` (Project 1, the SaaS app).
- The "Get Started" button links to `/demo` (the demo request form on this site).
- All module descriptions, page copy, legal text, and pricing details are in the Classgrid reference files. READ THEM.
- Follow the **CLASSGRID_DESIGN_SYSTEM.md** document for ALL visual and interaction design decisions.

**Now begin. Start with the Home page (`/`).**
