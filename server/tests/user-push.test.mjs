// node --test tests/user-push.test.mjs   (in server/)
// The phone app's push notifications (src/services/user-push.service.js): what is sent to FCM, which tokens are
// removed when FCM says they are gone, and that a setting that is off sends nothing. Firebase, the database and
// Redis are replaced with stubs (setPushDeps), so nothing outside this file is reached.
import test from "node:test";
import assert from "node:assert/strict";
import {
    setPushDeps, sendUserPush, buildPushMessage, plainPreview, pushPreferencesOf,
    pushAnswerFinished, pushSharedChat, pushImageReady, pushScheduleRan, pushCallSummary, PUSH_TYPES, PUSH_PREF_KEYS,
} from "../src/services/user-push.service.js";

// ── the stubs ──────────────────────────────────────────────────
const world = { users: {}, sent: [], removed: [], touched: [], respond: null, members: [], watching: new Set(), titles: {} };
const ok = (n) => ({ successCount: n, failureCount: 0, responses: Array.from({ length: n }, () => ({ success: true })) });

function reset() {
    Object.assign(world, { users: {}, sent: [], removed: [], touched: [], respond: null, members: [], watching: new Set(), titles: {} });
}

setPushDeps({
    loadUser: async (userId) => world.users[userId] || null,
    send: async (message) => {
        world.sent.push(message);
        return world.respond ? world.respond(message) : ok(message.tokens.length);
    },
    removeTokens: async (tokens) => { world.removed.push(...tokens); },
    chatTitle: async (sessionId) => world.titles[sessionId] || "",
    sharedMembers: async () => world.members,
    watchingSharedChat: async () => world.watching,
    touchChat: async (email, sessionId) => { world.touched.push(`${email}:${sessionId}`); },
});

const phone = (token, deviceId = "") => ({ token, platform: "android", deviceId, appVersion: "1.0.0" });

// ── sendUserPush: the message ──────────────────────────────────
test("sends one notification + data message to every device, with the type's channel and one key per chat", async () => {
    reset();
    world.users.u1 = { pushNotifications: {}, fcmDevices: [phone("tok-a", "d1"), phone("tok-b", "d2")], fcmTokens: ["tok-b", "tok-old"] };

    const result = await sendUserPush("u1", {
        type: "answer", title: "Trip plan", body: "Here is **your plan** for the week.",
        data: { sessionId: "s-1", messageId: 42, url: "", extra: null, from: "x", nested: { a: 1 } },
    });

    assert.deepEqual(result, { sent: 3, failed: 0, pruned: 0 });
    assert.equal(world.sent.length, 1);
    const m = world.sent[0];
    // every token once: the device list first, then the older bare tokens
    assert.deepEqual(m.tokens, ["tok-a", "tok-b", "tok-old"]);
    assert.deepEqual(m.notification, { title: "Trip plan", body: "Here is your plan for the week." });
    // data: the type and the ids, as text; empty values and FCM's own keys are left out
    assert.equal(m.data.type, "answer");
    assert.equal(m.data.sessionId, "s-1");
    assert.equal(m.data.messageId, "42");
    assert.equal(m.data.nested, '{"a":1}');
    assert.equal(m.data.title, "Trip plan");
    assert.equal(m.data.body, "Here is your plan for the week.");
    assert.equal(m.data.channelId, "answers");
    assert.ok(/^\d+$/.test(m.data.sentAt));
    assert.ok(!("url" in m.data) && !("extra" in m.data) && !("from" in m.data));
    for (const value of Object.values(m.data)) assert.equal(typeof value, "string");
    // Android: high priority, the channel of this kind, one notification per chat
    assert.equal(m.android.priority, "high");
    assert.equal(m.android.collapseKey, "chat_s-1");
    assert.equal(m.android.notification.channelId, "answers");
    assert.equal(m.android.notification.tag, "chat_s-1");
    assert.equal(m.android.notification.sound, "default");
    assert.ok(m.android.ttl > 0);
});

test("each kind has its own channel, and its own key when it is not about a chat", () => {
    const channel = (type, data) => {
        const m = buildPushMessage(["t"], { type, title: "T", body: "B", data });
        return [m.android.notification.channelId, m.android.collapseKey];
    };
    assert.deepEqual(channel("answer", { sessionId: "s" }), ["answers", "chat_s"]);
    assert.deepEqual(channel("file", { sessionId: "s" }), ["answers", "chat_s"]);
    assert.deepEqual(channel("image", { sessionId: "s" }), ["images", "chat_s"]);
    assert.deepEqual(channel("shared", { sessionId: "s" }), ["shared", "chat_s"]);
    assert.deepEqual(channel("schedule", { scheduleId: "sc" }), ["schedules", "schedule_sc"]);
    assert.deepEqual(channel("call", { callId: "c" }), ["calls", "call_c"]);
    assert.deepEqual(channel("account", {}), ["account", "classgrid_account"]);
    assert.deepEqual(channel("update", {}), ["account", "classgrid_update"]);
    // every kind's switch is one of the saved settings
    for (const kind of Object.values(PUSH_TYPES)) assert.ok(kind.pref === null || PUSH_PREF_KEYS.includes(kind.pref));
});

