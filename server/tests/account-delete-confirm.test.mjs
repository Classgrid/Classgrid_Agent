// How Delete Account is confirmed (services/account-delete-confirm.service.js; 2026-11-25). An account with a
// password of its own confirms with that password, as before. An account without one (Google, GitHub or an email
// code) could never delete itself; it now confirms with a 6-digit code sent to its own email. Checked here:
//   - the code: six digits, kept only as a hash keyed with the server's secret, good for this account and for
//     deleting it only (not another account, not the code of another feature)
//   - judging a code with no database: none, expired, tries used up, wrong, ok
//   - an account with a password: the same three answers as before (password needed, administrators refused,
//     wrong password), a code is never taken in place of the password, and no code is sent to it
//   - an account without a password: no code refused, a password alone refused (nothing is compared), a wrong code
//     refused and counted, five tries then no more, the right code accepted once, an expired code refused, a code
//     another account was sent refused, administrators refused
//   - sending: one a minute, five a day, the email goes to the account's main email with the code and the words
//     that the account stays if the person did not ask; an email that fails takes the code and the wait back
//   - the controller and the route use this gate before anything is sent or deleted (read from the source: the
//     controller is too big to run here)
// The database and the email sender are stand-ins in memory: nothing real is read, written or sent.
// Run: node --experimental-test-module-mocks --test tests/account-delete-confirm.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import bcrypt from "bcryptjs";

process.env.JWT_SECRET = "a-secret-only-this-test-knows";

// ── The accounts, in memory, with the few query words the service uses ──
let users = [];
const at = (row, path) => path.split(".").reduce((v, k) => (v === null || v === undefined ? undefined : v[k]), row);
const put = (row, path, value) => {
    const keys = path.split(".");
    let o = row;
    for (const k of keys.slice(0, -1)) { if (o[k] === null || typeof o[k] !== "object") o[k] = {}; o = o[k]; }
    if (value === undefined) delete o[keys[keys.length - 1]]; else o[keys[keys.length - 1]] = value;
};
const num = (v) => (v instanceof Date ? v.getTime() : v);
const matches = (row, filter = {}) => Object.entries(filter).every(([field, want]) => {
    if (field === "$or") return want.some((f) => matches(row, f));
    if (field === "$and") return want.every((f) => matches(row, f));
    const have = at(row, field);
    if (want instanceof RegExp) return typeof have === "string" && want.test(have);
    if (want && typeof want === "object" && !(want instanceof Date)) {
        if ("$regex" in want && !(typeof have === "string" && want.$regex.test(have))) return false;
        if ("$lt" in want && !(have !== null && have !== undefined && num(have) < num(want.$lt))) return false;
        if ("$gt" in want && !(have !== null && have !== undefined && num(have) > num(want.$gt))) return false;
        if ("$ne" in want && (have ?? null) === (want.$ne ?? null)) return false;
        return true;
    }
    return want === null ? have === null || have === undefined : String(have) === String(want);
});
const apply = (row, update) => {
    for (const [path, value] of Object.entries(update.$set || {})) put(row, path, value);
    for (const [path, by] of Object.entries(update.$inc || {})) put(row, path, (Number(at(row, path)) || 0) + by);
    for (const path of Object.keys(update.$unset || {})) put(row, path, undefined);
};
const copy = (row) => (row ? structuredClone(row) : null);
const found = (value) => {
    const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve().then(value).then(ok, bad), catch: (bad) => Promise.resolve().then(value).catch(bad) };
    return q;
};
const updates = []; // every change asked of the database, to see that a refused request changes nothing
mock.module("../src/models/User.js", {
    defaultExport: {
        exists: async (filter) => { const row = users.find((u) => matches(u, filter)); return row ? { _id: row._id } : null; },
        findById: (id) => found(() => copy(users.find((u) => u._id === String(id)))),
        findOneAndUpdate: (filter, update, options = {}) => found(() => {
            const row = users.find((u) => matches(u, filter));
            if (!row) return null;
            const before = copy(row);
            updates.push(update);
            apply(row, update);
            return options.returnDocument === "before" ? before : copy(row);
        }),
        updateOne: (filter, update) => found(() => {
            const row = users.find((u) => matches(u, filter));
            if (row) { updates.push(update); apply(row, update); }
            return { modifiedCount: row ? 1 : 0 };
        }),
    },
});
const sent = [];
let emailFails = false;
mock.module("../src/services/aws-ses.service.js", {
    namedExports: { sendEmail: async (email) => { if (emailFails) throw new Error("the mail server said no"); sent.push(email); return { messageId: "1" }; } },
});

