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

# Classgrid FAQ System

Generated from codebase analysis on 2026-05-09.

This file is a content-ready FAQ system for Classgrid. It is based on the repository's actual routes, components, services, dashboards, middleware, and mobile/native shells. It avoids placeholder product claims and notes where a module appears scaffolded or configuration-dependent.

## Platform Summary

Classgrid is a multi-tenant campus management platform for institutions. The codebase includes a Vite React web app, an Express API, MongoDB/Mongoose services, Supabase configuration and migrations, Redis/Socket.io infrastructure, an Expo mobile starter, and a native Android WebView wrapper.

The implemented product surface includes role-based login, organization provisioning, institution admin dashboards, admissions workflows, candidate and parent admission portals, document verification, admission fee/payment flows, merit and seat workflows, fees/exams/library dashboards, super admin billing and tenant management, support tickets, notifications, platform feedback, and integrations for payments, email, push, real-time events, Google, Zoom, Agora, and AI-enabled services.

## Source Areas Scanned

- Client routing and layout: `client/src/app/router.tsx`, `client/src/app/App.tsx`, `client/src/layouts/DashboardLayout.tsx`, `client/src/layouts/DashboardSidebar.tsx`
- Navigation and modules: `client/src/config/sidebar.ts`, `client/src/config/workModules.ts`
- Authentication: `client/src/features/auth/*`, `server/src/routes/auth.routes.js`, `server/src/controllers/auth.controller.js`, `server/src/middleware/auth.middleware.js`
- Admissions: `client/src/features/admission-portal/*`, `client/src/features/admission/*`, `client/src/features/admissions/*`, `server/src/routes/admission.routes.js`, `server/src/services/admissions/strategy-selector.js`
- Dashboards: `client/src/features/org/*`, `client/src/features/student/*`, `client/src/features/faculty/*`, `client/src/features/fees/*`, `client/src/features/exams/*`, `client/src/features/library/*`, `client/src/features/attendance/*`, `client/src/features/hr/*`, `client/src/features/hostel/*`
- Billing and super admin: `client/src/features/superadmin/*`, `server/src/routes/superAdmin.routes.js`
- Support and helpdesk: `server/src/routes/support.routes.js`, `client/src/features/superadmin/pages/SupportTicketsPage.tsx`, super admin helpdesk API methods
- Backend architecture: `server/server.js`, `server/api/index.js`, server middleware, route audit files, worker bootstrap files
- Mobile/native: `mobile/*`, `android/README_MOBILE_READY.md`, Android WebView and Firebase notification services

## Landing Page FAQ Section

Use this section as a two-column landing page FAQ. The left column answers workflow and onboarding questions. The right column answers trust, billing, integrations, support, and technical confidence questions.

### Left Column

#### 1. What happens after an institution starts using Classgrid?

Classgrid is set up around an organization workspace. A super admin can provision the institution, configure its plan and quotas, and connect it to a role-based dashboard. From there, institution admins manage users, departments, admissions, and daily academic operations from their own protected workspace.

Derived from: super admin organization pages, organization detail actions, role-aware auth redirects, dashboard layout, sidebar configuration.

Why this FAQ was added: New buyers need to understand that Classgrid is not a single shared admin panel. It is an organization-scoped platform with tenant workflows.

#### 2. Can Classgrid adapt to different institution types?

Yes. The admissions engine includes strategy presets for schools, coaching centers, junior colleges, diploma institutes, and engineering colleges. Each strategy can use different form fields, required documents, authentication methods, ranking rules, seat types, and workflow variants.

Derived from: `server/src/services/admissions/strategy-selector.js`, admission configuration pages, candidate form engine.

Why this FAQ was added: The codebase includes a large master field and document pool, so this question highlights a real differentiator without inventing features.

#### 3. How does the online admissions workflow work for candidates?

Candidates open the institution's application link, verify their identity, complete a dynamic admission form, upload required documents, pay the configured registration fee when applicable, and track their application status. The portal updates the journey across stages such as draft, applied, under verification, selected, fee pending, confirmed, and enrolled.

Derived from: `CandidatePortalPage.tsx`, `CgWorkflowStage.tsx`, `CgFormEngine.tsx`, `CgDocumentEngine.tsx`, admission routes.

Why this FAQ was added: Admissions is one of the most complete product areas in the codebase and should be prominent on the landing page.

#### 4. Does Classgrid support CET, CAP, and government-reporting workflows?

