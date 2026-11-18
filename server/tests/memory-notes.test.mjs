// The AI's online memory notes (owner, 2026-11-18): exam dates, deadlines and events a person mentions are kept in
// MongoDB and known in every chat. Checked here:
//   - names, dates and the 4-month expiry (a week after the note's date when that is later)
//   - save / update by name, search, delete, the 200-note limit, and that secrets are refused
//   - the prompt block, with dated notes still ahead first
//   - the background reader goes by what was said, not by how many messages (owner, 2026-11-18): a single message with
//     an exam date is read at once, messages with nothing worth keeping cost no model call; it reads only the new
//     messages (a few earlier ones only to understand them), saves, updates and deletes, and survives an answer that is
//     not JSON and a model that fails
//   - save_user_note and search_user_notes are always loaded; delete_user_note is in the memory_notes group
// The notes collection, Redis and the chat messages are stand-ins: nothing is read from or written to a database.
// Run: node --experimental-test-module-mocks --test tests/memory-notes.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

// ── Stand-in notes collection ──
let rows = [];
let clock = 0;
const match = (r, f) => Object.entries(f).every(([k, v]) => String(r[k]) === String(v));
const q = (value) => ({ sort: () => q([...value].sort((a, b) => b.updatedAt - a.updatedAt)), limit: (n) => q(value.slice(0, n)), lean: () => q(value), then: (ok, bad) => Promise.resolve(value).then(ok, bad) });
const Notes = {
    find: (f) => q(rows.filter((r) => match(r, f))),
    findOne: (f) => q(rows.find((r) => match(r, f)) || null),
    countDocuments: async (f) => rows.filter((r) => match(r, f)).length,
    findOneAndUpdate: (f, u) => {
        let row = rows.find((r) => match(r, f));
        if (!row) { row = { ...f }; rows.push(row); }
        Object.assign(row, u.$set, { updatedAt: ++clock });
        return q(row);
    },
    deleteOne: async (f) => { const before = rows.length; rows = rows.filter((r) => !match(r, f)); return { deletedCount: before - rows.length }; },
};
const TYPES = ["exam", "deadline", "event", "study", "work", "project", "preference", "fact"];
mock.module("../src/models/AiMemoryNote.js", { defaultExport: Notes, namedExports: { MEMORY_NOTE_TYPES: TYPES } });

// ── Stand-in Redis and chat messages ──
const kv = new Map();
mock.module("../src/config/redis.js", { defaultExport: {
    get: async (k) => kv.get(k) ?? null,
    set: async (k, v, ...rest) => { if (rest.includes("NX") && kv.has(k)) return null; kv.set(k, v); return "OK"; },
    del: async (k) => { kv.delete(k); },
} });
let chat = [];
const messagesQuery = () => {
    const state = { head: false, range: null };
    const b = {
        select: (_cols, opts) => { state.head = !!opts?.head; return b; },
        eq: () => b, order: () => b, limit: () => b,
        maybeSingle: () => Promise.resolve({ data: chat.length ? chat[chat.length - 1] : null, error: null }),
        range: (from, to) => { state.range = [from, to]; return b; },
        then: (ok) => Promise.resolve(state.head ? { count: chat.length, error: null } : { data: chat.slice(state.range[0], state.range[1] + 1), error: null }).then(ok),
    };
    return b;
};
mock.module("../src/config/supabaseClient.js", { namedExports: { primarySupabaseClient: { from: () => messagesQuery() } } });

const notes = await import("../src/services/ai-memory-notes.js");
const groups = await import("../src/services/ai-tool-groups.js");

const USER = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", email: "someone@example.com", role: "user" };
const NOW = Date.UTC(2026, 10, 18, 12);
const DAY = 24 * 3600 * 1000;
const reset = () => { rows = []; kv.clear(); chat = []; };
const say = (role, content) => chat.push({ role, content, created_at: new Date(NOW).toISOString() });

test("names are kebab-case, dates are real dates", () => {
    assert.equal(notes.noteName("  DSA Exam!! "), "dsa-exam");
    assert.equal(notes.noteName("???"), "");
    assert.equal(notes.noteDate("2026-11-25").toISOString(), "2026-11-25T00:00:00.000Z");
    assert.equal(notes.noteDate("2026-02-31"), null);
    assert.equal(notes.noteDate("next Monday"), null);
});

test("a note is kept 4 months, or until a week after its date when that is later", () => {
    assert.equal(notes.NOTE_KEEP_DAYS, 120);
    assert.equal(notes.noteExpiry(null, NOW).getTime(), NOW + 120 * DAY);
    assert.equal(notes.noteExpiry(new Date(NOW + 5 * DAY), NOW).getTime(), NOW + 120 * DAY);
    assert.equal(notes.noteExpiry(new Date(NOW + 200 * DAY), NOW).getTime(), NOW + 207 * DAY);
    assert.equal(notes.noteExpiry(new Date(NOW + 5000 * DAY), NOW).getTime(), NOW + 730 * DAY, "never more than 2 years");
});

