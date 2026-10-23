/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
// Share Grid API (mounted at /api/ai/grid): invite up to 3 people into one Classgrid AI chat.
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { primarySupabaseClient as sb } from "../config/supabaseClient.js";
import { getSessionById } from "../services/ai-chat.service.js";
import { sendEmail } from "../services/aws-ses.service.js";
import { baseTemplate } from "../services/email-templates.service.js";
import User from "../models/User.js";
import redis from "../config/redis.js";
import {
    GRID_MAX_PEOPLE, newInviteToken, canAccessSession, gridSummary, ensureOwnerMember, addMember, profilesFor, getActiveMembers,
} from "../services/ai-chat-grid.service.js";

const router = express.Router();
const APP_URL = "https://chat.classgrid.in";
const norm = (email) => String(email || "").trim().toLowerCase();
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const joinUrl = (token) => `${APP_URL}/grid/join/${token}`;
const escapeHtml = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Tell everyone in the chat that something changed (members, invites, new messages). */
export function emitGridUpdate(req, sessionId, kind) {
    try {
        req.app.get("io")?.to(`aigrid:${sessionId}`).emit("aigrid:update", { sessionId, kind });
    } catch { /* live update is best-effort */ }
}

async function loadOwnedSession(req, res) {
    const session = await getSessionById(req.params.sessionId);
    if (!session || session.is_incognito) { res.status(404).json({ error: "Chat not found." }); return null; }
    if (norm(session.user_email) !== norm(req.user?.email)) { res.status(403).json({ error: "Only the chat owner can do this." }); return null; }
    const IdeProject = (await import("../models/IdeProject.js")).default;
    if (await IdeProject.exists({ chatSessionIds: session.id })) { res.status(400).json({ error: "Project Mode chats can't be shared." }); return null; }
    return session;
}

