// make_office_file: builds real Word (.docx), Excel (.xlsx) and PowerPoint (.pptx) files from simple content.
// Uploading is done by the caller; this file only makes the file bytes.
import { marked } from "marked";
import {
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
    ExternalHyperlink, LevelFormat, AlignmentType, BorderStyle, ShadingType,
} from "docx";
import ExcelJS from "exceljs";
import PptxGenJS from "pptxgenjs";

export const OFFICE_TYPES = {
    word: { ext: "docx", label: "Word", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fallback: "document" },
    excel: { ext: "xlsx", label: "Excel", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fallback: "spreadsheet" },
    powerpoint: { ext: "pptx", label: "PowerPoint", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", fallback: "presentation" },
};

// "Monthly report.docx" -> "Monthly-report"
export function safeFileName(name, fallback) {
    const clean = String(name || "")
        .replace(/\.(docx?|xlsx?|pptx?|pdf|csv)$/i, "")
        .replace(/[^\p{L}\p{N} _-]+/gu, " ")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 80);
    return clean || fallback;
}

// ---------------------------------------------------------------- Word

const NUMBERED = "cg-numbered";
const BULLETS = "cg-bullets";

function inlineRuns(tokens, style = {}) {
    const out = [];
    for (const t of tokens || []) {
        switch (t.type) {
            case "strong": out.push(...inlineRuns(t.tokens, { ...style, bold: true })); break;
            case "em": out.push(...inlineRuns(t.tokens, { ...style, italics: true })); break;
            case "del": out.push(...inlineRuns(t.tokens, { ...style, strike: true })); break;
            case "codespan": out.push(new TextRun({ ...style, text: decode(t.text), font: "Consolas", shading: { type: ShadingType.CLEAR, fill: "F2F2F2", color: "auto" } })); break;
            case "br": out.push(new TextRun({ ...style, text: "", break: 1 })); break;
            case "link": {
                const kids = inlineRuns(t.tokens, { ...style, style: "Hyperlink" });
                if (/^https?:\/\//i.test(t.href || "")) out.push(new ExternalHyperlink({ link: t.href, children: kids }));
                else out.push(...inlineRuns(t.tokens, style));
                break;
            }
            case "image": out.push(new TextRun({ ...style, text: t.text || t.href || "" })); break;
            default:
                if (t.tokens?.length) out.push(...inlineRuns(t.tokens, style));
                else out.push(new TextRun({ ...style, text: decode(t.text ?? t.raw ?? "") }));
        }
    }
    return out;
}

// marked keeps HTML entities like &amp; in text
function decode(s) {
    return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function wordTable(t, stats) {
    stats.tables++;
    const cols = t.header.length || 1;
    const cell = (c, header) => new TableCell({
        children: [new Paragraph({ children: inlineRuns(c.tokens, header ? { bold: true } : {}) })],
        shading: header ? { type: ShadingType.CLEAR, fill: "E7E6E6", color: "auto" } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
    });
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({ tableHeader: true, children: t.header.map((c) => cell(c, true)) }),
            ...t.rows.map((r) => new TableRow({ children: r.map((c) => cell(c, false)) })),
        ],
    });
}

