# Classgrid Code: our editor with the Classgrid AI inside (option B)

Classgrid Code is our own code editor, built from VS Code's open-source code (the newest VS Code release), with the
Classgrid AI built inside it. Cursor, Windsurf and Antigravity are made the same way: VS Code's code plus their own AI.
It is a full desktop editor: real extensions from the Open VSX store, the Extensions icon in the left bar, one
"Installed" list, and no editor server (no "localhost" in the editor).

## What is inside

| Part | Where | What it does |
|---|---|---|
| The editor | VS Code's open-source code, newest release, built with VSCodium's scripts | Code, files, the editor's own terminal, extensions (Open VSX) |
| Our name and logo | `brand.sh`, `icon.ico` | "Classgrid Code", our own app ids and data folder (`.classgrid-code`), no VSCodium update server |
| **The Classgrid AI** | `extension/` (built into the editor, not from a store) | The **Agent chat on the right side** and all of Classgrid (Agent, Studio, Projects) in a tab |
| Our screens | `client/` (the same desktop build the Classgrid app packs) | The same chat, Studio and Projects screens, unchanged |
| The AI's parts on the computer | `desktop/runner.js`, `aimemory.js`, `chats.js`, `memory.js` (the Classgrid app's own files) | The AI's terminal, files and memory notes on this computer |

### `extension/`
- `package.json`: the Agent panel on the **right side** (`viewsContainers.secondarySidebar`, the view `classgrid.agent`),
  and the commands "Classgrid: Show the Agent" and "Classgrid: Open Classgrid".
- `extension.js`: serves our screens to the panels only (internal, at http://localhost:47822, the same way the
  Classgrid app serves them at :47821), answers what the screens ask for, and runs the desktop app's runner, chats
  and memory. A file the AI mentions opens **in this editor** at its lines. A folder project opens in this editor.
- `bridge.js`: gives our screens `window.classgridDesktop`, the same thing the Classgrid app's `preload.js` gives
  them. Each call goes to `extension.js` and its answer comes back.
- `electron-shim.js`: the few Electron things the desktop app's parts use (the app's folders, its version, opening
  links and files), because the editor's extension host has no Electron.

## How it is built

`.github/workflows/build-classgrid-editor.yml` runs on GitHub's Windows build computer when this folder changes:

1. Gets this folder, `client/` and `desktop/`.
2. Gets the newest VSCodium build scripts and the **newest VS Code release** (`VSCODE_LATEST=yes`).
3. `brand.sh`: our name, logo and app ids.
4. Builds our screens (`desktop/scripts/build-client.mjs`), then packs the Classgrid AI part: the extension, the
   screens, the desktop parts and `socket.io-client`.
5. Builds and packs the editor for Windows.
6. Puts the Classgrid AI part inside the editor as a built-in extension (`resources/app/extensions/classgrid`).
7. **Proof: it is B.** This stops the build unless the finished editor has all of the following:
   - our name
   - the Open VSX store
   - the Classgrid extension
   - the Agent panel on the right side
   - our screens and their code
   - the runner, memory and chats
   - the runner's connection to Classgrid
   - the bridge
8. Puts the finished editor (`Classgrid-Code-win32-x64-<version>.zip`) in a GitHub release of this repo.

## Not in this first version yet

Our screens hide each of these by themselves when it's missing:
- Studio's own browser tab
- the user's own terminals in Studio's Terminal tab (the editor's own terminal is there instead)
- using the mouse and keyboard
- reading videos

Google and GitHub sign-in return to the Classgrid app (classgrid:// links). Email sign-in works in the editor.

## Tested before the build

- `extension/` with a stand-in for VS Code: 19 of 19 checks passed. It serves our screens with the bridge, the
  right-side Agent panel shows them, and their calls reach the real desktop parts: files, the user's real memory
  folder, saved chats, and opening a file in the editor. Paths outside the project are refused.
- The "pack", "put inside" and "Proof: it is B" steps, run on a stand-in editor folder: the proof passes with the AI
  part inside and stops the build without it. The packed extension serves our screens with its own packed runner.
