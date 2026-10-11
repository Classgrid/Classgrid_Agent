# Classgrid MCP: setup guide

Classgrid has a remote MCP server. With it, AI apps (Claude, Claude Desktop, Claude Code, Cursor, ChatGPT) can
use a person's own Classgrid account: their schedules, their Grid chats, their profile and the apps they have
connected to Classgrid.

- **Server URL:** `https://api.classgrid.in/mcp` (Streamable HTTP, `POST` only)
- **Sign-in:** OAuth 2.1 with PKCE (S256). Apps register themselves (Dynamic Client Registration) as public
  clients (`token_endpoint_auth_method: none`), so there is **no API key** to copy anywhere.
- **Code:** `server/src/mcp/mcp-server.js` (route), `server/src/mcp/mcp-scopes.js` (scopes),
  `server/src/mcp/mcp-allowlist.js` (tool allowlist and never-expose list),
  `server/src/routes/oauth.provider.routes.js` (OAuth), `client/src/features/oauth/pages/OAuthConsentPage.tsx`
  (permission screen).

The old shared-key endpoint (`/api/mcp/sse`, `/api/mcp/messages`, `dev-key-123`) is retired and answers
**410 Gone**. `mcp-bridge.js` only prints the new setup steps.

---

## 1. Connect an app

In every app the steps end the same way: a browser opens Classgrid, the user signs in if needed, ticks the
permissions they want on the Classgrid permission screen and clicks **Allow**.

### Claude (claude.ai, web)

1. Settings > **Connectors** > **Add custom connector**.
2. Name: `Classgrid`. URL: `https://api.classgrid.in/mcp`. Leave the OAuth client ID and secret empty.
3. Click **Connect** and approve on the Classgrid screen.

On Team and Enterprise plans an owner adds the connector once under organization settings, then each member
clicks Connect and signs in with their own Classgrid account.

### Claude Desktop

Same as the web: Settings > **Connectors** > **Add custom connector**, URL `https://api.classgrid.in/mcp`.
Connectors added on claude.ai also show up in the desktop app.

### Claude Code

```sh
claude mcp add --transport http classgrid https://api.classgrid.in/mcp
```

Then run `/mcp` inside Claude Code and choose **Authenticate**.

### Cursor

Add this to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "classgrid": {
      "url": "https://api.classgrid.in/mcp"
    }
  }
}
```

Open Cursor Settings > **MCP** (Tools & Integrations) and click **Connect** next to Classgrid.

### Apps that only support stdio

```sh
npx -y mcp-remote https://api.classgrid.in/mcp
```

### ChatGPT (plugin)

The plugin package lives in `integrations/chatgpt-plugin/classgrid/`:

| File | Purpose |
|---|---|
| `plugin.json` | Name, descriptions, category, brand colour, privacy and terms links, example prompts, icons |
| `mcp.json` | Server URL, OAuth with `mode: dcr` and `tokenEndpointAuthMethod: none`, endpoints, scopes |
| `skills/` | Short guides for ChatGPT: setup, schedules, Grid chats, connected apps |
| `assets/` | Icon (192 px) and logo (512 px) |

Scopes in `mcp.json`:

- `baseScopes` (always asked): `profile:read`, `offline_access`
- `defaultScopes`: `profile:read`, `schedules:read`, `grid:read`, `offline_access`

PKCE is not set in `mcp.json`. ChatGPT reads it from our discovery document
(`code_challenge_methods_supported: ["S256"]`), and our server refuses any sign-in that skips it.

**Build the ZIP** (zip the `classgrid/` folder itself, so every path in the ZIP starts with `classgrid/`):

```sh
python -I -c "import shutil; shutil.make_archive('classgrid-chatgpt-plugin', 'zip', 'integrations/chatgpt-plugin', 'classgrid')"
```

**Upload:**

1. Upload the ZIP in the OpenAI plugin/developer portal.
2. Read the automated checklist. It connects to `https://api.classgrid.in/mcp`, so the server must be deployed
   with `MCP_ENABLED=true` first.
3. Fix anything it reports, then **Submit for review**.

To test before the review, a user can also add `https://api.classgrid.in/mcp` as a custom connector in ChatGPT
(developer mode).

---

## 2. Permissions (scopes)

The permission screen shows one checkbox per scope the app asks for. These are the only scopes:

| Scope | Shown as | Starts | What it unlocks |
|---|---|---|---|
| `profile:read` | Read your profile | Always on (locked) | `get_my_profile` |
| `schedules:read` | Read your schedules | Ticked | Listing schedules |
| `schedules:write` | Create, edit and delete your schedules | **Unticked** | Creating, editing and deleting schedules and attachments |
| `grid:read` | Read your Grid chats and groups | Ticked | Groups, chats, messages, members, polls, attachment links, people search |
| `grid:write` | Send messages in Grid and chats | **Unticked** | Sending messages, announcements, polls and files |
| `apps:use` | Use your connected apps (Gmail, Drive, Notion…) | **Unticked** | Google, Microsoft, Notion, Slack, GitHub, Zoom, YouTube connectors |
| `offline_access` | Stay connected (refresh access) | Ticked | A refresh token, so the app stays connected |

How it works:

- The app gets **only the boxes the user ticked**, and never more than the app asked for. "Read your profile" is
  always included when the app asks for it.
- If an app asks for no scopes, it is treated as asking for all the read scopes plus `offline_access`.
- If an app calls a tool its token doesn't cover, it gets **403 `insufficient_scope`**. The app can then ask the
  user again, and the user can tick the extra box.
