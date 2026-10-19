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

# 🚨 PLATFORM MIGRATION RULES 🚨

**RULE 1: Never touch the `classgrid/` folder**
The `client/src/components/classgrid/` folder contains only DUMMIES. Their only purpose is to act as a shield to prevent Vercel from crashing while migrating. DO NOT edit or add files here.

**RULE 2: The "Cg" Prefix is BANNED**
Old components used names like `CgSwitch`. DO NOT use the `Cg` prefix for new components (it causes collisions and build breaks). Use clean names like `Switch`, `Toggle`, `Button`.

**RULE 3: All New Components Go in `marketing_ui/`**
Every single new UI component must be saved inside: `client/src/components/marketing_ui/`.

**RULE 4: How to Migrate a Page**
1. DELETE the old import: `- import { CgSwitch } from "@/components/classgrid";`
2. ADD the new import: `+ import { Switch } from "@/components/marketing_ui/switch";`
3. REPLACE the JSX: Change `<CgSwitch>` to `<Switch>`.

