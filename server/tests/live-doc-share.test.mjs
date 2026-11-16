// Live docs: sharing with people, access requests, handing a doc on, and who is reading
// (services/live-doc-share.service.js), on real LiveDoc documents with no database: the accounts, Redis and the
// emails are stand-ins, so nothing is saved and no email is sent.
// Run: node --experimental-test-module-mocks --test tests/live-doc-share.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const OWNER = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Nikhil", email: "nikhil@x.in", profilePicture: "https://p/n.jpg" };
const ASHA = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Asha", email: "asha@x.in", profilePicture: "https://p/a.jpg" };
const RAVI = { _id: "cccccccccccccccccccccccc", name: "Ravi", email: "ravi@x.in", profilePicture: "" };
const ACCOUNTS = [OWNER, ASHA, RAVI];

// ── Stand-ins ──
const sent = [];
let emailFails = false;
const realEmails = await import("../src/services/live-doc-emails.js");
mock.module("../src/services/live-doc-emails.js", {
    namedExports: {
        ...realEmails,
        sendDocEmail: async (to, email) => {
            if (emailFails) throw new Error("the mail server said no");
            sent.push({ to, subject: email.subject });
        },
    },
});

const query = (rows) => {
    const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(rows).then(ok, bad) };
    return q;
};
const matches = (user, filter) => {
    if (filter.$or) return filter.$or.some((f) => matches(user, f));
    if (filter._id?.$in) return filter._id.$in.map(String).includes(user._id);
    if (filter.email?.$in) return filter.email.$in.includes(user.email);
    if (typeof filter.email === "string") return filter.email === user.email;
    return false;
};
mock.module("../src/models/User.js", {
    defaultExport: {
        find: (filter) => query(ACCOUNTS.filter((u) => matches(u, filter))),
        findById: (id) => query(ACCOUNTS.find((u) => u._id === String(id)) || null),
        findOne: (filter) => query(ACCOUNTS.find((u) => matches(u, filter)) || null),
    },
});

const store = new Map(); // a small Redis: hashes and plain keys
let redisDown = false;
const down = () => { if (redisDown) throw new Error("Stream isn't writeable"); };
mock.module("../src/config/redis.js", {
    defaultExport: {
        multi() {
            const steps = [];
            const chain = {
                hset: (key, field, value) => { steps.push(() => { const h = store.get(key) || {}; h[field] = value; store.set(key, h); return 1; }); return chain; },
                expire: () => { steps.push(() => 1); return chain; },
                hgetall: (key) => { steps.push(() => ({ ...(store.get(key) || {}) })); return chain; },
                exec: async () => { down(); return steps.map((step) => [null, step()]); },
            };
            return chain;
        },
        hdel: async (key, ...fields) => { down(); const h = store.get(key) || {}; fields.forEach((f) => delete h[f]); return fields.length; },
        set: async (key, value, _ex, _seconds, nx) => { down(); if (nx && store.has(key)) return null; store.set(key, value); return "OK"; },
    },
});

const { default: LiveDoc } = await import("../src/models/LiveDoc.js");
const updates = [];
LiveDoc.updateOne = async (filter, change) => { updates.push({ filter, change }); return { modifiedCount: 1 }; };
const share = await import("../src/services/live-doc-share.service.js");
const { roleOf, docForClient } = await import("../src/services/live-doc.helpers.js");

const newDoc = (more = {}) => {
    const doc = new LiveDoc({ owner: OWNER._id, ownerName: OWNER.name, title: "Plan", markdown: "# Plan", ...more });
    doc.save = async () => doc; // (nothing is saved anywhere)
    return doc;
};
const fresh = () => { sent.length = 0; updates.length = 0; store.clear(); emailFails = false; redisDown = false; };

test("sharing with emails adds each person once with the role, and emails only the new ones", async () => {
    fresh();
    const doc = newDoc();
    const results = await share.inviteMembers(doc, { by: OWNER, emails: "Asha@x.in, new@x.in; not-an-email nikhil@x.in", role: "commenter" });
    assert.deepEqual(results, [
        { email: "not-an-email", error: "This is not an email address." },
        { email: "asha@x.in", ok: true },
        { email: "new@x.in", ok: true },
        { email: "nikhil@x.in", error: "This is the doc's owner." },
    ]);
    assert.deepEqual(doc.members.map((m) => [m.email, m.role, String(m.userId || ""), m.name]), [
        ["asha@x.in", "commenter", ASHA._id, "Asha"], // she has an account: it is tied at once
        ["new@x.in", "commenter", "", ""], // no account yet: known by the email
    ]);
    assert.deepEqual(sent.map((e) => e.to), ["asha@x.in", "new@x.in"]);
    assert.ok(sent[0].subject.includes('Nikhil shared a doc with you: "Plan"'));
    assert.equal(roleOf(doc, ASHA), "commenter");
    assert.equal(roleOf(doc, { _id: "dddddddddddddddddddddddd", email: "new@x.in" }), "commenter");

    // again, as editor: the role changes, nobody is emailed a second time
    sent.length = 0;
    const again = await share.inviteMembers(doc, { by: OWNER, emails: ["asha@x.in"], role: "editor" });
    assert.deepEqual(again, [{ email: "asha@x.in", ok: true, already: true }]);
    assert.equal(doc.members.length, 2);
    assert.equal(roleOf(doc, ASHA), "editor");
    assert.equal(sent.length, 0);
});