For engineering and diploma-style admissions, Classgrid includes CET enrollment validation, CET OTP flows, CAP round handling, merit generation, RLA/NOC and upgrade workflows, PRN generation, division allotment, and export routes for reporting formats such as DTE, AICTE, SARAL, and State Board outputs where configured.

Derived from: admission routes, CET-specific portal flows, admission dashboard widgets, strategy selector export flags.

Why this FAQ was added: These workflows are highly specific to the platform and help Classgrid stand out from generic education software.

#### 5. How do parents follow an admission application?

The parent tracker lets a parent sign in with the registered phone number and view the student's application progress, document status, waitlist or fee-pending alerts, and final admission details once available. The tracker is separate from the staff dashboard, so families see only the status information intended for them.

Derived from: `ParentTrackerPage.tsx`, parent admission routes, workflow stage mapping.

Why this FAQ was added: Parent visibility is a trust and support feature, and it reduces repetitive status calls to admissions teams.

#### 6. What do admins see in the dashboard?

Admins see role-specific dashboards. Organization admins see institution totals, enrollment trends, role distribution, branch distribution, and activity. Admission teams see funnel metrics, category distribution, document status, fee collection, merit rounds, seat matrix data, recent applications, and CET-specific indicators when enabled. Department dashboards exist for fees, exams, library, attendance, HR, hostel, and transport workflows.

Derived from: org admin dashboard, admission dashboard, fees/exams/library dashboards, attendance/HR/hostel pages, sidebar role mapping.

Why this FAQ was added: This clarifies that Classgrid is not only an admissions form. It also gives institutions a day-to-day operations layer.

### Right Column

#### 7. How does pricing and billing work?

The codebase supports configurable organization billing rather than a fixed public price table. A super admin can manage plan status, expiry, maximum students, maximum faculty, storage limits, base monthly pricing, per-student pricing, and per-GB storage pricing. Razorpay checkout and payment verification are wired for platform subscription payments.

Derived from: `BillingPage.tsx`, `OrgDetailPage.tsx`, super admin billing API methods, Razorpay subscription endpoints.

Why this FAQ was added: Pricing is present in the platform, but it is configurable per organization, so the answer stays accurate.

#### 8. Which integrations are already wired into Classgrid?

Classgrid includes integration points for Razorpay payments, Firebase phone authentication and push notifications, Google OAuth and Google APIs, Zoom routes and webhooks, Agora real-time media, Redis and Socket.io real-time events, email providers such as Brevo/Nodemailer/Resend, MongoDB, Supabase configuration, and AI provider services used by learning and automation features.

Derived from: package dependencies, server routes, auth controller, Android Firebase messaging service, integration services.

Why this FAQ was added: Integrations are a major trust signal, but the answer frames them as wired integration points because final behavior depends on environment configuration.

#### 9. How does Classgrid handle security and privacy?

Classgrid uses role-based route protection, organization-scoped access, JWT authentication with httpOnly cookies, trusted-device verification, password reset tokens, user and organization status checks, maintenance and global-lock safeguards, Helmet security headers, CORS rules for configured domains, and super admin areas for GDPR/privacy, audit, activity, and backup operations.

Derived from: auth middleware, auth controller, protected client routes, super admin sidebar and pages, server security middleware.

Why this FAQ was added: Security and privacy are buying concerns for schools and colleges, and the codebase includes concrete controls worth explaining.

#### 10. Is Classgrid designed for heavy admission periods?

The admissions API includes server-side search and pagination, route-specific rate limits, cached live merit endpoints, OTP rate limiting, metrics middleware, background workers, and real-time infrastructure through Redis and Socket.io. Candidate document uploads are constrained by type and size, which helps keep admission processing predictable during peak periods.

Derived from: admission routes, rate limiter middleware, metrics middleware, Redis/Socket.io setup, document upload constraints.

Why this FAQ was added: Admission rush periods are a real operational risk, and the repository includes several performance controls.

#### 11. What do students and faculty use after logging in?

Students and faculty receive role-specific workspaces with launchers for academic and campus modules. The configured modules include class work, assignments, internal tests, attendance, curriculum, certificates, leave, events, results, feedback, timetables, examinations, quizzes, holidays, Classgrid AI, library, fees, hostel, canteen, notes marketplace, alumni, profile, live classes, exam tools, and analytics depending on role and availability.

Derived from: `workModules.ts`, student and faculty work pages, sidebar configuration.

Why this FAQ was added: The work-module launcher shows the intended student and faculty experience and helps explain the platform beyond admin use.

#### 12. What support tools are built into the platform?

