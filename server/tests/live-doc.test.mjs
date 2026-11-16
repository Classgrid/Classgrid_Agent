// Live docs: who may do what, what each person is sent, and the sharing emails
// (services/live-doc.helpers.js, services/live-doc-emails.js). Run: node --test tests/live-doc.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
    roleOf, isOwner, canView, canComment, canEdit, canManage, canResolve, memberOf, requestOf, splitEmails, isEmail, cleanRole,
    roleWords, roleCovers, canShare, docForClient, docRow, copyTitle, MAX_TITLE,
} from "../src/services/live-doc.helpers.js";
import { accessRequestEmail, docInviteEmail, accessGrantedEmail, reviewLink } from "../src/services/live-doc-emails.js";

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const ASHA = "bbbbbbbbbbbbbbbbbbbbbbbb";
const RAVI = "cccccccccccccccccccccccc";
const STRANGER = "dddddddddddddddddddddddd";
const DOC = "eeeeeeeeeeeeeeeeeeeeeeee";

const doc = (more = {}) => ({
    _id: DOC,
    owner: OWNER,
    ownerName: "Nikhil",
    title: "Plan",
    markdown: "# Plan\n\nText",
    visibility: "private",
    members: [],
    requests: [],
    comments: [],
    versions: [],
    ...more,
});
const user = (id, email) => ({ _id: id, email });

test("a private doc opens only for its owner", () => {
    const d = doc();
    assert.equal(roleOf(d, OWNER), "owner");
    assert.equal(roleOf(d, user(OWNER, "nikhil@x.in")), "owner");
    assert.equal(roleOf(d, STRANGER), null);
    assert.equal(roleOf(d, user(STRANGER, "s@x.in")), null);
    assert.equal(canView(d, STRANGER), false);
    assert.equal(canManage(d, OWNER), true);
    assert.equal(isOwner(d, STRANGER), false);
});

test("nobody, and a doc that is not there, can do nothing", () => {
    for (const who of [null, undefined, "", {}, { email: "" }]) {
        assert.equal(roleOf(doc({ visibility: "link" }), who), null);
        assert.equal(canView(doc({ visibility: "link" }), who), false);
    }
    assert.equal(roleOf(null, OWNER), null);
    assert.equal(canEdit(undefined, OWNER), false);
});

test("a link doc from before roles lets any signed-in person read and comment, as it always did", () => {
    const d = doc({ visibility: "link" }); // (no linkRole saved)
    assert.equal(roleOf(d, STRANGER), "commenter");
    assert.equal(canView(d, STRANGER), true);
    assert.equal(canComment(d, STRANGER), true);
    assert.equal(canEdit(d, STRANGER), false);
    assert.equal(canManage(d, STRANGER), false);
});

test("the link's role decides what a person with the link can do", () => {
    assert.equal(canComment(doc({ visibility: "link", linkRole: "viewer" }), STRANGER), false);
    assert.equal(canView(doc({ visibility: "link", linkRole: "viewer" }), STRANGER), true);
    assert.equal(canEdit(doc({ visibility: "link", linkRole: "editor" }), STRANGER), true);
    // a link role only counts while the doc is on "link"
    assert.equal(canView(doc({ visibility: "private", linkRole: "editor" }), STRANGER), false);
});

test("a person the doc is shared with is known by their account, or by the email they were invited with", () => {
    const d = doc({ members: [{ id: "m1", userId: ASHA, email: "asha@x.in", role: "editor" }, { id: "m2", userId: null, email: "ravi@x.in", role: "viewer" }] });
    assert.equal(roleOf(d, ASHA), "editor");
    assert.equal(roleOf(d, user(ASHA, "other@x.in")), "editor");
    // Ravi has no account tied yet: his id alone is not enough, his email is
    assert.equal(roleOf(d, RAVI), null);
    assert.equal(roleOf(d, user(RAVI, "Ravi@X.in ")), "viewer");
    assert.equal(memberOf(d, user(RAVI, "ravi@x.in")).id, "m2");
    assert.equal(canEdit(d, ASHA), true);
    assert.equal(canManage(d, ASHA), false); // an editor does not share or delete
    assert.equal(canComment(d, user(RAVI, "ravi@x.in")), false);
});