test("an email that can't be sent does not undo the sharing: the owner is told to send the link", async () => {
    fresh();
    emailFails = true;
    const doc = newDoc();
    const results = await share.inviteMembers(doc, { by: OWNER, emails: "asha@x.in", role: "viewer" });
    assert.equal(results[0].ok, true);
    assert.ok(results[0].note.includes("the email could not be sent"));
    assert.equal(roleOf(doc, ASHA), "viewer");
});

test("nothing typed, and too many at once, are refused", async () => {
    fresh();
    await assert.rejects(share.inviteMembers(newDoc(), { by: OWNER, emails: "  ", role: "viewer" }), /Type an email address first/);
    const many = Array.from({ length: 21 }, (_, i) => `p${i}@x.in`);
    await assert.rejects(share.inviteMembers(newDoc(), { by: OWNER, emails: many, role: "viewer" }), /up to 20 people at a time/);
});

test("asking for access waits on the doc and emails the owner once a day", async () => {
    fresh();
    const doc = newDoc();
    assert.equal(await share.requestAccess(doc, RAVI), "pending");
    assert.deepEqual(doc.requests.map((r) => [r.email, r.name, r.wants]), [["ravi@x.in", "Ravi", "viewer"]]);
    assert.deepEqual(sent, [{ to: "nikhil@x.in", subject: 'Ravi asked for access to "Plan"' }]);
    assert.equal(updates.length, 1); // (the time of the email is noted)
    assert.equal(roleOf(doc, RAVI), null); // asking opens nothing

    // asking again the same day: still one request, no second email
    doc.requests[0].emailedAt = new Date();
    assert.equal(await share.requestAccess(doc, RAVI), "pending");
    assert.equal(doc.requests.length, 1);
    assert.equal(sent.length, 1);

    // the owner, and someone who is already in, have nothing to ask for
    assert.equal(await share.requestAccess(doc, OWNER), "open");
    assert.equal(doc.requests.length, 1);
});

test("a reader asks to edit: the request says so, and asking for more than before emails again", async () => {
    fresh();
    const doc = newDoc({ visibility: "link", linkRole: "viewer" });
    assert.equal(await share.requestAccess(doc, RAVI, "viewer"), "open"); // he can already read it
    assert.equal(await share.requestAccess(doc, RAVI, "commenter"), "pending");
    doc.requests[0].emailedAt = new Date();
    assert.equal(await share.requestAccess(doc, RAVI, "editor"), "pending");
    assert.deepEqual(doc.requests.map((r) => r.wants), ["editor"]);
    assert.deepEqual(sent.map((e) => e.subject), ['Ravi asked to comment on "Plan"', 'Ravi asked to edit "Plan"']);
    const forRavi = docForClient(doc, RAVI);
    assert.equal(forRavi.asked, "editor");
});

test("the owner approves: the person is let in with the role and emailed; declining emails nobody", async () => {
    fresh();
    const doc = newDoc();
    await share.requestAccess(doc, RAVI, "editor");
    sent.length = 0;
    const id = doc.requests[0].id;
    await share.answerRequest(doc, id, { approve: true, by: OWNER }); // (no role picked: what he asked for)
    assert.equal(doc.requests.length, 0);
    assert.equal(roleOf(doc, RAVI), "editor");
    assert.deepEqual(sent, [{ to: "ravi@x.in", subject: 'You can now open "Plan"' }]);
    await assert.rejects(share.answerRequest(doc, id, { approve: true, by: OWNER }), /answered already/);

    fresh();
    const other = newDoc();
    await share.requestAccess(other, ASHA);
    sent.length = 0;
    await share.answerRequest(other, other.requests[0].id, { approve: false, by: OWNER });
    assert.equal(other.requests.length, 0);
    assert.equal(roleOf(other, ASHA), null);
    assert.equal(sent.length, 0);
});

test("sharing with a person who had asked answers their request", async () => {
    fresh();
    const doc = newDoc();
    await share.requestAccess(doc, RAVI);
    await share.inviteMembers(doc, { by: OWNER, emails: "ravi@x.in", role: "viewer" });
    assert.equal(doc.requests.length, 0);
    assert.equal(roleOf(doc, RAVI), "viewer");
});

test("a person's role is changed and a person is removed", async () => {
    fresh();
    const doc = newDoc();
    await share.inviteMembers(doc, { by: OWNER, emails: "asha@x.in", role: "viewer", notify: false });
    assert.equal(sent.length, 0);
    const id = doc.members[0].id;
    await share.setMemberRole(doc, id, "editor");
    assert.equal(roleOf(doc, ASHA), "editor");
    await share.setMemberRole(doc, id, "owner"); // (not a role a person is given this way)
    assert.equal(roleOf(doc, ASHA), "viewer");
    await share.removeMember(doc, id);
    assert.equal(roleOf(doc, ASHA), null);
    await assert.rejects(share.removeMember(doc, id), /not found/);
});

