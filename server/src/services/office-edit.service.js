// edit_office_file: changes an existing Word (.docx) file (find and replace, tracked changes, add text at the end).
// Downloading and uploading is done by the caller; editWordFile only works on file bytes.
// Works on the raw XML so everything we don't touch stays exactly as it was.
import JSZip from "jszip";
import { marked } from "marked";
import { OFFICE_TYPES, safeFileName } from "./office-files.service.js";

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
