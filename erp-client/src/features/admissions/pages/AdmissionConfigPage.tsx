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

import {  Save } from "lucide-react";

import { useAdmissionConfig, useUpdateAdmissionConfig } from "../queries/useAdmissionConfig";
import { Spinner } from "@/components/marketing_ui/spinner";

export function AdmissionConfigPage() {
  const { data: configResponse, isLoading, isError } = useAdmissionConfig();
  const update = useUpdateAdmissionConfig();

  if (isLoading) return <div ><Spinner size={24}  /></div>;
  if (isError || !configResponse) return <div title="Admission Config" breadcrumbs={[{ label: "Admissions", to: "/dept/admissions/dashboard" }, { label: "Config" }]}><div variant="danger" title="Error">Could not load config.</div></div>;

  const cfg = configResponse.config || {};

  return (
    <div title="Admission Configuration" description="Portal settings, workflow execution, and admission round management." breadcrumbs={[{ label: "Admissions", to: "/dept/admissions/dashboard" }, { label: "Config" }]}>
      {update.isSuccess && <div variant="success" title="Saved">Configuration updated.</div>}

      <div >
        {/* Portal & Strategy */}
        <div title="Portal Settings">
          <div >
            <div>
              <strong>Structure Type:</strong>{" "}
              <div variant="info">{configResponse.structure_type?.replace(/_/g, " ")}</div>
            </div>
            <div>
              <strong>Portal Status:</strong>{" "}
              {cfg.is_portal_open
                ? <div variant="success">Open</div>
                : <div variant="neutral">Closed</div>}
            </div>
            <div>
              <strong>Merit List:</strong>{" "}
              {cfg.is_merit_list_published
                ? <div variant="success">Published</div>
                : <div variant="neutral">Unpublished</div>}
            </div>
            <div><strong>Registration Fee:</strong> ₹{cfg.registration_fee || 0}</div>
            <div><strong>Max Apps per Student:</strong> {cfg.max_applications_per_student || 1}</div>
          </div>
        </div>

        {/* Round Management */}
        <div title="Rounds & Deadlines">
          <div >
            <div><strong>Current Round:</strong> {cfg.admission_round?.current_round || 1} / {cfg.admission_round?.max_rounds || 3}</div>
            <div>
              <strong>Waitlist:</strong>{" "}
              {cfg.waitlist_and_deadlines?.waitlist_enabled
                ? <div variant="success">Enabled</div>
                : <div variant="neutral">Disabled</div>}
            </div>
            <div>
              <strong>Auto-Promote Waitlist:</strong>{" "}
              {cfg.waitlist_and_deadlines?.auto_promote_waitlist
                ? <div variant="success">Auto</div>
                : <div variant="neutral">Manual</div>}
            </div>
            <div><strong>Fee Deadline:</strong> {cfg.waitlist_and_deadlines?.fee_payment_deadline_hours || 48}h after selection</div>
            {cfg.cutoff_date && (
              <div><strong>Cutoff Date:</strong> {new Date(cfg.cutoff_date).toLocaleDateString("en-IN")}</div>
            )}
          </div>
        </div>

        {/* Workflow Execution */}
        <div title="Workflow Execution">
          <div >
            <div>
              <strong>Document Verification:</strong>{" "}
              {cfg.workflow_execution?.require_admin_document_verification
                ? <div variant="info">Admin Approval Required</div>
                : <div variant="neutral">Bypassed</div>}
            </div>
            <div>
              <strong>PRN Generation:</strong>{" "}
              <div variant="info">{(cfg.workflow_execution?.prn_generation || "post_fee_payment").replace(/_/g, " ")}</div>
            </div>
            <div>
              <strong>Credential Dispatch:</strong>{" "}
              <div variant="info">{(cfg.workflow_execution?.login_credential_dispatch || "post_fee_payment").replace(/_/g, " ")}</div>
            </div>
          </div>
        </div>

        {/* Seat Matrix */}
        {cfg.seat_matrix_policy?.enabled && (
          <div title="Seat Matrix Policy">
            <div >
              {(cfg.seat_matrix_policy.categories || []).map((cat) => (
                <div key={cat.category_name} >
                  <span>{cat.category_name}</span>
                  <div variant="info" size="sm">{cat.reservation_percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {cfg.instructions && (
        <div title="Portal Instructions">
          <p >{cfg.instructions}</p>
        </div>
      )}
    </div>
  );
}
