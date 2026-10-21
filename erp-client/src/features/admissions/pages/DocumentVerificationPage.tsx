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

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import {  Search, FileText, CheckCircle, XCircle, AlertCircle, Eye, Shield, Clock, Printer } from "lucide-react";

import { useApplications } from "../../admissions/queries/useApplications";
import { getApplicationById, verifyDocument, updateApplicationStage } from "../../admissions/api";
import { Spinner } from "@/components/marketing_ui/spinner";
import { navigateWithRescue } from "@/lib/rescue";

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function DocumentVerificationPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Fetch only applications that are under verification
  const { data: appsData, isLoading: isAppsLoading } = useApplications({
    status: "under_verification",
    limit: 100, // Load a sizable queue
  });

  const applications = useMemo(() => {
    let list = appsData?.applications || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a: any) => 
        a.full_name?.toLowerCase().includes(q) || 
        a.en_number?.toLowerCase().includes(q) ||
        a.phone?.includes(q)
      );
    }
    return list;
  }, [appsData, search]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "full_name",
      header: "Applicant",
      cell: ({ row }) => (
        <div >
          <div name={row.original.full_name} size="sm" />
          <div>
            <div className=" font-semibold">{row.original.full_name}</div>
            <small className=" font-mono text-muted-foreground">
              {row.original.en_number ? `EN: ${row.original.en_number}` : (row.original.phone || "—")}
            </small>
          </div>
        </div>
      ) },
    {
      accessorKey: "createdAt",
      header: "Applied On",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span>{row.original.category || "General"}</span> },
    {
      accessorKey: "status",
      header: "Status",
      cell: () => <div variant="warning">Pending Verification</div> },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div 
          variant="outline" 
          size="sm"
          onClick={() => setSelectedAppId(row.original._id)}
          className="gap-2"
        >
          <Shield className="w-4 h-4 text-primary" />
          Verify Docs
        </div>
      ) },
  ], []);

  return (
    <div
      title="Document Verification"
      description="Review and verify applicant documents to advance them to the merit list."
      breadcrumbs={[{ label: "Admissions" }, { label: "Documents" }]}
    >
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div noPadding>
          <div className="p-4 border-b border-border bg-card flex items-center justify-between rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Verification Queue</h3>
                <p className="text-sm text-muted-foreground">{applications.length} applications pending</p>
              </div>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <div
                placeholder="Search queue..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="min-h-[400px]">
            {isAppsLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-muted-foreground h-full">
                <Spinner className="w-8 h-8  mb-4 text-primary" />
                <p>Loading queue...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There are no applications pending document verification.
                </p>
              </div>
            ) : (
              <div
                columns={columns}
                data={applications}
                pageSize={10}
              />
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedAppId && (
          <VerificationModal 
            applicationId={selectedAppId} 
            onClose={() => setSelectedAppId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Verification Modal Component ──

function VerificationModal({ applicationId, onClose }: { applicationId: string; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: appData, isLoading } = useQuery({
    queryKey: ["admission-application-print", applicationId],
    queryFn: () => getApplicationById(applicationId) });

  const printData = (appData as any)?.print_data;
  const applicant = printData?.applicant;
  const documents = printData?.documents || [];
  const parentDetails = printData?.parent_details || {};
  const signatureLines = printData?.signature_lines || [];

  const verifyMutation = useMutation({
    mutationFn: ({ docName, action }: { docName: string, action: "verified" | "rejected" }) => 
      verifyDocument(applicationId, docName, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admission-application-print", applicationId] });
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: () => updateApplicationStage(applicationId, { status: "verified", comment: "All documents verified" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admission-applications"] });
      onClose();
    }
  });

  const allVerified = documents.length > 0 && documents.every((d: any) => d.status === "verified");

  return (
    <div open={true} onOpenChange={(open) => !open && onClose()}>
      <div title="Verify Documents" className="max-w-3xl p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Spinner className="w-8 h-8  text-primary" /></div>
        ) : !printData ? (
          <div className="p-12 text-center text-destructive">Failed to load applicant data.</div>
        ) : (
          <div className="flex flex-col h-[80vh] max-h-[800px]">
            {/* Header */}
            <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-foreground">{applicant?.full_name}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span>{applicant?.en_number ? `EN: ${applicant.en_number}` : applicant?.phone}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{applicant?.category || "General"}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <div variant="warning">Under Verification</div>
                </div>
              </div>
              <div variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Print
              </div>
            </div>

            {/* Document List */}
            <div className="p-6 overflow-y-auto flex-1 bg-card">
              <div className="admission-printout">
                <div className="admission-printout__header">
                  <div>
                    <p className="admission-printout__eyebrow">Admission Application Printout</p>
                    <h3 className="admission-printout__title">{applicant?.full_name}</h3>
                  </div>
                  <p className="admission-printout__id">{String(printData?.application_id || applicationId)}</p>
                </div>

                <div className="admission-printout__grid">
                  <div>
                    <span>Phone</span>
                    <strong>{applicant?.phone || "Not provided"}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{applicant?.email || "Not provided"}</strong>
                  </div>
                  <div>
                    <span>Father</span>
                    <strong>{parentDetails.father_name || "Not provided"}</strong>
                  </div>
                  <div>
                    <span>Mother</span>
                    <strong>{parentDetails.mother_name || "Not provided"}</strong>
                  </div>
                </div>

                <p className="admission-printout__declaration">
                  {printData?.print_declaration || "I confirm that the admission details and uploaded documents are correct to the best of my knowledge."}
                </p>

                <div className="admission-printout__signatures">
                  {signatureLines.map((line: any, index: number) => (
                    <div className="admission-printout__signature" key={`${line.label}-${index}`}>
                      <div className="admission-printout__signature-line" />
                      <strong>{line.label}</strong>
                      <span>{line.signer}</span>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="font-semibold text-foreground mb-4">Uploaded Documents</h3>
              
              {documents.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-lg text-muted-foreground">
                  No documents found for this application.
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-foreground capitalize">
                            {doc.name.replace(/_/g, " ")}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {doc.status === "verified" ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                <CheckCircle className="w-3 h-3" /> Verified
                              </span>
                            ) : doc.status === "rejected" ? (
                              <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigateWithRescue(`/api/admission/docs/view?path=admissions/temp/${applicationId}/${doc.name}.pdf`, { newTab: true })}
                        >
                          <Eye className="w-4 h-4 mr-2" /> View
                        </div>
                        
                        {doc.status !== "verified" && (
                          <div 
                            variant="default"
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => verifyMutation.mutate({ docName: doc.name, action: "verified" })}
                            disabled={verifyMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                          </div>
                        )}
                        
                        {doc.status !== "rejected" && (
                          <div 
                            variant="destructive"
                            size="sm"
                            onClick={() => verifyMutation.mutate({ docName: doc.name, action: "rejected" })}
                            disabled={verifyMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="justify-between">
              <div variant="outline" onClick={onClose}>Close</div>
              <div 
                variant="default"
                disabled={!allVerified || finalizeMutation.isPending}
                onClick={() => finalizeMutation.mutate()}
                className="gap-2"
              >
                {finalizeMutation.isPending && <Spinner className="w-4 h-4 " />}
                Mark Application as Verified
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
