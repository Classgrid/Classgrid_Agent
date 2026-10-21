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

import React, { useState } from "react";
import {  UploadCloud, FileText, CheckCircle, AlertCircle } from "lucide-react";

import { useSchemes, useUploadMarks, ResultScheme } from "@/features/results/queries/useResultSchemes";
import { Spinner } from "@/components/marketing_ui/spinner";

export function ExamGradingPage() {
  const { data: schemes, isLoading } = useSchemes();
  const [selectedScheme, setSelectedScheme] = useState<ResultScheme | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size={36} className=" text-primary" />
        <p className="text-muted-foreground font-medium">Loading Active Examinations...</p>
      </div>
    );
  }

  // Faculty should only see schemes that are in 'draft' or 'generated', not locked/published unless we allow view-only.
  // For uploading, definitely not locked.
  const activeSchemes = schemes?.filter((s) => s.status !== "locked" && s.status !== "published") || [];

  return (
    <div className=" max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6 mb-8">
        <p className="text-sm font-medium text-muted-foreground">Faculty Dashboard</p>
        <h1 className="text-2xl font-bold tracking-tight">Exam Grading & Marks Upload</h1>
      </header>

      {!selectedScheme ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Select an Examination to Grade</h2>
          {activeSchemes.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg bg-card">
              <p className="text-muted-foreground">No active examinations available for grading.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSchemes.map((scheme) => (
                <div 
                  key={scheme.id} 
                  className=" p-5 cursor-pointer hover:border-primary/50 transition-colors flex justify-between items-center"
                  onClick={() => setSelectedScheme(scheme)}
                >
                  <div>
                    <h3 className="font-semibold text-lg">{scheme.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {scheme.academic_year} • Semester {scheme.semester}
                    </p>
                  </div>
                  <div variant="secondary" size="sm">Select</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <MarksUploadWorkspace scheme={selectedScheme} onBack={() => setSelectedScheme(null)} />
      )}
    </div>
  );
}

function MarksUploadWorkspace({ scheme, onBack }: { scheme: ResultScheme; onBack: () => void }) {
  const uploadMutation = useUploadMarks();
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success?: number; failed?: number; errors?: any[] } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const processFile = async (file: File) => {
    // In a real app, we'd use PapaParse here to parse the CSV to JSON rows.
    // For now, we simulate parsing and trigger the actual mutation.
    setUploadStatus(null);
    
    const text = await file.text();
    // Super simple CSV parser for demonstration that actually maps to the API format
    const lines = text.trim().split('\n');
    if (lines.length < 2) return;
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });
      rows.push(row);
    }

    uploadMutation.mutate({ schemeId: scheme.id, rows }, {
      onSuccess: (data) => {
        setUploadStatus({ success: data.success, failed: data.failed, errors: data.errors });
      },
      onError: (err: any) => {
        setUploadStatus({ errors: [{ reason: err.response?.data?.message || err.message }] });
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center">
          <FileText className="mr-2 text-primary" /> {scheme.name}
        </h2>
        <div variant="secondary" onClick={onBack}>← Back to Exams</div>
      </div>

      <div 
        className={`border-2 border-dashed rounded-xl p-16 text-center transition-all ${
          dragActive ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <UploadCloud className={`mx-auto h-16 w-16 mb-4 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
        <h3 className="text-xl font-medium mb-2">Drag & Drop Marks CSV here</h3>
        <p className="text-muted-foreground">
          Format required: PRN, [Subject Code 1], [Subject Code 2]... <br />
          Mark absent students as "AB"
        </p>
        
        {uploadMutation.isPending && (
          <div className="mt-6 flex items-center justify-center text-primary">
            <Spinner className=" mr-2" /> Uploading and validating to database...
          </div>
        )}
      </div>

      {uploadStatus && (
        <div className={`p-4 rounded-lg border ${uploadStatus.errors?.length ? 'bg-danger/5 border-danger/20' : 'bg-success/5 border-success/20'}`}>
          <div className="flex items-start">
            {uploadStatus.errors?.length ? (
              <AlertCircle className="text-danger mt-0.5 mr-3 shrink-0" />
            ) : (
              <CheckCircle className="text-success mt-0.5 mr-3 shrink-0" />
            )}
            <div>
              <h4 className="font-semibold">{uploadStatus.errors?.length ? 'Upload Completed with Errors' : 'Upload Successful'}</h4>
              <p className="text-sm mt-1">
                Successfully saved marks for {uploadStatus.success || 0} students.
                {uploadStatus.failed ? ` Failed for ${uploadStatus.failed} students.` : ''}
              </p>
              
              {uploadStatus.errors && uploadStatus.errors.length > 0 && (
                <ul className="mt-3 text-sm text-danger space-y-1 list-disc list-inside">
                  {uploadStatus.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err.prn ? `[PRN: ${err.prn}] ` : ''}{err.reason}</li>
                  ))}
                  {uploadStatus.errors.length > 5 && (
                    <li className="text-muted-foreground italic">...and {uploadStatus.errors.length - 5} more errors</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
