// edit_pdf: merge, split, pick, delete, rotate, watermark, number pages and fill forms in PDF files.
// Downloading and uploading is done by the caller; editPdf only works on file bytes.
import dns from "node:dns/promises";
import net from "node:net";
import {
    PDFDocument, StandardFonts, rgb, degrees, EncryptedPDFError,
    PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFButton, PDFSignature,
} from "pdf-lib";
import { safeFileName } from "./office-files.service.js";

export const PDF_ACTIONS = ["merge", "split", "extract_pages", "delete_pages", "rotate", "watermark", "fill_form", "list_form_fields", "add_page_numbers"];
export const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_SPLIT_FILES = 50;
const MAX_MERGE_FILES = 20;

// ---------------------------------------------------------------- Download

function isBlockedIp(ip) {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split(".").map(Number);
        return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
    }
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isBlockedIp(v6.slice(7));
    return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || /^fe[89ab]/.test(v6);
}

async function checkUrl(raw) {
    let url;
    try { url = new URL(String(raw)); } catch { throw new Error(`"${raw}" is not a valid link.`); }
    if (url.protocol !== "https:") throw new Error(`The PDF link must start with https:// (${url.href}).`);
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error("This link points to a private address, so it can't be opened.");
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
    if (!addrs.length) throw new Error(`Couldn't find the website ${host}.`);
    if (addrs.some((a) => isBlockedIp(a.address))) throw new Error("This link points to a private address, so it can't be opened.");
    return url;
}

// Only public https links, max 50 MB, 30 seconds
export async function downloadPdf(raw) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30000);
    try {
        let href = String(raw);
        for (let hops = 0; ; hops++) {
            await checkUrl(href);
            const res = await fetch(href, { redirect: "manual", signal: ac.signal });
            if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
                if (hops >= 5) throw new Error("The link redirects too many times.");
                href = new URL(res.headers.get("location"), href).href;
                continue;
            }
            if (!res.ok) throw new Error(`Couldn't download the PDF (error ${res.status}): ${href}`);
            if (Number(res.headers.get("content-length")) > MAX_PDF_BYTES) throw new Error("The PDF is bigger than 50 MB.");
            const chunks = [];
            let size = 0;
            for await (const chunk of res.body) {
                size += chunk.length;
                if (size > MAX_PDF_BYTES) { ac.abort(); throw new Error("The PDF is bigger than 50 MB."); }
                chunks.push(chunk);
            }
            const last = new URL(href).pathname.split("/").pop() || "";
            let name;
            try { name = decodeURIComponent(last); } catch { name = last; }
            name = name || "document.pdf";
            return { buffer: Buffer.concat(chunks), name };
        }
    } catch (e) {
        if (e.name === "AbortError") throw new Error("Downloading the PDF took too long.");
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

// ---------------------------------------------------------------- Helpers

export async function loadPdf(buffer, name = "the file") {
    const head = Buffer.from(buffer || []).subarray(0, 1024).toString("latin1");
    if (!head.includes("%PDF")) throw new Error(`${name} is not a PDF file.`);
    try {
        const doc = await PDFDocument.load(buffer);
        // Broken files can load but fail on first use
        if (!doc.getPages().length) throw new Error("no pages");
        return doc;
    } catch (e) {
        if (e instanceof EncryptedPDFError || /encrypted/i.test(e?.message || "")) {
            throw new Error(`${name} is locked with a password. Remove the password first, then try again.`);
        }
        throw new Error(`${name} looks damaged, so it can't be opened.`);
    }
}

// "1-3,5,8-" -> [[0,1,2],[4],[7..last]] (0-based). Empty -> null.
export function parsePageRanges(spec, count) {
    const text = String(spec ?? "").trim();
    if (!text || /^all$/i.test(text)) return null;
    const groups = [];
    for (const part of text.split(/[,;]+/).map((p) => p.trim()).filter(Boolean)) {
        const m = part.match(/^(\d+)?\s*(?:-|–|to)\s*(\d+)?$/i) || part.match(/^(\d+)$/);
        if (!m || (!m[1] && !m[2])) throw new Error(`"${part}" is not a page range. Use something like "1-3,5,8-".`);
        const single = !/[-–]|to/i.test(part);
        const from = m[1] ? Number(m[1]) : 1;
        const to = single ? from : m[2] ? Number(m[2]) : count;
        for (const p of [from, to]) {
            if (p < 1 || p > count) throw new Error(`Page ${p} doesn't exist. This PDF has ${count} page${count === 1 ? "" : "s"}.`);
        }
        const step = from <= to ? 1 : -1;
        const group = [];
        for (let p = from; p !== to + step; p += step) group.push(p - 1);
        groups.push(group);
    }
    return groups;
}

function rangeLabel(group) {
    if (group.length === 1) return `${group[0] + 1}`;
    return `${group[0] + 1}-${group[group.length - 1] + 1}`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

async function copyInto(src, indices) {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));
    return out;
}