const {
    confirmAccountDeletion, sendDeleteAccountCode, accountHasPassword, judgeDeleteCode, makeDeleteCode, hashDeleteCode,
    CODE_TTL_MS, MAX_TRIES, CODES_PER_DAY,
} = await import("../src/services/account-delete-confirm.service.js");
const { isRealPasswordHash } = await import("../src/utils/password-hash.js");

const A = "aaaaaaaaaaaaaaaaaaaaaaaa"; // signs in with Google: no password of its own
const B = "bbbbbbbbbbbbbbbbbbbbbbbb"; // another account without a password
const P = "cccccccccccccccccccccccc"; // has a password
const PASSWORD = "Right-Horse-9";
const HASH = await bcrypt.hash(PASSWORD, 4);
const fill = () => {
    users = [
        { _id: A, email: "asha@example.com", name: "Asha <b>", role: "user", password: null },
        { _id: B, email: "ravi@example.com", name: "Ravi", role: "user" },
        { _id: P, email: "meera@example.com", name: "Meera", role: "user", password: HASH },
    ];
    sent.length = 0; updates.length = 0; emailFails = false;
};
const account = (id) => copy(users.find((u) => u._id === id));
const codeIn = (email) => email.text.match(/Your Code: (\d{6})/)[1];
/** A code sent to the account, the real way: what the email carried. */
const sendCodeTo = async (id) => {
    const answer = await sendDeleteAccountCode(account(id));
    assert.equal(answer.status, 200, JSON.stringify(answer.body));
    return codeIn(sent[sent.length - 1]);
};
const later = (id, ms) => { const row = users.find((u) => u._id === id); row.account_delete_code.code_sent_at = new Date(Date.now() - ms); };

test("the rule for 'has a password of its own' is the one the sign-in screen uses", async () => {
    fill();
    assert.equal(isRealPasswordHash(HASH), true);
    for (const none of [null, undefined, "", "4f9a0c1d2e3b4a5f", "plain-random-placeholder", 7, {}]) assert.equal(isRealPasswordHash(none), false);
    assert.equal(await accountHasPassword(P), true);
    assert.equal(await accountHasPassword(A), false);
    assert.equal(await accountHasPassword(B), false, "no password field at all");
    users.push({ _id: "dddddddddddddddddddddddd", role: "user", password: "4f9a0c1d2e3b4a5f6a7b8c9d0e1f2a3b" }); // an older sign-up's plain placeholder
    assert.equal(await accountHasPassword("dddddddddddddddddddddddd"), false);
    assert.equal(await accountHasPassword("eeeeeeeeeeeeeeeeeeeeeeee"), false, "no such account");
    // (the controller and the service take the rule from one file)
    const controller = fs.readFileSync(new URL("../src/controllers/auth.controller.js", import.meta.url), "utf8");
    assert.ok(controller.includes('import { isRealPasswordHash } from "../utils/password-hash.js";'));
    assert.equal(/function isRealPasswordHash/.test(controller), false, "no second copy of the rule");
});

test("the code: six digits, kept as a keyed hash for this account and this purpose only", () => {
    const seen = new Set();
    for (let i = 0; i < 300; i += 1) { const code = makeDeleteCode(); assert.match(code, /^[1-9]\d{5}$/); seen.add(code); }
    assert.ok(seen.size > 250, "random");

    const hash = hashDeleteCode(A, "123456");
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(hash, hashDeleteCode(A, "123456"));
    assert.notEqual(hash, hashDeleteCode(B, "123456"), "another account's code");
    assert.notEqual(hash, hashDeleteCode(A, "123457"));
    assert.equal(hash.includes("123456"), false);
    // Not what a plain hash of the same words gives (the server's secret is in it), and not the hash another
    // feature keeps for its own code (Settings > Account > Emails: controllers/account-emails.controller.js)
    assert.notEqual(hash, crypto.createHash("sha256").update(`account-delete:${A}:123456`).digest("hex"));
    assert.notEqual(hash, crypto.createHash("sha256").update(`${A}:asha@example.com:123456`).digest("hex"));
    const kept = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "another-secret";
    assert.notEqual(hashDeleteCode(A, "123456"), hash, "keyed with the server's secret");
    delete process.env.JWT_SECRET;
    assert.throws(() => hashDeleteCode(A, "123456"), /JWT_SECRET is not set/, "no secret: no code at all");
    process.env.JWT_SECRET = kept;
});

