// Studio's file tab in the desktop app: a file on this computer that the agent worked on (or the user clicked), shown
// like a code editor's agent shows it: PDF pages with a page and zoom bar, Excel and CSV sheets, Word pages,
// pictures, video, sound and text. The app hands the file to these screens only (see desktop/main.js).
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ExternalLink, FolderOpen, Maximize, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Spinner } from "@/components/marketing_ui/spinner";
import { FileBadge, OPEN_LOCAL_FILE_EVENT } from "@/components/ai/components/stepper/ProjectToolSteps";
import pdfWorker from "../../../../node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?url";
export { pdfWorker as pdfWorkerUrl };
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type Desktop = {
  fileUrl?: (file: string) => string;
  fileInfo?: (file: string) => Promise<{ exists: boolean; isFile?: boolean; size?: number; modified?: number }>;
  openPath?: (file: string) => Promise<void>;
  showInFolder?: (file: string) => Promise<void>;
};
const desktop = () => (window as unknown as { classgridDesktop?: Desktop }).classgridDesktop;
export const hasLocalFiles = () => typeof desktop()?.fileUrl === "function";

export const baseName = (p = "") => String(p).replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() || p;
const extOf = (p: string) => (baseName(p).match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
const sizeText = (n = 0) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} bytes`);

const IMAGE = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"]);
const VIDEO = new Set(["mp4", "webm", "mov"]);
const AUDIO = new Set(["mp3", "wav", "ogg", "m4a"]);
const SHEET = new Set(["xlsx", "xls", "xlsm", "csv", "ods"]);
const WORD = new Set(["docx"]);
const MARKDOWN = new Set(["md", "markdown", "mdx"]);
// Files the viewer shows as a picture of what's inside, not as text
const BINARY = new Set([...IMAGE, ...VIDEO, ...AUDIO, ...SHEET, ...WORD, "pdf", "doc", "ppt", "pptx", "zip", "rar", "7z", "exe", "dll", "msi", "iso"]);
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 2000;

const iconBtn = "flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:hover:bg-transparent";

export function StudioLocalFileView({ path }: { path: string }) {
  const [info, setInfo] = useState<{ exists: boolean; size?: number; modified?: number } | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    setInfo(null);
    desktop()?.fileInfo?.(path).then(setInfo).catch(() => setInfo({ exists: false }));
  }, [path, reload]);
  const url = useMemo(() => `${desktop()?.fileUrl?.(path) || ""}${reload ? `?r=${reload}` : ""}`, [path, reload]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 h-11 pl-3 pr-2 border-b border-border">
        <FileBadge path={path} />
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={path}>{path}</span>
        {info?.exists && <span className="shrink-0 text-xs text-muted-foreground">{sizeText(info.size)}</span>}
        <button className={iconBtn} onClick={() => setReload(Date.now())} title="Reload" aria-label="Reload"><RotateCw className="size-4" /></button>
        <button className={iconBtn} onClick={() => desktop()?.showInFolder?.(path)} title="Show in File Explorer" aria-label="Show in File Explorer"><FolderOpen className="size-4" /></button>
        <button className={iconBtn} onClick={() => desktop()?.openPath?.(path)} title="Open with your computer's app" aria-label="Open with your computer's app"><ExternalLink className="size-4" /></button>
      </div>
      <div className="relative flex-1 min-h-0 bg-[#f5f5f5] dark:bg-[#141414]">
        {!info ? (
          <Centered><Spinner className="size-5" /></Centered>
        ) : !info.exists ? (
          <Centered><p className="text-sm text-muted-foreground">This file isn't there any more.</p></Centered>
        ) : (
          <FileContent url={url} name={path} size={info.size} path={path} />
        )}
      </div>
    </div>
  );
}

// What's inside a file, by its kind: a file on this computer (path) or one online (url only, like an upload on the
// website); kinds that can't be shown here open in the computer's own app, or download
export function FileContent({ url, name, size, path }: { url: string; name: string; size?: number; path?: string }) {
  const ext = extOf(name);
  return ext === "pdf" ? (
    <PdfView key={url} url={url} />
  ) : IMAGE.has(ext) ? (
    <div className="h-full overflow-auto flex items-center justify-center p-4"><img src={url} alt={baseName(name)} className="max-w-full max-h-full object-contain" /></div>
  ) : VIDEO.has(ext) ? (
    <div className="h-full flex items-center justify-center p-4"><video src={url} controls className="max-w-full max-h-full" /></div>
  ) : AUDIO.has(ext) ? (
    <Centered><audio src={url} controls /></Centered>
  ) : SHEET.has(ext) ? (
    <SheetView key={url} url={url} />
  ) : WORD.has(ext) ? (
    <WordView key={url} url={url} />
  ) : MARKDOWN.has(ext) && (size || 0) <= MAX_TEXT_BYTES ? (
    <MarkdownView key={url} url={url} path={path || ""} />
  ) : BINARY.has(ext) || (size || 0) > MAX_TEXT_BYTES ? (
    <OpenOutside path={path} url={url} name={name} size={size} />
  ) : (
    <TextView key={url} url={url} />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">{children}</div>;
}

function OpenOutside({ path, url, name, size }: { path?: string; url: string; name: string; size?: number }) {
  const btn = "h-9 px-4 inline-flex items-center rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary cursor-pointer";
  return (
    <Centered>
      <span className="[&_svg]:size-10 [&_span]:size-10"><FileBadge path={name} /></span>
      <p className="text-base font-medium">{baseName(name)}</p>
      <p className="text-sm text-muted-foreground">{size ? `${sizeText(size)} · ` : ""}{path ? "This kind of file opens in your computer's own app." : "This kind of file can't be shown here."}</p>
      {path ? (
        <button onClick={() => desktop()?.openPath?.(path)} className={btn}>Open {baseName(name)}</button>
      ) : (
        <a href={url} download={baseName(name)} target="_blank" rel="noopener noreferrer" className={btn}>Download {baseName(name)}</a>
      )}
    </Centered>
  );
}

// ── PDF: the pages one under another, with a page and zoom bar at the bottom ─────────────────────────────────
const ZOOMS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

// (also Classgrid Code's file preview, with the PDF's bytes: its panel can't load the file itself, and its pdf.js
// worker is started from a copy of the worker's code, the panel's files being on another address)
export function PdfView({ url, data, workerSrc }: { url?: string; data?: Uint8Array; workerSrc?: string }) {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc || pdfWorker; // shipped with the app, so PDFs open without internet
  const file = useMemo(() => (data ? { data: data.slice() } : url), [data, url]);
  const boxRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [typed, setTyped] = useState<string | null>(null);
  const [width, setWidth] = useState(600);
  const [zoom, setZoom] = useState<number | null>(null); // null = fit the width
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, box.clientWidth - 48)));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);
  // The page in view, while scrolling
  const onScroll = () => {
    const box = boxRef.current;
    if (!box) return;
    const mid = box.scrollTop + box.clientHeight / 3;
    let at = 1;
    pageRefs.current.forEach((el, i) => { if (el && el.offsetTop <= mid) at = i + 1; });
    setPage(at);
  };
  const go = (n: number) => {
    const to = Math.min(Math.max(1, n), pages || 1);
    pageRefs.current[to - 1]?.scrollIntoView({ block: "start" });
    setPage(to);
  };
  const BASE = 612; // a page's width in PDF points
  const fit = width / BASE;
  const scale = zoom ?? fit;
  const step = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOMS.find((z) => z > scale + 0.001) : [...ZOOMS].reverse().find((z) => z < scale - 0.001);
    if (next) setZoom(next);
  };

  if (failed) return <Centered><p className="text-sm text-muted-foreground">This PDF couldn't be shown. Open it with your computer's app instead.</p></Centered>;
  return (
    <div className="absolute inset-0">
      <div ref={boxRef} onScroll={onScroll} className="absolute inset-0 overflow-auto">
        <Document
          file={file}
          onLoadSuccess={({ numPages }) => setPages(numPages)}
          onLoadError={() => setFailed(true)}
          loading={<Centered><Spinner className="size-5" /></Centered>}
          className="flex flex-col items-center gap-4 px-6 pt-6 pb-24"
        >
          {Array.from({ length: pages }, (_, i) => (
            <div key={i} ref={(el) => { pageRefs.current[i] = el; }} className="shadow-md">
              <Page pageNumber={i + 1} width={BASE * scale} renderAnnotationLayer={false} loading={<div style={{ width: BASE * scale, height: BASE * scale * 1.3 }} className="bg-white" />} />
            </div>
          ))}
        </Document>
      </div>
      {pages > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur [&>*]:shrink-0">
          <button className={iconBtn} disabled={page <= 1} onClick={() => go(page - 1)} title="Previous page" aria-label="Previous page"><ChevronLeft className="size-4" /></button>
          <input
            data-no-ring
            value={typed ?? String(page)}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))}
            onBlur={() => setTyped(null)}
            onKeyDown={(e) => { if (e.key === "Enter") { go(Number(typed) || page); setTyped(null); e.currentTarget.blur(); } }}
            className="h-8 w-10 rounded-md border border-border bg-background text-center text-sm outline-none"
            aria-label="Page"
          />
          <span className="px-1 text-sm text-muted-foreground whitespace-nowrap select-none">/ {pages}</span>
          <button className={iconBtn} disabled={page >= pages} onClick={() => go(page + 1)} title="Next page" aria-label="Next page"><ChevronRight className="size-4" /></button>
          <span className="mx-1 h-5 w-px bg-border" />
          <button className={iconBtn} onClick={() => step(-1)} title="Zoom out" aria-label="Zoom out"><ZoomOut className="size-4" /></button>
          <span className="w-12 text-center text-sm tabular-nums">{Math.round(scale * 100)}%</span>
          <button className={iconBtn} onClick={() => step(1)} title="Zoom in" aria-label="Zoom in"><ZoomIn className="size-4" /></button>
          <button className={iconBtn} onClick={() => setZoom(null)} title="Fit to width" aria-label="Fit to width"><Maximize className="size-4" /></button>
        </div>
      )}
    </div>
  );
}

// ── Excel / CSV: each sheet as a table, the sheets as tabs at the bottom ─────────────────────────────────────
function SheetView({ url }: { url: string }) {
  const [book, setBook] = useState<{ names: string[]; rows: Record<string, (string | number)[][]> } | null>(null);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState(0);
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const XLSX = await import("xlsx");
        const buf = await (await fetch(url)).arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const rows: Record<string, (string | number)[][]> = {};
        for (const name of wb.SheetNames) {
          const ws = wb.Sheets[name];
          rows[name] = ws ? (XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as (string | number)[][]).slice(0, MAX_ROWS) : [];
        }
        if (!off) setBook({ names: wb.SheetNames, rows });
      } catch {
        if (!off) setFailed(true);
      }
    })();
    return () => { off = true; };
  }, [url]);

  if (failed) return <Centered><p className="text-sm text-muted-foreground">This sheet couldn't be shown. Open it with your computer's app instead.</p></Centered>;
  if (!book) return <Centered><Spinner className="size-5" /></Centered>;
  const name = book.names[sheet] ?? "";
  const rows = book.rows[name] || [];
  const cols = rows.reduce((n, r) => Math.max(n, r.length), 0);
  const letter = (i: number) => { let s = ""; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="border-collapse text-[12.5px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 min-w-10 border border-border bg-secondary px-2 py-1" />
              {Array.from({ length: cols }, (_, c) => <th key={c} className="min-w-24 border border-border bg-secondary px-2 py-1 font-medium text-muted-foreground">{letter(c)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="sticky left-0 border border-border bg-secondary px-2 py-1 text-right text-muted-foreground">{i + 1}</td>
                {Array.from({ length: cols }, (_, c) => <td key={c} className="max-w-[320px] truncate border border-border px-2 py-1" title={String(r[c] ?? "")}>{String(r[c] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-4 text-sm text-muted-foreground">This sheet is empty.</p>}
      </div>
      {book.names.length > 1 && (
        <div className="shrink-0 flex items-center gap-1 overflow-x-auto border-t border-border px-2 py-1 [scrollbar-width:none]">
          {book.names.map((n, i) => (
            <button key={n} onClick={() => setSheet(i)} className={`shrink-0 h-7 px-3 rounded-md text-[13px] ${i === sheet ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Word (.docx): its pages drawn like Word ──────────────────────────────────────────────────────────────────
function WordView({ url }: { url: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        const blob = await (await fetch(url)).blob();
        if (off || !boxRef.current) return;
        boxRef.current.innerHTML = "";
        await renderAsync(blob, boxRef.current, undefined, { className: "cg-docx", inWrapper: true, ignoreLastRenderedPageBreak: true });
        if (!off) setState("ready");
      } catch {
        if (!off) setState("failed");
      }
    })();
    return () => { off = true; };
  }, [url]);
  return (
    <div className="absolute inset-0 overflow-auto">
      {state === "loading" && <Centered><Spinner className="size-5" /></Centered>}
      {state === "failed" && <Centered><p className="text-sm text-muted-foreground">This document couldn't be shown. Open it with your computer's app instead.</p></Centered>}
      <div ref={boxRef} className="[&_.cg-docx-wrapper]:!bg-transparent [&_.cg-docx-wrapper]:!p-6" />
    </div>
  );
}

