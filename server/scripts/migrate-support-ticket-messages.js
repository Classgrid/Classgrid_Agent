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
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */
import "../env.js";
import mongoose from "mongoose";
import SupportTicket from "../src/models/SupportTicket.js";

const MONGO_URI = process.env.MONGO_URI;

function normalizeRole(authorRole) {
    const role = String(authorRole || "").toLowerCase();
    return role === "admin" || role === "super_admin" || role.includes("admin") ? "admin" : "user";
}

function buildMessages(ticket) {
    const messages = [];

    if (ticket.message) {
        messages.push({
            author: ticket.submitterName || "Classgrid User",
            role: "user",
            body: ticket.message,
            date: ticket.createdAt || new Date(),
            footer: ticket.submitterEmail ? `Email: ${ticket.submitterEmail}` : ""
        });
    }

    for (const reply of ticket.replies || []) {
        messages.push({
            author: reply.authorName || "Classgrid Support",
            role: normalizeRole(reply.authorRole),
            body: reply.message,
            date: reply.createdAt || new Date(),
            footer: ""
        });
    }

    return messages;
}

async function migrate() {
    if (!MONGO_URI) {
        throw new Error("MONGO_URI is required.");
    }

    await mongoose.connect(MONGO_URI);

    const tickets = await SupportTicket.find({
        $or: [
            { messages: { $exists: false } },
            { messages: { $size: 0 } },
            { lastComment: { $exists: false } }
        ]
    });

    let updated = 0;
    for (const ticket of tickets) {
        const messages = buildMessages(ticket);
        ticket.messages = messages;
        ticket.lastComment = messages[messages.length - 1]?.date || ticket.updatedAt || ticket.createdAt || new Date();
        await ticket.save();
        updated += 1;
    }

    console.log(`Migrated ${updated} support ticket(s).`);
}

migrate()
    .catch((error) => {
        console.error("Support ticket migration failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
