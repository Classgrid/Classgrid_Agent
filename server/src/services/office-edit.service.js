// edit_office_file: changes an existing Word (.docx) file (find and replace, tracked changes, add text at the end),
// Excel (.xlsx) file (cells, formulas, sheets, rows and columns, formatting) or PowerPoint (.pptx) file (text, slides).
// Downloading and uploading is done by the caller; these functions only work on file bytes.
// Word and PowerPoint work on the raw XML so everything we don't touch stays exactly as it was.
import { randomUUID, randomInt } from "crypto";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import { marked } from "marked";
import { OFFICE_TYPES, safeFileName, cellValue, sheetName } from "./office-files.service.js";

const AUTHOR = "Classgrid AI";
const MAX_EDITS = 200;
const OBJ = "￼"; // stands for things text can't match across (pictures, links, other changes)

// ---------------------------------------------------------------- XML helpers

function esc(s) {
    return String(s)
        // Letters XML doesn't allow
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function unesc(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
        const k = e.toLowerCase();
        if (k === "amp") return "&";
        if (k === "lt") return "<";
        if (k === "gt") return ">";
        if (k === "quot") return '"';
        if (k === "apos") return "'";
        const code = k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
        try { return String.fromCodePoint(code); } catch { return m; }
    });
}

// Whole element starting at xml[start] ("<w:r ...>...</w:r>"), counting nested ones with the same name
function takeElement(xml, start) {
    const head = xml.slice(start).match(/^<([\w.-]+:[\w.-]+|[\w.-]+)(?=[\s/>])[^>]*?(\/?)>/);
    if (!head) return null;
    const name = head[1];
    let end = start + head[0].length;
    if (head[2] === "/") return { name, xml: head[0], end };
    const re = new RegExp(`<(/?)${name.replace(/[.]/g, "\\.")}(?=[\\s/>])[^>]*?(/?)>`, "g");
    re.lastIndex = end;
    let depth = 1, m;
    while ((m = re.exec(xml))) {
        if (m[1]) depth--;
        else if (!m[2]) depth++;
        if (!depth) { end = m.index + m[0].length; return { name, xml: xml.slice(start, end), end }; }
    }
    return null;
}

// What each thing inside a run counts as in the text
function childChar(name) {
    if (name === "w:tab") return "\t";
    if (name === "w:br" || name === "w:cr") return "\n";
    if (name === "w:noBreakHyphen") return "-";
    if (["w:sym", "w:drawing", "w:pict", "w:object", "w:fldChar", "w:footnoteReference", "w:endnoteReference",
        "w:commentReference", "mc:AlternateContent", "w:ptab", "w:ruby"].includes(name)) return OBJ;
    return "";
}

function parseRun(xml) {
    const open = xml.match(/^<w:r\b[^>]*?\/?>/)[0];
    const run = { kind: "run", xml, open: open.endsWith("/>") ? open.slice(0, -2) + ">" : open, rPr: "", children: [], dirty: false };
    if (open.endsWith("/>")) return run;
    const inner = xml.slice(open.length, xml.length - "</w:r>".length);
    let i = 0;
    while (i < inner.length) {
        const lt = inner.indexOf("<", i);
        if (lt < 0) break;
        const el = takeElement(inner, lt);
        // Something we can't read: keep the whole run as it is and never match inside it
        if (!el) return { ...run, rPr: "", children: [{ kind: "x", ch: OBJ, xml: inner }] };
        if (el.name === "w:rPr") run.rPr = el.xml;
        else if (el.name === "w:t") {
            const body = el.xml.endsWith("/>") ? "" : el.xml.replace(/^<w:t\b[^>]*>/, "").replace(/<\/w:t>$/, "");
            run.children.push({ kind: "t", text: unesc(body), xml: el.xml });
        } else run.children.push({ kind: "x", ch: childChar(el.name), xml: el.xml, name: el.name });
        i = el.end;
    }
    return run;
}

// Things between runs: bookmarks and spell marks are fine, but links, fields and earlier changes are walls
function isWall(xml) {
    const rest = xml.replace(/<w:pPr\b[\s\S]*?<\/w:pPr>/, "").replace(/<[^>]*\/>/g, "");
    return /</.test(rest);
}

function parseParagraph(xml) {
    const open = xml.match(/^<w:p\b[^>]*>/)[0];
    const inner = xml.slice(open.length, xml.length - "</w:p>".length);
    const items = [];
    const runStart = /<w:r(?=[\s>/])/g;
    let i = 0, m;
    while ((m = runStart.exec(inner))) {
        const el = takeElement(inner, m.index);
        if (!el) break;
        if (m.index > i) items.push({ kind: "raw", xml: inner.slice(i, m.index) });
        items.push(parseRun(el.xml));
        i = el.end;
        runStart.lastIndex = el.end;
    }
    if (i < inner.length) items.push({ kind: "raw", xml: inner.slice(i) });
    for (const it of items) if (it.kind === "raw") it.wall = isWall(it.xml);
    return { open, items };
}

// Plain text of the paragraph, and where each letter lives
function textOf(p) {
    let text = "";
    const map = [];
    p.items.forEach((it, ii) => {
        if (it.kind === "raw") {
            if (it.wall) { text += OBJ; map.push(null); }
            return;
        }
        it.children.forEach((c, ci) => {
            c.gs = text.length;
            const s = c.kind === "t" ? c.text : c.ch;
            for (let k = 0; k < s.length; k++) map.push(c.ch === OBJ ? null : { ii, ci, k });
            text += s;
        });
    });
    return { text, map };
}

function childXml(c) {
    if (c.kind === "t") return c.xml || `<w:t xml:space="preserve">${esc(c.text)}</w:t>`;
    return c.xml;
}

function runXml(r) {
    if (!r.dirty) return r.xml;
    return `${r.open}${r.rPr}${r.children.map(childXml).join("")}</w:r>`;
}

function paragraphXml(p) {
    return `${p.open}${p.items.map((it) => (it.kind === "raw" ? it.xml : runXml(it))).join("")}</w:p>`;
}

// New text -> run children (new lines and tabs become real breaks and tabs)
function textChildren(s) {
    const out = [];
    for (const part of String(s).split(/(\r?\n|\t)/)) {
        if (!part) continue;
        if (part === "\t") out.push({ kind: "x", ch: "\t", xml: "<w:tab/>", name: "w:tab" });
        else if (/^\r?\n$/.test(part)) out.push({ kind: "x", ch: "\n", xml: "<w:br/>", name: "w:br" });
        else out.push({ kind: "t", text: part });
    }
    return out;
}

// Split a run's children into the parts before, inside and after the text range [s, e)
function cutRun(run, s, e) {
    const pre = [], mid = [], post = [];
    for (const c of run.children) {
        const len = c.kind === "t" ? c.text.length : c.ch.length;
        const gs = c.gs, ge = c.gs + len;
        if (ge <= s && !(len === 0 && gs === s)) { pre.push(c); continue; }
        if (gs >= e && !(len === 0 && gs < e)) { post.push(c); continue; }
        if (c.kind === "t") {
            const a = Math.max(0, s - gs), b = Math.min(len, e - gs);
            if (a > 0) pre.push({ kind: "t", text: c.text.slice(0, a) });
            if (b > a) mid.push({ kind: "t", text: c.text.slice(a, b) });
            if (b < len) post.push({ kind: "t", text: c.text.slice(b) });
        } else mid.push(c);
    }
    return { pre, mid, post };
}

const newRun = (from, children) => ({ kind: "run", open: from.open, rPr: from.rPr, children, dirty: true });

// Replace text [s, e) keeping the look of the run where it starts
function replacePlain(p, map, s, e, replace) {
    const first = map[s].ii, last = map[e - 1].ii;
    const out = [];
    p.items.forEach((it, ii) => {
        if (ii < first || ii > last || it.kind !== "run") { out.push(it); return; }
        const { pre, post } = cutRun(it, s, e);
        const children = ii === first ? [...pre, ...textChildren(replace), ...post] : [...pre, ...post];
        if (!children.length) return;
        out.push(newRun(it, children));
    });
    p.items = out;
}

// Same, but as a Word tracked change: old text in <w:del>, new text in <w:ins>
function replaceTracked(p, map, s, e, replace, rev) {
    const first = map[s].ii, last = map[e - 1].ii;
    const before = [], inside = [], after = [];
    p.items.forEach((it, ii) => {
        if (ii < first) { before.push(it); return; }
        if (ii > last) { after.push(it); return; }
        if (it.kind !== "run") { inside.push(it.xml); return; }
        const { pre, mid, post } = cutRun(it, s, e);
        if (pre.length) before.push(newRun(it, pre));
        if (mid.length) {
            const del = mid.map((c) => (c.kind === "t" ? `<w:delText xml:space="preserve">${esc(c.text)}</w:delText>` : c.xml)).join("");
            inside.push(`${it.open}${it.rPr}${del}</w:r>`);
        }
        if (post.length) after.push(newRun(it, post));
    });
    const startRun = p.items[first];
    let xml = `<w:del ${rev()}>${inside.join("")}</w:del>`;
    if (replace) xml += `<w:ins ${rev()}>${startRun.open}${startRun.rPr}${textChildren(replace).map(childXml).join("")}</w:r></w:ins>`;
    p.items = [...before, { kind: "raw", xml, wall: true }, ...after];
}

// "it's" also finds "it’s"; a space also finds a no-break space
function findPattern(find) {
    let src = "";
    for (const ch of find) {
        if (/['‘’]/.test(ch)) src += "['‘’]";
        else if (/["“”]/.test(ch)) src += '["“”]';
        else if (ch === " " || ch === " ") src += "[ \\u00A0]";
        else src += ch.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&");
    }
    return new RegExp(src, "g");
}

// Innermost paragraphs only (a text box inside a paragraph has its own paragraphs)
const PARA_RE = /<w:p(?:\s[^>]*)?(?<!\/)>(?:(?!<w:p(?:\s[^>]*)?(?<!\/)>)[\s\S])*?<\/w:p>/g;

// One find/replace on one XML part. Returns the new XML and how many were changed.
function replaceInPart(xml, edit, state) {
    let count = 0;
    const out = xml.replace(PARA_RE, (para) => {
        if (state.stop) return para;
        // Quick check on the plain text before the real work
        const quick = unesc((para.match(/<w:t\b[^>]*>[^<]*<\/w:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, "")).join(""));
        edit.re.lastIndex = 0;
        if (!edit.re.test(quick)) return para;
        const p = parseParagraph(para);
        let from = 0, changed = false;
        for (;;) {
            const { text, map } = textOf(p);
            edit.re.lastIndex = from;
            const m = edit.re.exec(text);
            if (!m || !m[0].length) break;
            const s = m.index, e = s + m[0].length;
            if (map.slice(s, e).some((x) => !x)) { from = s + 1; continue; }
            if (state.track) {
                replaceTracked(p, map, s, e, edit.replace, state.rev);
                from = s + 1;
            } else {
                replacePlain(p, map, s, e, edit.replace);
                from = s + edit.replace.length;
            }
            changed = true;
            count++;
            if (!edit.all) { state.stop = true; break; }
        }
        return changed ? paragraphXml(p) : para;
    });
    return { xml: out, count };
}

// ---------------------------------------------------------------- Add text at the end

function headingStyles(stylesXml) {
    const ids = {};
    for (const m of String(stylesXml || "").matchAll(/<w:style\b[^>]*w:type="paragraph"[^>]*>[\s\S]*?<\/w:style>/g)) {
        const id = m[0].match(/w:styleId="([^"]+)"/)?.[1];
        const name = m[0].match(/<w:name w:val="([^"]+)"/)?.[1]?.toLowerCase();
        const level = name?.match(/^heading (\d)$/)?.[1];
        if (id && level) ids[level] = id;
    }
    return ids;
}

