// Messages users send to the Classgrid WhatsApp number (passed on by the ai.classgrid.in server, which receives
// Meta's webhook). The last 20 per number are kept for 3 days, so the Agent can read follow-ups and files a user
// sends while it works (read_whatsapp_messages tool).

import crypto from "crypto";
import redis from "../config/redis.js";
import { normalizeWhatsappNumber } from "./ai-feature-limits.js";
import { generateR2UploadUrl } from "./r2.service.js";

const GRAPH = "https://graph.facebook.com/v22.0";
const INBOX_KEY = (number) => `wa:inbox:${number}`;
const SEEN_KEY = (id) => `wa:msgseen:${id}`;
const MEDIA_KEY = (id) => `wa:media:${id}`;
const KEEP = 20;
const TTL_S = 3 * 24 * 60 * 60;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MEDIA_TYPES = ["image", "document", "audio", "video", "sticker"];
// Only Meta's own file hosts ever get the WhatsApp key
const META_FILE_HOST = /(^|\.)(fbsbx\.com|fbcdn\.net|whatsapp\.net)$/i;
// Files a browser would run as a page are stored as plain downloads
const ACTIVE_TYPE = /(html|svg|xml|javascript|ecmascript)/i;

// The readable text of any WhatsApp message type
function messageText(m) {
    const media = MEDIA_TYPES.includes(m.type) ? m[m.type] : null;
    if (m.text?.body) return m.text.body;
    if (media?.caption) return media.caption;
    if (m.button?.text) return m.button.text;
    if (m.interactive?.button_reply?.title) return m.interactive.button_reply.title;
    if (m.interactive?.list_reply?.title) return m.interactive.list_reply.title;
    if (m.reaction) return `reacted ${m.reaction.emoji || ""}`.trim();
    if (m.location) return `location ${m.location.latitude},${m.location.longitude}${m.location.name ? ` (${m.location.name})` : ""}`;
    return "";
}

export async function saveIncomingMessages(value) {
    for (const m of value?.messages || []) {
        const number = normalizeWhatsappNumber(m.from);
        if (!number || !m.id) continue;
        // Meta sends a message again when it retries: keep each one once
        const fresh = await redis.set(SEEN_KEY(m.id), "1", "EX", TTL_S, "NX").catch(() => "OK");
        if (!fresh) continue;
        const media = MEDIA_TYPES.includes(m.type) ? m[m.type] : null;
        const item = {
            id: m.id,
            at: Number(m.timestamp) * 1000 || Date.now(),
            type: m.type,
            text: messageText(m),
            ...(media?.id ? { media: { id: String(media.id), mime: media.mime_type || "", filename: media.filename || "" } } : {}),
        };
        const key = INBOX_KEY(number);
        await redis.lpush(key, JSON.stringify(item));
        await redis.ltrim(key, 0, KEEP - 1);
        await redis.expire(key, TTL_S);
    }
}

// A file the user sent: downloaded from Meta and put on our CDN (R2), once, so the Agent can open it
async function mediaToCdn(media) {
    if (!/^\d+$/.test(media.id)) throw new Error("bad file id");
    const cached = await redis.get(MEDIA_KEY(media.id)).catch(() => null);
    if (cached) return cached;
    const auth = { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` };
    const info = await fetch(`${GRAPH}/${media.id}`, { headers: auth, signal: AbortSignal.timeout(30000) }).then((r) => r.json());
    if (!info?.url) throw new Error("file not found on WhatsApp");
    if (!META_FILE_HOST.test(new URL(info.url).hostname)) throw new Error("file is not on a WhatsApp host");
    if (Number(info.file_size) > MAX_FILE_BYTES) throw new Error(`file is too big (${Math.round(info.file_size / 1048576)} MB, max 25 MB)`);
    const file = await fetch(info.url, { headers: auth, signal: AbortSignal.timeout(30000) });
    if (!file.ok) throw new Error(`download failed (${file.status})`);
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_BYTES) throw new Error("file is too big (max 25 MB)");
    const sentMime = media.mime || info.mime_type || "application/octet-stream";
    const mime = ACTIVE_TYPE.test(sentMime) ? "application/octet-stream" : sentMime;
    const ext = (media.filename.match(/\.[a-z0-9]{1,6}$/i)?.[0]) || `.${(sentMime.split("/")[1] || "bin").split(";")[0].replace(/[^a-z0-9]/gi, "").slice(0, 6) || "bin"}`;
    const base = (media.filename || "file").replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[a-z0-9]{1,6}$/i, "").slice(0, 80);
    const name = `whatsapp-files/${crypto.randomUUID()}-${base}${ext}`;
    const { uploadUrl, publicUrl } = await generateR2UploadUrl(name, mime);
    const put = await fetch(uploadUrl, { method: "PUT", body: buffer, headers: { "Content-Type": mime }, signal: AbortSignal.timeout(60000) });
    if (!put.ok) throw new Error(`upload failed (${put.status})`);
    redis.set(MEDIA_KEY(media.id), publicUrl, "EX", TTL_S).catch(() => {});
    return publicUrl;
}

async function inbox(number, count = KEEP) {
    const raw = await redis.lrange(INBOX_KEY(number), 0, Math.max(1, Math.min(count, KEEP)) - 1).catch(() => []);
    return raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
}

async function withFiles(items) {
    for (const item of items) {
        if (!item.media) continue;
        try { item.fileUrl = await mediaToCdn(item.media); } catch (e) { item.fileError = e.message; }
    }
    return items;
}

// The user's latest WhatsApp messages to Classgrid (newest first), with files turned into links
export async function readRecentMessages(phone, count = 5) {
    const number = normalizeWhatsappNumber(phone);
    if (!number) return [];
    return withFiles(await inbox(number, count));
}
