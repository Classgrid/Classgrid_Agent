# Settings, Models and Permissions

Where a user changes how Classgrid AI looks, talks, thinks, which plan it is on, and when it asks before acting.

## 1. Where settings live

-   **AI Hub**: the sliders icon in the message box (tooltip **AI Hub**). Tabs: **Plugins**, **Images**, **Skills** and
    **Connected apps**. Usage, plans and top-ups are not in the AI Hub: they are in Settings (section 5).
-   **Account menu**: click your name or photo at the bottom of the sidebar. It has **Profile**, **Settings**,
    **Theme** (system, light, dark), **Home Page**, **Changelog**, **Support** and **Log Out**.
-   **Settings page** (account menu → **Settings**): a list of sections on the left: **General**, **Privacy**,
    **Account**, **Browser**, **Mastero**, **Usage** and **Billing** (the desktop app also has **Notifications**). On a
    phone the sections are a row of buttons at the top. The account cards are in section 2.
-   **Notifications**: the bell next to your name at the bottom of the sidebar.
-   **Model picker** and **permission shield**: inside the message box (sections 4 and 6).

## 2. Account settings (Settings page)

-   **Appearance**: **Dark Mode** switch and **Show Role in Sidebar**. The quick **Theme** switch in the account
    menu does the same job for light, dark or system.
-   **Privacy**: choose what others see on your profile: **Show Email**, **Show Hobbies**, **Show Bio**.
-   **Verify your domain**: prove you own one domain by adding a TXT record at your DNS provider, then press
    **Verify**.
-   **User ID** and **Organization ID**: read-only IDs to quote when contacting support.
-   **Change Password**: current password, then the new one twice.
-   **Delete Account**: permanent and cannot be undone. It asks you to confirm and type your password.
-   **Profile** (account menu → **Profile**): your photo, banner, bio and hobbies.

## 3. Notifications

-   Bell → **Inbox** (unread) and **Archive** (read). Clicking a chat alert opens that chat.
-   Bell → gear icon → **Notification Preferences**: **All Notifications** (master switch) and **Grid messages**
    (new messages in DMs and groups).

## 4. Models

-   The model picker starts on **Auto**: "Picks the best model for each message". Auto can pick a different model
    for each message.
-   Groups in the picker: **Claude** (Haiku, Sonnet, Opus, Fable), **DeepSeek**, and **More models** (GPT-OSS,
    Kimi, GLM, Qwen, Gemma, Nemotron, Llama, Mistral). New models show a **New** badge for a short time.
-   You can switch model for any message, even mid-chat. The new model sees the whole chat.
-   Your pick is remembered in this browser until you change it.
-   The model changes how the agent thinks and writes, not which tools it can use.
-   Your plan decides which models you can pick. Claude models come with **Pro** and **Max**; **Free** has none.
    **Claude Fable** (Fable 5.2 and Fable 5.1, the most capable models) can use a share of the plan's weekly Claude
    limit. A model your plan does not include has a padlock and a tag with the plans that include it; clicking it
    shows how to upgrade.
-   Classgrid can turn a model off. Turned-off models disappear from the picker; if one was your pick, the picker goes
    back to **Auto**.
-   WhatsApp calls are answered by a voice setup Classgrid chooses, not by the picker.

## 5. Plans, limits and top-ups

-   There are three plans: **Free**, **Pro** and **Max**. Every account starts on Free, which costs nothing.
-   Each plan has a **session limit** that refills every few hours (counted from your first message) and a
    **weekly limit**. Some things also have their own limit: Claude models, images, WhatsApp messages, WhatsApp
    calls, voice and Library storage.
-   Chatting, making images, WhatsApp calls, tasks after a call or email, and work in connected apps all count
    toward your limits. Incognito chats count too.
-   Stronger models, longer chats and bigger jobs use more. Each model is charged by its real cost, so a premium
    model can use many times more per message than a fast one.
-   **Pro** and **Max** have higher limits, Claude models (Free has none), more images and more storage.
-   **Students** can apply for a student price on Pro and Max: Settings → **Billing** → **Apply for student prices**.
-   **Top-ups** (extra AI credits) are only for Pro and Max. They are used after your plan's limit is reached, and
    they last 30 days from the day you buy them. Settings → **Billing** → **Buy credits**, or **Auto top-up** to add
    credits when your balance is low.
-   **Usage**: Settings → **Usage** shows each limit, how much of it you have used and when it refills, and your
    usage history.
-   **Billing**: Settings → **Billing** shows your current plan with **Upgrade**, your credit balance, top-ups and
    invoices. Payments go through classgrid.in/pricing.
-   When you reach a limit: wait until it refills (the app shows when), or upgrade your plan; on Pro and Max you
    can also buy extra credits. A WhatsApp call tells you that you have used your plan's limit. A long task
    pauses, sends you a WhatsApp message, and carries on by itself when the limit refills.
-   Each person has their own plan and limits.
-   Prices and limits are on classgrid.in/pricing. They are set in Classgrid's dashboard and change, so this guide
    has no numbers. **For Classgrid AI**: never quote a price, limit, image count or storage size from memory or
    from this guide. Call get_plans_and_usage (load the account_plan tool group first if it is not loaded) and
    answer only from its result. For the user's own usage it gives the same numbers as Settings → Usage.

