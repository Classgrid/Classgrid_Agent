// The text of a document on this computer (PDF, Word .docx, PowerPoint .pptx, Excel .xlsx / .xls, CSV), read right here,
// so read_local_file sends the AI only its text instead of the whole file. Before, the whole file went to the server in
// 512 KB pieces first: a 4 MB PowerPoint took minutes on a phone's internet and held up every other step of the app
// (2026-11-09). Same reading as the server's document-text.service.js, so the AI gets the same text either way.
// Old .doc and .ppt files are read here too. A scanned PDF (no text inside) returns null here: its pages are made into
// pictures on this computer instead (pdfpages.js).
const XLSX = require("xlsx");

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

const NL = String.fromCharCode(10);
const tidy = (text) => text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();

function readZipEntry(zip, p) {
  const entry = XLSX.CFB.find(zip, `/${p}`);
  if (!entry || !entry.content) return null;
  return Buffer.from(entry.content).toString("utf8");
}

// PowerPoint: the text of each slide in order and its speaker notes
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
    const notes = notesTarget ? drawingText(readZipEntry(zip, `ppt/notesSlides/${notesTarget}`) || "").replace(/^\d+$/m, "").trim() : "";
    parts.push(`--- Slide ${num} ---\n${body || "(no text on this slide)"}${notes ? `\nSpeaker notes: ${notes}` : ""}`);
  }
  return { kind: "PowerPoint presentation", text: parts.join("\n\n"), detail: `${slides.length} slides` };
}

// Word: paragraphs in order; table cells separated by " | ", one table row per line
function docxText(zip) {
  const xml = readZipEntry(zip, "word/document.xml") || "";
  const text = decodeXmlEntities(xml
    .replace(/<w:(instrText|delText)[^>]*>[\s\S]*?<\/w:\1>/g, "")
    .replace(/<w:tc[\s>][\s\S]*?<\/w:tc>/g, (cell) => cell.replace(/<\/w:p>/g, " "))
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:tc>/g, " | ")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<[^>]+>/g, (m, t) => (t !== undefined ? t : "")));
  return { kind: "Word document", text: tidy(text.replace(/ \| \n/g, "\n")) };
}

// Excel / CSV: every sheet as comma-separated rows, with its name
function workbookText(buf, kind) {
  const wb = XLSX.read(buf, { type: "buffer" });
  const parts = wb.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false }).trim();
    return `--- Sheet "${name}" ---\n${csv || "(empty sheet)"}`;
  });
  return { kind, text: parts.join("\n\n"), detail: `${wb.SheetNames.length} sheet${wb.SheetNames.length === 1 ? "" : "s"}` };
}

async function pdfText(buf) {
  // (the package's index runs a self-test when loaded; the lib file is the parser itself)
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const data = await pdfParse(buf);
  const text = String(data.text || "").trim();
  if (text.length <= 50) return null; // scanned: the server shows its pages as pictures
  return { kind: "PDF", text: tidy(text), detail: `${data.numpages} pages` };
}

