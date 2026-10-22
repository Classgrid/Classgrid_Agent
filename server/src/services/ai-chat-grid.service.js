// Share Grid: up to 4 people (owner + 3) in one Classgrid AI chat.
// Tables: ai_chat_grid_members, ai_chat_grid_invites, and ai_chat_messages.sender_email (see sql/ai_chat_grid.sql).
import crypto from "crypto";
import { primarySupabaseClient as sb } from "../config/supabaseClient.js";
import User from "../models/User.js";

export const GRID_MAX_PEOPLE = 4;

const norm = (email) => String(email || "").trim().toLowerCase();
export const newInviteToken = () => crypto.randomBytes(12).toString("base64url");

/** People in the chat now (not removed). The owner has a row only once the chat is shared. */
export async function getActiveMembers(sessionId) {
    if (!sessionId) return [];
    const { data, error } = await sb
        .from("ai_chat_grid_members")
        .select("user_email, role, joined_at")
        .eq("session_id", sessionId)
        .is("removed_at", null)
        .order("joined_at", { ascending: true });
    if (error) {
        console.error("[ShareGrid] members read failed:", error.message);
        return [];
    }
    return data || [];
}

/** True when the email owns the chat or is a member of its grid. */
export async function canAccessSession(session, email) {
    const me = norm(email);
    if (!session || !me) return false;
    if (norm(session.user_email) === me) return true;
    const { data } = await sb
        .from("ai_chat_grid_members")
        .select("id")
        .eq("session_id", session.id)
        .eq("user_email", me)
        .is("removed_at", null)
        .maybeSingle();
    return !!data;
}

/** Name and photo for each email (from Classgrid accounts). */
export async function profilesFor(emails) {
    const list = [...new Set((emails || []).map(norm).filter(Boolean))];
    if (list.length === 0) return {};
    const users = await User.find({ email: { $in: list } }).select("name email profilePicture privacySettings").lean();
    const out = {};
    for (const u of users) out[norm(u.email)] = { name: u.name || u.email, avatar: u.profilePicture || "", hideEmail: !!u.privacySettings?.hideEmail };
    // No Classgrid account yet: the full email stands in for the name
    for (const e of list) if (!out[e]) out[e] = { name: e, avatar: "" };
    return out;
}

/**
 * The grid's people with name, photo and how many messages each sent. Empty when the chat was never shared.
 * Old messages (before sharing) have no sender: they count for the owner.
 */
export async function gridSummary(session) {
    const members = await getActiveMembers(session.id);
    if (members.length === 0) return [];
    const emails = members.map((m) => norm(m.user_email));
    const [profiles, rows] = await Promise.all([
        profilesFor(emails),
        sb.from("ai_chat_messages").select("sender_email").eq("session_id", session.id).eq("role", "user").limit(5000),
    ]);
    const counts = {};
    const owner = norm(session.user_email);
    for (const r of rows.data || []) {
        const who = norm(r.sender_email) || owner;
        counts[who] = (counts[who] || 0) + 1;
    }
    return members.map((m) => {
        const email = norm(m.user_email);
        return { email, role: m.role, joinedAt: m.joined_at, messageCount: counts[email] || 0, ...profiles[email] };
    });
}

/** Makes sure the owner has a member row (added the first time the chat is shared). */
export async function ensureOwnerMember(session) {
    await sb
        .from("ai_chat_grid_members")
        .upsert([{ session_id: session.id, user_email: norm(session.user_email), role: "owner" }], { onConflict: "session_id,user_email", ignoreDuplicates: true });
}

/**
 * Adds a person to the grid. Returns { ok } or { error, status }.
 * A person who was removed earlier can join again (their row is reused).
 */
export async function addMember(session, email) {
    const me = norm(email);
    if (norm(session.user_email) === me) return { ok: true, already: true };
    await ensureOwnerMember(session);
    const members = await getActiveMembers(session.id);
    if (members.some((m) => norm(m.user_email) === me)) return { ok: true, already: true };
    if (members.length >= GRID_MAX_PEOPLE) return { error: `This chat already has ${GRID_MAX_PEOPLE} people.`, status: 409 };
    const { error } = await sb
        .from("ai_chat_grid_members")
        .upsert([{ session_id: session.id, user_email: me, role: "member", joined_at: new Date().toISOString(), removed_at: null }], { onConflict: "session_id,user_email" });
    if (error) return { error: "Could not join this chat.", status: 500 };
    // The AI's cached history has no names yet: rebuild it with "Name: …" on every user message
    const { invalidateHistoryCache } = await import("./ai-chat-history.service.js");
    await invalidateHistoryCache(session.id).catch(() => {});
    return { ok: true };
}

