<!--
─────────────────────────────────────────────────────────
🚨 HOSTING & ARCHITECTURE RULE 🚨
1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
2. FRONTEND IS HOSTED ON VERCEL
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 NAMING CONVENTION RULE 🚨
1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 CRITICAL AI AND SYSTEM RULES 🚨
1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
─────────────────────────────────────────────────────────
-->

<div align="center">
  <img src="./client/public/logos/logo.png" alt="Classgrid logo" width="128" />

  <h1>Classgrid | Platform Desktop</h1>

  <p>
    <strong>The operating system for Educational Institutions - built for institutions, real-time learning, and scale.</strong>
  </p>

  <p>
    <a href="https://www.classgrid.in">Website</a>
    &middot;
    <a href="https://www.classgrid.in/blog">Blog</a>
    &middot;
    <a href="https://www.classgrid.in/case-studies">Case Studies</a>
    &middot;
    <a href="https://www.classgrid.in/changelog">Changelog</a>
    &middot;
    <a href="https://github.com/Classgrid/Classgrid_marketting">Marketing Repo</a>
    &middot;
    <a href="./CODE_OF_CONDUCT.md">Code of Conduct</a>
  </p>

  <p>
    <img alt="React 19" src="https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
    <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Runtime-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
    <img alt="Express" src="https://img.shields.io/badge/Express-API-000000?style=for-the-badge&logo=express&logoColor=white" />
    <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-NoSQL-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
    <img alt="Redis" src="https://img.shields.io/badge/Redis-Queues-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
    <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
    <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-AI-412991?style=for-the-badge&logo=openai&logoColor=white" />
    <img alt="Groq" src="https://img.shields.io/badge/Groq-Inference-F55036?style=for-the-badge" />
    <img alt="Gemini" src="https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white" />
    <img alt="Razorpay" src="https://img.shields.io/badge/Razorpay-Payments-0C72E9?style=for-the-badge&logo=razorpay&logoColor=white" />
    <img alt="Agora" src="https://img.shields.io/badge/Agora-Live_Class-099DFD?style=for-the-badge" />
    <img alt="Expo" src="https://img.shields.io/badge/Expo-Mobile-000020?style=for-the-badge&logo=expo&logoColor=white" />
    <img alt="AWS EC2" src="https://img.shields.io/badge/AWS-EC2-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" />
    <img alt="Nginx" src="https://img.shields.io/badge/Nginx-Proxy-009639?style=for-the-badge&logo=nginx&logoColor=white" />
    <img alt="PM2" src="https://img.shields.io/badge/PM2-Process_Manager-2B037A?style=for-the-badge" />
    <img alt="Vercel" src="https://img.shields.io/badge/Vercel-Edge-000000?style=for-the-badge&logo=vercel&logoColor=white" />
    <img alt="Cloudflare R2" src="https://img.shields.io/badge/Cloudflare-R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" />

  </p>
</div>

---

> Proprietary and Confidential. This repository is private and is not open source.

Classgrid Platform Desktop is the private monorepo for the Classgrid education operating system. It combines a React web application, an Express API, shared packages, mobile/Android workspaces, and deployment assets for running the platform across development, Vercel, and AWS EC2 environments.

This codebase contains business logic, product strategy, platform architecture, and integration code owned by Classgrid. Do not copy, redistribute, mirror, sell, sublicense, or publish any part of this repository without written permission from Classgrid.

## Product Scope

Classgrid is built for institutions that need one connected platform for teaching, learning, admissions, administration, communication, automation, and analytics. The platform includes classroom management, attendance, notes, assignments, live and recorded learning, admissions workflows, fees, payroll, canteen operations, support, public organization websites, AI-assisted academic tools, internal admin operations, and real-time communication.

The system is designed as a multi-tenant platform. Organizations can operate with separate users, roles, academic structures, classroom data, public pages, and operational workflows while sharing a common platform backend and frontend shell.

## Repository Map