Classgrid includes support ticket routes, a super admin ticket queue, helpdesk thread APIs, platform feedback and reviews areas, announcements, changelog pages, notifications, and operational tools for super admins. Institutions can use these surfaces to report issues, track status, and keep users informed.

Derived from: support routes, super admin support tickets page, helpdesk API methods, sidebar support links.

Why this FAQ was added: Support is a conversion and retention concern, and the product already has support-related code paths.

## Help Center FAQ Expansion

These 20 FAQs are intended for a help center or support knowledge base. They are grouped by user problem rather than by code module.

### Getting Started

#### 1. How do I onboard a new institution in Classgrid?

Start from the super admin organization area. Create or open the organization record, confirm the institution details, plan status, student and faculty limits, storage quota, billing configuration, and organization admin access. After the admin account is active, the institution admin can enter the dashboard and begin configuring departments, admissions, users, and daily modules.

Derived from: super admin organization list/detail pages, billing controls, organization admin dashboard, authentication activation flow.

Why this FAQ was added: Onboarding is a core administrator workflow and connects provisioning, billing, and auth.

#### 2. What should be configured before opening the admission portal?

Before publishing the admission portal, configure the admission strategy, portal status, application cutoff date, registration fee, document verification requirement, PRN generation, credential dispatch, seat matrix policy, merit list settings, waitlist behavior, fee deadline, and applicant instructions. Engineering and diploma strategies should also confirm CET imports, CAP round settings, ranking behavior, RLA/NOC or upgrade rules, and government export requirements.

Derived from: admission configuration pages, strategy selector org-type defaults, form/document master pools, admission route capabilities.

Why this FAQ was added: It turns the admission setup screens and strategy engine into a practical launch checklist.

### Account and Authentication

#### 3. Which login page should each user use?

Students and faculty use the role-aware institution login flow. Institution admins use the admin login. Platform operators use the super admin login. The frontend also supports forgot-password and reset-password pages, and protected routes redirect users to the correct dashboard based on their role and organization context.

Derived from: auth pages, `RequireAuth.tsx`, auth helpers, router definitions.

Why this FAQ was added: The code has multiple login surfaces, so this prevents users from choosing the wrong entry point.

#### 4. Why am I being asked to verify a new device?

Classgrid can challenge new or untrusted devices with an email OTP. This protects accounts when login activity comes from a device the platform has not seen before. Check the registered email inbox, enter the OTP, and continue. Internal sandbox accounts and trusted devices may bypass this check depending on configuration.

Derived from: auth controller trusted-device logic, email OTP routes, device verification handling.

Why this FAQ was added: Device verification can surprise users unless it is explained as a security feature.

#### 5. What should I do if password reset does not work?

Use the forgot-password flow from the correct login page and open the latest reset email. Reset tokens are time-limited, so request a fresh email if the link has expired. The new password must pass the platform's strength rules. If an institution admin is activating an account for the first time, use the activation link or activation code flow instead of the normal reset flow.

Derived from: forgot/reset password pages, password validation, admin activation and must-reset-password logic.

Why this FAQ was added: Password reset and admin activation are separate flows in the codebase, and users may confuse them.

### Admissions and Candidate Portal

#### 6. Why is the candidate portal closed or unavailable?

The portal may be closed because the institution disabled admissions, the cutoff date has passed, the admission configuration is incomplete, or the organization is inactive, suspended, or under maintenance. Institution admins should check portal status, cutoff date, active configuration, and organization plan/status before asking candidates to apply.

Derived from: candidate portal behavior, admission config fields, auth middleware organization status checks.

Why this FAQ was added: It gives admins a clear troubleshooting path for the most visible admission issue.

#### 7. Why can a CET candidate not continue after entering an enrollment number?

CET-based flows validate the enrollment number before continuing. If validation fails, check that the CET data import is complete, the enrollment number is entered exactly as issued, the candidate belongs to the configured admission cycle, and the portal strategy is set to the correct engineering or diploma workflow. After validation, the candidate may still need email OTP verification.

Derived from: CET validation endpoints, candidate CET auth mode, admission imports.

Why this FAQ was added: CET validation is a specific workflow and a likely support case during admission season.

#### 8. What happens when an uploaded document is rejected?

A rejected document remains visible with the rejection reason. The candidate can upload a corrected file if reupload is allowed for that document. Staff should review documents from the verification queue, approve valid files, reject unclear or incorrect files with a useful reason, and only mark the application verified once required documents are complete.

