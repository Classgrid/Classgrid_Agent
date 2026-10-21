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
 * test-document-flow.mjs — Audit of Document Management Endpoints
 * Tests: Upload (Mock), View Link, Verification
 */
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const BASE = process.env.BACKEND_URL || "http://localhost:3000";

async function runTest() {
    console.log("\n📁 TEST 2: DOCUMENT UPLOAD & VERIFICATION FLOW");
    console.log("═".repeat(60));

    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const user = await db.collection("users").findOne({ role: "org_admin" });
    const token = jwt.sign(
        { id: user._id.toString(), role: user.role, organizationId: user.organization_id?.toString() },
        JWT_SECRET
    );
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // 1. Test View Link Generation
    const startView = Date.now();
    const resView = await fetch(`${BASE}/api/admission/docs/view?path=test/sample.pdf`, { headers });
    const dataView = await resView.json();
    console.log(`✅ Test: Document Signed URL Generation`);
    console.log(`   ├─ Endpoint: GET /api/admission/docs/view`);
    console.log(`   ├─ Status: ${resView.status}`);
    console.log(`   ├─ Response Time: ${Date.now() - startView}ms`);
    console.log(`   └─ Data Validated: ${dataView.url ? "Passed (Signed URL returned)" : "Failed"}`);

    // 2. Test Verification Endpoint
    const app = await db.collection("admissionapplications").findOne({ organization_id: user.organization_id });
    if (app) {
        const startVerify = Date.now();
        const resVerify = await fetch(`${BASE}/api/admission/admin/verify-doc`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
                application_id: app._id,
                docName: "student_aadhar",
                status: "verified",
                comment: "Test verification"
            })
        });
        console.log(`✅ Test: Admin Document Verification`);
        console.log(`   ├─ Endpoint: PATCH /api/admission/admin/verify-doc`);
        console.log(`   ├─ Status: ${resVerify.status}`);
        console.log(`   ├─ Response Time: ${Date.now() - startVerify}ms`);
        console.log(`   └─ Data Validated: ${resVerify.status === 200 ? "Passed (Status updated)" : "Failed"}`);
    } else {
        console.log("⚠️ Skipped Verification test: No application found in DB.");
    }

    console.log("\n" + "═".repeat(60));
    await mongoose.disconnect();
}

runTest().catch(console.error);