// Old PowerPoint (.ppt): the text records in the "PowerPoint Document" stream, slide by slide. Every record has an
// 8-byte header (version + instance, type, length); containers (version 0xF) hold more records, so the stream is walked
// record by record. Slide text is in TextCharsAtom (UTF-16) and TextBytesAtom (8-bit) records; a SlidePersistAtom starts
// the next slide's text in the slide list.
function pptText(zip) {
  const entry = XLSX.CFB.find(zip, "/PowerPoint Document");
  if (!entry || !entry.content) return null;
  const buf = Buffer.from(entry.content);
  // The slide list (SlideListWithText, instance 0) holds each slide's text after its SlidePersistAtom; instance 2 is the
  // notes list. Text found elsewhere (text boxes in the slide drawings) is added only when it isn't already there.
  const slides = [], notes = [], other = [];
  const all = [];
  const MASTER = /^(Click to edit|Click to add|Second level|Third level|Fourth level|Fifth level|\*)/i;
  const known = (t) => all.some((k) => k.includes(t));
  const walk = (start, end, depth, list) => {
    let at = start;
    while (at + 8 <= end) {
      const verInst = buf.readUInt16LE(at);
      const type = buf.readUInt16LE(at + 2);
      const len = buf.readUInt32LE(at + 4);
      const body = at + 8;
      if (len > end - body) break;
      if ((verInst & 0x0f) === 0x0f && depth < 32) walk(body, body + len, depth + 1, type === 0x0ff0 ? verInst >> 4 : list);
      else if (type === 0x03f3 && list === 0) slides.push([]);
      else if (type === 0x03f3 && list === 2) notes.push([]);
      else if (type === 0x0fa0 || type === 0x0fa8) {
        const raw = type === 0x0fa0 ? buf.toString("utf16le", body, body + len) : buf.toString("latin1", body, body + len);
        // (PowerPoint ends paragraphs with CR and soft line breaks with VT: both become new lines)
        const text = raw.split(String.fromCharCode(13)).join(NL).split(String.fromCharCode(11)).join(NL).trim();
        if (text && !MASTER.test(text)) {
          if (list === 0 && slides.length) slides[slides.length - 1].push(text);
          else if (list === 2 && notes.length) notes[notes.length - 1].push(text);
          else if (!known(text)) other.push(text);
          all.push(text);
        }
      }
      at = body + len;
    }
  };
  walk(0, buf.length, 0, null);
  // Old .ppt files often keep earlier saved copies of their slides too, so slide numbers can't be told reliably from
  // the records: the text is given once each, in the order it is stored, with the speaker notes after it
  const unique = [];
  for (const t of all) if (!unique.some((u) => u.includes(t))) { for (let i = unique.length - 1; i >= 0; i--) if (t.includes(unique[i])) unique.splice(i, 1); unique.push(t); }
  const noteText = new Set(notes.flat());
  const body = unique.filter((t) => !noteText.has(t));
  const noted = unique.filter((t) => noteText.has(t));
  if (!body.length && !noted.length) return null;
  const text = [`--- Text on the slides, in order ---${NL}${tidy(body.join(NL + NL))}`, noted.length ? `--- Speaker notes ---${NL}${tidy(noted.join(NL + NL))}` : ""].filter(Boolean).join(NL + NL);
  return { kind: "PowerPoint presentation (old .ppt)", text, detail: `${slides.length} slides` };
}

// Old Word (.doc): read with word-extractor (the text, then headers / footers / footnotes when there are any)
async function docText(buf) {
  const WordExtractor = require("word-extractor");
  const doc = await new WordExtractor().extract(buf);
  const body = String(doc.getBody() || "").trim();
  const extra = [doc.getHeaders?.({ includeFooters: true }), doc.getFootnotes?.(), doc.getEndnotes?.()]
    .map((t) => String(t || "").trim()).filter(Boolean);
  const text = tidy([body, ...extra].join("\n\n"));
  return text ? { kind: "Word document (old .doc)", text } : null;
}

/** { kind, text, detail? } for a document, or null when it can't be read here (the server reads it instead). */
async function documentText(buf, fileName = "") {
  if (!buf || !buf.length) return null;
  const head = buf.subarray(0, 8);
  if (head.subarray(0, 5).toString("latin1") === "%PDF-") return pdfText(buf);
  // Zip-based Office files (.docx, .pptx, .xlsx and their macro / template kinds)
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
    const zip = XLSX.CFB.read(buf, { type: "buffer" });
    const paths = zip.FullPaths.map((p) => p.replace(/^[^/]*\//, ""));
    if (paths.some((p) => p.startsWith("ppt/"))) return pptxText(zip, paths);
    if (paths.some((p) => p === "word/document.xml")) return docxText(zip);
    if (paths.some((p) => p.startsWith("xl/"))) return workbookText(buf, "Excel workbook");
    return null;
  }
  // Older binary Office files (.doc, .ppt, .xls)
  if (head.readUInt32BE(0) === 0xd0cf11e0) {
    let zip;
    try { zip = XLSX.CFB.read(buf, { type: "buffer" }); } catch { return null; }
    const names = zip.FullPaths.map((p) => p.toLowerCase());
    if (names.some((p) => p.endsWith("/worddocument"))) return docText(buf);
    if (names.some((p) => p.endsWith("/powerpoint document"))) return pptText(zip);
    return workbookText(buf, "Excel workbook");
  }
  if (/\.(csv|tsv)$/i.test(fileName)) return workbookText(buf, "CSV file");
  return null;
}

module.exports = { documentText };
