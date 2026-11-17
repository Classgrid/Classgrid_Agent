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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText, Download, ExternalLink } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Ensure worker is set up for Vite
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfAttachmentProps {
  url: string;
  filename: string;
  size: number;
  isSending?: boolean;
  uploadProgress?: number;
  onOpen?: () => void;
}

export function PdfAttachment({ url, filename, size, isSending, uploadProgress, onOpen }: PdfAttachmentProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<boolean>(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col rounded-xl overflow-hidden bg-black/5 dark:bg-[#202C33] border border-black/5 dark:border-white/5 w-[300px] relative">
      {/* Thumbnail Preview Area */}
      <div className="w-full bg-white relative flex justify-center items-center min-h-[160px] overflow-hidden">
        {!error ? (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => setError(true)}
            loading={
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <Spinner className="w-6 h-6 text-gray-400" />
              </div>
            }
          >
            <Page
              pageNumber={1}
              width={300}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-sm"
            />
          </Document>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-gray-100 text-gray-500 w-full h-[160px]">
            <FileText className="w-12 h-12 mb-2 text-red-500/50" />
            <span className="text-sm font-medium">Preview not available</span>
          </div>
        )}
      </div>

      {/* Details Area */}
      <div className="p-3 bg-transparent">
        <div className="flex items-start gap-3">
          <div className="bg-red-500 text-white rounded shrink-0 w-10 h-10 flex items-center justify-center shadow-sm">
            <span className="text-xs font-bold tracking-wider">PDF</span>
          </div>
          
          <div className="flex flex-col min-w-0 justify-center">
            <span className="text-[15px] font-medium text-foreground truncate block">
              {filename}
            </span>
            <span className="text-[13px] text-muted-foreground block mt-0.5">
              {numPages ? `${numPages} page${numPages !== 1 ? "s" : ""} • ` : ""}
              PDF • {formatSize(size)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-black/5 dark:border-white/10 bg-transparent">
        {onOpen ? (
          <button 
            type="button"
            onClick={onOpen}
            className="text-emerald-500 hover:text-emerald-400 text-[14px] font-medium transition-colors"
          >
            Open
          </button>
        ) : (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 text-[14px] font-medium transition-colors"
          >
            Open
          </a>
        )}
        <a 
          href={url} 
          download={filename}
          className="text-emerald-500 hover:text-emerald-400 text-[14px] font-medium transition-colors"
        >
          Save as...
        </a>
      </div>
      
      {/* Uploading — Spinner with percentage */}
      {isSending && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 rounded-xl gap-2">
          <Spinner className="w-10 h-10 text-white" />
          <span className="text-white text-sm font-bold">{uploadProgress || 0}%</span>
        </div>
      )}
    </div>
  );
}
