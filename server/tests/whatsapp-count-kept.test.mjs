// The WhatsApp limit counts a one-time schedule by its schedule row, for one period from the day it was made. Until
// 2026-11-21 two things let messages slip out of that count (owner: "fix all"):
//   - a schedule that had already gone out could be given a new time: it went back to "pending", the worker sent the
//     same message again, and it was still one counted row (none once the row was older than the period)
//   - deleting a schedule after it went out removed its row, so the sent message was not counted any more
// Now such a schedule's messages are kept as rows of their own (WhatsappDirectSend, with a copy in Redis' list) and
// its schedule row is left out of the count from then on (services/ai-feature-limits.js). Checked here:
//   keepSentWhatsappCounted (called before a schedule is deleted or goes out again)
//   - a sent one-time WhatsApp schedule adds one row, dated the day the schedule was made (the date the count
//     already used for that message), so keeping it changes nothing for the person
//   - asked twice for the same message, it adds one row
//   - a schedule that never went out, one whose WhatsApp failed, one with no WhatsApp message and a repeat add nothing
//   - the count does not double: the kept row counts, the schedule row does not
//   - deleting a sent schedule leaves its message counted; deleting one still waiting frees its place
//   countWhatsappResend (called when a schedule that is not waiting any more is set back to "pending")
//   - the message that went out stays counted and the new one is counted from that moment: 2 messages
//   - at the limit it is refused and nothing is added
//   - a schedule older than the period: its new message is counted (0 before 2026-11-21)
//   - going out a third time: 3 messages
//   - the new message fails when it goes out: it stops counting, the earlier one stays
//   - the schedule is deleted while waiting to go out again: the booked place is given back, the earlier one stays
//   - Meta reports the earlier message as failed while the schedule waits: only that message stops counting
//   - a schedule whose first WhatsApp failed is set to go out again: one message counted, not two
//   - with Redis away the count is the same
// Redis, the database and the worker are stand-ins: nothing is read from or written to a real one, nothing is sent.
// Run: node --experimental-test-module-mocks --test tests/whatsapp-count-kept.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const DAY = 24 * 60 * 60 * 1000;
let redisUp = true;
let sets = new Map(); // Redis sorted sets: key -> Map(member -> score)
let kv = new Map();
let direct = []; // WhatsappDirectSend rows
let schedules = []; // AiSchedule rows
let limit = 10;

// The few Mongo operators the code under test uses
const same = (a, b) => (a instanceof Date || b instanceof Date) ? new Date(a).getTime() === new Date(b).getTime() : String(a) === String(b);
const matches = (doc, filter) => Object.entries(filter).every(([field, cond]) => {
    const v = doc[field];
    if (cond instanceof RegExp) return cond.test(String(v ?? ""));
    if (cond && typeof cond === "object" && !(cond instanceof Date) && Object.keys(cond).some((k) => k.startsWith("$"))) {
        return Object.entries(cond).every(([op, x]) => {
            if (op === "$gte") return v !== undefined && v !== null && new Date(v).getTime() >= new Date(x).getTime();
            if (op === "$in") return x.some((y) => same(v, y));
            if (op === "$nin") return !x.some((y) => same(v, y));
            if (op === "$ne") return v !== x;
            if (op === "$exists") return (v !== undefined && v !== null) === x;
            throw new Error(`the stand-in does not know ${op}`);
        });
    }
    return same(v, cond);
});
// A query: .sort().select().lean() and then awaited (or .catch)
const query = (run) => {
    let order = null;
    const go = () => Promise.resolve().then(() => run(order));
    const q = { sort: (spec) => { order = spec; return q; }, select: () => q, lean: () => q, then: (ok, bad) => go().then(ok, bad), catch: (bad) => go().catch(bad) };
    return q;
};
const sorted = (list, order) => {
    if (!order) return list;
    const [field, dir] = Object.entries(order)[0];
    return [...list].sort((a, b) => (new Date(a[field]).getTime() - new Date(b[field]).getTime()) * dir);
};

