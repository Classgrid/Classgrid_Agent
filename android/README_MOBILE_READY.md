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

# Android and Mobile Readiness

This folder stays native-only. Web platform code must stay in `client/`.

## Current boundary
- `client/`: React + Vite + TSX platform frontend
- `android/`: native Android prep artifacts
- `apps/mobile` (future): React Native app for student/faculty

## React Native kickoff checklist
1. Lock app id and signing strategy for production.
2. Decide environment strategy for API base URLs and Firebase keys.
3. Finalize auth token refresh flow shared with backend.
4. Define student/faculty screen scope for v1.
5. Add CI lanes for Android build and smoke tests.
