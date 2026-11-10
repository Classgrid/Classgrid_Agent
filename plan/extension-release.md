# Release the Classgrid extension the Claude Code way

Goal: people get the Classgrid extension in VS Code, Cursor, Windsurf and VSCodium from the stores, and the Classgrid
desktop app adds it to those editors for them, like Claude Code does. Sign-in is already built (plan/editor-sign-in.md).

Decisions (Nikhil, 2026-11-10)
- Claude Code way first (stores + auto-install from our app). Classgrid Code installer (Antigravity way) later.
- No paid code-signing certificate. Not needed: the stores sign extension packages themselves.

## Cost: free
| Item | Cost |
|---|---|
| VS Code Marketplace publisher + Azure DevOps token | Free |
| Open VSX account, namespace + token | Free |
| Verified publisher (DNS TXT on classgrid.in) | Free |
| GitHub Actions on this repo | Free minutes |

## What Nikhil does (only he can)
1. marketplace.visualstudio.com/manage: create publisher with ID exactly `classgrid`.
2. dev.azure.com: Personal access token, Organization "All accessible organizations", Scope "Marketplace > Manage".
3. open-vsx.org: sign in with GitHub, link Eclipse account, accept Publisher Agreement, create an access token.
4. GitHub repo Settings > Secrets > Actions: add `VSCE_PAT` and `OVSX_PAT`.
5. Marketplace publisher page: verify `classgrid.in` (add the TXT record it shows to the domain's DNS).

## What I build
| Where | Change |
|---|---|
| classgrid-editor/extension/README.md, CHANGELOG.md | Store page: what the extension does for people, how to sign in. Product only, no internals. Added to `files`. |
| .github/workflows/publish-extension.yml | On a tag `ext-v*` (or by hand): build our screens, `pack-vsix.mjs`, publish to the VS Code Marketplace (`VSCE_PAT`) and Open VSX (`OVSX_PAT`), attach the `.vsix` to a GitHub release. A store whose secret is missing is skipped, not failed. Checks the tag matches package.json's version. |
| desktop/ (main process) | Auto-install: finds VS Code, Cursor, Windsurf, VSCodium on the computer (their CLI in the usual install folders), asks once ("Add Classgrid to VS Code and Cursor?"), then runs `<cli> --install-extension classgrid.classgrid` from the store. Remembers the answer; a Settings switch to change it. Never touches an editor without the yes. |
| classgrid-editor/extension/package.json | Version bump per release (stores refuse a reused version). |

## Release steps (after the setup)
1. Bump `version` in classgrid-editor/extension/package.json.
2. `git tag ext-v0.1.0; git push origin ext-v0.1.0`.
3. The workflow publishes to both stores; Marketplace scan takes a few minutes.

## Before the first release
- Backend and website deployed with commits 76a8a8260 and e1efbd388 (sign-in needs them).
- One local test: `code --install-extension classgrid-0.1.0.vsix`, sign in with a new email; check Cursor shows the right-side panel.

## Test
- Workflow run by hand without secrets: builds the `.vsix`, skips both stores, attaches it to the release.
- Auto-install: with VS Code installed, the app asks once; after yes, `code --list-extensions` shows `classgrid.classgrid`; after no, it never asks again.
