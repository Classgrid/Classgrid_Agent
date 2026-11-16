// Published pages shared with people (owner, 2026-11-16): who may do what on a page, what each person is sent,
// the comment threads, the emails that say "page", and the sharing service on real SharePage documents with no
// database (the accounts, Redis and the emails are stand-ins, so nothing is saved and no email is sent).
// Run: node --experimental-test-module-mocks --test tests/share-page.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const OWNER = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Nikhil", email: "nikhil@x.in", profilePicture: "https://p/n.jpg" };
const ASHA = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Asha", email: "asha@x.in", profilePicture: "https://p/a.jpg" };
const RAVI = { _id: "cccccccccccccccccccccccc", name: "Ravi", email: "ravi@x.in", profilePicture: "" };
const ACCOUNTS = [OWNER, ASHA, RAVI];

// ── Stand-ins ──
const sent = [];
const realEmails = await import("../src/services/live-doc-emails.js");
mock.module("../src/services/live-doc-emails.js", {
    namedExports: { ...realEmails, sendDocEmail: async (to, email) => { sent.push({ to, subject: email.subject, text: email.text }); } },
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
        findOne: (filter) => query(ACCOUNTS.find((u) => matches(u, filter)) || null),
        findById: (id) => query(ACCOUNTS.find((u) => u._id === String(id)) || null),
    },
});
mock.module("../src/config/redis.js", { defaultExport: { set: async () => "OK", hdel: async () => 1, multi: () => { throw new Error("no redis here"); } } });

const { default: SharePage } = await import("../src/models/SharePage.js");
const helpers = await import("../src/services/share-page.helpers.js");
const share = await import("../src/services/live-doc-share.service.js");

const updates = [];
SharePage.updateOne = async (filter, update) => { updates.push({ filter, update }); return { modifiedCount: 1, matchedCount: 1 }; };
function page(more = {}) {
    const p = new SharePage({ owner: OWNER._id, title: "Tip calculator", html: "<h1>Tip</h1>", ...more });
    p.save = async () => p;
    return p;
}

test("who may do what on a page follows the role", () => {
    const p = page({ members: [
        { id: "m1", userId: ASHA._id, email: ASHA.email, role: "editor" },
        { id: "m2", userId: null, email: "new@x.in", role: "viewer" },
    ] });
    assert.equal(helpers.isOwner(p, OWNER), true);
    assert.equal(helpers.isOwner(p, OWNER._id), true); // (the AI tools ask with the id alone)
    assert.equal(helpers.canShare(p, ASHA), true);
    assert.equal(helpers.canRename(p, ASHA), true);
    assert.equal(helpers.isOwner(p, ASHA), false);
    // invited by email before they had an account: known by that email
    assert.equal(helpers.canView(p, { _id: "dddddddddddddddddddddddd", email: "new@x.in" }), true);
    assert.equal(helpers.canComment(p, { _id: "dddddddddddddddddddddddd", email: "new@x.in" }), false);
    // nobody else opens a private page
    assert.equal(helpers.canView(p, RAVI), false);
    assert.equal(helpers.canWriteData(p, RAVI), false);
});

test("a page's link gives its role; a page from before roles lets people open it and comment", () => {
    const old = page({ visibility: "link" });
    assert.equal(helpers.canView(old, RAVI), true);
    assert.equal(helpers.canComment(old, RAVI), true);
    assert.equal(helpers.canShare(old, RAVI), false);
    const readOnly = page({ visibility: "link", linkRole: "viewer" });
    assert.equal(helpers.canView(readOnly, RAVI), true);
    assert.equal(helpers.canWriteData(readOnly, RAVI), true); // (using the page is the page working)
    assert.equal(helpers.canComment(readOnly, RAVI), false);
});