test("a picture is shown in the notification only when it is an https link", () => {
    const withPicture = buildPushMessage(["t"], { type: "image", title: "T", body: "B", data: { sessionId: "s" }, imageUrl: "https://cdn.classgrid.in/a.png" });
    assert.equal(withPicture.notification.imageUrl, "https://cdn.classgrid.in/a.png");
    assert.equal(withPicture.android.notification.imageUrl, "https://cdn.classgrid.in/a.png");
    const without = buildPushMessage(["t"], { type: "image", title: "T", body: "B", data: { sessionId: "s" }, imageUrl: "http://plain/a.png" });
    assert.ok(!("imageUrl" in without.notification) && !("imageUrl" in without.android.notification));
});

// ── sendUserPush: dead tokens ──────────────────────────────────
test("tokens FCM reports as gone are removed; other failures are left alone", async () => {
    reset();
    world.users.u1 = { fcmDevices: [phone("good"), phone("unregistered"), phone("malformed"), phone("busy")], fcmTokens: [] };
    world.respond = () => ({
        successCount: 1, failureCount: 3,
        responses: [
            { success: true },
            { success: false, error: { code: "messaging/registration-token-not-registered" } },
            { success: false, error: { code: "messaging/invalid-registration-token" } },
            { success: false, error: { code: "messaging/server-unavailable" } },
        ],
    });

    const result = await sendUserPush("u1", { type: "call", title: "Call", body: "Summary", data: { callId: "c1" } });

    assert.deepEqual(result, { sent: 1, failed: 3, pruned: 2 });
    assert.deepEqual(world.removed, ["unregistered", "malformed"]);
});

// ── sendUserPush: the user's settings ──────────────────────────
test("the master switch off sends nothing, of any kind", async () => {
    reset();
    world.users.u1 = { pushNotifications: { global: false }, fcmDevices: [phone("tok")] };
    for (const type of Object.keys(PUSH_TYPES)) {
        assert.deepEqual(await sendUserPush("u1", { type, title: "T", body: "B" }), { sent: 0, skipped: "settings_off" });
    }
    assert.equal(world.sent.length, 0);
});

test("a kind that is off is not sent; the other kinds still are", async () => {
    reset();
    world.users.u1 = { pushNotifications: { global: true, answers: false, sharedChats: false, productUpdates: false }, fcmDevices: [phone("tok")] };

    assert.equal((await sendUserPush("u1", { type: "answer", title: "T", body: "B" })).skipped, "settings_off");
    assert.equal((await sendUserPush("u1", { type: "file", title: "T", body: "B" })).skipped, "settings_off");
    assert.equal((await sendUserPush("u1", { type: "shared", title: "T", body: "B" })).skipped, "settings_off");
    assert.equal((await sendUserPush("u1", { type: "update", title: "T", body: "B" })).skipped, "settings_off");
    assert.equal(world.sent.length, 0);

    assert.equal((await sendUserPush("u1", { type: "image", title: "T", body: "B" })).sent, 1);
    assert.equal((await sendUserPush("u1", { type: "schedule", title: "T", body: "B" })).sent, 1);
    assert.equal((await sendUserPush("u1", { type: "call", title: "T", body: "B" })).sent, 1);
    // "account" has no switch of its own: only the master switch stops it
    assert.equal((await sendUserPush("u1", { type: "account", title: "T", body: "B" })).sent, 1);
    assert.equal(world.sent.length, 4);
});

test("settings are on until the user turns them off", () => {
    // (remotePc: Remote PC's "needs your OK", 2026-11-18)
    assert.deepEqual(pushPreferencesOf({}), { enabled: true, answers: true, images: true, schedules: true, calls: true, sharedChats: true, productUpdates: true, remotePc: true });
    assert.deepEqual(pushPreferencesOf({ pushNotifications: { global: false, images: false } }),
        { enabled: false, answers: true, images: false, schedules: true, calls: true, sharedChats: true, productUpdates: true, remotePc: true });
});

