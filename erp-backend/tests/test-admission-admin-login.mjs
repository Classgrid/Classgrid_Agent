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
import "dotenv/config";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.ADMISSION_ADMIN_EMAIL || "in@classgrid.in";
const PASSWORD = process.env.ADMISSION_ADMIN_PASSWORD;

if (!PASSWORD) {
  console.error("Set ADMISSION_ADMIN_PASSWORD before running this test.");
  process.exit(1);
}

function timeoutSignal(ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    done: () => clearTimeout(timer),
  };
}

async function request(path, options = {}) {
  const timeout = timeoutSignal();
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: timeout.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { response, body };
  } finally {
    timeout.done();
  }
}

function assertOk(condition, message, details = null) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    if (details) console.error(JSON.stringify(details, null, 2));
    process.exit(1);
  }
  console.log(`PASS ${message}`);
}

console.log(`Testing admission admin account: ${EMAIL}`);

const health = await request("/api/health", { method: "GET" });
assertOk(health.response.ok, "backend health endpoint is reachable", { status: health.response.status, body: health.body });

const checkEmail = await request("/api/auth/check-email", {
  method: "POST",
  body: JSON.stringify({ email: EMAIL }),
});
assertOk(
  checkEmail.response.ok && checkEmail.body?.exists && checkEmail.body?.role === "admission_head",
  "account exists as admission_head",
  { status: checkEmail.response.status, body: checkEmail.body }
);

const login = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
    expectedLoginType: "admin",
    loginTab: "admin",
    rememberMe: false,
  }),
});
assertOk(
  login.response.ok && login.body?.user?.role === "admission_head",
  "login succeeds for admission_head",
  { status: login.response.status, body: login.body }
);

const cookie = login.response.headers.get("set-cookie");
assertOk(Boolean(cookie), "login response sets auth cookie");

const authHeaders = { Cookie: cookie };
const endpoints = [
  "/api/auth/me",
  "/api/admission/analytics",
  "/api/admission/applications?limit=10",
  "/api/admission/config",
  "/api/admission/cet/dashboard",
  "/api/admission/broadcast/seat-matrix",
  "/api/admission/sms-budget",
];

let applications = [];
for (const endpoint of endpoints) {
  const result = await request(endpoint, { method: "GET", headers: authHeaders });
  assertOk(result.response.ok, `${endpoint} returns ${result.response.status}`, {
    status: result.response.status,
    body: result.body,
  });
  if (endpoint.startsWith("/api/admission/applications")) {
    applications = result.body?.applications || [];
  }
}

if (applications[0]?._id) {
  const printResult = await request(`/api/admission/print/application/${applications[0]._id}`, {
    method: "GET",
    headers: authHeaders,
  });
  assertOk(printResult.response.ok, "application print endpoint returns 200", {
    status: printResult.response.status,
    body: printResult.body,
  });
  assertOk(
    Array.isArray(printResult.body?.print_data?.signature_lines) &&
      printResult.body.print_data.signature_lines.some((line) => line.label === "Parent / Guardian Signature"),
    "application printout includes parent/guardian signature line",
    printResult.body?.print_data?.signature_lines
  );
}

console.log("Admission admin login and endpoint test completed.");
