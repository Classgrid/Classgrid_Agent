// Where the sign-in code goes when an account has more than one email (utils/account-email.js codeEmailFor).
// Found 2026-11-22: signing in with an added email showed "code sent to <added email>" while the server sent the
// code to the account's main email.
import test from "node:test";
import assert from "node:assert/strict";
import { codeEmailFor } from "../src/utils/account-email.js";

const user = {
    email: "main@example.com",
    account_emails: [
        { email: "added@example.com", verified_at: new Date() },
        { email: "waiting@example.com", verified_at: null },
    ],
};

test("the main email typed: the code goes to the main email", () => {
    assert.equal(codeEmailFor(user, "main@example.com"), "main@example.com");
});

test("a confirmed added email typed: the code goes to that email", () => {
    assert.equal(codeEmailFor(user, "added@example.com"), "added@example.com");
    assert.equal(codeEmailFor(user, "  Added@Example.com "), "added@example.com");
});

test("an added email that was never confirmed: the code goes to the main email", () => {
    assert.equal(codeEmailFor(user, "waiting@example.com"), "main@example.com");
});

test("an email that is not on the account, or nothing typed: the code goes to the main email", () => {
    assert.equal(codeEmailFor(user, "someone@else.com"), "main@example.com");
    assert.equal(codeEmailFor(user, ""), "main@example.com");
    assert.equal(codeEmailFor(user, undefined), "main@example.com");
});

test("an account with no added emails", () => {
    assert.equal(codeEmailFor({ email: "only@example.com" }, "only@example.com"), "only@example.com");
});
