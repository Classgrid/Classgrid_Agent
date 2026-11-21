// The plan's number of cloud projects, projects_max (owner, 2026-11-21: "fix all"; it was checked only when a project
// was made in the app, so a folder project turned into a cloud one and the projects WhatsApp tasks and calls make were
// never counted). The one rule every path asks is in services/plan-limits.service.js. Checked here:
//   - cloudProjectRoom: under the limit = room; at the limit = no room; a plan of 0 = never room; -1 = no limit and
//     nothing is counted; no plan row (plans off, a super admin, an @classgrid.in account) = no limit
//   - what is counted: the person's own projects only; a folder on their own computer (location "local") is not
//     counted; an old project with no location is a cloud project; the count is read from the main database server
//   - asked after a project was made (made: true): at the limit is still fine, over it is not
//   - a count that can't be read is an error for the caller, never "there is room"
//   - the refusal: the same sentence, status 403 and code "plan_limit" the app's "new project" always gave ("1
//     project", "3 projects"); the sentence for the AI names the plan, the limit and how many the person has
//   - confirmCloudProject: over the limit after making = the new one is taken back; the count failing = taken back
//     and the error passed on
//   - makeCloudProject: makes one with room, makes nothing without; it is always a cloud project of that person; two
//     (and five) made in the same moment for the last free place never leave the person over the limit; one after
//     the other, the first gets the place and the second is refused
// The plan table, the settings and the projects are stand-ins: nothing real is read or written.
// Run: node --experimental-test-module-mocks --test tests/cloud-project-limit.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

// The plan table (models/PlanConfig.js) and the switch (models/GlobalAiConfig.js)
const PLAN_ROWS = [
    { key: "free", name: "Free", projects_max: 3 },
    { key: "pro", name: "Pro", projects_max: 1 },
    { key: "max", name: "Max", projects_max: -1 },
    { key: "enterprise", name: "Enterprise", projects_max: 0 },
];
let plansOn = true;
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => ({ select: () => ({ lean: async () => ({ plans_enabled: plansOn }) }) }) } });
mock.module("../src/models/PlanConfig.js", {
    defaultExport: { find: () => ({ lean: async () => PLAN_ROWS }) },
    namedExports: { DEFAULT_PLANS: [], PLAN_KEYS: ["free", "pro", "max", "enterprise"], ensurePlanRows: async () => {} },
});

// The projects (models/IdeProject.js): kept in a list; a count waits a moment like a real database, so requests sent
// together really overlap
let projects = [];
let nextId = 1;
let countBroken = false;
const counts = []; // every count asked: { filter, read }
const tick = () => new Promise((r) => setImmediate(r));
const matches = (p, filter) => String(p.owner) === String(filter.owner) && (!filter.location || p.location !== filter.location.$ne);
mock.module("../src/models/IdeProject.js", {
    defaultExport: {
        countDocuments: (filter) => {
            const asked = { filter, read: null };
            counts.push(asked);
            const run = async () => { await tick(); if (countBroken) throw new Error("database down"); return projects.filter((p) => matches(p, filter)).length; };
            const query = { read: (mode) => { asked.read = mode; return query; }, then: (ok, bad) => run().then(ok, bad) };
            return query;
        },
        create: async (fields) => { await tick(); const doc = { _id: `p${nextId++}`, ...fields }; projects.push(doc); return doc; },
        deleteOne: async ({ _id }) => { await tick(); projects = projects.filter((p) => p._id !== _id); return { deletedCount: 1 }; },
    },
});

const { cloudProjectRoom, confirmCloudProject, makeCloudProject, cloudProjectRefusal, cloudProjectLimitText, cloudProjectLimitForAi, forgetPlans } = await import("../src/services/plan-limits.service.js");

const A = "aaaaaaaaaaaaaaaaaaaaaaaa", B = "bbbbbbbbbbbbbbbbbbbbbbbb";
const person = (id, plan = "free", more = {}) => ({ _id: id, role: "user", email: "someone@example.com", plan: { id: plan, status: "active" }, ...more });
const FREE = person(A), PRO = person(A, "pro"), MAX = person(A, "max"), NONE = person(A, "enterprise");
const give = (owner, n, more = {}) => { for (let i = 0; i < n; i++) projects.push({ _id: `p${nextId++}`, owner, name: `Project ${nextId}`, location: "cloud", ...more }); };
const cloudOf = (owner) => projects.filter((p) => String(p.owner) === owner && p.location !== "local").length;
const reset = () => { projects = []; counts.length = 0; countBroken = false; plansOn = true; forgetPlans(); };

