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

# 🏁 DAY 1 PROGRESS: Identity Engine & Platform Splitting

**Date:** April 10, 2026  
**Status:** ✅ PHASE 1 COMPLETE — 8/11 tasks done

---

## Files Created / Modified

| # | File | Purpose | Status |
|---|---|---|---|
| 1 | `server/src/models/Organization.js` | Upgraded `org_type` to 6 types + added `structure_type` (7 plans), `division_mode`, `allow_sub_batches`, `subdomain`, `isPaid` | ✅ |
| 2 | `server/src/models/AcademicHierarchy.js` | New model — tree-based hierarchy with `parent_id` for all 7 plans | ✅ |
| 3 | `server/src/utils/terminology.js` | Multi-track dictionary — returns correct labels per `structure_type` | ✅ |
| 4 | `server/src/middleware/hierarchy-validator.middleware.js` | Parser middleware — blocks invalid operations (Coaching requesting Semesters → 400) | ✅ |
| 5 | `server/src/services/admissions/strategy-selector.js` | Admission strategy factory — loads CET/RLA/Merit/FCFS per org type | ✅ |
| 6 | `server/src/controllers/hierarchy.controller.js` | Full CRUD + tree builder + auto-seeder for all 7 plans | ✅ |
| 7 | `server/src/routes/hierarchy.routes.js` | API routes wired to `isAuthenticated` + hierarchy validator | ✅ |
| 8 | `server/api/index.js` | Registered `/api/hierarchy` route | ✅ |

---

## API Endpoints Created

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/hierarchy/tree` | Full tree (nested) or flat list |
| `GET` | `/api/hierarchy/terminology` | Org-specific labels |
| `GET` | `/api/hierarchy/children/:parentId` | Direct children of a node |
| `POST` | `/api/hierarchy/node` | Create hierarchy node (validated) |
| `POST` | `/api/hierarchy/seed` | One-time auto-seed default structure |
| `PATCH` | `/api/hierarchy/node/:nodeId` | Update node name/code/order |
| `DELETE` | `/api/hierarchy/node/:nodeId` | Soft-delete node + descendants |

---

## Schema Changes (Organization.js)

```diff
- org_type: enum: ["SCHOOL", "COLLEGE"]
+ org_type: enum: ["school", "junior_college", "engineering", "coaching", "diploma", "other"]

+ structure_type: enum: 7 plans (engineering, school_with_div, school_no_div, coaching, junior_college, diploma, custom)
+ division_mode: "with_divisions" | "without_divisions"
+ allow_sub_batches: Boolean (for engineering lab splitting)
+ subdomain: String (unique, sparse — for multi-tenant DNS)
+ isPaid: Boolean

- plan: enum: ["free", "pro", "plus"]
+ plan: enum: ["demo", "free", "core", "premium", "enterprise"]
```

---

## Day 1 Checklist

- [x] Upgrade `Organization.js` with `org_type`, `structure_type`, `division_mode`, `allow_sub_batches`
- [x] Build `AcademicHierarchy.model.js` with tree structure
- [x] Create `terminology.js` dictionary
- [x] Write hierarchy validator middleware (blocks invalid requests per org plan)
- [x] Create `strategy-selector.js` for admission flow loading
- [x] Build hierarchy CRUD controller with auto-seeding
- [x] Wire routes into `api/index.js`
- [x] Fix auth middleware import (`isAuthenticated`)
- [x] Atomic Email Reservation model
- [x] BullMQ Provisioning worker
- [ ] Postman test all 7 plans

---

## Remaining Day 1 Tasks

1. **Postman Testing** — Test Create Org → Set structure_type → Verify hierarchy operations
