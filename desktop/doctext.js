// The text of a document on this computer (PDF, Word .docx, PowerPoint .pptx, Excel .xlsx / .xls, CSV), read right here,
// so read_local_file sends the AI only its text instead of the whole file. Before, the whole file went to the server in
// 512 KB pieces first: a 4 MB PowerPoint took minutes on a phone's internet and held up every other step of the app
// (2026-11-09). Same reading as the server's document-text.service.js, so the AI gets the same text either way.
// A file that can't be read here (a scanned PDF with no text, an old .doc / .ppt) returns null: it then goes to the
// server as before, which shows a scanned PDF's pages as pictures.
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
  // Older binary Office files: only .xls can be read (old .doc / .ppt go to the server, which explains)
  if (head.readUInt32BE(0) === 0xd0cf11e0) {
    let names = [];
    try { names = XLSX.CFB.read(buf, { type: "buffer" }).FullPaths.map((p) => p.toLowerCase()); } catch { return null; }
    if (names.some((p) => p.endsWith("/worddocument") || p.endsWith("/powerpoint document"))) return null;
    return workbookText(buf, "Excel workbook");
  }
  if (/\.(csv|tsv)$/i.test(fileName)) return workbookText(buf, "CSV file");
  return null;
}

module.exports = { documentText };