Derived from: `CgDocumentEngine.tsx`, document verification page, document approval/rejection routes.

Why this FAQ was added: Document rejection is a common edge case and the product exposes both candidate and staff views.

#### 9. Can staff enter walk-in applications from the office desk?

The backend includes desk enrollment and admin enrollment routes for staff-assisted admission workflows. Staff can use these flows when a candidate applies in person or when the institution needs to complete an application on behalf of a student, subject to the admission configuration and role permissions.

Derived from: admission routes for desk enroll/admin enroll, admission role mapping.

Why this FAQ was added: Many institutions still handle walk-ins, and the codebase has routes for staff-assisted entry.

#### 10. How do merit lists, waitlists, and fee deadlines work?

Admission teams can generate merit lists, manage rounds, advance admission stages, promote waitlisted candidates, apply fee deadlines, and monitor live seat or merit data where enabled. A candidate may move from applied to verified, selected, fee pending, confirmed, or enrolled depending on document verification, merit rules, seat allocation, and payment status.

Derived from: admission dashboard, live merit routes, waitlist promotion, fee deadline and stage routes.

Why this FAQ was added: It explains how several admission states connect into one workflow.

#### 11. How can parents track an application without staff access?

Parents use the parent tracker route and authenticate with the registered phone number. The tracker displays a simplified timeline, document status, and action alerts such as waitlist or fee pending messages. It does not expose staff-only tools such as verification actions, bulk updates, exports, or dashboard analytics.

Derived from: parent tracker page, parent routes, workflow display rules.

Why this FAQ was added: It clarifies the boundary between parent visibility and staff permissions.

### Dashboards and Daily Modules

#### 12. How do admission staff find a specific application?

Use the All Applications page to search by applicant name, enrollment number, phone number, or email. Staff can also filter by status, browse division or hierarchy views where available, and use server-side pagination for large application sets. Document teams should use the verification queue when the goal is specifically to approve or reject documents.

Derived from: All Applications page, Document Verification page, admission application list routes.

Why this FAQ was added: Search and filtering are practical daily workflows for admission departments.

#### 13. What do the fees dashboard numbers mean?

The fees dashboard summarizes total collected, total payable, pending amount, overdue balances, paid/partial/unpaid counts, collection rate, payment mode distribution, daily collection trends, recent transactions, and top defaulters. These values come from fee analytics and payment endpoints, so stale or missing numbers usually indicate missing fee data, no recent payments, or an API/configuration issue.

Derived from: fees dashboard page, fee analytics and payment API calls.

Why this FAQ was added: Finance users need a clear reading of dashboard cards and charts.

#### 14. Which department dashboards are available and what do they show?

Exams surfaces upcoming exams, pending results, hall tickets, paper creation, question bank stats, recent exams, and trends. Library shows books, availability, issued/returned/overdue counts, fines, transactions, most-issued books, and defaulters. Attendance, HR, hostel, and transport-style pages are present with dashboard cards for attendance, leave, payroll, residents, rooms, complaints, and routes; some of these currently use static sample data or scaffolding, so production readiness depends on the connected deployment APIs.

Derived from: exams, library, attendance, HR, hostel dashboard pages and dashboard widget components.

Why this FAQ was added: It documents visible department modules while avoiding overstated claims.

### Billing and Payments

#### 15. How do I configure subscription rates and quotas for an institution?

Open the organization detail or billing area as a super admin. Configure the plan type, active/demo state, expiry date, maximum students, maximum faculty, storage limit, base monthly price, per-student price, per-GB storage price, and included free storage. The organization detail page calculates the monthly bill from these values and can launch Razorpay checkout for subscription payment.

Derived from: super admin billing page, organization detail billing card, Razorpay checkout handler.

Why this FAQ was added: Billing exists in the codebase as an admin-configured pricing model, not a public static table.

#### 16. What should I check if a Razorpay payment fails?

First confirm that Razorpay keys are configured for the environment and that the organization or admission fee configuration has a valid payable amount. For subscription payments, retry from the organization billing area and verify that the payment verification endpoint receives the Razorpay payment response. For admission payments, confirm the candidate application is in a fee-eligible state and that the registration fee or admission fee structure is active.

Derived from: Razorpay platform subscription flow, admission payment routes, fee configuration fields.

Why this FAQ was added: Payment failure troubleshooting needs to distinguish platform billing from candidate admission payments.

### Integrations, Notifications, and APIs

#### 17. Which notifications can users receive?

