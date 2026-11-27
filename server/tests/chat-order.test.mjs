// The chat list is ordered by last activity (owner, 2026-11-27: "when we open an old chat and type, it goes to the
// top of the chat list; in ours it stays as it is"). utils/chat-order.js:
//   - byLastActivity: every chat gets updated_at (its last touch from ai:chatTouched:<email>, else created_at) and
//     the list is sorted newest activity first; shared chats are merged in the same order; pins stay as data
// Run: node --test tests/chat-order.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { byLastActivity, lastActivity } = await import("../src/utils/chat-order.js");

const day = (d, h = 12) => new Date(Date.UTC(2026, 10, d, h)).toISOString();
const msOf = (iso) => String(Date.parse(iso));

test("an old chat with a new message goes to the top", () => {
    const sessions = [
        { id: "c", title: "Today", created_at: day(27, 9) },
        { id: "b", title: "Yesterday", created_at: day(26) },
        { id: "a", title: "Last Monday", created_at: day(23) },
    ];
    const out = byLastActivity(sessions, { a: msOf(day(27, 11)) });
    assert.deepEqual(out.map((s) => s.id), ["a", "c", "b"]);
    assert.equal(out[0].updated_at, day(27, 11));
});

test("a chat never touched keeps its created_at as updated_at and its place by created_at", () => {
    const out = byLastActivity([{ id: "x", created_at: day(20) }, { id: "y", created_at: day(22) }], {});
    assert.deepEqual(out.map((s) => s.id), ["y", "x"]);
    assert.equal(out[0].updated_at, day(22));
    assert.equal(lastActivity({ id: "z", created_at: day(1) }, { z: "not a number" }), day(1));
});

test("a touch older than the chat's start does not move it back", () => {
    assert.equal(lastActivity({ id: "a", created_at: day(23) }, { a: msOf(day(20)) }), day(23));
});

test("shared chats are merged into the same order, by their own touch", () => {
    const own = [{ id: "mine", created_at: day(25) }];
    const shared = [{ id: "shared", created_at: day(10), shared: true }];
    const out = byLastActivity([...shared, ...own], { shared: msOf(day(26)) });
    assert.deepEqual(out.map((s) => s.id), ["shared", "mine"]);
    assert.equal(out[0].shared, true);
});

test("pins and every other field are kept, the input is not changed", () => {
    const sessions = [{ id: "p", created_at: day(1), pinned: true, title: "Pinned", grid: true }, { id: "n", created_at: day(2) }];
    const out = byLastActivity(sessions, {});
    assert.deepEqual(out.map((s) => s.id), ["n", "p"]);
    assert.equal(out[1].pinned, true);
    assert.equal(out[1].grid, true);
    assert.equal(sessions[0].updated_at, undefined);
});

test("equal times: the newer chat first, then by id; empty input is an empty list", () => {
    const t = msOf(day(27));
    const out = byLastActivity([{ id: "a", created_at: day(1) }, { id: "b", created_at: day(2) }, { id: "c", created_at: day(2) }], { a: t, b: t, c: t });
    assert.deepEqual(out.map((s) => s.id), ["c", "b", "a"]);
    assert.deepEqual(byLastActivity(null, null), []);
});
