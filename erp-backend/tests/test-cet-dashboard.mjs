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
 * test-cet-dashboard.mjs — Tests the CET/Engineering dashboard endpoint.
 * Run: node test-cet-dashboard.mjs
 */
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = process.env.BACKEND_URL || "http://localhost:5000";

async function main() {
  console.log("🔍 CET Dashboard — Backend Test");
  console.log("─".repeat(60));

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // Find an org_admin user
  const user = await db.collection("users").findOne({ role: "org_admin" });
  if (!user) { console.error("❌ No org_admin found"); process.exit(1); }
  console.log(`   ✅ Found: ${user.name} (org: ${user.organization_id})`);

  const token = jwt.sign(
    { _id: user._id.toString(), role: user.role, organization_id: user.organization_id?.toString() },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  console.log("\n" + "─".repeat(60));
  console.log("Testing GET /api/admission/cet/dashboard\n");

  try {
    const res = await fetch(`${BASE_URL}/api/admission/cet/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log(`✅ [${res.status}] CET Dashboard`);
    console.log(`   ✅ cap_rounds       : ${JSON.stringify(data.cap_rounds || [])}`);
    console.log(`   ✅ branch_fill_rates: ${(data.branch_fill_rates || []).length} branches`);
    console.log(`   ✅ rla_breakdown    : ${JSON.stringify(data.rla_breakdown || [])}`);
    console.log(`   ✅ seat_matrix      : ${data.seat_matrix ? "Present" : "Empty"}`);
  } catch (err) {
    console.error("❌ Request failed:", err.message);
  }

  console.log("\n" + "─".repeat(60));
  console.log("✅ CET Dashboard test complete.\n");
  await mongoose.disconnect();
}

main().catch(console.error);
