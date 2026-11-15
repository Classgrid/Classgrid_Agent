// Student prices: which emails count as school emails, and the school list (owner, 2026-11-15).
// An email is a school email when it ends in one of the super admin's school endings (.edu, .ac.in, ...: Global AI
// Config, student_email_domains) or in the domain of a school on the school list (pccoepune.org).
import GlobalAiConfig, { STUDENT_EMAIL_DOMAINS_DEFAULT } from "../models/GlobalAiConfig.js";
import School from "../models/School.js";

export async function studentSettings() {
    const cfg = await GlobalAiConfig.findOne({ key: "singleton" }).select("student_email_domains student_verification_months").lean().catch(() => null);
    const endings = Array.isArray(cfg?.student_email_domains) && cfg.student_email_domains.length ? cfg.student_email_domains : STUDENT_EMAIL_DOMAINS_DEFAULT;
    const months = Number(cfg?.student_verification_months) > 0 ? Number(cfg.student_verification_months) : 12;
    return { endings: endings.map((d) => String(d).toLowerCase()), months };
}

// Personal email providers: never a school's domain (a student typing name@gmail.com must not make every Gmail
// address a school email)
export const FREE_MAIL_DOMAINS = new Set([
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "ymail.com", "rocketmail.com", "outlook.com", "outlook.in",
    "hotmail.com", "hotmail.co.in", "live.com", "live.in", "msn.com", "icloud.com", "me.com", "mac.com", "aol.com", "proton.me",
    "protonmail.com", "pm.me", "zoho.com", "zohomail.in", "zohomail.com", "rediffmail.com", "gmx.com", "gmx.net", "mail.com",
    "yandex.com", "yandex.ru", "tutanota.com", "tuta.io", "fastmail.com", "hey.com", "qq.com", "163.com", "126.com",
]);
export const isFreeMailDomain = (d) => FREE_MAIL_DOMAINS.has(String(d || "").toLowerCase());

/** A domain as stored: "pccoepune.org" from "name@students.pccoepune.org", "@pccoepune.org" or "https://pccoepune.org/" */
export function cleanDomain(v) {
    let d = String(v || "").trim().toLowerCase();
    if (d.includes("@")) d = d.split("@").pop();
    d = d.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].replace(/^\.+|\.+$/g, "");
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : "";
}

/** Whether the email's address is `domain` or under it ("cse.iitb.ac.in" is under "iitb.ac.in"); ".edu" = any ending */
export function emailInDomain(email, domain) {
    const host = String(email || "").split("@")[1] || "";
    const d = String(domain || "").toLowerCase();
    if (!host || !d) return false;
    return d.startsWith(".") ? host.endsWith(d) : host === d || host.endsWith(`.${d}`);
}

/** Whether an email is a school email: a school ending, or a domain of a school on the list */
export async function isSchoolEmail(email) {
    const { endings } = await studentSettings();
    if (endings.some((d) => emailInDomain(email, d))) return true;
    const host = String(email || "").split("@")[1] || "";
    if (!host) return false;
    // the address and each address above it (cse.iitb.ac.in, iitb.ac.in, ac.in)
    const parts = host.split(".");
    const candidates = parts.slice(0, -1).map((_, i) => parts.slice(i).join("."));
    return !!(await School.exists({ domains: { $in: candidates } }).catch(() => null));
}

const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Schools whose name has the typed words (at least two characters), for the school picker */
export async function searchSchools(q, limit = 8) {
    const text = String(q || "").trim().toLowerCase().slice(0, 100);
    if (text.length < 2) return [];
    const words = text.split(/\s+/).filter(Boolean).slice(0, 6);
    const rows = await School.find({ $and: words.map((w) => ({ name_lower: { $regex: escapeRegex(w) } })) })
        .select("name domains city country").sort({ name_lower: 1 }).limit(limit).lean();
    return rows.map((r) => ({ id: String(r._id), name: r.name, domains: r.domains || [], city: r.city || "", country: r.country || "" }));
}
