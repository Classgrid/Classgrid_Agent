// Classgrid AI's own email inbox (agent@classgrid.in, Zoho Mail, India data center). Users email the AI from their
// account's email address, and the AI reads those emails with the read_agent_email tool (owner's design, 2026-10-24).
// Keys in .env: ZOHO_MAIL_CLIENT_ID, ZOHO_MAIL_CLIENT_SECRET, ZOHO_MAIL_REFRESH_TOKEN, ZOHO_MAIL_ACCOUNT_ID.
// Same Zoho calls as the marketing repo's lib/email-ai/zoho-mail.ts.

const ZOHO_TOKEN_URL = "https://accounts.zoho.in/oauth/v2/token";
const ZOHO_MAIL = "https://mail.zoho.in/api";

export const isAgentMailConfigured = () => !!(process.env.ZOHO_MAIL_CLIENT_ID && process.env.ZOHO_MAIL_CLIENT_SECRET
    && process.env.ZOHO_MAIL_REFRESH_TOKEN && process.env.ZOHO_MAIL_ACCOUNT_ID);

let accessToken = null;
let tokenExpiresAt = 0;
async function zohoToken() {
    if (accessToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) return accessToken;
    const res = await fetch(ZOHO_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: process.env.ZOHO_MAIL_REFRESH_TOKEN, client_id: process.env.ZOHO_MAIL_CLIENT_ID,
            client_secret: process.env.ZOHO_MAIL_CLIENT_SECRET, grant_type: "refresh_token",
        }).toString(),
        signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) throw new Error(`Zoho login failed (${res.status})`);
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return accessToken;
}

async function zoho(path) {
    const res = await fetch(`${ZOHO_MAIL}/accounts/${process.env.ZOHO_MAIL_ACCOUNT_ID}${path}`, {
        headers: { Authorization: `Zoho-oauthtoken ${await zohoToken()}` },
        signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Zoho Mail ${res.status}`);
    return data.data;
}

let inboxFolderId = null;
async function inboxFolder() {
    if (inboxFolderId) return inboxFolderId;
    const folders = (await zoho("/folders")) || [];
    const inbox = folders.find((f) => f.folderName?.toLowerCase() === "inbox" || f.folderType?.toLowerCase() === "inbox");
    if (!inbox) throw new Error("the inbox folder was not found");
    inboxFolderId = inbox.folderId;
    return inboxFolderId;
}

const emailOf = (sender) => (String(sender || "").match(/<([^>]+)>/)?.[1] || String(sender || "")).trim().toLowerCase();

// HTML email body → plain text
function toText(html) {
    return String(html || "")
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
        .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
        .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Emails in the AI's inbox from this sender, newest first, filtered by time, subject words and text words.
// Returns [{ id, at, from, to, subject, text, hasAttachment }].
export async function searchAgentMail({ fromEmail, fromMs = 0, toMs = Infinity, subject = "", text = "", count = 5 }) {
    const folderId = await inboxFolder();
    const want = String(fromEmail || "").trim().toLowerCase();
    const list = (await zoho(`/messages/view?folderId=${folderId}&limit=200`)) || [];
    const subj = String(subject || "").trim().toLowerCase();
    const matches = list
        .map((m) => ({ ...m, at: Number(m.receivedTime || m.sentDateInGMT) || 0, fromAddr: (m.fromAddress || emailOf(m.sender)).toLowerCase() }))
        .filter((m) => m.fromAddr === want && m.at >= fromMs && m.at <= toMs && (!subj || String(m.subject || "").toLowerCase().includes(subj)))
        .sort((a, b) => b.at - a.at);
    const words = String(text || "").trim().toLowerCase();
    const out = [];
    for (const m of matches) {
        if (out.length >= Math.max(1, Math.min(count, 10))) break;
        const content = await zoho(`/folders/${m.folderId || folderId}/messages/${m.messageId}/content`).catch(() => null);
        const body = toText(content?.content || "");
        if (words && !body.toLowerCase().includes(words) && !String(m.subject || "").toLowerCase().includes(words)) continue;
        out.push({
            id: String(m.messageId), at: m.at, from: m.sender || m.fromAddr, to: m.toAddress || "agent@classgrid.in",
            subject: m.subject || "(no subject)", text: body.slice(0, 20000), hasAttachment: m.hasAttachment === "1" || m.hasAttachment === true,
        });
    }
    return out;
}
