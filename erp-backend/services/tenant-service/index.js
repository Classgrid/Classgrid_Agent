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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */
const DEFAULT_PLATFORM_API_BASE_URL = "https://api.classgrid.in";
const TENANT_INFO_PATH = "/api/tenant/info";
const DEFAULT_TIMEOUT_MS = 5000;

export const RESERVED_TENANT_SUBDOMAINS = new Set([
  "127",
  "admin",
  "api",
  "app",
  "classgrid",
  "dev",
  "ftp",
  "localhost",
  "mail",
  "staging",
  "www",
]);

export class TenantResolutionError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "TenantResolutionError";
    this.status = options.status || 500;
    this.statusCode = this.status;
    this.code = options.code || "TENANT_RESOLUTION_FAILED";
    this.details = options.details;
  }
}

function splitList(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstHeaderValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "").split(",")[0].trim();
}

function normalizeRootDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

function getRootDomains(options = {}) {
  const configured =
    options.rootDomains ||
    process.env.TENANT_ROOT_DOMAINS ||
    process.env.CLASSGRID_TENANT_ROOT_DOMAINS;

  const roots = splitList(configured || "classgrid.in,localhost")
    .map(normalizeRootDomain)
    .filter(Boolean);

  return [...new Set(roots)].sort((a, b) => b.length - a.length);
}

export function normalizeHostname(value) {
  const raw = firstHeaderValue(value);
  if (!raw) return "";

  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).hostname.toLowerCase().replace(/\.$/, "");
    }
  } catch {
    return "";
  }

  if (raw.startsWith("[")) {
    const closingBracket = raw.indexOf("]");
    return closingBracket > 0 ? raw.slice(1, closingBracket).toLowerCase() : "";
  }

  return raw
    .split(":")[0]
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

export function isValidTenantSlug(value) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(String(value || ""));
}

export function normalizeTenantSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  return isValidTenantSlug(slug) && !RESERVED_TENANT_SUBDOMAINS.has(slug) ? slug : "";
}

export function extractSubdomainSlugFromHostname(hostname, options = {}) {
  const cleanHost = normalizeHostname(hostname);
  if (!cleanHost) return "";

  for (const rootDomain of getRootDomains(options)) {
    if (cleanHost === rootDomain) return "";

    const suffix = `.${rootDomain}`;
    if (!cleanHost.endsWith(suffix)) continue;

    const subdomain = cleanHost.slice(0, -suffix.length);
    const labels = subdomain.split(".").filter(Boolean);
    if (labels.length !== 1) return "";

    return normalizeTenantSlug(labels[0]);
  }

  if (options.allowAnySubdomain === true || process.env.TENANT_ALLOW_ANY_HOST === "true") {
    const [candidate] = cleanHost.split(".");
    return normalizeTenantSlug(candidate);
  }

  return "";
}

function getRequestHeader(req, name) {
  if (!req) return "";

  if (typeof req.headers?.get === "function") {
    return req.headers.get(name) || "";
  }

  const lowerName = name.toLowerCase();
  return req.headers?.[lowerName] || req.headers?.[name] || "";
}

export function getHostnameFromRequest(req) {
  const forwardedHost = getRequestHeader(req, "x-forwarded-host");
  if (forwardedHost) return normalizeHostname(forwardedHost);

  const host = getRequestHeader(req, "host");
  if (host) return normalizeHostname(host);

  if (req?.nextUrl?.hostname) return normalizeHostname(req.nextUrl.hostname);
  if (req?.hostname) return normalizeHostname(req.hostname);

  try {
    if (req?.url) return normalizeHostname(new URL(req.url).hostname);
  } catch {
    return "";
  }

  return "";
}

export function extractTenantSlugFromRequest(req, options = {}) {
  return extractSubdomainSlugFromHostname(getHostnameFromRequest(req), options);
}

function getTenantInfoEndpoint(options = {}) {
  if (options.tenantInfoUrl) return options.tenantInfoUrl;
  if (process.env.CLASSGRID_TENANT_INFO_URL) return process.env.CLASSGRID_TENANT_INFO_URL;
  if (process.env.TENANT_INFO_URL) return process.env.TENANT_INFO_URL;

  const baseUrl =
    options.platformApiBaseUrl ||
    process.env.CLASSGRID_PLATFORM_API_URL ||
    process.env.MAIN_PLATFORM_API_URL ||
    DEFAULT_PLATFORM_API_BASE_URL;

  return new URL(TENANT_INFO_PATH, `${String(baseUrl).replace(/\/+$/, "")}/`).toString();
}