## 6. Skills, custom instructions and memory

-   AI Hub → **Skills** (**AI Skills & Personalization**). Changes save on their own and apply to every chat and
    every model.
-   **Behavior Defaults**: **Base Tone**, **Verbosity**, **Format Preference**, **Emoji Usage**,
    **Explanation Level**.
-   **Custom Instructions**: **Nickname**, **Occupation**, **What would you like Classgrid AI to know about you?**,
    **How would you like Classgrid AI to respond?** No passwords or secrets here.
-   **Default AI Skills**: on/off switches for ready-made habits, for example **Auto-Meet Links** or
    **Auto-Calendar Reminders**.
-   **Add Custom Skill**: a name plus instructions for one kind of job, then **Save Skill**. Edit or delete it later
    under **Your Custom Skills**.
-   In chat, starting with "remember…" or "from now on…" makes the agent save a skill; a skill card confirms it.
-   **Memory**: each chat keeps a short memory of key facts and progress, updated automatically as the chat grows.
    There is no memory screen. To keep something for every chat, save it as a skill or in Custom Instructions.

## 7. Apps and connections

-   AI Hub → **Plugins**: connect apps such as Gmail or Google Drive so the agent can work in them as you. Tap a
    connected app → **Disconnect** to remove access.
-   AI Hub → **Connected apps**: outside apps (like Claude, Cursor or ChatGPT) you allowed to use your Classgrid
    account, with connected and last-active dates. **Remove** cuts off access straight away.

## 8. Privacy, data and Incognito

-   **Delete a chat**: chat menu in the sidebar → **Delete** → **Delete chat**. A chat shared with you shows
    **Leave chat** instead.
-   **Incognito chat**: the ghost button on a new chat. It shows "You're incognito", is not saved to history or
    search, lives only in this browser, and is deleted (also on Classgrid's side) when closed. No undo, no
    Share Grid.
-   **Share links** make a public, read-only page anyone with the link can read. **Share Grid** is invite-only.
-   **Project Mode** code stays on GitHub; deleting a project in Classgrid does not delete the code.
-   Files you upload and files the AI makes are kept in your **Library**.

## 9. Permissions in Studio and Project Mode

-   The shield in the message box (left of the model picker, once a chat has started) sets the mode. Hover shows
    "Permissions: [mode]". **Default** is used until you change it; your choice is remembered in this browser.
-   **Request Review**: "Every command asks you first" (also code runs, clicks and key presses).
-   **Default**: "Asks before sensitive actions": installs, moving files, git commits, curl/ssh, deleting, pushing,
    creating or changing a GitHub repository, opening websites and typing into pages.
-   **Auto**: "Asks only before destructive actions": deleting (rm), sudo, hard resets, force cleans, dropping
    tables, npm publish, and pushing to GitHub.
-   **Turbo**: "Runs everything without asking". The agent still never types passwords or pays.
-   File edits never ask in any mode; check them in the **Review** tab. Helpers follow the same mode.
-   **Permission card** answers: **1. Yes, allow this time**; **2. Yes, and always allow [this] in this chat**;
    **3. Yes, and always allow [this]** (every chat and project); **4. No** with an optional note telling the agent
    what to do instead; **Skip** (don't run it, carry on without it).
-   Keys: 1–4 pick, Enter sends, Esc skips. No answer in 30 minutes means it does not run.
-   "Always" covers one kind of thing: the exact same command, one website, all typing, all clicks, one code
    language, all pushes. There is no button to clear "always" choices yet; ask Support to remove one.

## 10. Group permissions (Grids)

-   Group settings: **Who can send messages?**, **Who can edit group info?**, **Who can add members?**,
    **Who can send attachments (Images, PDFs, etc)?**, each **Members & Admins** or **Only Admins**.
-   Privacy: **Private (Hidden, Invite Only)**, **Approval Required (Visible, Request to Join)**,
    **Public / Open (Visible, Instant Join)**.

## 11. FAQ

-   **Why is a Claude model greyed out with a lock?** Your plan does not include it. Claude models come with Pro
    and Max; the tag next to the model shows which plans include it. Upgrade, or pick another model.
-   **How do I make the AI always reply in simple English?** AI Hub → **Skills** → **How would you like Classgrid AI
    to respond?**, or say "from now on, use simple English" in chat.
-   **Which permission mode should I use?** **Default** for most people; **Turbo** only for jobs you are happy to
    let run alone.
-   **Do bought credits roll over?** No. Top-up credits last 30 days from purchase.
-   **Can I top up on the Free plan?** No. Top-ups are for Pro and Max. On Free, wait for your limit to refill or
    upgrade.
-   **Where do I see what I have used?** Settings → **Usage**. Your plan, top-ups and invoices are in Settings →
    **Billing**.
-   **How do I stop an app reaching my account?** **Plugins** → **Disconnect** for apps the agent uses;
    **Connected apps** → **Remove** for outside AI apps.