The platform includes notification surfaces in the web app and push notification handling in the Android wrapper. The Firebase messaging service recognizes types such as assignments, grades, live classes, chat, fees, canteen, exams, and announcements, each with deep links into the relevant area. Email infrastructure is also present for OTPs, password resets, digests, and other transactional messages.

Derived from: Android Firebase messaging service, notification routes, email services, auth OTP/reset flows.

Why this FAQ was added: Notifications are user-facing and technically implemented across web, email, and native push paths.

#### 18. What APIs and webhooks are important for integrations?

Important integration points include Razorpay payment verification and webhook-style flows, Zoom OAuth and webhook routes, Google OAuth/API integrations, Firebase authentication and push services, Socket.io real-time events, admission public endpoints, support ticket endpoints, and department analytics APIs. If an integration stops working, check environment variables, provider credentials, callback URLs, webhook secrets, and whether the organization is active.

Derived from: server route mounts, integration dependencies, auth routes, support routes, department API calls.

Why this FAQ was added: It gives technical admins an actionable checklist without exposing internal implementation details to end users.

### Security, Privacy, Troubleshooting, and Support

#### 19. How is access separated between organizations and roles?

Authenticated users carry role and organization context. Protected routes validate the user's token, status, role, and organization state before allowing access. Client routes and sidebar items are also role-aware, so students, faculty, department users, organization admins, and super admins land in different areas and see different navigation options. The product also includes privacy, GDPR/privacy, backups, audit logs, activity logs, rollback, system health, and content moderation surfaces for operational control.

Derived from: auth middleware, protected routes, dashboard layout, sidebar role configuration, super admin privacy and operations pages.

Why this FAQ was added: Multi-tenant separation, role visibility, and operational data controls are central to institutional trust.

#### 20. What should I check before raising a support request?

For empty or stale dashboards, check whether the user has the correct role, the organization is active, the API endpoint is returning data, and the selected module has live records for the period. If the issue remains, create a support ticket where enabled and include the organization name, affected role, module, screenshot, approximate time, and recent action. Super admins can filter tickets by status and priority, inspect replies, and mark tickets resolved.

Derived from: dashboard pages, API usage patterns, auth middleware, support routes, super admin support tickets page, helpdesk API methods.

Why this FAQ was added: It combines practical troubleshooting with the platform's real support ticket workflow.

## Landing Page FAQ Schema JSON-LD