- A scope only decides which tools the app can see. Every tool still runs Classgrid's normal checks for the
  signed-in user (role, organization, chat membership).
- Tokens: access tokens last **1 hour**. Refresh tokens change on every use; if an old one is used again, that
  whole sign-in is cancelled. Changing your password also ends it.

Extra safety rules applied over MCP:

- Grid tools work only for chats and groups the user is a member of. Messages are always sent as the user.
  Only group admins can send announcements.
- People search covers only the user's own organization. A user with no organization can find someone only by
  their exact email.
- `apps:use` shows only the apps this user has connected to Classgrid themselves.
- File links must start with `https://`.
- The GitHub "use Classgrid's own account" option and `push_sandbox_files` are blocked.
- Sign-in and app removal are refused while staff are impersonating a user.

### Signed-out users

If someone is not signed in when the permission screen opens, they are sent to the Classgrid login. After they
sign in (password, email code, Google or GitHub) in the same tab, they come back to the permission screen. The
saved link lasts 10 minutes.

### Connected apps (removing access)

In Classgrid, open the AI window > **AI Plugins** > **Connected apps**. The list shows each app with:

- an **Unverified** badge, if the app registered itself,
- the permissions it has,
- when it was connected, and when it last got a new token ("last active"),
- a **Remove** button.

Remove asks for confirmation, then deletes all of that app's tokens and unused codes for this user. To change
an app's permissions, remove it and connect again.

This list only works on `*.classgrid.in` (or the origins in `OAUTH_CONSENT_ORIGINS`). It does not work on a
school's own custom domain.

---

## 3. Server settings (EC2)

Set these in `server/.env` on EC2, then restart the API.

| Variable | Needed? | Default | What it does |
|---|---|---|---|
| `MCP_ENABLED` | **Yes, to turn it on** | off | Must be exactly `true`. Anything else: `/mcp` answers 404. |
| `MCP_RESOURCE_URL` | Optional | `https://api.classgrid.in/mcp` | The public MCP URL. Tokens are issued only for this address. |
| `OAUTH_ISSUER` | Optional | `https://api.classgrid.in` | Base URL in the discovery documents. Must be the origin serving `/.well-known/...`. |
| `OAUTH_CONSENT_URL` | Optional | `https://chat.classgrid.in/oauth/authorize` | Where the browser is sent to show the permission screen. |
| `OAUTH_CONSENT_ORIGINS` | Optional | (none) | Comma-separated extra origins allowed to call the permission and Connected apps APIs. `https://*.classgrid.in` and `FRONTEND_URL` are always allowed. |

`MCP_API_KEY` is no longer read by anything. It is left in `.env` on purpose.

### Check it after deploying

- `https://api.classgrid.in/.well-known/oauth-authorization-server` lists the endpoints, `S256` and the scopes.
- `https://api.classgrid.in/.well-known/oauth-protected-resource/mcp` names `https://api.classgrid.in/mcp`.
- A `POST /mcp` without a token returns **401** with a `WWW-Authenticate` header that has `resource_metadata`.
- Connect Claude or Cursor once, end to end.

### Limits

- `/mcp`: 300 requests per minute per IP, and per token 120 requests and 60 tool calls per minute.
- Body size: up to 1 MB.
- `GET` and `DELETE` on `/mcp` return 405.
- Each tool call writes one `[MCP audit]` log line: user, app, tool, ok/error and time taken. Tool inputs are
  never logged.

### How to switch it off

- **Whole MCP server:** remove `MCP_ENABLED` (or set it to anything other than `true`) and restart. `/mcp` then
  answers 404, and no tool can be called with any token. OAuth sign-in and Connected apps keep working.
- **One app for one user:** the user removes it under Connected apps.
- **Safety net:** if the allowlist check fails at startup (for example, a denied tool ends up in a scope), the
  `/mcp` route is not mounted and the rest of the API keeps running. Look for `[MCP] /mcp route NOT mounted` in
  the logs.

The global lock and maintenance mode also stop MCP calls. The site-wide "platform access" switch does not,
because it only covers `/api/*`.

---

## 4. Never exposed over MCP

Whatever scopes a token has, these tools are never listed or run (`MCP_NEVER_EXPOSE` in
`server/src/mcp/mcp-scopes.js`, also checked in `mcp-allowlist.js`):

- **Server and code:** terminal (`execute_terminal_command`, `ubuntu`), database queries (`unified_db_query`),
  server logs, local and sandbox files, `run_code`.
- **Knowledge base:** `manage_rag_document`, `search_knowledge_base`, `search_syllabus_vectors`.
- **Platform accounts:** Supabase, Vercel, Sanity, AWS SES, WhatsApp Business, Facebook, Instagram,
  `send_whatsapp_message`.
- **Paid generation:** `generate_image`, `edit_image`, `transcribe_audio`.
- **AI settings and skills:** `update_ai_preferences`, `create_skill`, `update_skill`, `delete_skill`.
- **Staff and platform data:**
  - organizations, global users, recent users, department admins
  - blog subscribers, support tickets, leads, Classgrid Talk admin
  - ERP organization statistics (students, teachers, fees, attendance, classrooms, exams, leave, admissions)

Any tool name containing `support_ticket`, `classgrid_talk`, `lead_`, `_lead`, `blog_subscriber`,
`organization` or `global_user` is also blocked, so new tools in those families are blocked automatically.
Any tool that is not in one of the scopes above is not exposed either.

---

## 5. Not built yet

- A token revoke endpoint for apps (RFC 7009). Users can remove apps under Connected apps.
- Client ID Metadata Documents (CIMD).
- `/.well-known/openid-configuration`.