const needUp = () => { if (!redisUp) throw new Error("Redis is away"); };
const zset = (key) => { if (!sets.has(key)) sets.set(key, new Map()); return sets.get(key); };
mock.module("../src/config/redis.js", {
    defaultExport: {
        zadd: async (key, score, member) => { needUp(); zset(key).set(member, Number(score)); return 1; },
        zrem: async (key, member) => { needUp(); return zset(key).delete(member) ? 1 : 0; },
        zscore: async (key, member) => { needUp(); return zset(key).has(member) ? String(zset(key).get(member)) : null; },
        zcard: async (key) => { needUp(); return zset(key).size; },
        zremrangebyscore: async (key, min, max) => { needUp(); for (const [m, s] of zset(key)) if (s >= min && s <= max) zset(key).delete(m); return 0; },
        zcount: async (key, min) => { needUp(); return [...zset(key).values()].filter((s) => s >= min).length; },
        zrange: async (key) => { needUp(); const first = [...zset(key)].sort((a, b) => a[1] - b[1])[0]; return first ? [first[0], String(first[1])] : []; },
        ttl: async () => { needUp(); return -1; },
        expire: async () => { needUp(); return 1; },
        get: async (k) => { needUp(); return kv.has(k) ? kv.get(k) : null; },
        set: async (k, v) => { needUp(); kv.set(k, String(v)); return "OK"; },
    },
});
mock.module("../src/models/WhatsappDirectSend.js", {
    defaultExport: {
        create: async (row) => {
            if (direct.some((r) => r.ref === row.ref)) throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
            direct.push({ ...row });
            return row;
        },
        find: (filter) => query(() => direct.filter((r) => matches(r, filter))),
        findOne: (filter) => query((order) => sorted(direct.filter((r) => matches(r, filter)), order)[0] || null),
        countDocuments: async (filter) => direct.filter((r) => matches(r, filter)).length,
        findOneAndDelete: (filter) => query(() => { const i = direct.findIndex((r) => matches(r, filter)); return i < 0 ? null : direct.splice(i, 1)[0]; }),
        deleteOne: (filter) => query(() => { const i = direct.findIndex((r) => matches(r, filter)); if (i >= 0) direct.splice(i, 1); return {}; }),
        updateOne: (filter, update) => query(() => {
            const row = direct.find((r) => matches(r, filter));
            if (!row) return {};
            if (direct.some((r) => r !== row && r.ref === update.$set.ref)) throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
            Object.assign(row, update.$set);
            return {};
        }),
    },
});
mock.module("../src/models/AiSchedule.js", {
    defaultExport: {
        countDocuments: async (filter) => schedules.filter((s) => matches(s, filter)).length,
        find: (filter) => query(() => schedules.filter((s) => matches(s, filter))),
        findOne: (filter) => query((order) => sorted(schedules.filter((s) => matches(s, filter)), order)[0] || null),
        updateOne: (filter, update) => query(() => { const s = schedules.find((x) => matches(x, filter)); if (s) Object.assign(s, update); return {}; }),
    },
});
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => query(() => ({ global_whatsapp_scheduling_limit: limit })) } });
mock.module("../src/models/Organization.js", { defaultExport: { findById: () => query(() => null) } });
mock.module("../src/utils/chat-onboarding.js", { namedExports: { CHAT_PUBLIC_ORG_ID: "cccccccccccccccccccccccc" } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { planOf: async () => null } });
mock.module("../src/services/extra-usage.service.js", { namedExports: { canPayExtra: async () => ({ allowed: false, price: 0 }), chargeExtra: async () => 0, extraOfferText: () => "" } });

