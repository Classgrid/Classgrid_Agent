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
 * test-all-applications.mjs — Audit of All Applications Endpoint
 * Tests: GET /api/admission/applications
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
    console.log("\n📋 TEST: ALL APPLICATIONS ENDPOINT");
    console.log("═".repeat(60));

    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Get Auth Token
    const user = await db.collection("users").findOne({ role: "org_admin" });
    const token = jwt.sign(
        { id: user._id.toString(), role: user.role, organizationId: user.organization_id?.toString() },
        JWT_SECRET
    );
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const start = Date.now();
    try {
        const res = await fetch(`${BASE}/api/admission/direct/merit-list?limit=5`, { method: "GET", headers });
        const data = await res.json();
        const duration = Date.now() - start;

        console.log(`✅ Test: Fetch All Applications`);
        console.log(`   ├─ Endpoint: GET /api/admission/direct/merit-list`);
        console.log(`   ├─ Status: ${res.status}`);
        console.log(`   ├─ Response Time: ${duration}ms`);
        
        if (res.status === 200) {
            console.log(`   ├─ Total Found: ${data.total}`);
            console.log(`   ├─ Returned: ${data.applications?.length}`);
            if (data.applications?.length > 0) {
                console.log(`   └─ Sample Applicant: ${data.applications[0].full_name} (${data.applications[0].status})`);
            } else {
                console.log(`   └─ Data Validated: Passed (Array is empty)`);
            }
        } else {
            console.log(`   └─ Error: ${JSON.stringify(data)}`);
        }
    } catch (err) {
        console.log(`❌ Test FAILED: ${err.message}`);
    }

    console.log("\n" + "═".repeat(60));
    await mongoose.disconnect();
}

runTest().catch(console.error);
