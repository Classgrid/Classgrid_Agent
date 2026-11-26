// The emails of a Google Play purchase (owner, 2026-11-26: "it also sends email etc. all that web has"), the same ones
// a website payment sends: the buyer's receipt from billing@classgrid.in and the alert to team@classgrid.in.
//   - a plan bought or renewed: the receipt says the plan, the period, what Google charged, and that Google Play renews
//     it (the website's plan receipt, razorpay-webhook.routes.js AI_PLAN, says nothing renews by itself, which is not
//     true for Google Play)
//   - a credit pack: the website top-up's own receipt and PDF (getAiCreditUserReceiptHtml, generateAiReceiptPdfBuffer)
//     and team alert (getAiCreditAdminNotificationHtml), as billing-checkout.routes.js /confirm sends them
// Called once per Google order: only when that order's Invoices row was written now (google-play.service.js). An
// email that fails is logged and never stops the payment.
import { PLAY_MANAGE_URL } from "./google-play-rules.js";

const FROM = { fromName: "Classgrid Billing", fromEmail: "billing@classgrid.in" };
const TEAM = "team@classgrid.in";

const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const fmtTime = (d) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

/** What Google charged, written for a person: "₹499", "USD 5.99", or "" when it could not be read */
export function moneyText(charged) {
    if (!charged?.known) return "";
    const amount = Number(charged.amount) || 0;
    if (charged.currency === "INR") return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    return `${charged.currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function planName(key) {
    try {
        const { default: PlanConfig } = await import("../models/PlanConfig.js");
        const row = await PlanConfig.findOne({ key }).select("name features_text").lean();
        return { name: row?.name || key.charAt(0).toUpperCase() + key.slice(1), features: row?.features_text || [] };
    } catch {
        return { name: key.charAt(0).toUpperCase() + key.slice(1), features: [] };
    }
}

/**
 * A Google Play plan bought (renewal false) or renewed (renewal true): the receipt to the buyer and the team alert.
 * { user: { _id, name, email }, key, term "month"|"year", charged (chargedAmount), paymentId, orderId, from, to,
 *   autoRenew, productId, test, renewal }
 */
export async function sendPlayPlanEmails({ user, key, term, charged, paymentId, orderId, from, to, autoRenew = true, productId = "", test = false, renewal = false }) {
    try {
        const { sendEmail } = await import("./aws-ses.service.js");
        const { baseTemplate } = await import("./email-templates.service.js");
        const { name, features } = await planName(key);
        const termText = term === "year" ? "1 year" : "1 month";
        const paid = moneyText(charged);
        const testMark = test ? "[Test] " : "";
        const manage = PLAY_MANAGE_URL(productId);

        if (user?.email) {
            const lines = features.map((l) => `<li style="margin:4px 0">${esc(l)}</li>`).join("");
            const heading = renewal ? `Your Classgrid ${esc(name)} plan was renewed` : `You're subscribed to Classgrid ${esc(name)}`;
            const html = baseTemplate({
                title: heading,
                content: `
                    <h2 style="margin:0 0 12px">${heading}</h2>
                    <p>Hi ${esc(user.name || "there")}, thank you. Your ${esc(name)} plan is on from ${fmtDate(from)} to ${fmtDate(to)}.</p>
                    <table style="border-collapse:collapse;margin:16px 0" cellpadding="6">
                        <tr><td style="color:#666">Plan</td><td><strong>Classgrid ${esc(name)}</strong> (${termText})</td></tr>
                        ${paid ? `<tr><td style="color:#666">Amount paid</td><td><strong>${esc(paid)}</strong> (through Google Play)</td></tr>` : ""}
                        <tr><td style="color:#666">Google Play order</td><td>${esc(orderId || paymentId)}</td></tr>
                        <tr><td style="color:#666">Paid on</td><td>${fmtDate(new Date())}</td></tr>
                    </table>
                    ${lines && !renewal ? `<p style="margin:0 0 4px">What ${esc(name)} gives you:</p><ul style="margin:0 0 16px;padding-left:20px">${lines}</ul>` : ""}
                    <p>${autoRenew
                        ? `Google Play renews this plan by itself on ${fmtDate(to)}.`
                        : `Renewal is turned off: the plan ends on ${fmtDate(to)}.`}
                    You can change or cancel it any time in Google Play: <a href="${manage}">Manage subscription</a>. Questions: reply to this email.</p>
                    <p><a href="https://chat.classgrid.in/c" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open Classgrid</a></p>`,
            });
            const subject = `${testMark}Receipt: Classgrid ${name} plan${renewal ? " renewed" : ""}${paid ? `, ${paid}` : ""}`;
            await sendEmail({ to: user.email, subject, html, ...FROM, userId: user._id || null }).catch((e) => console.error("[Google Play] plan receipt email failed:", e.message));
        }

        const teamHtml = baseTemplate({
            title: "New Google Play plan payment",
            content: `
                <p style="margin:0 0 12px;font-size:18px;font-weight:700">${test ? "Test purchase (not real money): " : ""}${renewal ? "Google Play plan renewed" : "New Google Play plan purchase"}</p>
                <table style="border-collapse:collapse;margin:16px 0" cellpadding="6">
                    <tr><td style="color:#666">Plan</td><td><strong>${esc(name)}</strong> (${termText})</td></tr>
                    <tr><td style="color:#666">Amount</td><td><strong>${esc(paid || "not read from Google")}</strong></td></tr>
                    <tr><td style="color:#666">Purchaser</td><td>${esc(user?.name || "Unknown")} (${esc(user?.email || "no email")})</td></tr>
                    <tr><td style="color:#666">Google Play order</td><td style="font-family:monospace">${esc(orderId || paymentId)}</td></tr>
                    <tr><td style="color:#666">Plan until</td><td>${fmtDate(to)}</td></tr>
                    <tr><td style="color:#666">Time</td><td>${fmtTime(new Date())} IST</td></tr>
                </table>`,
        });
        const teamSubject = `${test ? "[TEST] " : ""}${renewal ? "Google Play renewal" : "New Google Play plan purchase"}: ${name} (${termText})${paid ? `, ${paid}` : ""} from ${user?.name || "Unknown"}`;
        await sendEmail({ to: TEAM, subject: teamSubject, html: teamHtml, ...FROM }).catch((e) => console.error("[Google Play] team plan email failed:", e.message));
    } catch (err) {
        console.error("[Google Play] plan emails failed:", err.message);
    }
}