const { keepSentWhatsappCounted, countWhatsappResend, freeWhatsappResend, checkWhatsappLimit, handleWhatsappStatusUpdates, sendsOneTimeWhatsapp } = await import("../src/services/ai-feature-limits.js");

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa", OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const user = { _id: USER, email: "person@example.com" };
const fresh = () => { redisUp = true; sets = new Map(); kv = new Map(); direct = []; schedules = []; limit = 10; nextId = 1; };
let nextId = 1;
const ago = (ms) => new Date(Date.now() - ms);
// A one-time WhatsApp schedule's row, as create_schedule makes it
const schedule = (over = {}) => {
    const s = {
        _id: String(nextId++).padStart(24, "0"), user_id: USER, user_email: user.email, status: "pending", repeat: "once",
        whatsapp_phone_number: "919876543210", whatsapp_message: "Hello", whatsapp_failed: false, run_count: 0,
        createdAt: ago(2 * DAY), updatedAt: ago(2 * DAY), ...over,
    };
    schedules.push(s);
    return s;
};
// What the worker does to a one-time schedule's row when its time comes (workers/ai-schedule.worker.js): "sent", the
// send time, Meta's id; the failed mark only when the WhatsApp part fails. It never clears that mark.
const workerSends = (s, { at = new Date(), fails = false } = {}) => {
    s.status = "sent";
    s.sent_at = at;
    s.run_count = (s.run_count || 0) + 1;
    if (fails) s.whatsapp_failed = true;
    else s.whatsapp_message_id = `wamid.${s._id}.${s.run_count}`;
};
const sent = (over = {}) => { const s = schedule(over); workerSends(s, { at: over.sent_at || ago(1 * DAY) }); return s; };
const deleteRow = (s) => { schedules = schedules.filter((x) => x !== s); };
const used = async () => (await checkWhatsappLimit(user, { readOnly: true })).used;
const rowsOf = (s) => direct.filter((r) => r.ref.startsWith(`sched:${s._id}:`));

test("a sent one-time WhatsApp schedule adds one row, dated the day the schedule was made", async () => {
    fresh();
    const s = sent({ createdAt: ago(3 * DAY), sent_at: ago(1 * DAY) });
    assert.equal(await keepSentWhatsappCounted(s), true);
    assert.equal(direct.length, 1);
    assert.equal(direct[0].ref, `sched:${s._id}:${s.sent_at.getTime()}`);
    assert.equal(String(direct[0].userId), USER);
    assert.equal(direct[0].at.getTime(), s.createdAt.getTime());
    assert.ok(direct[0].expiresAt.getTime() > Date.now() + 366 * DAY); // (kept as long as the longest reset period)
    assert.equal(sets.get(`ai:wa-direct:${USER}`).get(direct[0].ref), s.createdAt.getTime()); // Redis' list has its copy
});

test("asked twice for the same message, it adds one row", async () => {
    fresh();
    const s = sent();
    assert.equal(await keepSentWhatsappCounted(s), true);
    assert.equal(await keepSentWhatsappCounted(s), false);
    assert.equal(direct.length, 1);
    assert.equal(sets.get(`ai:wa-direct:${USER}`).size, 1);
});

test("a schedule that never went out adds nothing", async () => {
    fresh();
    assert.equal(await keepSentWhatsappCounted(schedule()), false);
    assert.equal(direct.length, 0);
});

test("a schedule whose WhatsApp failed adds nothing", async () => {
    fresh();
    const s = schedule();
    workerSends(s, { fails: true });
    assert.equal(await keepSentWhatsappCounted(s), false);
    assert.equal(direct.length, 0);
});

test("a schedule with no WhatsApp message adds nothing", async () => {
    fresh();
    const emailOnly = sent({ whatsapp_phone_number: undefined, whatsapp_message: undefined });
    const halfOnly = sent({ whatsapp_message: "" });
    assert.equal(await keepSentWhatsappCounted(emailOnly), false);
    assert.equal(await keepSentWhatsappCounted(halfOnly), false);
    assert.equal(direct.length, 0);
});

test("a repeating schedule adds nothing (its runs are recorded when they go out)", async () => {
    fresh();
    for (const repeat of ["daily", "weekly", "custom"]) {
        const s = sent({ repeat });
        assert.equal(sendsOneTimeWhatsapp(s), false);
        assert.equal(await keepSentWhatsappCounted(s), false);
    }
    assert.equal(direct.length, 0);
});

test("the count does not double: the kept row counts, the schedule row does not", async () => {
    fresh();
    const s = sent();
    schedule(); // another one, still waiting
    assert.equal(await used(), 2);
    await keepSentWhatsappCounted(s);
    assert.equal(await used(), 2);
});

test("deleting a sent schedule leaves its message counted", async () => {
    fresh();
    const s = sent();
    assert.equal(await used(), 1);
    await keepSentWhatsappCounted(s);
    deleteRow(s);
    assert.equal(await used(), 1); // (0 before 2026-11-21)
});