test("the highest of a person's roles counts", () => {
    const d = doc({ visibility: "link", linkRole: "commenter", members: [{ id: "m1", userId: ASHA, email: "asha@x.in", role: "viewer" }, { id: "m2", userId: RAVI, email: "ravi@x.in", role: "editor" }] });
    assert.equal(roleOf(d, ASHA), "commenter"); // the link gives more than her own place
    assert.equal(roleOf(d, RAVI), "editor");
});

test("a comment is resolved by an editor, or by the person who wrote it while they can still comment", () => {
    const comment = { id: "c1", userId: ASHA };
    const d = doc({ visibility: "link", linkRole: "commenter", members: [{ id: "m2", userId: RAVI, email: "ravi@x.in", role: "editor" }] });
    assert.equal(canResolve(d, comment, OWNER), true);
    assert.equal(canResolve(d, comment, RAVI), true);
    assert.equal(canResolve(d, comment, ASHA), true);
    assert.equal(canResolve(d, comment, STRANGER), false);
    assert.equal(canResolve(doc(), comment, ASHA), false); // the doc went private: she can't open it any more
});

test("emails typed into Add people are cleaned, taken once, and the wrong ones are told apart", () => {
    assert.deepEqual(splitEmails(" A@x.in, b@x.in;a@X.IN\nnot-an-email  c@x"), { good: ["a@x.in", "b@x.in"], bad: ["not-an-email", "c@x"] });
    assert.deepEqual(splitEmails(["a@x.in", "b@x.in c@x.in"]), { good: ["a@x.in", "b@x.in", "c@x.in"], bad: [] });
    assert.deepEqual(splitEmails(undefined), { good: [], bad: [] });
    assert.equal(isEmail("a@b.co"), true);
    assert.equal(isEmail("a b@c.co"), false);
    assert.equal(isEmail(`${"a".repeat(250)}@b.co`), false);
});

test("an editor shares the doc; only the owner deletes it or hands it on", () => {
    const d = doc({ members: [{ id: "m1", userId: ASHA, email: "asha@x.in", role: "editor" }, { id: "m2", userId: RAVI, email: "ravi@x.in", role: "commenter" }] });
    assert.equal(canShare(d, OWNER), true);
    assert.equal(canShare(d, ASHA), true);
    assert.equal(canShare(d, RAVI), false);
    assert.equal(canManage(d, ASHA), false);
});

test("asking for a role one already has is not a request", () => {
    assert.equal(roleCovers("editor", "viewer"), true);
    assert.equal(roleCovers("viewer", "editor"), false);
    assert.equal(roleCovers("owner", "editor"), true);
    assert.equal(roleCovers(null, "viewer"), false);
    assert.equal(roleCovers("commenter", "nonsense"), true); // (an unknown ask is the lowest one)
});

test("the request email says what is asked: to open the doc, or to edit one the person can already read", () => {
    const open = accessRequestEmail({ docId: DOC, title: "Plan", requesterName: "Ravi", requesterEmail: "ravi@x.in" });
    assert.equal(open.subject, 'Ravi asked for access to "Plan"');
    assert.ok(open.content.includes("asked to open your doc"));
    const edit = accessRequestEmail({ docId: DOC, title: "Plan", requesterName: "Ravi", requesterEmail: "ravi@x.in", wants: "editor" });
    assert.equal(edit.subject, 'Ravi asked to edit "Plan"');
    assert.ok(edit.content.includes("asked to edit your doc"));
    assert.ok(edit.ignoreText.includes("You can decline the request in the doc's Share box."));
});

