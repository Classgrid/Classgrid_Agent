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

# How to Build Nested Sidebar Pages (Vercel Style)

This document explains the architecture we created for the Storage section so that you (or any AI) can easily replicate this "Vercel-style" nested sidebar for future sections like **Settings**, **Organizations**, or **Users**.

## The Goal
To have a single "Back" button in the sidebar (e.g., `< Storage`), and underneath it, a list of tabs (Files, Analytics, S3 Config). Clicking these tabs should change the page content seamlessly *without* reloading the sidebar or losing the sliding animation.

---

## The Architecture (3 Steps)

### 1. The Reusable Component: `<SlidingSidebar />`
We built a highly reusable core component located at `client/src/components/layout/SlidingSidebar.tsx`. 
This component handles 100% of the CSS transforms, the sliding animations, the "Back" button UI, and the memory of your scroll position. You NEVER have to write CSS animations for the sidebar again.

### 2. The Global Sidebar: `<AppSidebar />`
Located at `client/src/components/layout/AppSidebar.tsx`.
This is where we decide *which* nested menu to show based on the URL. 
If the URL is `/superadmin/storage`, we tell the `<SlidingSidebar />` to slide over and reveal the Storage links.

### 3. The Layout Wrapper: `<StorageLayout />`
Located at `client/src/components/layout/StorageLayout.tsx`.
This is a standard React Router layout. It simply renders the global `<DashboardLayout />` and an `<Outlet />`. 
When you click "Files", "Analytics", or "S3 Config" in the sidebar, React Router swaps out the page inside the `<Outlet />` while the layout and sidebar stay completely still.

---

## How to Create a NEW Nested Section (e.g., Settings)

If you want to build a new nested section (like Settings) with 3 separate pages under one "Back" button, follow these exact steps:

1. **Create the Pages:** Create your 3 separate page files (e.g., `SettingsGeneralPage.tsx`, `SettingsBillingPage.tsx`, `SettingsTeamPage.tsx`).
2. **Create a Layout:** Create a `SettingsLayout.tsx` that looks exactly like `StorageLayout.tsx` (it just renders `<DashboardLayout />` and `<Outlet />`).
3. **Update React Router:** In your router config, make `/superadmin/settings` use the `SettingsLayout`, and add your 3 pages as children routes.
4. **Update AppSidebar.tsx:** 
   - Add a new `showSettingsMenu` state.
   - Use the `<SlidingSidebar />` component to wrap both the main menu and your new Settings menu.

---

## 🤖 Prompt to Give to AI in the Future

If you want an AI to build a new section for you in the future, just copy and paste this exact message to them:

> "I want to build a new nested section in my sidebar (similar to how we built the Storage section). We have a highly reusable custom component located at `src/components/layout/SlidingSidebar.tsx`. 
> 
> Please use this `<SlidingSidebar />` component inside `AppSidebar.tsx` to handle the new nested menu. It takes the following props:
> - `showNested`: A boolean state to trigger the slide (e.g., based on the current URL route).
> - `onBack`: A function to handle the back button click and slide back to the main menu.
> - `nestedTitle`: The title text for the back button (e.g., 'Settings').
> - `mainMenu`: The JSX containing the main global navigation list.
> - `nestedMenu`: The JSX containing the navigation list for this specific nested section.
> - `activeItemId`: The ID of the item in the main menu that should automatically be smoothly scrolled into view when sliding back.
>
> Finally, create a layout wrapper (like `StorageLayout.tsx`) with an `<Outlet />` so we can render multiple separate pages under this single nested sidebar menu without reloading the page."
