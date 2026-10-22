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
    const users = await User.find({ email: { $in: list } }).select("name email profilePicture").lean();
    const out = {};
    for (const u of users) out[norm(u.email)] = { name: u.name || u.email, avatar: u.profilePicture || "" };
    for (const e of list) if (!out[e]) out[e] = { name: e.split("@")[0], avatar: "" };
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
    return { ok: true };
}

/** Sessions shared with this email (they are a member, not the owner), for the chat list. */
export async function getSharedSessionsFor(email) {
    const me = norm(email);
    if (!me) return [];
    const { data: rows } = await sb
        .from("ai_chat_grid_members")
        .select("session_id")
        .eq("user_email", me)
        .eq("role", "member")
        .is("removed_at", null)
        .limit(500);
    const ids = (rows || []).map((r) => r.session_id);
    if (ids.length === 0) return [];
    const { data } = await sb
        .from("ai_chat_sessions")
        .select("id, title, created_at, pinned")
        .in("id", ids)
        .eq("is_incognito", false);
    return (data || []).map((s) => ({ ...s, pinned: false, shared: true }));
}

/**
 * For the AI: each user message in a shared chat starts with the sender's name ("Rahul: …"),
 * so it knows who asked what. Old messages (no sender) stay as they are.
 */
export async function senderLabels(dbMessages) {
    const emails = (dbMessages || []).map((m) => m.sender_email).filter(Boolean);
    if (emails.length === 0) return null;
    const profiles = await profilesFor(emails);
    return (m) => (m.role === "user" && m.sender_email ? `${profiles[norm(m.sender_email)]?.name || m.sender_email}: ` : "");
}