function buildTenantInfoUrl(slug, options = {}) {
  const url = new URL(getTenantInfoEndpoint(options));
  url.searchParams.set("slug", slug);
  return url;
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function normalizeRemoteTenantPayload(payload, slug = "") {
  const tenant =
    payload?.tenant ||
    payload?.data?.tenant ||
    payload?.data ||
    payload;

  const tenantId =
    tenant?.tenantId ||
    tenant?.tenant_id ||
    tenant?.id ||
    tenant?._id ||
    tenant?.organization_id;

  const orgType =
    tenant?.org_type ||
    tenant?.orgType ||
    tenant?.structure_type ||
    tenant?.structureType;

  if (!tenant || typeof tenant !== "object" || !tenantId || !orgType) {
    throw new TenantResolutionError("Tenant info response is missing tenantId or org_type.", {
      status: 502,
      code: "INVALID_TENANT_INFO_RESPONSE",
      details: { slug },
    });
  }

  return {
    tenantId: String(tenantId),
    org_type: String(orgType),
    orgType: String(orgType),
    slug: tenant.subdomain || slug,
    subdomain: tenant.subdomain || slug,
    name: tenant.name || "",
    tenant,
  };
}

export async function fetchTenantInfoBySlug(slug, options = {}) {
  const tenantSlug = normalizeTenantSlug(slug);
  if (!tenantSlug) {
    throw new TenantResolutionError("Tenant slug is missing or invalid.", {
      status: 404,
      code: "TENANT_SLUG_NOT_FOUND",
    });
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TenantResolutionError("Fetch API is not available for tenant resolution.", {
      status: 500,
      code: "FETCH_UNAVAILABLE",
    });
  }

  const timeoutMs = Number(options.timeoutMs || process.env.TENANT_INFO_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestUrl = buildTenantInfoUrl(tenantSlug, options);

  let response;
  try {
    response = await fetchImpl(requestUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error?.name === "AbortError";
    throw new TenantResolutionError(
      aborted ? "Tenant info request timed out." : "Tenant info request failed.",
      {
        status: aborted ? 504 : 502,
        code: aborted ? "TENANT_INFO_TIMEOUT" : "TENANT_INFO_FETCH_FAILED",
        details: { slug: tenantSlug, cause: error?.message },
      },
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = await readJsonResponse(response);

  if (response.status === 404 || (response.ok && payload?.success === false)) {
    throw new TenantResolutionError("Website not found.", {
      status: 404,
      code: "TENANT_NOT_FOUND",
      details: { slug: tenantSlug },
    });
  }

  if (!response.ok) {
    throw new TenantResolutionError("Tenant info service returned an error.", {
      status: 502,
      code: "TENANT_INFO_BAD_STATUS",
      details: { slug: tenantSlug, remoteStatus: response.status },
    });
  }

  return normalizeRemoteTenantPayload(payload, tenantSlug);
}

export async function resolveTenantContextFromRequest(req, options = {}) {
  const slug = extractTenantSlugFromRequest(req, options);
  if (!slug) {
    throw new TenantResolutionError("Website not found.", {
      status: 404,
      code: "TENANT_SLUG_NOT_FOUND",
    });
  }

  return fetchTenantInfoBySlug(slug, options);
}

export function attachTenantContext(req, res, tenantContext) {
  req.tenantContext = tenantContext;
  req.tenant = tenantContext.tenant;
  req.tenantId = tenantContext.tenantId;
  req.org_type = tenantContext.org_type;
  req.tenantSlug = tenantContext.slug;

  if (res?.locals) {
    res.locals.tenantContext = tenantContext;
    res.locals.tenantId = tenantContext.tenantId;
    res.locals.org_type = tenantContext.org_type;
    res.locals.tenantSlug = tenantContext.slug;
  }

  return tenantContext;
}

export function createTenantResolutionMiddleware(options = {}) {
  return async function tenantResolutionMiddleware(req, res, next) {
    try {
      const tenantContext = await resolveTenantContextFromRequest(req, options);
      attachTenantContext(req, res, tenantContext);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export const tenantResolutionMiddleware = createTenantResolutionMiddleware();

export default {
  TenantResolutionError,
  RESERVED_TENANT_SUBDOMAINS,
  attachTenantContext,
  createTenantResolutionMiddleware,
  extractSubdomainSlugFromHostname,
  extractTenantSlugFromRequest,
  fetchTenantInfoBySlug,
  getHostnameFromRequest,
  isValidTenantSlug,
  normalizeHostname,
  normalizeRemoteTenantPayload,
  normalizeTenantSlug,
  resolveTenantContextFromRequest,
  tenantResolutionMiddleware,
};
