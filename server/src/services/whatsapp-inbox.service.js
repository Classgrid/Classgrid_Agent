// Messages users send to the Classgrid WhatsApp number (passed on by the ai.classgrid.in server, which receives
// Meta's webhook). The last 20 per number are kept for 3 days, so the Agent can read follow-ups and files a user
// sends while it works (read_whatsapp_messages / wait_for_whatsapp_reply tools).

import crypto from "crypto";
import redis from "../config/redis.js";
import { normalizeWhatsappNumber } from "./ai-feature-limits.js";
import { generateR2UploadUrl } from "./r2.service.js";

const GRAPH = "https://graph.facebook.com/v22.0";
const INBOX_KEY = (number) => `wa:inbox:${number}`;
const SEEN_KEY = (id) => `wa:msgseen:${id}`;
const MEDIA_KEY = (id) => `wa:media:${id}`;
// When this number last messaged or called Classgrid (WhatsApp only delivers normal messages within 24 h of that)
export const LAST_IN_KEY = (number) => `wa:lastin:${number}`;
// Someone (a call, a call task, an Agent waiting for a reply) is using this number's chat right now
export const BUSY_KEY = (number) => `wa:busy:${number}`;
const KEEP = 20;
const TTL_S = 3 * 24 * 60 * 60;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MEDIA_TYPES = ["image", "document", "audio", "video", "sticker"];
// Only Meta's own file hosts ever get the WhatsApp key
const META_FILE_HOST = /(^|\.)(fbsbx\.com|fbcdn\.net|whatsapp\.net)$/i;
// Files that a browser would run as a page are stored as plain downloads
const ACTIVE_TYPE = /(html|svg|xml|javascript|ecmascript)/i;

export const markLastIn = (number) => redis.set(LAST_IN_KEY(number), String(Date.now()), "EX", 2 * 24 * 60 * 60).catch(() => {});