const save = async (doc) => Buffer.from(await doc.save());

// A point given as seen on screen (from the bottom-left of the shown page) -> real page position
function toPage(page, vx, vy) {
    const { x, y, width: w, height: h } = page.getMediaBox();
    const r = ((page.getRotation().angle % 360) + 360) % 360;
    if (r === 90) return { x: x + w - vy, y: y + vx };
    if (r === 180) return { x: x + w - vx, y: y + h - vy };
    if (r === 270) return { x: x + vy, y: y + h - vx };
    return { x: x + vx, y: y + vy };
}

function shownSize(page) {
    const { width, height } = page.getMediaBox();
    const r = ((page.getRotation().angle % 360) + 360) % 360;
    return r === 90 || r === 270 ? { w: height, h: width, r } : { w: width, h: height, r };
}

function checkLetters(font, text, what) {
    try { font.encodeText(text); } catch {
        throw new Error(`The ${what} can only use English letters, numbers and common signs for now.`);
    }
}

// ---------------------------------------------------------------- Actions

async function merge(inputs) {
    if (inputs.length < 2) throw new Error("To merge, send 2 or more PDF links in urls, in the order you want.");
    if (inputs.length > MAX_MERGE_FILES) throw new Error(`You can merge up to ${MAX_MERGE_FILES} PDFs at a time.`);
    const out = await PDFDocument.create();
    for (const input of inputs) {
        const src = await loadPdf(input.buffer, input.name);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
    }
    return { doc: out, summary: `PDF, ${plural(out.getPageCount(), "page")}, made from ${inputs.length} files` };
}

async function split(src, pages) {
    const count = src.getPageCount();
    const groups = parsePageRanges(pages, count) || src.getPageIndices().map((i) => [i]);
    if (groups.length > MAX_SPLIT_FILES) throw new Error(`That would make ${groups.length} files; the most is ${MAX_SPLIT_FILES}. Send page ranges in pages, like "1-10,11-20".`);
    const parts = [];
    for (const group of groups) parts.push({ doc: await copyInto(src, group), label: rangeLabel(group), pages: group.length });
    return parts;
}

async function extractPages(src, pages) {
    const groups = parsePageRanges(pages, src.getPageCount());
    if (!groups) throw new Error('Say which pages to keep in pages, like "1-3,5".');
    const doc = await copyInto(src, groups.flat());
    return { doc, summary: `PDF, ${plural(doc.getPageCount(), "page")}: pages ${pages} of the original` };
}

async function deletePages(src, pages) {
    const count = src.getPageCount();
    const groups = parsePageRanges(pages, count);
    if (!groups) throw new Error('Say which pages to delete in pages, like "2,4-6".');
    const drop = new Set(groups.flat());
    const keep = src.getPageIndices().filter((i) => !drop.has(i));
    if (!keep.length) throw new Error("That would delete every page. At least one page has to stay.");
    const doc = await copyInto(src, keep);
    return { doc, summary: `PDF, ${plural(keep.length, "page")} left after deleting ${plural(drop.size, "page")}` };
}

function rotate(src, pages, angle) {
    const a = ((Number(angle) % 360) + 360) % 360;
    if (![90, 180, 270].includes(a)) throw new Error("angle must be 90, 180 or 270.");
    const groups = parsePageRanges(pages, src.getPageCount());
    const which = groups ? [...new Set(groups.flat())] : src.getPageIndices();
    for (const i of which) {
        const page = src.getPage(i);
        page.setRotation(degrees((page.getRotation().angle + a) % 360));
    }
    return { doc: src, summary: `PDF, ${plural(which.length, "page")} turned ${a}°` };
}

