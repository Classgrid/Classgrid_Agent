// Messages users send to the Classgrid WhatsApp number (passed on by the ai.classgrid.in server, which receives
// Meta's webhook). The last 20 per number are kept for 3 days, so the Agent can read follow-ups and files a user
// sends while it works on their task (read_whatsapp_messages tool).

import redis from "../config/redis.js";
import { normalizeWhatsappNumber } from "./ai-feature-limits.js";
import { generateR2UploadUrl } from "./r2.service.js";

const GRAPH = "https://graph.facebook.com/v22.0";
const INBOX_KEY = (number) => `wa:inbox:${number}`;
const KEEP = 20;
const TTL_S = 3 * 24 * 60 * 60;
const MEDIA_TYPES = ["image", "document", "audio", "video", "sticker"];

export async function saveIncomingMessages(value) {
    for (const m of value?.messages || []) {
        const number = normalizeWhatsappNumber(m.from);
        if (!number) continue;
        const media = MEDIA_TYPES.includes(m.type) ? m[m.type] : null;
        const item = {
            id: m.id,
            at: Number(m.timestamp) * 1000 || Date.now(),
            type: m.type,
            text: m.text?.body || media?.caption || m.button?.text || m.interactive?.button_reply?.title || "",
            ...(media?.id ? { media: { id: media.id, mime: media.mime_type || "", filename: media.filename || "" } } : {}),
        };
        const key = INBOX_KEY(number);
        await redis.lpush(key, JSON.stringify(item));
        await redis.ltrim(key, 0, KEEP - 1);
        await redis.expire(key, TTL_S);
    }
}

// A file the user sent: downloaded from Meta and put on our CDN (R2), so the Agent can open it
async function mediaToCdn(media) {
    const auth = { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` };
    const info = await fetch(`${GRAPH}/${media.id}`, { headers: auth }).then((r) => r.json());
    if (!info?.url) throw new Error("file not found on WhatsApp");
    const file = await fetch(info.url, { headers: auth });
    if (!file.ok) throw new Error(`download failed (${file.status})`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = media.mime || info.mime_type || "application/octet-stream";
    const ext = (media.filename.match(/\.[a-z0-9]{1,6}$/i)?.[0]) || `.${(mime.split("/")[1] || "bin").split(";")[0]}`;
    const name = `whatsapp-files/${Date.now()}-${(media.filename || "file").replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[a-z0-9]{1,6}$/i, "")}${ext}`;
    const { uploadUrl, publicUrl } = await generateR2UploadUrl(name, mime);
    const put = await fetch(uploadUrl, { method: "PUT", body: buffer, headers: { "Content-Type": mime } });
    if (!put.ok) throw new Error(`upload failed (${put.status})`);
    return publicUrl;
}

// The user's latest WhatsApp messages to Classgrid (newest first), with files turned into links
export async function readRecentMessages(phone, count = 5) {
    const number = normalizeWhatsappNumber(phone);
    if (!number) return [];
    const raw = await redis.lrange(INBOX_KEY(number), 0, Math.max(1, Math.min(count, KEEP)) - 1);
    const items = raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
    for (const item of items) {
        if (!item.media) continue;
        try { item.fileUrl = await mediaToCdn(item.media); } catch (e) { item.fileError = e.message; }
    }
    return items;
}

// Waits for the user's next WhatsApp message after `sinceMs` (checks every 3 s, at most `timeoutMs`).
// Returns the new messages (oldest first, files as links), or [] when nothing came in time.
export async function waitForReply(phone, sinceMs, timeoutMs) {
    const number = normalizeWhatsappNumber(phone);
    if (!number) return [];
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
        const raw = await redis.lrange(INBOX_KEY(number), 0, KEEP - 1).catch(() => []);
        const fresh = raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter((m) => m && m.at > sinceMs);
        if (fresh.length) {
            // A few seconds more, so a reply sent as several messages (text, then a file) arrives together
            await new Promise((r) => setTimeout(r, 5000));
            const all = await readRecentMessages(phone, KEEP);
            return all.filter((m) => m.at > sinceMs).reverse();
        }
        await new Promise((r) => setTimeout(r, 3000));
    }
    return [];
}