// The readable text of any WhatsApp message type
function messageText(m) {
    const media = MEDIA_TYPES.includes(m.type) ? m[m.type] : null;
    if (m.text?.body) return m.text.body;
    if (media?.caption) return media.caption;
    if (m.button?.text) return m.button.text;
    if (m.interactive?.button_reply?.title) return m.interactive.button_reply.title;
    if (m.interactive?.list_reply?.title) return m.interactive.list_reply.title;
    if (m.reaction) return `reacted ${m.reaction.emoji || ""}`.trim();
    if (m.location) return `location ${m.location.latitude},${m.location.longitude}${m.location.name ? ` (${m.location.name})` : ""}${m.location.address ? ` ${m.location.address}` : ""}`;
    if (m.contacts?.length) return `shared contact${m.contacts.length > 1 ? "s" : ""}: ${m.contacts.map((c) => `${c.name?.formatted_name || "?"} ${(c.phones || []).map((p) => p.phone).join(", ")}`).join("; ")}`;
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
        await markLastIn(number);
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

async function withFiles(items) {
    for (const item of items) {
        if (!item.media) continue;
        try { item.fileUrl = await mediaToCdn(item.media); } catch (e) { item.fileError = e.message; }
    }
    return items;
}

// Owner's rule: when a task is completed it is gone from the AI's mind. Messages sent before that moment are
// never given to the AI again.
const CUTOFF_KEY = (number) => `wa:cutoff:${number}`;
export async function forgetMessagesBefore(phone, ms = Date.now()) {
    const number = normalizeWhatsappNumber(phone);
    if (number) await redis.set(CUTOFF_KEY(number), String(ms), "EX", TTL_S).catch(() => {});
    // A new task starts with a clean "already sent" list
    if (number) await redis.del(SENT_KEY(number), `${SENT_KEY(number)}:list`).catch(() => {});
}

// ─── Never the same message twice (owner's rule, 2026-10-24) ────
// Everything sent to a number during a task (text and files) is remembered; the same text or the same file (same
// content, by its ETag) is never sent again. The list is wiped when the task ends.
const SENT_KEY = (number) => `wa:sent:${number}`;
const textKey = (text) => "t:" + crypto.createHash("sha1").update(String(text || "").toLowerCase().replace(/[\s*_~`]+/g, " ").trim()).digest("hex");

// The file's content fingerprint (R2 gives an ETag); its URL if that can't be read
export async function fileKey(url) {
    try {
        const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        const tag = res.headers.get("etag") || `${res.headers.get("content-length") || ""}:${res.headers.get("last-modified") || ""}`;
        return "f:" + crypto.createHash("sha1").update(`${url}|${tag}`).digest("hex");
    } catch {
        return "f:" + crypto.createHash("sha1").update(String(url)).digest("hex");
    }
}

export async function wasSent(phone, { text = "", fileUrl = "" } = {}) {
    const number = normalizeWhatsappNumber(phone);
    if (!number) return false;
    const key = fileUrl ? await fileKey(fileUrl) : text ? textKey(text) : null;
    if (!key) return false;
    return !!(await redis.sismember(SENT_KEY(number), key).catch(() => 0));
}

export async function rememberSent(phone, { text = "", fileUrl = "" } = {}) {
    const number = normalizeWhatsappNumber(phone);
    if (!number) return;
    const keys = [];
    if (text) keys.push(textKey(text));
    if (fileUrl) keys.push(await fileKey(fileUrl));
    if (!keys.length) return;
    await redis.sadd(SENT_KEY(number), ...keys).catch(() => {});
    await redis.expire(SENT_KEY(number), TTL_S).catch(() => {});
    // A short readable list, so a resumed AI knows what it already sent
    await redis.rpush(`${SENT_KEY(number)}:list`, JSON.stringify({ at: Date.now(), text: String(text || "").slice(0, 200), file: fileUrl || "" })).catch(() => {});
    await redis.ltrim(`${SENT_KEY(number)}:list`, -30, -1).catch(() => {});
    await redis.expire(`${SENT_KEY(number)}:list`, TTL_S).catch(() => {});
}

// What was already sent in this task, for the resumed AI ("" when nothing)
export async function sentSummary(phone) {
    const number = normalizeWhatsappNumber(phone);
    if (!number) return "";
    const raw = await redis.lrange(`${SENT_KEY(number)}:list`, 0, -1).catch(() => []);
    const items = raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
    return items.map((m) => `- ${m.file ? `file ${m.file}${m.text ? ` with "${m.text}"` : ""}` : `"${m.text}"`}`).join("\n").slice(0, 3000);
}

async function inbox(number) {
    const raw = await redis.lrange(INBOX_KEY(number), 0, KEEP - 1).catch(() => []);
    const cutoff = Number(await redis.get(CUTOFF_KEY(number)).catch(() => 0)) || 0;
    return raw.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter((m) => m && m.at > cutoff);
}

// The user's latest WhatsApp messages to Classgrid (newest first), with files turned into links.
// sinceMs: only messages from this task's time (older ones belong to other tasks)
export async function readRecentMessages(phone, count = 5, sinceMs = 0) {
    const number = normalizeWhatsappNumber(phone);
    if (!number) return [];
    return withFiles((await inbox(number)).filter((m) => m.at >= sinceMs).slice(0, Math.max(1, Math.min(count, KEEP))));
}

// Waits for the user's next WhatsApp message after `sinceMs` (checks every 3 s, at most `timeoutMs`, stops when
// `signal` aborts). Reactions don't count as a reply. Returns the new messages (oldest first, files as links).
export async function waitForReply(phone, sinceMs, timeoutMs, signal) {
    const number = normalizeWhatsappNumber(phone);
    if (!number) return [];
    const until = Date.now() + timeoutMs;
    const isReply = (m) => m.at > sinceMs && m.type !== "reaction";
    while (Date.now() < until && !signal?.aborted) {
        redis.set(BUSY_KEY(number), "1", "EX", 30).catch(() => {});
        if ((await inbox(number)).some(isReply)) {
            // A few seconds more, so a reply sent as several messages (text, then a file) arrives together
            await new Promise((r) => setTimeout(r, 5000));
            return withFiles((await inbox(number)).filter(isReply).reverse());
        }
        await new Promise((r) => setTimeout(r, 3000));
    }
    return [];
}

// The newest message the Agent has already read with its WhatsApp tools, so a long task doesn't get it twice
const READ_UPTO_KEY = (number) => `wa:readupto:${number}`;
export async function noteMessagesRead(phone, items) {
    const number = normalizeWhatsappNumber(phone);
    const newest = Math.max(0, ...(items || []).map((m) => Number(m.at) || 0));
    if (!number || !newest) return;
    const now = Number(await redis.get(READ_UPTO_KEY(number)).catch(() => 0)) || 0;
    if (newest > now) await redis.set(READ_UPTO_KEY(number), String(newest), "EX", TTL_S).catch(() => {});
}

// Messages (not reactions) newer than `sinceMs` that the Agent has not read yet: oldest first, files as links
export async function unreadMessages(phone, sinceMs = 0) {
    const number = normalizeWhatsappNumber(phone);
    if (!number) return [];
    const readUpTo = Number(await redis.get(READ_UPTO_KEY(number)).catch(() => 0)) || 0;
    const after = Math.max(Number(sinceMs) || 0, readUpTo);
    return withFiles((await inbox(number)).filter((m) => m.at > after && m.type !== "reaction").reverse());
}

// Is an Agent or a call using this number's chat right now (so the old help bot should stay quiet)?
export async function isNumberBusy(phone) {
    const number = normalizeWhatsappNumber(phone);
    return !!number && !!(await redis.get(BUSY_KEY(number)).catch(() => null));
}