function wordBlocks(tokens, stats, ctx = { indent: 0 }) {
    const out = [];
    const para = (opts) => { stats.paragraphs++; return new Paragraph(opts); };
    const indent = ctx.indent ? { left: ctx.indent } : undefined;
    for (const t of tokens || []) {
        switch (t.type) {
            case "heading": {
                const level = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6][t.depth - 1];
                out.push(para({ heading: level, children: inlineRuns(t.tokens) }));
                break;
            }
            case "paragraph":
            case "text":
                out.push(para({ children: inlineRuns(t.tokens || [{ type: "text", text: t.text }], ctx.italics ? { italics: true } : {}), indent, spacing: { after: 120 } }));
                break;
            case "list":
                out.push(...wordList(t, stats, 0));
                break;
            case "table":
                out.push(wordTable(t, stats));
                out.push(para({ children: [] }));
                break;
            case "code": {
                const lines = String(t.text || "").split("\n");
                lines.forEach((line, i) => out.push(para({
                    children: [new TextRun({ text: line || " ", font: "Consolas", size: 20 })],
                    shading: { type: ShadingType.CLEAR, fill: "F2F2F2", color: "auto" },
                    spacing: { after: i === lines.length - 1 ? 160 : 0 },
                    indent,
                })));
                break;
            }
            case "blockquote":
                out.push(...wordBlocks(t.tokens, stats, { indent: (ctx.indent || 0) + 567, italics: true }));
                break;
            case "hr":
                out.push(para({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF", space: 1 } } }));
                break;
            case "html":
                if (String(t.text).trim()) out.push(para({ children: [new TextRun(String(t.text).replace(/<[^>]+>/g, "").trim())], indent }));
                break;
            default:
                break;
        }
    }
    return out;
}

function wordList(list, stats, level) {
    const out = [];
    const ref = list.ordered ? NUMBERED : BULLETS;
    // Each numbered list starts again from 1
    const instance = list.ordered ? ++stats.listInstance : 0;
    for (const item of list.items) {
        let first = true;
        for (const t of item.tokens || []) {
            if (t.type === "list") { out.push(...wordList(t, stats, Math.min(level + 1, 2))); continue; }
            if (t.type === "text" || t.type === "paragraph") {
                const prefix = item.task ? [new TextRun(item.checked ? "☑ " : "☐ ")] : [];
                stats.paragraphs++;
                out.push(new Paragraph({
                    children: [...prefix, ...inlineRuns(t.tokens || [{ type: "text", text: t.text }])],
                    numbering: first ? { reference: ref, level, instance } : undefined,
                    indent: first ? undefined : { left: 720 * (level + 1) },
                }));
                first = false;
            } else {
                out.push(...wordBlocks([t], stats, { indent: 720 * (level + 1) }));
            }
        }
    }
    return out;
}

export async function buildWordFile({ title, content } = {}) {
    const md = String(content || "").trim();
    if (!md && !title) throw new Error("word.content is empty. Send the document text as markdown.");
    const stats = { paragraphs: 0, tables: 0, listInstance: 0 };
    const children = [];
    if (title) { stats.paragraphs++; children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(String(title))] })); }
    children.push(...wordBlocks(marked.lexer(md), stats));
    if (!children.length) children.push(new Paragraph(""));

    const bulletChars = ["•", "◦", "▪"];
    const doc = new Document({
        creator: "Classgrid AI",
        title: title ? String(title) : undefined,
        styles: {
            default: {
                document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { line: 276 } } },
                title: { run: { font: "Calibri Light", size: 52, color: "1F2937" }, paragraph: { spacing: { after: 240 } } },
                heading1: { run: { font: "Calibri Light", size: 36, color: "1F3864", bold: false }, paragraph: { spacing: { before: 360, after: 120 } } },
                heading2: { run: { font: "Calibri Light", size: 30, color: "2F5496" }, paragraph: { spacing: { before: 240, after: 100 } } },
                heading3: { run: { font: "Calibri", size: 26, color: "2F5496", bold: true }, paragraph: { spacing: { before: 200, after: 80 } } },
            },
        },
        numbering: {
            config: [
                {
                    reference: NUMBERED,
                    levels: [0, 1, 2].map((level) => ({
                        level,
                        format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][level],
                        text: `%${level + 1}.`,
                        alignment: AlignmentType.START,
                        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
                    })),
                },
                {
                    reference: BULLETS,
                    levels: [0, 1, 2].map((level) => ({
                        level,
                        format: LevelFormat.BULLET,
                        text: bulletChars[level],
                        alignment: AlignmentType.START,
                        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
                    })),
                },
            ],
        },
        sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }],
    });
    const buffer = await Packer.toBuffer(doc);
    const words = md.split(/\s+/).filter(Boolean).length;
    return { buffer, stats: { paragraphs: stats.paragraphs, tables: stats.tables, words, pages: Math.max(1, Math.ceil(words / 400)) } };
}

// ---------------------------------------------------------------- Excel

export function cellValue(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number" || typeof v === "boolean") return v;
    if (typeof v === "object") return JSON.stringify(v);
    const s = String(v);
    if (s.startsWith("=") && s.length > 1) return { formula: s.slice(1) };
    // "1200" or "12.5" sent as text becomes a number; "007" or long ids stay text
    if (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(s.trim())) return Number(s.trim());
    return s;
}

export function sheetName(name, i, used) {
    let base = String(name || `Sheet${i + 1}`).replace(/[\[\]:*?/\\]/g, " ").replace(/^'+|'+$/g, "").trim().slice(0, 31) || `Sheet${i + 1}`;
    let n = base, k = 2;
    while (used.has(n.toLowerCase())) n = `${base.slice(0, 28)} ${k++}`;
    used.add(n.toLowerCase());
    return n;
}