// marked keeps HTML entities like &amp; in text
function decode(s) {
    return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function rPrXml(st) {
    const parts = [];
    if (st.code) parts.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>');
    if (st.bold) parts.push("<w:b/><w:bCs/>");
    if (st.italics) parts.push("<w:i/><w:iCs/>");
    if (st.strike) parts.push("<w:strike/>");
    if (st.size) parts.push(`<w:sz w:val="${st.size}"/><w:szCs w:val="${st.size}"/>`);
    if (st.link) parts.push('<w:u w:val="single"/>');
    return parts.length ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
}

function textRun(text, st) {
    return `<w:r>${rPrXml(st)}${textChildren(text).map(childXml).join("")}</w:r>`;
}

function inlineXml(tokens, st = {}) {
    let out = "";
    for (const t of tokens || []) {
        switch (t.type) {
            case "strong": out += inlineXml(t.tokens, { ...st, bold: true }); break;
            case "em": out += inlineXml(t.tokens, { ...st, italics: true }); break;
            case "del": out += inlineXml(t.tokens, { ...st, strike: true }); break;
            case "codespan": out += textRun(decode(t.text), { ...st, code: true }); break;
            case "br": out += "<w:r><w:br/></w:r>"; break;
            case "link": out += inlineXml(t.tokens, { ...st, link: true }); break;
            default:
                if (t.tokens?.length) out += inlineXml(t.tokens, st);
                else out += textRun(decode(t.text ?? t.raw ?? ""), st);
        }
    }
    return out;
}

function appendXml(md, ctx) {
    const paras = [];
    // Each new paragraph is marked as added when tracking changes
    const para = (runs, pPr = "") => {
        const mark = ctx.track ? `<w:rPr><w:ins ${ctx.rev()}/></w:rPr>` : "";
        const props = pPr || mark ? `<w:pPr>${pPr}${mark}</w:pPr>` : "";
        const body = ctx.track && runs ? `<w:ins ${ctx.rev()}>${runs}</w:ins>` : runs;
        paras.push(`<w:p>${props}${body}</w:p>`);
    };
    const list = (l, level) => {
        let n = Number(l.start) || 1;
        for (const item of l.items) {
            let first = true;
            for (const t of item.tokens || []) {
                if (t.type === "list") { list(t, Math.min(level + 1, 4)); continue; }
                const runs = t.type === "text" || t.type === "paragraph"
                    ? inlineXml(t.tokens || [{ type: "text", text: t.text }])
                    : textRun(decode(t.text ?? t.raw ?? ""), {});
                const left = 720 * (level + 1);
                if (first) {
                    const sign = l.ordered ? `${n++}.` : ["•", "◦", "▪"][level % 3];
                    para(`${textRun(sign, {})}<w:r><w:tab/></w:r>${runs}`, `<w:ind w:left="${left}" w:hanging="360"/>`);
                } else para(runs, `<w:ind w:left="${left}"/>`);
                first = false;
            }
        }
    };
    const blocks = (tokens, extra = {}) => {
        for (const t of tokens || []) {
            switch (t.type) {
                case "heading": {
                    const level = Math.min(t.depth, 3);
                    const id = ctx.headings[t.depth] || ctx.headings[level];
                    if (id) para(inlineXml(t.tokens), `<w:pStyle w:val="${esc(id)}"/>`);
                    else para(inlineXml(t.tokens, { bold: true, size: [32, 28, 24][level - 1] }));
                    ctx.count++;
                    break;
                }
                case "paragraph":
                case "text":
                    para(inlineXml(t.tokens || [{ type: "text", text: t.text }], extra), extra.indent ? `<w:ind w:left="${extra.indent}"/>` : "");
                    ctx.count++;
                    break;
                case "list":
                    list(t, 0);
                    ctx.count += t.items.length;
                    break;
                case "blockquote":
                    blocks(t.tokens, { italics: true, indent: 567 });
                    break;
                case "code":
                    for (const line of String(t.text || "").split("\n")) para(textRun(line || " ", { code: true }));
                    ctx.count++;
                    break;
                case "table": {
                    const row = (cells, bold) => para(cells.map((c, i) => (i ? "<w:r><w:tab/></w:r>" : "") + inlineXml(c.tokens, bold ? { bold: true } : {})).join(""));
                    row(t.header, true);
                    t.rows.forEach((r) => row(r, false));
                    ctx.count += t.rows.length + 1;
                    break;
                }
                case "hr":
                    para("", '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr>');
                    break;
                case "html":
                    if (String(t.text).trim()) { para(textRun(String(t.text).replace(/<[^>]+>/g, "").trim(), {})); ctx.count++; }
                    break;
                default:
                    break;
            }
        }
    };
    blocks(marked.lexer(String(md)));
    return paras.join("");
}

// Put new paragraphs at the end of the body, before the last section settings
function addToBody(xml, extra) {
    const close = xml.lastIndexOf("</w:body>");
    if (close < 0) throw new Error("This Word file looks damaged (no document body).");
    const tail = xml.slice(0, close);
    const sect = tail.lastIndexOf("<w:sectPr");
    if (sect >= 0) {
        const el = takeElement(tail, sect);
        if (el && !tail.slice(el.end).trim()) {
            return xml.slice(0, sect) + extra + xml.slice(sect);
        }
    }
    return xml.slice(0, close) + extra + xml.slice(close);
}

// ---------------------------------------------------------------- One entry point

// input: { buffer, name }. Returns { buffer, fileName, mime, summary, note }.
export async function editWordFile(args = {}, input = {}) {
    const name = String(input.name || "document.docx");
    const buf = Buffer.from(input.buffer || []);
    if (buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
        throw new Error(`${name} is an old Word file (.doc). Open it in Word and save it as .docx, then try again.`);
    }
    let zip;
    try { zip = await JSZip.loadAsync(buf); } catch { throw new Error(`${name} is not a Word (.docx) file.`); }
    const main = zip.file("word/document.xml");
    if (!main) throw new Error(`${name} is not a Word (.docx) file.`);

    let list = args.edits;
    if (typeof list === "string") { try { list = JSON.parse(list); } catch { throw new Error("edits must be a list of { find, replace }."); } }
    const edits = (Array.isArray(list) ? list : list ? [list] : [])
        .map((e) => ({ find: String(e?.find ?? "").replace(new RegExp(OBJ, "g"), ""), replace: String(e?.replace ?? ""), all: !!e?.all }))
        .filter((e) => e.find);
    if (edits.length > MAX_EDITS) throw new Error(`You can send up to ${MAX_EDITS} changes at a time.`);
    const append = String(args.append ?? "").trim();
    if (!edits.length && !append) throw new Error("Send edits (text to find and replace) or append (text to add at the end).");
    const track = args.track_changes === true || args.track_changes === "true";

    // Parts to change: the body first, then headers and footers
    const partNames = ["word/document.xml", ...Object.keys(zip.files).filter((n) => /^word\/(header|footer)\d*\.xml$/i.test(n)).sort()];
    const parts = {};
    for (const n of partNames) parts[n] = await zip.file(n).async("string");

    // Change ids must not clash with ones already in the file
    let nextId = 0;
    for (const x of Object.values(parts)) for (const m of x.matchAll(/w:id="(\d+)"/g)) nextId = Math.max(nextId, Number(m[1]) + 1);
    const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const rev = () => `w:id="${nextId++}" w:author="${AUTHOR}" w:date="${date}"`;

    const changed = new Set();
    const missing = [];
    let total = 0;
    for (const edit of edits) {
        edit.re = findPattern(edit.find);
        const state = { track, rev, stop: false };
        let count = 0;
        for (const n of partNames) {
            if (state.stop) break;
            const r = replaceInPart(parts[n], edit, state);
            if (r.count) { parts[n] = r.xml; changed.add(n); count += r.count; }
        }
        if (!count) missing.push(edit.find);
        total += count;
    }

    let added = 0;
    if (append) {
        const styles = zip.file("word/styles.xml") ? await zip.file("word/styles.xml").async("string") : "";
        const ctx = { track, rev, headings: headingStyles(styles), count: 0 };
        const extra = appendXml(append, ctx);
        if (extra) {
            parts["word/document.xml"] = addToBody(parts["word/document.xml"], extra);
            changed.add("word/document.xml");
            added = ctx.count;
        }
    }

    if (!total && !added) {
        throw new Error(`None of the texts were found in ${name}, so nothing was changed: ${missing.map((f) => `"${f.slice(0, 80)}"`).join(", ")}. Read the file with parse_document and copy the exact words.`);
    }

    for (const n of changed) zip.file(n, parts[n]);
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });

    const info = OFFICE_TYPES.word;
    const base = safeFileName(args.file_name, `${safeFileName(name, "document")}-edited`);
    const bits = [];
    if (total) bits.push(`${total} change${total === 1 ? "" : "s"}${track ? " shown as tracked changes" : ""}`);
    if (added) bits.push(`added ${added} paragraph${added === 1 ? "" : "s"} at the end`);
    const note = missing.length ? `Not changed: ${missing.map((f) => `"${f.slice(0, 80)}"`).join(", ")} (not found in the file).` : "";
    return { buffer, fileName: `${base}.${info.ext}`, mime: info.mime, ext: info.ext, summary: `Word, ${bits.join(", ")}`, note };
}

// ---------------------------------------------------------------- Shared by Excel and PowerPoint

// A list sent as a list, as one object, or as JSON text
function toList(v, what) {
    if (typeof v === "string") {
        if (!v.trim()) return [];
        try { v = JSON.parse(v); } catch { throw new Error(`${what} must be a list.`); }
    }
    return Array.isArray(v) ? v : v ? [v] : [];
}

