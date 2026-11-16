// Live docs: the three emails of sharing (owner, 2026-11-16: "the user gets an email and an invite; if a doc is
// private the other user can request it from that user"):
//   - to the owner, when someone asks for access to a private doc ("Review request")
//   - to a person the owner shared the doc with ("Open the doc")
//   - to the person who asked, when the owner let them in
// A published page (chat.classgrid.in/p/<id>) is shared the same way: with kind "page" the same three emails say
// "page" and link to the page (owner, 2026-11-16).
// The words are made here with nothing else in them (so they are tested on their own: tests/live-doc.test.mjs);
// sending is at the bottom. Our standard Classgrid email design (baseTemplate), sent from hello@classgrid.in like
// the chat invites.
import { docLink, roleWords } from "./live-doc.helpers.js";

/** Where a doc or a page opens. */
export const sharedLink = (kind, id) => (kind === "page" ? `https://chat.classgrid.in/p/${id}` : docLink(id));
// (what a role lets a person do with a page: it is opened, not read)
const can = (kind, role) => (kind === "page" ? (role === "editor" ? "open it, comment on it and share it" : role === "commenter" ? "open it and comment on it" : "open it") : `${roleWords(role)} it`);

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// (a subject is one line)
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** The page the owner answers requests on: the doc, with its share box open. */
export const reviewLink = (docId, kind = "doc") => `${sharedLink(kind, docId)}?share=requests`;

/** Someone asked for access: the email to the owner. */
export function accessRequestEmail({ docId, title, requesterName, requesterEmail, wants = "viewer", kind = "doc" }) {
    const link = reviewLink(docId, kind);
    const name = oneLine(requesterName) || requesterEmail;
    // (someone who can already read it asks for more: to comment, or to edit)
    const more = wants === "editor" ? (kind === "page" ? "share" : "edit") : wants === "commenter" ? "comment on" : "";
    const asks = more ? `asked to ${more}` : "asked to open";
    return {
        subject: oneLine(more ? `${name} asked to ${more} "${title}"` : `${name} asked for access to "${title}"`),
        heading: more ? `Someone asked to ${more} your ${kind}` : `Someone asked for access to your ${kind}`,
        content: `
    <p><strong>${escapeHtml(requesterEmail)}</strong> ${asks} your ${kind} <strong>"${escapeHtml(title)}"</strong> on Classgrid.</p>
    <div class="box">
      <p class="meta">Who is asking</p>
      <p><strong>${escapeHtml(requesterEmail)}</strong></p>
      <p>Name they use: ${escapeHtml(name)}</p>
    </div>
    <p>Go by the email address when you decide: the name is chosen by the person.</p>
    <a href="${link}" class="btn">Review request</a>
    <p>Or open this link: <a href="${link}">${link}</a></p>
  `,
        ignoreText: `You are getting this because someone asked for access to a ${kind} you own on Classgrid. ${more ? "Nothing changes until you answer." : "Nobody can open it until you let them in."} You can decline the request in the ${kind}'s Share box.`,
        text: `${requesterEmail} (name they use: ${name}) ${asks} your ${kind} "${title}" on Classgrid. Go by the email address when you decide. Review the request: ${link}`,
    };
}

/** The owner shared the doc with a person: the email to that person. */
export function docInviteEmail({ docId, title, inviterName, inviterEmail, role, kind = "doc" }) {
    const link = sharedLink(kind, docId);
    const who = `${oneLine(inviterName) || inviterEmail} (${inviterEmail})`;
    return {
        subject: oneLine(`${oneLine(inviterName) || inviterEmail} shared a ${kind} with you: "${title}"`),
        heading: `A ${kind} was shared with you`,
        content: `
    <p><strong>${escapeHtml(who)}</strong> shared the ${kind} <strong>"${escapeHtml(title)}"</strong> with you on Classgrid.</p>
    <p>You can ${can(kind, role)}. Sign in with this email address to open it.</p>
    <a href="${link}" class="btn">Open the ${kind}</a>
    <p>Or open this link: <a href="${link}">${link}</a></p>
  `,
        ignoreText: `If you don't know ${escapeHtml(who)}, you can ignore this email.`,
        text: `${who} shared the ${kind} "${title}" with you on Classgrid. You can ${can(kind, role)}. Sign in with this email address to open it: ${link}`,
    };
}

/** The owner let the person in: the email to the person who asked. */
export function accessGrantedEmail({ docId, title, ownerName, role, kind = "doc" }) {
    const link = sharedLink(kind, docId);
    const owner = oneLine(ownerName) || "The owner";
    return {
        subject: oneLine(`You can now open "${title}"`),
        heading: `You have access to the ${kind}`,
        content: `
    <p><strong>${escapeHtml(owner)}</strong> let you into the ${kind} <strong>"${escapeHtml(title)}"</strong> on Classgrid.</p>
    <p>You can ${can(kind, role)}.</p>
    <a href="${link}" class="btn">Open the ${kind}</a>
    <p>Or open this link: <a href="${link}">${link}</a></p>
  `,
        ignoreText: null,
        text: `${owner} let you into the ${kind} "${title}" on Classgrid. You can ${can(kind, role)}. Open it: ${link}`,
    };
}

/** Sends one of the emails above to `to`. Throws when it could not be sent. */
export async function sendDocEmail(to, email) {
    const [{ sendEmail }, { baseTemplate }] = await Promise.all([import("./aws-ses.service.js"), import("./email-templates.service.js")]);
    await sendEmail({
        fromName: "Classgrid",
        fromEmail: "hello@classgrid.in",
        to,
        subject: email.subject,
        html: baseTemplate({ title: email.heading, content: email.content, ignoreText: email.ignoreText }),
        text: email.text,
    });
}