test("under the limit: there is room", async () => {
    reset();
    assert.deepEqual(await cloudProjectRoom(FREE), { ok: true, limit: 3, have: 0, plan: PLAN_ROWS[0] });
    give(A, 2);
    const room = await cloudProjectRoom(FREE);
    assert.equal(room.ok, true);
    assert.equal(room.have, 2);
    assert.equal(room.limit, 3);
});

test("at the limit, and over it: no room", async () => {
    reset();
    give(A, 3);
    const full = await cloudProjectRoom(FREE);
    assert.equal(full.ok, false);
    assert.equal(full.have, 3);
    assert.equal(full.limit, 3);
    assert.equal(full.plan.key, "free");
    give(A, 2);
    assert.equal((await cloudProjectRoom(FREE)).ok, false);
});

test("a plan of 0 never has room", async () => {
    reset();
    const none = await cloudProjectRoom(NONE);
    assert.equal(none.ok, false);
    assert.equal(none.limit, 0);
});

test("unlimited (-1): room, and nothing is counted", async () => {
    reset();
    give(A, 500);
    assert.deepEqual(await cloudProjectRoom(MAX), { ok: true, limit: null, have: null, plan: PLAN_ROWS[2] });
    assert.deepEqual(await cloudProjectRoom(MAX, { made: true }), { ok: true, limit: null, have: null, plan: PLAN_ROWS[2] });
    assert.equal(counts.length, 0);
});

test("no plan row (plans off, a super admin, an @classgrid.in account): no limit", async () => {
    reset();
    give(A, 500);
    assert.deepEqual(await cloudProjectRoom(person(A, "free", { role: "super_admin" })), { ok: true, limit: null, have: null, plan: null });
    assert.deepEqual(await cloudProjectRoom(person(A, "free", { email: "Someone@Classgrid.in" })), { ok: true, limit: null, have: null, plan: null });
    assert.equal((await cloudProjectRoom(FREE)).ok, false); // (the same projects stop a normal Free account)
    plansOn = false;
    forgetPlans();
    assert.deepEqual(await cloudProjectRoom(FREE), { ok: true, limit: null, have: null, plan: null });
    assert.equal(counts.length, 1); // (only the normal Free account's check counted anything)
});

test("folder projects on the person's own computer are not counted, and nobody else's projects are", async () => {
    reset();
    give(A, 40, { location: "local", localPath: "C:\\work" });
    give(B, 40);
    give(A, 2);
    const room = await cloudProjectRoom(FREE);
    assert.equal(room.ok, true);
    assert.equal(room.have, 2);
    assert.deepEqual(counts.at(-1).filter, { owner: A, location: { $ne: "local" } });
    assert.equal(counts.at(-1).read, "primary");
    // An old project saved before "location" existed is a cloud project
    projects.push({ _id: "old", owner: A, name: "Old one" });
    const full = await cloudProjectRoom(FREE);
    assert.equal(full.have, 3);
    assert.equal(full.ok, false);
});

test("asked after a project was made: at the limit is fine, over it is not", async () => {
    reset();
    give(A, 3);
    assert.equal((await cloudProjectRoom(FREE, { made: true })).ok, true);
    give(A, 1);
    const over = await cloudProjectRoom(FREE, { made: true });
    assert.equal(over.ok, false);
    assert.equal(over.have, 4);
});

test("a count that can't be read is an error, never room", async () => {
    reset();
    countBroken = true;
    await assert.rejects(() => cloudProjectRoom(FREE), /database down/);
    await assert.rejects(() => cloudProjectRoom(FREE, { made: true }), /database down/);
    await assert.rejects(() => makeCloudProject(FREE, { name: "X" }), /database down/);
    assert.equal(projects.length, 0);
    // An account that is not known can't be counted either
    countBroken = false;
    await assert.rejects(() => cloudProjectRoom({ role: "user", email: "x@example.com", plan: { id: "free" } }), /not known/);
});

