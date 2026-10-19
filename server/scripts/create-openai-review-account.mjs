/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Demo account for the OpenAI (ChatGPT) plugin reviewers on chat.classgrid.in.
 *
 *   node scripts/create-openai-review-account.mjs            -> DRY RUN (reads only, prints the plan)
 *   node scripts/create-openai-review-account.mjs --apply     -> writes the account + sample data
 *
 * What it sets up (and nothing else):
 *   - User openai-review@example.com / openai@2026, a normal public chat account (role "user" in the
 *     public chat organization), email already marked verified (the address is fake, example.com is a
 *     reserved domain), sign-up already finished (fake WhatsApp number + age), no device OTP (isSandbox:
 *     the login skips it for sandbox accounts, see auth.controller.js login()). Not @classgrid.in, so
 *     the AI chat tools never treat it as Classgrid staff.
 *   - 3 AI schedules owned by this account (same model and fields as create_schedule in
 *     src/mcp/tools.js) with no email and no WhatsApp fields, so the schedule worker never sends anything.
 *   - 1 private Grid group "OpenAI Review Demo Group" with ONLY the demo account in it (admin) and
 *     4 sample messages from the demo account (same Supabase tables as POST /api/groups and the
 *     message send route). No real user is added to anything.
 *
 * Safety:
 *   - Refuses any email other than openai-review@example.com, and never an @classgrid.in email.
 *   - Never touches another user. If the email already exists it must be a plain public chat account
 *     created by this script (metadata.demo_account), or --adopt-existing must be passed.
 *   - Creates the user with a raw insert (after mongoose validation) so the User post-save hook does
 *     NOT add it to Supabase blog_subscribers; updates use updateOne. No email, WhatsApp, Slack or
 *     realtime broadcast is sent by this script.
 *   - Idempotent: running it again only fixes the demo fields and adds sample data that is missing.
 *   - Several AI chat tools treat ANY @classgrid.in email as Classgrid staff (e.g. unified_db_query in
 *     src/mcp/tools.js), which is why the demo account uses a non-Classgrid address.
 */

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load server/.env BEFORE importing anything from src (supabaseClient.js reads env at import time)
dotenv.config({ path: resolve(__dirname, "../.env") });

// ─────────────────────────────────────────────────────────
// Fixed demo values
// ─────────────────────────────────────────────────────────
const DEMO_EMAIL = "openai-review@example.com";
const DEMO_PASSWORD = "openai@2026";
const DEMO_NAME = "OpenAI Reviewer";
const DEMO_MARKER = "openai-review"; // metadata.demo_account: proves this script made the account
// +1 555-555-0100: reserved "fictional use" number (555-0100..0199), never a real subscriber
const FAKE_WHATSAPP = "+15555550100";
const FAKE_AGE = 25;
const FAKE_JOB_ROLE = "Student";
const GROUP_NAME = "OpenAI Review Demo Group";
const TZ = "Asia/Kolkata";
const IST_OFFSET_MIN = 330; // India has no daylight saving time

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ADOPT_EXISTING = args.includes("--adopt-existing");
const emailArg = args.find((a) => a.startsWith("--email="));
const TARGET_EMAIL = (emailArg ? emailArg.slice("--email=".length) : DEMO_EMAIL).trim().toLowerCase();

if (TARGET_EMAIL !== DEMO_EMAIL) {
    console.error(`REFUSED: this script only manages ${DEMO_EMAIL} (got "${TARGET_EMAIL}").`);
    process.exit(1);
}

const MODE = APPLY ? "APPLY" : "DRY RUN";
const plan = []; // what would be / was done
const warnings = [];
const log = (line) => console.log(line);
const step = (text) => { plan.push(text); log(`  ${APPLY ? "->" : "[dry-run] would"} ${text}`); };