/** Sessions shared with this email (they are a member, not the owner), for the chat list. */
export async function getSharedSessionsFor(email) {
    const me = norm(email);
    if (!me) return [];
    // Each member pins a shared chat in their own list (ai_chat_grid_members.pinned). Before that column
    // exists the read falls back to no pins, so shared chats never disappear from the list.
    const read = (cols) => sb.from("ai_chat_grid_members").select(cols).eq("user_email", me).eq("role", "member").is("removed_at", null).limit(500);
    let { data: rows, error } = await read("session_id, pinned");
    if (error) ({ data: rows } = await read("session_id"));
    const pinnedBy = Object.fromEntries((rows || []).map((r) => [r.session_id, !!r.pinned]));
    const ids = (rows || []).map((r) => r.session_id);
    if (ids.length === 0) return [];
    const { data } = await sb
        .from("ai_chat_sessions")
        .select("id, title, created_at, pinned")
        .in("id", ids)
        .eq("is_incognito", false);
    return (data || []).map((s) => ({ ...s, pinned: !!pinnedBy[s.id], shared: true }));
}

/**
 * Names the AI sees for the people in a shared chat. Two people with the same name also get their
 * email name ("Nikhil Shinde (nikhilsubsun123)"). Null when the chat isn't shared (fewer than 2 people).
 */
export async function gridLabelMap(sessionId) {
    const members = await getActiveMembers(sessionId);
    if (members.length < 2) return null;
    const profiles = await profilesFor(members.map((m) => m.user_email));
    const names = members.map((m) => profiles[norm(m.user_email)]?.name || m.user_email);
    const labels = {};
    members.forEach((m, i) => {
        const email = norm(m.user_email);
        const sameName = names.filter((n) => n.toLowerCase() === names[i].toLowerCase()).length > 1;
        // (someone who hides their email gets a number instead of their email name)
        labels[email] = !sameName ? names[i] : profiles[email]?.hideEmail ? `${names[i]} (${i + 1})` : `${names[i]} (${email})`;
    });
    const owner = norm(members.find((m) => m.role === "owner")?.user_email);
    return { labels, owner, members };
}

const IST = (d) => d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) + " IST" : null;

/**
 * For the AI: every person's full profile (what their profile page shows), how and when they joined.
 * Same privacy as the profile page: a hidden email or hobbies is left out for other people, and someone
 * who blocked the viewer shows only their name.
 */
export async function gridProfilesText(sessionId, grid, viewerEmail) {
    const viewer = norm(viewerEmail);
    const emails = grid.members.map((m) => norm(m.user_email));
    const users = await User.find({ email: { $in: emails } })
        .select("_id name email role bio hobby metadata organization_id lastLoginAt createdAt privacySettings blocked_users")
        .populate("organization_id", "name")
        .lean();
    const byEmail = Object.fromEntries(users.map((u) => [norm(u.email), u]));
    const viewerId = String(byEmail[viewer]?._id || "");
    const { data: joins } = await sb.from("ai_chat_grid_invites").select("invite_type, accepted_by_email, invited_email, accepted_at")
        .eq("session_id", sessionId).eq("status", "accepted").order("accepted_at", { ascending: false }).limit(100);
    const joinedVia = {};
    for (const j of joins || []) { const e = norm(j.accepted_by_email || j.invited_email); if (e && !joinedVia[e]) joinedVia[e] = j.invite_type; }
    let forum = {};
    try {
        const rows = await User.db.collection("forumusers").find({ email: { $in: emails } }).project({ email: 1, username: 1 }).toArray();
        forum = Object.fromEntries(rows.map((r) => [norm(r.email), r.username]));
    } catch { /* forum names are optional */ }

    const viaText = { link: "the invite link", email: "an email invite", grids: "an invite from Grids" };
    return grid.members.map((m) => {
        const email = norm(m.user_email);
        const u = byEmail[email] || {};
        const self = email === viewer;
        const blockedViewer = !self && viewerId && (u.blocked_users || []).map(String).includes(viewerId);
        const hideEmail = !self && !!u.privacySettings?.hideEmail;
        const hideHobbies = !self && !!u.privacySettings?.hideHobbies;
        const lines = [`- ${grid.labels[email] || u.name || email}${hideEmail || blockedViewer ? "" : ` <${email}>`}${self ? " (the person sending the latest message)" : ""}`];
        lines.push(m.role === "owner"
            ? `  In this chat: owner, started this chat${m.joined_at ? `; shared it from ${IST(m.joined_at)}` : ""}`
            : `  In this chat: member, joined ${IST(m.joined_at)}${joinedVia[email] ? ` via ${viaText[joinedVia[email]]}` : ""}`);
        if (blockedViewer) return lines.join("\n");
        const md = u.metadata || {};
        if (["super_admin", "co_super_admin"].includes(u.role)) lines.push("  Classgrid team member");
        if (u.organization_id?.name) lines.push(`  Organization: ${u.organization_id.name}`);
        if (u.bio || md.bio) lines.push(`  Bio: ${String(u.bio || md.bio).slice(0, 500)}`);
        if (!hideHobbies && (u.hobby || md.hobby)) lines.push(`  Hobbies: ${String(u.hobby || md.hobby).slice(0, 500)}`);
        if (md.job_role) lines.push(`  Job role: ${md.job_role}`);
        const stack = Array.isArray(md.tech_stack) ? md.tech_stack.join(", ") : typeof md.tech_stack === "string" ? md.tech_stack : "";
        if (stack.trim()) lines.push(`  Tech stack: ${stack}`);
        if (forum[email]) lines.push(`  Forum username: @${forum[email]}`);
        const links = [["LinkedIn", md.linkedin_url], ["GitHub", md.github_url], ["X/Twitter", md.twitter_url], ["Instagram", md.instagram_url], ["Facebook", md.facebook_url], ["Portfolio", md.portfolio_url]]
            .filter(([, url]) => typeof url === "string" && url.trim());
        if (links.length) lines.push(`  Links: ${links.map(([k, url]) => `${k} ${url}`).join(", ")}`);
        if (u.createdAt) lines.push(`  On Classgrid since: ${IST(u.createdAt)}`);
        if (u.lastLoginAt) lines.push(`  Last seen: ${IST(u.lastLoginAt)}`);
        return lines.join("\n");
    }).join("\n");
}

