// Live docs: sharing with people, access requests, who is reading now, views, copies, pins and reports
// (owner, 2026-11-16: the share box, "request access" for a private doc, and the doc's own menu).
// Who may do what is in live-doc.helpers.js; the emails are in live-doc-emails.js.
// A published page (models/SharePage.js, /api/pages) is shared the same way, with the same fields (members,
// requests, linkRole, views, pinnedBy), so the functions here take a doc or a page: what is saved goes to the
// model the thing came from, and the words say "doc" or "page" (owner, 2026-11-16).
import crypto from "crypto";
import LiveDoc from "../models/LiveDoc.js";
import User from "../models/User.js";
import redis from "../config/redis.js";
import { createDoc, userName } from "./live-doc.service.js";
import {
    MAX_MEMBERS, MAX_REQUESTS, MAX_INVITES_AT_ONCE, MAX_REPORT, REQUEST_EMAIL_EVERY_MS,
    cleanRole, normEmail, splitEmails, memberOf, requestOf, roleOf, roleCovers, docForClient, copyTitle,
} from "./live-doc.helpers.js";
import { accessRequestEmail, docInviteEmail, accessGrantedEmail, sendDocEmail } from "./live-doc-emails.js";

const newId = () => crypto.randomBytes(6).toString("hex");
const idOf = (v) => (v == null ? "" : String(v._id || v));
const quiet = { timestamps: false }; // (a change the readers need not be told about: the doc's "edited" time stays)
// The model a doc or a page is saved in, and the word for it
const isPage = (doc) => doc?.constructor?.modelName === "SharePage";
const modelOf = (doc) => (typeof doc?.constructor?.updateOne === "function" ? doc.constructor : LiveDoc);
const kindOf = (doc) => (isPage(doc) ? "page" : "doc");

// ── People's names and photos ──

/**
 * The current name and photo of everyone the doc names: its owner, the people it is shared with, the people who
 * asked for access and the people who commented. { byId, byEmail } for docForClient.
 */
export async function profilesOf(doc) {
    const ids = new Set([idOf(doc.owner)]);
    const emails = new Set();
    for (const m of doc.members || []) (m.userId ? ids.add(idOf(m.userId)) : emails.add(normEmail(m.email)));
    for (const r of doc.requests || []) ids.add(idOf(r.userId));
    for (const c of doc.comments || []) {
        if (c.userId) ids.add(idOf(c.userId));
        for (const reply of c.replies || []) if (reply.userId) ids.add(idOf(reply.userId));
    }
    ids.delete("");
    emails.delete("");
    const or = [];
    if (ids.size) or.push({ _id: { $in: [...ids] } });
    if (emails.size) or.push({ email: { $in: [...emails] } });
    const users = or.length ? await User.find({ $or: or }).select("name email profilePicture").lean() : [];
    const byId = {};
    const byEmail = {};
    for (const u of users) {
        const profile = { name: u.name || u.email || "", photo: u.profilePicture || "" };
        byId[String(u._id)] = profile;
        if (u.email) byEmail[normEmail(u.email)] = profile;
    }
    return { byId, byEmail };
}

/** The doc as the signed-in user gets it, with everyone's current name and photo. */
export async function docFor(doc, user, extra = {}) {
    const profiles = await profilesOf(doc).catch(() => ({}));
    return { ...docForClient(doc, user, profiles), ...extra };
}

// ── Who is reading now, and views ──

const SEEN = (docId) => `livedoc:seen:${docId}`;
const READING_MS = 35000; // the page asks every 10 s: someone not heard from for 35 s has left

/**
 * Marks this person as reading the doc now and answers everyone who is: [{ id, name, photo, me }], this person
 * first. Kept in Redis for two minutes; when Redis can't be reached nobody is shown (the doc still opens).
 */
export async function readingNow(doc, user) {
    const me = String(user._id);
    const now = Date.now();
    try {
        const key = SEEN(doc._id);
        const answers = await redis.multi()
            .hset(key, me, JSON.stringify({ n: userName(user), p: user.profilePicture || "", t: now }))
            .expire(key, 120)
            .hgetall(key)
            .exec();
        const all = answers?.[2]?.[1] || {};
        const people = [];
        const gone = [];
        for (const [id, raw] of Object.entries(all)) {
            let seen = null;
            try { seen = JSON.parse(raw); } catch { /* an entry that can't be read is dropped */ }
            if (!seen || now - Number(seen.t) > READING_MS) { gone.push(id); continue; }
            people.push({ id, name: String(seen.n || ""), photo: String(seen.p || ""), me: id === me });
        }
        if (gone.length) redis.hdel(key, ...gone).catch(() => {});
        people.sort((a, b) => Number(b.me) - Number(a.me) || a.name.localeCompare(b.name));
        return people;
    } catch {
        return [];
    }
}

