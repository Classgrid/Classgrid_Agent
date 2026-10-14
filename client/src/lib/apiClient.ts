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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

import axios from "axios";

import type { ApiErrorResponse } from "@shared-types";
import { mockApiAdapter } from "./mockApiAdapter";
import { isMainDown, isMainDownStatus, isRescueUrl, markMainDown, toRescueUrl } from "./rescue";

const isMockApiEnabled = import.meta.env.VITE_MOCK_API === "true";
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "" : "/");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout to prevent infinite hanging while accommodating EC2 cold starts
  adapter: isMockApiEnabled ? mockApiAdapter : undefined,
  withCredentials: true // required for cookie-based Passport sessions
});

if (isMockApiEnabled) {
  console.info("[Classgrid] Mock API mode enabled. Live MongoDB/Supabase-backed APIs are not called.");
}

// Intercept requests to inject the Bearer token as a fallback for strict cross-site cookie restrictions
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!isMockApiEnabled && isMainDown() && config.url && !isRescueUrl(config.url)) {
    config.url = toRescueUrl(config.url);
    (config as any).__rescueTried = true;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error?.config;
    if (
      !isMockApiEnabled &&
      config &&
      !config.__rescueTried &&
      config.url &&
      error?.code !== "ERR_CANCELED" &&
      isMainDownStatus(error?.response?.status)
    ) {
      const rescueUrl = toRescueUrl(config.url);
      if (rescueUrl !== config.url) {
        markMainDown();
        config.__rescueTried = true;
        config.url = rescueUrl;
        return apiClient(config);
      }
    }
    const responseData =
      error?.response?.data && typeof error.response.data === "object" ? error.response.data : {};
    const normalized: ApiErrorResponse = {
      ...responseData,
      message:
        error?.response?.data?.message ??
        error?.message ??
        "Unexpected API error",
      code: error?.response?.status ? String(error.response.status) : "UNKNOWN"
    };
    return Promise.reject(normalized);
  }
);
