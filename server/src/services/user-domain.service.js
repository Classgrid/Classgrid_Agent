// Domain verification for a user (Settings → Verify your domain).
// A user proves they own ONE domain by adding a DNS TXT record. This only verifies ownership:
// nothing is hosted on the domain.
import crypto from "crypto";
import dns from "dns";

export const TXT_PREFIX = "classgrid-verification=";
/** The TXT record can go on the domain itself or on this sub-name */
export const TXT_HOST_PREFIX = "_classgrid";

const DOMAIN_RE = /^(?=.{4,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

/** "https://www.Example.com/path" → "www.example.com"; null when it isn't a usable domain */
export function normalizeDomain(input) {
  let d = String(input || "").trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].split(":")[0].replace(/\.$/, "");
  if (!DOMAIN_RE.test(d)) return null;
  if (d.split(".").some((part) => part.startsWith("-") || part.endsWith("-"))) return null;
  // Our own domains can't be claimed
  if (d === "classgrid.in" || d.endsWith(".classgrid.in")) return null;
  return d;
}

export function newVerificationToken() {
  return crypto.randomBytes(16).toString("hex");
}

/** What the user must add in their DNS */
export function dnsInstructions(domain, token) {
  return {
    type: "TXT",
    host: `${TXT_HOST_PREFIX}.${domain}`,
    hostShort: TXT_HOST_PREFIX,
    value: `${TXT_PREFIX}${token}`,
  };
}

// Ask public DNS servers directly, so a fresh record is seen without waiting for local caches
const resolver = new dns.promises.Resolver({ timeout: 4000, tries: 2 });
resolver.setServers(["1.1.1.1", "8.8.8.8"]);

async function txtRecords(name) {
  try {
    const records = await resolver.resolveTxt(name);
    return records.map((chunks) => chunks.join(""));
  } catch (err) {
    if (["ENODATA", "ENOTFOUND", "ENOTIMP", "ESERVFAIL", "EREFUSED", "ETIMEOUT", "ECONNREFUSED"].includes(err.code)) return [];
    throw err;
  }
}

/** True when the TXT record with this token is live on _classgrid.<domain> or on <domain> itself */
export async function hasVerificationRecord(domain, token) {
  const want = `${TXT_PREFIX}${token}`;
  const [sub, root] = await Promise.all([txtRecords(`${TXT_HOST_PREFIX}.${domain}`), txtRecords(domain)]);
  return [...sub, ...root].some((v) => v.trim() === want);
}