/**
 * For the AI: in a shared chat each user message starts with the sender's name ("Rahul: …"), so it knows
 * who asked what. Messages from before the chat was shared have no sender: they are the owner's.
 */
export async function senderLabels(sessionId) {
    const grid = await gridLabelMap(sessionId);
    if (!grid) return null;
    return (m) => {
        if (m.role !== "user") return "";
        const email = norm(m.sender_email) || grid.owner;
        return `${grid.labels[email] || email || "Owner"}: `;
    };
}

/**
 * Someone deletes a shared chat from their list. A member just leaves it. The owner leaves too, and the
 * chat stays for the others: the person who joined first becomes the new owner. Only when nobody else is
 * left is the chat really deleted ("delete").
 * Returns "left" | "transferred" | "delete".
 */
export async function leaveSharedChat(session, email) {
    const me = norm(email);
    const members = await getActiveMembers(session.id);
    const others = members.filter((m) => norm(m.user_email) !== me);
    const now = new Date().toISOString();
    if (norm(session.user_email) !== me) {
        await sb.from("ai_chat_grid_members").update({ removed_at: now }).eq("session_id", session.id).eq("user_email", me);
        return "left";
    }
    if (others.length === 0) return "delete";
    const next = others.find((m) => m.role === "member") || others[0];
    const newOwner = norm(next.user_email);
    const { error } = await sb.from("ai_chat_sessions").update({ user_email: newOwner, pinned: false }).eq("id", session.id);
    if (error) throw error;
    await sb.from("ai_chat_grid_members").update({ role: "owner" }).eq("session_id", session.id).eq("user_email", newOwner);
    await sb.from("ai_chat_grid_members").update({ removed_at: now, role: "member" }).eq("session_id", session.id).eq("user_email", me);
    // The old owner's invite link stops working; the new owner can make a new one
    await sb.from("ai_chat_grid_invites").update({ status: "revoked" }).eq("session_id", session.id).eq("invite_type", "link").eq("status", "pending");
    return "transferred";
}

/** Ids of the chats this person is in that are shared right now (2 or more people), for the star in the chat list. */
export async function sharedChatIdsFor(email) {
    const me = norm(email);
    if (!me) return new Set();
    const { data: mine } = await sb.from("ai_chat_grid_members").select("session_id").eq("user_email", me).is("removed_at", null).limit(1000);
    const ids = [...new Set((mine || []).map((r) => r.session_id))];
    if (ids.length === 0) return new Set();
    const { data: all } = await sb.from("ai_chat_grid_members").select("session_id").in("session_id", ids).is("removed_at", null).limit(5000);
    const count = {};
    for (const r of all || []) count[r.session_id] = (count[r.session_id] || 0) + 1;
    return new Set(Object.keys(count).filter((id) => count[id] >= 2));
}
