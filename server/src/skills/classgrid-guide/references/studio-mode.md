# Studio Mode

Studio Mode is Classgrid AI's agent workspace: you chat on the left, and a pane on the right shows the agent's live browser, files, terminal, screenshots and changes while it works.

## 1. What it is and how to switch

- The agent does the work itself: it browses websites, writes and changes code, runs commands and checks the result. There is no code editor in Studio.
- Good for: using websites for you (open, click, fill forms, compare), testing your running app, building or fixing a project by chat, reviewing a site's design.
- To switch: on chat.classgrid.in, click your name at the top of the sidebar, then under **Switch Mode** choose **Studio**. Choose **Agent** or **Project** to go back.
- Switching between Project and Studio keeps the open chat. Any signed-in Classgrid AI user can use Studio.
- Studio and Project Mode share the same projects and chats.

## 2. The screen

- **Sidebar** (left): **New Chat**, **Search**, pinned and recent chats. Drag its edge to make it wider; double-click the edge to reset it. When the sidebar is collapsed to icons, dragging that strip fully to the left hides it; the sidebar button brings it back.
- **Chat** (middle): talk to the agent as in Agent mode.
- **Pane** (right): tabs that show the agent's work. It starts hidden.
  - **Show pane** (top right of the chat) opens it. It also opens by itself on **Browser** when the agent starts using the browser, and on **Files** when you click a file name in the chat.
  - Drag the line between chat and pane to resize. **Maximize pane** fills the screen and hides the chat; **Restore pane** brings the chat back. **Hide pane** closes it.
  - A narrow pane shows tabs as icons only; hover to see the name. Open tabs and the pane's open/closed state are kept after a page refresh.

## 3. Pane tabs

- **+ (New tab)** opens the tab launcher: type in "Search tabs: browser, files, terminal, project…" and press Enter to open the first match. **X** on a tab closes it. Closing every tab shows the launcher.
- **Review**, **Files**, **Terminal**, **Project** and **Screenshots** open once (opening again switches to it). You can open several **Browser** tabs, but they all show the same live browser.
- **Browser**: the shared live browser (section 5).
- **Files**: the project's files, read-only.
  - Top bar shows **Workspace**, the project name and branch. While the agent writes: "Writing [file] +N". A file being written shows **Writing…**; a just-changed file gets a blue dot.
  - **Filter files…** box searches the tree; its folder button switches results between a flat list and **Show results in their folders**. Esc clears it.
  - Buttons: **Copy file**, **Hide file tree** / **Show file tree**, **Refresh**, and **⋮ More**: **Copy Content**, **Download File**, **Copy Path**, and **Show in GitHub** (only when the files come from a GitHub repo).
  - Click any part of the path bar to browse that folder. Pictures show as images (click to zoom). Very large files show only the first 1 MB.
  - Drag a file (from the tree or a file tab) onto the chat box to mention it as a chip; folders can't be dragged.
  - File names in the agent's answers (like `src/App.tsx` or `app.ts:25`) are chips: click to open the file, at that line if given.
- **Terminal**: every command the agent runs in this chat with its output. **Running** with a blue dot means a command is still going. **Clear** empties it. You can't type here; ask the agent to run a command.
- **Project**: cards for **GitHub** (Connected / Not connected / No repo, repo link, working branch, open pull request), **Vercel**, **Last commit** and **History** (click a commit to open it on GitHub). **Open in Project Mode** and **Refresh** at the top.
- **Screenshots**: every screenshot the agent took in this chat, newest first, plus your full page screenshots. Click one to view large: **Older** / **Newer** (or ← →), **Download**, **Open the page**, Esc to close.

## 4. Projects

- On a new chat, click the project button above the chat box (shows the project name or **No project**):
  - **Search projects** and pick one under **Recent**, or choose **No project** to chat without one.
  - **New project**: give a **Name**, then **Start without a repo** or **Link a GitHub repo**.
  - Hover a project to **Rename**, **Link a repo** / **Change repo**, or **Delete** it (you type the project name to confirm; its code stays on GitHub).
- Picking a project in Studio also makes it the open project in Project Mode. Changing project starts a new chat.
- Classgrid then gets the code ready: "Downloading [name] from GitHub…" or "Getting [name] ready…".
- GitHub must be connected (and the Classgrid app installed on the repo) to open a project. Both are set up in Project Mode only; Studio shows a **Go to Project Mode** button when something is missing.
- The browser works without a project. **Files**, the terminal, your dev server and **Review** need one.
- **Push**: when the project has a repo, a **Push** button sits in the pane's tab bar. Write **What did you change?** and click **Push changes**.
  - Normal accounts: changes go to a `classgrid/` branch and one open pull request per project; new pushes join that pull request until it is merged.
  - You can ask the agent to push straight to main with your own GitHub account. Some accounts always push straight to main; the push result says where it went.
- Backups: after about 30 minutes with no Studio use, Classgrid removes the project's working copy. Unpushed work is first saved to a `classgrid-backup-...` branch on GitHub (a project with no repo first gets its own private repo). Next time you see: "Your unpushed work from last time was saved on GitHub, in the branch [branch]."

## 5. The live browser