```text
classgrid_platform/
|-- client/                  # React 19 + Vite web application
|   |-- src/
|   |   |-- app/             # App-level composition
|   |   |-- components/      # Reusable UI components
|   |   |-- config/          # Frontend configuration
|   |   |-- features/        # Product feature modules
|   |   |-- hooks/           # React hooks
|   |   |-- layouts/         # Shared layouts
|   |   |-- lib/             # API clients, Firebase, Supabase, helpers
|   |   |-- styles/          # Global and feature styling
|   |   |-- types/           # TypeScript types
|   |   `-- utils/           # Frontend utilities
|   |-- package.json
|   `-- vite.config.js
|
|-- server/                  # Node.js + Express API
|   |-- api/                 # Serverless/API entry surface
|   |-- config/              # Runtime configuration and database setup
|   |-- src/
|   |   |-- config/          # Service clients and adapters
|   |   |-- controllers/     # Request handlers
|   |   |-- middleware/      # Auth, validation, tenancy, uploads, limits
|   |   |-- models/          # MongoDB/Mongoose domain models
|   |   |-- routes/          # Express route modules
|   |   |-- scripts/         # Operational scripts
|   |   |-- services/        # Business logic and third-party integrations
|   |   |-- sql/             # SQL/Supabase setup assets
|   |   |-- utils/           # Backend utilities
|   |   `-- workers/         # Background workers
|   |-- migrations/          # Deployment/runtime migrations
|   |-- ecosystem.config.cjs # PM2 process and deploy configuration
|   |-- server.js            # Node runtime entry point
|   `-- package.json
|
|-- mobile/                  # Expo React Native mobile app
|-- android/                 # Android-specific workspace/assets
|-- packages/                # Shared packages such as types and design tokens
|-- docs/                    # Architecture, audit, and planning docs
|-- scripts/                 # Root-level utility scripts
|-- supabase/                # Supabase-related setup
|-- marketing_content/       # Product and marketing content drafts
|-- package.json             # Root monorepo scripts
`-- README.md
```

## Technology Stack

### Frontend

- React 19, React DOM, React Router DOM v7
- Vite 7, TypeScript, ESLint
- Tailwind CSS, Radix UI, shadcn-style components, Base UI
- Zustand, SWR, TanStack Query, TanStack Table
- Framer Motion, Motion, GSAP, Recharts, Embla Carousel
- Tiptap, Monaco Editor, KaTeX, MathQuill, React Markdown
- Firebase client SDK, Supabase client SDK
- HTML5 QR code, webcam, image compression, XLSX workflows

### Backend

- Node.js, Express, ESM modules
- MongoDB with Mongoose
- Supabase clients for chat, storage, subscribers, relational data, and vector workflows
- Socket.IO for real-time collaboration and communication
- Redis/ioredis and BullMQ for caching, queues, pub/sub, and workers
- Passport, JWT, sessions, cookies, bcrypt, role-based middleware
- Helmet, rate limiting, validation, upload middleware, structured logging
- Nodemailer, Brevo/SMTP, Resend for email flows
- Razorpay for payment workflows
- Agora, Zoom, Google APIs, Firebase Admin, AWS S3-related integrations
- OpenAI, Anthropic, Google GenAI/Gemini, Groq, Hugging Face for AI workflows
- Puppeteer, PDF tooling, XLSX tooling, cron jobs, background workers

### Mobile

- Expo 54, React Native 0.81, Expo Router
- React Navigation, React Query, Zustand
- Secure Store, MMKV, splash screen, fonts, haptics, web browser support
- EAS build scripts for Android preview, production, and development builds

### Infrastructure

- Frontend: Vercel or equivalent static/edge hosting for the Vite build
- Backend: AWS EC2 running Node.js behind Nginx
- Process manager: PM2 using `server/ecosystem.config.cjs`
- Database: MongoDB Atlas or managed MongoDB-compatible deployment
- Additional data/storage: Supabase, Firebase, AWS S3-compatible storage where configured
- Cache/queues/realtime scaling: Redis
- Domains and TLS: Nginx reverse proxy with HTTPS certificates

## Key Platform Areas

- Authentication, OAuth, organization onboarding, role-based access, and device verification
- Super admin operations, organization provisioning, subscriptions, plan controls, audits, and platform health
- Classroom creation, memberships, chat, threads, announcements, assignments, notes, quizzes, marks, attendance, timetable, results, and video learning
- Admissions engine, CET/direct tracks, applicant documents, verification, merit workflows, seat configuration, fee initiation, and enrollment
- Fees, ledgers, payroll, canteen, marketplace, support tickets, feedback, CRM, leads, and public organization websites
- AI-assisted chat, quiz generation, OCR, proctoring, viva, past-paper analysis, learning assistance, and embeddings
- Real-time communication through Socket.IO, Agora, Zoom, push notifications, email, and SMS

## Local Development

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB connection string
- Redis instance when testing workers, queues, realtime scaling, or rate-limit backed flows
- Supabase project credentials for modules that use Supabase
- Firebase credentials for Firebase-backed features
- Provider credentials for OAuth, AI, email, SMS, video, and payments as needed

### Install

```bash
npm run install:all
```

### Run full stack

```bash
npm run dev
```

This starts the backend and frontend from the root workspace using the existing root scripts.

### Run individually

```bash
npm run dev:server
npm run dev:client
```

### Build frontend

```bash
cd client
npm run build
```

### Start backend directly

```bash
cd server
npm start
```

## Environment Variables

Never commit real environment files or credentials. The local backend file is `server/.env`, and it must stay only on the developer machine or EC2 instance. The repository `.gitignore` excludes local env files, build outputs, logs, private keys, and sensitive service-account JSON.

Minimum production backend variables:

```text
MONGO_URI
JWT_SECRET
COOKIE_SECRET
NODE_ENV
PORT
```

Common backend variables by area:

```text
APP URLS:
BACKEND_URL
CLIENT_URL
FRONTEND_URL
PUBLIC_SITE_URL
MARKETING_SITE_URL

