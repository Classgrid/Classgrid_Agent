# Classgrid AI — Repo Summary

**What it is:** An AI agent platform ("do anything with AI") that thinks, uses tools, runs code in a sandbox, and streams every step live. The ERP is shut down; the product is **Classgrid AI** at chat.classgrid.in.

**Three modes:**
- **Agent Mode** — chat with an AI that searches, reads files, runs code, makes things, and schedules reminders.
- **Project Mode** — the agent works inside your GitHub repo with a browser IDE.
- **Grids** — real-time chat: DMs, groups, polls, files.

## Architecture (3 strict zones)

| Zone | Host | Purpose |
|---|---|---|
| `classgrid.in` | Vercel | Public marketing site (no app logic) |
| `[school].classgrid.in` | Vercel | The product (closed, auth-gated) |
| `api.classgrid.in` | AWS EC2 (t3.medium, PM2 + Nginx) | Node.js backend |

## Frontend (`client/`)

- **Stack:** React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, React Markdown, KaTeX, Mermaid, Socket.IO client.
- **Key areas:** `src/components/ai/` (agent chat, step views, Project Mode UI), `src/features/`, `src/store/` (Zustand), `src/lib/`.
- **Build:** `vite build` (runs on Vercel, never on EC2 — OOM risk).

## Backend (`server/`)

- **Stack:** Node.js, Express, MongoDB (Mongoose), Supabase, Redis (BullMQ), Socket.IO, Puppeteer (PDF invoices), Razorpay (payments).
- **Key areas:**
  - `src/controllers/` — chat loop, auth, billing, orgs, schedules, widgets.
  - `src/services/` — model streaming, tools, integrations.
  - `src/mcp/` — tool definitions the agent can call.
  - `src/routes/` — API routes (chat, Grids, voice, connectors).
  - `src/models/` — ~150 Mongoose models (users, orgs, billing, chat, exams, fees).
  - `src/queues/` — BullMQ jobs (alarms, builds).
- **AI:** multi-model streaming across Claude, DeepSeek, GLM, Kimi, Qwen, Mistral, OpenAI, Gemini, Groq.

## Supporting pieces

- `ai-sandbox-worker/` — Cloudflare Worker that runs the agent's code.
- `cloudflare-ocr-sandbox/` — OCR sandbox.
- `android/` — mobile app (Firebase + Play Store).
- `docs/` — architecture and feature plans.

## Billing (Razorpay)

- **B2B SaaS:** 3-layer billing — base fee + add-on modules + usage (R2, SES, SNS, API, AI tokens, Agora minutes).
- **B2C fees:** sub-merchant API; Classgrid never holds institutional funds.

## Golden rules

- Never delete env vars; never test on localhost; production-first.
- Secrets stay only in `server/.env` on EC2 — never in GitHub.
- Frontend deploys on Vercel; backend on EC2 via PM2.