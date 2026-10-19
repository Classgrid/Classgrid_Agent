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

# Classgrid UI Rules — FINAL & LOCKED

> Every developer, AI agent, and component MUST follow these rules.
> No exceptions. No "temporary" overrides.
> **Do NOT change colors unless explicitly instructed by the project owner.**

---

## 1. Theme Support

- **BOTH Light Mode and Dark Mode** must be supported across ALL dashboards
- Same design system everywhere — no separate styles per module
- Theme toggle available on every dashboard
- All components must render correctly in both themes

---

## 2. Accent Color

```
#34D399 — Emerald 400 (the ONLY accent)
```
- Used for: active states, primary buttons, links, badges, highlights
- Do NOT use `#10b981`, `#059669`, `#6ee7b7`, or any other green
- Do NOT use `text-emerald-*` or `bg-emerald-*` from Tailwind defaults
- ALWAYS use `text-primary` / `bg-primary` (maps to `#34D399`)
- Same emerald accent as the marketing site

---

## 3. Dark Mode (neutral gray, zero blue)

| Surface     | Hex       | CSS Variable           |
|-------------|-----------|------------------------|
| Background  | `#212121` | `--background`         |
| Sidebar     | `#171717` | `--sidebar-background` |
| Cards       | `#2A2A2A` | `--card`               |
| Borders     | `#2F2F2F` | `--border`             |
| Text        | `#ECECEC` | `--foreground`         |
| Text Muted  | `#8E8E8E` | `--muted-foreground`   |

## 4. Light Mode (clean neutral)

| Surface     | Hex       | CSS Variable           |
|-------------|-----------|------------------------|
| Background  | `#FFFFFF` | `--background`         |
| Sidebar     | `#F7F7F8` | `--sidebar-background` |
| Cards       | `#FFFFFF` | `--card`               |
| Borders     | `#EAEAEA` | `--border`             |
| Text        | `#171717` | `--foreground`         |
| Text Muted  | `#737373` | `--muted-foreground`   |

---

## 5. Strict Rules

These are BANNED from the codebase:
- ❌ Tailwind default colors (`emerald-500`, `blue-*`, `purple-*`, etc.)
- ❌ Multiple shades of green (only `#34D399`)
- ❌ Random hex values not in the tables above
- ❌ Hardcoded hex in TSX/JSX — always use CSS variables via Tailwind tokens
- ❌ Any color not defined in `global.css` variables

---

## 6. Typography

| Usage    | Font     | Tailwind Class   |
|----------|----------|------------------|
| Headings | Sora     | `font-heading`   |
| Body     | DM Sans  | `font-body`      |

---

## 7. Radius

All components use `--radius: 0.375rem` (6px). Sharp, not rounded.
No `rounded-full` on cards or panels.

---

## 8. Component Rules

- Use Tailwind tokens only: `bg-card`, `text-primary`, `border-border`, etc.
- Hover states on cards: `hover:border-primary`
- Active sidebar items: via `cg-sidebar__item--active` class
- Badges: border and text in primary, no background fill

---

## 9. Design Philosophy

> Clean, minimal, premium SaaS UI — Linear / Vercel / ChatGPT-style soft theme

- No gradients
- No shadows (except subtle `shadow-sm` on dropdowns)
- No glassmorphism / blur
- No rounded-full on containers
- Same layout, spacing, and components across ALL dashboards

---

## 🔒 SYSTEM LOCKED

This design system is finalized. All hex values, CSS variables, and rules
above are the single source of truth. Do not modify without explicit
instruction from the project owner.
