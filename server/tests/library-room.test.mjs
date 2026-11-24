// Room in the plan's Library storage for a file the AI makes (services/plan-limits.service.js libraryRoomFor).
// Files the AI uploads, a video it makes and the links found in its answer were added to the Library with no check,
// and the AI answered "added to the user's AI Library" for a full Library (owner, 2026-11-24, "fix all").
// Run: node --experimental-test-module-mocks --test tests/library-room.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const PLAN_ROWS = [
    { key: "free", name: "Free", library_storage_mb: 600 },
    { key: "pro", name: "Pro", library_storage_mb: 5000 },
    { key: "max", name: "Max", library_storage_mb: -1 },
];
let plansOn = true;
mock.module("../src/models/GlobalAiConfig.js", { defaultExport: { findOne: () => ({ select: () => ({ lean: async () => ({ plans_enabled: plansOn }) }) }) } });
mock.module("../src/models/PlanConfig.js", {
    defaultExport: { find: () => ({ lean: async () => PLAN_ROWS }) },
    namedExports: { DEFAULT_PLANS: [], PLAN_KEYS: ["free", "pro", "max"], ensurePlanRows: async () => {} },
});
// The Library's files: the sum by source, as the real aggregate gives it
const MB = 1024 * 1024;
let rows = [];
let broken = false;
mock.module("../src/models/AiLibraryFile.js", { defaultExport: { aggregate: async () => { if (broken) throw new Error("database down"); return rows; } } });
mock.module("../src/models/UserStorageQuota.js", { defaultExport: { findOne: () => ({ select: () => ({ lean: async () => null }) }) } });

const { libraryRoomFor, forgetPlans } = await import("../src/services/plan-limits.service.js");
const person = (plan) => ({ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "user", email: "someone@example.com", plan: { id: plan, status: "active" } });

test("room: the file fits what is left of the plan's Library", async () => {
    rows = [{ _id: "uploaded", bytes: 400 * MB, count: 3 }, { _id: "generated", bytes: 100 * MB, count: 9 }];
    assert.deepEqual(await libraryRoomFor(person("free"), 50 * MB), { ok: true });
    assert.deepEqual(await libraryRoomFor(person("free"), 100 * MB), { ok: true }, "exactly full is still room");
});

test("no room: the plan, what is used and the plan's size, as words for the AI", async () => {
    rows = [{ _id: "uploaded", bytes: 400 * MB, count: 3 }, { _id: "generated", bytes: 190 * MB, count: 9 }];
    assert.deepEqual(await libraryRoomFor(person("free"), 20 * MB), { ok: false, planName: "Free", used: "590 MB", cap: "600 MB" });
    // (a link found in an answer has no size: refused only when the Library is already over)
    assert.deepEqual(await libraryRoomFor(person("free"), 0), { ok: true });
    rows = [{ _id: "uploaded", bytes: 700 * MB, count: 3 }];
    assert.equal((await libraryRoomFor(person("free"), 0)).ok, false);
    // (the same files on a bigger plan fit)
    assert.deepEqual(await libraryRoomFor(person("pro"), 20 * MB), { ok: true });
});

test("always room: a plan with no storage limit, plans switched off, and a sum that cannot be read", async () => {
    rows = [{ _id: "uploaded", bytes: 90000 * MB, count: 3 }];
    assert.deepEqual(await libraryRoomFor(person("max"), 500 * MB), { ok: true });
    plansOn = false; forgetPlans();
    assert.deepEqual(await libraryRoomFor(person("free"), 500 * MB), { ok: true });
    plansOn = true; forgetPlans();
    broken = true;
    assert.deepEqual(await libraryRoomFor(person("free"), 500 * MB), { ok: true });
    broken = false;
});