- A real Chrome browser running in the cloud, just for you. You and the agent share it.
- The agent can open a site (a plain phrase opens a Google search), click, type, press keys, scroll, go back, wait, take a screenshot and read the page's text and links. It sees a screenshot after each step.
- While the agent works: a blue pointer labelled with what it's doing, a blue ring where it clicks, and a blue border with "The agent is using the browser". You can't use the browser then; control comes back a few seconds after the answer ends.
- When it's yours: click, scroll and type on the page, **Back**, **Forward**, **Reload**, the address bar ("Search or enter a website"), **Save a screenshot**, **Full page screenshot** (saved to **Screenshots**), **Open in a new tab**.
- Sign-ins: type passwords yourself in the **Browser** tab. The agent never types passwords, card numbers or OTPs, and never pays, buys, sends, posts or deletes for you; it stops and asks. Captchas and login walls make it stop and tell you.
- Sign-ins are remembered across your Studio chats. Each chat reopens on its own last page; a new chat starts empty.
- Dev server: ask "Start the dev server and open it in the browser." It runs in the background (seen in **Terminal**) and opens at localhost. Only your own Studio can reach it, and it must be started in the same chat.
- After about 30 minutes with nobody using or watching it, the browser shuts down; sign-ins and last pages are kept.
- Only in Studio Mode. Messages: "Starting your browser…" (wait), "The browser could not start" (**Try again**), "Not connected. Refresh the page." (refresh).

## 6. Helpers and the scratchpad

- For big jobs the agent writes a plan in the chat's scratchpad and sends helpers that work at the same time (up to 5 per chat).
- Helpers share your one live browser and your project, follow your permission mode (their cards show in the same chat), use credits like the chat, and never push to GitHub.
- Helper model: the one you name ("Use Claude Sonnet 5.5 for the helpers"); otherwise Claude Sonnet 5.5 for hard sites and DeepSeek V4.1 Flash for simple ones. If a model is busy, Classgrid tries another.
- Scratchpad: one per chat, kept 7 days, up to 20,000 characters, read by the agent and helpers only.

## 7. Permissions

- The shield sits in the chat box, left of the model picker. Hover: "Permissions: [mode]". Click to change. It hides when the chat column is very narrow. Default is **Default**; your choice is remembered.
- **Request Review**: "Every command asks you first." Every command, code run, push, repo change and browser open/type/click/key asks.
- **Default**: "Asks before sensitive actions." Asks for risky commands (installs, `git commit`, `mv`, `curl`, `docker`...), destructive ones, pushing, creating or changing a GitHub repo, opening a website and typing into a page. Clicks, key presses, other commands and code runs go ahead.
- **Auto**: "Asks only before destructive actions." Asks only for destructive commands (`rm`, `sudo`, `git push`, `git reset --hard`, drop table...) and pushing.
- **Turbo**: "Runs everything without asking."
- Never asks in any mode: creating, editing and reading files; scrolling, reading pages and screenshots; sending helpers. Check file changes in **Review**.
- The permission card (above the chat box) shows the question and the exact command, site or text:
  - **1. Yes, allow this time** · **2. Yes, and always allow [this] in this chat** · **3. Yes, and always allow [this]** (every chat) · **4. No** with an optional note · **Skip** (or the X).
  - Keys 1-4 pick, Enter sends, Esc skips; double-click 1-3 to send at once.
  - "Always allow" covers one kind of thing: the exact same command, one website, all typing, all clicks, all key presses, one code language, all pushes, all new repos or all repo setting changes.
  - No answer in 30 minutes means it doesn't run. If sending fails: "Could not send your answer".

## 8. Review and undo changes

- Classgrid snapshots your code before every answer. Under an answer that changed files: "3 files changed +42 -7"; click to list files, click a file to open it.
- **Review** tab (or **Overview → Review**): pick **Newest answer** or **Answer N of M**; **Reject all**, **Accept all**, **Reject file** per file; **Find** (with **Aa**, whole word, **.***); files list toggle; **Refresh**.
- **⋮ View options**: **View split diff**, **Hide whitespace changes**, **Expand all** / **Collapse all**, **Collapse unchanged lines**.
- Rejecting puts files back as they were before that answer and can't be undone. **Accept all** only marks the answer as kept; use **Push** to save to GitHub.
- To undo a whole answer (including later changes), hide the pane, click **Open** to continue the chat in Project Mode, then **Undo** in the files changed box.
- After the 30-minute cleanup, older answers can't be reviewed: "This answer's changes can't be reviewed anymore."

## 9. Chat top-right buttons, question dots and the queue

- With the pane hidden, a started chat shows three buttons at the top right:
  - **⋮ Chat options**: **Rename**, **Pin** / **Unpin**, **Archive**, **Archived chats** (archived chats are kept; **Unarchive** brings one back), **Copy** (**Copy link**, **Copy chat**, **Copy chat ID**) and **Delete**.
  - **Open**: opens this chat in Project Mode with its project.
  - **Overview**: jumps to **Review**, **Files** or **Terminal**, and shows how many **Background commands** are running.
- Question dots: small marks on the chat's left edge, one per recent question (older ones grouped into bars). Hover to see the question, "N of M" and its time; click to jump there. They hide when the chat is narrow.
- Message queue: messages sent while the agent is answering wait as "N queued" above the chat box and go one at a time, so only one answer runs in a chat at once. Hover a queued message to **Send** it next or cancel it (X).

## 10. FAQ

- **Can I edit files myself in Studio?** No, the **Files** tab is read-only. Ask the agent, or click **Open** and edit in Project Mode.
- **Do I need GitHub?** To open a project, yes. To chat and use the live browser without a project, no.
- **Why can't I type in the terminal?** It only shows the agent's commands. Ask the agent, for example "Run the tests."
- **How do I undo an "Always allow"?** There is no button for it yet; contact support through Support Tickets.
- **Is "Accept all" the same as saving?** No. It only marks the changes as kept; **Push** saves to GitHub.
