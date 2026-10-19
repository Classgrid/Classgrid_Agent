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

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
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

import React, { useState } from "react";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/marketing_ui/dialog";
import { FileUpload } from "@/components/marketing_ui/file-upload";
import { useUploadFile } from "../queries/useStorage";
import { ProgressOverlay } from "@/components/marketing_ui/ProgressOverlay";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefix: string;
}

export function FileUploadModal({ isOpen, onClose, prefix }: FileUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const uploadFileMutation = useUploadFile();

  const handleFilesSelected = (files: File[]) => {
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setCustomFileName(files[0].name);
    } else {
      setSelectedFile(null);
      setCustomFileName("");
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCustomFileName("");
    onClose();
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    let fileToUpload = selectedFile;
    const finalName = customFileName.trim() || selectedFile.name;
    
    if (finalName !== selectedFile.name) {
      fileToUpload = new File([selectedFile], finalName, { type: selectedFile.type });
    }

    uploadFileMutation.mutate(
      { file: fileToUpload, prefix },
      {
        onSuccess: () => {
          handleClose();
        }
      }
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Select a file to upload to <span className="font-mono text-xs">{prefix || "root/"}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {!selectedFile ? (
              <FileUpload 
                onFilesSelected={handleFilesSelected}
                maxFiles={1}
                maxSizeMB={2000} // Our backend limit is 2GB
                title="Drop a file here to upload"
                description="Supports all file types up to 2GB"
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center justify-between">
                  <div className="truncate flex-1 font-medium">
                    {selectedFile.name}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedFile(null);
                      setCustomFileName("");
                    }}
                  >
                    Change File
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rename file before uploading (optional)</label>
                  <Input 
                    value={customFileName} 
                    onChange={(e) => setCustomFileName(e.target.value)} 
                    placeholder="Enter a new name"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploadFileMutation.isPending}
            >
              {uploadFileMutation.isPending ? "Starting Upload..." : "Upload File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {uploadFileMutation.isPending && (
        <ProgressOverlay 
          visible={true}
          title="Uploading File"
          message={`Uploading ${customFileName || selectedFile?.name} to S3...`}
          isIndeterminate={true} // For V1 we just show indeterminate since axios upload progress is not fully hooked to UI state
        />
      )}
    </>
  );
}
