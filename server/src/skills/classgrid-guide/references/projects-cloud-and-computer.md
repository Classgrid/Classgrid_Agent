# Projects: in the cloud and on your computer

A project is the code you work on with Classgrid AI. It has a **name** and a **logo**, and it can live in two places:

-   **In the cloud** (chat.classgrid.in and the desktop app): the code is on **GitHub**. Each time you open the project,
    Classgrid downloads the newest code from GitHub onto its cloud computer.
-   **On your computer** (desktop app only): the code is a **folder** on your computer. Nothing is uploaded anywhere.

The two are joined by one thing only: the **GitHub repo**. A project with a repo can be used in both places. A project
without a repo stays on the computer it was made on.

## Cloud projects

-   Anyone can create one on chat.classgrid.in or in the desktop app: give it a name and a logo, then pick a GitHub
    repo or create a new one.
-   A cloud project **always has a GitHub repo**. Your code is kept on GitHub, never on Classgrid's servers.
-   GitHub must be connected, and the Classgrid GitHub app must be installed on the repo.
-   The cloud computer runs **Node.js and Python** projects. Other languages (C++, Java, Android, and so on) can be
    read and edited in the cloud, but they only run on your own computer.

## Projects on your computer (desktop app)

-   In the desktop app, **New project** asks for a **name**, a **logo** and the **folder** on your computer to open.
    You can also clone a GitHub repo into a folder.
-   The project works directly in that folder: the AI reads and edits the files there and runs commands in it.
-   **No GitHub repo is needed.** A folder project never asks you to link a repo.
-   **Nothing goes online by itself.** Opening a folder never uploads it, however big it is. Classgrid never pushes your
    code to GitHub unless you ask.

## Opening a cloud project in the desktop app

Every cloud project can also be used on your computer, by cloning it, never by uploading:

1.  The **first time** you open a cloud project in the desktop app, it asks **which folder** to put it in and **clones
    the repo** there automatically (a normal `git clone`). The folder is connected to the **same GitHub repo**.
2.  **Every time after that**, opening the project **pulls the newest code** from GitHub into that folder, the same way
    the cloud downloads fresh code each time.
3.  Your changes go back with a normal **push to the same repo**, only when you ask. Then the cloud has them too.

The project card looks the same in both places: **name, logo, repo link and Vercel link** (when the project is
deployed).

## Using a project in both places

1.  In the desktop app, ask the agent to **make a GitHub repo for this project and push it**, the same way you would
    ask Cursor or Antigravity. The agent does it only when you ask.
2.  Classgrid sees that the folder is now on GitHub and **links that repo to the same project**, keeping its name
    and logo.
3.  From then on the project works **in both places**: in the cloud (from the website or a phone) and in your folder
    in the desktop app. GitHub keeps the two in step: push from one place, and the other gets the changes the next
    time it opens.

If the folder was already on GitHub before you opened it, Classgrid links its repo when you open it.

## What the website shows

-   **Cloud projects** (with a repo) open in the cloud as usual.
-   **Computer-only projects** (no repo) show **only their name and logo**, marked **"Not connected to a repo"**. Their
    files are never shown or stored online, and the cloud can't download them: there is nothing to download until a
    repo exists. To use one online, open the desktop app and ask the agent to make a GitHub repo and push the project.
    Classgrid then sees the repo, links it, and the cloud downloads the code from GitHub like any cloud project.

## What Classgrid never does

-   It never uploads a folder from your computer to the cloud.
-   It never creates a GitHub repo or pushes code unless you ask.
-   It never links a cloud repo to a folder by guessing.

## Questions

**My folder is very big (hundreds of GB). Will Classgrid upload it?**
No. A folder project stays on your computer. Only what you push to GitHub yourself (or ask the agent to push) goes
online, and GitHub has its own limits on file and repo size.

**Do I need GitHub to use the desktop app?**
No. Folder projects work without GitHub. You only need GitHub to use a project in the cloud.

**Can I change the name or logo later?**
Yes, with Edit on the project. The same name and logo are shown in both places.

**My project is C++ / Java / Android. Can I use it in the cloud?**
You can keep it on GitHub and read or edit it in the cloud, but the cloud computer only runs Node.js and Python, so
run it on your own computer in the desktop app.

## For AI agents (Classgrid AI and helpers)

-   A project is either a cloud project (has `repo`) or a folder project (`location: "local"`, with `localPath`).
-   In a folder project, never create a GitHub repo, push, or upload anything unless the user asks in this chat.
-   When the user asks to put a folder project online: create the repo, commit with a sensible `.gitignore` (no build
    output, caches or secrets), push, then tell the user it now works on the website too.
-   In the cloud, run only Node.js and Python. For other languages, explain that they run in the desktop app.
-   On the website, if the user asks about a computer-only project, tell them to open the desktop app and ask the
    agent to make a repo and push it.