/** This person closed the doc: they are no longer shown as reading it. */
export async function stoppedReading(docId, user) {
    try { await redis.hdel(SEEN(docId), String(user._id)); } catch { /* it ends by itself in 35 s */ }
}

/**
 * Counts one opening of the doc (the same person counts once in half an hour) and answers the new number.
 * Without Redis nothing is counted, so the number is never pushed up by one person refreshing.
 */
export async function countView(doc, user) {
    const views = doc.views || 0;
    try {
        const first = await redis.set(`livedoc:view:${doc._id}:${user._id}`, "1", "EX", 1800, "NX");
        if (first !== "OK") return views;
        await modelOf(doc).updateOne({ _id: doc._id }, { $inc: { views: 1 } }, quiet);
        return views + 1;
    } catch {
        return views;
    }
}

/** A person invited by email opens the doc signed in for the first time: their account is tied to the invite. */
export async function claimMembership(doc, user) {
    const member = memberOf(doc, user);
    if (!member || member.userId || idOf(doc.owner) === String(user._id)) return;
    member.userId = user._id;
    member.name = userName(user);
    await modelOf(doc).updateOne({ _id: doc._id, "members.id": member.id }, { $set: { "members.$.userId": user._id, "members.$.name": member.name } }, quiet).catch(() => {});
}

// ── Sharing with people ──

/**
 * The owner shares the doc with emails (typed in "Add people"), each as `role`. Answers one line per email:
 * { email, ok: true, already? } or { email, error }. A person who is already in keeps their place and gets the new
 * role with no second email. A waiting request from an invited person is answered by the invite.
 */
export async function inviteMembers(doc, { by, emails, role, notify = true }) {
    const wanted = cleanRole(role);
    const { good, bad } = splitEmails(emails);
    const results = bad.map((email) => ({ email, error: "This is not an email address." }));
    if (good.length > MAX_INVITES_AT_ONCE) throw new Error(`Add up to ${MAX_INVITES_AT_ONCE} people at a time.`);
    if (!good.length && !bad.length) throw new Error("Type an email address first.");

    const known = good.length ? await User.find({ email: { $in: good } }).select("name email").lean() : [];
    const accounts = new Map(known.map((u) => [normEmail(u.email), u]));
    const ownerId = idOf(doc.owner);
    const added = [];
    for (const email of good) {
        const account = accounts.get(email);
        if (email === normEmail(by.email) || (account && String(account._id) === ownerId)) { results.push({ email, error: `This is the ${kindOf(doc)}'s owner.` }); continue; }
        const existing = (doc.members || []).find((m) => normEmail(m.email) === email || (account && idOf(m.userId) === String(account._id)));
        if (existing) {
            existing.role = wanted;
            results.push({ email, ok: true, already: true });
            continue;
        }
        if (doc.members.length >= MAX_MEMBERS) { results.push({ email, error: `A ${kindOf(doc)} can be shared with up to ${MAX_MEMBERS} people.` }); continue; }
        doc.members.push({ id: newId(), userId: account?._id || null, email, name: account?.name || "", role: wanted, addedAt: new Date(), addedBy: by._id });
        doc.requests = (doc.requests || []).filter((r) => normEmail(r.email) !== email && !(account && idOf(r.userId) === String(account._id)));
        added.push(email);
        results.push({ email, ok: true });
    }
    await doc.save();

    if (notify) {
        for (const email of added) {
            try {
                await sendDocEmail(email, docInviteEmail({ docId: doc._id, title: doc.title, inviterName: userName(by), inviterEmail: normEmail(by.email), role: wanted, kind: kindOf(doc) }));
            } catch (e) {
                console.error("[live-docs] invite email failed:", e?.message);
                const line = results.find((r) => r.email === email);
                if (line) line.note = "Shared, but the email could not be sent. Send them the link yourself.";
            }
        }
    }
    return results;
}

export async function setMemberRole(doc, memberId, role) {
    const member = (doc.members || []).find((m) => m.id === String(memberId));
    if (!member) throw new Error(`That person was not found on this ${kindOf(doc)}.`);
    member.role = cleanRole(role);
    await doc.save();
    return member;
}