// ─────────────────────────────────────────────────────────
// Time helpers (IST, fixed offset)
// ─────────────────────────────────────────────────────────
function istParts(date) {
    const t = new Date(date.getTime() + IST_OFFSET_MIN * 60000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), wd: t.getUTCDay() };
}
function istToUtc(y, m, d, hour, minute) {
    return new Date(Date.UTC(y, m, d, hour, minute) - IST_OFFSET_MIN * 60000);
}
// Next time (after now) that is hour:minute IST, optionally on a weekday (0 = Sunday)
function nextIst({ hour, minute, weekday = null, minDaysAhead = 0 }, now = new Date()) {
    const p = istParts(now);
    for (let add = minDaysAhead; add < 15; add++) {
        const cand = istToUtc(p.y, p.m, p.d + add, hour, minute);
        if (cand <= now) continue;
        if (weekday !== null && istParts(cand).wd !== weekday) continue;
        return cand;
    }
    throw new Error("could not compute next run");
}

function emailHtml(heading, lines) {
    const body = lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#333">${l}</p>`).join("");
    return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">`
        + `<h2 style="margin:0 0 16px;font-size:20px;color:#111">${heading}</h2>${body}`
        + `<p style="margin:16px 0 0;font-size:12px;color:#888">Sample reminder from the Classgrid OpenAI review demo account.</p></div>`;
}

function sampleSchedules(now) {
    return [
        {
            title: "Revise physics",
            description: "Daily physics revision: 30 minutes on the current chapter (sample data for the demo account).",
            summary: "Daily physics revision at 8:00 AM IST",
            action_info: "Revise physics for 30 minutes every day at 8:00 AM (Asia/Kolkata). Focus: current chapter notes and 5 practice problems.",
            firstRun: nextIst({ hour: 8, minute: 0 }, now),
            repeat: "daily",
            email_subject: "Reminder: Revise physics",
            email_body: emailHtml("Time to revise physics", ["Spend 30 minutes on your current physics chapter.", "Finish with 5 practice problems."]),
        },
        {
            title: "Submit chemistry assignment",
            description: "One-off reminder to submit the chemistry assignment by Friday 5:00 PM IST (sample data).",
            summary: "Chemistry assignment due Friday 5:00 PM IST",
            action_info: "Submit the chemistry assignment before Friday 5:00 PM (Asia/Kolkata). Check all answers and attach the lab sheet.",
            firstRun: nextIst({ hour: 17, minute: 0, weekday: 5, minDaysAhead: 1 }, now),
            repeat: "once",
            email_subject: "Reminder: Submit chemistry assignment",
            email_body: emailHtml("Chemistry assignment due", ["Your chemistry assignment is due today at 5:00 PM.", "Check your answers and attach the lab sheet before submitting."]),
        },
        {
            title: "Weekly study plan review",
            description: "Every Sunday at 6:00 PM IST: review last week and plan next week's study topics (sample data).",
            summary: "Weekly study plan review, Sundays 6:00 PM IST",
            action_info: "Every Sunday at 6:00 PM (Asia/Kolkata): review what was finished this week and plan topics for next week.",
            firstRun: nextIst({ hour: 18, minute: 0, weekday: 0 }, now),
            repeat: "weekly",
            email_subject: "Reminder: Weekly study plan review",
            email_body: emailHtml("Weekly study plan review", ["Look back at what you finished this week.", "Pick the topics for next week and add them to your plan."]),
        },
    ];
}