/**
 * A Google Play credit pack: the website top-up's receipt (with its PDF) to the buyer and its alert to the team.
 * { user: { _id, name, email }, productId, credits, charged, paymentId, orderId, paidAt, regionCode, test }
 */
export async function sendPlayPackEmails({ user, productId, credits, charged, paymentId, orderId, paidAt, regionCode = "", test = false }) {
    try {
        const { sendEmail } = await import("./aws-ses.service.js");
        const { getAiCreditUserReceiptHtml, getAiCreditAdminNotificationHtml } = await import("./email-templates.service.js");
        const paid = moneyText(charged) || "the Google Play price";
        const when = fmtTime(paidAt || new Date());
        const creditsText = Number(credits || 0).toLocaleString();
        const shownId = orderId || paymentId;
        const testMark = test ? "[Test] " : "";

        if (user?.email) {
            const attachments = [];
            try {
                const { generateAiReceiptPdfBuffer } = await import("./pdf-invoice.service.js");
                const pdf = await generateAiReceiptPdfBuffer({ amountFormatted: paid, creditsAdded: credits, paymentId: shownId, paidAt: `${when} IST`, payerName: user.name || "Payer", payerEmail: user.email });
                attachments.push({ filename: `Classgrid_AI_Receipt_${String(shownId).replace(/[^\w.-]/g, "_")}.pdf`, content: pdf, contentType: "application/pdf" });
            } catch (e) {
                console.error("[Google Play] pack receipt PDF failed (email sent without it):", e.message);
            }
            const html = getAiCreditUserReceiptHtml(esc(user.name || "there"), esc(paid), creditsText, esc(shownId), when);
            await sendEmail({ to: user.email, subject: `${testMark}Payment Successful — ${paid} | Classgrid`, html, ...FROM, attachments, userId: user._id || null })
                .catch((e) => console.error("[Google Play] pack receipt email failed:", e.message));
        }

        const teamHtml = getAiCreditAdminNotificationHtml(
            esc(user?.name || "Unknown"), esc(user?.email || "no email"), esc(paid), creditsText, esc(shownId),
            `Android app (Google Play, ${esc(productId)})${test ? " — TEST PURCHASE, not real money" : ""}`,
            regionCode ? `Google Play country: ${esc(regionCode)}` : "Unknown Location", "Not known (Google Play)", `${when} IST`,
        );
        await sendEmail({ to: TEAM, subject: `${test ? "[TEST] " : ""}New AI Credit Purchase (Google Play): ${paid} from ${user?.name || "Unknown"}`, html: teamHtml, ...FROM })
            .catch((e) => console.error("[Google Play] team pack email failed:", e.message));
    } catch (err) {
        console.error("[Google Play] pack emails failed:", err.message);
    }
}
