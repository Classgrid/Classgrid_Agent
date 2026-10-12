// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */


import React, { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trash2,
  Download,
  FileText,
  FileImage,
  File,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Video,
  Music,
} from "lucide-react";

import { CustomVideoPlayer } from "@/features/shared/components/CustomVideoPlayer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FilePreviewSource {
  /** Display name of the file */
  name: string;
  /** Either a File object (local) or a CDN URL string (remote) */
  src: File | string;
  /** MIME type — inferred from File if not provided */
  mimeType?: string;
}

interface FilePreviewModalProps {
  file: FilePreviewSource | null;
  onClose: () => void;
  /** Optional: show a delete button and call this when clicked */
  onDelete?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMimeType(file: FilePreviewSource): string {
  if (file.mimeType) return file.mimeType;
  if (typeof file.src !== "string") return (file.src as { type?: string }).type || "";
  
  // Try to get extension from name, fallback to src URL if name has no extension
  let nameStr = file.name || "";
  if (!nameStr.includes(".")) {
    nameStr = file.src.split("?")[0] || "";
  }
  const ext = nameStr.split(".").pop()?.toLowerCase() || "";
  
  const map: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    avif: "image/avif",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg", mov: "video/quicktime",
    mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
  };
  return map[ext] || "application/octet-stream";
}

function isImage(mime: string) { return mime.startsWith("image/"); }
function isVideo(mime: string) { return mime.startsWith("video/"); }
function isAudio(mime: string) { return mime.startsWith("audio/"); }
function isPDF(mime: string) { return mime === "application/pdf"; }
function isText(mime: string) { return mime.startsWith("text/"); }
function isOfficeDoc(mime: string) {
  return [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel"
  ].includes(mime);
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FilePreviewModal({ file, onClose, onDelete }: FilePreviewModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);

  const mime = file ? getMimeType(file) : "";
  const srcUrl = typeof file?.src === "string" ? file.src : objectUrl;

  // Create object URL for File objects
  useEffect(() => {
    if (!file || typeof file.src === "string") { setObjectUrl(null); return; }
    const url = URL.createObjectURL(file.src as Blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Load text files inline
  useEffect(() => {
    if (!file || !isText(mime)) { setTextContent(null); return; }
    if (typeof file.src !== "string") {
      (file.src as Blob).text().then(setTextContent);
    } else {
      fetch(file.src).then(r => r.text()).then(setTextContent).catch(() => setTextContent(null));
    }
  }, [file, mime]);

  // Reset zoom/rotation when file changes
  useEffect(() => { setZoom(1); setRotation(0); }, [file]);

  const previewRef = useRef<HTMLDivElement | null>(null);

  // Keyboard handlers (captured on window: Escape closes only this preview, not a dialog it was opened from)
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    if (e.key === "+" || e.key === "=") setZoom(z => Math.min(z + 0.25, 3));
    if (e.key === "-") setZoom(z => Math.max(z - 0.25, 0.25));
  }, [onClose]);

  useEffect(() => {
    if (!file) return;
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [file, handleKey]);

  // Presses inside the preview never count as "outside" clicks for a dialog underneath (e.g. Leave feedback),
  // which would otherwise close and lose what was typed. Clicks still reach the preview as usual.
  useEffect(() => {
    if (!file) return;
    const keepInsidePreview = (e: Event) => {
      if (previewRef.current && e.target instanceof Node && previewRef.current.contains(e.target)) e.stopPropagation();
    };
    const types = ["pointerdown", "mousedown", "touchstart"] as const;
    types.forEach((t) => window.addEventListener(t, keepInsidePreview, true));
    return () => types.forEach((t) => window.removeEventListener(t, keepInsidePreview, true));
  }, [file]);

  const handleDownload = () => {
    if (!srcUrl && !file) return;
    const a = document.createElement("a");
    a.href = srcUrl || "";
    a.download = file?.name || "download";
    a.click();
  };

  if (!file) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="file-preview-backdrop"
        ref={previewRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[10050] flex flex-col bg-white/95 dark:bg-black backdrop-blur-md"
        onClick={onClose}
      >
        {/* ── Header bar ── */}
        <div
          className="relative z-10 flex items-center justify-between px-5 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* File info */}
          <div className="flex items-center gap-3 min-w-0">
            {isImage(mime) ? (
              <FileImage className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : isPDF(mime) ? (
              <FileText className="w-5 h-5 text-red-400 shrink-0" />
            ) : isVideo(mime) ? (
              <Video className="w-5 h-5 text-blue-400 shrink-0" />
            ) : isAudio(mime) ? (
              <Music className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <File className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-[300px]">{file.name}</p>
              {typeof file.src !== "string" && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatSize((file.src as { size: number }).size)}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom controls — images only */}
            {isImage(mime) && (
              <>
                <button
                  onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
                  title="Zoom out"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                  title="Zoom in"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  title="Rotate"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 mx-1" />
              </>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              title="Download"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-600 hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Delete (optional) */}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete file"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-red-600 hover:text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Content area ── */}
        <div
          className="flex-1 flex items-center justify-center overflow-auto p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image viewer */}
          {isImage(mime) && srcUrl && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={srcUrl}
                alt={file.name}
                draggable={false}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease",
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            </motion.div>
          )}

          {/* PDF viewer */}
          {isPDF(mime) && srcUrl && (
            <iframe
              src={srcUrl}
              title={file.name}
              className="w-full max-w-4xl h-[80vh] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white"
            />
          )}

          {/* Office Doc viewer (Public URLs only) */}
          {isOfficeDoc(mime) && srcUrl && !srcUrl.startsWith("blob:") && (
            <div className="w-full max-w-5xl h-[85vh] bg-white rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(srcUrl)}`}
                title={file.name}
                className="w-full flex-1 border-0"
              />
            </div>
          )}

          {/* Plain text viewer */}
          {isText(mime) && textContent !== null && (
            <div className="w-full max-w-3xl max-h-[80vh] overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 shadow-sm">
              <pre className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed">
                {textContent}
              </pre>
            </div>
          )}

          {/* Video viewer */}
          {isVideo(mime) && srcUrl && (
            <div className="w-full max-w-4xl h-[80vh] rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-black flex items-center justify-center shadow-xl">
              <CustomVideoPlayer url={srcUrl} title={file.name} />
            </div>
          )}

          {/* Audio viewer */}
          {isAudio(mime) && srcUrl && (
            <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Music className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-zinc-900 dark:text-white font-semibold text-lg text-center w-full truncate px-2">{file.name}</p>
              <audio controls src={srcUrl} className="w-full h-12" />
            </div>
          )}

          {/* Unsupported file type (or local office docs) */}
          {!isImage(mime) && !isPDF(mime) && !isText(mime) && !isVideo(mime) && !isAudio(mime) && !(isOfficeDoc(mime) && srcUrl && !srcUrl.startsWith("blob:")) && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                <File className="w-10 h-10 text-zinc-500 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-zinc-900 dark:text-white font-semibold text-lg mb-1">{file.name}</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  This file type cannot be previewed directly.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download file
              </button>
            </div>
          )}
        </div>

        {/* ── Keyboard hint ── */}
        <div className="shrink-0 text-center py-2 text-[10px] text-zinc-500 dark:text-zinc-600 select-none">
          {isImage(mime) ? "Scroll to zoom · + / − keys · Esc to close" : "Esc to close"}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