test("comments: an editor resolves and deletes any, a person their own, nobody the AI's as their own", () => {
    const p = page({ visibility: "link", members: [{ id: "m1", userId: ASHA._id, email: ASHA.email, role: "editor" }] });
    const ravis = { id: "c1", userId: RAVI._id, text: "hi" };
    const ais = { id: "c2", userId: OWNER._id, text: "done", byAi: true };
    assert.equal(helpers.canResolveComment(p, ravis, RAVI), true);
    assert.equal(helpers.canDeleteComment(p, ravis, RAVI), true);
    assert.equal(helpers.canDeleteComment(p, ravis, ASHA), true);
    assert.equal(helpers.canDeleteComment(p, ais, OWNER), true); // (the owner is above an editor)
    const other = { _id: "eeeeeeeeeeeeeeeeeeeeeeee", email: "e@x.in" };
    assert.equal(helpers.canDeleteComment(p, ravis, other), false);
    assert.equal(helpers.canResolveComment(p, ravis, other), false);
});

test("comments are sent as threads, each with its replies and the words it is on", () => {
    const at = new Date("2026-11-16T10:00:00Z");
    const threads = helpers.commentThreads([
        { id: "c1", userId: RAVI._id, name: "Ravi", text: "Is 5% right?", quote: "TIP PERCENTAGE", at, resolved: false },
        { id: "c2", userId: OWNER._id, name: "Nikhil", text: "Yes", replyTo: "c1", at },
        { id: "c3", userId: OWNER._id, name: "Nikhil", text: "Changed it to 10%.", replyTo: "c2", byAi: true, at },
        { id: "c4", userId: ASHA._id, name: "Asha", text: "Nice page", at, resolved: true },
        { id: "c5", userId: ASHA._id, name: "Asha", text: "lost", replyTo: "gone", at },
    ], (id) => (String(id) === ASHA._id ? ASHA.profilePicture : ""));
    assert.deepEqual(threads.map((t) => t.id), ["c1", "c4", "c5"]); // (a reply whose comment is gone stands on its own)
    assert.equal(threads[0].quote, "TIP PERCENTAGE");
    assert.deepEqual(threads[0].replies.map((r) => [r.id, r.name, r.byAI]), [["c2", "Nikhil", false], ["c3", "Classgrid AI", true]]);
    assert.equal(threads[1].photo, ASHA.profilePicture);
    assert.equal(threads[1].resolved, true);
    assert.equal(helpers.cleanQuote("  a \n  b  "), "a b");
    assert.equal(helpers.cleanQuote("x".repeat(5000)).length, 2000);
});

test("the owner and the editors are sent the people and the requests; a reader is not", () => {
    const p = page({
        visibility: "link", linkRole: "viewer", views: 7, pinnedBy: [RAVI._id],
        members: [{ id: "m1", userId: ASHA._id, email: ASHA.email, name: "Asha", role: "editor" }],
        requests: [{ id: "r1", userId: RAVI._id, email: RAVI.email, name: "Ravi", wants: "commenter" }],
        comments: [{ id: "c1", userId: ASHA._id, name: "Asha", text: "hi" }],
    });
    const profiles = { byId: { [OWNER._id]: { name: "Nikhil", photo: OWNER.profilePicture }, [ASHA._id]: { name: "Asha", photo: ASHA.profilePicture } } };
    const mine = helpers.pageForClient(p, OWNER, profiles);
    assert.equal(mine.role, "owner");
    assert.deepEqual(mine.can, { comment: true, edit: true, share: true, manage: true });
    assert.equal(mine.html, "<h1>Tip</h1>");
    assert.equal(mine.link, `https://chat.classgrid.in/p/${p._id}`);
    assert.equal(mine.views, 7);
    assert.equal(mine.people[0].photo, ASHA.profilePicture);
    assert.equal(mine.requests[0].has, "viewer"); // (the link already lets Ravi open it: he asks for more)
    assert.equal(mine.comments[0].photo, ASHA.profilePicture);
    assert.equal("markdown" in mine, false);

    const ravis = helpers.pageForClient(p, RAVI, profiles);
    assert.equal(ravis.role, "viewer");
    assert.deepEqual(ravis.can, { comment: false, edit: false, share: false, manage: false });
    assert.equal(ravis.people, undefined);
    assert.equal(ravis.requests, undefined);
    assert.equal(ravis.asked, "commenter");
    assert.equal(ravis.pinned, true);
    assert.equal(ravis.ownerName, "Nikhil");

    const row = helpers.pageRow(p, RAVI, profiles);
    assert.deepEqual([row.role, row.shared, row.pinned, row.ownerPhoto, row.openComments], ["viewer", true, true, OWNER.profilePicture, 1]);
    assert.equal(helpers.copyPageTitle("Tip calculator"), "Copy of Tip calculator");
});

