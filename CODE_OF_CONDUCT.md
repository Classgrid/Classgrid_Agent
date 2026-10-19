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

# Classgrid Code of Conduct

> Proprietary and Confidential. This code of conduct applies to private Classgrid repositories, internal collaboration spaces, vendor collaboration, and authorized product development work.

## Our Standard

Classgrid is built by people working on sensitive education technology. Our standard is simple: be respectful, be careful with user and institutional data, communicate clearly, and protect the trust placed in the platform.

Everyone working in this repository is expected to:

- Treat teammates, contributors, partners, customers, and reviewers with professionalism and respect.
- Keep discussions focused on the work, the product, and the institution or user problem being solved.
- Give and receive feedback in a way that improves the system without personal attacks.
- Protect confidential information, credentials, student data, institutional records, business plans, and unreleased product details.
- Escalate security, privacy, safety, compliance, and production-risk concerns quickly.
- Use source control carefully, especially around `.env` files, secrets, keys, logs, database exports, screenshots, and customer data.
- Respect role boundaries, code ownership, and review requirements for production-impacting changes.

## Unacceptable Behavior

The following behavior is not acceptable in any Classgrid collaboration space:

- Harassment, intimidation, insults, threats, or discriminatory language.
- Public or private sharing of confidential repository content without authorization.
- Exposing secrets, credentials, customer data, student data, production logs, payment information, or private infrastructure details.
- Attempting to bypass access controls, review processes, audit trails, or security checks.
- Misrepresenting work, hiding known risks, or intentionally shipping changes that could harm users or institutions.
- Using Classgrid systems, data, or code for unauthorized personal, commercial, competitive, or open-source redistribution purposes.
- Retaliation against anyone who raises a good-faith concern.

## Security and Confidentiality

This repository is not open source. Access to the codebase is granted only to authorized people for approved Classgrid work. Repository access does not grant permission to copy, publish, distribute, reuse, or disclose the code or internal materials.

Before committing or sharing work, verify that:

- No `.env` files are staged.
- No API keys, service account files, private keys, tokens, or passwords are included.
- No database dumps, exports, student records, customer records, payment data, or private screenshots are included.
- No production EC2, database, Redis, Supabase, Firebase, payment, email, AI-provider, or OAuth credentials are exposed.
- Any security-sensitive change has been reviewed by the right owner.

If a secret or private data is exposed, stop and escalate immediately. Do not try to quietly cover it up. Rotate the credential, remove the exposure, document the impact, and notify the responsible owner.

## Engineering Collaboration

Classgrid engineering work should be practical, reviewable, and accountable. Contributors should prefer small commits, clear pull request descriptions, tested behavior, and direct notes about migration or deployment risk.

When reviewing code, focus on correctness, security, maintainability, user impact, and product quality. Ask questions before assuming intent. When receiving review, treat comments as an investment in the platform, not a personal criticism.

## Reporting Concerns

Report conduct, privacy, security, or repository-access concerns to a Classgrid owner, engineering lead, or designated administrator. Include the relevant repository, branch, commit, screenshot, log excerpt, or timeline when it is safe to do so.

Do not include secrets or personal data in issue bodies, chat messages, commit messages, or public comments. Share sensitive evidence only through approved private channels.

## Enforcement

Classgrid may take action when this code of conduct is violated, including requiring changes, removing access, revoking credentials, rotating secrets, deleting exposed data, escalating to leadership, or taking legal or contractual action where appropriate.

Enforcement decisions should be based on impact, intent, urgency, and risk to Classgrid, customers, institutions, students, staff, and production systems.

## Scope

This code of conduct applies to:

- This repository and related private repositories.
- Pull requests, commits, issues, discussions, comments, docs, and review threads.
- Internal chat, planning documents, deployment notes, and incident work connected to Classgrid.
- Authorized contractors, vendors, partners, team members, and collaborators.

## Ownership

Copyright (c) 2026 Classgrid. All rights reserved.

This document does not grant any open-source license or public usage right. The Classgrid platform, code, documentation, architecture, and internal materials remain proprietary and confidential.