test("save, update by the same name, search and delete", async () => {
    reset();
    const first = await notes.saveNote({ userId: USER._id, name: "DSA Exam", type: "exam", date: "2026-11-25", content: "DSA exam on 2026-11-25." }, NOW);
    assert.equal(first.created, true);
    assert.equal(first.note.name, "dsa-exam");
    assert.equal(first.note.expiresAt.getTime(), NOW + 120 * DAY);
    const again = await notes.saveNote({ userId: USER._id, name: "dsa-exam", content: "DSA exam moved; syllabus: stacks and trees." }, NOW + DAY);
    assert.equal(again.created, false);
    assert.equal(rows.length, 1);
    assert.equal(again.note.type, "exam", "the type stays when it is not given again");
    assert.equal(again.note.date.toISOString().slice(0, 10), "2026-11-25", "the date stays when it is not given again");
    assert.equal(again.note.expiresAt.getTime(), NOW + 121 * DAY, "an update keeps the note 4 more months");
    await notes.saveNote({ userId: USER._id, name: "sister-wedding", type: "event", date: "2027-01-10", content: "Sister's wedding in Pune." }, NOW);
    assert.deepEqual((await notes.searchNotes({ userId: USER._id, query: "stacks exam" })).map((n) => n.name), ["dsa-exam"]);
    assert.equal((await notes.searchNotes({ userId: USER._id, query: "" })).length, 2);
    assert.equal((await notes.searchNotes({ userId: "bbbbbbbbbbbbbbbbbbbbbbbb", query: "" })).length, 0, "another person's notes are never returned");
    assert.equal(await notes.deleteNote({ userId: USER._id, name: "DSA exam" }), true);
    assert.equal(await notes.deleteNote({ userId: USER._id, name: "dsa-exam" }), false);
});

test("secrets, empty notes and a full notebook are refused", async () => {
    reset();
    assert.match((await notes.saveNote({ userId: USER._id, name: "bank", content: "My password is hunter2" })).error, /never kept/);
    assert.match((await notes.saveNote({ userId: USER._id, name: "otp", content: "OTP: 4455" })).error, /never kept/);
    assert.match((await notes.saveNote({ userId: USER._id, name: "", content: "x" })).error, /name/);
    assert.match((await notes.saveNote({ userId: USER._id, name: "x", content: "  " })).error, /content/);
    assert.equal(rows.length, 0);
    rows = Array.from({ length: notes.MAX_NOTES_PER_USER }, (_, i) => ({ userId: USER._id, name: `n-${i}`, content: "x", updatedAt: i }));
    assert.match((await notes.saveNote({ userId: USER._id, name: "one-more", content: "x" })).error, /delete one first/);
    assert.equal((await notes.saveNote({ userId: USER._id, name: "n-3", content: "changed" })).created, false, "an existing note can still be updated");
});

test("the prompt block lists the notes, dated ones still ahead first; nothing when there are none", () => {
    assert.equal(notes.savedNotesBlock([], NOW), "");
    const block = notes.savedNotesBlock([
        { name: "college", type: "study", content: "Second year, computer engineering.", updatedAt: new Date(NOW) },
        { name: "old-test", type: "exam", date: new Date(NOW - 20 * DAY), content: "Unit test, done.", updatedAt: new Date(NOW - 20 * DAY) },
        { name: "dsa-exam", type: "exam", date: new Date(Date.UTC(2026, 10, 25)), content: "DSA exam.", updatedAt: new Date(NOW - DAY) },
    ], NOW);
    assert.match(block, /^\n<saved_notes>\n/);
    assert.match(block, /<\/saved_notes>\n$/);
    assert.match(block, /- dsa-exam \[exam\] \(2026-11-25\): DSA exam\./);
    assert.ok(block.indexOf("dsa-exam (") < block.indexOf("college ["), "the exam ahead comes first");
    assert.ok(block.indexOf("college [") < block.indexOf("old-test ["), "a date that has passed is not put first");
    assert.match(block, /save_user_note/);
    assert.match(block, /search_user_notes/, "the AI is told to read a note in full with search");
    const long = notes.savedNotesBlock([{ name: "big", type: "fact", content: Array.from({ length: 40 }, (_, i) => `word${i}`).join(" "), updatedAt: new Date(NOW) }], NOW);
    assert.match(long, /word11\.\.\./);
    assert.doesNotMatch(long, /word12/, "only the first few words of a note go into the prompt");
});