function findEdits(args) {
    const edits = toList(args.edits, "edits")
        .map((e) => ({ find: String(e?.find ?? "").replace(new RegExp(OBJ, "g"), ""), replace: String(e?.replace ?? ""), all: !!e?.all }))
        .filter((e) => e.find);
    for (const e of edits) e.re = findPattern(e.find);
    return edits;
}

// Find and replace over a row of text pieces, keeping the look of each piece.
// A piece with wall: true (a line break, a field) is never matched across.
function replaceInPieces(pieces, edit, state) {
    let count = 0, from = 0;
    for (;;) {
        let text = "";
        const owner = [], starts = [];
        pieces.forEach((p, i) => {
            starts.push(text.length);
            for (let k = 0; k < p.text.length; k++) owner.push(p.wall ? null : i);
            text += p.text;
        });
        edit.re.lastIndex = from;
        const m = edit.re.exec(text);
        if (!m || !m[0].length) break;
        const s = m.index, e = s + m[0].length;
        if (owner.slice(s, e).some((x) => x === null)) { from = s + 1; continue; }
        const first = owner[s], last = owner[e - 1];
        const a = s - starts[first], b = e - starts[last];
        if (first === last) {
            pieces[first].text = pieces[first].text.slice(0, a) + edit.replace + pieces[first].text.slice(b);
        } else {
            pieces[first].text = pieces[first].text.slice(0, a) + edit.replace;
            for (let i = first + 1; i < last; i++) if (pieces[i].text) { pieces[i].text = ""; pieces[i].dirty = true; }
            pieces[last].text = pieces[last].text.slice(b);
            pieces[last].dirty = true;
        }
        pieces[first].dirty = true;
        from = s + edit.replace.length;
        count++;
        if (!edit.all) { state.stop = true; break; }
    }
    return count;
}

function notFound(name, missing) {
    return new Error(`None of the texts were found in ${name}, so nothing was changed: ${missing.map((f) => `"${f.slice(0, 80)}"`).join(", ")}. Read the file with parse_document and copy the exact words.`);
}

function missingNote(missing) {
    return missing.length ? `Not changed: ${missing.map((f) => `"${f.slice(0, 80)}"`).join(", ")} (not found in the file).` : "";
}

// "set 4 cells, added 2 rows" (long lists are cut short)
function doneText(done) {
    return done.length > 8 ? `${done.slice(0, 8).join(", ")} and ${done.length - 8} more changes` : done.join(", ");
}

// ---------------------------------------------------------------- Excel

const { ValueType } = ExcelJS;
const MAX_CELLS = 200000;

function colNumber(s) {
    let n = 0;
    for (const ch of String(s).toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
    return n;
}

function colName(n) {
    let s = "";
    while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
    return s;
}

// "C" or 3 -> 3
function toColumn(v, what) {
    const s = String(v ?? "").trim().replace(/\$/g, "");
    const n = /^\d+$/.test(s) ? Number(s) : /^[A-Za-z]{1,3}$/.test(s) ? colNumber(s) : 0;
    if (!(n >= 1 && n <= 16384)) throw new Error(`${what} must be a column letter like "C" (got "${v ?? ""}").`);
    return n;
}

function toRow(v, what) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 1048576) throw new Error(`${what} must be a row number like 5 (got "${v ?? ""}").`);
    return n;
}

function toCount(v) {
    const n = v === undefined || v === null || v === "" ? 1 : Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 100000) throw new Error(`count must be a number from 1 to 100000 (got "${v}").`);
    return n;
}

// "B2:D5", "B2", "B:D" (whole columns) or "2:4" (whole rows) -> { top, left, bottom, right }; null means to the end
function parseRange(s) {
    const t = String(s ?? "").replace(/\$/g, "").trim().toUpperCase();
    let m;
    if ((m = t.match(/^([A-Z]{1,3})(\d+)(?::([A-Z]{1,3})(\d+))?$/))) {
        const r1 = Number(m[2]), r2 = Number(m[4] || m[2]), c1 = colNumber(m[1]), c2 = colNumber(m[3] || m[1]);
        return { top: Math.min(r1, r2), bottom: Math.max(r1, r2), left: Math.min(c1, c2), right: Math.max(c1, c2) };
    }
    if ((m = t.match(/^([A-Z]{1,3}):([A-Z]{1,3})$/))) {
        const c1 = colNumber(m[1]), c2 = colNumber(m[2]);
        return { top: null, bottom: null, left: Math.min(c1, c2), right: Math.max(c1, c2) };
    }
    if ((m = t.match(/^(\d+):(\d+)$/))) {
        const r1 = Number(m[1]), r2 = Number(m[2]);
        return { top: Math.min(r1, r2), bottom: Math.max(r1, r2), left: null, right: null };
    }
    return null;
}