export async function removeMember(doc, memberId) {
    const before = doc.members.length;
    doc.members = doc.members.filter((m) => m.id !== String(memberId));
    if (doc.members.length === before) throw new Error(`That person was not found on this ${kindOf(doc)}.`);
    await doc.save();
}

/** General access: "private" or "link", and what the link lets people do. */
export async function setGeneralAccess(doc, { visibility, linkRole }) {
    if (visibility !== undefined) {
        if (!["private", "link"].includes(visibility)) throw new Error('visibility must be "private" or "link".');
        doc.visibility = visibility;
    }
    if (linkRole !== undefined) doc.linkRole = cleanRole(linkRole, "commenter");
    await doc.save();
    return doc;
}

/**
 * The owner makes a person the doc is shared with its owner. The doc is theirs from then on; the owner until now
 * stays on it as an editor. The person must have a Classgrid account.
 */
export async function makeOwner(doc, memberId, by) {
    const member = (doc.members || []).find((m) => m.id === String(memberId));
    if (!member) throw new Error(`That person was not found on this ${kindOf(doc)}.`);
    const account = member.userId
        ? await User.findById(member.userId).select("name email").lean()
        : await User.findOne({ email: normEmail(member.email) }).select("name email").lean();
    if (!account) throw new Error(`This person has no Classgrid account yet, so the ${kindOf(doc)} can't be made theirs.`);
    doc.members = doc.members.filter((m) => m.id !== member.id && idOf(m.userId) !== String(by._id) && normEmail(m.email) !== normEmail(by.email));
    doc.members.push({ id: newId(), userId: by._id, email: normEmail(by.email), name: userName(by), role: "editor", addedAt: new Date(), addedBy: by._id });
    doc.owner = account._id;
    if (!isPage(doc)) doc.ownerName = userName(account);
    await doc.save();
}

// ── Access requests ──

/**
 * A signed-in person asks the doc's owner for access: someone who can't open it asks to be let in (`wants`
 * "viewer"), someone who can read it asks to be let to comment or edit. The request waits on the doc and the owner
 * is emailed (once a day at most for the same person asking again). Answers "open" (they already have what they
 * ask for) or "pending".
 */
export async function requestAccess(doc, user, wants = "viewer") {
    const wanted = cleanRole(wants);
    if (roleCovers(roleOf(doc, user), wanted)) return "open";
    const email = normEmail(user.email);
    if (!email) throw new Error("Your account has no email address, so the owner can't be told who is asking.");
    let request = requestOf(doc, user);
    const now = Date.now();
    const asksMore = request && !roleCovers(request.wants, wanted);
    if (request && !asksMore && request.emailedAt && now - new Date(request.emailedAt).getTime() < REQUEST_EMAIL_EVERY_MS) return "pending";
    if (!request) {
        if ((doc.requests || []).length >= MAX_REQUESTS) throw new Error(`This ${kindOf(doc)} has too many requests waiting. Try again later.`);
        request = { id: newId(), userId: user._id, email, name: userName(user), wants: wanted, at: new Date(), emailedAt: null };
        doc.requests.push(request);
        await doc.save();
    } else if (asksMore) {
        request.wants = wanted;
        await doc.save();
    }
    const owner = await User.findById(doc.owner).select("email").lean();
    if (owner?.email) {
        try {
            await sendDocEmail(owner.email, accessRequestEmail({ docId: doc._id, title: doc.title, requesterName: userName(user), requesterEmail: email, wants: cleanRole(request.wants), kind: kindOf(doc) }));
            await modelOf(doc).updateOne({ _id: doc._id, "requests.id": request.id }, { $set: { "requests.$.emailedAt": new Date() } }, quiet);
        } catch (e) {
            // (the request still waits in the owner's share box)
            console.error("[live-docs] access request email failed:", e?.message);
        }
    }
    return "pending";
}

/**
 * The owner answers a request: let the person in as `role` (they become a member and are emailed), or say no (the
 * request is removed; the person is not emailed).
 */
