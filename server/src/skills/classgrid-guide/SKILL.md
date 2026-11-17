---
name: classgrid-guide
description: Guide and sitemap for Classgrid AI (chat.classgrid.in and the Windows desktop app): Agent Mode, Project Mode, Studio Mode, the desktop app, settings and permissions, and everything the agent connects to (WhatsApp, email, schedules, plugins, GitHub, Vercel). Use it when the user asks how to use, set up or change anything in Classgrid AI, what Classgrid can do, how it compares with other AI tools, about plans, limits, usage or top-ups, or where to download the apps.
---

# Classgrid AI Guide & Sitemap

Classgrid AI is an AI agent that does real work for you, at chat.classgrid.in. Before answering a question about
how Classgrid works, read the page below that matches what the user is asking about:

## 1. Surfaces (offline pages)

-   **Agent Mode**: [references/agent-mode.md](references/agent-mode.md)
    -   The main chat: sidebar, chat box, model picker, files, images, web research, answer cards, Grids.
-   **Project Mode**: [references/project-mode.md](references/project-mode.md)
    -   The AI code editor: a VS Code editor in the browser with the Classgrid AI panel beside it. It is part of
        Studio, not a mode of its own: **Project** in Studio's left sidebar.
-   **Studio Mode**: [references/studio-mode.md](references/studio-mode.md)
    -   The agent workspace: chat on the left and a pane with Browser, Files, Terminal, Review, Project and
        Screenshots tabs, where you watch the agent work.
-   **Settings, models and permissions**: [references/settings.md](references/settings.md)
    -   Models, plans (Free, Pro, Max), limits and top-ups, Usage and Billing, skills and custom instructions, memory,
        privacy, incognito, and the permission modes.
-   **Connections**: [references/connections.md](references/connections.md)
    -   WhatsApp messages and calls, email to the agent, schedules and long tasks, plugins and connected apps,
        GitHub, Vercel and publishing websites.
-   **The desktop app (Windows)**: [references/desktop-app.md](references/desktop-app.md)
    -   What the agent can do on the user's own computer (files, videos, terminal, folder projects, built-in editor,
        local browser, helpers), and how Classgrid compares with Antigravity, Cursor and Claude Code.
-   **"/" commands**: [references/slash-commands.md](references/slash-commands.md)
    -   The "/" commands in the Project Mode and Studio chat box (/classgrid-guide, /studio-guide, /project-guide, /plan, /goal, /schedule, /browser,
        /generative_ui, /grill-me, /plugin, /teamwork, /boost, /learn, /compact): what each does and how to use it.

--------------------------------------------------------------------------------

## 2. When to read the live docs

These pages are quick references. When the user asks about something newer, something not covered here, or
wants step-by-step help, open the matching live page and answer from it:

-   **Docs home**: `https://classgrid.in/docs`
-   **Agent Mode**: `https://classgrid.in/docs/agent-mode`
-   **Project Mode**: `https://classgrid.in/docs/project-mode`
-   **Studio Mode**: `https://classgrid.in/docs/studio-mode`
-   **Studio permissions**: `https://classgrid.in/docs/studio-permissions`
-   **Models**: `https://classgrid.in/docs/choose-a-model`
-   **Plans and prices**: `https://classgrid.in/pricing` (for numbers, see section 3)
-   **Skills and custom instructions**: `https://classgrid.in/docs/skills-and-custom-instructions`
-   **WhatsApp**: `https://classgrid.in/docs/whatsapp-messages`
-   **Email the agent**: `https://classgrid.in/docs/email-the-agent`
-   **Schedules and reminders**: `https://classgrid.in/docs/schedules-and-reminders`
-   **Plugins**: `https://classgrid.in/docs/plugins`
-   **GitHub**: `https://classgrid.in/docs/connect-github`
-   **Privacy and data**: `https://classgrid.in/docs/privacy-and-data`
-   **Help Center**: `https://classgrid.in/help-center`
-   **Support**: `https://classgrid.in/support`

--------------------------------------------------------------------------------

## 3. Plans, prices, limits and usage: always live

-   Classgrid AI has three plans: **Free**, **Pro** and **Max**. Each has a session limit that refills every few hours
    and a weekly limit. Pro and Max have higher limits, Claude models (Free has none), more images and more storage.
    Top-ups (extra AI credits) are only for Pro and Max, are used after the plan's limit, and last 30 days. Students
    can apply for a student price on Pro and Max. More in [references/settings.md](references/settings.md) (section 5).
-   Prices, limits, image counts and storage sizes are set in Classgrid's dashboard and change. This guide has none
    of them on purpose. For any question about them, or about the user's own plan, usage, balance or when a limit
    refills, call **get_plans_and_usage** (load the **account_plan** tool group first if it is not loaded) and answer
    only from its result. Never answer these from memory, from an older answer or from a web page.
-   Where the user finds them: Settings → **Usage** (what they used and when it refills), Settings → **Billing**
    (plan, Upgrade, top-ups, student price, invoices) on chat.classgrid.in, and `https://classgrid.in/pricing`.

--------------------------------------------------------------------------------

## 4. Download the apps

-   **Desktop app**: `https://classgrid.in/download`. One install gives the Classgrid app and Classgrid Code (the
    code editor). Windows is out now; macOS and Linux show "Coming soon" there until a version for them is out. The
    page lists every version with what changed, and the app updates itself. `https://classgrid.in/download/windows`
    always gives the newest Windows installer. More in [references/desktop-app.md](references/desktop-app.md).
-   **Phone app (Android)**: it is not listed for download yet; there is no public download link. Never make one up.
    On a phone, the user can use chat.classgrid.in in the browser.
