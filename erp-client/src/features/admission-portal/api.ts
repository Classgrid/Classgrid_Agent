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
import type { AuthResponse, ApplicationState, EngineConfigResponse } from "./types";

// ═══════════════════════════════════════════════════════════════
// Auth Endpoints — maps to admission.routes.js public auth
// ═══════════════════════════════════════════════════════════════

export async function validateEN(enNumber: string, organizationId: string) {
  const response = await apiClient.post("/api/admission/cet/validate-en", {
    en_number: enNumber,
    organization_id: organizationId,
  });
  return response.data;
}

export async function sendENOTP(enNumber: string, email: string, organizationId: string) {
  const response = await apiClient.post("/api/admission/cet/send-otp", {
    en_number: enNumber,
    email,
    organization_id: organizationId,
  });
  return response.data;
}

export async function verifyENOTP(enNumber: string, email: string, otp: string, organizationId: string) {
  const response = await apiClient.post<AuthResponse>("/api/admission/cet/verify-otp", {
    en_number: enNumber,
    email,
    otp,
    organization_id: organizationId,
  });
  return response.data;
}

export async function verifyPhoneOTP(idToken: string, organizationId: string) {
  const response = await apiClient.post<AuthResponse>("/api/admission/verify-phone", {
    idToken,
    organization_id: organizationId,
  });
  return response.data;
}

export async function sendEmailOTP(email: string, organizationId: string) {
  const response = await apiClient.post("/api/admission/send-email-otp", {
    email,
    organization_id: organizationId,
  });
  return response.data;
}

export async function verifyEmailOTP(email: string, otp: string, organizationId: string) {
  const response = await apiClient.post<AuthResponse>("/api/admission/verify-email-otp", {
    email,
    otp,
    organization_id: organizationId,
  });
  return response.data;
}

// ═══════════════════════════════════════════════════════════════
// Config — Public config fetch for candidate portal
// The real admin endpoint is protected, so for public portal
// we need a public endpoint. Falling back to the org route.
// ═══════════════════════════════════════════════════════════════

export async function getEngineConfig(organizationId: string): Promise<EngineConfigResponse> {
  // Public endpoint that returns config + form_schema
  const response = await apiClient.get<EngineConfigResponse>(
    `/api/organizations/${organizationId}/admission-config`
  );
  return response.data;
}

// ═══════════════════════════════════════════════════════════════
// Candidate Session — requires admission_token
// ═══════════════════════════════════════════════════════════════

export async function getCandidateSession(): Promise<ApplicationState> {
  const response = await apiClient.get<{ application: ApplicationState }>("/api/admission/candidate/me");
  return response.data.application;
}

// ═══════════════════════════════════════════════════════════════
// Application CRUD — maps to save-draft, submit
// ═══════════════════════════════════════════════════════════════

export async function saveApplicationDraft(payload: {
  full_name: string;
  dob?: string;
  form_data?: Record<string, any>;
}) {
  const response = await apiClient.post("/api/admission/save-draft", payload);
  return response.data;
}

export async function submitApplication() {
  const response = await apiClient.post("/api/admission/submit");
  return response.data;
}

// ═══════════════════════════════════════════════════════════════
// Documents — upload with multipart/form-data
// ═══════════════════════════════════════════════════════════════

export async function uploadDocument(docName: string, file: File) {
  const formData = new FormData();
  formData.append("docName", docName);
  formData.append("file", file);

  const response = await apiClient.post("/api/admission/docs/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getDocChecklist() {
  const response = await apiClient.get("/api/admission/docs/checklist");
  return response.data;
}

export async function getDocViewLink(docName: string) {
  const response = await apiClient.get("/api/admission/candidate/docs/view", {
    params: { doc_name: docName },
  });
  return response.data;
}

// ═══════════════════════════════════════════════════════════════
// Fee Payment — maps to pay/initiate, pay/verify
// ═══════════════════════════════════════════════════════════════

export async function initiateFeePayment() {
  const response = await apiClient.post("/api/admission/pay/initiate");
  return response.data;
}

export async function verifyFeePayment(paymentId: string, orderId: string, signature: string) {
  const response = await apiClient.post("/api/admission/pay/verify", {
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    razorpay_signature: signature,
  });
  return response.data;
}

// ═══════════════════════════════════════════════════════════════
// Candidate Withdrawal
// ═══════════════════════════════════════════════════════════════

export async function withdrawApplication(applicationId: string) {
  const response = await apiClient.post(`/api/admission/candidate/withdraw/${applicationId}`);
  return response.data;
}

// ═══════════════════════════════════════════════════════════════
// Seat Availability — maps to GET /api/admission/direct/seat-availability
// ═══════════════════════════════════════════════════════════════

export async function getSeatAvailability(organizationId: string) {
  const response = await apiClient.get("/api/admission/direct/seat-availability", {
    params: { organization_id: organizationId },
  });
  return response.data;
}

// ═══════════════════════════════════════════════════════════════
// Print — PDF generation for application and confirmation letter
// ═══════════════════════════════════════════════════════════════

export async function printApplication() {
  const response = await apiClient.get("/api/admission/direct/print/application", {
    responseType: "blob",
  });
  return response.data;
}

export async function printConfirmation() {
  const response = await apiClient.get("/api/admission/direct/print/confirmation", {
    responseType: "blob",
  });
  return response.data;
}

// ═══════════════════════════════════════════════════════════════
// Parent Portal — maps to parent/ routes
// ═══════════════════════════════════════════════════════════════

export async function parentLogin(phone: string, organizationId: string) {
  const response = await apiClient.post("/api/admission/parent/login", {
    phone,
    organization_id: organizationId,
  });
  return response.data;
}

export async function getParentStatus(applicationId: string) {
  const response = await apiClient.get(`/api/admission/parent/status/${applicationId}`);
  return response.data;
}

export async function getParentDocuments(applicationId: string) {
  const response = await apiClient.get(`/api/admission/parent/documents/${applicationId}`);
  return response.data;
}