async function inviteHistory(sessionId) {
    const { data } = await sb
        .from("ai_chat_grid_invites")
        .select("id, invite_type, invited_email, invited_by_email, status, accepted_by_email, created_at, accepted_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(100);
    const rows = data || [];
    const profiles = await profilesFor(rows.flatMap((r) => [r.invited_email, r.accepted_by_email, r.invited_by_email]));
    return rows.map((r) => ({
        id: r.id,
        type: r.invite_type,
        status: r.status,
        email: r.invited_email || r.accepted_by_email || null,
        name: profiles[norm(r.invited_email || r.accepted_by_email)]?.name || null,
        invitedBy: profiles[norm(r.invited_by_email)]?.name || r.invited_by_email,
        createdAt: r.created_at,
        acceptedAt: r.accepted_at,
    }));
}

async function sendInviteEmail({ to, inviterName, inviterEmail, title, token }) {
    const link = joinUrl(token);
    const who = `${escapeHtml(inviterName)} (${escapeHtml(inviterEmail)})`;
    // Our standard Classgrid email design (same as verify-email and password-reset)
    const html = baseTemplate({
        title: "You're invited to a Classgrid AI chat",
        content: `
    <p><strong>${who}</strong> invited you to join the chat <strong>"${escapeHtml(title)}"</strong> on Classgrid AI.</p>
    <p>You can read the chat, send messages and ask the AI together.</p>
    <a href="${link}" class="btn">Accept invite</a>
    <p>Or open this link: <a href="${link}">${link}</a></p>
  `,
        ignoreText: `If you don't know ${who}, you can ignore this email.`,
    });
    await sendEmail({
        fromName: "Classgrid",
        fromEmail: "hello@classgrid.in",
        to,
        subject: `${inviterName} (${inviterEmail}) invited you to a chat on Classgrid AI`,
        html,
        text: `${inviterName} (${inviterEmail}) invited you to join the chat "${title}" on Classgrid AI. Accept: ${link}`,
    });
}

/** Invite one email (from Grids or typed): saves the invite and sends the email. */
async function inviteEmail(req, session, email, type) {
    const to = norm(email);
    if (!isEmail(to)) return { email: to, error: "Not a valid email." };
    if (to === norm(session.user_email)) return { email: to, error: "That's you." };
    const members = await getActiveMembers(session.id);
    if (members.some((m) => norm(m.user_email) === to)) return { email: to, error: "Already in this chat." };
    const token = newInviteToken();
    const { error } = await sb.from("ai_chat_grid_invites").insert([{
        session_id: session.id, invite_type: type, token, invited_email: to, invited_by_email: norm(req.user.email), status: "pending",
    }]);
    if (error) return { email: to, error: "Could not save the invite." };
    try {
        await sendInviteEmail({ to, inviterName: req.user.name || req.user.email, inviterEmail: norm(req.user.email), title: session.title || "Chat", token });
    } catch (e) {
        console.error("[ShareGrid] invite email failed:", e?.message);
        return { email: to, error: "Invite saved, but the email could not be sent." };
    }
    return { email: to, ok: true };
}

// Panel data: people (name, photo, messages sent), invite history, the invite link (owner only)
router.get("/:sessionId", isAuthenticated, async (req, res) => {
    try {
        const session = await getSessionById(req.params.sessionId);
        if (!session || !(await canAccessSession(session, req.user?.email))) return res.status(404).json({ error: "Chat not found." });
        const isOwner = norm(session.user_email) === norm(req.user.email);
        const [members, history] = await Promise.all([gridSummary(session), inviteHistory(session.id)]);
        let link = null;
        if (isOwner) {
            const { data } = await sb.from("ai_chat_grid_invites").select("token").eq("session_id", session.id)
                .eq("invite_type", "link").eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
            link = data?.token ? joinUrl(data.token) : null;
        }
        // Not shared yet: show the owner as the only person
        const people = members.length ? members : [{ email: norm(session.user_email), role: "owner", messageCount: null, ...(await profilesFor([session.user_email]))[norm(session.user_email)] }];
        // Who the agent is answering right now (one reply at a time in a shared chat)
        let replying = null;
        try { replying = JSON.parse((await redis.get(`ai:grid-replying:${session.id}`)) || "null"); } catch { /* none */ }
        res.json({ isOwner, maxPeople: GRID_MAX_PEOPLE, members: people, history, link, replying });
    } catch (e) {
        console.error("[ShareGrid] panel failed:", e);
        res.status(500).json({ error: "Could not load Share Grid." });
    }
});

// Invite link: one link per chat, made on first copy
router.post("/:sessionId/link", isAuthenticated, async (req, res) => {
    try {
        const session = await loadOwnedSession(req, res);
        if (!session) return;
        const { data: existing } = await sb.from("ai_chat_grid_invites").select("token").eq("session_id", session.id)
            .eq("invite_type", "link").eq("status", "pending").limit(1).maybeSingle();
        if (existing?.token) return res.json({ link: joinUrl(existing.token) });
        const token = newInviteToken();
        const { error } = await sb.from("ai_chat_grid_invites").insert([{
            session_id: session.id, invite_type: "link", token, invited_by_email: norm(req.user.email), status: "pending",
        }]);
        if (error) throw error;
        await ensureOwnerMember(session);
        emitGridUpdate(req, session.id, "invites");
        res.json({ link: joinUrl(token) });
    } catch (e) {
        console.error("[ShareGrid] link failed:", e);
        res.status(500).json({ error: "Could not make the invite link." });
    }
});

// Turn off the invite link (people already in stay)
router.delete("/:sessionId/link", isAuthenticated, async (req, res) => {
    try {
        const session = await loadOwnedSession(req, res);
        if (!session) return;
        await sb.from("ai_chat_grid_invites").update({ status: "revoked" }).eq("session_id", session.id).eq("invite_type", "link").eq("status", "pending");
        emitGridUpdate(req, session.id, "invites");
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "Could not turn off the link." });
    }
});

// Invite by email, or people picked from Grids: { emails: [...], type: "email" | "grids" }
router.post("/:sessionId/invites", isAuthenticated, async (req, res) => {
    try {
        const session = await loadOwnedSession(req, res);
        if (!session) return;
        const type = req.body?.type === "grids" ? "grids" : "email";
        const emails = [...new Set((Array.isArray(req.body?.emails) ? req.body.emails : [req.body?.email]).map(norm).filter(Boolean))].slice(0, GRID_MAX_PEOPLE - 1);
        if (emails.length === 0) return res.status(400).json({ error: "Add an email." });
        await ensureOwnerMember(session);
        const results = [];
        for (const email of emails) results.push(await inviteEmail(req, session, email, type));
        emitGridUpdate(req, session.id, "invites");
        res.json({ results });
    } catch (e) {
        console.error("[ShareGrid] invite failed:", e);
        res.status(500).json({ error: "Could not send the invite." });
    }
});

// Remove someone (owner), or leave the chat (member removing themselves)
router.delete("/:sessionId/members/:email", isAuthenticated, async (req, res) => {
    try {
        const session = await getSessionById(req.params.sessionId);
        if (!session) return res.status(404).json({ error: "Chat not found." });
        const me = norm(req.user.email), target = norm(req.params.email);
        const isOwner = norm(session.user_email) === me;
        if (target === norm(session.user_email)) return res.status(400).json({ error: "The owner can't be removed." });
        if (!isOwner && target !== me) return res.status(403).json({ error: "Only the chat owner can remove people." });
        await sb.from("ai_chat_grid_members").update({ removed_at: new Date().toISOString() }).eq("session_id", session.id).eq("user_email", target);
        if (isOwner && target !== me) {
            await sb.from("ai_chat_grid_invites").update({ status: "revoked" }).eq("session_id", session.id).eq("invite_type", "link").eq("status", "pending");
        }
        emitGridUpdate(req, session.id, "members");
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "Could not remove." });
    }
});