async function watermark(src, pages, text, opacity) {
    const words = String(text ?? "").trim();
    if (!words) throw new Error("Send the watermark words in text.");
    const font = await src.embedFont(StandardFonts.HelveticaBold);
    checkLetters(font, words, "watermark text");
    const op = Number.isFinite(Number(opacity)) && opacity !== null && opacity !== "" ? Math.min(1, Math.max(0.02, Number(opacity))) : 0.15;
    const groups = parsePageRanges(pages, src.getPageCount());
    const which = groups ? [...new Set(groups.flat())] : src.getPageIndices();
    for (const i of which) {
        const page = src.getPage(i);
        const { w, h, r } = shownSize(page);
        const angle = Math.atan2(h, w);
        const size = Math.max(10, Math.min(150, (Math.hypot(w, h) * 0.7) / font.widthOfTextAtSize(words, 1)));
        const tw = font.widthOfTextAtSize(words, size);
        const th = font.heightAtSize(size, { descender: false });
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const vx = w / 2 - (tw / 2) * cos + (th / 2) * sin;
        const vy = h / 2 - (tw / 2) * sin - (th / 2) * cos;
        const at = toPage(page, vx, vy);
        page.drawText(words, { x: at.x, y: at.y, size, font, color: rgb(0.5, 0.5, 0.5), opacity: op, rotate: degrees(r + (angle * 180) / Math.PI) });
    }
    return { doc: src, summary: `PDF, watermark "${words}" on ${plural(which.length, "page")}` };
}

async function addPageNumbers(src, pages) {
    const font = await src.embedFont(StandardFonts.Helvetica);
    const total = src.getPageCount();
    const groups = parsePageRanges(pages, total);
    const which = groups ? [...new Set(groups.flat())] : src.getPageIndices();
    const size = 10;
    for (const i of which) {
        const page = src.getPage(i);
        const label = `Page ${i + 1} of ${total}`;
        const { w, r } = shownSize(page);
        const tw = font.widthOfTextAtSize(label, size);
        const at = toPage(page, w / 2 - tw / 2, 20);
        page.drawText(label, { x: at.x, y: at.y, size, font, color: rgb(0.3, 0.3, 0.3), rotate: degrees(r) });
    }
    return { doc: src, summary: `PDF, page numbers on ${plural(which.length, "page")}` };
}

function fieldInfo(field) {
    const name = field.getName();
    if (field instanceof PDFTextField) return { name, type: "text", value: field.getText() ?? "" };
    if (field instanceof PDFCheckBox) return { name, type: "checkbox", value: field.isChecked() };
    if (field instanceof PDFRadioGroup) return { name, type: "radio", value: field.getSelected() ?? "", options: field.getOptions() };
    if (field instanceof PDFDropdown) return { name, type: "dropdown", value: field.getSelected().join(", "), options: field.getOptions() };
    if (field instanceof PDFOptionList) return { name, type: "list", value: field.getSelected().join(", "), options: field.getOptions() };
    if (field instanceof PDFSignature) return { name, type: "signature", value: "" };
    if (field instanceof PDFButton) return { name, type: "button", value: "" };
    return { name, type: "other", value: "" };
}

export function listFormFields(src, name = "the PDF") {
    const fields = src.getForm().getFields().map(fieldInfo);
    if (!fields.length) return `${name} has no form fields to fill.`;
    const lines = fields.map((f) => {
        const value = f.type === "checkbox" ? (f.value ? "checked" : "not checked") : f.value === "" ? "(empty)" : `"${f.value}"`;
        const options = f.options?.length ? `, options: ${f.options.join(" | ")}` : "";
        return `- ${f.name} (${f.type}${options}): ${value}`;
    });
    return `${name} has ${plural(fields.length, "form field")}:\n${lines.join("\n")}\nUse these exact names in fields to fill them with edit_pdf (fill_form).`;
}

const isYes = (v) => v === true || /^(true|yes|y|on|1|checked|x|✓)$/i.test(String(v ?? "").trim());

