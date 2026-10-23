/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
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
// Repeating AI schedules: "once" (default), "daily", "weekly" or "custom" (chosen weekdays), up to an end date.
// One schedule document is reused: after each send the worker moves scheduled_at to the next run.

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_REPEAT_DAYS = 90; // a repeat can't run longer than this
export const DEFAULT_REPEAT_DAYS = 30; // when the AI gives no end date
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function validTimeZone(tz) {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

// Weekday (0 = Sunday) of an instant in a time zone
function weekdayIn(date, tz) {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date).toLowerCase().slice(0, 3);
    return DAY_NAMES.indexOf(name);
}

// "+05:30" style offset of a time zone at an instant
function offsetIn(date, tz) {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
        .formatToParts(date).find((p) => p.type === "timeZoneName")?.value || "GMT";
    const m = /GMT([+-]\d{2}):?(\d{2})?/.exec(part);
    return m ? `${m[1]}:${m[2] || "00"}` : "+00:00";
}

function parseDays(days) {
    const list = Array.isArray(days) ? days : typeof days === "string" ? days.split(/[\s,]+/) : [];
    const out = new Set();
    for (const d of list) {
        if (typeof d === "number" && d >= 0 && d <= 6) out.add(d);
        const i = DAY_NAMES.indexOf(String(d).trim().toLowerCase().slice(0, 3));
        if (i >= 0) out.add(i);
    }
    return [...out].sort();
}

/**
 * Checks the AI's repeat options for a schedule whose first run is `firstRun`.
 * Returns { repeat, repeat_days, repeat_until, repeat_tz, first } or { error }.
 */
export function normalizeRepeat(args, firstRun) {
    const repeat = String(args.repeat || "once").toLowerCase();
    if (repeat === "once" || repeat === "none" || repeat === "") return { repeat: "once" };
    if (!["daily", "weekly", "custom"].includes(repeat)) return { error: `repeat must be once, daily, weekly or custom (got "${args.repeat}")` };

    const tz = args.repeat_timezone && validTimeZone(args.repeat_timezone) ? args.repeat_timezone : "Asia/Kolkata";
    const days = repeat === "custom" ? parseDays(args.repeat_days) : [];
    if (repeat === "custom" && days.length === 0) return { error: 'repeat "custom" needs repeat_days, e.g. ["mon", "wed", "fri"]' };

    // End date: a plain date means the end of that day in the user's time zone
    let until = null;
    if (args.repeat_until) {
        const raw = String(args.repeat_until).trim();
        until = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T23:59:59${offsetIn(firstRun, tz)}`) : new Date(raw);
        if (Number.isNaN(until.getTime())) return { error: `repeat_until is not a valid date ("${args.repeat_until}")` };
    }
    const latest = new Date(firstRun.getTime() + MAX_REPEAT_DAYS * DAY_MS);
    if (!until) until = new Date(firstRun.getTime() + DEFAULT_REPEAT_DAYS * DAY_MS);
    if (until > latest) until = latest;
    if (until < firstRun) return { error: "repeat_until is before the first run" };

    // For custom days the first run moves to the first chosen weekday
    let first = firstRun;
    if (repeat === "custom" && !days.includes(weekdayIn(first, tz))) {
        first = nextRun({ repeat, repeat_days: days, repeat_until: until, repeat_tz: tz }, first);
        if (!first) return { error: "none of the chosen weekdays fall before repeat_until" };
    }
    return { repeat, repeat_days: days, repeat_until: until, repeat_tz: tz, first };
}

/** The run after `from` for a repeating schedule, or null when the repeat is over. */
export function nextRun(schedule, from) {
    const repeat = schedule.repeat;
    if (!repeat || repeat === "once") return null;
    const tz = schedule.repeat_tz || "Asia/Kolkata";
    let t = new Date(from.getTime());
    if (repeat === "daily") t = new Date(t.getTime() + DAY_MS);
    else if (repeat === "weekly") t = new Date(t.getTime() + 7 * DAY_MS);
    else {
        const days = schedule.repeat_days || [];
        if (days.length === 0) return null;
        do { t = new Date(t.getTime() + DAY_MS); } while (!days.includes(weekdayIn(t, tz)));
    }
    if (schedule.repeat_until && t > new Date(schedule.repeat_until)) return null;
    return t;
}

/** How many runs fall inside [from, from + ms), counting `from` itself (for the WhatsApp weekly limit). */
export function runsWithin(schedule, from, ms) {
    let count = 0;
    let t = from;
    const end = from.getTime() + ms;
    while (t && t.getTime() < end && count < 100) {
        count++;
        t = nextRun(schedule, t);
    }
    return count;
}

/** Short text like "daily until 25 Oct" for tool replies. */
export function describeRepeat(schedule) {
    if (!schedule.repeat || schedule.repeat === "once") return "once";
    const tz = schedule.repeat_tz || "Asia/Kolkata";
    const until = schedule.repeat_until
        ? new Date(schedule.repeat_until).toLocaleDateString("en-IN", { timeZone: tz, day: "numeric", month: "short", year: "numeric" })
        : "";
    const what = schedule.repeat === "custom"
        ? `every ${schedule.repeat_days.map((d) => DAY_NAMES[d][0].toUpperCase() + DAY_NAMES[d].slice(1)).join(", ")}`
        : schedule.repeat;
    return until ? `${what} until ${until}` : what;
}