test("judging a code with no database: none, expired, tries used up, wrong, ok", () => {
    const now = Date.now();
    const pending = (over = {}) => ({ code_hash: hashDeleteCode(A, "123456"), code_expires_at: new Date(now + CODE_TTL_MS), code_attempts: 0, ...over });
    const judge = (p, code, userId = A, when = now) => judgeDeleteCode({ pending: p, userId, code, now: when });
    assert.equal(judge(pending(), "123456"), "ok");
    assert.equal(judge(pending(), "654321"), "wrong");
    assert.equal(judge(pending(), "12345"), "wrong");
    assert.equal(judge(pending(), ""), "wrong");
    assert.equal(judge(pending(), "123456", B), "wrong", "a code sent to another account");
    assert.equal(judge(undefined, "123456"), "none");
    assert.equal(judge({}, "123456"), "none");
    assert.equal(judge(pending({ code_hash: undefined }), "123456"), "none", "used: its hash is gone");
    assert.equal(judge(pending(), "123456", A, now + CODE_TTL_MS - 1), "ok", "the last moment of its 10 minutes");
    assert.equal(judge(pending(), "123456", A, now + CODE_TTL_MS), "expired");
    assert.equal(judge(pending({ code_attempts: MAX_TRIES - 1 }), "123456"), "ok");
    assert.equal(judge(pending({ code_attempts: MAX_TRIES }), "123456"), "tries", "the right code after five tries is still refused");
    assert.equal(CODE_TTL_MS, 10 * 60 * 1000);
});

test("an account with a password: exactly as before, and a code is never taken in its place", async () => {
    fill();
    const gate = (body, over = {}) => confirmAccountDeletion({ ...account(P), ...over }, body);
    assert.deepEqual(await gate({}), { status: 400, message: "Password is required to confirm deletion." });
    assert.deepEqual(await gate({ password: "" }), { status: 400, message: "Password is required to confirm deletion." });
    assert.deepEqual(await gate({ password: "Wrong-Horse-9" }), { status: 401, message: "Incorrect password." });
    assert.deepEqual(await gate({ password: { $ne: null } }), { status: 401, message: "Incorrect password." });
    assert.equal(await gate({ password: PASSWORD }), null, "the right password confirms");
    // Administrators are refused, with the right password too; without a password they are asked for it first, as before
    for (const role of ["org_admin", "super_admin"]) {
        assert.deepEqual(await gate({ password: PASSWORD }, { role }), { status: 403, message: "Administrators must use the organization deletion process." });
        assert.deepEqual(await gate({}, { role }), { status: 400, message: "Password is required to confirm deletion." });
    }
    // A code does nothing for it: none is sent, and one that somehow exists is not taken instead of the password
    assert.deepEqual(await sendDeleteAccountCode(account(P)), { status: 400, body: { message: "This account has a password. Confirm with your password.", code: "use_password" } });
    assert.equal(sent.length, 0);
    const forged = { account_delete_code: { code_hash: hashDeleteCode(P, "123456"), code_expires_at: new Date(Date.now() + CODE_TTL_MS), code_attempts: 0 } };
    assert.deepEqual(await gate({ code: "123456" }, forged), { status: 400, message: "Password is required to confirm deletion." });
    assert.deepEqual(await gate({ code: "123456", password: "Wrong-Horse-9" }, forged), { status: 401, message: "Incorrect password." });
    assert.deepEqual(updates, [], "nothing is written for an account with a password");
});

