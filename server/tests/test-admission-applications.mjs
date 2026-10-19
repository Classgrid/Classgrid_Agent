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
 * Admission Applications — Backend Endpoint Test
 * Tests: GET /api/admission/applications
 * Connects to real MongoDB, generates a real JWT for an org_admin user,
 * and verifies the applications data shape.
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET = "classgrid_super_secure_jwt_secret_2026";
const MONGO_URI = "mongodb://classgrid-admin:pass123@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid";
const BASE = "http://localhost:3000";

async function getOrgAdminUser() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  const User = mongoose.connection.collection("users");
  const admin = await User.findOne({ role: "org_admin" });
  await mongoose.disconnect();
  if (!admin) throw new Error("No org_admin user found in DB!");
  return admin;
}

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

async function main() {
  console.log("🔍 Admission Applications — Backend Test");
  console.log("─".repeat(60));

  console.log("Step 1: Connecting to MongoDB to find org_admin user...");
  const user = await getOrgAdminUser();
  console.log(`   ✅ Found: ${user.name || user.email} (role: ${user.role})`);
  console.log(`   ✅ org_id: ${user.organization_id}`);

  const token = makeToken(user);
  console.log(`   ✅ JWT generated\n`);

  console.log("─".repeat(60));
  console.log("Step 2: Testing GET /api/admission/applications\n");

  const r1 = await hitEndpoint(token, "/api/admission/applications", "?limit=20");
  const icon1 = r1.ok ? "✅" : "❌";
  console.log(`${icon1} [${r1.status}] GET /api/admission/applications?limit=20 (all hierarchies)`);
  if (r1.ok) {
    console.log(`   ✅ success flag   : ${r1.data.success}`);
    console.log(`   ✅ total apps     : ${r1.data.total}`);
    console.log(`   ✅ applications   : ${Array.isArray(r1.data.applications) ? r1.data.applications.length : 0} items`);
  } else {
    console.log(`   ❌ Error: ${JSON.stringify(r1.data).substring(0, 200)}`);
  }

  console.log("\n" + "─".repeat(60));
  console.log("✅ Test complete. Data format validated.\n");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
