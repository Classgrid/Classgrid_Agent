// Desktop app chat pictures sent inside the chat request (a data: URL in fileUrls / attachments) instead of being
// uploaded to storage first. Only the desktop app may send them (see isWebsite in client-app.js): the picture goes
// to the AI for this one answer and is never stored. Everything that is saved or reused (the chat's messages, the
// AI's history, logs, tool arguments) gets a short placeholder instead:
//   desktop-image:<id>/<name> (sent from the desktop app, not stored)
// <id> is the first 16 hex characters of the SHA-256 of the data URL, so the desktop app (which keeps the picture on
// that computer) can show it again. The placeholder has no "/" after the name, so the name stays the last part.
import crypto from "node:crypto";

export const INLINE_IMAGE_PREFIX = "desktop-image:";
export const INLINE_IMAGE_NOTE = "(sent from the desktop app, not stored)";
export const MAX_INLINE_IMAGES = 6;
export const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024; // the picture itself (the client sends at most this)

const DATA_IMAGE_URL = /^data:(image\/[a-z0-9.+-]+);base64,/i;
const EXT_BY_TYPE = { "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/gif": "gif", "image/webp": "webp" };

export const isDataUrl = (u) => typeof u === "string" && /^\s*data:/i.test(u);
export const isInlineImagePlaceholder = (u) => typeof u === "string" && u.startsWith(INLINE_IMAGE_PREFIX);
export const inlineImageId = (dataUrl) => crypto.createHash("sha256").update(dataUrl).digest("hex").slice(0, 16);

// A file name safe to put in the placeholder: no slashes or control characters, at most 80 characters
function cleanName(name, mimeType) {
    let n = String(name || "").replace(/[\u0000-\u001f\u007f/\\]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!n) n = "pasted-image";
    if (!/\.[a-z0-9]{2,5}$/i.test(n)) n += `.${EXT_BY_TYPE[mimeType] || String(mimeType).split("/")[1]?.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "png"}`;
    return n;
}

const decodedBytes = (b64) => Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);

/**
 * Takes the inline pictures out of a chat request, in place: every data: URL in body.fileUrls and
 * body.attachments is replaced by its placeholder (or removed), so nothing later in the request (saving,
 * history, logs, tools) ever sees the base64. Returns the pictures for the AI:
 * [{ id, placeholder, name, mimeType, dataUrl }].
 * allowed: false (a website request) removes every data: URL and returns [].
 */
export function takeInlineImages(body, { allowed }) {
    const images = [];
    const byUrl = new Map(); // data URL -> placeholder (null: removed)
    let dropped = 0;
    const placeholderFor = (url, name) => {
        if (byUrl.has(url)) return byUrl.get(url);
        let placeholder = null;
        const m = allowed ? url.match(DATA_IMAGE_URL) : null;
        if (m && images.length < MAX_INLINE_IMAGES && decodedBytes(url.slice(m[0].length)) <= MAX_INLINE_IMAGE_BYTES) {
            const mimeType = m[1].toLowerCase();
            const id = inlineImageId(url);
            const shownName = cleanName(name, mimeType);
            placeholder = `${INLINE_IMAGE_PREFIX}${id}/${shownName} ${INLINE_IMAGE_NOTE}`;
            images.push({ id, placeholder, name: shownName, mimeType, dataUrl: url });
        } else {
            dropped++;
        }
        byUrl.set(url, placeholder);
        return placeholder;
    };

    if (!body || typeof body !== "object") return images;
    // Names come from attachments (fileUrls carry only the URL), so attachments go first
    if (Array.isArray(body.attachments)) {
        body.attachments = body.attachments.flatMap((a) => {
            if (!a || !isDataUrl(a.url)) return [a];
            const placeholder = placeholderFor(a.url.trim(), a.name);
            if (!placeholder) return [];
            const img = images.find((i) => i.placeholder === placeholder);
            return [{ ...a, url: placeholder, name: img.name, mimeType: img.mimeType }];
        });
    }
    if (Array.isArray(body.fileUrls)) {
        body.fileUrls = body.fileUrls.flatMap((u) => (isDataUrl(u) ? (placeholderFor(u.trim(), null) || []) : [u]));
    }
    // The desktop app sends each picture once, in attachments only: its placeholder is listed in fileUrls here, so
    // the message is saved, shown and routed (pickChatModel) with it like any attached file
    if (images.length > 0) {
        if (!Array.isArray(body.fileUrls)) body.fileUrls = [];
        for (const img of images) if (!body.fileUrls.includes(img.placeholder)) body.fileUrls.push(img.placeholder);
    }
    if (dropped > 0) console.warn(`[inline-images] left out ${dropped} inline file(s) (${allowed ? "not a picture, too big or too many" : "sent from the website"})`);
    return images;
}

/** The inline picture a tool argument points at (the placeholder, or any text with its id), or null */
export function findInlineImage(images, text) {
    const t = String(text || "");
    if (!t.includes(INLINE_IMAGE_PREFIX)) return null;
    return (images || []).find((i) => t.includes(`${INLINE_IMAGE_PREFIX}${i.id}`)) || null;
}

/**
 * The attachments the AI model gets: the inline pictures as data URLs (which the model helpers read as
 * images) in place of their placeholders, then the other attachments as they are.
 */
export function withInlineImages(attachments, images) {
    const rest = (Array.isArray(attachments) ? attachments : []).filter((a) => !isInlineImagePlaceholder(a?.url));
    return [...(images || []).map((i) => ({ url: i.dataUrl, name: i.name, mimeType: i.mimeType })), ...rest];
}