test("an account without a password: never with no confirmation, and never with a password string", async () => {
    fill();
    const needed = { status: 400, message: "This account has no password. Update the app to delete it with a code sent to your email.", code: "delete_code_needed" };
    const compared = mock.method(bcrypt, "compare");
    for (const body of [undefined, {}, { password: "anything-at-all" }, { password: "" }, { password: PASSWORD }, { password: "$2a$10$abcdefghijklmnopqrstuv" },
        { code: "" }, { code: "12345" }, { code: "1234567" }, { code: "abcdef" }, { code: null }, { code: ["123456"] }, { code: { $ne: null } }, { code: true }]) {
        assert.deepEqual(await confirmAccountDeletion(account(A), body), needed, JSON.stringify(body));
        assert.deepEqual(await confirmAccountDeletion(account(B), body), needed, JSON.stringify(body));
    }
    assert.equal(compared.mock.callCount(), 0, "no password is compared for an account that has none");
    compared.mock.restore();
    assert.deepEqual(updates, []);
    // Six digits, but no code was ever sent
    assert.deepEqual(await confirmAccountDeletion(account(A), { code: "123456" }), { status: 400, message: "This code has run out. Ask for a new one." });
    assert.deepEqual(updates, []);
    // An older sign-up's plain placeholder in the password field is not a password either: sending it confirms nothing
    users[0].password = "4f9a0c1d2e3b4a5f";
    assert.deepEqual(await confirmAccountDeletion(account(A), { password: "4f9a0c1d2e3b4a5f" }), needed);
});

test("an account without a password: a wrong code is refused and counted, the right code works once", async () => {
    fill();
    const code = await sendCodeTo(A);
    const wrong = code === "111111" ? "222222" : "111111";
    assert.deepEqual(await confirmAccountDeletion(account(A), { code: wrong }), { status: 400, message: "That code is not right. Check the email and try again." });
    assert.equal(account(A).account_delete_code.code_attempts, 1, "the try is counted");
    // A password sent along changes nothing; spaces in the code are fine (pasted from the email)
    assert.deepEqual(await confirmAccountDeletion(account(A), { code: wrong, password: PASSWORD }), { status: 400, message: "That code is not right. Check the email and try again." });
    assert.equal(await confirmAccountDeletion(account(A), { code: ` ${code.slice(0, 3)} ${code.slice(3)} ` }), null, "the right code confirms");
    // Used: the same code a second time, and the same request sent twice at once, find nothing
    assert.equal(account(A).account_delete_code.code_hash, undefined);
    assert.deepEqual(await confirmAccountDeletion(account(A), { code }), { status: 400, message: "This code has run out. Ask for a new one." });

    fill();
    const again = await sendCodeTo(A);
    const before = account(A); // two requests that both read the account before either used the code
    const [first, second] = await Promise.all([confirmAccountDeletion(before, { code: again }), confirmAccountDeletion(before, { code: again })]);
    assert.deepEqual([first, second].filter((r) => r === null).length, 1, "only one of two requests at once is confirmed");
    assert.deepEqual([first, second].find((r) => r !== null), { status: 400, message: "This code has run out. Ask for a new one." });
});

test("five tries, then no more: not even the right code", async () => {
    fill();
    const code = await sendCodeTo(A);
    const wrong = code === "111111" ? "222222" : "111111";
    for (let i = 0; i < MAX_TRIES; i += 1) assert.equal((await confirmAccountDeletion(account(A), { code: wrong })).status, 400);
    assert.deepEqual(await confirmAccountDeletion(account(A), { code }), { status: 429, message: "Too many wrong tries. Ask for a new code." });
    assert.deepEqual(await confirmAccountDeletion(account(A), { code: wrong }), { status: 429, message: "Too many wrong tries. Ask for a new code." });
    assert.equal(account(A).account_delete_code.code_attempts, MAX_TRIES);
    // Tries sent all at once stop at five too (each is counted before it is compared)
    fill();
    const next = await sendCodeTo(A);
    const snapshot = account(A);
    const answers = await Promise.all(Array.from({ length: 12 }, () => confirmAccountDeletion(snapshot, { code: next === "111111" ? "222222" : "111111" })));
    assert.equal(answers.filter((r) => r.status === 400).length, MAX_TRIES);
    assert.equal(answers.filter((r) => r.status === 429).length, 12 - MAX_TRIES);
    // A new code starts its own five tries
    later(A, 61 * 1000);
    const fresh = await sendCodeTo(A);
    assert.equal(account(A).account_delete_code.code_attempts, 0);
    assert.equal(await confirmAccountDeletion(account(A), { code: fresh }), null);
});

