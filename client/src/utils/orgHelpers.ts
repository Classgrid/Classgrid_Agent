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

/**
 * orgHelpers.ts — ClassGrid Multi-Tenant Org Type Utilities
 *
 * MANDATORY: Every module that renders academic hierarchy (dropdowns, labels,
 * filters, forms, tables) MUST use these helpers to conditionally adapt the UI.
 *
 * Source of truth: server/src/models/Organization.js
 *
 * org_type values   : "school" | "junior_college" | "engineering" | "coaching" | "diploma" | "other"
 * structure_type    : 9 plan variants — the real UI driver (see blueprint Section 3)
 */

export type OrgType =
  | "school"
  | "junior_college"
  | "engineering"
  | "coaching"
  | "diploma"
  | "other";

export type StructureType =
  | "engineering"
  | "engineering_with_div"
  | "engineering_no_div"
  | "school_with_div"
  | "school_no_div"
  | "coaching"
  | "junior_college"
  | "junior_college_with_div"
  | "junior_college_no_div";

// ─── Hierarchy Capability Checks ───────────────────────────────────────────

/** Does this org show a Division selector? */
export const hasDivisions = (s?: string) =>
  !!s && s.endsWith("_with_div");

/** Does this org use Semesters? (Engineering types only) */
export const hasSemesters = (s?: string) =>
  !!s && (s === "engineering" || s.startsWith("engineering_"));

/** Does this org use Years? (Engineering types only) */
export const hasYears = (s?: string) =>
  !!s && (s === "engineering" || s.startsWith("engineering_"));

/** Does this org use Streams? (Jr College types only) */
export const hasStreams = (s?: string) =>
  !!s && (s === "junior_college" || s.startsWith("junior_college_"));

/** Is this a Coaching org? (Course → Batch only, no divisions/semesters) */
export const isCoaching = (s?: string) => s === "coaching";

/** Is this a School org? */
export const isSchool = (s?: string) =>
  !!s && (s === "school_with_div" || s === "school_no_div");

/** Is this a Junior College org? */
export const isJuniorCollege = (s?: string) =>
  !!s && (s === "junior_college" || s.startsWith("junior_college_"));

/** Is this an Engineering org? */
export const isEngineering = (s?: string) =>
  !!s && (s === "engineering" || s.startsWith("engineering_"));

/** Does this org support Lab Batch splitting? */
export const hasLabBatches = (s?: string) => s === "engineering_with_div";

// ─── Label Adapters ─────────────────────────────────────────────────────────

/**
 * Returns the correct label for the top-level academic grouping.
 * - Engineering: "Department"
 * - Jr College: "Stream"
 * - School/Coaching: "Course" or "Standard"
 */
export const getDeptLabel = (s?: string): string => {
  if (isEngineering(s)) return "Department";
  if (isJuniorCollege(s)) return "Stream";
  if (isCoaching(s)) return "Course";
  return "Standard";
};

/**
 * Returns the correct label for the sub-grouping level.
 * - Engineering: "Year"
 * - Jr College / School: "Standard"
 * - Coaching: "Batch"
 */
export const getClassLabel = (s?: string): string => {
  if (isEngineering(s)) return "Year";
  if (isCoaching(s)) return "Batch";
  return "Standard";
};

/**
 * Returns the correct label for the Division level.
 * - Engineering: "Division / Batch"
 * - School / Jr College: "Division"
 */
export const getDivisionLabel = (s?: string): string => {
  if (isEngineering(s)) return "Division / Batch";
  return "Division";
};

// ─── Convenience Object (pass to components as a single prop) ───────────────

export interface OrgCapabilities {
  hasDivisions: boolean;
  hasSemesters: boolean;
  hasYears: boolean;
  hasStreams: boolean;
  hasLabBatches: boolean;
  isCoaching: boolean;
  isSchool: boolean;
  isJuniorCollege: boolean;
  isEngineering: boolean;
  deptLabel: string;
  classLabel: string;
  divisionLabel: string;
}

export const getOrgCapabilities = (structureType?: string): OrgCapabilities => ({
  hasDivisions:    hasDivisions(structureType),
  hasSemesters:    hasSemesters(structureType),
  hasYears:        hasYears(structureType),
  hasStreams:      hasStreams(structureType),
  hasLabBatches:   hasLabBatches(structureType),
  isCoaching:      isCoaching(structureType),
  isSchool:        isSchool(structureType),
  isJuniorCollege: isJuniorCollege(structureType),
  isEngineering:   isEngineering(structureType),
  deptLabel:       getDeptLabel(structureType),
  classLabel:      getClassLabel(structureType),
  divisionLabel:   getDivisionLabel(structureType),
});

// ─── React Hook ─────────────────────────────────────────────────────────────

import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";

/**
 * useOrgCapabilities — Primary hook for org-aware UI rendering.
 *
 * Usage:
 *   const org = useOrgCapabilities();
 *   {org.hasDivisions && <DivisionSelector />}
 *   <label>{org.deptLabel}</label>
 */
export function useOrgCapabilities(): OrgCapabilities {
  const { data: user } = useCurrentUser();
  const structureType = (user as any)?.organization_id?.structure_type as string | undefined;
  return getOrgCapabilities(structureType);
}

/**
 * formatOrgType — Maps backend orgType shortcodes to beautiful full names
 */
export const formatOrgType = (s?: string | null): string => {
  if (!s) return "—";
  const normalized = s.toLowerCase().trim();
  if (normalized === "engineering" || normalized === "engineering_college") return "Engineering College";
  if (normalized === "school") return "School";
  if (normalized === "junior_college") return "Junior College";
  if (normalized === "coaching" || normalized === "coaching_institute") return "Coaching Institute";
  if (normalized === "diploma" || normalized === "diploma_institute") return "Diploma Institute";
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};
