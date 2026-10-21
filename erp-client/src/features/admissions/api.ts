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

import { apiClient } from "@/lib/apiClient";
import type {
  AdmissionAnalytics,
  AdmissionApplication,
  AdmissionConfig,
  CETDashboard,
  MeritListResponse,
  ApplicationPrintData,
  SMSBudget,
} from "./types";

// ── Analytics ──

export async function getAdmissionAnalytics(hierarchyId?: string) {
  const response = await apiClient.get<AdmissionAnalytics>("/api/admission/analytics", {
    params: hierarchyId ? { hierarchy_id: hierarchyId } : undefined,
  });
  return response.data;
}

export async function getAdmissionAnalyticsScoped(params?: { hierarchy_id?: string; division?: string }) {
  const response = await apiClient.get<AdmissionAnalytics>("/api/admission/analytics", {
    params,
  });
  return response.data;
}

export async function getCETDashboard() {
  const response = await apiClient.get<CETDashboard>("/api/admission/cet/dashboard");
  return response.data;
}

// ── Applications ──

type ApplicationsQuery = {
  status?: string;
  hierarchy_id?: string;
  division?: string;
  page?: number;
  limit?: number;
  search?: string;
};

export async function getApplications(query: ApplicationsQuery = {}) {
  const response = await apiClient.get<any>("/api/admission/applications", { params: query });
  return {
    ...response.data,
    applications: response.data.merit_list || response.data.applications || [],
  };
}

export async function getApplicationById(id: string) {
  const response = await apiClient.get(
    `/api/admission/print/application/${id}`
  );
  return response.data; // returns { success, print_data: { applicant, documents, form_data, ... } }
}

// ── Stage Management ──

export async function updateApplicationStage(
  id: string,
  payload: { status: string; comment?: string }
) {
  const response = await apiClient.patch(`/api/admission/applications/${id}/stage`, payload);
  return response.data;
}

export async function bulkVerifyApplications(applicationIds: string[], comment?: string) {
  const response = await apiClient.post("/api/admission/admin/bulk-verify", {
    application_ids: applicationIds,
    comment,
  });
  return response.data;
}

export async function bulkSelectApplications(applicationIds: string[], comment?: string) {
  const response = await apiClient.post("/api/admission/admin/bulk-select", {
    application_ids: applicationIds,
    comment,
  });
  return response.data;
}

// ── Enrollment ──

export async function enrollStudent(applicationId: string) {
  const response = await apiClient.post("/api/admission/enroll", {
    application_id: applicationId,
  });
  return response.data;
}

export async function deskEnroll(payload: {
  full_name: string;
  phone?: string;
  email?: string;
  form_data?: Record<string, unknown>;
}) {
  const response = await apiClient.post("/api/admission/desk-enroll", payload);
  return response.data;
}

// ── Documents ──

export async function verifyDocument(
  applicationId: string,
  docName: string,
  action: "verified" | "rejected",
  rejectionReason?: string
) {
  const response = await apiClient.patch("/api/admission/admin/verify-doc", {
    application_id: applicationId,
    docName: docName,
    status: action,
    rejection_reason: rejectionReason,
  });
  return response.data;
}

// ── Merit List ──

export async function generateMerit(hierarchyId?: string) {
  const response = await apiClient.post("/api/admission/direct/generate-merit", {
    hierarchy_id: hierarchyId,
  });
  return response.data;
}

export async function getMeritList(hierarchyId?: string) {
  const response = await apiClient.get<MeritListResponse>("/api/admission/direct/merit-list", {
    params: hierarchyId ? { hierarchy_id: hierarchyId } : undefined,
  });
  return response.data;
}

export async function getSeatMatrix() {
  const response = await apiClient.get("/api/admission/broadcast/seat-matrix");
  return response.data;
}

// ── Config ──

export async function getAdmissionConfig(): Promise<AdmissionConfig> {
  const response = await apiClient.get<AdmissionConfig>("/api/admission/config");
  return response.data;
}

export async function updateAdmissionConfig(payload: Record<string, any>) {
  // Backend controller expects: { admission_config: { ...updates } }
  const response = await apiClient.patch("/api/admission/config", payload);
  return response.data;
}

// ── Notifications ──

export async function sendNotification(applicationIds: string[], trigger: string) {
  const response = await apiClient.post("/api/admission/notify", {
    application_ids: applicationIds,
    trigger,
  });
  return response.data;
}

export async function getSmsBudget() {
  const response = await apiClient.get<SMSBudget>("/api/admission/sms-budget");
  return response.data;
}

// ── Exports (govt-export.service.js) ──

export function getExportUrl(format: "dte" | "saral" | "aicte" | "state-board") {
  return `/api/admission/export/${format}`;
}

// ── Round Management (admission-workflow.service.js) ──

export async function advanceRound() {
  const response = await apiClient.post("/api/admission/round/advance");
  return response.data;
}

// ── Waitlist (waitlist.service.js) ──

export async function promoteWaitlist() {
  const response = await apiClient.post("/api/admission/admin/waitlist/promote");
  return response.data;
}

