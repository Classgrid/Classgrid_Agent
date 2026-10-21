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
import assert from "node:assert/strict";

import {
  TenantResolutionError,
  attachTenantContext,
  extractSubdomainSlugFromHostname,
  extractTenantSlugFromRequest,
  fetchTenantInfoBySlug,
  resolveTenantContextFromRequest,
} from "../services/tenant-service/index.js";

assert.equal(extractSubdomainSlugFromHostname("pccoe.classgrid.in"), "pccoe");
assert.equal(extractSubdomainSlugFromHostname("https://pccoe.classgrid.in:443"), "pccoe");
assert.equal(extractSubdomainSlugFromHostname("pccoe.localhost:3000"), "pccoe");
assert.equal(extractSubdomainSlugFromHostname("app.classgrid.in"), "");
assert.equal(extractSubdomainSlugFromHostname("nested.pccoe.classgrid.in"), "");

assert.equal(
  extractTenantSlugFromRequest({
    headers: {
      "x-forwarded-host": "pccoe.classgrid.in",
      host: "api.classgrid.in",
    },
  }),
  "pccoe",
);

let capturedUrl = "";
const tenantContext = await fetchTenantInfoBySlug("pccoe", {
  tenantInfoUrl: "https://api.classgrid.in/api/tenant/info",
  fetchImpl: async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        tenant: {
          id: "org_123",
          name: "PCCOE",
          subdomain: "pccoe",
          org_type: "engineering",
        },
      }),
    };
  },
});

const requestUrl = new URL(capturedUrl);
assert.equal(requestUrl.origin, "https://api.classgrid.in");
assert.equal(requestUrl.pathname, "/api/tenant/info");
assert.equal(requestUrl.searchParams.get("slug"), "pccoe");
assert.equal(tenantContext.tenantId, "org_123");
assert.equal(tenantContext.org_type, "engineering");

const req = {};
const res = { locals: {} };
attachTenantContext(req, res, tenantContext);
assert.equal(req.tenantId, "org_123");
assert.equal(req.org_type, "engineering");
assert.equal(req.tenantSlug, "pccoe");
assert.equal(res.locals.tenantId, "org_123");
assert.equal(res.locals.org_type, "engineering");

const resolvedFromRequest = await resolveTenantContextFromRequest(
  { headers: { host: "pccoe.classgrid.in" } },
  {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        tenant: {
          tenantId: "org_456",
          subdomain: "pccoe",
          org_type: "junior_college",
        },
      }),
    }),
  },
);
assert.equal(resolvedFromRequest.tenantId, "org_456");
assert.equal(resolvedFromRequest.org_type, "junior_college");

await assert.rejects(
  fetchTenantInfoBySlug("missing", {
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      json: async () => ({ success: false, message: "Organization not found." }),
    }),
  }),
  (error) =>
    error instanceof TenantResolutionError &&
    error.status === 404 &&
    error.code === "TENANT_NOT_FOUND",
);

console.log("tenant-service tests passed");
