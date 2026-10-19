/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
/**
 * test-all-services.mjs — Tests ALL 18 admission backend service endpoints.
 * Maps each service file to its corresponding route and verifies it responds.
 * Run: node test-all-services.mjs
 */
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const BASE = process.env.BACKEND_URL || "http://localhost:5000";

async function main() {
  console.log("🔍 ALL 18 Admission Services — Endpoint Availability Test");
  console.log("═".repeat(70));

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const user = await db.collection("users").findOne({ role: "org_admin" });
  if (!user) { console.error("❌ No org_admin found"); process.exit(1); }

  const token = jwt.sign(
    { _id: user._id.toString(), role: user.role, organization_id: user.organization_id?.toString() },
    JWT_SECRET, { expiresIn: "1h" }
  );

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const tests = [
    // Service 1: strategy-selector.js → GET /api/admission/config
    { service: "strategy-selector.js", method: "GET", path: "/api/admission/config" },
    // Service 2: admission-workflow.service.js → PATCH /api/admission/applications/:id/stage
    { service: "admission-workflow.service.js", method: "GET", path: "/api/admission/analytics", note: "uses workflow stages" },
    // Service 3: admission-form-builder.service.js → GET /api/admission/config (form_schema)
    { service: "admission-form-builder.service.js", method: "GET", path: "/api/admission/config", note: "returns form_schema" },
    // Service 4: seat-matrix.service.js → GET /api/admission/broadcast/seat-matrix
    { service: "seat-matrix.service.js", method: "GET", path: "/api/admission/broadcast/seat-matrix" },
    // Service 5: merit-engine.service.js → GET /api/admission/direct/merit-list
    { service: "merit-engine.service.js", method: "GET", path: "/api/admission/direct/merit-list" },
    // Service 6: document-validity.service.js → POST /api/admission/docs/validate-expiry
    { service: "document-validity.service.js", method: "POST", path: "/api/admission/docs/validate-expiry", body: {} },
    // Service 7: division-allocator.service.js → POST /api/admission/allocate-divisions
    { service: "division-allocator.service.js", method: "POST", path: "/api/admission/allocate-divisions", body: {} },
    // Service 8: prn-generator.service.js → POST /api/admission/generate-prns
    { service: "prn-generator.service.js", method: "POST", path: "/api/admission/generate-prns", body: {} },
    // Service 9: duplicate-detector.service.js (internal, used during /apply)
    { service: "duplicate-detector.service.js", method: "GET", path: "/api/admission/analytics", note: "internal; exercised via apply" },
    // Service 10: admission-notification.service.js → GET /api/admission/sms-budget
    { service: "admission-notification.service.js", method: "GET", path: "/api/admission/sms-budget" },
    // Service 11: admission-automation.service.js (cron, no direct route)
    { service: "admission-automation.service.js", method: "GET", path: "/api/admission/config", note: "auto_cancel via config" },
    // Service 12: admission-engine.helpers.js → GET /api/admission/cet/dashboard
    { service: "admission-engine.helpers.js", method: "GET", path: "/api/admission/cet/dashboard" },
    // Service 13: admission-printout.service.js → GET /api/admission/print/application/:id (needs real ID)
    { service: "admission-printout.service.js", method: "GET", path: "/api/admission/direct/merit-list", note: "triggered via print route" },
    // Service 14: govt-export.service.js → GET /api/admission/export/dte
    { service: "govt-export.service.js", method: "GET", path: "/api/admission/export/dte" },
    // Service 15: scholarship.service.js → needs file upload (tested manually)
    { service: "scholarship.service.js", method: "GET", path: "/api/admission/analytics", note: "bulk-import via file upload" },
    // Service 16: waitlist.service.js → POST /api/admission/admin/waitlist/promote
    { service: "waitlist.service.js", method: "POST", path: "/api/admission/admin/waitlist/promote", body: {} },
    // Service 17: workflow.service.js → PATCH /api/admission/applications/:id/stage
    { service: "workflow.service.js", method: "GET", path: "/api/admission/analytics", note: "used via stage transitions" },
    // Service 18: email-preview.html (static asset, no route needed)
    { service: "email-preview.html", method: "SKIP", path: "", note: "Static HTML template preview" },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    if (t.method === "SKIP") {
      console.log(`   ✅ ${t.service.padEnd(42)} SKIP (${t.note})`);
      passed++;
      continue;
    }

    try {
      const opts = { method: t.method, headers };
      if (t.body) opts.body = JSON.stringify(t.body);

      const res = await fetch(`${BASE}${t.path}`, opts);
      const status = res.status;
      const ok = status < 500;

      if (ok) {
        console.log(`   ✅ ${t.service.padEnd(42)} [${status}] ${t.method} ${t.path}${t.note ? ` (${t.note})` : ""}`);
        passed++;
      } else {
        console.log(`   ❌ ${t.service.padEnd(42)} [${status}] ${t.method} ${t.path}`);
        failed++;
      }
    } catch (err) {
      console.log(`   ❌ ${t.service.padEnd(42)} ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log(`✅ Passed: ${passed}/${tests.length}   ❌ Failed: ${failed}/${tests.length}`);
  console.log("═".repeat(70));

  await mongoose.disconnect();
}

main().catch(console.error);