test("a kept message leaves the count when the schedule row would have: one period after the schedule was made", async () => {
    fresh();
    const s = sent({ createdAt: ago(8 * DAY), sent_at: ago(1 * DAY) });
    assert.equal(await used(), 0); // (made 8 days ago: its 7 days are over)
    await keepSentWhatsappCounted(s);
    deleteRow(s);
    assert.equal(await used(), 0); // deleting it does not bring the message back into the count
});

test("deleting a schedule that is still waiting frees its place, as before", async () => {
    fresh();
    const s = schedule();
    assert.equal(await used(), 1);
    assert.equal(await keepSentWhatsappCounted(s), false);
    deleteRow(s);
    assert.equal(await freeWhatsappResend(s), false);
    assert.equal(await used(), 0);
});

test("a sent schedule set to go out again: the sent message stays counted and the new one is counted", async () => {
    fresh();
    const s = sent();
    assert.equal(await used(), 1);
    const wa = await countWhatsappResend(s, user);
    assert.equal(wa.allowed, true);
    s.status = "pending"; // (the caller saves the new time)
    assert.equal(await used(), 2); // (1 before 2026-11-21)
    const now = direct.find((r) => r.ref === `sched:${s._id}:now`);
    assert.ok(Math.abs(now.at.getTime() - Date.now()) < 5000); // counted from the moment it was booked
    workerSends(s);
    assert.equal(await used(), 2); // going out changes nothing: it was counted when booked
});

test("at the limit a re-send is refused and nothing is added", async () => {
    fresh();
    limit = 2;
    const s = sent();
    schedule();
    const wa = await countWhatsappResend(s, user);
    assert.equal(wa.allowed, false);
    assert.equal(wa.used, 2);
    assert.equal(wa.limit, 2);
    assert.equal(direct.length, 0);
    assert.equal(s.status, "sent");
    assert.equal(await used(), 2);
});

test("a schedule older than the period: its new message is counted", async () => {
    fresh();
    const s = sent({ createdAt: ago(30 * DAY), sent_at: ago(29 * DAY) });
    assert.equal(await used(), 0);
    assert.equal((await countWhatsappResend(s, user)).allowed, true);
    s.status = "pending";
    assert.equal(await used(), 1); // (0 before 2026-11-21: any number of messages from one old schedule)
    workerSends(s);
    assert.equal(await used(), 1);
});

test("one schedule can no longer send past the limit", async () => {
    fresh();
    limit = 3;
    const s = sent({ createdAt: ago(30 * DAY), sent_at: ago(29 * DAY) });
    let went = 0;
    for (let i = 0; i < 6; i++) {
        const wa = await countWhatsappResend(s, user);
        if (!wa.allowed) continue;
        s.status = "pending";
        workerSends(s, { at: new Date(Date.now() + i) });
        went++;
    }
    assert.equal(went, 3);
    assert.equal(await used(), 3);
});

test("going out a third time: three messages, each counted once", async () => {
    fresh();
    const s = sent();
    await countWhatsappResend(s, user);
    s.status = "pending";
    workerSends(s, { at: new Date(Date.now() + 1) });
    await countWhatsappResend(s, user);
    s.status = "pending";
    assert.equal(await used(), 3);
    assert.equal(rowsOf(s).length, 3);
    workerSends(s, { at: new Date(Date.now() + 2) });
    await keepSentWhatsappCounted(s); // (the schedule is deleted after its third message)
    deleteRow(s);
    assert.equal(await used(), 3);
    assert.equal(rowsOf(s).filter((r) => r.ref.endsWith(":now")).length, 0);
});

test("the new message fails when it goes out: it stops counting, the earlier one stays", async () => {
    fresh();
    const s = sent();
    await countWhatsappResend(s, user);
    s.status = "pending";
    assert.equal(s.whatsapp_failed, false);
    workerSends(s, { fails: true });
    assert.equal(await used(), 1);
    assert.deepEqual(rowsOf(s).map((r) => r.ref.endsWith(":now")), [false]);
    assert.equal(await keepSentWhatsappCounted(s), false); // deleting it now keeps what is counted, adds nothing
    deleteRow(s);
    assert.equal(await used(), 1);
});