function fillForm(src, values, flatten) {
    if (!values || typeof values !== "object" || Array.isArray(values) || !Object.keys(values).length) {
        throw new Error("Send the values in fields, like { \"Name\": \"Asha\", \"Agree\": true }. Use list_form_fields first to see the names.");
    }
    const form = src.getForm();
    const all = form.getFields();
    if (!all.length) throw new Error("This PDF has no form fields to fill.");
    const byLower = new Map(all.map((f) => [f.getName().toLowerCase(), f]));
    const filled = [], problems = [];
    for (const [key, value] of Object.entries(values)) {
        const field = form.getFieldMaybe(key) || byLower.get(String(key).toLowerCase());
        if (!field) { problems.push(`no field named "${key}"`); continue; }
        try {
            if (field instanceof PDFTextField) field.setText(value === null || value === undefined ? "" : String(value));
            else if (field instanceof PDFCheckBox) { if (isYes(value)) field.check(); else field.uncheck(); }
            else if (field instanceof PDFRadioGroup || field instanceof PDFDropdown || field instanceof PDFOptionList) {
                const options = field.getOptions();
                const wanted = (Array.isArray(value) ? value : [value]).map((v) => {
                    const s = String(v ?? "");
                    return options.find((o) => o === s) || options.find((o) => o.toLowerCase() === s.toLowerCase()) || s;
                });
                const editable = field instanceof PDFDropdown && field.isEditable();
                const bad = wanted.filter((v) => !options.includes(v));
                if (bad.length && !editable) { problems.push(`"${bad[0]}" is not an option for ${field.getName()} (options: ${options.join(", ")})`); continue; }
                field.select(field instanceof PDFRadioGroup ? wanted[0] : wanted.length === 1 ? wanted[0] : wanted);
            } else { problems.push(`${field.getName()} is a ${fieldInfo(field).type} and can't be filled`); continue; }
            filled.push(field.getName());
        } catch (e) {
            problems.push(`${field.getName()}: ${/maxLength|max length/i.test(e.message) ? "the text is too long for this box" : "couldn't be filled"}`);
        }
    }
    if (!filled.length) {
        throw new Error(`No field was filled (${problems.join("; ")}). The fields are: ${all.map((f) => f.getName()).join(", ")}.`);
    }
    if (flatten) form.flatten();
    const summary = `PDF, filled ${filled.length} of ${Object.keys(values).length} fields${flatten ? ", locked so they can't be changed" : ""}`;
    return { doc: src, summary, note: problems.length ? `Not filled: ${problems.join("; ")}.` : "" };
}

// ---------------------------------------------------------------- One entry point

const SUFFIX = {
    merge: "merged", split: "part", extract_pages: "pages", delete_pages: "edited", rotate: "rotated",
    watermark: "watermarked", fill_form: "filled", add_page_numbers: "numbered",
};

// inputs: [{ buffer, name }] in the same order as urls.
// Returns { text } for list_form_fields, otherwise { files: [{ buffer, fileName, mime, label? }], summary, note }.
export async function editPdf(args = {}, inputs = []) {
    const action = String(args.action || "").toLowerCase();
    if (!PDF_ACTIONS.includes(action)) throw new Error(`action must be one of: ${PDF_ACTIONS.join(", ")}.`);
    if (!inputs.length) throw new Error("Send the PDF link in urls.");
    const first = inputs[0];
    const firstName = String(first.name || "document.pdf");
    const base = safeFileName(args.file_name, `${safeFileName(firstName, "document")}-${SUFFIX[action] || "edited"}`);
    const file = (buffer, name = base, label) => ({ buffer, fileName: `${name}.pdf`, mime: "application/pdf", label });

    if (action === "merge") {
        const { doc, summary } = await merge(inputs);
        return { files: [file(await save(doc))], summary, note: "" };
    }

    const src = await loadPdf(first.buffer, firstName);
    if (action === "list_form_fields") return { text: listFormFields(src, firstName) };

    if (action === "split") {
        const parts = await split(src, args.pages);
        const files = [];
        for (const p of parts) files.push(file(await save(p.doc), `${base}-pages-${p.label}`, `${plural(p.pages, "page")}: ${p.label}`));
        return { files, summary: `${plural(files.length, "PDF file")} from ${plural(src.getPageCount(), "page")}`, note: "" };
    }

    let result;
    if (action === "extract_pages") result = await extractPages(src, args.pages);
    else if (action === "delete_pages") result = await deletePages(src, args.pages);
    else if (action === "rotate") result = rotate(src, args.pages, args.angle);
    else if (action === "watermark") result = await watermark(src, args.pages, args.text, args.opacity);
    else if (action === "add_page_numbers") result = await addPageNumbers(src, args.pages);
    else result = fillForm(src, args.fields, !!args.flatten);

    let buffer;
    try {
        buffer = await save(result.doc);
    } catch (e) {
        if (/WinAnsi|cannot encode/i.test(e.message)) throw new Error("Some of the text uses letters this PDF can't show yet. Only English letters, numbers and common signs work for now.");
        throw new Error(`Couldn't save the PDF: ${e.message}`);
    }
    return { files: [file(buffer)], summary: result.summary, note: result.note || "" };
}
