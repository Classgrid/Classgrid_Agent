// Classgrid AI's own email inbox (agent@classgrid.in, Zoho Mail, India data center). The AI reads every email in it,
// read and unread, and can mark them read or unread (read_agent_email tool, owner's design, 2026-10-24).
// Keys in .env: ZOHO_MAIL_CLIENT_ID, ZOHO_MAIL_CLIENT_SECRET, ZOHO_MAIL_REFRESH_TOKEN, ZOHO_MAIL_ACCOUNT_ID.
// Same Zoho calls as the marketing repo's lib/email-ai/zoho-mail.ts.

const ZOHO_TOKEN_URL = "https://accounts.zoho.in/oauth/v2/token";
const ZOHO_MAIL = "https://mail.zoho.in/api";
// Folders with mail the AI received (not its drafts, templates, outbox, sent mail or trash)
const SKIP_FOLDERS = new Set(["drafts", "templates", "outbox", "sent", "trash"]);

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

async function zoho(path, { method = "GET", body } = {}) {
    const res = await fetch(`${ZOHO_MAIL}/accounts/${process.env.ZOHO_MAIL_ACCOUNT_ID}${path}`, {
        method,
        headers: { Authorization: `Zoho-oauthtoken ${await zohoToken()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Zoho Mail ${res.status}`);
    return data.data;
}

let folderCache = null;
async function mailFolders() {
    if (folderCache) return folderCache;
    const folders = (await zoho("/folders")) || [];
    folderCache = folders.filter((f) => !SKIP_FOLDERS.has(String(f.folderName || "").toLowerCase()))
        .map((f) => ({ id: f.folderId, name: f.folderName }));
    if (!folderCache.length) throw new Error("no mail folders were found");
    return folderCache;
}

// Attachments: Zoho's links only open with our Zoho key, so each file is downloaded once and put on our CDN (R2);
// the AI gets a normal link it can open (parse_document, analyze_image, ...)
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACTIVE_TYPE = /(html|svg|xml|javascript|ecmascript)/i; // stored as plain downloads, never run as a page
const attachmentLinks = new Map(); // attachment id -> CDN link (kept while the server runs)

async function attachmentsOf(folderId, messageId) {
    const info = await zoho(`/folders/${folderId}/messages/${messageId}/attachmentinfo`);
    const list = info?.attachments || [];
    const out = [];
    for (const a of list) {
        const id = String(a.attachmentId || "");
        const name = String(a.attachmentName || "file");
        if (!id) continue;
        try {
            if (Number(a.attachmentSize) > MAX_FILE_BYTES) throw new Error(`too big (${Math.round(a.attachmentSize / 1048576)} MB, max 25 MB)`);
            let url = attachmentLinks.get(id);
            if (!url) {
                const res = await fetch(`${ZOHO_MAIL}/accounts/${process.env.ZOHO_MAIL_ACCOUNT_ID}/folders/${folderId}/messages/${messageId}/attachments/${id}`, {
                    headers: { Authorization: `Zoho-oauthtoken ${await zohoToken()}` },
                    signal: AbortSignal.timeout(60000),
                });
                if (!res.ok) throw new Error(`download failed (${res.status})`);
                const buffer = Buffer.from(await res.arrayBuffer());
                if (buffer.length > MAX_FILE_BYTES) throw new Error("too big (max 25 MB)");
                // Zoho often sends a generic type: the file's name tells the real one
                const byName = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
                    doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    txt: "text/plain", csv: "text/csv", zip: "application/zip", mp3: "audio/mpeg", mp4: "video/mp4" }[(name.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase()];
                const headerType = (res.headers.get("content-type") || "application/octet-stream").split(";")[0];
                const sentType = headerType === "application/octet-stream" && byName ? byName : headerType;
                const type = ACTIVE_TYPE.test(sentType) ? "application/octet-stream" : sentType;
                const { randomUUID } = await import("crypto");
                const { generateR2UploadUrl } = await import("./r2.service.js");
                const safe = name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-100);
                const { uploadUrl, publicUrl } = await generateR2UploadUrl(`email-files/${randomUUID()}-${safe}`, type);
                const put = await fetch(uploadUrl, { method: "PUT", body: buffer, headers: { "Content-Type": type }, signal: AbortSignal.timeout(60000) });
                if (!put.ok) throw new Error(`upload failed (${put.status})`);
                url = publicUrl;
                attachmentLinks.set(id, url);
            }
            out.push({ name, url });
        } catch (e) {
            out.push({ name, error: e.message });
        }
    }
    return out;
}

const emailOf = (sender) => (String(sender || "").match(/<([^>]+)>/)?.[1] || String(sender || "")).trim().toLowerCase();

// Banned senders (owner's order): the AI never reads, answers or acts on emails from these addresses
const BANNED_SENDERS = ["security@merx.help"];

// HTML email body → plain text
function toText(html) {
    return String(html || "")
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
        .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
        .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Emails in the AI's mailbox (every received folder), newest first, read and unread. Filters: sender, time range,
// subject words, text words, read state. markAs ("read" | "unread") marks the returned emails.
// Returns [{ id, at, folder, from, to, subject, text, read, hasAttachment }], with .total (all emails in the mailbox)
// and .matched (emails that match the filters).
export async function searchAgentMail({ fromEmail = "", fromMs = 0, toMs = Infinity, subject = "", text = "", status = "all", count = 5, markAs = "" }) {
    const want = String(fromEmail || "").trim().toLowerCase();
    const subj = String(subject || "").trim().toLowerCase();
    const state = ["read", "unread"].includes(status) ? `&status=${status}` : "";
    const all = [];
    let total = 0;
    for (const f of await mailFolders()) {
        const list = (await zoho(`/messages/view?folderId=${f.id}&limit=200`).catch(() => null)) || [];
        total += list.length;
        for (const m of list) {
            const read = String(m.status) === "1";
            if (state && (status === "read") !== read) continue;
            all.push({ ...m, folderName: f.name, folderId: m.folderId || f.id });
        }
    }
    const matches = all
        .map((m) => ({ ...m, at: Number(m.receivedTime || m.sentDateInGMT) || 0, fromAddr: (m.fromAddress || emailOf(m.sender)).toLowerCase() }))
        .filter((m) => !BANNED_SENDERS.includes(m.fromAddr) && (!want || m.fromAddr === want) && m.at >= fromMs && m.at <= toMs && (!subj || String(m.subject || "").toLowerCase().includes(subj)))
        .sort((a, b) => b.at - a.at);
    const words = String(text || "").trim().toLowerCase();
    const out = [];
    for (const m of matches) {
        if (out.length >= Math.max(1, Math.min(count, 20))) break;
        const content = await zoho(`/folders/${m.folderId}/messages/${m.messageId}/content`).catch(() => null);
        const body = toText(content?.content || "");
        if (words && !body.toLowerCase().includes(words) && !String(m.subject || "").toLowerCase().includes(words)) continue;
        const hasAttachment = m.hasAttachment === "1" || m.hasAttachment === true;
        out.push({
            id: String(m.messageId), folderId: String(m.folderId), at: m.at, folder: m.folderName, from: m.sender || m.fromAddr, fromAddress: m.fromAddr,
            to: m.toAddress || "agent@classgrid.in", subject: m.subject || "(no subject)", text: body.slice(0, 20000),
            read: String(m.status) === "1", hasAttachment,
            attachments: hasAttachment ? await attachmentsOf(m.folderId, m.messageId).catch((e) => [{ name: "attachments", error: e.message }]) : [],
        });
    }
    const mark = async (list, mode) => {
        const byFolder = new Map();
        for (const m of list) byFolder.set(m.folderId, [...(byFolder.get(m.folderId) || []), m.id]);
        for (const [folderId, ids] of byFolder) await zoho("/updatemessage", { method: "PUT", body: { mode, messageId: ids, folderId } });
    };
    if (out.length && (markAs === "read" || markAs === "unread")) {
        await mark(out, markAs === "read" ? "markAsRead" : "markAsUnread");
        for (const m of out) m.read = markAs === "read";
    } else {
        // Opening an email marks it read in Zoho: emails that were unread are put back to unread
        const wasUnread = out.filter((m) => !m.read);
        if (wasUnread.length) await mark(wasUnread, "markAsUnread").catch(() => {});
    }
    out.total = total;
    out.matched = words ? out.length : matches.length;
    return out;
}