// ── Documents (.md) the agent writes: shown as a page, with a Source button for the raw text ─────────────────
// A link in a markdown file: another file next to it (like MEMORY.md's notes) opens in its own tab here, a web address
// opens in the user's browser; a click never sends the app's own window to that address (that reloaded the app)
function openMarkdownLink(href: string, fromFile: string) {
  const h = String(href || "").trim();
  if (!h || h.startsWith("#")) return;
  if (/^(https?:|mailto:)/i.test(h)) {
    const d = (window as unknown as { classgridDesktop?: { openExternal?: (u: string) => void } }).classgridDesktop;
    if (d?.openExternal) d.openExternal(h); else window.open(h, "_blank", "noopener");
    return;
  }
  let rel = h.split("#")[0] || "";
  try { rel = decodeURIComponent(rel); } catch { /* keep as is */ }
  if (!rel) return;
  const full = /^[A-Za-z]:[\\/]/.test(rel) ? rel : `${fromFile.replace(/[\\/][^\\/]*$/, "")}\\${rel}`;
  const parts: string[] = [];
  for (const piece of full.split(/[\\/]+/)) { if (piece === "..") parts.pop(); else if (piece && piece !== ".") parts.push(piece); }
  window.dispatchEvent(new CustomEvent(OPEN_LOCAL_FILE_EVENT, { detail: { path: parts.join("\\") } }));
}

