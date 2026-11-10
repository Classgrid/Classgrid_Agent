# Sign in to the Classgrid extension from the browser (Classgrid Code, VS Code, Cursor)

Goal: anyone who installs the Classgrid extension (built into Classgrid Code, or the `.vsix` in VS Code / Cursor) can sign in
with the existing login page at chat.classgrid.in, the way Antigravity and Claude Code do. No RPC: browser login, then a
one-time code handed back to the editor through its own link (`<scheme>://classgrid.classgrid/login`), swapped for the token.

Decisions (Nikhil, 2026-11-10)
- Editors: Classgrid Code + VS Code + Cursor, one `.vsix`. The link scheme comes from `vscode.env.uriScheme`.
- Sign-in methods: the existing login page, unchanged. Every method it has (Google, GitHub, email + password, OTP,
  sign-up / onboarding, an already signed-in browser) hands the login back, because the handoff runs after the page
  has a token, not inside each method.

## Flow
1. Extension: "Sign in with Classgrid" (signed-out panel + command `classgrid.signIn`). Makes `state` (random) and a PKCE
   `verifier`; `challenge = base64url(sha256(verifier))`. Opens
   `https://chat.classgrid.in/login?editor=1&state=..&challenge=..&callback=<scheme>://classgrid.classgrid/login`.
2. Login page: sees `editor=1`, keeps `{state, challenge, callback}` in sessionStorage (it survives the Google / GitHub
   round trip). If already signed in, it skips straight to step 3.
3. After any successful sign-in (token in localStorage): `POST /api/auth/editor-code { challenge }` with the token, then
   the browser goes to `callback?code=..&state=..` and shows "You're signed in, go back to your editor" with the code
   to copy and an "Open editor" button.
4. Extension: checks `state` matches, `POST /api/auth/desktop-exchange { code, verifier }`, saves the token in secret
   storage, reloads the panels.

## Changes
| Where | Change |
|---|---|
| server/src/routes/auth.routes.js | `/editor-code` stores the optional `challenge` with the code; `/desktop-exchange` requires `sha256(verifier)` to match when a challenge was stored. Old Classgrid app handoff (no challenge) keeps working. |
| client: PublicChatLoginPage.tsx + a small `editorHandoff.ts` | Read `editor`, `state`, `challenge`, `callback`; allow only `classgrid-code`, `vscode`, `vscode-insiders`, `cursor`, `windsurf` schemes with host `classgrid.classgrid` and path `/login`; run the handoff after any sign-in; "You're signed in" screen with copyable code. |
| client: app start (main / router) | After Google / GitHub return to `/` or onboarding, finish a pending editor handoff from sessionStorage. |
| classgrid-editor/extension/extension.js | Signed-out screen in the Agent panel; `classgrid.signIn` and `classgrid.pasteSignInCode` commands; state + PKCE; state check in the `/login` link handler; a 401 from our server signs out and shows the sign-in screen again. The Classgrid app's handoff (no state) still works. |
| classgrid-editor/extension/package.json | The two new commands. |
| Packaging (standalone `.vsix`) | Pack the editor build of our screens (`app/`) and the desktop runner parts (`desktop/`) into the `.vsix` so the panel works in plain VS Code / Cursor. |

## Security
- `state` must match the one the extension made (stops someone sending a link that signs you into their account).
- PKCE: a stolen code is useless without the verifier, which never leaves the editor.
- Codes: 60 seconds, single use (as today). Callback limited to the allowed schemes.

## Test
- Classgrid Code, VS Code, Cursor: sign in with Google, GitHub, email + password, OTP and an already signed-in browser.
- Wrong `state` is refused; a code without the right verifier is refused; an expired code shows a clear message.
- The Classgrid app's Project Mode handoff to Classgrid Code still works.
- Paste-code fallback works when the browser blocks the link.