// ── Division & PRN Generation (division-allocator.service.js + prn-generator.service.js) ──

export async function allocateDivisions() {
  const response = await apiClient.post("/api/admission/allocate-divisions");
  return response.data;
}

export async function batchGeneratePRNs() {
  const response = await apiClient.post("/api/admission/generate-prns");
  return response.data;
}

// ── CET / RLA / Upgrades (admission-engine.helpers.js) ──

export async function importCETAllotments(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("/api/admission/cet/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function reportRLA(enNumber: string) {
  const response = await apiClient.post(`/api/admission/cet/${enNumber}/report`);
  return response.data;
}

export async function requestNOC(enNumber: string) {
  const response = await apiClient.post(`/api/admission/cet/${enNumber}/request-noc`);
  return response.data;
}

export async function confirmUpgrade(enNumber: string) {
  const response = await apiClient.post(`/api/admission/cet/${enNumber}/confirm-upgrade`);
  return response.data;
}

// ── Overrides (workflow.service.js) ──

export async function unlockStudentEdit(id: string) {
  const response = await apiClient.patch(`/api/admission/applications/${id}/unlock-edit`);
  return response.data;
}

export async function lockStudentEdit(id: string) {
  const response = await apiClient.patch(`/api/admission/applications/${id}/lock-edit`);
  return response.data;
}

// ── Document Validity (document-validity.service.js) ──

export async function validateDocumentExpiry(applicationIds?: string[]) {
  const response = await apiClient.post("/api/admission/docs/validate-expiry", {
    application_ids: applicationIds,
  });
  return response.data;
}

// ── Scholarships (scholarship.service.js) ──

export async function importScholarships(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("/api/admission/admin/scholarship/bulk-import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

// ── Application Merge (duplicate-detector.service.js) ──

export async function mergeApplications(sourceId: string, targetId: string) {
  const response = await apiClient.post("/api/admission/applications/merge", {
    source_id: sourceId,
    target_id: targetId,
  });
  return response.data;
}

// ── Config (strategy-selector.js + admission-form-builder.service.js) ──

export async function getAdmissionConfigFull() {
  const response = await apiClient.get("/api/admission/config");
  return response.data;
}

export async function getMasterFieldPool() {
  const response = await apiClient.get("/api/admission/master-field-pool");
  return response.data;
}

export async function getMasterDocumentPool() {
  const response = await apiClient.get("/api/admission/master-document-pool");
  return response.data;
}


export async function injectPreset(preset: string) {
  const response = await apiClient.post("/api/admission/config/preset", { preset });
  return response.data;
}

// ── Live Merit (admission-printout.service.js) ──

export async function getLiveMeritList(orgId: string) {
  const response = await apiClient.get("/api/admission/merit-list/live", {
    params: { org_id: orgId },
  });
  return response.data;
}

// ── ACAP Operations (admission-workflow.service.js) ──

export async function acapRegister(payload: Record<string, unknown>) {
  const response = await apiClient.post("/api/admission/acap/register", payload);
  return response.data;
}

export async function acapGenerateMerit(hierarchyId?: string) {
  const response = await apiClient.post("/api/admission/acap/generate-merit", {
    hierarchy_id: hierarchyId,
  });
  return response.data;
}

export async function verifyGateEntry(enNumber: string) {
  const response = await apiClient.post("/api/admission/acap/verify-gate", {
    en_number: enNumber,
  });
  return response.data;
}

// ── Parent Portal (workflow.service.js) ──

export async function parentLogin(phone: string) {
  const response = await apiClient.post("/api/admission/parent/login", { phone });
  return response.data;
}

export async function parentGetStatus(applicationId: string) {
  const response = await apiClient.get(`/api/admission/parent/status/${applicationId}`);
  return response.data;
}

export async function parentGetDocuments(applicationId: string) {
  const response = await apiClient.get(`/api/admission/parent/documents/${applicationId}`);
  return response.data;
}

// ── Compliance ──

export async function bulkUpdateCompliance(applicationIds: string[], fields: Record<string, boolean>) {
  const response = await apiClient.post("/api/admission/admin/bulk-update-compliance", {
    application_ids: applicationIds,
    fields,
  });
  return response.data;
}

// ── CET Division & Upgrade (division-allocator.service.js) ──

export async function allotDivisionForCET(enNumber: string, division: string) {
  const response = await apiClient.patch(`/api/admission/cet/${enNumber}/allot-division`, { division });
  return response.data;
}

export async function markCETUpgraded(enNumber: string) {
  const response = await apiClient.patch(`/api/admission/cet/${enNumber}/mark-upgraded`);
  return response.data;
}

// ── Application Print Data (admission-printout.service.js) ──

export async function getApplicationPrintData(id: string) {
  const response = await apiClient.get(`/api/admission/print/application/${id}`);
  return response.data;
}

// ── Direct Seat Availability ──

export async function getDirectSeatAvailability(hierarchyId?: string) {
  const response = await apiClient.get("/api/admission/direct/seat-availability", {
    params: hierarchyId ? { hierarchy_id: hierarchyId } : undefined,
  });
  return response.data;
}