test("nothing to send to, an unknown kind, Firebase not set up or failing: no throw, and the reason is said", async () => {
    reset();
    world.users.none = { fcmDevices: [], fcmTokens: [] };
    world.users.u1 = { fcmDevices: [phone("tok")] };
    assert.deepEqual(await sendUserPush("none", { type: "answer", title: "T", body: "B" }), { sent: 0, skipped: "no_devices" });
    assert.deepEqual(await sendUserPush("missing", { type: "answer", title: "T", body: "B" }), { sent: 0, skipped: "no_user" });
    assert.deepEqual(await sendUserPush("u1", { type: "nope", title: "T", body: "B" }), { sent: 0, skipped: "unknown_type" });
    assert.equal(world.sent.length, 0);
    world.respond = () => null;
    assert.deepEqual(await sendUserPush("u1", { type: "answer", title: "T", body: "B" }), { sent: 0, skipped: "not_configured" });
    world.respond = () => { throw new Error("network"); };
    assert.deepEqual(await sendUserPush("u1", { type: "answer", title: "T", body: "B" }), { sent: 0, skipped: "error" });
});

// ── the preview ────────────────────────────────────────────────
test("the preview is short plain text: no markdown, code, links or cards", () => {
    const answer = "# Plan\n\n**Day 1**: visit the [museum](https://example.com/m) and `relax`.\n\n```js\nconst secret = 1;\n```\n- item one\n> quoted\nhttps://example.com/x";
    const preview = plainPreview(answer);
    assert.equal(preview, "Plan Day 1: visit the museum and relax. item one quoted");
    const long = plainPreview("word ".repeat(100));
    assert.ok(long.length <= 100 && long.endsWith("…"));
    // a saved answer (the JSON kept in the chat) gives its text; a made picture's marker is left out
    assert.equal(plainPreview(JSON.stringify({ classgrid_ai_message: true, content: "Done *now*", thought: "private thinking" })), "Done now");
    assert.equal(plainPreview("[IMAGE_GENERATION_COMPLETE: a cat | https://cdn.classgrid.in/c.png]\n\nHere it is."), "Here it is.");
    assert.equal(plainPreview(null), "");
});

// ── the events ─────────────────────────────────────────────────
test("an answer that ended with nobody on its stream: answer, file or image, by what it made", async () => {
    reset();
    world.users.u1 = { fcmDevices: [phone("tok")] };
    world.titles["s-1"] = "Trip plan";

    await pushAnswerFinished({ userId: "u1", sessionId: "s-1", answer: "All set. Your bags are packed." });
    await pushAnswerFinished({ userId: "u1", sessionId: "s-1", answer: "Your report: https://cdn.classgrid.in/files/report.pdf", woken: true });
    await pushAnswerFinished({ userId: "u1", sessionId: "s-1", answer: "Here is the doc https://chat.classgrid.in/docs/abc123" });
    await pushAnswerFinished({ userId: "u1", sessionId: "s-1", answer: "[IMAGE_GENERATION_COMPLETE: a red kite | https://cdn.classgrid.in/k.png]", images: [{ prompt: "a red kite", url: "https://cdn.classgrid.in/k.png" }] });
    // a task that only went back to sleep says nothing
    assert.equal(await pushAnswerFinished({ userId: "u1", sessionId: "s-1", answer: "💤 Waiting for the deploy (until 5:00 PM)" }), null);

    const [answer, file, doc, image] = world.sent;
    assert.equal(world.sent.length, 4);
    assert.equal(answer.data.type, "answer");
    assert.equal(answer.notification.title, "Trip plan");
    assert.equal(answer.notification.body, "All set. Your bags are packed.");
    assert.equal(answer.data.sessionId, "s-1");
    assert.equal(file.data.type, "file");
    assert.equal(file.notification.title, "Your file is ready");
    assert.equal(file.data.url, "https://cdn.classgrid.in/files/report.pdf");
    assert.equal(file.data.woken, "1");
    assert.equal(doc.data.type, "file");
    assert.equal(doc.data.url, "https://chat.classgrid.in/docs/abc123");
    assert.equal(image.data.type, "image");
    assert.equal(image.android.notification.channelId, "images");
    assert.equal(image.notification.title, "Your image is ready");
    assert.equal(image.notification.body, "a red kite");
    assert.equal(image.data.url, "https://cdn.classgrid.in/k.png");
    assert.equal(image.notification.imageUrl, "https://cdn.classgrid.in/k.png");
});

