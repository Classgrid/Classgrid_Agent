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
 * Super Admin Route Verification Script
 * Hits every backend API endpoint with a real super_admin JWT
 * and prints proof of real data returned.
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET = "classgrid_super_secure_jwt_secret_2026";
const MONGO_URI = "mongodb://classgrid-admin:pass123@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid";
const BASE = "http://localhost:3000";

// ─── Step 1: Connect to DB and find the specific support@classgrid.in user ──
async function getSuperAdminUser() {
  await mongoose.connect(MONGO_URI);
  const User = mongoose.connection.collection("users");
  const admin = await User.findOne({ email: "support@classgrid.in" });
  await mongoose.disconnect();
  if (!admin) throw new Error("support@classgrid.in user not found in DB!");
  return admin;
}

// ─── Step 2: Generate a valid JWT ────────────────────────────────────────
function makeToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

// ─── Step 3: Hit an endpoint and return summary ──────────────────────────
async function hitEndpoint(token, method, path, body = null) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Cookie: `token=${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text.substring(0, 200); }

    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, data: err.message };
  }
}

// ─── Step 4: Summarize result ────────────────────────────────────────────
function summarize(label, result) {
  const icon = result.ok ? "✅" : "❌";
  const status = result.status;

  let proof = "";
  const d = result.data;

  if (typeof d === "string") {
    proof = d.substring(0, 80);
  } else if (d?.success === true || d?.totalUsers !== undefined || d?.totalOrgs !== undefined) {
    // Extract meaningful data counts
    if (d.data && Array.isArray(d.data)) proof = `${d.data.length} records`;
    else if (d.users && Array.isArray(d.users)) proof = `${d.users.length} users`;
    else if (d.leads && Array.isArray(d.leads)) proof = `${d.leads.length} leads`;
    else if (d.tickets && Array.isArray(d.tickets)) proof = `${d.tickets.length} tickets`;
    else if (d.entries && Array.isArray(d.entries)) proof = `${d.entries.length} entries`;
    else if (d.flags && Array.isArray(d.flags)) proof = `${d.flags.length} flags`;
    else if (d.errors && Array.isArray(d.errors)) proof = `${d.errors.length} errors`;
    else if (d.notifications && Array.isArray(d.notifications)) proof = `${d.notifications.length} notifications`;
    else if (d.health) proof = `overall: ${d.health.overall}, uptime: ${Math.floor(d.health.uptime)}s`;
    else if (d.totalUsers !== undefined) proof = `totalUsers=${d.totalUsers}, totalOrgs=${d.totalOrgs}`;
    else if (d.data && typeof d.data === "object") proof = JSON.stringify(d.data).substring(0, 100);
    else proof = JSON.stringify(d).substring(0, 100);
  } else if (Array.isArray(d)) {
    proof = `${d.length} records (array)`;
  } else if (d?.message) {
    proof = d.message;
  } else {
    proof = JSON.stringify(d).substring(0, 100);
  }

  console.log(`${icon} [${status}] ${label.padEnd(45)} → ${proof}`);
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Super Admin Route Verification");
  console.log("─".repeat(80));
  console.log("Step 1: Connecting to MongoDB to find super_admin user...");

  const user = await getSuperAdminUser();
  console.log(`   Found: ${user.name} (${user.email})`);

  const token = makeToken(user);
  console.log(`   JWT generated for: ${user.email}\n`);
  console.log("─".repeat(80));
  console.log("Step 2: Hitting every Super Admin API endpoint...\n");

  // ─── SUPER ADMIN ROUTES (/api/super-admin/*) ────────────────
  const tests = [
    // Health & System
    ["GET",  "/api/super-admin/health",                   "Health Check"],
    ["GET",  "/api/super-admin/system-metrics",           "System Metrics"],
    ["GET",  "/api/super-admin/error-logs",               "Error Logs"],

    // Organizations
    ["GET",  "/api/super-admin/organizations",            "All Organizations"],
    
    // Users
    ["GET",  "/api/super-admin/users",                    "Global Users"],

    // Feature Flags
    ["GET",  "/api/super-admin/feature-flags",            "Feature Flags"],

    // Leads
    ["GET",  "/api/super-admin/leads",                    "Demo Leads"],

    // Revenue
    ["GET",  "/api/super-admin/revenue",                  "Platform Revenue"],

    // Transactions
    ["GET",  "/api/super-admin/transactions",             "Transactions"],

    // Content Reports
    ["GET",  "/api/super-admin/content-reports",          "Content Reports"],

    // Feedback
    ["GET",  "/api/super-admin/feedback",                 "Platform Feedback"],

    // Activity Logs
    ["GET",  "/api/super-admin/activity-logs",            "Activity / Audit Logs"],

    // Team
    ["GET",  "/api/super-admin/team",                     "Platform Team"],

    // Notifications
    ["GET",  "/api/super-admin/scheduled-notifications",  "Scheduled Notifications"],

    // Helpdesk
    ["GET",  "/api/super-admin/helpdesk/threads",         "Helpdesk Threads"],

    // Rollback
    ["GET",  "/api/super-admin/rollback/candidates",      "Rollback Candidates"],

    // Backup
    ["GET",  "/api/super-admin/backup/stats",             "Backup Stats"],
    ["GET",  "/api/super-admin/backup/integrity",         "Backup Integrity"],

    // ─── ADMIN ROUTES (/api/admin/*) ────────────────────────────
    ["GET",  "/api/admin/dashboard/overview",             "Dashboard Overview"],
    ["GET",  "/api/admin/dashboard/organizations",        "Dashboard Organizations"],
    ["GET",  "/api/admin/dashboard/users",                "Dashboard Users"],
    ["GET",  "/api/admin/dashboard/activity",             "Dashboard Activity"],
    ["GET",  "/api/admin/all-users",                      "All Users (legacy)"],
    ["GET",  "/api/admin/dashboard-analytics",            "Dashboard Analytics"],
    ["GET",  "/api/admin/email-logs",                     "Email Logs"],

    // ─── SUPPORT ROUTES (/api/support/*) ────────────────────────
    ["GET",  "/api/support/admin/tickets",                "Support Tickets (admin)"],

    // ─── OTHER ROUTES ───────────────────────────────────────────
    ["GET",  "/api/reviews",                              "Public Reviews"],
    ["GET",  "/api/changelog",                            "Changelog"],
  ];

  for (const [method, path, label] of tests) {
    const result = await hitEndpoint(token, method, path);
    summarize(label, result);
  }

  console.log("\n" + "─".repeat(80));
  console.log("✅ Verification complete. Check results above.\n");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
