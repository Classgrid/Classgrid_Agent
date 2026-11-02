# "/" Commands

"/" commands are short words you type at the start of a message to tell Classgrid AI what kind of job it is. For
example, `/plan` means "plan first, then build", and `/compact` means "shrink this chat's memory now".

They work in **Project Mode** and **Studio Mode**. Agent Mode does not have them.

--------------------------------------------------------------------------------

## 1. How to use them

1.  Click the chat box and type `/` as the **first character** of your message.
2.  A list opens with every command. Keep typing to filter it (for example `/pl` shows `/plan`).
3.  Pick one:
    -   **Mouse:** click it.
    -   **Keyboard:** move with the **Up** and **Down** arrows, then press **Enter** or **Tab**.
    -   **Esc** closes the list.
4.  The command goes in at the start of the box (for example `/plan `). Type the rest of your message after it and
    send it as normal.

You can also type the whole command yourself without the list, for example `/goal deploy the site and check it`.

**Good to know**

-   A command only counts at the **very start** of a message. A "/" in the middle of your text (like a file path
    `src/app.tsx`) is just text.
-   Use **one command per message**.
-   The command applies to **that one message only**. The next message is normal again, unless you start it with a
    command too.
-   The "@" list (add files, create image, plugins and so on) still works the same. "/" is a separate list.
-   Your message shows in the chat exactly as you typed it, command included.

--------------------------------------------------------------------------------

## 2. All commands

| Command            | What it does                                     | Where             |
| ------------------ | ------------------------------------------------ | ----------------- |
| `/classgrid-guide` | Answers from the Classgrid AI guide              | Project, Studio   |
| `/studio-guide`    | Answers from the Studio Mode guide               | Project, Studio   |
| `/project-guide`   | Answers from the Project Mode guide              | Project, Studio   |
| `/plan`          | Plans first, builds only after you approve       | Project, Studio   |
| `/goal`          | Keeps working until the job is fully done        | Project, Studio   |
| `/schedule`      | Makes a schedule or reminder                     | Project, Studio   |
| `/browser`       | Uses the live browser                            | Studio only       |
| `/generative_ui` | Answers with interactive cards                   | Project, Studio   |
| `/grill-me`      | Asks you questions before starting               | Project, Studio   |
| `/review`        | Reviews the code changes and fixes the problems  | Project, Studio   |
| `/plugin`        | Opens the Plugins page (nothing is sent)         | Project, Studio   |
| `/teamwork`      | Splits the job across helpers working at once    | Project, Studio   |
| `/boost`         | Thinks harder for this message                   | Project, Studio   |
| `/learn`         | Saves what you say as a skill for future chats   | Project, Studio   |
| `/compact`       | Shrinks the chat's memory now                    | Project, Studio   |

--------------------------------------------------------------------------------

## 3. Each command in detail

### `/classgrid-guide`: answer from the Classgrid AI guide

-   **What happens:** the agent reads Classgrid AI's own guide (the files in `.classgrid/classgrid_guide/` in the
    Files tab: `SKILL.md` first, then the page that matches your question) and answers from it. You see each file it
    reads as "Analyzed ...md" in the chat, and you can click it to open it in Files.
-   **Use it when:** you want to know how to use, set up or change something in Classgrid AI.
-   **Example:** `/classgrid-guide how do permissions work in Studio?`
-   The guide files are Classgrid's, not your project's: they are never pushed to GitHub.

### `/studio-guide`: answer from the Studio Mode guide

-   **What happens:** the agent reads the Studio Mode page of the guide
    (`.classgrid/classgrid_guide/references/studio-mode.md`) and answers from it. You see "Analyzed studio-mode.md"
    in the chat.
-   **Use it when:** your question is about Studio: the pane and its tabs, the live browser, helpers, permissions.
-   **Example:** `/studio-guide how do I push my changes?`

### `/project-guide`: answer from the Project Mode guide

-   **What happens:** the agent reads the Project Mode page of the guide
    (`.classgrid/classgrid_guide/references/project-mode.md`) and answers from it. You see "Analyzed
    project-mode.md" in the chat.
-   **Use it when:** your question is about Project Mode: the code editor, GitHub, pull requests, Vercel.
-   **Example:** `/project-guide how do I connect GitHub?`

### `/plan`: plan first, then build

-   **What happens:** if something important is unclear, the agent first asks you with a **questions card** (you
    click the answers). Then it shows a **plan card** with the steps. It does not change any file until you
    approve the plan.
-   **Use it when:** the job is big or risky, and you want to see the steps before anything changes.
-   **Example:** `/plan add a login page with Google sign-in`

### `/goal`: keep going until it is done

-   **What happens:** the agent treats your message as a goal, not a single reply. It keeps working until the goal
    is reached. When it has to wait for something (a deploy, a build, a set time), it pauses and wakes up later on
    its own instead of stopping. When it thinks the goal is done, it asks you to confirm, then marks the task
    finished.
-   **Use it when:** the job has many steps or waiting in between, like "deploy, wait, then check the live site".
-   **Example:** `/goal deploy the site to Vercel and fix anything that breaks until it loads`

### `/schedule`: make a schedule or reminder

-   **What happens:** the agent makes a schedule or reminder for you. It checks your existing schedules first, so
    the same one is not made twice. You can see and change your schedules on the Schedule page.
