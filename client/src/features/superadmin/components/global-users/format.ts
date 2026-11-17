// Turning the server's raw values into the plain words the Users pages show: dates the Indian way ("12 Nov 2026"),
// numbers with Indian grouping ("1,00,000"), rupees with the rupee sign, and friendly names for roles, plans and
// sign-up methods. Kept here (and not taken from components/ai-usage) so both pages say things the same way and
// nothing breaks when that folder changes.
import type { PlanSummary } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

// "12 Nov 2026"; a missing date is a dash
export function dateText(iso: string | null | undefined): string {
  const d = toDate(iso);
  if (!d) return "–";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// "12 Nov 2026, 4:05 pm" (am/pm written in small letters on every browser)
export function dateTimeText(iso: string | null | undefined): string {
  const d = toDate(iso);
  if (!d) return "–";
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  return `${dateText(iso)}, ${time}`;
}

// "Today", "Yesterday", "3 days ago" within the last week, else the date; nothing at all reads "Never".
// Counted in calendar days, so something at 11 pm yesterday says "Yesterday" and not "Today".
export function relativeText(iso: string | null | undefined): string {
  const d = toDate(iso);
  if (!d) return "Never";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return dateText(iso);
}

export const num = (n: number | null | undefined): string => Number(n || 0).toLocaleString("en-IN");

export const inr = (n: number | null | undefined): string =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// "1 person" / "3 people"
export const peopleText = (n: number): string => (n === 1 ? "1 person" : `${num(n)} people`);

export const capitalise = (s: string): string => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Chat users are "user" (very old ones "student"); both are just a User here
export function roleLabel(role: string | null | undefined): string {
  if (!role || role === "user" || role === "student") return "User";
  if (role === "super_admin") return "Super Admin";
  if (role === "co_super_admin") return "Co-Super Admin";
  return capitalise(role);
}

export function statusLabel(status: string | null | undefined): string {
  if (!status || status === "active") return "Active";
  if (status === "suspended" || status === "blocked") return "Banned";
  if (status === "pending") return "Pending";
  if (status === "deleted") return "Erased";
  return capitalise(status);
}

export const isBanned = (status: string | null | undefined) => status === "suspended" || status === "blocked";

// Email / Google / GitHub (also used for the list of ways someone can sign in)
export function signupLabel(method: string | null | undefined): string {
  if (!method || method === "other") return "Other";
  if (method === "email" || method === "manual") return "Email";
  if (method === "google") return "Google";
  if (method === "github") return "GitHub";
  return capitalise(method);
}

const PLAN_NAMES: Record<string, string> = { free: "Free", pro: "Pro", max: "Max", enterprise: "Enterprise" };
export const planIdLabel = (id: string | null | undefined): string => (id ? PLAN_NAMES[id] || capitalise(id) : "Free");

// How someone came to be on their plan, in words
export function planSourceText(plan: Pick<PlanSummary, "source" | "billing" | "setBy">): string {
  if (plan.source === "gifted" || plan.billing === "granted") return plan.setBy ? `Gifted by ${plan.setBy}` : "Gifted";
  switch (plan.billing) {
    case "manual_monthly": return "Bought, 1 month";
    case "prepaid_yearly": return "Bought, 1 year";
    case "upi_autopay": return "Bought, paid every month";
    case "play": return "Bought in the phone app";
    case "org_seat": return "Team seat";
    default: return "Free plan";
  }
}

// A number saved as digits only ("919876543210") is shown with its plus sign
export function whatsappText(value: string | null | undefined): string {
  if (!value) return "";
  return /^\d+$/.test(value) ? `+${value}` : value;
}

export function phonePlatformLabel(platform: string | null | undefined): string {
  if (!platform) return "Phone";
  if (platform.toLowerCase() === "ios") return "iOS";
  return capitalise(platform);
}

// The server's own reason when it gave one, else a plain line
export function errorText(error: unknown): string {
  const message = (error as any)?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : "Couldn't do that. Try again.";
}

export const httpStatus = (error: unknown): number | undefined => (error as any)?.response?.status;

// A saved browser as "Chrome on Windows 10/11". For many sign-ins the whole browser string was saved
// ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/..."), so it is read here and never shown raw.
export function deviceName(browser: string | null | undefined, os: string | null | undefined): { browser: string; os: string } {
  const ua = browser || "";
  // (the phone app signs in as "Classgrid-Android")
  if (/Classgrid-Android/i.test(ua)) return { browser: "Classgrid phone app", os: "Android" };
  if (/Classgrid-(iOS|iPhone)/i.test(ua)) return { browser: "Classgrid phone app", os: "iPhone" };
  if (!/Mozilla\/|AppleWebKit|Gecko\//i.test(ua)) return { browser: ua || "Browser", os: os || "" };
  let b = "Browser";
  if (/Classgrid|Electron\//i.test(ua)) b = "Classgrid desktop app";
  else if (/Edg(e|A|iOS)?\//.test(ua)) b = "Edge";
  else if (/OPR\/|Opera/.test(ua)) b = "Opera";
  else if (/SamsungBrowser\//.test(ua)) b = "Samsung Internet";
  else if (/Firefox\/|FxiOS\//.test(ua)) b = "Firefox";
  else if (/Chrome\/|CriOS\//.test(ua)) b = "Chrome";
  else if (/Safari\//.test(ua)) b = "Safari";
  let o = os || "";
  if (/Android/i.test(ua)) o = "Android";
  else if (/iPhone|iPod/.test(ua)) o = "iPhone";
  else if (/iPad/.test(ua)) o = "iPad";
  else if (/Windows NT 10/.test(ua)) o = "Windows 10/11";
  else if (/Windows/.test(ua)) o = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) o = "Mac";
  else if (/CrOS/.test(ua)) o = "Chromebook";
  else if (/Linux|X11/.test(ua)) o = "Linux";
  return { browser: b, os: o };
}

export interface BrowserLine { name: string; times: number; firstAt: string | null; lastAt: string | null }

// The same browser saved many times becomes one line, with how many times and from when to when; newest first
export function mergeBrowsers(list: { browser: string; os: string; addedAt: string | null }[]): BrowserLine[] {
  const byName = new Map<string, BrowserLine>();
  for (const item of list || []) {
    const d = deviceName(item.browser, item.os);
    const name = d.os ? `${d.browser} on ${d.os}` : d.browser;
    const line = byName.get(name) || { name, times: 0, firstAt: null, lastAt: null };
    line.times += 1;
    if (item.addedAt) {
      if (!line.firstAt || item.addedAt < line.firstAt) line.firstAt = item.addedAt;
      if (!line.lastAt || item.addedAt > line.lastAt) line.lastAt = item.addedAt;
    }
    byName.set(name, line);
  }
  return [...byName.values()].sort((x, y) => (y.lastAt || "").localeCompare(x.lastAt || ""));
}

// "added 6 Oct 2026", or "added 5 times, 12 Oct 2026 to 27 Oct 2026"
export function browserWhenText(line: BrowserLine): string {
  if (!line.firstAt) return line.times > 1 ? `added ${num(line.times)} times` : "";
  const first = dateText(line.firstAt);
  const last = dateText(line.lastAt);
  if (line.times <= 1) return `added ${first}`;
  return first === last ? `added ${num(line.times)} times on ${first}` : `added ${num(line.times)} times, ${first} to ${last}`;
}

// The same phone app version registered many times becomes one line with its newest "last seen"; newest first
export function mergePhoneApps(list: { platform: string; appVersion: string; updatedAt: string | null }[]): { platform: string; appVersion: string; updatedAt: string | null }[] {
  const byKey = new Map<string, { platform: string; appVersion: string; updatedAt: string | null }>();
  for (const item of list || []) {
    const key = `${(item.platform || "").toLowerCase()}|${item.appVersion || ""}`;
    const line = byKey.get(key);
    if (!line) byKey.set(key, { ...item });
    else if (item.updatedAt && (!line.updatedAt || item.updatedAt > line.updatedAt)) line.updatedAt = item.updatedAt;
  }
  return [...byKey.values()].sort((x, y) => (y.updatedAt || "").localeCompare(x.updatedAt || ""));
}