test("an expired code, and a code another account was sent, are refused", async () => {
    fill();
    const code = await sendCodeTo(A);
    users[0].account_delete_code.code_expires_at = new Date(Date.now() - 1000);
    assert.deepEqual(await confirmAccountDeletion(account(A), { code }), { status: 400, message: "This code has run out. Ask for a new one." });
    // It ran out between the read and the use: still refused
    fill();
    const late = await sendCodeTo(A);
    const read = account(A);
    users[0].account_delete_code.code_expires_at = new Date(Date.now() - 1000);
    assert.deepEqual(await confirmAccountDeletion(read, { code: late }), { status: 400, message: "This code has run out. Ask for a new one." });

    fill();
    const forA = await sendCodeTo(A);
    const forB = await sendCodeTo(B);
    if (forA !== forB) assert.deepEqual(await confirmAccountDeletion(account(B), { code: forA }), { status: 400, message: "That code is not right. Check the email and try again." });
    assert.equal(await confirmAccountDeletion(account(B), { code: forB }), null);
    assert.ok(account(A).account_delete_code.code_hash, "A's code is untouched by B's deletion");
    // The code of another feature kept on the same account (an email being added) confirms nothing
    fill();
    users[0].account_email_pending = { email: "new@example.com", code_hash: crypto.createHash("sha256").update(`${A}:new@example.com:123456`).digest("hex"), code_expires_at: new Date(Date.now() + CODE_TTL_MS), code_attempts: 0 };
    assert.deepEqual(await confirmAccountDeletion(account(A), { code: "123456" }), { status: 400, message: "This code has run out. Ask for a new one." });
});

test("administrators are refused, with or without a password, and are sent no code", async () => {
    fill();
    for (const role of ["org_admin", "super_admin"]) {
        users[0].role = role;
        assert.deepEqual(await sendDeleteAccountCode(account(A)), { status: 403, body: { message: "Administrators must use the organization deletion process." } });
        assert.deepEqual(await confirmAccountDeletion(account(A), { code: "123456" }), { status: 403, message: "Administrators must use the organization deletion process." });
        assert.deepEqual(await confirmAccountDeletion(account(A), {}), { status: 403, message: "Administrators must use the organization deletion process." });
    }
    assert.equal(sent.length, 0);
    assert.deepEqual(updates, []);
});

test("sending: to the account's main email, one a minute, five a day; a failed email takes the code back", async (t) => {
    fill();
    users[0].account_emails = [{ email: "asha.work@example.com", verified_at: new Date() }];
    const answer = await sendDeleteAccountCode(account(A));
    assert.deepEqual(answer, { status: 200, body: { message: "We sent a 6-digit code to your email.", expiresInMinutes: 10 } });
    assert.equal(sent.length, 1);
    const email = sent[0];
    assert.equal(email.to, "asha@example.com", "the main email, not an added one");
    assert.equal(email.subject, "Classgrid - Your code to delete your account");
    assert.equal(email.fromName, "Classgrid");
    const code = codeIn(email);
    assert.ok(email.html.includes(code));
    assert.equal(email.subject.includes(code), false, "the code is not in the subject");
    for (const body of [email.html, email.text]) {
        assert.ok(body.includes("You asked to delete your Classgrid account. Enter this code in Classgrid to confirm."));
        assert.ok(body.includes("If you did not ask for this, ignore this email. Your account stays as it is."));
        assert.ok(body.includes("10 minutes"));
        assert.equal(/school|college|coaching|institute|\bERP\b|successfully|Classgrid Platform/i.test(body.replace(/<style[\s\S]*?<\/style>/g, "")), false);
    }
    assert.equal(email.html.includes("<b>"), false, "the name is written as text, never as HTML");
    assert.equal(/<h1/i.test(email.html), false);
    // Only the hash is kept, for 10 minutes
    const kept = account(A).account_delete_code;
    assert.equal(kept.code_hash, hashDeleteCode(A, code));
    assert.equal(JSON.stringify(kept).includes(code), false);
    assert.ok(Math.abs(new Date(kept.code_expires_at).getTime() - (Date.now() + CODE_TTL_MS)) < 5000);
    assert.deepEqual([kept.code_attempts, kept.codes_today], [0, 1]);

    // A second code inside the minute is refused, and the first still works
    const soon = await sendDeleteAccountCode(account(A));
    assert.equal(soon.status, 429);
    assert.equal(soon.body.message, "A code was just sent. Wait a minute before asking for a new one.");
    assert.ok(soon.body.retryAfter > 0 && soon.body.retryAfter <= 60);
    assert.equal(sent.length, 1);
    // Two requests at the same moment send one code
    fill();
    const both = await Promise.all([sendDeleteAccountCode(account(A)), sendDeleteAccountCode(account(A))]);
    assert.deepEqual(both.map((r) => r.status).sort(), [200, 429]);
    assert.equal(sent.length, 1);
    // After a minute a new code replaces the old one
    const old = codeIn(sent[0]);
    later(A, 61 * 1000);
    const fresh = await sendCodeTo(A);
    if (fresh !== old) assert.equal((await confirmAccountDeletion(account(A), { code: old })).message, "That code is not right. Check the email and try again.");
    // Five a day
    for (let i = 2; i < CODES_PER_DAY; i += 1) { later(A, 61 * 1000); await sendCodeTo(A); }
    assert.equal(account(A).account_delete_code.codes_today, CODES_PER_DAY);
    later(A, 61 * 1000);
    assert.deepEqual(await sendDeleteAccountCode(account(A)), { status: 429, body: { message: "Too many codes today. Try again tomorrow." } });
    assert.equal(sent.length, CODES_PER_DAY);
    // The next day the count starts again
    users[0].account_delete_code.codes_day = "2026-01-01";
    assert.equal((await sendDeleteAccountCode(account(A))).status, 200);
    assert.equal(account(A).account_delete_code.codes_today, 1);

    // The email cannot be sent: no code is left behind, and the person can ask again at once
    fill();
    t.mock.method(console, "error", () => {});
    emailFails = true;
    assert.deepEqual(await sendDeleteAccountCode(account(A)), { status: 500, body: { message: "Couldn't send the code. Please try again." } });
    assert.equal(account(A).account_delete_code.code_hash, undefined);
    assert.equal(account(A).account_delete_code.codes_today, 0, "a code that never went out does not count toward the day");
    emailFails = false;
    assert.equal((await sendDeleteAccountCode(account(A))).status, 200);
});

