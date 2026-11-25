// Classgrid is for 18 and over (owner, 2026-11-25). The server refuses a younger age at sign-up: utils/min-age.js.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { MIN_AGE, MAX_AGE, ageGiven, ageProblem } from "../src/utils/min-age.js";

test("the youngest age is 18", () => {
    assert.equal(MIN_AGE, 18);
});

test("18 and older may sign up", () => {
    for (const age of [18, 19, 25, 64, MAX_AGE, "18", " 42 "]) assert.equal(ageProblem(age), "", String(age));
});

test("under 18 is refused, with the reason", () => {
    for (const age of [1, 12, 13, 16, 17, "17", "13"]) {
        assert.equal(ageProblem(age), "You need to be 18 or older to use Classgrid.", String(age));
    }
});

test("an age that is no age is refused as not valid", () => {
    for (const age of [0, -5, 121, 500, 17.5, "abc", "18 years", NaN, {}, [], true]) {
        assert.equal(ageProblem(age), "Please enter a valid age.", JSON.stringify(age));
    }
});

test("no age sent is told apart from a wrong age", () => {
    for (const none of [undefined, null, "", "   "]) {
        assert.equal(ageGiven(none), false);
        assert.equal(ageProblem(none), "Please enter a valid age.");
    }
    for (const some of [0, 13, "18", "x"]) assert.equal(ageGiven(some), true);
});

test("both sign-up endpoints check the age before they save anything", () => {
    const src = fs.readFileSync(new URL("../src/controllers/auth.controller.js", import.meta.url), "utf8");
    const check = 'if (ageGiven(age) && ageProblem(age)) return res.status(400).json({ message: ageProblem(age), code: "age_not_allowed" });';
    assert.equal(src.split(check).length - 1, 2, "the check is in chatOnboard and chatFinalizeOnboarding");
    for (const name of ["chatOnboard", "chatFinalizeOnboarding"]) {
        const body = src.slice(src.indexOf(`export const ${name} = async`));
        const at = body.indexOf(check);
        assert.ok(at > 0, name);
        // before the account is made or changed, and before the WhatsApp code is used up
        assert.ok(at < body.indexOf("new User("), `${name}: before the account is made`);
        const otpUsed = body.indexOf("OnboardingOTP.deleteOne");
        if (name === "chatFinalizeOnboarding") assert.ok(at < otpUsed, "before the WhatsApp code is used up");
    }
});

test("the website's age step asks for 18", () => {
    const page = fs.readFileSync(new URL("../../client/src/features/public-chat/pages/PublicChatLoginPage.tsx", import.meta.url), "utf8");
    assert.ok(page.includes("Number(age) < 18"));
    assert.ok(!/Number\(age\) < 13\b/.test(page), "the old 13 is gone");
    assert.ok(page.includes("You need to be 18 or older to use Classgrid."));
});
