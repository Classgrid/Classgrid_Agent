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

import React, { useCallback, useState, useRef } from "react";
import { UploadCloud, File, X, CheckCircle2 } from "lucide-react";

export interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  title?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFilesSelected,
  accept = "*",
  maxFiles = 1,
  maxSizeMB = 5,
  title = "Click to upload or drag and drop",
  description = "SVG, PNG, JPG or PDF (max 5MB)",
  className = "",
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = (files: FileList | File[]) => {
    if (disabled) return;
    setError(null);

    const fileArray = Array.from(files);
    
    // Check Max Files
    if (fileArray.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} file(s).`);
      return;
    }

    // Check Max Size
    const overSizeFiles = fileArray.filter(f => f.size > maxSizeMB * 1024 * 1024);
    if (overSizeFiles.length > 0) {
      setError(`File size cannot exceed ${maxSizeMB}MB.`);
      return;
    }

    setSelectedFiles(fileArray);
    onFilesSelected(fileArray);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [disabled, maxFiles, maxSizeMB]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (indexToRemove: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== indexToRemove);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
    
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Dropzone Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter} // DragOver must also be prevented to allow drop
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center w-full min-h-[160px] p-6 
          border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ease-in-out group
          ${
            disabled
              ? "opacity-60 cursor-not-allowed border-border bg-muted/50"
              : isDragging
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 scale-[1.02]"
              : "border-border hover:border-emerald-400 hover:bg-muted/30 bg-card"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        
        <div className={`
          p-4 rounded-full mb-3 transition-colors duration-300
          ${isDragging ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30"}
        `}>
          <UploadCloud className={`w-8 h-8 ${isDragging ? "animate-bounce" : ""}`} />
        </div>
        
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        {/* Glowing border effect when dragging */}
        {isDragging && (
          <div className="absolute inset-0 border-2 border-emerald-500 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] pointer-events-none animate-pulse" />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-xs font-medium text-red-500 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, idx) => (
            <div 
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between p-3 text-sm bg-card border border-emerald-200 dark:border-emerald-900 rounded-lg animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-md shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="truncate">
                  <p className="font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                disabled={disabled}
                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
