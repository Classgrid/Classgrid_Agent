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

import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import { getPresignedUrls } from "../services/chatApi";
import axios from "axios";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UploadTask {
  threadId: string;
  tempId: string;        // matches the optimistic message id
  files: File[];
  message: string;
  replyTo: any;
  options: any;
  progress: number;      // 0-100
  status: 'uploading' | 'done' | 'failed';
  error?: string;
  // Resolved attachments after upload — used to finalize the server call
  preuploadedAttachments?: any[];
}

interface UploadContextValue {
  uploads: Record<string, UploadTask[]>; // keyed by threadId
  startUpload: (
    threadId: string,
    tempId: string,
    files: File[],
    message: string,
    replyTo: any,
    options: any,
    onDone: (attachments: any[]) => void,
    onFail: (tempId: string, error: string) => void,
  ) => void;
  retryUpload: (threadId: string, tempId: string) => void;
  clearUpload: (threadId: string, tempId: string) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const UploadContext = createContext<UploadContextValue | null>(null);

export function useUploadContext() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUploadContext must be used inside UploadProvider");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<Record<string, UploadTask[]>>({});

  // Store callbacks in a ref so we don't lose them across re-renders
  const callbacksRef = useRef<Record<string, {
    onDone: (attachments: any[]) => void;
    onFail: (tempId: string, error: string) => void;
  }>>({});

  const setTaskField = useCallback((threadId: string, tempId: string, update: Partial<UploadTask>) => {
    setUploads(prev => {
      const threadUploads = prev[threadId] || [];
      return {
        ...prev,
        [threadId]: threadUploads.map(t => t.tempId === tempId ? { ...t, ...update } : t),
      };
    });
  }, []);

  const doUpload = useCallback(async (threadId: string, tempId: string, files: File[], message: string, replyTo: any, options: any) => {
    const callbackKey = `${threadId}:${tempId}`;
    const callbacks = callbacksRef.current[callbackKey];

    try {
      // Step 1: Get presigned URLs
      const fileData = files.map(f => ({
        fileName: f.name || 'upload.file',
        fileType: f.type || 'application/octet-stream',
        fileSize: f.size,
      }));
      const urls = await getPresignedUrls(threadId, fileData);

      // Step 2: Track cumulative progress across all files
      const fileSizes = files.map(f => f.size);
      const totalSize = fileSizes.reduce((a, b) => a + b, 0) || 1;
      const loadedPerFile: number[] = new Array(files.length).fill(0);

      const uploadPromises = files.map(async (file, index) => {
        const urlInfo = urls[index];
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", urlInfo.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", urlInfo.fileType);
          
          xhr.upload.onprogress = (evt) => {
            loadedPerFile[index] = evt.loaded;
            const totalLoaded = loadedPerFile.reduce((a, b) => a + b, 0);
            // Cap at 99% until fully complete
            const pct = Math.min(99, Math.round((totalLoaded / totalSize) * 100));
            setTaskField(threadId, tempId, { progress: pct });
          };
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
            else reject(new Error(`Upload failed: ${xhr.status}`));
          };
          
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(file);
        });
        
        return {
          file_url: urlInfo.publicUrl,
          file_name: urlInfo.fileName,
          file_type: urlInfo.fileType,
          file_size: urlInfo.fileSize,
        };
      });

      const preuploadedAttachments = await Promise.all(uploadPromises);

      // Mark done at 100%
      setTaskField(threadId, tempId, { progress: 100, status: 'done', preuploadedAttachments });
      callbacks?.onDone(preuploadedAttachments);

    } catch (err: any) {
      const errMsg = err?.message || "Upload failed";
      setTaskField(threadId, tempId, { status: 'failed', error: errMsg });
      callbacks?.onFail(tempId, errMsg);
    }
  }, [setTaskField]);

  const startUpload = useCallback((
    threadId: string,
    tempId: string,
    files: File[],
    message: string,
    replyTo: any,
    options: any,
    onDone: (attachments: any[]) => void,
    onFail: (tempId: string, error: string) => void,
  ) => {
    const task: UploadTask = {
      threadId, tempId, files, message, replyTo, options,
      progress: 0, status: 'uploading',
    };

    // Register callbacks
    const callbackKey = `${threadId}:${tempId}`;
    callbacksRef.current[callbackKey] = { onDone, onFail };

    // Add to state
    setUploads(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), task],
    }));

    // Start the upload immediately (runs globally, not tied to any component lifecycle)
    doUpload(threadId, tempId, files, message, replyTo, options);
  }, [doUpload]);

  const retryUpload = useCallback((threadId: string, tempId: string) => {
    setUploads(prev => {
      const task = (prev[threadId] || []).find(t => t.tempId === tempId);
      if (!task) return prev;
      const updated = { ...task, progress: 0, status: 'uploading' as const, error: undefined };
      doUpload(threadId, tempId, task.files, task.message, task.replyTo, task.options);
      return {
        ...prev,
        [threadId]: (prev[threadId] || []).map(t => t.tempId === tempId ? updated : t),
      };
    });
  }, [doUpload]);

  const clearUpload = useCallback((threadId: string, tempId: string) => {
    setUploads(prev => ({
      ...prev,
      [threadId]: (prev[threadId] || []).filter(t => t.tempId !== tempId),
    }));
    const callbackKey = `${threadId}:${tempId}`;
    delete callbacksRef.current[callbackKey];
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, startUpload, retryUpload, clearUpload }}>
      {children}
    </UploadContext.Provider>
  );
}