DATABASE AND CACHE:
MONGO_URI
MONGODB_URI
REDIS_URL

SUPABASE:
SUPABASE_CHAT_URL
SUPABASE_CHAT_KEY
CLASSROOM_SUPABASE_URL
CLASSROOM_SUPABASE_SERVICE_ROLE_KEY
BLOG_SUPABASE_URL
BLOG_SUPABASE_SERVICE_ROLE_KEY

AUTH AND OAUTH:
JWT_SECRET
COOKIE_SECRET
SUPER_ADMIN_EMAIL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
GOOGLE_CALLBACK_URL_PROD
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_CALLBACK_URL
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET
FACEBOOK_CALLBACK_URL
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
LINKEDIN_CALLBACK_URL

EMAIL:
BREVO_SMTP_HOST
BREVO_SMTP_PORT
BREVO_SMTP_USER
BREVO_SMTP_PASS
BREVO_SENDER_NAME
BREVO_SENDER_EMAIL

AI:
OPENAI_API_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY
GROQ_API_KEY
HUGGINGFACE_API_KEY

COMMUNICATION AND VIDEO:
AGORA_APP_ID
AGORA_APP_CERTIFICATE
AGORA_CUSTOMER_ID
AGORA_CUSTOMER_SECRET
ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET
ZOOM_REDIRECT_URI
ZOOM_WEBHOOK_SECRET_TOKEN
AWS_SNS_ACCESS_KEY_ID

PAYMENTS:
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET

STORAGE AND SECURITY:
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET_NAME
FIREBASE_SERVICE_ACCOUNT_JSON
ENCRYPTION_KEY
CRON_SECRET
TURNSTILE_SECRET_KEY
CLOUDFLARE_TURNSTILE_SECRET_KEY
```

Common frontend variables:

```text
VITE_API_BASE_URL
VITE_MOCK_API
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Only variables intended for browser exposure should use `VITE_` or `NEXT_PUBLIC_` names. Backend secrets must stay server-side.

## EC2 Deployment Notes

The backend is designed to run on AWS EC2 as a Node.js service managed by PM2. A typical production EC2 setup is:

```text
User: ubuntu
Application path: /home/ubuntu/classgrid/current
Backend path: /home/ubuntu/classgrid/current/server
PM2 app name: classgrid
Backend port: 3000
Health check: http://localhost:3000/api/health
Logs: /home/ubuntu/classgrid/logs and server/logs
```

Recommended EC2 production flow:

```bash
cd /home/ubuntu/classgrid/current
git pull origin main

cd server
npm ci --production
pm2 reload ecosystem.config.cjs --env production --update-env
pm2 save
```

Recommended Nginx shape:

```text
HTTPS request
-> Nginx reverse proxy
-> http://127.0.0.1:3000
-> Express API
```

Operational checks after deployment:

```bash
pm2 status
pm2 logs classgrid --lines 50
curl -i http://localhost:3000/api/health
```

Environment setup on EC2:

- Keep `server/.env` on the EC2 machine only.
- Do not place production secrets in GitHub, README files, screenshots, issue comments, or commit messages.
- Rotate credentials immediately if a secret is ever exposed.
- Keep Nginx, PM2, Node.js, and system packages updated.
- Use HTTPS for public traffic and keep security groups limited to required ports.

## Git and Source-Control Rules

- This repository is private and proprietary.
- Do not commit `.env`, secret JSON, private keys, generated logs, build outputs, or temporary screenshots.
- Review `git status --short` before every commit.
- Use `git check-ignore -v server/.env` before pushing when working near backend secrets.
- Prefer small, meaningful commits when possible.
- Use clear commit messages that describe product or engineering changes without exposing credentials.

## Conduct and Collaboration

All authorized collaborators must follow the [Classgrid Code of Conduct](./CODE_OF_CONDUCT.md). It covers professional collaboration, confidentiality, secret handling, private-repository access, security escalation, and enforcement expectations for Classgrid work.

## Deployment Targets

The codebase supports multiple runtime surfaces:

- Local development from the monorepo root
- Vite frontend builds from `client/`
- Node/Express backend from `server/`
- EC2 backend runtime with PM2 and Nginx
- Vercel-style frontend or API deployment surfaces where configured
- Expo/EAS mobile builds from `mobile/`

## Security Checklist

Before pushing or deploying:

- Confirm `server/.env` is ignored.
- Confirm no secret values appear in staged files.
- Confirm no service-account JSON, PEM, private key, or local token file is staged.
- Confirm production environment variables are set on EC2 or the deployment platform.
- Confirm `NODE_ENV=production` for production backend runtime.
- Confirm `/api/health` returns a healthy response after deploy.

## Ownership and License

Copyright (c) 2026 Classgrid. All rights reserved.

This software is proprietary and confidential. It is not open source. No license is granted for public use, redistribution, modification, or commercial use unless Classgrid provides explicit written permission.
