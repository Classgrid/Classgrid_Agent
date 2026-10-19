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

# Classgrid Support System & Classgrid Talk Summary

This document summarizes the exact state and implementation details of the Classgrid Support System and Classgrid Talk features on the Node.js / Express backend. Use this as context when building the Admin Dashboard or modifying related features.

## 1. Core Endpoints
- **Public Reply (No Auth):** `POST /api/support/public/tickets/:id/reply`
  - Fetches user role dynamically via email.
  - Generates email to Admin.
- **Admin Reply:** `POST /api/support/tickets/:id/reply`
  - If `resolve: true` is passed in the body, it immediately marks the ticket as `resolved` *before* sending the email.
  - Automatically changes status to `in_progress` if not resolved.
  - Pushes an event labeled `<Role> replied` (e.g., "Student replied" or "Admin replied").
- **Admin Update (PATCH):** `PATCH /api/support/admin/tickets/:id`
  - Used for changing status (e.g., to `resolved`), priority, category, or reassigning tickets.
- **Cron Auto-Close:** `GET /api/cron/auto-close-tickets`
  - Closes any ticket that has been `resolved` for more than 7 days. Runs via cron-job.org or Vercel cron.

## 2. Activity History (Event Labels)
In `SupportTicket.events`, we dynamically store the user's role:
- When a user replies, we fetch their account from the DB and push: `label: "Student replied"`, `actorName: "Rahul"`.
- When an admin replies, we push: `label: "Admin replied"`, `actorName: "Nikhil Shinde"`.

## 3. Email Templates (`support-ticket-email.service.js`)
We use Brevo to send emails via a background queue. There are 4 primary emails:

### Normal Support Tickets
1. **Ticket Received:** Sent when a user raises a ticket.
2. **Ticket Replied (Admin to User):** Includes the **Full Activity History**. The history iterates over `ticket.events` and appends `by [actorName]` (e.g., *11:43 PM - Student replied by Rahul*).

### Classgrid Talk (Premium Consultation)
3. **Talk Request Received:** Sent when the user requests a consultation.
4. **Talk Request Replied (Admin to User):**
   - **Crucial Difference:** Talk emails do **NOT** include an Activity History. It is designed to feel like a direct, 1-on-1 email from a specialist.
   - It includes a Conversation Summary, the Specialist's custom message, and a footer with the Specialist's name, avatar, and a **Blue Verified Badge**.
   - It never uses terms like "Ticket" or "Admin replied".

## 4. Pending Cleanup
After final E2E testing, the following temporary scratchpad scripts in the `server/` directory should be safely deleted:
- `test-api-live.cjs`
- `force_resolve.js`
- `read_ticket.js`
- `check_db.js`
- `find_nikhil.cjs`
- `reopen_ticket.js`
- `reply_combined.js`
- `send_4_emails_now.js`
- `instant_reply.js`
- `trigger_reply_local.js`
- `update_ui.js`
- `test-support-emails.js`
- `src/services/classgrid-talk.tmp.js`

## Next Steps
- Build the **Admin Support Dashboard** on the frontend.
- Implement the UI to view the ticket thread and a "Resolve" button that hits the `PATCH /admin/tickets/:id` endpoint.
