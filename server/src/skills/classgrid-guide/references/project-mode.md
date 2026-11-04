# Project Mode

Project Mode (Classgrid Code) is a VS Code editor in the browser with the Classgrid AI panel beside it: open a GitHub repo, ask the agent to build, fix or explain code, check its changes, and send the work back to GitHub.

## 1. Switch to Project Mode

- Go to chat.classgrid.in and sign in.
- Click your name at the top of the sidebar, then under **Switch Mode** pick **Project**. Pick **Agent** to go back to normal chat, or **Studio** for Studio Mode.
- A chat started in Agent mode can be moved in: open the chat's menu, choose **Move to project**, then pick a project or make a new one. Each project keeps its own chats.

## 2. GitHub is required

Project Mode only works with GitHub. Code is kept on GitHub, never on Classgrid's servers.

- **Connect GitHub**: the first visit shows **Connect GitHub to use Project Mode**. Click **Connect GitHub**, sign in, allow access. If the link breaks later, the button says **Reconnect GitHub**.
- **Install the Classgrid app**: a card on the Projects page asks for it. Click **Install app**, choose the account or organisation and the repos, confirm. You come back to "Classgrid app installed".
- Opening a project whose repo lacks the app shows an **Install the Classgrid app** window with **Install app**. Inside the editor, the same problem shows a banner: "Install the Classgrid app on {repo}." with an **Install Classgrid app** button.

## 3. Projects page

- Subtitle: "Your code stays on GitHub. Opening a project downloads it fresh."
- **New project**: optional **Add logo** (cropped in **Crop project logo**), a **Project name**, then **Create**.
- Next, **Link a GitHub repo**: pick a repo (private ones are tagged **private**), or click **Enter project without a repo**.
- Each card shows the logo and name, the last commit message, the repo, and how long ago it was last changed. Card actions: **Open**, **Edit**, **Delete**.
- **Delete** asks you to type the project name. "Its code stays on GitHub. Only the project here is deleted."
- The website lists only cloud projects. The desktop app shows two groups, **This PC** (folders on this computer) and **Cloud**.

## 4. Opening a project and the editor

- **Open** downloads the newest code of the repo's default branch. While a Classgrid pull request is still open, it opens that pull request's branch instead, so changes not merged yet are there. You can't pick another branch to open.
- Loading lines: "Downloading the latest code from GitHub", "Starting the editor", "Almost ready". After a page reload: "Reconnecting to your project".
- If the copy on Classgrid has changes not yet pushed, a **Download a fresh copy** card asks first: "A fresh copy from GitHub replaces them." Confirm with **Download fresh copy**.
- At busy times: "Project Mode is busy right now. Try again in a few minutes."
- The editor is VS Code with Classgrid branding: file explorer, built-in terminal, auto-save, Prettier and ESLint, and a run button for the open file. There is no extension store.
- Packages install by themselves in the background. Red marks go away when that finishes (about a minute the first time).
- Every user gets their own editor box with only their own projects.
- No repo yet? A banner says so; **Ask Agent to create repo** makes one (private by default).
- The top bar has **Projects** (back), the project name and repo, **Push to GitHub**, and **Agent** to open the AI panel.

## 5. The AI panel

- Opens on the right. Drag its edge to make it wider or narrower.
- Dragged very wide, it folds the left sidebar to keep room for the editor; drag it back and the sidebar opens again.
- When the panel is wide, **Push to GitHub** shrinks to just the GitHub icon.
- With every message the agent gets, without copy-paste:
  - the file open in the editor and the cursor line
  - the selected lines (select code, then ask "why is this slow?")
  - the other open tabs
  - the editor's errors and warnings (problems), marking ones on lines you just changed
  - the edits you made yourself since its last answer
  - the repo's rules file, if there is one: `AGENTS.md`, `CLAUDE.md`, `.classgrid/rules.md`, `.cursorrules` or `.github/copilot-instructions.md`
- File names in replies are clickable and open the file at the right line.

## 6. What the agent does

- **Read and search**: lists, opens and searches files, and can **search by meaning** ("Where do we handle login?"). Steps show as **Analyzed**, **Searched**, **Searched by meaning**.
- **Edit**: makes new files (**Created**) and small edits (**Edited file +N -M**). After each edit it reads the editor's problems and fixes them.
- **Run commands**: runs Python, JavaScript or shell in the project folder.
- **Background commands**: long jobs like `npm run dev`, a build or tests run in the background (**Started in background**). Up to 3 per chat, each stops by itself after 30 minutes. The agent can check them and test a server from inside, e.g. call `localhost:3000`.
- There is no live preview link to a dev server. To see the site, deploy a Vercel preview.
- **Helpers**: for big jobs it can send up to 5 helpers at once (**Sending N helpers**). They read the code by default; the agent can also let a helper edit files and run commands.
- **Plans**: for a large job it may ask questions in a card, write a plan to the `plan/` folder and show a plan card. **View Plan** opens it; the build starts after you approve.
- **GitHub actions**: create a repo (private by default, or in an organisation), rename it, change its description, website and visibility, and rename the project.

## 7. Review, Undo and Reject

- Classgrid saves a snapshot before each answer. An answer that changed code ends with a box like **3 files changed +42 -7** with **Review** and **Undo**.
- **Review** opens **Review changes**: a diff per file, with **Reject** on each file, plus **Reject all** and **Accept all**.
- **Accept all** only marks the answer as kept (box shows "· kept"). It does not commit or push.
- **Undo** puts the project back to how it was before that answer. Later changes, by you or the AI, are undone too. To drop one file only, use **Reject**.
- The box then shows **Changes undone** or **Changes rejected**.
- Snapshots last only while the project's copy is on Classgrid. After it is removed (see 8), old answers can't be reviewed or undone.

## 8. Pushing and backups

- Click **Push to GitHub**, type a note in the window (or tap a suggestion), then **Push changes**. Or ask the agent: "Push my changes to GitHub."
- Normal accounts: work goes to a `classgrid/<date-time>` branch with a pull request. One open pull request per project: later pushes add to it until it is merged or closed, then the next push opens a new one. Nothing is merged for you; the repo owner merges on GitHub.
- Push straight to main: ask the agent, e.g. "push straight to main" or "no pull request". It pushes to the default branch with your own GitHub account. Some accounts always push straight to main; the push result says where it went.
- The **Push to GitHub** button itself always uses the normal pull-request way (unless the account is one that always goes to main).
- Commits are made by Classgrid AI (agent@classgrid.in) with you as co-author.
- If someone else pushed first, Classgrid puts your changes on top. If you both changed the same lines, it stops: "Nothing was lost."
- Backups: about 5 minutes after you close the editor, the project's copy is removed from Classgrid. Unpushed work is first saved to a `classgrid-backup-…` branch on GitHub. A project with no repo is saved to a new private repo. If the backup fails, the copy is kept.

## 9. Permissions

The agent's permission mode (**Request Review**, **Default**, **Auto**, **Turbo**) is shared with Studio Mode; see [settings.md](settings.md) (Permissions) or `https://classgrid.in/docs/studio-permissions`.

## 10. FAQ

- **Do I need GitHub?** Yes. Connect GitHub and install the Classgrid app on the repo.
- **Can I see my site running inside Project Mode?** No live preview link. Deploy a Vercel preview instead.
- **I closed the tab without pushing. Is my work lost?** No. About 5 minutes later it is saved to a `classgrid-backup-…` branch.
- **Does "Accept all" save to GitHub?** No. Use **Push to GitHub**.
- **Can I open a branch other than the default?** No. Opening downloads the default branch (or the open Classgrid pull request's branch).
