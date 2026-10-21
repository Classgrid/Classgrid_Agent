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
 * test-admission-analytics.mjs — Audit of Aggregation & Analytics Endpoints
 * Tests: GET /api/admission/analytics, /api/admission/cet/dashboard
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
    console.log("\n📊 TEST 1: ANALYTICS & DATABASE AGGREGATIONS");
    console.log("═".repeat(60));

    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Get Auth Token
    const user = await db.collection("users").findOne({ role: "org_admin" });
    const token = jwt.sign(
        { id: user._id.toString(), role: user.role, organizationId: user.organization_id?.toString() },
        JWT_SECRET
    );
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const endpoints = [
        { name: "Global Analytics", path: "/api/admission/analytics", method: "GET" },
        { name: "Engineering Dashboard", path: "/api/admission/cet/dashboard", method: "GET" },
        { name: "Live Merit List", path: "/api/admission/direct/merit-list", method: "GET" }
    ];

    for (const ep of endpoints) {
        const start = Date.now();
        try {
            const res = await fetch(`${BASE}${ep.path}`, { method: ep.method, headers });
            const data = await res.json();
            const duration = Date.now() - start;

            console.log(`✅ Test: ${ep.name}`);
            console.log(`   ├─ Endpoint: ${ep.method} ${ep.path}`);
            console.log(`   ├─ Status: ${res.status}`);
            console.log(`   ├─ Response Time: ${duration}ms`);
            
            // Validation Logic
            let dataCheck = "Failed";
            if (res.status === 200) {
                if (ep.path.includes("analytics")) {
                    dataCheck = data.summary?.total_applications !== undefined ? "Passed (Summary/Funnel Found)" : "Missing Summary";
                } else if (ep.path.includes("cet/dashboard")) {
                    dataCheck = data.branch_fill_rates ? "Passed (Branch/CAP stats Found)" : "Missing Stats";
                } else {
                    dataCheck = data.merit_list ? "Passed (Merit Array Found)" : "Empty List";
                }
            }
            console.log(`   └─ Data Validated: ${dataCheck}`);
        } catch (err) {
            console.log(`❌ Test: ${ep.name} FAILED: ${err.message}`);
        }
    }

    console.log("\n" + "═".repeat(60));
    await mongoose.disconnect();
}

runTest().catch(console.error);