test("the reader's answer: JSON is read, anything else saves nothing", () => {
    const ok = notes.parseReaderAnswer('thinking...\n{"save":[{"name":"DSA Exam","type":"exam","date":"2026-11-25","content":"DSA on 25th"},{"name":"","content":"x"},{"name":"y"}],"delete":["Old Note"]}');
    assert.deepEqual(ok.save, [{ name: "dsa-exam", type: "exam", date: "2026-11-25", content: "DSA on 25th" }]);
    assert.deepEqual(ok.delete, ["old-note"]);
    assert.deepEqual(notes.parseReaderAnswer("I could not find anything."), { save: [], delete: [] });
    assert.deepEqual(notes.parseReaderAnswer('{"save": [oops'), { save: [], delete: [] });
    assert.deepEqual(notes.parseReaderAnswer('{"save":"no"}'), { save: [], delete: [] });
});

test("what is worth keeping: exams, dates, deadlines, events, studies and work, never everyday code words", () => {
    const user = (content) => [{ role: "user", content }];
    for (const text of [
        "my DSA exam is next Wednesday", "physics paper on 25th", "remember my viva is on 3 December", "assignment submission by Friday",
        "meri sister ki shaadi 12/12 ko hai", "kal mera test hai", "my time table: Monday maths, Tuesday physics", "I am studying B.Tech CSE at VIT",
        "interview on 2026-12-02", "मेरी परीक्षा कल है", "semester 5 subjects are DBMS, OS and CN", "don't forget my birthday",
    ]) assert.ok(notes.worthKeeping(user(text)), text);
    for (const text of [
        "write a function to reverse a string", "run the tests and fix the failing one", "add a class to the button", "hello", "what is 2+2",
        "update the version to 1.0.32", "submit the form with fetch", "create a new project in Studio",
    ]) assert.ok(!notes.worthKeeping(user(text)), text);
    assert.ok(!notes.worthKeeping([{ role: "assistant", content: "Your exam is on Monday" }]), "only the person's own messages count");
    assert.ok(notes.worthKeeping([{ role: "user", content: JSON.stringify({ classgrid_ai_message: true, content: "exam on Monday" }) }]));
});

test("one message with an exam date is read right after the answer, with no count of messages", async () => {
    reset();
    const asked = [];
    const ask = async (input) => { asked.push(input); return '{"save":[{"name":"dsa-exam","type":"exam","date":"2026-11-25","content":"DSA exam on 2026-11-25."}],"delete":[]}'; };
    say("user", "my DSA exam is next Wednesday"); say("assistant", JSON.stringify({ classgrid_ai_message: true, content: "Good luck!", steps: [] }));
    assert.equal(await notes.notesFromChat({ sessionId: "s1", userId: USER._id, ask, now: NOW }), true);
    assert.equal(asked.length, 1, "two messages are enough when one holds an exam");
    assert.match(asked[0], /^TODAY: 2026-11-18 \(India\)/);
    assert.match(asked[0], /SAVED:\n\(none\)/);
    assert.match(asked[0], /USER: my DSA exam is next Wednesday/);
    assert.match(asked[0], /ASSISTANT: Good luck!/, "a saved answer's text is read, not its JSON");
    assert.doesNotMatch(asked[0], /classgrid_ai_message/);
    assert.doesNotMatch(asked[0], /EARLIER MESSAGES/, "nothing earlier in this chat");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source, "auto");
    assert.equal(rows[0].session_id, "s1");
    assert.equal(kv.has("ai:memnotes:lock:s1"), false, "the lock is released after a good run");
    // nothing new since: not read again
    assert.equal(await notes.notesFromChat({ sessionId: "s1", userId: USER._id, ask, now: NOW }), false);
    assert.equal(asked.length, 1);
});

test("messages with nothing worth keeping cost no model call; the next important one is read with them only as context", async () => {
    reset();
    const asked = [];
    const ask = async (input) => { asked.push(input); return '{"save":[],"delete":["dsa-exam","not-a-note"]}'; };
    rows.push({ userId: USER._id, name: "dsa-exam", type: "exam", content: "DSA exam on 2026-11-25.", date: new Date("2026-11-25"), updatedAt: ++clock });
    for (let i = 0; i < 12; i++) { say("user", `write a function number ${i}`); say("assistant", `here is code ${i}`); }
    assert.equal(await notes.notesFromChat({ sessionId: "s2", userId: USER._id, ask, now: NOW }), false);
    assert.equal(asked.length, 0, "24 messages of code: no model call, whatever the count");
    say("user", "my DSA exam got cancelled"); say("assistant", "Oh, okay.");
    assert.equal(await notes.notesFromChat({ sessionId: "s2", userId: USER._id, ask, now: NOW }), true);
    assert.equal(asked.length, 1);
    assert.match(asked[0], /NEW MESSAGES:\nUSER: my DSA exam got cancelled/);
    assert.match(asked[0], /EARLIER MESSAGES \(already read before; only to understand the new ones\):\n[\s\S]*here is code 11/);
    assert.doesNotMatch(asked[0], /write a function number 0\b/, "only a few earlier messages, not the whole chat");
    assert.match(asked[0], /SAVED:\n- \[exam\] dsa-exam \(2026-11-25\)/);
    assert.equal(rows.length, 0, "the reader deleted the note that is over");
});

