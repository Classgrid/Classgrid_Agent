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

import { API_BASE_URL, apiClient } from "@/lib/apiClient";

import { getAuthIntent } from "./auth-helpers";
import { getClientDeviceFingerprint } from "./device-fingerprint";
import { executeRecaptcha } from "./recaptcha";
import type { AuthAudience, AuthBrandingResponse, AuthLoginRole, AuthType, LoginResponse } from "./types";

type BrandingParams = {
  authType: AuthType;
  slug?: string;
  domain?: string;
};

export async function getAuthBranding({ authType, slug, domain }: BrandingParams) {
  const response = await apiClient.get<AuthBrandingResponse>("/api/public/auth-branding", {
    params: {
      type: authType,
      slug: slug || undefined,
      domain: domain || undefined,
    },
  });

  return response.data.branding;
}

type LoginPayload = {
  email: string;
  password: string;
  audience: AuthAudience;
  role: AuthLoginRole;
  rememberMe?: boolean;
  /** "chat": the chat.classgrid.in sign-in, which accepts public chat accounts only */
  portal?: "chat";
};

export async function loginWithPassword({ email, password, audience, role, rememberMe = false, portal }: LoginPayload) {
  const loginIntent = getAuthIntent(audience, role);
  const isStandardUser = loginIntent === "student" || loginIntent === "teacher";
  const isChat = portal === "chat";
  const recaptchaAction = "login";
  const recaptchaToken = await executeRecaptcha(recaptchaAction);

  const response = await apiClient.post<LoginResponse>("/api/auth/login", {
    email,
    password,
    expectedLoginType: isChat ? "chat" : isStandardUser ? "standard" : loginIntent,
    loginTab: isChat ? undefined : isStandardUser ? loginIntent : loginIntent === "admin" ? "admin" : undefined,
    role: isChat ? "chat" : loginIntent,
    rememberMe,
    deviceFingerprint: getClientDeviceFingerprint(),
    recaptchaToken,
    recaptchaAction,
    portalHost: window.location.hostname,
  });

  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
  }

  return response.data;
}

export async function checkEmailForLogin(email: string) {
  const response = await apiClient.post<{ exists: boolean; hasPassword?: boolean; role?: string }>("/api/auth/check-email", {
    email,
  });

  return response.data;
}

export async function requestPasswordReset(email: string) {
  const response = await apiClient.post<{ message: string }>("/api/auth/forgot-password", {
    email,
    origin: window.location.origin
  });
  return response.data;
}

export async function resetPasswordWithToken({ token, password }: { token: string; password: string }) {
  const response = await apiClient.post<{ message: string; role?: string }>("/api/auth/reset-password", {
    token,
    password,
  });

  return response.data;
}

export async function verifyResetToken(token: string) {
  const response = await apiClient.get<{ valid: boolean; message?: string }>(`/api/auth/verify-reset-token/${token}`);
  return response.data;
}

export async function verifyDeviceOtp({ email, otp }: { email: string; otp: string }) {
  const response = await apiClient.post<LoginResponse>("/api/auth/verify-device", {
    email,
    otp,
    deviceFingerprint: getClientDeviceFingerprint(),
  });

  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
  }

  return response.data;
}

export async function resendDeviceOtp(email: string) {
  const response = await apiClient.post<{ message: string }>("/api/auth/resend-device-otp", { email });
  return response.data;
}

type GoogleAuthUrlPayload = {
  audience: AuthAudience;
  role: AuthLoginRole;
};

export function getGoogleAuthUrl({ audience, role }: GoogleAuthUrlPayload) {
  const loginTab = getAuthIntent(audience, role);
  const path = `/api/auth/google?loginTab=${encodeURIComponent(loginTab)}&host=${encodeURIComponent(window.location.hostname)}`;

  if (!API_BASE_URL || API_BASE_URL.startsWith('/')) {
    return path;
  }
  return new URL(path, API_BASE_URL).toString();
}

export async function validateActivationToken(token: string) {
  const response = await apiClient.post<{ valid: boolean; email?: string; name?: string; role?: string; mode?: string; orgType?: string; structureType?: string; subdomain?: string; orgName?: string; address?: string; city?: string; state?: string; district?: string; taluka?: string; website?: string }>("/api/auth/validate-activation-token", {
    token,
  });
  return response.data;
}

export async function activateAdmin(payload: any) {
  const response = await apiClient.post<{ message: string; redirectTo?: string; token?: string }>("/api/auth/activate-admin", payload);
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
  }
  return response.data;
}

export async function sendOnboardingOtp(payload: { target: string; type: "email" | "phone" }) {
  const response = await apiClient.post<{ message: string }>("/api/auth/onboarding-send-otp", payload);
  return response.data;
}

export async function verifyOnboardingOtp(payload: { target: string; otp: string }) {
  const response = await apiClient.post<{ message: string; verified: boolean }>("/api/auth/onboarding-verify-otp", payload);
  return response.data;
}

export async function checkUsername(username: string) {
  const response = await apiClient.post<{ available: boolean; message: string }>("/api/auth/check-username", { username });
  return response.data;
}

export async function fetchAllTerminology() {
  const response = await apiClient.get<{ comparisonCols: string[]; comparisonConcepts: string[]; allTerminology: Record<string, any> }>("/api/hierarchy/terminology/all");
  return response.data;
}
