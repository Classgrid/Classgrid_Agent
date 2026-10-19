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

# Classgrid Design System & AI Guidelines

## Core Aesthetic: The "Vercel" 2-Tone Theme
When building new components, cards, or pages for this project, the AI MUST strictly follow this exact 2-color styling formula for maximum contrast and premium aesthetics:

### 1. Outer Wrappers & Headers (Pure Black)
- **Color**: Pure Black (`#000000`)
- **Tailwind Class**: `bg-black`
- **Usage**: Main wrappers, outer cards, dialog backgrounds, sidebars, and top-level container backgrounds.

### 2. Inner Content & Bodies (Deep Grey)
- **Color**: Deep Grey (`#0f0f0f`) or (`#0a0a0a`)
- **Tailwind Class**: `bg-[#0f0f0f]` or `bg-background`
- **Usage**: The main content areas, inner nested cards, input fields inside black wrappers, and card footers/bodies.

### 3. Borders & Separators
- **Color**: Subtle White (10% opacity)
- **Tailwind Class**: `border-white/10`
- **Usage**: Always use this to separate the pure black and deep grey sections. Never use default grey borders.

## Example Component Structure
```tsx
<div className="w-full bg-black border border-white/10 rounded-xl overflow-hidden shadow-sm">
    {/* Header (Black) */}
    <div className="p-6 border-b border-white/10">
        <h3 className="text-white">Outer Header</h3>
    </div>

    {/* Body (Grey) */}
    <div className="p-6 bg-[#0f0f0f]">
        <p className="text-zinc-400">Inner content goes here.</p>
        
        {/* Nested Input (Black) */}
        <input className="bg-black border border-white/10 text-white rounded-md px-3 py-2" />
    </div>
</div>
```

**Rule for AI Agents:** NEVER use `#0f0f0f` for both the wrapper and the inner content, as this creates a flat, borderless "black hole" effect with zero contrast. Always contrast `bg-black` against `bg-[#0f0f0f]`.

## 4. No "Table Inside Table" (Card inside Card)
- **Rule**: NEVER wrap a `DataTable` or `Table` component inside another `Card` or outer `bg-card border` div if the table itself already renders a border and rounded corners.
- **Visual Goal**: We want a clean Vercel-like design. Avoid redundant nesting (i.e. double borders). 
- **Action Bars / Toolbars**: When building an action bar (Search input, Select filters, Live buttons, etc.) that sits above a table, keep the Action Bar completely detached and separate from the table. **DO NOT** enclose both the Action Bar and the Table inside a single outer wrapper card. The Action Bar should float above, and the Table should sit below it with its own single border.