const SAMPLE_MESSAGES = [
    "Welcome to the OpenAI Review Demo Group. Everything here is sample data for testing the Classgrid plugin.",
    "Reminder: physics revision is scheduled every day at 8:00 AM (IST).",
    "The chemistry assignment is due next Friday at 5:00 PM.",
    "Sunday 6:00 PM is the weekly study plan review. Add the topics you want to cover here.",
];

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
    log(`\n=== Classgrid OpenAI review demo account (${MODE}) ===`);
    log(`Account: ${DEMO_EMAIL}`);

    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set in server/.env");

    // Some AI chat tools treat any @classgrid.in email as Classgrid staff: never use one for this account
    if (DEMO_EMAIL.endsWith("@classgrid.in")) throw new Error("The demo account must not use an @classgrid.in email.");

    const mongoose = (await import("mongoose")).default;
    const bcrypt = (await import("bcryptjs")).default;
    // Models and helpers only: none of these start servers, cron jobs or queues on import
    const User = (await import("../src/models/User.js")).default;
    const AiSchedule = (await import("../src/models/AiSchedule.js")).default;
    const { normalizeRepeat } = await import("../src/utils/schedule-repeat.js");
    const { CHAT_PUBLIC_ORG_ID, isPublicChatAccount, needsChatOnboarding } = await import("../src/utils/chat-onboarding.js");

    // autoIndex/autoCreate off: loading the models must not run createIndex/createCollection on live
    // collections (keeps the dry run read-only; the server already builds these indexes at startup)
    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000, maxPoolSize: 2, minPoolSize: 0, autoIndex: false, autoCreate: false,
    });
    log("Connected to MongoDB.");

    try {
        const now = new Date();
        const orgObjectId = new mongoose.Types.ObjectId(CHAT_PUBLIC_ORG_ID);

        // ── Public chat organization (read only) ──
        const org = await mongoose.connection.db.collection("organizations")
            .findOne({ _id: orgObjectId }, { projection: { name: 1, status: 1, subdomain: 1 } });
        if (!org) warnings.push(`Public chat organization ${CHAT_PUBLIC_ORG_ID} was not found in MongoDB.`);
        else if (["suspended", "blocked"].includes(org.status)) warnings.push(`Public chat organization is ${org.status}: logins would be refused.`);
        else log(`Public chat organization: ${org.name || CHAT_PUBLIC_ORG_ID} (status ${org.status || "n/a"}, subdomain ${org.subdomain || "n/a"})`);
        // chat.classgrid.in login sends portalHost, and login() looks up Organization { subdomain: "chat" }:
        // 404 if none, 403 if it is not the public chat org (auth.controller.js login())
        const chatSubOrg = await mongoose.connection.db.collection("organizations")
            .findOne({ subdomain: "chat" }, { projection: { _id: 1 } });
        if (!chatSubOrg) warnings.push('No organization has subdomain "chat": login on chat.classgrid.in would return 404.');
        else if (String(chatSubOrg._id) !== CHAT_PUBLIC_ORG_ID) warnings.push(`Subdomain "chat" belongs to organization ${chatSubOrg._id}, not ${CHAT_PUBLIC_ORG_ID}: login on chat.classgrid.in would be refused.`);

        // ── Fake WhatsApp number must not belong to anyone else ──
        const phoneDigits = FAKE_WHATSAPP.slice(1);
        const phoneOwner = await User.findOne({
            email: { $ne: DEMO_EMAIL },
            $or: [
                { "metadata.whatsappPhone": { $in: [FAKE_WHATSAPP, phoneDigits] } },
                { "metadata.whatsapp_number": { $in: [FAKE_WHATSAPP, phoneDigits] } },
            ],
        }).select("_id").lean();
        if (phoneOwner) throw new Error(`The fake number ${FAKE_WHATSAPP} is already on another account (${phoneOwner._id}). Nothing was changed.`);

        // ── User ──
        log("\n[1/3] User");
        let user = await User.findOne({ email: DEMO_EMAIL }).select("+password").lean();
        let userId;

        // Only whatsappPhone is set (all login/onboarding gates read that). metadata.whatsapp_number is left
        // out on purpose: tools.js shows it to the AI as the user's WhatsApp, which could lead create_schedule
        // to store the fake number and the worker to call Meta with it.
        const demoMetadata = (existingMeta = {}) => {
            const { whatsapp_number: _dropped, ...rest } = existingMeta || {};
            return {
                ...rest,
                age: FAKE_AGE,
                job_role: FAKE_JOB_ROLE,
                whatsappPhone: FAKE_WHATSAPP,
                demo_account: DEMO_MARKER,
                demo_note: "OpenAI plugin review account. Fake WhatsApp number and sample data only.",
            };
        };

        if (!user) {
            const fields = {
                name: DEMO_NAME,
                email: DEMO_EMAIL,
                password: await bcrypt.hash(DEMO_PASSWORD, 10), // same rounds as the chat sign-up
                role: "user",
                organization_id: orgObjectId,
                status: "active",
                verification_status: "verified",
                isEmailVerified: true,
                authProvider: "manual",
                linkedProviders: ["manual"],
                mustResetPassword: false,
                isSandbox: true, // login skips the new-device email code for sandbox accounts
                is_demo: false,
                loginAttempts: 0,
                lockUntil: null,
                metadata: demoMetadata(),
            };
            step(`create user ${DEMO_EMAIL} (role "user", public chat org, active, email verified, WhatsApp ${FAKE_WHATSAPP}, age ${FAKE_AGE})`);
            if (APPLY) {
                const doc = new User(fields);
                await doc.validate();
                const raw = doc.toObject({ flattenMaps: true, virtuals: false, depopulate: true });
                if (raw.__v === undefined) raw.__v = 0;
                raw.createdAt = now;
                raw.updatedAt = now;
                // Raw insert: skips the post-save hook that adds new users to Supabase blog_subscribers
                await User.collection.insertOne(raw);
                userId = doc._id;
                log(`     created user ${userId}`);
            }
        } else {
            userId = user._id;
            log(`  found existing user ${userId} (role ${user.role})`);
            if (!["user", "student"].includes(user.role)) {
                throw new Error(`Existing ${DEMO_EMAIL} has role "${user.role}". Refusing to change a non-chat account.`);
            }
            if (user.organization_id && String(user.organization_id) !== CHAT_PUBLIC_ORG_ID) {
                throw new Error(`Existing ${DEMO_EMAIL} belongs to organization ${user.organization_id}, not the public chat org. Refusing.`);
            }
            if (user.metadata?.demo_account !== DEMO_MARKER && !ADOPT_EXISTING) {
                throw new Error(`Existing ${DEMO_EMAIL} was not created by this script (no metadata.demo_account). Re-run with --adopt-existing if it is the demo account.`);
            }

            const set = {};
            const wantMeta = demoMetadata(user.metadata || {});
            if (JSON.stringify(wantMeta) !== JSON.stringify(user.metadata || {})) set.metadata = wantMeta;
            const fixes = {
                role: "user",
                organization_id: orgObjectId,
                status: "active",
                verification_status: "verified",
                isEmailVerified: true,
                mustResetPassword: false,
                isSandbox: true, // skips the new-device email code (the address is fake)
                is_demo: false,
                loginAttempts: 0,
                lockUntil: null,
            };
            for (const [key, value] of Object.entries(fixes)) {
                const current = user[key];
                const same = value === null ? current == null
                    : value === false ? (current == null || current === false)
                    : String(current) === String(value);
                if (!same) set[key] = value;
            }
            let passwordOk = false;
            try { passwordOk = Boolean(user.password) && await bcrypt.compare(DEMO_PASSWORD, user.password); } catch { passwordOk = false; }
            if (!passwordOk) {
                set.password = await bcrypt.hash(DEMO_PASSWORD, 10);
                set.passwordChangedAt = now; // signs out old sessions/OAuth tokens, like a real password change
            }

            const keys = Object.keys(set);
            if (keys.length === 0) {
                log("  user already correct, nothing to update");
            } else {
                step(`update user fields: ${keys.join(", ")}`);
                if (APPLY) {
                    set.updatedAt = now;
                    await User.updateOne({ _id: userId, email: DEMO_EMAIL }, { $set: set });
                }
            }
        }

        // Verify the gates against the final shape (in dry run: the planned shape)
        const finalShape = {
            email: DEMO_EMAIL, role: "user", organization_id: CHAT_PUBLIC_ORG_ID,
            metadata: { whatsappPhone: FAKE_WHATSAPP, age: FAKE_AGE },
        };
        log(`  checks: isPublicChatAccount=${isPublicChatAccount(finalShape)} needsChatOnboarding=${needsChatOnboarding(finalShape)} (want true / false)`);

        // ── Schedules ──
        log("\n[2/3] Schedules (no email, no WhatsApp)");
        const schedules = sampleSchedules(now);
        const createdSchedules = [];
        for (const s of schedules) {
            const owner = userId ? { $or: [{ user_id: userId }, { user_email: DEMO_EMAIL }] } : { user_email: DEMO_EMAIL };
            const existing = await AiSchedule.findOne({ ...owner, title: s.title }).select("_id").lean();
            if (existing) {
                log(`  skip "${s.title}" (already exists: ${existing._id})`);
                continue;
            }
            const repeatArgs = s.repeat === "once" ? { repeat: "once" } : {
                repeat: s.repeat,
                repeat_timezone: TZ,
                repeat_until: new Date(s.firstRun.getTime() + 89 * 24 * 60 * 60 * 1000).toISOString(), // max 90 days
            };
            const rep = normalizeRepeat(repeatArgs, s.firstRun);
            if (rep.error) throw new Error(`Schedule "${s.title}": ${rep.error}`);
            const record = {
                user_email: DEMO_EMAIL,
                user_id: userId,
                organization_id: CHAT_PUBLIC_ORG_ID,
                title: s.title,
                description: s.description,
                summary: s.summary,
                action_info: s.action_info,
                scheduled_at: rep.first || s.firstRun,
                repeat: rep.repeat,
                repeat_days: rep.repeat_days || [],
                repeat_until: rep.repeat_until,
                repeat_tz: rep.repeat_tz,
                // no email_subject / email_body: the worker only emails when both are set, and the address is fake
                // no whatsapp_phone_number / whatsapp_message: the worker only sends WhatsApp when both are set
                status: "pending",
            };
            step(`create schedule "${s.title}" (${rep.repeat}${rep.repeat_until ? ` until ${rep.repeat_until.toISOString()}` : ""}, first run ${record.scheduled_at.toISOString()})`);
            if (APPLY) {
                const created = await AiSchedule.create(record);
                createdSchedules.push(String(created._id));
            }
        }

        // ── Grid group ──
        log("\n[3/3] Grid group (Supabase)");
        let groupInfo = null;
        const hasSupabase = (process.env.SUPABASE_CHAT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
            && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_CHAT_KEY);
        if (!hasSupabase) {
            warnings.push("Supabase credentials missing in server/.env: the Grid group was skipped.");
        } else {
            const { getChatSb } = await import("../src/config/supabaseClient.js");
            const sb = getChatSb();
            const uid = userId ? String(userId) : null;
            groupInfo = await ensureGroup(sb, uid, now);
        }

        // ── Summary ──
        log(`\n=== Summary (${MODE}) ===`);
        log(`User:      ${DEMO_EMAIL} / ${DEMO_PASSWORD}${userId ? ` (id ${userId})` : " (new, id assigned on --apply)"}`);
        log(`Login:     chat.classgrid.in, email + password. No device OTP (sandbox accounts skip it in login()).`);
        log(`WhatsApp:  ${FAKE_WHATSAPP} (fake, reserved fictional number). Age: ${FAKE_AGE}.`);
        log(`Schedules: ${createdSchedules.length ? createdSchedules.join(", ") : "none created in this run"}`);
        if (groupInfo) log(`Group:     ${GROUP_NAME}${groupInfo.groupId ? ` (group ${groupInfo.groupId}, thread ${groupInfo.threadId})` : ""}`);
        log(`Actions:   ${plan.length ? plan.length : "none"}${APPLY ? " applied" : " planned (dry run, nothing written)"}`);
        if (warnings.length) {
            log("Warnings:");
            for (const w of warnings) log(`  - ${w}`);
        }
        if (!APPLY) log("\nRun again with --apply to write these changes.");
        return 0;
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
}