test("the owner hands the doc on: it is the other person's, and the owner until now stays as an editor", async () => {
    fresh();
    const doc = newDoc();
    await share.inviteMembers(doc, { by: OWNER, emails: "asha@x.in, new@x.in", role: "viewer", notify: false });
    const asha = doc.members.find((m) => m.email === "asha@x.in");
    await share.makeOwner(doc, asha.id, OWNER);
    assert.equal(roleOf(doc, ASHA), "owner");
    assert.equal(doc.ownerName, "Asha");
    assert.equal(roleOf(doc, OWNER), "editor");
    assert.deepEqual(doc.members.map((m) => m.email).sort(), ["new@x.in", "nikhil@x.in"]);
    // a person with no account can't be given the doc
    const stranger = doc.members.find((m) => m.email === "new@x.in");
    await assert.rejects(share.makeOwner(doc, stranger.id, ASHA), /no Classgrid account yet/);
});

test("general access: private or link, and what the link lets people do", async () => {
    fresh();
    const doc = newDoc();
    await share.setGeneralAccess(doc, { visibility: "link", linkRole: "viewer" });
    assert.equal(roleOf(doc, RAVI), "viewer");
    await share.setGeneralAccess(doc, { linkRole: "editor" });
    assert.equal(roleOf(doc, RAVI), "editor");
    await share.setGeneralAccess(doc, { visibility: "private" });
    assert.equal(roleOf(doc, RAVI), null);
    await assert.rejects(share.setGeneralAccess(doc, { visibility: "public" }), /must be "private" or "link"/);
});

test("who is reading now: everyone with the doc open, this person first, with their photo", async () => {
    fresh();
    const doc = newDoc();
    assert.deepEqual(await share.readingNow(doc, OWNER), [{ id: OWNER._id, name: "Nikhil", photo: "https://p/n.jpg", me: true }]);
    const forAsha = await share.readingNow(doc, ASHA);
    assert.deepEqual(forAsha.map((p) => [p.name, p.me, p.photo]), [["Asha", true, "https://p/a.jpg"], ["Nikhil", false, "https://p/n.jpg"]]);
    await share.stoppedReading(doc._id, OWNER);
    assert.deepEqual((await share.readingNow(doc, ASHA)).map((p) => p.name), ["Asha"]);
    // someone not heard from for over half a minute has left
    const key = [...store.keys()].find((k) => k.startsWith("livedoc:seen:"));
    store.get(key)[RAVI._id] = JSON.stringify({ n: "Ravi", p: "", t: Date.now() - 60000 });
    assert.deepEqual((await share.readingNow(doc, ASHA)).map((p) => p.name), ["Asha"]);
    // without Redis nobody is shown, and the doc still opens
    redisDown = true;
    assert.deepEqual(await share.readingNow(doc, ASHA), []);
});

test("a view counts once in half an hour for the same person, and not at all without Redis", async () => {
    fresh();
    const doc = newDoc({ views: 4 });
    assert.equal(await share.countView(doc, RAVI), 5);
    assert.equal(await share.countView(doc, RAVI), 4); // (the doc in hand still says 4: nothing more was counted)
    assert.equal(updates.length, 1);
    assert.equal(await share.countView(doc, ASHA), 5);
    redisDown = true;
    assert.equal(await share.countView(doc, OWNER), 4);
    assert.equal(updates.length, 2);
});

test("a person invited by email is tied to their account when they first open the doc", async () => {
    fresh();
    const doc = newDoc({ members: [{ id: "m1", email: "ravi@x.in", role: "viewer" }] });
    await share.claimMembership(doc, RAVI);
    assert.equal(String(doc.members[0].userId), RAVI._id);
    assert.equal(doc.members[0].name, "Ravi");
    assert.equal(updates.length, 1);
    await share.claimMembership(doc, RAVI); // (already tied: nothing more)
    await share.claimMembership(doc, OWNER);
    assert.equal(updates.length, 1);
});

test("everyone the doc names is sent with their current name and photo", async () => {
    fresh();
    const doc = newDoc({
        members: [{ id: "m1", userId: ASHA._id, email: "asha@x.in", name: "Old name", role: "editor" }],
        comments: [{ id: "c1", userId: RAVI._id, name: "Ravi", text: "Hi" }],
    });
    const forOwner = await share.docFor(doc, OWNER, { views: 9 });
    assert.equal(forOwner.views, 9);
    assert.equal(forOwner.ownerPhoto, "https://p/n.jpg");
    assert.deepEqual(forOwner.people.map((p) => [p.name, p.photo]), [["Asha", "https://p/a.jpg"]]);
    assert.equal(forOwner.comments[0].photo, "");
});