export async function buildExcelFile({ sheets } = {}) {
    if (!Array.isArray(sheets) || !sheets.length) throw new Error("excel.sheets is empty. Send at least one sheet with rows.");
    const wb = new ExcelJS.Workbook();
    wb.creator = "Classgrid AI";
    wb.created = new Date();
    wb.calcProperties.fullCalcOnLoad = true;
    const used = new Set();
    let totalRows = 0;
    sheets.forEach((sh, i) => {
        const ws = wb.addWorksheet(sheetName(sh?.name, i, used));
        const rows = Array.isArray(sh?.rows) ? sh.rows.map((r) => (Array.isArray(r) ? r : [r])) : [];
        rows.forEach((r) => ws.addRow(r.map(cellValue)));
        totalRows += rows.length;
        const colCount = rows.reduce((m, r) => Math.max(m, r.length), 0);
        if (rows.length) {
            const header = ws.getRow(1);
            header.font = { bold: true };
            header.eachCell((c) => {
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E6E6" } };
                c.border = { bottom: { style: "thin", color: { argb: "FF999999" } } };
                c.alignment = { vertical: "middle" };
            });
            ws.views = [{ state: "frozen", ySplit: 1 }];
            if (rows.length > 1 && colCount > 0) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colCount } };
        }
        for (let c = 0; c < colCount; c++) {
            const given = Array.isArray(sh?.column_widths) ? Number(sh.column_widths[c]) : NaN;
            let width = given;
            if (!(width > 0)) {
                const longest = rows.reduce((m, r) => {
                    const v = r[c];
                    const len = v === null || v === undefined ? 0 : String(v).startsWith("=") ? 10 : String(v).length;
                    return Math.max(m, len);
                }, 0);
                width = Math.min(60, Math.max(10, longest + 2));
            }
            ws.getColumn(c + 1).width = width;
        }
    });
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { buffer, stats: { sheets: sheets.length, rows: totalRows } };
}

// ---------------------------------------------------------------- PowerPoint

const THEMES = {
    light: { bg: "FFFFFF", title: "111827", body: "374151", muted: "6B7280", accent: "2563EB", band: "F3F4F6" },
    dark: { bg: "0F172A", title: "F8FAFC", body: "CBD5E1", muted: "94A3B8", accent: "60A5FA", band: "1E293B" },
};

// Only public https links; local and private addresses are skipped
function okImageUrl(u) {
    try {
        const url = new URL(String(u));
        if (url.protocol !== "https:") return false;
        const h = url.hostname.toLowerCase();
        if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
        if (/^(10|127|0)\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.includes(":")) return false;
        return true;
    } catch { return false; }
}

function imageSize(buf) {
    try {
        if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: "png" };
        if (buf[0] === 0x47 && buf[1] === 0x49) return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8), type: "gif" };
        if (buf[0] === 0xff && buf[1] === 0xd8) {
            let i = 2;
            while (i < buf.length) {
                if (buf[i] !== 0xff) { i++; continue; }
                const marker = buf[i + 1];
                if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5), type: "jpeg" };
                i += 2 + buf.readUInt16BE(i + 2);
            }
        }
    } catch { /* not a picture we know */ }
    return null;
}

async function fetchImage(u) {
    if (!okImageUrl(u)) return null;
    try {
        const res = await fetch(u, { signal: AbortSignal.timeout(10000), redirect: "follow" });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length || buf.length > 10 * 1024 * 1024) return null;
        const size = imageSize(buf);
        if (!size || !size.w || !size.h) return null;
        return { data: `image/${size.type};base64,${buf.toString("base64")}`, w: size.w, h: size.h };
    } catch { return null; }
}

// "**Big** idea" -> bold and normal pieces
function bulletRuns(text, base) {
    return String(text).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) => {
        const bold = /^\*\*[^*]+\*\*$/.test(part);
        return { text: bold ? part.slice(2, -2) : part, options: { ...base, bold: bold || undefined } };
    });
}

