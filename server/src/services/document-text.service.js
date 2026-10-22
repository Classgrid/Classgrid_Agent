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
// Text from uploaded documents for the AI's parse_document tool. The file type is taken from the file's own
// bytes (not its link): PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx / .xls), CSV and plain text.
// Office files are zip archives; they are opened with the zip reader bundled in the "xlsx" package.
import XLSX from "xlsx";

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export class DocumentReadError extends Error {}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodeXmlEntities(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
        if (e[0] === "#") {
            const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : m;
        }
        return ENTITIES[e.toLowerCase()] ?? m;
    });
}

function tidy(text) {
    return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function openZip(buffer) {
    try {
        return XLSX.CFB.read(buffer, { type: "buffer" });
    } catch {
        throw new DocumentReadError("The file looks like an Office document but could not be opened (it may be damaged).");
    }
}

function zipPaths(zip) {
    // Entry paths without the container's root folder, e.g. "ppt/slides/slide1.xml"
    return zip.FullPaths.map((p) => p.replace(/^[^/]*\//, ""));
}

function readZipEntry(zip, path) {
    const entry = XLSX.CFB.find(zip, `/${path}`); // paths are found from the container root
    if (!entry || !entry.content) return null;
    return Buffer.from(entry.content).toString("utf8");
}

// PowerPoint: the text of each slide in order ("Slide 1", "Slide 2", ...) and its speaker notes.
function pptxText(zip, paths) {
    const slides = paths
        .map((p) => /^ppt\/slides\/slide(\d+)\.xml$/.exec(p))
        .filter(Boolean)
        .sort((a, b) => Number(a[1]) - Number(b[1]));
    const drawingText = (xml) =>
        tidy(decodeXmlEntities(xml
            .replace(/<a:br\s*\/>/g, "\n")
            .replace(/<\/a:p>/g, "\n")
            .replace(/<a:t>([\s\S]*?)<\/a:t>|<[^>]+>/g, (m, t) => (t !== undefined ? t : ""))));
    const parts = [];
    for (const [, num] of slides) {
        const body = drawingText(readZipEntry(zip, `ppt/slides/slide${num}.xml`) || "");
        const rels = readZipEntry(zip, `ppt/slides/_rels/slide${num}.xml.rels`) || "";
        const notesTarget = /Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/.exec(rels)?.[1];
        const notes = notesTarget
            ? drawingText(readZipEntry(zip, `ppt/notesSlides/${notesTarget}`) || "").replace(/^\d+$/m, "").trim()
            : "";
        parts.push(`--- Slide ${num} ---\n${body || "(no text on this slide)"}${notes ? `\nSpeaker notes: ${notes}` : ""}`);
    }
    return { kind: "PowerPoint presentation", text: parts.join("\n\n"), detail: `${slides.length} slides` };
}

// Word: paragraphs in order; table cells separated by " | ", one table row per line.
function docxText(zip) {
    const xml = readZipEntry(zip, "word/document.xml") || "";
    const text = decodeXmlEntities(xml
        .replace(/<w:(instrText|delText)[^>]*>[\s\S]*?<\/w:\1>/g, "")
        // paragraphs inside a table cell stay on the cell's row
        .replace(/<w:tc[\s>][\s\S]*?<\/w:tc>/g, (cell) => cell.replace(/<\/w:p>/g, " "))
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:br[^>]*\/>/g, "\n")
        .replace(/<\/w:tc>/g, " | ")
        .replace(/<\/w:tr>/g, "\n")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<[^>]+>/g, (m, t) => (t !== undefined ? t : "")));
    return { kind: "Word document", text: tidy(text.replace(/ \| \n/g, "\n")) };
}

// Excel / CSV: every sheet as comma-separated rows, with its name.
function workbookText(buffer, kind) {
    let wb;
    try {
        wb = XLSX.read(buffer, { type: "buffer" });
    } catch {
        throw new DocumentReadError(`The ${kind} could not be opened (it may be damaged or password-protected).`);
    }
    const parts = wb.SheetNames.map((name) => {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false }).trim();
        return `--- Sheet "${name}" ---\n${csv || "(empty sheet)"}`;
    });
    return { kind, text: parts.join("\n\n"), detail: `${wb.SheetNames.length} sheet${wb.SheetNames.length === 1 ? "" : "s"}` };
}

async function pdfText(buffer) {
    // The package index runs a self-test (reads test/data/*.pdf) when loaded with import(); the lib file is the parser itself
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    let data;
    try {
        data = await pdfParse(buffer);
    } catch (err) {
        throw new DocumentReadError(`The PDF could not be read: ${err.message}`);
    }
    const text = String(data.text || "").trim();
    if (text.length <= 50) {
        throw new DocumentReadError("This PDF seems to be scanned and contains no extractable text. Use the analyze_image tool if you need to read it via vision AI.");
    }
    return { kind: "PDF", text: tidy(text), detail: `${data.numpages} pages` };
}

function looksLikeText(buffer) {
    const sample = buffer.subarray(0, 4096);
    return !sample.includes(0);
}