test("deleted while waiting to go out again: the booked place is given back, the earlier message stays", async () => {
    fresh();
    const s = sent();
    await countWhatsappResend(s, user);
    s.status = "pending";
    assert.equal(await used(), 2);
    assert.equal(await keepSentWhatsappCounted(s), false);
    deleteRow(s);
    assert.equal(await freeWhatsappResend(s), true);
    assert.equal(await used(), 1);
});

test("Meta reports the earlier message as failed while the schedule waits: only that message stops counting", async () => {
    fresh();
    const s = sent();
    const earlierId = s.whatsapp_message_id;
    await countWhatsappResend(s, user);
    s.status = "pending";
    assert.equal(await used(), 2);
    await handleWhatsappStatusUpdates([{ status: "failed", id: earlierId, recipient_id: "919876543210", errors: [{ code: 131026 }] }]);
    assert.equal(s.whatsapp_failed, false); // (the mark would stay on the message that has yet to go out)
    assert.equal(await used(), 1);
    workerSends(s);
    assert.equal(await used(), 1); // the new message went out fine and is still counted
});

test("Meta reports a sent schedule's message as failed: it stops counting, kept or not", async () => {
    fresh();
    const plain = sent();
    const again = sent();
    await countWhatsappResend(again, user);
    again.status = "pending";
    workerSends(again);
    assert.equal(await used(), 3);
    await handleWhatsappStatusUpdates([{ status: "failed", id: plain.whatsapp_message_id }, { status: "failed", id: again.whatsapp_message_id }]);
    assert.equal(plain.whatsapp_failed, true);
    assert.equal(again.whatsapp_failed, true);
    assert.equal(await used(), 1); // only the first message of the second schedule is left
});

test("a schedule whose first WhatsApp failed is set to go out again: one message counted, not two", async () => {
    fresh();
    const s = schedule();
    workerSends(s, { fails: true });
    assert.equal(await used(), 0);
    assert.equal((await countWhatsappResend(s, user)).allowed, true);
    s.status = "pending";
    assert.equal(s.whatsapp_failed, false);
    assert.equal(await used(), 1);
    workerSends(s);
    assert.equal(await used(), 1);
    assert.equal(rowsOf(s).length, 1);

    // And when the second try fails too, nothing is counted
    fresh();
    const twice = schedule();
    workerSends(twice, { fails: true });
    await countWhatsappResend(twice, user);
    twice.status = "pending";
    workerSends(twice, { fails: true });
    assert.equal(await used(), 0);
    assert.equal(rowsOf(twice).length, 0);
});

test("a schedule still waiting, a repeat and one with no WhatsApp are not re-sends: nothing is checked or counted", async () => {
    fresh();
    limit = 0;
    assert.equal(await countWhatsappResend(schedule(), user), null);
    assert.equal(await countWhatsappResend(sent({ repeat: "daily" }), user), null);
    assert.equal(await countWhatsappResend(sent({ whatsapp_message: "" }), user), null);
    assert.equal(direct.length, 0);
});

test("the new time could not be saved: the booked place is given back", async () => {
    fresh();
    const s = sent();
    await countWhatsappResend(s, user);
    assert.equal(await freeWhatsappResend(s), true); // (the row is still "sent": nothing will go out again)
    assert.equal(await used(), 1);
    assert.equal(await keepSentWhatsappCounted(s), false);
    assert.equal(rowsOf(s).length, 1);
});

test("another person's count is not touched", async () => {
    fresh();
    const s = sent();
    await countWhatsappResend(s, user);
    s.status = "pending";
    assert.equal((await checkWhatsappLimit({ _id: OTHER }, { readOnly: true })).used, 0);
});

test("with Redis away the count is the same", async () => {
    fresh();
    redisUp = false;
    const s = sent();
    assert.equal((await countWhatsappResend(s, user)).allowed, true);
    s.status = "pending";
    assert.equal(await used(), 2);
    workerSends(s, { fails: true });
    assert.equal(await used(), 1);
    await keepSentWhatsappCounted(s);
    deleteRow(s);
    assert.equal(await used(), 1);
});