test("an unknown role is the lowest one", () => {
    assert.equal(cleanRole("editor"), "editor");
    assert.equal(cleanRole("owner"), "viewer");
    assert.equal(cleanRole(undefined, "commenter"), "commenter");
    assert.equal(roleWords("editor"), "read, comment and edit");
    assert.equal(roleWords("commenter"), "read and comment");
    assert.equal(roleWords("viewer"), "read");
});

test("only the people who can share the doc are sent who it is shared with and who asked for access", () => {
    const d = doc({
        visibility: "link",
        linkRole: "viewer",
        views: 4,
        pinnedBy: [ASHA],
        members: [{ id: "m1", userId: ASHA, email: "asha@x.in", name: "Asha old", role: "editor", addedAt: new Date(0) }, { id: "m2", userId: null, email: "new@x.in", role: "viewer" }],
        requests: [{ id: "r1", userId: RAVI, email: "ravi@x.in", name: "Ravi", wants: "editor", at: new Date(0) }],
        comments: [{ id: "c1", userId: ASHA, name: "Asha", text: "Hi", quote: "", at: new Date(0), resolved: false, replies: [{ userId: OWNER, name: "Nikhil", text: "Yes", at: new Date(0) }, { name: "Classgrid AI", text: "Done", at: new Date(0), byAI: true }] }],
    });
    const profiles = { byId: { [OWNER]: { name: "Nikhil S", photo: "https://p/n.jpg" }, [ASHA]: { name: "Asha K", photo: "https://p/a.jpg" } }, byEmail: {} };

    const forOwner = docForClient(d, user(OWNER, "nikhil@x.in"), profiles);
    assert.equal(forOwner.role, "owner");
    assert.deepEqual(forOwner.can, { comment: true, edit: true, share: true, manage: true });
    assert.equal(forOwner.isOwner, true);
    assert.equal(forOwner.ownerPhoto, "https://p/n.jpg");
    assert.equal(forOwner.views, 4);
    assert.equal(forOwner.pinned, false);
    assert.deepEqual(forOwner.people.map((p) => [p.id, p.email, p.name, p.photo, p.role, p.joined, p.me]), [
        ["m1", "asha@x.in", "Asha K", "https://p/a.jpg", "editor", true, false], // her name now, and her real photo
        ["m2", "new@x.in", "", "", "viewer", false, false], // invited, no account yet
    ]);
    // Ravi can already read it through the link, and asked to edit
    assert.deepEqual(forOwner.requests.map((r) => [r.id, r.email, r.name, r.wants, r.has]), [["r1", "ravi@x.in", "Ravi", "editor", "viewer"]]);
    assert.equal(forOwner.asked, null);
    assert.equal(forOwner.comments[0].photo, "https://p/a.jpg");
    assert.deepEqual(forOwner.comments[0].replies.map((r) => r.photo), ["https://p/n.jpg", ""]);

    const forAsha = docForClient(d, user(ASHA, "asha@x.in"), profiles);
    assert.equal(forAsha.role, "editor");
    // an editor shares the doc too, so she is sent the people and the requests; she is marked in the list
    assert.deepEqual(forAsha.can, { comment: true, edit: true, share: true, manage: false });
    assert.equal(forAsha.pinned, true);
    assert.deepEqual(forAsha.people.map((p) => [p.id, p.me]), [["m1", true], ["m2", false]]);
    assert.equal(forAsha.requests.length, 1);

    const forRavi = docForClient(d, user(RAVI, "ravi@x.in"), profiles);
    assert.equal(forRavi.role, "viewer");
    assert.equal(forRavi.asked, "editor"); // his "Ask to edit" shows "Request sent"
    assert.equal("requests" in forRavi, false);

    const forStranger = docForClient(d, user(STRANGER, "s@x.in"), profiles);
    assert.equal(forStranger.role, "viewer");
    assert.deepEqual(forStranger.can, { comment: false, edit: false, share: false, manage: false });
    assert.equal(forStranger.asked, null);
    assert.equal(forStranger.linkRole, "viewer");
    assert.equal("people" in forStranger, false);
});