test("a picture is found in the answer's own text when the caller has only the text (voice mode's background task)", async () => {
    reset();
    world.users.u1 = { fcmDevices: [phone("tok")] };

    await pushAnswerFinished({ userId: "u1", sessionId: "s-2", answer: "[IMAGE_GENERATION_COMPLETE: a blue boat | https://cdn.classgrid.in/b.png]\n\nHere is your boat." });

    const [image] = world.sent;
    assert.equal(world.sent.length, 1);
    assert.equal(image.data.type, "image");
    assert.equal(image.notification.title, "Your image is ready");
    assert.equal(image.notification.body, "a blue boat");
    assert.equal(image.data.url, "https://cdn.classgrid.in/b.png");
    assert.equal(image.notification.imageUrl, "https://cdn.classgrid.in/b.png");
    assert.equal(image.data.sessionId, "s-2");
});

test("an answer with no words left after cleaning uses the website's words", async () => {
    reset();
    world.users.u1 = { fcmDevices: [phone("tok")] };
    await pushAnswerFinished({ userId: "u1", sessionId: "s-2", answer: "```widget\n{}\n```" });
    await pushAnswerFinished({ userId: "u1", sessionId: "s-2", answer: "```widget\n{}\n```", woken: true });
    assert.equal(world.sent[0].notification.title, "Classgrid");
    assert.equal(world.sent[0].notification.body, "The agent finished its answer.");
    assert.equal(world.sent[1].notification.body, "Background work finished. The agent wrote an update.");
});

test("a shared chat: everyone else gets it marked unread; the sender and people who have it open get no push", async () => {
    reset();
    world.users.owner = { fcmDevices: [phone("tok-owner")] };
    world.users.friend = { fcmDevices: [phone("tok-friend")] };
    world.users.viewer = { fcmDevices: [phone("tok-viewer")] };
    world.members = [
        { userId: "owner", email: "owner@example.com" },
        { userId: "friend", email: "friend@example.com" },
        { userId: "viewer", email: "viewer@example.com" },
    ];
    world.watching = new Set(["viewer"]);
    world.titles["s-9"] = "Goa trip";

    const result = await pushSharedChat({ sessionId: "s-9", fromEmail: "Owner@Example.com", fromName: "Asha", text: "Shall we book the **hotel**?" });

    assert.deepEqual(result, { members: 2, sent: 1 });
    assert.deepEqual(world.touched, ["friend@example.com:s-9", "viewer@example.com:s-9"]);
    assert.equal(world.sent.length, 1);
    const m = world.sent[0];
    assert.deepEqual(m.tokens, ["tok-friend"]);
    assert.equal(m.notification.title, "Goa trip");
    assert.equal(m.notification.body, "Asha: Shall we book the hotel?");
    assert.equal(m.data.type, "shared");
    assert.equal(m.data.kind, "message");
    assert.equal(m.data.sessionId, "s-9");
    assert.equal(m.android.notification.channelId, "shared");

    // the AI's answer in the same chat
    await pushSharedChat({ sessionId: "s-9", fromEmail: "owner@example.com", text: "Booked for Friday.", answer: true });
    assert.equal(world.sent[1].notification.body, "Booked for Friday.");
    assert.equal(world.sent[1].data.kind, "answer");
});

test("an image, a schedule and a call each open their own screen", async () => {
    reset();
    world.users.u1 = { fcmDevices: [phone("tok")] };

    await pushImageReady({ userId: "u1", sessionId: "s-3", prompt: "a blue door", imageUrl: "https://cdn.classgrid.in/d.png" });
    await pushScheduleRan({ _id: "sch-1", user_id: "u1", title: "Pay rent", summary: "Reminder to pay the rent today." });
    await pushCallSummary({ userId: "u1", callId: "call-1", name: "Website fixes", summary: "I fixed the **header** and deployed it.", url: "https://chat.classgrid.in/calls/call-1" });
    assert.equal(await pushScheduleRan({ _id: "sch-2", title: "No owner" }), null);

    const [image, schedule, call] = world.sent;
    assert.equal(world.sent.length, 3);
    assert.deepEqual([image.data.type, image.data.sessionId, image.data.url], ["image", "s-3", "https://cdn.classgrid.in/d.png"]);
    assert.deepEqual([schedule.data.type, schedule.data.scheduleId, schedule.notification.title, schedule.notification.body],
        ["schedule", "sch-1", "Pay rent", "Reminder to pay the rent today."]);
    assert.equal(schedule.android.notification.channelId, "schedules");
    assert.deepEqual([call.data.type, call.data.callId, call.data.url, call.notification.title, call.notification.body],
        ["call", "call-1", "https://chat.classgrid.in/calls/call-1", "Website fixes", "I fixed the header and deployed it."]);
    assert.equal(call.android.notification.channelId, "calls");
});
