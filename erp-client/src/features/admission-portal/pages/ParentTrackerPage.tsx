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

import { Input } from "@/components/marketing_ui/input";
import { useState } from "react";
import { useParams } from "react-router-dom";
import {  Phone, ArrowRight, CheckCircle2, Clock, FileText, CreditCard, Download } from "lucide-react";
import { parentLogin, getParentStatus, getParentDocuments } from "../api";
import { useEngineConfig } from "../queries/useAdmissionEngine";

import type { ApplicationState } from "../types";

import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";

// ═══════════════════════════════════════════════════════════════
// ParentTrackerPage — Public parent portal for tracking child's
// admission status. Authenticates via phone OTP.
//
// Pipeline: Applied → Verified → Selected → Fee → Enrolled
// Shows: stage progress, document checklist, fee payment link
// ═══════════════════════════════════════════════════════════════

const PIPELINE_STAGES = [
  { key: "applied", label: "Applied", icon: FileText },
  { key: "under_verification", label: "Verified", icon: CheckCircle2 },
  { key: "fee_pending", label: "Selected", icon: CreditCard },
  { key: "enrolled", label: "Enrolled", icon: CheckCircle2 },
];

function getStageIndex(status: string): number {
  if (status === "enrolled") return 3;
  if (status === "fee_pending" || status === "allotted" || status === "confirmed") return 2;
  if (status === "under_verification" || status === "verified") return 1;
  if (status === "waitlisted") return 1; // Shown between verified and selected
  return 0;
}

export function ParentTrackerPage() {
  const { orgId } = useParams();
  const { data: engineConfig, isLoading: configLoading } = useEngineConfig(orgId);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [appData, setAppData] = useState<ApplicationState | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await parentLogin(phone, orgId!);
      if (result.application_id) {
        // Store parent token
        if (result.token) localStorage.setItem("parent_token", result.token);

        // Fetch status and documents
        const [statusRes, docsRes] = await Promise.all([
          getParentStatus(result.application_id),
          getParentDocuments(result.application_id),
        ]);
        setAppData(statusRes.application || statusRes);
        setDocuments(docsRes.documents || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Phone number not found. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (configLoading) {
    return (
      <div >
        <Spinner size={32}  />
      </div>
    );
  }

  return (
    <div >
      <div >

        <header >
          <h1 >
            {engineConfig?.organization || "Parent Portal"}
          </h1>
          <p >Track your child's admission status</p>
        </header>

        {/* ── Login Form ── */}
        {!appData && (
          <div >
            <h2 >Verify Your Phone Number</h2>
            
            {error && <div ><div variant="danger" title="Error">{error}</div></div>}
            
            <form onSubmit={handleLogin} >
              <div >
                <label >Registered Mobile Number</label>
                <div >
                  <Phone size={16}  />
                  <Input type="tel" required  
                    placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading}
                  />
                </div>
              </div>
              <Button type="submit" variant="default" disabled={loading}>
                {loading ? <Spinner size={16}  /> : "View Status"} <ArrowRight size={16} />
              </Button>
            </form>
          </div>
        )}

        {/* ── Status Dashboard ── */}
        {appData && (
          <div >

            {/* Student Info */}
            <div >
              <div >
                <div>
                  <div >{appData.full_name}</div>
                  <div >
                    {appData.en_number || appData.phone || appData.email}
                  </div>
                </div>
                <div variant={appData.status === "enrolled" ? "success" : appData.status === "rejected" ? "danger" : "info"}>
                  {appData.status.replace(/_/g, " ")}
                </div>
              </div>
            </div>

            {/* Waitlist Alert */}
            {appData.status === "waitlisted" && (
              <div variant="warning" title={`Waitlisted — Position WL-${appData.waitlist_number ?? "?"}`}>
                Your child is currently on the waitlist. You will be notified when a seat becomes available.
              </div>
            )}

            {/* Fee Pending Alert */}
            {appData.status === "fee_pending" && (
              <div variant="warning" title="Action Required: Fee Payment">
                Your child has been selected! Please complete the fee payment to confirm admission.
                {appData.fee_payment_deadline && (
                  <div >
                    Deadline: {new Date(appData.fee_payment_deadline).toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            )}

            {/* Visual Pipeline */}
            <div >
              <h3 >Application Progress</h3>
              <div >
                {PIPELINE_STAGES.map((stage, idx) => {
                  const currentIdx = getStageIndex(appData.status);
                  const isComplete = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  const Icon = stage.icon;

                  return (
                    <div key={stage.key} >
                      <div >
                        <div >
                          <Icon size={16} />
                        </div>
                        <span >
                          {stage.label}
                        </span>
                      </div>
                      {idx < PIPELINE_STAGES.length - 1 && (
                        <div  />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document Checklist */}
            {documents.length > 0 && (
              <div >
                <h3 >Document Status</h3>
                <div >
                  {documents.map((doc: any, i: number) => (
                    <div key={i} >
                      <span >
                        {(doc.name || "").replace(/_/g, " ")}
                      </span>
                      <div variant={doc.status === "verified" ? "success" : doc.status === "rejected" ? "danger" : "warning"} size="sm">
                        {doc.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Downloads */}
            {appData.status === "enrolled" && (
              <div >
                <Button variant="outline" onClick={() => window.print()}>
                  <Download size={16} /> Admission Letter
                </Button>
                {appData.fee_paid && (
                  <Button variant="outline" onClick={() => window.print()}>
                    <Download size={16} /> Fee Receipt
                  </Button>
                )}
              </div>
            )}

            {/* Sign Out */}
            <Button className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2--ghost inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2--sm"  onClick={() => { setAppData(null); setDocuments([]); }}>
              Check another application
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
