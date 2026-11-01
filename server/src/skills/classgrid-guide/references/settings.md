# Settings, Models and Permissions

Where a user changes how Classgrid AI looks, talks, thinks, spends credits and asks before acting.

## 1. Where settings live

-   **AI Hub**: the sliders icon in the message box (tooltip **AI Hub**). Tabs: **Plugins**, **Images**, **Skills**,
    **Connected apps**, **Usage**, **AI Credits**, **Upgrade**.
-   **Account menu**: click your name or photo at the bottom of the sidebar. It has **Profile**, **Settings**,
    **Theme** (system, light, dark), **Home Page**, **Changelog**, **Support** and **Log Out**.
-   **Settings page** (account menu → **Settings**): the account cards in section 2.
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
-   **Claude Fable 5.1** (the most capable model) is locked with a padlock until your total top-ups reach a set
    amount; the picker shows how much more is needed, and clicking it opens **Upgrade**. Once unlocked it stays
    unlocked. Fable runs on bought credits only; free tokens work with every other model.
-   Classgrid can turn a model off. Turned-off models disappear from the picker; if one was your pick, the picker goes
    back to **Auto**.
-   WhatsApp calls are answered by a voice setup Classgrid chooses, not by the picker.

## 5. Credits and top-ups

-   Classgrid AI is free to start. Every account gets free tokens that refresh on a regular cycle; the app shows
    the refresh date.
-   Chatting, making images, WhatsApp calls, tasks after a call or email, and work in connected apps all use
    credits. Incognito chats use credits too.
-   Stronger models, longer chats and bigger jobs use more. Each model is charged by its real cost, so a premium
    model can use many times more per message than a fast one.
-   **Top up**: AI Hub → **Upgrade** (or **AI Credits**), choose an amount, check **You will receive**, and pay.
-   Bought credits last 30 days from the day you buy them.
-   **AI Credits** shows **Credits remaining**, **Expiration date** and **Billing History**. **Usage** shows how much
    you have used.
-   When credits run out: in chat, top up or wait for the free refresh; a WhatsApp call says you're out of credits;
    a long task pauses and you get a WhatsApp message, and it can carry on after a top-up.
-   Each person has their own credits. There is no shared team plan.
-   Never quote prices, limits or free amounts from memory: they change. Point the user to the AI Hub.

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

-   **Why is Claude Fable greyed out with a lock?** It unlocks after enough total top-ups, and then needs bought
    credits. Hover or open the picker to see what is left, or pick another model.
-   **How do I make the AI always reply in simple English?** AI Hub → **Skills** → **How would you like Classgrid AI
    to respond?**, or say "from now on, use simple English" in chat.
-   **Which permission mode should I use?** **Default** for most people; **Turbo** only for jobs you are happy to
    let run alone.
-   **Do bought credits roll over?** No. They last 30 days from purchase.
-   **How do I stop an app reaching my account?** **Plugins** → **Disconnect** for apps the agent uses;
    **Connected apps** → **Remove** for outside AI apps.