// Private group with only the demo account (admin) and its sample messages. Same tables and columns as
// POST /api/groups (group_chat.routes.js) and the message send route (thread_chat.routes.js).
async function ensureGroup(sb, uid, now) {
    const must = (res, what) => {
        if (res.error) throw new Error(`Supabase ${what}: ${res.error.message || JSON.stringify(res.error)}`);
        return res.data;
    };

    let group = null;
    if (uid) {
        const found = must(await sb.from("chat_groups").select("id, name").eq("created_by", uid).eq("name", GROUP_NAME).limit(1), "find group");
        group = found && found[0] ? found[0] : null;
    }
    const { CHAT_PUBLIC_ORG_ID } = await import("../src/utils/chat-onboarding.js");

    if (group) {
        log(`  group exists: ${group.id}`);
    } else {
        step(`create private group "${GROUP_NAME}" (is_private, no auto-add roles, demo account only)`);
        if (APPLY) {
            group = must(await sb.from("chat_groups").insert([{
                name: GROUP_NAME,
                description: "Sample group for the OpenAI plugin review. Demo data only.",
                created_by: uid,
                org_id: CHAT_PUBLIC_ORG_ID,
                group_type: "general",
                is_private: true, // never listed in Explore for other public chat users
                require_join_approval: true,
                send_message_policy: "all",
                admin_roles: [], // no role is auto-made admin
                message_ttl: 0,
                is_official: false,
                edit_info_policy: "admin_only",
                add_member_policy: "admin_only",
                create_poll_policy: "all",
                send_attachments_policy: "all",
                auto_add_roles: [], // the daily auto-add job never pulls anyone in
            }]).select().single(), "create group");
        }
    }

    let thread = null;
    if (group) {
        const found = must(await sb.from("chat_threads").select("id").eq("group_id", group.id).limit(1), "find thread");
        thread = found && found[0] ? found[0] : null;
    }
    if (!thread) {
        step("create the group's chat thread");
        if (APPLY) {
            thread = must(await sb.from("chat_threads").insert([{ type: "group", org_id: CHAT_PUBLIC_ORG_ID, group_id: group.id }]).select().single(), "create thread");
        }
    } else {
        log(`  thread exists: ${thread.id}`);
    }

    let isMember = false;
    if (thread) {
        const found = must(await sb.from("chat_thread_members").select("id, role").eq("thread_id", thread.id).eq("user_id", uid).limit(1), "find membership");
        isMember = Boolean(found && found[0]);
        if (isMember && found[0].role !== "admin") {
            step("make the demo account admin of its group");
            if (APPLY) must(await sb.from("chat_thread_members").update({ role: "admin" }).eq("id", found[0].id), "update membership");
        }
    }
    if (!isMember) {
        step("add the demo account to the group as admin (only member)");
        if (APPLY) must(await sb.from("chat_thread_members").insert([{ thread_id: thread.id, user_id: uid, role: "admin" }]), "add member");
    }

    let existingTexts = new Set();
    if (thread) {
        const found = must(await sb.from("chat_messages").select("message").eq("thread_id", thread.id).eq("sender_id", uid).limit(200), "find messages");
        existingTexts = new Set((found || []).map((m) => m.message));
    }
    const missing = SAMPLE_MESSAGES.filter((m) => !existingTexts.has(m));
    if (missing.length === 0) {
        log("  sample messages already there");
    } else {
        step(`post ${missing.length} sample message(s) from the demo account`);
        if (APPLY) {
            const base = now.getTime() - missing.length * 60000;
            const rows = missing.map((text, i) => ({
                thread_id: thread.id,
                sender_id: uid,
                sender_name: DEMO_NAME,
                user_avatar: null,
                message: text,
                reply_to: null,
                created_at: new Date(base + i * 60000).toISOString(),
                status: "approved",
                requires_acknowledgement: false,
                is_silent: false,
                priority: "normal",
                expires_at: null,
                mentioned_users: [],
                link_preview: null,
            }));
            must(await sb.from("chat_messages").insert(rows), "insert messages");
            const last = rows[rows.length - 1];
            must(await sb.from("chat_threads").update({
                last_message: last.message,
                last_message_at: last.created_at,
                updated_at: new Date().toISOString(),
            }).eq("id", thread.id), "update thread preview");
        }
    }

    return { groupId: group ? group.id : null, threadId: thread ? thread.id : null };
}

main()
    .then((code) => process.exit(code || 0))
    .catch((err) => {
        console.error(`\nFAILED: ${err.message}`);
        process.exit(1);
    });