test("the refusal: the app's own sentence, 403 and plan_limit", () => {
    assert.equal(cloudProjectLimitText(PLAN_ROWS[0]), "Your Free plan allows 3 projects. Upgrade your plan to make more, or work in a folder on your own computer.");
    assert.equal(cloudProjectLimitText(PLAN_ROWS[1]), "Your Pro plan allows 1 project. Upgrade your plan to make more, or work in a folder on your own computer.");
    assert.deepEqual(cloudProjectRefusal(PLAN_ROWS[0]), {
        status: 403,
        body: { error: "Your Free plan allows 3 projects. Upgrade your plan to make more, or work in a folder on your own computer.", code: "plan_limit", plan: "free" },
    });
});

test("the sentence for the AI names the plan, the limit and how many the person has", () => {
    assert.equal(cloudProjectLimitForAi({ ok: false, limit: 3, have: 3, plan: PLAN_ROWS[0] }), "No new project was made: the person's Free plan allows 3 cloud projects and they already have 3. Tell them their plan's project limit is reached.");
    assert.match(cloudProjectLimitForAi({ ok: false, limit: 1, have: 1, plan: PLAN_ROWS[1] }), /Pro plan allows 1 cloud project and they already have 1\./);
});

test("confirmCloudProject: inside the limit it stays, over the limit it is taken back", async () => {
    reset();
    give(A, 3);
    let undone = 0;
    assert.equal((await confirmCloudProject(FREE, async () => { undone++; })).ok, true);
    assert.equal(undone, 0);
    give(A, 1);
    const over = await confirmCloudProject(FREE, async () => { undone++; projects.pop(); });
    assert.equal(over.ok, false);
    assert.equal(over.have, 3); // (how many the person has once it was taken back)
    assert.equal(over.plan.key, "free");
    assert.equal(undone, 1);
    assert.equal(cloudOf(A), 3);
});

test("confirmCloudProject: the count failing takes the project back and passes the error on", async () => {
    reset();
    give(A, 1);
    countBroken = true;
    let undone = 0;
    await assert.rejects(() => confirmCloudProject(FREE, async () => { undone++; }), /database down/);
    assert.equal(undone, 1);
    // No limit: nothing is counted, so nothing can fail and nothing is taken back
    assert.equal((await confirmCloudProject(MAX, async () => { undone++; })).ok, true);
    assert.equal(undone, 1);
});

test("makeCloudProject: makes one with room, as a cloud project of that person", async () => {
    reset();
    give(A, 2);
    const made = await makeCloudProject(FREE, { name: "Shop", owner: B, location: "local", localPath: "C:\\x" });
    assert.equal(made.ok, true);
    assert.equal(made.project.name, "Shop");
    assert.equal(made.project.owner, A);
    assert.equal(made.project.location, "cloud");
    assert.equal(made.project.localPath, null);
    assert.equal(made.have, 3);
    assert.equal(cloudOf(A), 3);
});

test("makeCloudProject: at the limit nothing is made", async () => {
    reset();
    give(A, 3);
    const made = await makeCloudProject(FREE, { name: "One more" });
    assert.equal(made.ok, false);
    assert.equal(made.project, null);
    assert.equal(made.limit, 3);
    assert.equal(made.have, 3);
    assert.equal(cloudOf(A), 3);
    // No limit: made however many there are
    const open = await makeCloudProject(MAX, { name: "Another" });
    assert.equal(open.ok, true);
    assert.equal(cloudOf(A), 4);
});

test("made in the same moment for the last free place: the person is never over the limit", async () => {
    for (const together of [2, 5]) {
        reset();
        give(A, 2);
        const results = await Promise.all(Array.from({ length: together }, (_, i) => makeCloudProject(FREE, { name: `Same moment ${i}` })));
        assert.ok(cloudOf(A) <= 3, `${together} together left ${cloudOf(A)} cloud projects on a plan of 3`);
        // Every "made" answer has its project, every refusal has none and left nothing behind
        const kept = results.filter((r) => r.ok);
        assert.equal(cloudOf(A), 2 + kept.length);
        for (const r of results) assert.equal(!!r.project, r.ok);
        for (const r of kept) assert.ok(projects.some((p) => p._id === r.project._id));
    }
});

test("one after the other: the first gets the last place, the second is refused", async () => {
    reset();
    give(A, 2);
    const first = await makeCloudProject(FREE, { name: "First" });
    const second = await makeCloudProject(FREE, { name: "Second" });
    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    assert.equal(cloudOf(A), 3);
    // Another person's limit is their own
    assert.equal((await makeCloudProject(person(B), { name: "Mine" })).ok, true);
});