Use this JSON-LD on the landing page if these 12 FAQs are rendered there. Keep the text synchronized with the visible FAQ content.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What happens after an institution starts using Classgrid?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Classgrid is set up around an organization workspace. A super admin can provision the institution, configure its plan and quotas, and connect it to a role-based dashboard. From there, institution admins manage users, departments, admissions, and daily academic operations from their own protected workspace."
      }
    },
    {
      "@type": "Question",
      "name": "Can Classgrid adapt to different institution types?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. The admissions engine includes strategy presets for schools, coaching centers, junior colleges, diploma institutes, and engineering colleges. Each strategy can use different form fields, required documents, authentication methods, ranking rules, seat types, and workflow variants."
      }
    },
    {
      "@type": "Question",
      "name": "How does the online admissions workflow work for candidates?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Candidates open the institution's application link, verify their identity, complete a dynamic admission form, upload required documents, pay the configured registration fee when applicable, and track their application status. The portal updates the journey across stages such as draft, applied, under verification, selected, fee pending, confirmed, and enrolled."
      }
    },
    {
      "@type": "Question",
      "name": "Does Classgrid support CET, CAP, and government-reporting workflows?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For engineering and diploma-style admissions, Classgrid includes CET enrollment validation, CET OTP flows, CAP round handling, merit generation, RLA/NOC and upgrade workflows, PRN generation, division allotment, and export routes for reporting formats such as DTE, AICTE, SARAL, and State Board outputs where configured."
      }
    },
    {
      "@type": "Question",
      "name": "How do parents follow an admission application?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The parent tracker lets a parent sign in with the registered phone number and view the student's application progress, document status, waitlist or fee-pending alerts, and final admission details once available. The tracker is separate from the staff dashboard, so families see only the status information intended for them."
      }
    },
    {
      "@type": "Question",
      "name": "What do admins see in the dashboard?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Admins see role-specific dashboards. Organization admins see institution totals, enrollment trends, role distribution, branch distribution, and activity. Admission teams see funnel metrics, category distribution, document status, fee collection, merit rounds, seat matrix data, recent applications, and CET-specific indicators when enabled. Department dashboards exist for fees, exams, library, attendance, HR, hostel, and transport workflows."
      }
    },
    {
      "@type": "Question",
      "name": "How does pricing and billing work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The codebase supports configurable organization billing rather than a fixed public price table. A super admin can manage plan status, expiry, maximum students, maximum faculty, storage limits, base monthly pricing, per-student pricing, and per-GB storage pricing. Razorpay checkout and payment verification are wired for platform subscription payments."
      }
    },
    {
      "@type": "Question",
      "name": "Which integrations are already wired into Classgrid?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Classgrid includes integration points for Razorpay payments, Firebase phone authentication and push notifications, Google OAuth and Google APIs, Zoom routes and webhooks, Agora real-time media, Redis and Socket.io real-time events, email providers such as Brevo/Nodemailer/Resend, MongoDB, Supabase configuration, and AI provider services used by learning and automation features."
      }
    },
    {
      "@type": "Question",
      "name": "How does Classgrid handle security and privacy?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Classgrid uses role-based route protection, organization-scoped access, JWT authentication with httpOnly cookies, trusted-device verification, password reset tokens, user and organization status checks, maintenance and global-lock safeguards, Helmet security headers, CORS rules for configured domains, and super admin areas for GDPR/privacy, audit, activity, and backup operations."
      }
    },
    {
      "@type": "Question",
      "name": "Is Classgrid designed for heavy admission periods?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The admissions API includes server-side search and pagination, route-specific rate limits, cached live merit endpoints, OTP rate limiting, metrics middleware, background workers, and real-time infrastructure through Redis and Socket.io. Candidate document uploads are constrained by type and size, which helps keep admission processing predictable during peak periods."
      }
    },
    {
      "@type": "Question",
      "name": "What do students and faculty use after logging in?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Students and faculty receive role-specific workspaces with launchers for academic and campus modules. The configured modules include class work, assignments, internal tests, attendance, curriculum, certificates, leave, events, results, feedback, timetables, examinations, quizzes, holidays, Classgrid AI, library, fees, hostel, canteen, notes marketplace, alumni, profile, live classes, exam tools, and analytics depending on role and availability."
      }
    },
    {
      "@type": "Question",
      "name": "What support tools are built into the platform?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Classgrid includes support ticket routes, a super admin ticket queue, helpdesk thread APIs, platform feedback and reviews areas, announcements, changelog pages, notifications, and operational tools for super admins. Institutions can use these surfaces to report issues, track status, and keep users informed."
      }
    }
  ]
}
```

## Suggested UI Data Shape

If this content is later moved into React components, keep the two-column landing page split explicit so the layout remains stable on desktop and easy to stack on mobile.

```ts
export const landingFaqs = {
  left: [
    "What happens after an institution starts using Classgrid?",
    "Can Classgrid adapt to different institution types?",
    "How does the online admissions workflow work for candidates?",
    "Does Classgrid support CET, CAP, and government-reporting workflows?",
    "How do parents follow an admission application?",
    "What do admins see in the dashboard?"
  ],
  right: [
    "How does pricing and billing work?",
    "Which integrations are already wired into Classgrid?",
    "How does Classgrid handle security and privacy?",
    "Is Classgrid designed for heavy admission periods?",
    "What do students and faculty use after logging in?",
    "What support tools are built into the platform?"
  ]
};
```

## Modified Files

- `docs/CLASSGRID_FAQ_SYSTEM.md`

## Assumptions and Boundaries

- A single Markdown file was created because the request ended with "CREATE ONE MD FILE AND GIVE ME."
- No existing FAQ component, FAQ page, or FAQ data file was found during the scan, so this deliverable is written as a source-of-truth content file rather than editing an unknown UI surface.
- Pricing is described as configurable organization billing because the code shows super admin rate and quota controls, not a fixed public pricing table.
- Admissions, candidate portal, parent tracker, super admin billing, support tickets, fees, exams, and library dashboards have clear implementation paths in the scanned code.
- Attendance, HR, hostel, transport, and some common/student/faculty module surfaces appear partly scaffolded or static in the current frontend, so the FAQs avoid claiming they are fully live unless connected in deployment-specific code outside the scanned files.
- The Expo mobile app appears starter/TODO in places. The Android WebView wrapper contains concrete native features such as Firebase push handling, file uploads, biometric prompt support, role locking, external payment/video handling, and deep links.
- Provider integrations depend on environment variables, credentials, callbacks, and deployment configuration. The FAQs describe integration support visible in code, not a guarantee that every provider is active in every deployment.
