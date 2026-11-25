// No route may hand out a fixed phone code. Until 2026-11-25 POST /api/auth/onboarding-send-otp gave every phone the
// code 123456 in the code store the chat sign-up's WhatsApp step reads, so any number could be put on a new account.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const live = (src) => src.split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join("\n");

test("the old organisation sign-up code routes are not mounted", () => {
    const routes = live(read("../src/routes/auth.routes.js"));
    assert.ok(!routes.includes("authController.sendOnboardingOtp"), "onboarding-send-otp is not mounted");
    assert.ok(!routes.includes("authController.verifyOnboardingOtp"), "onboarding-verify-otp is not mounted");
    assert.ok(!/["']\/onboarding-(send|verify)-otp["']/.test(routes));
});

test("no mounted route file anywhere hands out the fixed code", () => {
    const dir = new URL("../src/routes/", import.meta.url);
    for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith(".js")) continue;
        const src = live(fs.readFileSync(new URL(name, dir), "utf8"));
        assert.ok(!src.includes("sendOnboardingOtp"), name);
        assert.ok(!src.includes("chatSendOtp") && !src.includes("chatVerifyOtp"), name);
    }
});