export async function answerRequest(doc, requestId, { approve, role, by }) {
    const request = (doc.requests || []).find((r) => r.id === String(requestId));
    if (!request) throw new Error("That request was not found. It may have been answered already.");
    doc.requests = doc.requests.filter((r) => r.id !== request.id);
    // (the owner picks the role; without a pick it is what the person asked for)
    const wanted = cleanRole(role, cleanRole(request.wants));
    if (approve) {
        const existing = (doc.members || []).find((m) => idOf(m.userId) === idOf(request.userId) || normEmail(m.email) === normEmail(request.email));
        if (existing) existing.role = wanted;
        else {
            if (doc.members.length >= MAX_MEMBERS) throw new Error(`A ${kindOf(doc)} can be shared with up to ${MAX_MEMBERS} people.`);
            doc.members.push({ id: newId(), userId: request.userId, email: normEmail(request.email), name: request.name || "", role: wanted, addedAt: new Date(), addedBy: by._id });
        }
    }
    await doc.save();
    if (approve) {
        try {
            await sendDocEmail(request.email, accessGrantedEmail({ docId: doc._id, title: doc.title, ownerName: userName(by), role: wanted, kind: kindOf(doc) }));
        } catch (e) {
            console.error("[live-docs] access granted email failed:", e?.message);
        }
    }
}

// ── The doc's own menu ──

/** A copy of the doc for this person: theirs, private, with the same text. */
export const duplicateDoc = (doc, user) => createDoc({ user, title: copyTitle(doc.title), markdown: doc.markdown, by: "user" });

/** Pins the doc in this person's own list, or takes the pin off. */
export async function setPinned(doc, user, pinned) {
    await modelOf(doc).updateOne({ _id: doc._id }, pinned ? { $addToSet: { pinnedBy: user._id } } : { $pull: { pinnedBy: user._id } }, quiet);
    return !!pinned;
}

export const REPORT_REASONS = ["spam", "harassment", "hate_speech", "inappropriate", "misinformation", "copyright", "other"];

/** Reports the doc to the Classgrid team: it shows in the super admin's Content Moderation. */
export async function reportDoc(doc, user, { reason, description }) {
    if (!REPORT_REASONS.includes(reason)) throw new Error(`Pick what is wrong with this ${kindOf(doc)}.`);
    const ContentReport = (await import("../models/ContentReport.js")).default;
    const already = await ContentReport.exists({ reportedBy: user._id, contentId: String(doc._id), status: "pending" });
    if (already) return;
    await ContentReport.create({
        reportedBy: user._id,
        reportedByName: userName(user),
        contentType: "other",
        contentId: String(doc._id),
        contentPreview: isPage(doc)
            ? `Published page "${doc.title}": https://chat.classgrid.in/p/${doc._id}`
            : `Live doc "${doc.title}": ${String(doc.markdown || "").replace(/\s+/g, " ").slice(0, 240)}`,
        reportedUser: idOf(doc.owner) || null,
        reportedUserName: doc.ownerName || "",
        reason,
        description: String(description || "").trim().slice(0, MAX_REPORT),
    });
}

/** Reports one comment on the doc to the Classgrid team. */
export async function reportComment(doc, comment, user, { reason, description }) {
    if (!REPORT_REASONS.includes(reason)) throw new Error("Pick what is wrong with this comment.");
    const ContentReport = (await import("../models/ContentReport.js")).default;
    const contentId = `${doc._id}:${comment.id}`;
    if (await ContentReport.exists({ reportedBy: user._id, contentId, status: "pending" })) return;
    await ContentReport.create({
        reportedBy: user._id,
        reportedByName: userName(user),
        contentType: "other",
        contentId,
        contentPreview: `Comment on the ${isPage(doc) ? "published page" : "live doc"} "${doc.title}": ${String(comment.text || "").replace(/\s+/g, " ").slice(0, 240)}`,
        reportedUser: comment.userId || null,
        reportedUserName: comment.name || "",
        reason,
        description: String(description || "").trim().slice(0, MAX_REPORT),
    });
}

// ── A person's docs ──

/** The docs this person owns and the docs shared with them by name (not the ones only a link opens). */
export async function docsOf(user) {
    const email = normEmail(user.email);
    const fields = "title visibility linkRole owner ownerName members pinnedBy lastBy updatedAt createdAt";
    const [mine, shared] = await Promise.all([
        LiveDoc.find({ owner: user._id }).select(fields).sort({ updatedAt: -1 }).limit(200).lean(),
        LiveDoc.find({ owner: { $ne: user._id }, $or: [{ "members.userId": user._id }, ...(email ? [{ "members.email": email }] : [])] }).select(fields).sort({ updatedAt: -1 }).limit(200).lean(),
    ]);
    const owners = [...new Set(shared.map((d) => String(d.owner)))];
    const people = owners.length ? await User.find({ _id: { $in: owners } }).select("name email profilePicture").lean() : [];
    const byId = {};
    for (const u of people) byId[String(u._id)] = { name: u.name || u.email || "", photo: u.profilePicture || "" };
    return { mine, shared, profiles: { byId } };
}