function MarkdownView({ url, path }: { url: string; path: string }) {
  const [text, setText] = useState<string | null>(null);
  const [source, setSource] = useState(false);
  useEffect(() => {
    let off = false;
    fetch(url).then((r) => r.text()).then((t) => { if (!off) setText(t.replace(/^\uFEFF/, "")); }).catch(() => { if (!off) setText(""); });
    return () => { off = true; };
  }, [url]);
  if (text === null) return <Centered><Spinner className="size-5" /></Centered>;
  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      <div className="shrink-0 flex justify-end gap-1 px-3 pt-2">
        {["Page", "Source"].map((label) => (
          <button key={label} onClick={() => setSource(label === "Source")} className={`h-7 px-3 rounded-md text-[13px] ${source === (label === "Source") ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>
      {source ? (
        <pre className="flex-1 min-h-0 overflow-auto px-5 py-3 font-mono text-[12.5px] leading-5 whitespace-pre-wrap">{text}</pre>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-8 py-6">
          <article className="mx-auto max-w-3xl prose prose-sm dark:prose-invert prose-headings:font-semibold prose-a:text-sky-600 dark:prose-a:text-sky-400 prose-pre:bg-muted prose-pre:text-foreground prose-table:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{ a: ({ href, children }) => <a href={href} onClick={(e) => { e.preventDefault(); openMarkdownLink(String(href || ""), path); }}>{children}</a> }}>{text}</ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}

// ── Text and code: with line numbers ─────────────────────────────────────────────────────────────────────────
function TextView({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    fetch(url).then((r) => r.text()).then((t) => { if (!off) setText(t.replace(/^﻿/, "")); }).catch(() => { if (!off) setText(""); });
    return () => { off = true; };
  }, [url]);
  if (text === null) return <Centered><Spinner className="size-5" /></Centered>;
  if (text.slice(0, 8000).includes("\u0000")) return <Centered><p className="text-sm text-muted-foreground">This file isn't text, so it opens in your computer's own app.</p></Centered>;
  const lines = text.split(/\r?\n/);
  return (
    <div className="absolute inset-0 overflow-auto bg-background">
      <pre className="min-w-max py-3 font-mono text-[12.5px] leading-5">
        {lines.map((l, i) => (
          <div key={i} className="flex">
            <span className="sticky left-0 w-12 shrink-0 select-none bg-background pr-4 text-right text-muted-foreground/60">{i + 1}</span>
            <span className="pr-6 whitespace-pre">{l}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