test("the reader survives an answer that is not JSON and a model that fails", async () => {
    reset();
    say("user", "my maths exam is on 5 December"); say("assistant", "Noted.");
    assert.equal(await notes.notesFromChat({ sessionId: "s4", userId: USER._id, ask: async () => "nothing to save", now: NOW }), false);
    assert.equal(rows.length, 0);
    say("user", "and physics on 8 December"); say("assistant", "Okay.");
    let calls = 0;
    const broken = async () => { calls++; throw new Error("model down"); };
    assert.equal(await notes.notesFromChat({ sessionId: "s4", userId: USER._id, ask: broken, now: NOW }), false);
    assert.equal(await notes.notesFromChat({ sessionId: "s4", userId: USER._id, ask: broken, now: NOW }), false);
    assert.equal(calls, 1, "after a failure it waits for the lock to run out instead of trying after every answer");
    assert.equal(await notes.notesFromChat({ sessionId: "", userId: USER._id, ask: broken }), false);
});

test("the AI's tools: save, search, delete, and no signed-in user", async () => {
    reset();
    let changes = 0;
    const h = notes.buildSavedNoteHandlers({ user: USER, sessionId: "s3", onChange: () => changes++ });
    assert.match(await h.save_user_note({ name: "Maths exam", type: "exam", date: "2026-12-02", content: "Maths exam on 2026-12-02." }), /^Saved the note "maths-exam"/);
    assert.match(await h.save_user_note({ name: "maths-exam", content: "Maths exam on 2026-12-02, units 1 to 4." }), /^Updated the note "maths-exam"/);
    assert.match(await h.search_user_notes({ query: "maths" }), /1 note\(s\):\n- \[exam\] maths-exam \(2026-12-02\): Maths exam on 2026-12-02, units 1 to 4\./);
    assert.equal(await h.search_user_notes({ query: "physics" }), 'No note holds "physics".');
    assert.match(await h.save_user_note({ name: "pin", content: "ATM pin is 1234" }), /^Error: passwords/);
    assert.equal(await h.delete_user_note({ name: "maths-exam" }), 'Deleted the note "maths-exam".');
    assert.match(await h.delete_user_note({ name: "maths-exam" }), /^Error: there is no note/);
    assert.equal(await h.search_user_notes({}), "There are no notes yet.");
    assert.equal(changes, 3, "two saves and one delete");
    const nobody = notes.buildSavedNoteHandlers({ user: null });
    assert.equal(await nobody.save_user_note({ name: "x", content: "y" }), "Error: sign in first.");
});

test("save and search are always loaded; delete is in the memory_notes group, loaded for exam and remember messages", () => {
    const names = notes.SAVED_NOTE_TOOLS.map((t) => t.function.name);
    assert.deepEqual(names, ["save_user_note", "search_user_notes", "delete_user_note"]);
    assert.deepEqual(groups.TOOL_GROUPS.find((g) => g.id === "memory_notes").tools, names);
    for (const name of names) assert.equal(groups.groupOfTool(name), "memory_notes");
    assert.ok(groups.CORE_TOOL_NAMES.includes("save_user_note") && groups.CORE_TOOL_NAMES.includes("search_user_notes"));
    assert.ok(!groups.CORE_TOOL_NAMES.includes("delete_user_note"));
    const allTools = [...notes.SAVED_NOTE_TOOLS, { type: "function", function: { name: "search_web" } }];
    const plan = (text) => groups.planToolsForMessage({ allTools, text, role: "user", email: USER.email });
    for (const text of ["my exam is on Monday", "remember that my viva is on the 3rd", "forget my old deadline", "meri परीक्षा kal hai"]) {
        assert.ok(plan(text).loadedNames.has("delete_user_note"), text);
    }
    for (const text of ["hello", "write a function to reverse a string", "run the tests"]) {
        assert.ok(plan(text).loadedNames.has("save_user_note"), `${text}: save is always there`);
        assert.ok(plan(text).loadedNames.has("search_user_notes"), `${text}: search is always there`);
        assert.ok(!plan(text).loadedNames.has("delete_user_note"), text);
    }
    assert.ok(plan("hello").allowedToolNames.has("delete_user_note"), "always offered through load_tools");
});