// values: a list of rows, one row, or one value
function toRows(v) {
    if (v === undefined || v === null) return [];
    if (typeof v === "string" && /^\s*\[/.test(v)) { try { v = JSON.parse(v); } catch { /* plain text */ } }
    if (!Array.isArray(v)) return [[v]];
    if (!v.some(Array.isArray)) return [v];
    return v.map((r) => (Array.isArray(r) ? r : [r]));
}

const COLORS = { yellow: "FFFF00", red: "FF0000", green: "00B050", blue: "0070C0", orange: "FFC000", gray: "D9D9D9", grey: "D9D9D9", white: "FFFFFF", black: "000000", "light green": "C6EFCE", "light red": "FFC7CE", "light yellow": "FFEB9C", "light blue": "DDEBF7" };

// "#FFFF00", "FFFF00" or "yellow" -> "FFFFFF00"; "none" -> ""
function toArgb(v) {
    const s = String(v).trim().toLowerCase();
    if (s === "none" || s === "") return "";
    const hex = (COLORS[s] || s.replace(/^#/, "")).toUpperCase();
    if (/^[0-9A-F]{6}$/.test(hex)) return `FF${hex}`;
    if (/^[0-9A-F]{8}$/.test(hex)) return hex;
    throw new Error(`fill_color must be a colour like "#FFFF00" (got "${v}").`);
}

// Where row/column n goes when rows/columns are added or removed. null = it was removed.
// op: { axis: "row" | "col", at, add } or { axis, at, del }
function moveIndex(n, op) {
    if (n < op.at) return n;
    if (op.add) return n + op.add;
    return n >= op.at + op.del ? n - op.del : null;
}

// Same for a span [a, b]; null when all of it was removed
function moveSpan(a, b, op) {
    if (op.add) return [moveIndex(a, op), moveIndex(b, op)];
    let na = moveIndex(a, op), nb = moveIndex(b, op);
    if (na === null) na = op.at;
    if (nb === null) nb = op.at - 1;
    return na > nb ? null : [na, nb];
}

// One reference without its sheet name: "A1", "$B$2:C9", "A:C" or "2:5". Gives "#REF!" when it was removed.
function moveRef(ref, op) {
    const ends = ref.split(":");
    const cells = ends.map((e) => e.match(/^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/));
    const isRow = op.axis === "row";
    let nums, put;
    if (cells.every(Boolean)) {
        nums = cells.map((c) => (isRow ? Number(c[4]) : colNumber(c[2])));
        put = (i, n) => (isRow ? `${cells[i][1]}${cells[i][2]}${cells[i][3]}${n}` : `${cells[i][1]}${colName(n)}${cells[i][3]}${cells[i][4]}`);
    } else if (ends.length === 2 && ends.every((e) => /^\$?[A-Za-z]{1,3}$/.test(e))) {
        if (isRow) return ref;
        nums = ends.map((e) => colNumber(e.replace("$", "")));
        put = (i, n) => `${ends[i].startsWith("$") ? "$" : ""}${colName(n)}`;
    } else if (ends.length === 2 && ends.every((e) => /^\$?\d+$/.test(e))) {
        if (!isRow) return ref;
        nums = ends.map((e) => Number(e.replace("$", "")));
        put = (i, n) => `${ends[i].startsWith("$") ? "$" : ""}${n}`;
    } else return ref;
    if (nums.length === 1) {
        const n = moveIndex(nums[0], op);
        return n === null ? "#REF!" : put(0, n);
    }
    const flip = nums[0] > nums[1];
    const span = moveSpan(Math.min(...nums), Math.max(...nums), op);
    if (!span) return "#REF!";
    const out = flip ? [span[1], span[0]] : span;
    return `${put(0, out[0])}:${put(1, out[1])}`;
}

// "A1:B2 D4" -> moved list, or null when nothing is left
function moveRefList(list, op) {
    const out = String(list || "").split(/\s+/).filter(Boolean).map((r) => moveRef(r, op)).filter((r) => r !== "#REF!");
    return out.length ? out.join(" ") : null;
}

// References inside a formula, with an optional sheet name in front ('My sheet'!A1:B2, Data!C:C, A1)
const REF_RE = /(?<![\w.$!'\]À-￿])((?:'(?:[^']|'')+'|[A-Za-z_À-￿][\w.À-￿]*)!)?(\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3}|\$?\d+:\$?\d+)(?![\w(!\[\]À-￿])/g;

// Calls change(sheet or null, ref, prefix) for each reference outside "text"; a returned string replaces it
function mapRefs(formula, change) {
    return String(formula).split(/("(?:[^"]|"")*")/).map((part, i) => (i % 2 ? part : part.replace(REF_RE, (all, prefix, ref) => {
        const sheet = prefix ? prefix.slice(0, -1).replace(/^'|'$/g, "").replace(/''/g, "'") : null;
        const out = change(sheet, ref, prefix || "");
        return out ?? all;
    }))).join("");
}

function quoteSheet(name) {
    const plain = /^[A-Za-z_À-￿][\w.À-￿]*$/.test(name) && !/^[A-Za-z]{1,3}\d+$/.test(name) && !/^R\d*C\d*$/i.test(name);
    return plain ? name : `'${name.replace(/'/g, "''")}'`;
}

function shiftFormula(formula, own, op) {
    return mapRefs(formula, (sheet, ref, prefix) => {
        if ((sheet ?? own).toLowerCase() !== op.sheet) return null;
        const moved = moveRef(ref, op);
        return moved === "#REF!" ? "#REF!" : prefix + moved;
    });
}

// Runs change(formula, sheetName) on every formula: cells, conditional formatting and data validation
function eachFormula(wb, change) {
    for (const ws of wb.worksheets) {
        ws.eachRow((row) => row.eachCell((cell) => {
            if (cell.type !== ValueType.Formula) return;
            const md = cell.model;
            if (!md.formula) return;
            const f = change(md.formula, ws.name);
            if (f !== md.formula) cell.model = { ...md, formula: f };
        }));
        for (const cf of ws.conditionalFormattings || []) {
            for (const rule of cf.rules || []) {
                if (Array.isArray(rule.formulae)) rule.formulae = rule.formulae.map((x) => (typeof x === "string" ? change(x, ws.name) : x));
            }
        }
        for (const dv of Object.values(ws.dataValidations?.model || {})) {
            if (Array.isArray(dv?.formulae)) dv.formulae = dv.formulae.map((x) => (typeof x === "string" ? change(x, ws.name) : x));
        }
    }
}

// Shared formulas (one formula filled down) point at their first cell; give every cell its own formula
// so cells can move without breaking them
function unshareFormulas(wb) {
    const later = [];
    for (const ws of wb.worksheets) {
        ws.eachRow((row) => row.eachCell((cell) => {
            if (cell.type !== ValueType.Formula) return;
            const md = cell.model;
            if (md.sharedFormula) {
                const { sharedFormula, ...rest } = md;
                later.push([cell, { ...rest, formula: cell.formula }]);
            } else if (md.shareType === "shared") {
                const { shareType, ref, ...rest } = md;
                later.push([cell, rest]);
            }
        }));
    }
    for (const [cell, md] of later) cell.model = md;
}

// Defined names (named ranges): change(range) gives the new range, or null to drop it
function changeNames(wb, change) {
    const model = wb.definedNames.model;
    wb.definedNames.model = model
        .map((d) => ({ ...d, ranges: d.ranges.map(change).filter(Boolean) }))
        .filter((d) => d.ranges.length);
}

// Moves every cell of the sheet for an added/removed row or column, with merges, validation,
// conditional formatting, filters, tables and pictures
function moveCells(ws, op) {
    const m = ws.model;
    const isRow = op.axis === "row";
    const pos = (address) => { const c = address.match(/^([A-Z]+)(\d+)$/); return { col: colNumber(c[1]), row: Number(c[2]) }; };
    const blank = (c, address) => ({ address, type: ValueType.Null, style: structuredClone(c.style || {}) });
    const rows = [];
    for (const r of m.rows) {
        const number = isRow ? moveIndex(r.number, op) : r.number;
        if (number === null) continue;
        const cells = [];
        for (const c of r.cells) {
            const p = pos(c.address);
            const col = isRow ? p.col : moveIndex(p.col, op);
            if (col === null) continue;
            const address = colName(col) + number;
            const cell = c.type === ValueType.Merge ? blank(c, address) : { ...c, address };
            if (typeof cell.ref === "string") {
                const ref = moveRef(cell.ref, op);
                cell.ref = ref === "#REF!" ? address : ref;
            }
            cells.push(cell);
        }
        rows.push({ ...r, number, cells });
    }
    // New rows and columns get the look of the one before them, like Excel does
    if (op.add && op.at > 1) {
        if (isRow) {
            const src = m.rows.find((r) => r.number === op.at - 1);
            for (let k = 0; src && k < op.add; k++) {
                const number = op.at + k;
                rows.push({ ...src, number, cells: src.cells.map((c) => blank(c, colName(pos(c.address).col) + number)) });
            }
        } else {
            for (const r of rows) {
                const src = r.cells.find((c) => pos(c.address).col === op.at - 1);
                if (!src || !Object.keys(src.style || {}).length) continue;
                for (let k = 0; k < op.add; k++) r.cells.push(blank(src, colName(op.at + k) + r.number));
            }
        }
    }
    m.rows = rows;

    if (!isRow && m.cols) {
        const cols = [];
        for (const d of m.cols) {
            const span = moveSpan(d.min, d.max, op);
            if (span) cols.push({ ...d, min: span[0], max: span[1] });
            if (op.add && op.at > 1 && d.max === op.at - 1) cols.push({ ...d, min: op.at, max: op.at + op.add - 1 });
        }
        m.cols = cols;
    }

    m.mergeCells = (m.merges || []).map((r) => moveRef(r, op)).filter((r) => r !== "#REF!" && r.includes(":") && r.split(":")[0] !== r.split(":")[1]);

    const dv = {};
    for (const [k, v] of Object.entries(m.dataValidations || {})) {
        const key = moveRefList(k, op);
        if (key) dv[key] = v;
    }
    m.dataValidations = dv;

    m.conditionalFormattings = (m.conditionalFormattings || [])
        .map((cf) => ({ ...cf, ref: moveRefList(cf.ref, op) }))
        .filter((cf) => cf.ref);

    if (typeof m.autoFilter === "string") m.autoFilter = moveRefList(m.autoFilter, op) || undefined;

    for (const t of m.tables || []) {
        for (const k of ["ref", "tableRef", "autoFilterRef"]) {
            if (typeof t[k] !== "string") continue;
            const ref = moveRef(t[k], op);
            if (ref !== "#REF!") t[k] = ref;
        }
    }

    // Pictures are placed by 0-based row and column
    for (const md of m.media || []) {
        for (const k of ["tl", "br"]) {
            const a = md.range?.[k];
            const key = isRow ? "nativeRow" : "nativeCol";
            if (!a || typeof a[key] !== "number") continue;
            const n = moveIndex(a[key] + 1, op);
            a[key] = (n === null ? op.at : n) - 1;
        }
    }

    ws._merges = {};
    ws.model = m;
}

// Add or remove rows or columns, fixing formulas everywhere that point at them
function changeRowsOrColumns(wb, ws, op, ctx) {
    ctx.unshare();
    op.sheet = ws.name.toLowerCase();
    eachFormula(wb, (f, own) => shiftFormula(f, own, op));
    moveCells(ws, op);
    // Named ranges are moved the same way (the library's own way splits a range that grows)
    changeNames(wb, (r) => {
        const moved = shiftFormula(r, "", op);
        return moved.includes("#REF!") ? null : moved;
    });
}

function getSheet(wb, name) {
    const sheets = wb.worksheets;
    if (name === undefined || name === null || String(name).trim() === "") {
        const ws = sheets.find((s) => s.state === "visible") || sheets[0];
        if (!ws) throw new Error("the file has no sheets.");
        return ws;
    }
    const want = String(name).trim().toLowerCase();
    const ws = sheets.find((s) => s.name.toLowerCase() === want);
    if (!ws) throw new Error(`there is no sheet named "${name}". Sheets: ${sheets.map((s) => s.name).join(", ")}.`);
    return ws;
}

// Last row that has something in it
function lastUsedRow(ws) {
    let last = 0;
    ws.eachRow((row, n) => { if (row.hasValues) last = n; });
    return last;
}

function writeRows(ws, top, left, rows) {
    let n = 0;
    rows.forEach((row, i) => row.forEach((v, j) => { ws.getCell(top + i, left + j).value = cellValue(v); n++; }));
    return n;
}

function runSheetEdit(wb, e, action, ctx) {
    const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    switch (action) {
        case "set_cells": {
            const ws = getSheet(wb, e.sheet);
            const start = String(e.cell ?? "A1").replace(/\$/g, "").trim().toUpperCase();
            const m = start.match(/^([A-Z]{1,3})(\d+)$/);
            if (!m) throw new Error(`cell must look like "B2" (got "${e.cell}").`);
            const rows = toRows(e.values ?? e.rows ?? e.value);
            if (!rows.length) throw new Error("send values (the cell values to write).");
            if (rows.reduce((s, r) => s + r.length, 0) > MAX_CELLS) throw new Error(`you can set up to ${MAX_CELLS} cells at a time.`);
            const n = writeRows(ws, Number(m[2]), colNumber(m[1]), rows);
            ctx.done.push(`set ${plural(n, "cell")} from ${start} on ${ws.name}`);
            return;
        }
        case "append_rows": {
            const ws = getSheet(wb, e.sheet);
            const rows = toRows(e.values ?? e.rows);
            if (!rows.length) throw new Error("send values (the rows to add).");
            const last = lastUsedRow(ws);
            writeRows(ws, last + 1, 1, rows);
            // New rows look like the row above them (number formats, borders), unless that is the header row
            if (last > 1) {
                const above = ws.getRow(last);
                rows.forEach((row, i) => above.eachCell({ includeEmpty: true }, (src, c) => {
                    const cell = ws.getCell(last + 1 + i, c);
                    if (!Object.keys(cell.style || {}).length && Object.keys(src.style || {}).length) cell.style = structuredClone(src.style);
                }));
            }
            ctx.done.push(`added ${plural(rows.length, "row")} at the end of ${ws.name}`);
            return;
        }
        case "insert_rows":
        case "delete_rows": {
            const ws = getSheet(wb, e.sheet);
            const at = toRow(e.row ?? e.at, "row");
            const rows = action === "insert_rows" ? toRows(e.values ?? e.rows) : [];
            const count = Math.max(toCount(e.count), rows.length);
            changeRowsOrColumns(wb, ws, action === "insert_rows" ? { axis: "row", at, add: count } : { axis: "row", at, del: count }, ctx);
            if (rows.length) writeRows(ws, at, 1, rows);
            ctx.done.push(action === "insert_rows" ? `added ${plural(count, "row")} at row ${at} on ${ws.name}` : `deleted ${plural(count, "row")} from row ${at} on ${ws.name}`);
            return;
        }
        case "insert_columns":
        case "delete_columns": {
            const ws = getSheet(wb, e.sheet);
            const at = toColumn(e.column ?? e.at, "column");
            const count = toCount(e.count);
            changeRowsOrColumns(wb, ws, action === "insert_columns" ? { axis: "col", at, add: count } : { axis: "col", at, del: count }, ctx);
            ctx.done.push(action === "insert_columns" ? `added ${plural(count, "column")} at column ${colName(at)} on ${ws.name}` : `deleted ${plural(count, "column")} from column ${colName(at)} on ${ws.name}`);
            return;
        }
        case "add_sheet": {
            const used = new Set(wb.worksheets.map((s) => s.name.toLowerCase()));
            const name = sheetName(e.new_name ?? e.sheet ?? e.name, wb.worksheets.length, used);
            const ws = wb.addWorksheet(name);
            const rows = toRows(e.values ?? e.rows);
            if (rows.length) writeRows(ws, 1, 1, rows);
            ctx.done.push(`added sheet ${name}`);
            return;
        }
        case "rename_sheet": {
            const ws = getSheet(wb, e.sheet);
            if (!String(e.new_name ?? "").trim()) throw new Error("send new_name.");
            const old = ws.name;
            const used = new Set(wb.worksheets.filter((s) => s !== ws).map((s) => s.name.toLowerCase()));
            const name = sheetName(e.new_name, 0, used);
            ctx.unshare();
            const rename = (f) => mapRefs(f, (sheet, ref) => (sheet && sheet.toLowerCase() === old.toLowerCase() ? `${quoteSheet(name)}!${ref}` : null));
            eachFormula(wb, rename);
            changeNames(wb, rename);
            ws.name = name;
            ctx.done.push(`renamed sheet ${old} to ${name}`);
            return;
        }
        case "delete_sheet": {
            const ws = getSheet(wb, e.sheet);
            if (wb.worksheets.length <= 1) throw new Error("a file must keep at least one sheet.");
            const gone = ws.name.toLowerCase();
            ctx.unshare();
            const hit = (f) => mapRefs(f, (sheet) => (sheet && sheet.toLowerCase() === gone ? "#REF!" : null));
            eachFormula(wb, (f, own) => (own.toLowerCase() === gone ? f : hit(f)));
            changeNames(wb, (r) => (hit(r) === r ? r : null));
            wb.removeWorksheet(ws.id);
            if (!wb.worksheets.some((s) => s.state === "visible")) wb.worksheets[0].state = "visible";
            if (wb.views?.[0] && wb.views[0].activeTab >= wb.worksheets.length) wb.views[0].activeTab = 0;
            ctx.done.push(`deleted sheet ${ws.name}`);
            return;
        }
        case "format": {
            const ws = getSheet(wb, e.sheet);
            const area = parseRange(e.range ?? e.cell);
            if (!area) throw new Error(`range must look like "A1:D1", "B:B" or "2:2" (got "${e.range ?? ""}").`);
            const fill = e.fill_color !== undefined && e.fill_color !== null ? toArgb(e.fill_color) : null;
            const bold = e.bold !== undefined && e.bold !== null ? e.bold === true || e.bold === "true" : null;
            const numFmt = e.number_format !== undefined && e.number_format !== null && String(e.number_format) !== "" ? String(e.number_format) : null;
            const width = e.column_width !== undefined && e.column_width !== null ? Number(e.column_width) : null;
            if (width !== null && !(width > 0 && width <= 255)) throw new Error("column_width must be a number from 1 to 255.");
            if (fill === null && bold === null && numFmt === null && width === null) throw new Error("send bold, fill_color, number_format or column_width.");
            const left = area.left ?? 1, right = area.right ?? Math.max(ws.columnCount, 1);
            if (fill !== null || bold !== null || numFmt !== null) {
                const top = area.top ?? 1, bottom = area.bottom ?? Math.max(lastUsedRow(ws), 1);
                if ((bottom - top + 1) * (right - left + 1) > MAX_CELLS) throw new Error(`you can format up to ${MAX_CELLS} cells at a time.`);
                for (let r = top; r <= bottom; r++) {
                    for (let c = left; c <= right; c++) {
                        const cell = ws.getCell(r, c);
                        const st = { ...(cell.style || {}) };
                        if (bold !== null) st.font = { ...(st.font || {}), bold };
                        if (fill !== null) st.fill = fill ? { type: "pattern", pattern: "solid", fgColor: { argb: fill } } : { type: "pattern", pattern: "none" };
                        if (numFmt !== null) st.numFmt = numFmt;
                        cell.style = st;
                    }
                }
            }
            if (width !== null) for (let c = left; c <= right; c++) ws.getColumn(c).width = width;
            ctx.done.push(`formatted ${String(e.range ?? e.cell).toUpperCase()} on ${ws.name}`);
            return;
        }
        default:
            throw new Error("action must be one of: set_cells, append_rows, insert_rows, delete_rows, insert_columns, delete_columns, add_sheet, rename_sheet, delete_sheet, format.");
    }
}

// Text in one cell (plain text, rich text or a link's text)
function replaceInCell(cell, edit, state) {
    const v = cell.value;
    if (cell.type === ValueType.String || cell.type === ValueType.SharedString) {
        const pieces = [{ text: String(v) }];
        const n = replaceInPieces(pieces, edit, state);
        if (n) cell.value = pieces[0].text;
        return n;
    }
    if (cell.type === ValueType.RichText && Array.isArray(v?.richText)) {
        const pieces = v.richText.map((r) => ({ text: String(r.text ?? "") }));
        const n = replaceInPieces(pieces, edit, state);
        if (n) {
            const runs = v.richText.map((r, i) => ({ ...r, text: pieces[i].text })).filter((r) => r.text);
            cell.value = runs.length ? { richText: runs } : "";
        }
        return n;
    }
    if (cell.type === ValueType.Hyperlink && typeof v?.text === "string") {
        const pieces = [{ text: v.text }];
        const n = replaceInPieces(pieces, edit, state);
        if (n) cell.value = { ...v, text: pieces[0].text };
        return n;
    }
    return 0;
}

// Things the spreadsheet library can't carry over to the new file
async function excelLosses(zip) {
    const names = Object.keys(zip.files);
    const has = (re) => names.some((n) => re.test(n));
    const lost = [];
    if (has(/^xl\/charts\/chart\d*\.xml$/i)) lost.push("charts");
    if (has(/^xl\/pivotTables\//i)) lost.push("pivot tables");
    if (has(/^xl\/vbaProject\.bin$/i)) lost.push("macros");
    if (has(/^xl\/(slicers|timelines)\//i)) lost.push("slicers");
    if (has(/^xl\/ctrlProps\//i)) lost.push("form controls");
    for (const n of names.filter((x) => /^xl\/drawings\/drawing\d*\.xml$/i.test(x))) {
        if (/<xdr:sp\b/.test(await zip.file(n).async("string"))) { lost.push("shapes and text boxes"); break; }
    }
    return lost;
}

// input: { buffer, name }. Returns { buffer, fileName, mime, summary, note }.
export async function editExcelFile(args = {}, input = {}) {
    const name = String(input.name || "spreadsheet.xlsx");
    const buf = Buffer.from(input.buffer || []);
    let zip;
    try { zip = await JSZip.loadAsync(buf); } catch { throw new Error(`${name} is not an Excel (.xlsx) file.`); }
    if (!zip.file("xl/workbook.xml")) throw new Error(`${name} is not an Excel (.xlsx) file.`);

    const edits = findEdits(args);
    const sheetEdits = toList(args.sheet_edits, "sheet_edits");
    if (edits.length + sheetEdits.length > MAX_EDITS) throw new Error(`You can send up to ${MAX_EDITS} changes at a time.`);
    if (!edits.length && !sheetEdits.length) throw new Error("Send edits (text to find and replace) or sheet_edits (changes to cells, rows, columns or sheets).");

    const wb = new ExcelJS.Workbook();
    try { await wb.xlsx.load(buf); } catch (e) { throw new Error(`Couldn't open ${name}: ${e.message}`); }
    const lost = await excelLosses(zip);

    // Find and replace in the text of every sheet, in sheet order
    const missing = [];
    let total = 0;
    for (const edit of edits) {
        const state = { stop: false };
        let count = 0;
        for (const ws of wb.worksheets) {
            if (state.stop) break;
            ws.eachRow((row) => row.eachCell((cell) => { if (!state.stop) count += replaceInCell(cell, edit, state); }));
        }
        if (!count) missing.push(edit.find);
        total += count;
    }

    let unshared = false;
    const ctx = { done: [], unshare: () => { if (!unshared) { unshareFormulas(wb); unshared = true; } } };
    // Writing over the first cell of a filled-down formula would break the rest, so split them up first
    if (sheetEdits.length) ctx.unshare();
    sheetEdits.forEach((e, i) => {
        const action = String(e?.action || "").trim().toLowerCase();
        try { runSheetEdit(wb, e || {}, action, ctx); } catch (err) { throw new Error(`sheet_edits ${i + 1} (${action || "no action"}): ${err.message}`); }
    });

    if (!total && !ctx.done.length) throw notFound(name, missing);

    // Excel works out every formula again when the file is opened
    wb.calcProperties.fullCalcOnLoad = true;
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());

    const info = OFFICE_TYPES.excel;
    const base = safeFileName(args.file_name, `${safeFileName(name, "spreadsheet")}-edited`);
    const bits = [];
    if (total) bits.push(`${total} text change${total === 1 ? "" : "s"}`);
    if (ctx.done.length) bits.push(doneText(ctx.done));
    const notes = [missingNote(missing)];
    if (lost.length) notes.push(`The old file had ${lost.join(", ")}, which could not be kept in the new file.`);
    return { buffer, fileName: `${base}.${info.ext}`, mime: info.mime, ext: info.ext, summary: `Excel, ${bits.join(", ")}`, note: notes.filter(Boolean).join("\n") };
}

// ---------------------------------------------------------------- PowerPoint

const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const SLIDE_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const NOTES_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml";
const P_NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
// Parts that belong to one slide only, so a copied slide gets its own copy
const OWN_PART = /^ppt\/(charts|diagrams|embeddings)\//i;

const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&");
const dirOf = (p) => p.slice(0, p.lastIndexOf("/") + 1);
const relsOf = (p) => (p ? `${dirOf(p)}_rels/${p.slice(p.lastIndexOf("/") + 1)}.rels` : "_rels/.rels");
const relKind = (r) => String(r.Type || "").split("/").pop();
const isExternal = (r) => /^external$/i.test(r.TargetMode || "");

// "../media/image1.png" from "ppt/slides/slide1.xml" -> "ppt/media/image1.png"
function resolvePart(from, target) {
    if (target.startsWith("/")) return target.slice(1);
    const out = [];
    for (const s of (dirOf(from) + target).split("/")) {
        if (s === "..") out.pop();
        else if (s !== "." && s !== "") out.push(s);
    }
    return out.join("/");
}

// The other way: "ppt/media/image1.png" seen from "ppt/slides/slide1.xml" -> "../media/image1.png"
function relativePart(from, to) {
    const a = dirOf(from).split("/").filter(Boolean), b = to.split("/");
    let i = 0;
    while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
    return "../".repeat(a.length - i) + b.slice(i).join("/");
}

function attrsOf(tag) {
    const o = {};
    for (const m of String(tag).matchAll(/([\w:.-]+)="([^"]*)"/g)) o[m[1]] = unesc(m[2]);
    return o;
}

function attrXml(o) {
    return Object.entries(o).map(([k, v]) => ` ${k}="${esc(v).replace(/"/g, "&quot;")}"`).join("");
}

async function readXml(zip, part) {
    const f = zip.file(part);
    return f ? f.async("string") : null;
}

async function readRels(zip, part) {
    const xml = await readXml(zip, relsOf(part));
    return xml ? [...xml.matchAll(/<Relationship\b[^>]*>/g)].map((m) => attrsOf(m[0])) : [];
}

function writeRels(zip, part, rels) {
    zip.file(relsOf(part), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${RELS_NS}">${rels.map((r) => `<Relationship${attrXml(r)}/>`).join("")}</Relationships>`);
}

// "ppt/slides/slide" + ".xml" -> the next free name, like ppt/slides/slide7.xml
function nextPart(zip, prefix, ext) {
    const re = new RegExp(`^${reEsc(prefix)}(\\d*)${reEsc(ext)}$`, "i");
    let max = 0;
    zip.forEach((n) => { const m = n.match(re); if (m) max = Math.max(max, Number(m[1] || 0)); });
    return `${prefix}${max + 1}${ext}`;
}

// [Content_Types].xml says what each part is
function ctOverride(ct, part) {
    const tag = ct.match(new RegExp(`<Override\\b[^>]*PartName="/${reEsc(part)}"[^>]*>`, "i"))?.[0];
    return tag ? attrsOf(tag).ContentType || null : null;
}

function ctAdd(ct, part, type) {
    return ctOverride(ct, part) ? ct : ct.replace("</Types>", () => `<Override PartName="/${part}" ContentType="${type}"/></Types>`);
}

function ctDrop(ct, part) {
    return ct.replace(new RegExp(`<Override\\b[^>]*PartName="/${reEsc(part)}"[^>]*/>`, "gi"), "");
}

// Paragraphs in slides and notes (<a:p> never holds another <a:p>)
const DPARA_RE = /<a:p(?:\s[^>]*)?>[\s\S]*?<\/a:p>/g;

function runsXml(it) {
    if (!it.text) return "";
    return it.text.split("\n").map((part) => (part ? `${it.open}${it.rPr}<a:t>${esc(part)}</a:t></a:r>` : "")).join(`<a:br>${it.rPr}</a:br>`);
}

// One find/replace on one slide or notes part. Returns the new XML and how many were changed.
function replaceInDrawing(xml, edit, state) {
    let count = 0;
    const out = xml.replace(DPARA_RE, (para) => {
        if (state.stop) return para;
        // Quick check on the plain text before the real work
        const quick = unesc((para.match(/<a:t(?:\s[^>]*)?>[^<]*<\/a:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, "")).join(""));
        edit.re.lastIndex = 0;
        if (!edit.re.test(quick)) return para;
        const open = para.match(/^<a:p\b[^>]*>/)[0];
        const inner = para.slice(open.length, para.length - "</a:p>".length);
        const items = [];
        let i = 0;
        while (i < inner.length) {
            const lt = inner.indexOf("<", i);
            if (lt < 0) { items.push({ raw: inner.slice(i), text: "" }); break; }
            if (lt > i) items.push({ raw: inner.slice(i, lt), text: "" });
            const el = takeElement(inner, lt);
            // Something we can't read: leave the paragraph as it is
            if (!el) return para;
            if (el.name === "a:r") {
                const t = el.xml.match(/<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/);
                const rPr = el.xml.match(/<a:rPr\b[^>]*\/>|<a:rPr\b[^>]*>[\s\S]*?<\/a:rPr>/)?.[0] || "";
                items.push({ xml: el.xml, text: unesc(t?.[1] ?? ""), rPr, open: el.xml.match(/^<a:r\b[^>]*>/)[0] });
            } else if (el.name === "a:br") items.push({ xml: el.xml, text: "\n", wall: true });
            else if (el.name === "a:fld") items.push({ xml: el.xml, text: OBJ, wall: true });
            else items.push({ xml: el.xml, text: "" });
            i = el.end;
        }
        const n = replaceInPieces(items, edit, state);
        if (!n) return para;
        count += n;
        return open + items.map((it) => (it.raw !== undefined ? it.raw : it.dirty ? runsXml(it) : it.xml)).join("") + "</a:p>";
    });
    return { xml: out, count };
}

// Every shape on a slide or layout, with its placeholder kind and its text
function shapesOf(xml) {
    const out = [];
    for (const m of String(xml).matchAll(/<p:sp(?=[\s>])/g)) {
        const el = takeElement(xml, m.index);
        if (!el) continue;
        const phTag = el.xml.match(/<p:nvSpPr>[\s\S]*?<\/p:nvSpPr>/)?.[0].match(/<p:ph\b[^>]*>/)?.[0];
        const text = unesc((el.xml.match(/<a:t(?:\s[^>]*)?>[^<]*<\/a:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, "")).join(""));
        out.push({
            start: m.index, end: el.end, xml: el.xml, ph: phTag ? attrsOf(phTag) : null, text,
            hasBody: /<p:txBody\b/.test(el.xml), y: Number(el.xml.match(/<a:off\b[^>]*\by="(-?\d+)"/)?.[1] ?? 0),
        });
    }
    return out;
}

// The title or body placeholder
function pickPlaceholder(shapes, kind) {
    const ph = shapes.filter((s) => s.ph);
    if (kind === "title") return ph.find((s) => s.ph.type === "title" || s.ph.type === "ctrTitle");
    return ph.find((s) => !s.ph.type || s.ph.type === "body" || s.ph.type === "obj") || ph.find((s) => s.ph.type === "subTitle");
}

// Slides without placeholders (like ones made by make_office_file): the top text box is the title,
// the one with the most text after that is the body
function pickTextBox(shapes, kind) {
    const boxes = shapes.filter((s) => !s.ph && s.hasBody && s.text.trim());
    const title = [...boxes].sort((a, b) => a.y - b.y)[0];
    if (kind === "title") return title;
    return boxes.filter((s) => s !== title).sort((a, b) => b.text.length - a.text.length)[0];
}

// New paragraphs from text: one per line. In the body, two spaces at the start go one level in,
// and "- " or "• " at the start is dropped (the slide adds its own bullets).
function paragraphsXml(text, kind, look) {
    return String(text ?? "").replace(/\r\n?/g, "\n").split("\n").map((line) => {
        let lvl = 0, clean = line;
        if (kind === "body") {
            lvl = Math.min(8, Math.floor(line.match(/^ */)[0].length / 2));
            clean = line.trim().replace(/^[-*•]\s+/, "");
        }
        let pPr = (look.pPr || "").replace(/\s+lvl="\d+"/, "");
        if (lvl) pPr = pPr ? pPr.replace(/^<a:pPr\b/, `<a:pPr lvl="${lvl}"`) : `<a:pPr lvl="${lvl}"/>`;
        const run = clean ? `<a:r>${look.rPr || ""}<a:t>${esc(clean)}</a:t></a:r>` : "";
        return `<a:p>${pPr}${run}${look.end || ""}</a:p>`;
    }).join("");
}

// Put new text in a shape, keeping the look of its first paragraph
function boxWithText(sp, text, kind) {
    const at = sp.search(/<p:txBody\b/);
    if (at < 0) return sp.replace(/<\/p:sp>$/, () => `<p:txBody><a:bodyPr/><a:lstStyle/>${paragraphsXml(text, kind, {})}</p:txBody></p:sp>`);
    const body = takeElement(sp, at);
    const open = body.xml.match(/^<p:txBody\b[^>]*>/)[0];
    const inner = body.xml.slice(open.length, body.xml.length - "</p:txBody>".length);
    const pick = (xml, name) => {
        const i = xml.search(new RegExp(`<${name}(?=[\\s/>])`));
        return i < 0 ? "" : takeElement(xml, i)?.xml || "";
    };
    const firstP = pick(inner, "a:p");
    const firstRun = pick(firstP, "a:r");
    const end = pick(firstP, "a:endParaRPr");
    // No run to copy the look from: the end-of-paragraph look is the same kind of thing
    const rPr = (pick(firstRun, "a:rPr") || end.replace(/^<a:endParaRPr\b/, "<a:rPr").replace(/<\/a:endParaRPr>$/, "</a:rPr>")).replace(/\s+err="1"/, "");
    const look = { pPr: pick(firstP, "a:pPr"), rPr, end };
    return sp.slice(0, at) + open + (pick(inner, "a:bodyPr") || "<a:bodyPr/>") + pick(inner, "a:lstStyle") + paragraphsXml(text, kind, look) + "</p:txBody>" + sp.slice(body.end);
}

function nextShapeId(xml) {
    let max = 1;
    for (const m of String(xml).matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)) max = Math.max(max, Number(m[1]));
    return max + 1;
}

// A placeholder that takes its place and look from the layout
function newPlaceholder(id, ph, kind, text) {
    const keep = {};
    for (const k of ["type", "orient", "sz", "idx"]) if (ph[k] !== undefined) keep[k] = ph[k];
    const name = kind === "title" ? `Title ${id - 1}` : `Content Placeholder ${id - 1}`;
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph${attrXml(keep)}/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paragraphsXml(text, kind, { end: '<a:endParaRPr lang="en-US"/>' })}</p:txBody></p:sp>`;
}

// A plain text box, for decks whose layouts have no placeholders
function newTextBox(id, kind, text, size) {
    const x = Math.round(size.cx * 0.06), w = Math.round(size.cx * 0.88);
    const [y, h, sz] = kind === "title" ? [Math.round(size.cy * 0.06), Math.round(size.cy * 0.16), 3200] : [Math.round(size.cy * 0.26), Math.round(size.cy * 0.66), 2000];
    const rPr = `<a:rPr lang="en-US" sz="${sz}"${kind === "title" ? ' b="1"' : ""} dirty="0"/>`;
    const pPr = kind === "body" ? '<a:pPr marL="285750" indent="-285750"><a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr>' : "";
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${kind === "title" ? "Title" : "Text"} ${id - 1}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" rtlCol="0" anchor="${kind === "title" ? "b" : "t"}"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paragraphsXml(text, kind, { pPr, rPr })}</p:txBody></p:sp>`;
}

async function layoutOf(deck, slidePath) {
    const rel = (await readRels(deck.zip, slidePath)).find((r) => relKind(r) === "slideLayout");
    return rel ? resolvePart(slidePath, rel.Target) : null;
}

// Change a slide's title and/or body text
async function setSlideText(deck, path, e) {
    let xml = await readXml(deck.zip, path);
    const layout = await layoutOf(deck, path);
    const layoutShapes = layout ? shapesOf(await readXml(deck.zip, layout)) : [];
    for (const kind of ["title", "body"]) {
        const text = e[kind];
        if (text === undefined || text === null) continue;
        const shapes = shapesOf(xml);
        let box = pickPlaceholder(shapes, kind);
        const usesPlaceholders = shapes.some((s) => s.ph && !["dt", "ftr", "sldNum", "hdr"].includes(s.ph.type));
        if (!box && !usesPlaceholders) box = pickTextBox(shapes, kind);
        if (box) {
            xml = xml.slice(0, box.start) + boxWithText(box.xml, String(text), kind) + xml.slice(box.end);
            continue;
        }
        // The slide has no such box yet: add the layout's placeholder, or a plain text box
        const ph = pickPlaceholder(layoutShapes, kind)?.ph;
        const id = nextShapeId(xml);
        const sp = ph ? newPlaceholder(id, ph, kind, String(text)) : newTextBox(id, kind, String(text), deck.size);
        xml = xml.replace(/<\/p:spTree>/, () => `${sp}</p:spTree>`);
    }
    deck.zip.file(path, xml);
}

// Copies a part (and the parts under it that belong only to it, like a chart's data) under a new name
async function copyPart(deck, from) {
    const m = from.match(/^(.*?)(\d*)(\.[^./]+)$/);
    const to = nextPart(deck.zip, m[1], m[3]);
    deck.zip.file(to, await deck.zip.file(from).async("uint8array"));
    const type = ctOverride(deck.ct, from);
    if (type) deck.ct = ctAdd(deck.ct, to, type);
    const rels = await readRels(deck.zip, from);
    if (rels.length) {
        for (const r of rels) {
            if (isExternal(r)) continue;
            const target = resolvePart(from, r.Target);
            if (OWN_PART.test(target) && deck.zip.file(target)) r.Target = relativePart(to, await copyPart(deck, target));
        }
        writeRels(deck.zip, to, rels);
    }
    return to;
}

async function duplicateSlide(deck, src) {
    const path = nextPart(deck.zip, "ppt/slides/slide", ".xml");
    // A new id so PowerPoint sees it as its own slide
    const xml = (await readXml(deck.zip, src.path)).replace(/(<p14:creationId\b[^>]*\bval=")\d+/g, (_, a) => a + randomInt(1, 2 ** 32 - 1));
    deck.zip.file(path, xml);
    deck.ct = ctAdd(deck.ct, path, SLIDE_TYPE);
    const rels = [];
    for (const r of await readRels(deck.zip, src.path)) {
        const kind = relKind(r);
        if (/comment/i.test(kind)) continue;
        if (isExternal(r)) { rels.push(r); continue; }
        const target = resolvePart(src.path, r.Target);
        if (kind === "notesSlide") {
            if (!deck.zip.file(target)) continue;
            const notes = nextPart(deck.zip, "ppt/notesSlides/notesSlide", ".xml");
            deck.zip.file(notes, await readXml(deck.zip, target));
            deck.ct = ctAdd(deck.ct, notes, NOTES_TYPE);
            writeRels(deck.zip, notes, (await readRels(deck.zip, target)).map((x) => (relKind(x) === "slide" ? { ...x, Target: relativePart(notes, path) } : x)));
            rels.push({ ...r, Target: relativePart(path, notes) });
        } else if (OWN_PART.test(target) && deck.zip.file(target)) {
            rels.push({ ...r, Target: relativePart(path, await copyPart(deck, target)) });
        } else rels.push(r);
    }
    writeRels(deck.zip, path, rels);
    return path;
}

async function layoutsOf(deck) {
    const names = Object.keys(deck.zip.files).filter((n) => /^ppt\/slideLayouts\/[^/]+\.xml$/i.test(n))
        .sort((a, b) => Number(a.match(/(\d+)\.xml$/)?.[1] || 0) - Number(b.match(/(\d+)\.xml$/)?.[1] || 0));
    const out = [];
    for (const path of names) {
        const xml = await readXml(deck.zip, path);
        out.push({ path, name: unesc(xml.match(/<p:cSld\b[^>]*\bname="([^"]*)"/)?.[1] || ""), type: xml.match(/<p:sldLayout\b[^>]*\btype="([^"]+)"/)?.[1] || "" });
    }
    return out;
}

// The layout for a new slide: the one asked for, the one of a given slide, else "Title and Content"
async function pickLayout(deck, slides, e, ctx, at) {
    const layouts = await layoutsOf(deck);
    if (!layouts.length) throw new Error("the file has no slide layouts.");
    if (e.layout) {
        const want = String(e.layout).trim().toLowerCase();
        const hit = layouts.find((l) => l.name.toLowerCase() === want) || layouts.find((l) => l.name.toLowerCase().includes(want));
        if (!hit) throw new Error(`there is no layout named "${e.layout}". Layouts: ${layouts.map((l) => l.name || l.path).join(", ")}.`);
        return hit;
    }
    if (e.slide !== undefined && e.slide !== null && e.slide !== "") {
        const path = await layoutOf(deck, slides[slideIndex(slides, ctx, e.slide)].path);
        const hit = layouts.find((l) => l.path === path);
        if (hit) return hit;
    }
    const content = layouts.find((l) => l.type === "obj") || layouts.find((l) => /title and content/i.test(l.name));
    if (content) return content;
    const near = slides[Math.max(0, Math.min(at, slides.length) - 1)];
    const path = near ? await layoutOf(deck, near.path) : null;
    return layouts.find((l) => l.path === path) || layouts[0];
}

async function addSlide(deck, slides, e, ctx, at) {
    const layout = await pickLayout(deck, slides, e, ctx, at);
    const layoutShapes = shapesOf(await readXml(deck.zip, layout.path));
    const sps = [];
    let id = 2;
    for (const kind of ["title", "body"]) {
        const ph = pickPlaceholder(layoutShapes, kind)?.ph;
        const text = e[kind] === undefined || e[kind] === null ? "" : String(e[kind]);
        if (ph) sps.push(newPlaceholder(id++, ph, kind, text));
        else if (text) sps.push(newTextBox(id++, kind, text, deck.size));
    }
    const path = nextPart(deck.zip, "ppt/slides/slide", ".xml");
    deck.zip.file(path, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld ${P_NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${sps.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
    deck.ct = ctAdd(deck.ct, path, SLIDE_TYPE);
    writeRels(deck.zip, path, [{ Id: "rId1", Type: `${REL_TYPE}/slideLayout`, Target: relativePart(path, layout.path) }]);
    return { path, layout };
}

// Slide numbers mean the slides as they were in the file; new slides get the next numbers after those
function slideIndex(slides, ctx, n) {
    const ref = Number(n);
    if (!Number.isInteger(ref) || ref < 1) throw new Error(`slide must be a slide number like 3 (got "${n ?? ""}").`);
    const i = slides.findIndex((s) => s.ref === ref);
    if (i < 0) throw new Error(ref <= ctx.lastRef ? `slide ${ref} was already deleted.` : `there is no slide ${ref} (the file has ${ctx.firstCount} slides).`);
    return i;
}

// "to" is a place in the deck as it is at that moment (1 = first)
function toPlace(to, length) {
    const n = Number(to);
    if (!Number.isInteger(n) || n < 1) throw new Error(`to must be a place like 1 for first (got "${to ?? ""}").`);
    return Math.min(n, length + 1) - 1;
}

function newSlideEntry(deck, ctx, path) {
    let k = 1;
    while (deck.presRels.some((r) => r.Id === `rId${k}`)) k++;
    const rid = `rId${k}`;
    deck.presRels.push({ Id: rid, Type: `${REL_TYPE}/slide`, Target: relativePart(deck.presPath, path) });
    const id = String(ctx.nextId++);
    return { id, rid, path, ref: ++ctx.lastRef, xml: `<p:sldId id="${id}" r:id="${rid}"/>` };
}

async function runSlideEdit(deck, slides, e, action, ctx) {
    const hasText = (e.title !== undefined && e.title !== null) || (e.body !== undefined && e.body !== null);
    switch (action) {
        case "set_text": {
            const i = slideIndex(slides, ctx, e.slide);
            if (!hasText) throw new Error("send title or body.");
            await setSlideText(deck, slides[i].path, e);
            ctx.done.push(`changed the text on slide ${slides[i].ref}`);
            return;
        }
        case "delete_slide": {
            const i = slideIndex(slides, ctx, e.slide);
            if (slides.length <= 1) throw new Error("a file must keep at least one slide.");
            const [gone] = slides.splice(i, 1);
            ctx.done.push(`deleted slide ${gone.ref}`);
            ctx.listChanged = true;
            return;
        }
        case "duplicate_slide": {
            const i = slideIndex(slides, ctx, e.slide);
            const src = slides[i];
            const path = await duplicateSlide(deck, src);
            const entry = newSlideEntry(deck, ctx, path);
            const at = e.to !== undefined && e.to !== null && e.to !== "" ? toPlace(e.to, slides.length) : i + 1;
            slides.splice(at, 0, entry);
            if (hasText) await setSlideText(deck, path, e);
            ctx.done.push(`copied slide ${src.ref} as slide ${entry.ref} (place ${at + 1})`);
            ctx.listChanged = true;
            return;
        }
        case "move_slide": {
            const i = slideIndex(slides, ctx, e.slide);
            const [s] = slides.splice(i, 1);
            const at = toPlace(e.to, slides.length);
            slides.splice(at, 0, s);
            ctx.done.push(`moved slide ${s.ref} to place ${at + 1}`);
            ctx.listChanged = true;
            return;
        }
        case "reorder_slides": {
            const order = toList(e.order, "order");
            if (order.length < 2) throw new Error("send order: the slide numbers in their new order, like [3, 1, 2].");
            const idx = order.map((n) => slideIndex(slides, ctx, n));
            if (new Set(idx).size !== idx.length) throw new Error("order has the same slide more than once.");
            // The listed slides swap places among themselves; other slides stay where they are
            const picked = idx.map((i) => slides[i]);
            [...idx].sort((a, b) => a - b).forEach((p, k) => { slides[p] = picked[k]; });
            ctx.done.push(`put slides ${order.join(", ")} in a new order`);
            ctx.listChanged = true;
            return;
        }
        case "add_slide": {
            const at = e.to !== undefined && e.to !== null && e.to !== "" ? toPlace(e.to, slides.length) : slides.length;
            const { path, layout } = await addSlide(deck, slides, e, ctx, at);
            const entry = newSlideEntry(deck, ctx, path);
            slides.splice(at, 0, entry);
            ctx.done.push(`added slide ${entry.ref} at place ${at + 1}${layout.name ? ` (layout "${layout.name}")` : ""}`);
            ctx.listChanged = true;
            return;
        }
        default:
            throw new Error("action must be one of: set_text, delete_slide, duplicate_slide, move_slide, reorder_slides, add_slide.");
    }
}

// Sections (PowerPoint 2010 and later) also list the slides; keep them matching the new slide list
function fixSections(pres, slides) {
    const lst = pres.match(/(<p14:sectionLst\b[^>]*>)([\s\S]*?)<\/p14:sectionLst>/);
    if (!lst) return pres;
    const sections = [...lst[2].matchAll(/<p14:section(?=[\s/>])[^>]*?(?:\/>|>[\s\S]*?<\/p14:section>)/g)].map((m) => ({
        attrs: attrsOf(m[0].match(/^<p14:section\b[^>]*?(?=\/?>)/)[0]),
        ids: [...m[0].matchAll(/<p14:sldId(?=[\s/>])[^>]*\bid="(\d+)"/g)].map((x) => x[1]),
    }));
    if (!sections.length) return pres;
    const home = new Map();
    sections.forEach((s, i) => s.ids.forEach((id) => home.set(id, i)));
    // A new slide joins the section of the slide before it
    const place = slides.map((s) => home.get(s.id));
    for (let k = 1; k < place.length; k++) if (place[k] === undefined) place[k] = place[k - 1];
    for (let k = place.length - 2; k >= 0; k--) if (place[k] === undefined) place[k] = place[k + 1];
    for (let k = 0; k < place.length; k++) if (place[k] === undefined) place[k] = 0;
    const section = (attrs, ids) => `<p14:section${attrXml(attrs)}><p14:sldIdLst>${ids.map((id) => `<p14:sldId id="${id}"/>`).join("")}</p14:sldIdLst></p14:section>`;
    let out;
    if (place.every((x, k) => !k || x >= place[k - 1])) {
        out = sections.map((s, i) => section(s.attrs, slides.filter((_, k) => place[k] === i).map((s2) => s2.id)));
    } else {
        // Slides were moved between sections: each run of slides becomes a section with its old name
        out = [];
        const used = new Set();
        for (let k = 0; k < slides.length;) {
            const i = place[k];
            const ids = [];
            while (k < slides.length && place[k] === i) ids.push(slides[k++].id);
            const attrs = used.has(i) ? { ...sections[i].attrs, id: `{${randomUUID().toUpperCase()}}` } : sections[i].attrs;
            used.add(i);
            out.push(section(attrs, ids));
        }
        sections.forEach((s, i) => { if (!used.has(i)) out.push(section(s.attrs, [])); });
    }
    return pres.replace(lst[0], () => `${lst[1]}${out.join("")}</p14:sectionLst>`);
}

// Removes slides, notes, charts and pictures nothing points to any more
async function dropUnusedParts(deck) {
    const { zip } = deck;
    const seen = new Set();
    const walk = async (part) => {
        for (const r of await readRels(zip, part)) {
            if (isExternal(r)) continue;
            // Links between slides (and notes back to their slide) don't keep a deleted slide
            if (relKind(r) === "slide" && part !== deck.presPath) continue;
            const t = resolvePart(part, r.Target);
            if (seen.has(t) || !zip.file(t)) continue;
            seen.add(t);
            await walk(t);
        }
    };
    await walk("");
    const removed = [];
    zip.forEach((n, f) => {
        if (!f.dir && /^ppt\/(slides|notesSlides|charts|embeddings|media|diagrams|comments)\/[^/]+$/i.test(n) && !seen.has(n)) removed.push(n);
    });
    for (const n of removed) {
        zip.remove(n);
        zip.remove(relsOf(n));
        deck.ct = ctDrop(deck.ct, n);
    }
    // Links to slides that are gone are taken out
    for (const n of seen) {
        if (!/^ppt\/slides\/[^/]+\.xml$/i.test(n)) continue;
        const rels = await readRels(zip, n);
        const dead = rels.filter((r) => !isExternal(r) && !zip.file(resolvePart(n, r.Target)));
        if (!dead.length) continue;
        let xml = await readXml(zip, n);
        for (const r of dead) xml = xml.replace(new RegExp(`<a:hlink(Click|Hover)\\b[^>]*r:id="${reEsc(r.Id)}"[^>]*?(?:/>|>[\\s\\S]*?</a:hlink\\1>)`, "g"), "");
        zip.file(n, xml);
        writeRels(zip, n, rels.filter((r) => !dead.includes(r)));
    }
}

// input: { buffer, name }. Returns { buffer, fileName, mime, summary, note }.
export async function editPowerPointFile(args = {}, input = {}) {
    const name = String(input.name || "presentation.pptx");
    const buf = Buffer.from(input.buffer || []);
    let zip;
    try { zip = await JSZip.loadAsync(buf); } catch { throw new Error(`${name} is not a PowerPoint (.pptx) file.`); }
    const presPath = (await readRels(zip, "")).filter((r) => relKind(r) === "officeDocument").map((r) => resolvePart("", r.Target))[0] || "ppt/presentation.xml";
    let pres = await readXml(zip, presPath);
    if (!pres || !/<p:presentation\b/.test(pres)) throw new Error(`${name} is not a PowerPoint (.pptx) file.`);

    const edits = findEdits(args);
    const slideEdits = toList(args.slide_edits, "slide_edits");
    if (edits.length + slideEdits.length > MAX_EDITS) throw new Error(`You can send up to ${MAX_EDITS} changes at a time.`);
    if (!edits.length && !slideEdits.length) throw new Error("Send edits (text to find and replace) or slide_edits (changes to slides).");

    const size = attrsOf(pres.match(/<p:sldSz\b[^>]*>/)?.[0] || "");
    const deck = {
        zip, presPath, presRels: await readRels(zip, presPath),
        ct: (await readXml(zip, "[Content_Types].xml")) || "",
        size: { cx: Number(size.cx) || 12192000, cy: Number(size.cy) || 6858000 },
    };

    // The slides in order, from the slide list in presentation.xml
    const listXml = pres.match(/<p:sldIdLst\b[^>]*\/>|<p:sldIdLst\b[^>]*>[\s\S]*?<\/p:sldIdLst>/)?.[0] || "";
    const slides = [];
    for (const m of listXml.matchAll(/<p:sldId(?=[\s/>])/g)) {
        const el = takeElement(listXml, m.index);
        if (!el) continue;
        const a = attrsOf(el.xml.match(/^<[^>]*>/)[0]);
        const rel = deck.presRels.find((r) => r.Id === a["r:id"]);
        if (!rel) continue;
        slides.push({ id: a.id, rid: a["r:id"], path: resolvePart(presPath, rel.Target), ref: slides.length + 1, xml: el.xml });
    }
    const firstRids = new Set(slides.map((s) => s.rid));

    // Find and replace: slides in order, then their notes
    const missing = [];
    let total = 0;
    if (edits.length) {
        const parts = slides.map((s) => s.path);
        for (const s of slides) {
            const rel = (await readRels(zip, s.path)).find((r) => relKind(r) === "notesSlide");
            if (rel) parts.push(resolvePart(s.path, rel.Target));
        }
        const xml = {};
        for (const p of parts) xml[p] = (await readXml(zip, p)) || "";
        const changed = new Set();
        for (const edit of edits) {
            const state = { stop: false };
            let count = 0;
            for (const p of parts) {
                if (state.stop) break;
                const r = replaceInDrawing(xml[p], edit, state);
                if (r.count) { xml[p] = r.xml; changed.add(p); count += r.count; }
            }
            if (!count) missing.push(edit.find);
            total += count;
        }
        for (const p of changed) zip.file(p, xml[p]);
    }

    const ctx = {
        done: [], listChanged: false, firstCount: slides.length, lastRef: slides.length,
        nextId: Math.max(255, ...slides.map((s) => Number(s.id) || 0)) + 1,
    };
    for (const [i, e] of slideEdits.entries()) {
        const action = String(e?.action || "").trim().toLowerCase();
        try { await runSlideEdit(deck, slides, e || {}, action, ctx); } catch (err) { throw new Error(`slide_edits ${i + 1} (${action || "no action"}): ${err.message}`); }
    }

    if (!total && !ctx.done.length) throw notFound(name, missing);

    if (ctx.listChanged) {
        const list = `<p:sldIdLst>${slides.map((s) => s.xml).join("")}</p:sldIdLst>`;
        if (listXml) pres = pres.replace(listXml, () => list);
        else pres = pres.replace(/<p:sldSz\b/, (m) => list + m);
        pres = fixSections(pres, slides);
        // Custom slide shows can't list a deleted slide
        const keep = new Set(slides.map((s) => s.rid));
        for (const rid of firstRids) {
            if (!keep.has(rid)) pres = pres.replace(new RegExp(`<p:sld\\b[^>]*r:id="${reEsc(rid)}"[^>]*/>`, "g"), "");
        }
        deck.presRels = deck.presRels.filter((r) => relKind(r) !== "slide" || keep.has(r.Id));
        writeRels(zip, presPath, deck.presRels);
        zip.file(presPath, pres);
        await dropUnusedParts(deck);
        const app = await readXml(zip, "docProps/app.xml");
        if (app) zip.file("docProps/app.xml", app.replace(/<Slides>\d+<\/Slides>/, `<Slides>${slides.length}</Slides>`));
    }
    // A slide show (.ppsx) or template (.potx) is saved as a normal presentation
    deck.ct = deck.ct.replace(/presentationml\.(slideshow|template)\.main\+xml/g, "presentationml.presentation.main+xml");
    zip.file("[Content_Types].xml", deck.ct);
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });

    const info = OFFICE_TYPES.powerpoint;
    const base = safeFileName(args.file_name, `${safeFileName(name.replace(/\.(ppsx|potx)$/i, ""), "presentation")}-edited`);
    const bits = [];
    if (total) bits.push(`${total} text change${total === 1 ? "" : "s"}`);
    if (ctx.done.length) bits.push(doneText(ctx.done));
    bits.push(`${slides.length} slide${slides.length === 1 ? "" : "s"} now`);
    return { buffer, fileName: `${base}.${info.ext}`, mime: info.mime, ext: info.ext, summary: `PowerPoint, ${bits.join(", ")}`, note: missingNote(missing) };
}

// ---------------------------------------------------------------- Pick by file type

// input: { buffer, name }. Works out from what is inside the file whether it is Word, Excel or PowerPoint.
export async function editOfficeFile(args = {}, input = {}) {
    const name = String(input.name || "file");
    const buf = Buffer.from(input.buffer || []);
    if (buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
        if (/\.xl[st]$/i.test(name)) throw new Error(`${name} is an old Excel file (.xls). Open it in Excel and save it as .xlsx, then try again.`);
        if (/\.(ppt|pps|pot)$/i.test(name)) throw new Error(`${name} is an old PowerPoint file (.ppt). Open it in PowerPoint and save it as .pptx, then try again.`);
        return editWordFile(args, input);
    }
    let zip;
    try { zip = await JSZip.loadAsync(buf); } catch { throw new Error(`${name} is not a Word (.docx), Excel (.xlsx) or PowerPoint (.pptx) file.`); }
    if (zip.file("xl/workbook.xml")) return editExcelFile(args, input);
    if (zip.file("ppt/presentation.xml")) return editPowerPointFile(args, input);
    if (zip.file("word/document.xml")) return editWordFile(args, input);
    throw new Error(`${name} is not a Word (.docx), Excel (.xlsx) or PowerPoint (.pptx) file.`);
}