test("the controller and the route: the gate comes before anything is sent or deleted (read from the source)", () => {
    const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
    const controller = read("../src/controllers/auth.controller.js");
    const start = controller.indexOf("export const deleteAccount = async (req, res) => {");
    const body = controller.slice(start, controller.indexOf("\nexport const ", start + 10));
    const gate = body.indexOf("const refused = await confirmAccountDeletion(user, { password: req.body?.password, code: req.body?.code });");
    assert.ok(gate > 0, "deleteAccount asks the gate");
    assert.ok(body.indexOf('const user = await User.findById(req.user._id).select("+password");') < gate, "with the account's own record, password field loaded");
    assert.ok(body.indexOf("if (refused) {") > gate && body.indexOf("return res.status(refused.status).json(") > gate);
    for (const later of ["sendEmail(", "deleteAccountData(", "User.findByIdAndDelete(", "User.find("]) {
        assert.ok(body.indexOf(later) > gate, `${later} comes after the gate`);
    }
    // No password is compared in the controller any more, and no stand-in hash is left to compare against
    assert.equal(body.includes("bcrypt.compare"), false);
    assert.equal(body.includes("dummyHash"), false);
    // The code is asked for by the signed-in account only
    const routes = read("../src/routes/auth.routes.js");
    assert.ok(routes.includes('router.post("/delete-account", isAuthenticated, authController.deleteAccount);'));
    assert.ok(routes.includes('router.post("/delete-account/code", isAuthenticated, authController.sendDeleteAccountCode);'));
    const sender = controller.slice(controller.indexOf("export const sendDeleteAccountCode = async (req, res) => {"), start);
    assert.ok(sender.includes('const user = await User.findById(req.user._id).select("+password");'));
    assert.ok(sender.includes("const answer = await sendDeleteCodeTo(user);"));
    // The apps are told whether the account has a password, never the password or its hash
    assert.ok(controller.includes("hasPassword: await accountHasPassword(req.user._id).catch(() => null),"));
    // The account's record keeps the code's fields (a field the schema does not name would not be saved)
    const schema = read("../src/models/User.js");
    for (const field of ["code_hash", "code_expires_at", "code_attempts", "code_sent_at", "codes_day", "codes_today"]) {
        assert.ok(schema.slice(schema.indexOf("account_delete_code: {"), schema.indexOf("account_delete_code: {") + 400).includes(`${field}:`), field);
    }
});