-   **Use it when:** you want something to happen at a time, once or again and again.
-   **Example:** `/schedule remind me every Monday at 9 AM to check the build`

### `/browser`: use the live browser (Studio only)

-   **What happens:** the agent uses the **live browser** in Studio's Browser tab to do the job: it opens pages,
    reads them, clicks, types and scrolls while you watch.
-   **Only in Studio Mode.** Project Mode has no live browser, so this command does not show there.
-   **Use it when:** the job needs a real website, like testing your app's page or filling something in.
-   **Example:** `/browser open my site and check that the signup form works`
-   The agent never types passwords, OTPs or card numbers for you. It stops and lets you do those yourself.

### `/generative_ui`: answer with interactive cards

-   **What happens:** instead of plain text, the agent answers with Classgrid's interactive cards: charts, tiles,
    planners, quizzes, or its own small interactive card when no ready card fits.
-   **Use it when:** you want something visual or clickable, like a comparison, a chart or a small tool.
-   **Example:** `/generative_ui compare these three hosting options`

### `/review`: review the code changes

-   **What happens:** the agent reviews the project's changes (what changed since the last commit, or the files
    you name):
    -   it looks for real problems: bugs, crashes, security holes, missing error handling and broken edge cases
    -   it double-checks each problem before reporting it, so you only see real ones
    -   it lists them from most to least serious, with the file and line
    -   then it fixes them, unless you only asked for the list
-   **Try it:** `/review` or `/review only the login files`.

### `/grill-me`: ask me questions first

-   **What happens:** before deciding or building anything, the agent interviews you with **questions cards**, one
    card at a time, until it clearly understands what you want. It does not start the work until then.
-   **Use it when:** your idea is still rough and you want the agent to help you shape it.
-   **Example:** `/grill-me I want to build a booking app`

### `/plugin`: open the Plugins page

-   **What happens:** the Plugins page opens straight away. **Nothing is sent to the agent**, and no message is
    used.
-   **Use it when:** you want to connect or manage apps (plugins and connectors).

### `/teamwork`: split the job across helpers

-   **What happens:** the agent splits the job into parts that can run at the same time and gives them to
    **helpers** that work in parallel. Then it checks their work and puts it together. You can watch the helpers
    in the chat.
-   **Use it when:** the job has several separate parts, like "build the header, the footer and the pricing page".
-   **Example:** `/teamwork make the home, about and contact pages`

### `/boost`: think harder

-   **What happens:** the agent thinks more carefully about this one message and checks its work twice before
    answering. On Claude models it also uses a higher thinking level, so the answer can take a little longer.
-   **Use it when:** the question is hard, or the last answer had a mistake.
-   **Example:** `/boost why does this page crash only on mobile?`

### `/learn`: save as a skill

-   **What happens:** the agent saves what you say as a **skill**, so it is used in all your future chats. You can
    see, edit or delete skills in the AI Hub under Skills.
-   **Use it when:** you want the agent to always remember a rule, a style or a fact.
-   **Example:** `/learn always write commit messages in simple English`
-   Never put passwords, OTPs or card numbers in a skill.

### `/compact`: shrink the chat's memory now

-   **What happens:** in long chats, Classgrid already keeps a short summary of the earlier messages in the
    background, so the agent does not have to reread everything. `/compact` makes that summary **right now**, using
    the same background summary as always. The agent then continues from the summary plus your newest messages.
    You see "Compacting chat memory..." while it works.
-   **Use it when:** the chat has become long and you want the agent to work from a fresh, short summary.
-   **Example:** `/compact now let's start on the settings page`
-   **Very short chats have nothing to compact.** If the chat is too short for a summary, the message is answered
    as normal.

--------------------------------------------------------------------------------

## 4. For Classgrid AI (how to handle commands)

-   When a message starts with a command, the app adds a **COMMAND** note for that message saying what the user
    wants. Follow it for that message only. It does not change any other rule.
-   Do what the command asks with the tools you already have:
    -   `/classgrid-guide`: `view_project_file` on `.classgrid/classgrid_guide/SKILL.md`, then the matching page in
        its `references/` folder; answer from them.
    -   `/studio-guide`: `view_project_file` on `.classgrid/classgrid_guide/references/studio-mode.md`; answer from it.
    -   `/project-guide`: `view_project_file` on `.classgrid/classgrid_guide/references/project-mode.md`; answer from it.
    -   `/plan`: the questions card (approval block, `"variant": "questions"`) if needed, then the plan card
        (approval block, `"variant": "plan"`), and wait for approval before changing files.
    -   `/goal`: keep working; use `sleep_until` when you must wait; ask the user to confirm, then `end_task`.
    -   `/schedule`: `list_schedules` first, then `create_schedule`.
    -   `/browser`: the browser tools (Studio only).
    -   `/generative_ui`: the Classgrid display blocks, or a `widget` card when no block fits.
    -   `/grill-me`: questions cards, one at a time, before any work.
    -   `/teamwork`: `run_project_helpers`, then check and combine their work.
    -   `/boost`: think carefully and double-check before answering.
    -   `/learn`: `create_skill`.
    -   `/compact`: the summary was just written; continue from it.
-   `/plugin` never reaches you: the app opens the Plugins page itself.
-   When the user asks what "/" commands exist or how to use one, answer from this page.