// People from my Grids chats, for "Add from Grids"
router.get("/contacts/list", isAuthenticated, async (req, res) => {
    try {
        const myId = String(req.user._id);
        const { data: mine } = await sb.from("chat_thread_members").select("thread_id").eq("user_id", myId).limit(500);
        const threadIds = (mine || []).map((t) => t.thread_id);
        if (threadIds.length === 0) return res.json({ contacts: [] });
        const { data: others } = await sb.from("chat_thread_members").select("user_id").in("thread_id", threadIds).neq("user_id", myId).limit(2000);
        const ids = [...new Set((others || []).map((o) => o.user_id))].slice(0, 300);
        const users = await User.find({ _id: { $in: ids } }).select("name email profilePicture").lean();
        const contacts = users.filter((u) => u.email).map((u) => ({ email: norm(u.email), name: u.name || u.email, avatar: u.profilePicture || "" }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json({ contacts });
    } catch (e) {
        console.error("[ShareGrid] contacts failed:", e);
        res.status(500).json({ error: "Could not load your Grids contacts." });
    }
});

// Join page: what chat this invite is for
router.get("/join/:token", isAuthenticated, async (req, res) => {
    try {
        const { data: invite } = await sb.from("ai_chat_grid_invites").select("*").eq("token", req.params.token).maybeSingle();
        if (!invite || invite.status === "revoked") return res.status(404).json({ error: "This invite is no longer active." });
        const session = await getSessionById(invite.session_id);
        if (!session) return res.status(404).json({ error: "This chat no longer exists." });
        const [owner, members] = await Promise.all([profilesFor([session.user_email]), getActiveMembers(session.id)]);
        const already = await canAccessSession(session, req.user.email);
        res.json({
            sessionId: session.id, title: session.title || "Chat", owner: owner[norm(session.user_email)],
            people: Math.max(members.length, 1), maxPeople: GRID_MAX_PEOPLE, already,
            used: invite.invite_type !== "link" && invite.status !== "pending",
        });
    } catch (e) {
        res.status(500).json({ error: "Could not open the invite." });
    }
});

// Accept an invite
router.post("/join/:token", isAuthenticated, async (req, res) => {
    try {
        const me = norm(req.user.email);
        const { data: invite } = await sb.from("ai_chat_grid_invites").select("*").eq("token", req.params.token).maybeSingle();
        if (!invite || invite.status === "revoked") return res.status(404).json({ error: "This invite is no longer active." });
        if (invite.invite_type !== "link" && invite.status !== "pending") return res.status(410).json({ error: "This invite was already used." });
        if (invite.invite_type !== "link" && norm(invite.invited_email) !== me) {
            return res.status(403).json({ error: `This invite was sent to ${invite.invited_email}. Log in with that email to accept it.` });
        }
        const session = await getSessionById(invite.session_id);
        if (!session) return res.status(404).json({ error: "This chat no longer exists." });
        const result = await addMember(session, me);
        if (result.error) return res.status(result.status).json({ error: result.error });
        if (!result.already) {
            const now = new Date().toISOString();
            if (invite.invite_type === "link") {
                // The link stays open; each join is its own history row
                await sb.from("ai_chat_grid_invites").insert([{
                    session_id: session.id, invite_type: "link", invited_by_email: invite.invited_by_email, status: "accepted", accepted_by_email: me, accepted_at: now,
                }]);
            } else {
                await sb.from("ai_chat_grid_invites").update({ status: "accepted", accepted_by_email: me, accepted_at: now }).eq("id", invite.id);
            }
            emitGridUpdate(req, session.id, "members");
        }
        res.json({ sessionId: session.id });
    } catch (e) {
        console.error("[ShareGrid] join failed:", e);
        res.status(500).json({ error: "Could not join this chat." });
    }
});

// Decline an emailed invite
router.post("/join/:token/decline", isAuthenticated, async (req, res) => {
    try {
        const { data: invite } = await sb.from("ai_chat_grid_invites").select("id, invite_type, invited_email, status, session_id").eq("token", req.params.token).maybeSingle();
        if (!invite || invite.invite_type === "link" || invite.status !== "pending") return res.json({ ok: true });
        if (norm(invite.invited_email) !== norm(req.user.email)) return res.status(403).json({ error: "This invite was sent to someone else." });
        await sb.from("ai_chat_grid_invites").update({ status: "declined" }).eq("id", invite.id);
        emitGridUpdate(req, invite.session_id, "invites");
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "Could not decline." });
    }
});

export default router;