test("the emails of a page say page and lead to the page", () => {
    const ask = realEmails.accessRequestEmail({ docId: "p1", title: "Tip calculator", requesterName: "Ravi", requesterEmail: RAVI.email, kind: "page" });
    assert.equal(ask.subject, 'Ravi asked for access to "Tip calculator"');
    assert.equal(ask.heading, "Someone asked for access to your page");
    assert.match(ask.content, /https:\/\/chat\.classgrid\.in\/p\/p1\?share=requests/);
    assert.doesNotMatch(ask.content + ask.text + ask.ignoreText, /\bdoc\b/);
    const invite = realEmails.docInviteEmail({ docId: "p1", title: "Tip calculator", inviterName: "Nikhil", inviterEmail: OWNER.email, role: "commenter", kind: "page" });
    assert.equal(invite.subject, 'Nikhil shared a page with you: "Tip calculator"');
    assert.match(invite.text, /You can open it and comment on it\. Sign in with this email address to open it: https:\/\/chat\.classgrid\.in\/p\/p1$/);
    const granted = realEmails.accessGrantedEmail({ docId: "p1", title: "Tip calculator", ownerName: "Nikhil", role: "viewer", kind: "page" });
    assert.equal(granted.heading, "You have access to the page");
    assert.doesNotMatch(granted.content + granted.text, /\bdoc\b/);
    // (a doc's emails are as they were)
    assert.equal(realEmails.docInviteEmail({ docId: "d1", title: "Plan", inviterName: "Nikhil", inviterEmail: OWNER.email, role: "editor" }).heading, "A doc was shared with you");
});

test("sharing a page: invite, ask, approve, hand over, pin and views go to the page", async () => {
    const p = page();
    sent.length = 0;
    const results = await share.inviteMembers(p, { by: OWNER, emails: "asha@x.in, nikhil@x.in, nope", role: "commenter" });
    assert.deepEqual(results.map((r) => [r.email, r.ok || r.error]), [["nope", "This is not an email address."], ["asha@x.in", true], ["nikhil@x.in", "This is the page's owner."]]);
    assert.equal(p.members.length, 1);
    assert.deepEqual(sent.map((m) => [m.to, m.subject]), [["asha@x.in", 'Nikhil shared a page with you: "Tip calculator"']]);

    sent.length = 0;
    updates.length = 0;
    assert.equal(await share.requestAccess(p, RAVI), "pending");
    assert.equal(p.requests.length, 1);
    assert.equal(sent[0].to, OWNER.email);
    assert.match(sent[0].text, /your page "Tip calculator"/);
    assert.equal(updates.length, 1); // (when the owner was emailed is noted on the page, not on a doc)
    assert.equal(await share.requestAccess(p, ASHA, "commenter"), "open");

    sent.length = 0;
    await share.answerRequest(p, p.requests[0].id, { approve: true, role: "viewer", by: OWNER });
    assert.equal(p.requests.length, 0);
    assert.equal(helpers.canView(p, RAVI), true);
    assert.equal(sent[0].subject, 'You can now open "Tip calculator"');

    const asha = p.members.find((m) => m.email === ASHA.email);
    await share.makeOwner(p, asha.id, OWNER);
    assert.equal(helpers.isOwner(p, ASHA), true);
    assert.equal(helpers.canShare(p, OWNER), true); // (the owner until now stays on it as an editor)
    await assert.rejects(() => share.setMemberRole(p, "nobody", "viewer"), /not found on this page/);

    updates.length = 0;
    assert.equal(await share.setPinned(p, RAVI, true), true);
    assert.deepEqual(updates[0].update, { $addToSet: { pinnedBy: RAVI._id } });
    assert.equal(await share.countView(p, RAVI), 1);
    assert.deepEqual(updates[1].update, { $inc: { views: 1 } });
    await assert.rejects(() => share.reportDoc(p, RAVI, { reason: "nothing" }), /wrong with this page/);
});
