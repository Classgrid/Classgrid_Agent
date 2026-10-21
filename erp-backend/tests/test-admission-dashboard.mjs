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
 * Admission Dashboard — Backend Endpoint Test
 * Tests: GET /api/admission/analytics
 * Connects to real MongoDB, generates a real JWT for an org_admin user,
 * and verifies the data shape required by the dashboard.
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET = "classgrid_super_secure_jwt_secret_2026";
const MONGO_URI = "mongodb://classgrid-admin:pass123@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid";
const BASE = "http://localhost:3000";

// ── Step 1: Find a real org_admin user in DB ─────────────────────────────────
async function getOrgAdminUser() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  const User = mongoose.connection.collection("users");
  const admin = await User.findOne({ role: "org_admin" });
  await mongoose.disconnect();
  if (!admin) throw new Error("No org_admin user found in DB!");
  return admin;
}

// ── Step 2: Generate a valid JWT ─────────────────────────────────────────────
function makeToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      organization_id: user.organization_id?.toString(),
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

// ── Step 3: Hit endpoint ──────────────────────────────────────────────────────
async function hitEndpoint(token, path, query = "") {
  const url = `${BASE}${path}${query}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Cookie: `token=${token}`,
      },
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text.substring(0, 300); }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, data: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Step 4: Validate the shape of the response ───────────────────────────────
function validateDashboardData(data) {
  const issues = [];

  if (!data.success) issues.push("❌ success flag is false");
  if (data.summary?.total_applications === undefined) issues.push("❌ summary.total_applications missing");
  if (!data.summary?.funnel || typeof data.summary.funnel !== "object") issues.push("❌ summary.funnel missing");
  if (!Array.isArray(data.daily_trend)) issues.push("❌ daily_trend is not an array");
  if (!data.breakdown?.by_category) issues.push("❌ breakdown.by_category missing");
  if (!data.document_summary) issues.push("❌ document_summary missing");
  if (!data.fee_summary) issues.push("❌ fee_summary missing");
  if (!data.merit_rounds_status) issues.push("❌ merit_rounds_status missing");

  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Admission Dashboard — Backend Test");
  console.log("─".repeat(60));

  console.log("Step 1: Connecting to MongoDB to find org_admin user...");
  const user = await getOrgAdminUser();
  console.log(`   ✅ Found: ${user.name || user.email} (role: ${user.role})`);
  console.log(`   ✅ org_id: ${user.organization_id}`);

  const token = makeToken(user);
  console.log(`   ✅ JWT generated\n`);

  console.log("─".repeat(60));
  console.log("Step 2: Testing GET /api/admission/analytics\n");

  // Test 1: No hierarchy filter (all)
  const r1 = await hitEndpoint(token, "/api/admission/analytics");
  const icon1 = r1.ok ? "✅" : "❌";
  console.log(`${icon1} [${r1.status}] GET /api/admission/analytics (all hierarchies)`);
  if (r1.ok) {
    const issues = validateDashboardData(r1.data);
    if (issues.length === 0) {
      const f = r1.data.summary.funnel;
      console.log(`   ✅ total_applications : ${r1.data.summary.total_applications}`);
      console.log(`   ✅ funnel stages      : ${JSON.stringify(f)}`);
      console.log(`   ✅ daily_trend points : ${r1.data.daily_trend.length}`);
      console.log(`   ✅ categories         : ${r1.data.breakdown.by_category.length}`);
      console.log(`   ✅ conversion_rate    : ${r1.data.summary.conversion_rate}`);
      console.log(`   ✅ document_summary   : ${JSON.stringify(r1.data.document_summary)}`);
      console.log(`   ✅ fee_summary        : ${JSON.stringify(r1.data.fee_summary)}`);
      console.log(`   ✅ merit_rounds_status: ${JSON.stringify(r1.data.merit_rounds_status)}`);
    } else {
      issues.forEach(i => console.log(`   ${i}`));
    }
  } else {
    console.log(`   ❌ Error: ${JSON.stringify(r1.data).substring(0, 200)}`);
  }

  console.log();

  // Test 2: With hierarchy_id filter (Engineering simulation)
  const r2 = await hitEndpoint(token, "/api/admission/analytics", "?hierarchy_id=engineering");
  const icon2 = r2.ok ? "✅" : "❌";
  console.log(`${icon2} [${r2.status}] GET /api/admission/analytics?hierarchy_id=engineering`);
  if (r2.ok) {
    console.log(`   ✅ total_applications (engineering): ${r2.data.summary?.total_applications}`);
  } else {
    console.log(`   ❌ Error: ${JSON.stringify(r2.data).substring(0, 200)}`);
  }

  console.log("\n" + "─".repeat(60));
  console.log("✅ Test complete. If all rows above show ✅, backend is READY for frontend.\n");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
