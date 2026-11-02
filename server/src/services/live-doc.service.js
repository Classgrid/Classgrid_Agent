// Live docs: saving, comments and Word/PDF export, shared by the /api/docs routes and the AI tools.
import crypto from "crypto";
import mongoose from "mongoose";
import LiveDoc from "../models/LiveDoc.js";
import {
    MAX_COMMENT, MAX_QUOTE, cleanMarkdown, cleanTitle, tooBig, pushVersion, fileBase,
} from "./live-doc.helpers.js";

export const isDocId = (id) => mongoose.Types.ObjectId.isValid(String(id || "")) && /^[0-9a-f]{24}$/i.test(String(id));
export const findDoc = (id) => (isDocId(id) ? LiveDoc.findById(id) : Promise.resolve(null));
export const userName = (user) => String(user?.name || user?.email || "Someone").slice(0, 100);
const newId = () => crypto.randomBytes(6).toString("hex");

export async function createDoc({ user, title, markdown, by = "ai" }) {
    const text = cleanMarkdown(markdown);
    if (tooBig(text)) throw new Error("The doc is too big (max about 1 MB of text).");
    return LiveDoc.create({
        owner: user._id,
        ownerName: userName(user),
        title: cleanTitle(title),
        markdown: text,
        versions: [{ markdown: text, at: new Date(), by }],
        rev: 1,
        lastBy: by,
    });
}

// Saves new text (and/or title) and keeps a version when the text changed
export async function saveDoc(doc, { title, markdown, by = "user" }) {
    if (title !== undefined) doc.title = cleanTitle(title);
    if (markdown !== undefined) {
        const text = cleanMarkdown(markdown);
        if (tooBig(text)) throw new Error("The doc is too big (max about 1 MB of text).");
        if (text !== doc.markdown) {
            doc.markdown = text;
            doc.versions = pushVersion(doc.versions.map((v) => (v.toObject ? v.toObject() : v)), { markdown: text, at: new Date(), by });
            doc.rev = (doc.rev || 0) + 1;
            doc.lastBy = by;
        }
    }
    await doc.save();
    return doc;
}

export async function addComment(doc, { user, text, quote }) {
    const body = String(text || "").trim().slice(0, MAX_COMMENT);
    if (!body) throw new Error("Write a comment first.");
    const comment = { id: newId(), userId: user._id, name: userName(user), text: body, quote: String(quote || "").trim().slice(0, MAX_QUOTE), at: new Date(), resolved: false, replies: [] };
    doc.comments.push(comment);
    await doc.save();
    return comment;
}

export async function addReply(doc, commentId, { user, text, byAI = false }) {
    const comment = doc.comments.find((c) => c.id === String(commentId));
    if (!comment) throw new Error("That comment was not found.");
    const body = String(text || "").trim().slice(0, MAX_COMMENT);
    if (!body) throw new Error("Write a reply first.");
    comment.replies.push({ userId: user?._id, name: byAI ? "Classgrid AI" : userName(user), text: body, at: new Date(), byAI });
    await doc.save();
    return comment;
}

export async function setResolved(doc, commentId, resolved = true) {
    const comment = doc.comments.find((c) => c.id === String(commentId));
    if (!comment) throw new Error("That comment was not found.");
    comment.resolved = !!resolved;
    await doc.save();
    return comment;
}

// A first "# Title" line already shows the title, so it isn't added twice
const startsWithTitle = (md) => /^\s*#\s+\S/.test(String(md || ""));

export async function exportDocx(doc) {
    const { makeOfficeFile } = await import("./office-files.service.js");
    const file = await makeOfficeFile({
        type: "word",
        file_name: doc.title,
        word: { title: startsWithTitle(doc.markdown) ? undefined : doc.title, content: doc.markdown || " " },
    });
    return { buffer: file.buffer, fileName: file.fileName, mime: file.mime };
}

const escapeHtml = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Markdown -> clean HTML page (scripts and odd tags removed) for the PDF
export async function docHtml(doc) {
    const { marked } = await import("marked");
    const sanitizeHtml = (await import("sanitize-html")).default;
    const body = sanitizeHtml(marked.parse(doc.markdown || "", { gfm: true }), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "del", "input"]),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ["src", "alt", "title"], input: ["type", "checked", "disabled"], td: ["align"], th: ["align"] },
        allowedSchemes: ["http", "https", "mailto"],
        allowedSchemesByTag: { img: ["https", "data"] },
    });
    const title = startsWithTitle(doc.markdown) ? "" : `<h1>${escapeHtml(doc.title)}</h1>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title><style>
body { font-family: Arial, 'Noto Sans Devanagari', 'Noto Color Emoji', sans-serif; color: #1f2328; font-size: 12pt; line-height: 1.55; margin: 0; }
h1, h2, h3, h4 { color: #111; line-height: 1.25; margin: 1.2em 0 0.5em; }
h1 { font-size: 22pt; } h2 { font-size: 17pt; } h3 { font-size: 14pt; }
p, ul, ol, table, pre, blockquote { margin: 0 0 0.8em; }
table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
th, td { border: 1px solid #d0d7de; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #f3f4f6; }
code { font-family: Consolas, monospace; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 10pt; }
pre { background: #f3f4f6; padding: 10px; border-radius: 6px; white-space: pre-wrap; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #d0d7de; padding-left: 12px; color: #555; }
img { max-width: 100%; }
a { color: #0969da; }
</style></head><body>${title}${body}</body></html>`;
}

export async function exportPdf(doc) {
    const puppeteer = (await import("puppeteer")).default;
    const html = await docHtml(doc);
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    try {
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(false);
        await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
        const buffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" } });
        return { buffer: Buffer.from(buffer), fileName: `${fileBase(doc.title)}.pdf`, mime: "application/pdf" };
    } finally {
        await browser.close().catch(() => {});
    }
}