/**
 * Reads a document's text. Returns { kind, text, detail? }; throws DocumentReadError with a message
 * meant for the AI (and the user) when the file can't be read.
 */
export async function extractDocumentText(buffer, { fileName = "", contentType = "" } = {}) {
    if (!buffer || buffer.length === 0) throw new DocumentReadError("The file is empty.");
    if (buffer.length > MAX_DOCUMENT_BYTES) throw new DocumentReadError("The file is larger than 25 MB, which is too big to read here. Read it in the Sandbox instead.");

    const head = buffer.subarray(0, 8);
    const name = fileName.toLowerCase();

    if (head.subarray(0, 5).toString("latin1") === "%PDF-") return pdfText(buffer);

    // Zip-based Office files (.docx, .pptx, .xlsx and their macro/template variants)
    if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
        const zip = openZip(buffer);
        const paths = zipPaths(zip);
        if (paths.some((p) => p.startsWith("ppt/"))) return pptxText(zip, paths);
        if (paths.some((p) => p === "word/document.xml")) return docxText(zip);
        if (paths.some((p) => p.startsWith("xl/"))) return workbookText(buffer, "Excel workbook");
        throw new DocumentReadError("This is a zip file, not a document. Unzip it in the Sandbox to read the files inside.");
    }

    // Older binary Office files (.xls / .doc / .ppt)
    if (head.readUInt32BE(0) === 0xd0cf11e0) {
        let names = [];
        try { names = XLSX.CFB.read(buffer, { type: "buffer" }).FullPaths.map((p) => p.toLowerCase()); } catch { /* not readable */ }
        if (names.some((p) => p.endsWith("/worddocument"))) {
            throw new DocumentReadError("This is an old Word file (.doc). Please save it as .docx and upload it again, or read it in the Sandbox.");
        }
        if (names.some((p) => p.endsWith("/powerpoint document"))) {
            throw new DocumentReadError("This is an old PowerPoint file (.ppt). Please save it as .pptx and upload it again, or read it in the Sandbox.");
        }
        return workbookText(buffer, "Excel workbook");
    }

    if (/\.(csv|tsv)(\?|$)/.test(name) || /text\/(csv|tab-separated-values)/.test(contentType)) {
        return workbookText(buffer, "CSV file");
    }

    if (looksLikeText(buffer)) {
        return { kind: "text file", text: tidy(buffer.toString("utf8").replace(/^\uFEFF/, "")) };
    }

    if (/^(\x89PNG|\xFF\xD8\xFF|GIF8|RIFF)/.test(head.toString("latin1"))) {
        throw new DocumentReadError("This is an image, not a document. Use the analyze_image tool for images.");
    }
    throw new DocumentReadError("This file type can't be read as a document. Supported: PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx, .xls), CSV and text files.");
}

// Images are read by the vision tools, not here
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif|ico|tiff?)$/i;

/**
 * Reads the text of every document attached to a message, all at once, so a model that can't open
 * files itself (DeepSeek etc.) gets the contents with the message instead of calling parse_document
 * file by file. Pictures inside the files (e.g. screenshots in a PDF) have no text and are not included.
 * Returns "" when nothing could be read.
 */
export async function readAttachedDocuments(fileUrls, { maxFiles = 10, perFileChars = 40000, totalChars = 120000, timeoutMs = 15000 } = {}) {
    const urls = (Array.isArray(fileUrls) ? fileUrls : [])
        .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u) && !IMAGE_EXT.test(u.split(/[?#]/)[0]))
        .slice(0, maxFiles);
    if (urls.length === 0) return "";

    const parts = await Promise.all(urls.map(async (url) => {
        const name = decodeURIComponent(url.split(/[?#]/)[0].split("/").pop() || "file").replace(/^\d{10,}-/, "");
        try {
            const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(timeoutMs) });
            if (!res.ok) return null;
            if (Number(res.headers.get("content-length")) > MAX_DOCUMENT_BYTES) return null;
            const buffer = Buffer.from(await res.arrayBuffer());
            const doc = await extractDocumentText(buffer, { fileName: name, contentType: res.headers.get("content-type") || "" });
            if (!doc.text) return `--- ${name} (${doc.kind}): no text in this file (it may be only pictures) ---`;
            const cut = doc.text.length > perFileChars;
            return `--- ${name} (${doc.kind}${doc.detail ? `, ${doc.detail}` : ""}) ---\n${doc.text.slice(0, perFileChars)}${cut ? `\n[cut here: the file is longer; call parse_document with this file's link to read the rest]` : ""}`;
        } catch (err) {
            // e.g. a PDF that is only pictures: say so, so the AI knows without trying the file itself
            if (err instanceof DocumentReadError) return `--- ${name}: ${err.message} ---`;
            return null; // not reachable (or too slow): the AI can still use its tools on the link
        }
    }));

    let text = parts.filter(Boolean).join("\n\n");
    if (!text) return "";
    if (text.length > totalChars) text = text.slice(0, totalChars) + "\n[cut here: the files are longer; call parse_document on a file's link to read the rest]";
    return text;
}
