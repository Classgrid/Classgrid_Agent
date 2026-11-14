// Plan-end emails (owner, 2026-11-14). Plans never renew by themselves, so every hour:
//   - a plan that ends within the next 3 days: one reminder ("Your Pro plan ends on 14 Dec 2026"), with the way to renew;
//   - a plan that ended in the last 3 days: one note that the account is on Free now, and its status becomes "expired".
// Each email is claimed in one database step (plan.reminder_sent_for / plan.ended_sent_for = the expires_at it is for),
// so it goes once even with several server copies; buying again replaces the plan and clears both marks.
import nodeCron from "node-cron";
import User from "../models/User.js";
import PlanConfig from "../models/PlanConfig.js";
import { enqueueEmail } from "../services/email-queue.service.js";
import { baseTemplate } from "../services/email-templates.service.js";

const DAY = 24 * 60 * 60 * 1000;
const PAID = ["pro", "max", "enterprise"];

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const safe = (v) => String(v || "").replace(/[<>&]/g, "");

async function planNames() {
    const rows = await PlanConfig.find({}).select("key name").lean().catch(() => []);
    return new Map(rows.map((r) => [r.key, r.name]));
}

const pricingUrl = () => String(process.env.PRICING_PAGE_URL || "https://classgrid.in/pricing");
const billingUrl = () => `${String(process.env.CHAT_APP_URL || "https://chat.classgrid.in").replace(/\/$/, "")}/agent/settings?section=billing`;

async function sendReminders(names) {
    const now = new Date();
    const soon = new Date(now.getTime() + 3 * DAY);
    const users = await User.find({
        "plan.id": { $in: PAID }, "plan.status": { $in: ["active", "past_due", null] }, "plan.expires_at": { $gt: now, $lte: soon },
        // not those already reminded for this end date
        $expr: { $ne: [{ $ifNull: ["$plan.reminder_sent_for", ""] }, { $dateToString: { date: "$plan.expires_at", format: "%Y-%m-%dT%H:%M:%S.%LZ" } }] },
    })
        .select("_id email name plan").limit(500).lean();
    for (const u of users) {
        const expIso = new Date(u.plan.expires_at).toISOString();
        if (u.plan.reminder_sent_for === expIso || !u.email) continue;
        const claimed = await User.findOneAndUpdate(
            { _id: u._id, "plan.expires_at": u.plan.expires_at, "plan.reminder_sent_for": { $ne: expIso } },
            { $set: { "plan.reminder_sent_for": expIso } }, { projection: { _id: 1 } });
        if (!claimed) continue;
        const name = names.get(u.plan.id) || u.plan.id.charAt(0).toUpperCase() + u.plan.id.slice(1);
        const given = u.plan.billing === "granted";
        const html = baseTemplate({
            title: `Your ${name} plan ends on ${fmt(u.plan.expires_at)}`,
            content: `
                <h2 style="margin:0 0 12px">Your Classgrid ${safe(name)} plan ends on ${fmt(u.plan.expires_at)}</h2>
                <p>Hi ${safe(u.name || "there")}, your ${safe(name)} plan ${given ? "that Classgrid gave you " : ""}ends on <strong>${fmt(u.plan.expires_at)}</strong>. Plans do not renew by themselves.</p>
                <p>To keep ${safe(name)}, buy it again before then: the new month or year starts when this one ends, so you lose no days.</p>
                <p><a href="${pricingUrl()}" style="display:inline-block;padding:10px 20px;background:#111111;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">Renew ${safe(name)}</a></p>
                <p style="color:#666;font-size:13px">After it ends your account moves to Free. Your chats, projects and files stay. See your plan in <a href="${billingUrl()}">Settings &rsaquo; Billing</a>.</p>`,
        });
        await enqueueEmail({ to: u.email, subject: `Your Classgrid ${name} plan ends on ${fmt(u.plan.expires_at)}`, html, type: "billing_alert", userId: u._id }).catch((e) => console.error("[plan expiry] reminder email", e.message));
    }
}

async function sendEnded(names) {
    const now = new Date();
    const since = new Date(now.getTime() - 3 * DAY);
    const users = await User.find({ "plan.id": { $in: PAID }, "plan.expires_at": { $gte: since, $lte: now }, "plan.status": { $nin: ["cancelled", "expired"] } })
        .select("_id email name plan").limit(500).lean();
    for (const u of users) {
        const expIso = new Date(u.plan.expires_at).toISOString();
        if (u.plan.ended_sent_for === expIso) continue;
        const claimed = await User.findOneAndUpdate(
            { _id: u._id, "plan.expires_at": u.plan.expires_at, "plan.ended_sent_for": { $ne: expIso } },
            { $set: { "plan.ended_sent_for": expIso, "plan.status": "expired" } }, { projection: { _id: 1 } });
        if (!claimed || !u.email) continue;
        const name = names.get(u.plan.id) || u.plan.id.charAt(0).toUpperCase() + u.plan.id.slice(1);
        const html = baseTemplate({
            title: `Your ${name} plan has ended`,
            content: `
                <h2 style="margin:0 0 12px">Your Classgrid ${safe(name)} plan has ended</h2>
                <p>Hi ${safe(u.name || "there")}, your ${safe(name)} plan ended on ${fmt(u.plan.expires_at)}. Your account is on Free now. Your chats, projects and files are all still there.</p>
                <p><a href="${pricingUrl()}" style="display:inline-block;padding:10px 20px;background:#111111;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">Get ${safe(name)} again</a></p>
                <p style="color:#666;font-size:13px">See your plan and usage in <a href="${billingUrl()}">Settings &rsaquo; Billing</a>.</p>`,
        });
        await enqueueEmail({ to: u.email, subject: `Your Classgrid ${name} plan has ended`, html, type: "billing_alert", userId: u._id }).catch((e) => console.error("[plan expiry] ended email", e.message));
    }
}

export function initPlanExpiryWorker() {
    let running = false;
    nodeCron.schedule("10 * * * *", async () => {
        if (running) return;
        running = true;
        try {
            const names = await planNames();
            await sendReminders(names);
            await sendEnded(names);
        } catch (err) {
            console.error("[plan expiry] run failed:", err.message);
        } finally {
            running = false;
        }
    }, { timezone: "Asia/Kolkata" });
}