test("a doc from before sharing is sent as it was, with the new fields at their start", () => {
    const old = { _id: DOC, owner: OWNER, ownerName: "Nikhil", title: "Old", markdown: "x", visibility: "link", comments: [], versions: [], rev: 2 };
    const sent = docForClient(old, OWNER);
    assert.equal(sent.linkRole, "commenter");
    assert.equal(sent.views, 0);
    assert.deepEqual(sent.people, []);
    assert.deepEqual(sent.requests, []);
    assert.equal(sent.ownerName, "Nikhil");
    assert.equal(sent.ownerPhoto, "");
    assert.equal(requestOf(old, STRANGER), null);
});

test("a doc's row in a list says whose it is and what this person can do", () => {
    const d = doc({ members: [{ id: "m1", userId: ASHA, email: "asha@x.in", role: "commenter" }], pinnedBy: [ASHA] });
    const row = docRow(d, user(ASHA, "asha@x.in"), { byId: { [OWNER]: { name: "Nikhil S", photo: "https://p/n.jpg" } } });
    assert.equal(row.role, "commenter");
    assert.equal(row.shared, true);
    assert.equal(row.pinned, true);
    assert.equal(row.ownerName, "Nikhil S");
    assert.equal(row.ownerPhoto, "https://p/n.jpg");
    assert.equal("markdown" in row, false);
    assert.equal(docRow(doc(), OWNER).shared, false);
});

test("a copy is named after the doc, inside the title's length", () => {
    assert.equal(copyTitle("Plan"), "Copy of Plan");
    assert.equal(copyTitle(""), "Copy of Untitled");
    assert.equal(copyTitle("x".repeat(300)).length, MAX_TITLE);
});

test("the request email names the person by their email and leads to the share box", () => {
    const email = accessRequestEmail({ docId: DOC, title: 'Plan <b>"A"</b>', requesterName: "Ravi\n<script>", requesterEmail: "ravi@x.in" });
    assert.equal(email.subject, 'Ravi <script> asked for access to "Plan <b>"A"</b>"');
    assert.ok(!/[\r\n]/.test(email.subject));
    assert.ok(email.content.includes("<strong>ravi@x.in</strong>"));
    assert.ok(email.content.includes("Plan &lt;b&gt;&quot;A&quot;&lt;/b&gt;"));
    assert.ok(!email.content.includes("<script>"));
    assert.ok(email.content.includes(`href="https://chat.classgrid.in/docs/${DOC}?share=requests"`));
    assert.ok(email.content.includes("Review request"));
    assert.ok(email.text.includes(reviewLink(DOC)));
});

test("the invite and the let-in emails say what the person can do and lead to the doc", () => {
    const invite = docInviteEmail({ docId: DOC, title: "Plan", inviterName: "Nikhil", inviterEmail: "nikhil@x.in", role: "commenter" });
    assert.equal(invite.subject, 'Nikhil shared a doc with you: "Plan"');
    assert.ok(invite.content.includes("You can read and comment it."));
    assert.ok(invite.content.includes(`href="https://chat.classgrid.in/docs/${DOC}"`));
    assert.ok(invite.text.includes("Nikhil (nikhil@x.in)"));

    const noName = docInviteEmail({ docId: DOC, title: "Plan", inviterName: "", inviterEmail: "nikhil@x.in", role: "viewer" });
    assert.equal(noName.subject, 'nikhil@x.in shared a doc with you: "Plan"');

    const granted = accessGrantedEmail({ docId: DOC, title: "Plan", ownerName: "Nikhil", role: "editor" });
    assert.equal(granted.subject, 'You can now open "Plan"');
    assert.ok(granted.content.includes("You can read, comment and edit it."));
    assert.ok(granted.text.includes(`https://chat.classgrid.in/docs/${DOC}`));
});