export async function buildPowerPointFile({ title, slides, theme } = {}, { fileTitle } = {}) {
    if (!Array.isArray(slides) || !slides.length) throw new Error("powerpoint.slides is empty. Send at least one slide.");
    const c = THEMES[theme === "dark" ? "dark" : "light"];
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
    pptx.author = "Classgrid AI";
    pptx.title = String(title || fileTitle || "Presentation");
    const font = "Calibri";
    const W = 13.33, H = 7.5;
    let skipped = 0;

    // Title slide
    const deckTitle = String(title || fileTitle || "Presentation");
    const cover = pptx.addSlide();
    cover.background = { color: c.bg };
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.25, h: H, fill: { color: c.accent }, line: { color: c.accent } });
    cover.addText(deckTitle, { x: 0.9, y: 2.3, w: W - 1.8, h: 1.8, fontFace: font, fontSize: 44, bold: true, color: c.title, valign: "bottom", fit: "shrink" });
    cover.addShape(pptx.ShapeType.rect, { x: 0.9, y: 4.3, w: 1.2, h: 0.08, fill: { color: c.accent }, line: { color: c.accent } });

    for (let i = 0; i < slides.length; i++) {
        const s = slides[i] || {};
        const slide = pptx.addSlide();
        slide.background = { color: c.bg };
        slide.addText(String(s.title || ""), { x: 0.6, y: 0.4, w: W - 1.2, h: 0.9, fontFace: font, fontSize: 30, bold: true, color: c.title, valign: "middle", fit: "shrink" });
        slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.35, w: 0.9, h: 0.06, fill: { color: c.accent }, line: { color: c.accent } });

        const img = s.image_url ? await fetchImage(s.image_url) : null;
        if (s.image_url && !img) skipped++;
        const bullets = (Array.isArray(s.bullets) ? s.bullets : []).filter((b) => String(b ?? "").trim());
        const textW = img ? (bullets.length ? 6.6 : 0) : W - 1.2;

        if (bullets.length) {
            const longest = bullets.reduce((m, b) => Math.max(m, String(b).length), 0);
            let size = bullets.length <= 4 ? 24 : bullets.length <= 6 ? 20 : bullets.length <= 8 ? 18 : 16;
            if (longest > 120) size = Math.min(size, 18);
            const runs = [];
            for (const raw of bullets) {
                const str = String(raw);
                const level = Math.min(2, Math.floor((str.match(/^\s*/)[0].length) / 2));
                const clean = str.trim().replace(/^([-*•]|\d+[.)])\s+/, "");
                const pieces = bulletRuns(clean, { fontSize: level ? size - 2 : size, color: c.body });
                pieces[0].options = { ...pieces[0].options, bullet: { indent: 18 }, indentLevel: level, paraSpaceAfter: 8 };
                pieces[pieces.length - 1].options = { ...pieces[pieces.length - 1].options, breakLine: true };
                runs.push(...pieces);
            }
            slide.addText(runs, { x: 0.6, y: 1.7, w: textW, h: H - 2.5, fontFace: font, valign: "top", fit: "shrink" });
        }

        if (img) {
            const boxX = bullets.length ? 7.5 : 0.6, boxY = 1.7, boxW = bullets.length ? W - 8.1 : W - 1.2, boxH = H - 2.5;
            const scale = Math.min(boxW / img.w, boxH / img.h);
            const w = img.w * scale, h = img.h * scale;
            slide.addImage({ data: img.data, x: boxX + (boxW - w) / 2, y: boxY + (boxH - h) / 2, w, h });
        }

        slide.addText(String(i + 2), { x: W - 1.1, y: H - 0.55, w: 0.6, h: 0.35, fontFace: font, fontSize: 11, color: c.muted, align: "right" });
        if (s.notes) slide.addNotes(String(s.notes));
    }

    const buffer = await pptx.write({ outputType: "nodebuffer" });
    return { buffer: Buffer.from(buffer), stats: { slides: slides.length + 1, skippedImages: skipped } };
}

// ---------------------------------------------------------------- One entry point

export async function makeOfficeFile(args = {}) {
    const type = String(args.type || "").toLowerCase();
    const info = OFFICE_TYPES[type];
    if (!info) throw new Error('type must be "word", "excel" or "powerpoint".');
    const base = safeFileName(args.file_name, info.fallback);
    const fileName = `${base}.${info.ext}`;
    let built, summary;
    if (type === "word") {
        built = await buildWordFile(args.word || {});
        const { pages, paragraphs, tables } = built.stats;
        summary = `Word, about ${pages} page${pages === 1 ? "" : "s"}, ${paragraphs} paragraphs${tables ? `, ${tables} table${tables === 1 ? "" : "s"}` : ""}`;
    } else if (type === "excel") {
        built = await buildExcelFile(args.excel || {});
        const { sheets, rows } = built.stats;
        summary = `Excel, ${sheets} sheet${sheets === 1 ? "" : "s"}, ${rows} rows`;
    } else {
        built = await buildPowerPointFile(args.powerpoint || {}, { fileTitle: String(args.file_name || "").replace(/\.pptx?$/i, "").trim() });
        const { slides, skippedImages } = built.stats;
        summary = `PowerPoint, ${slides} slides${skippedImages ? `, ${skippedImages} picture${skippedImages === 1 ? "" : "s"} skipped because the link didn't load` : ""}`;
    }
    return { buffer: built.buffer, fileName, mime: info.mime, ext: info.ext, summary, stats: built.stats };
}
