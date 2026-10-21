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

import type {
  InstitutionHierarchyLevel,
  InstitutionProfile,
} from "../queries/useInstitutionProfile";

const fallbackTerms = {
  learner: "Learner",
  educator: "Educator",
  program: "Program",
  group: "Group",
  institution: "Institution",
} as const;

export function getProfileTerm(
  profile: InstitutionProfile,
  key: keyof typeof fallbackTerms,
) {
  return profile.terminology[key]?.trim() || fallbackTerms[key];
}

export function pluralizeLabel(label: string) {
  const normalized = label.trim();
  const lower = normalized.toLowerCase();

  if (!normalized || lower === "faculty" || lower === "staff" || lower.endsWith("s")) {
    return normalized;
  }

  if (lower.endsWith("y") && !lower.endsWith("ay") && !lower.endsWith("ey")) {
    return `${normalized.slice(0, -1)}ies`;
  }

  return `${normalized}s`;
}

export function getProfileTermPlural(
  profile: InstitutionProfile,
  key: "learner" | "educator" | "program" | "group" | "institution",
) {
  const explicitPlural =
    profile.terminology[`${key}_plural`] ??
    profile.terminology[`${key}Plural`] ??
    profile.terminology[`${key}s`];

  return explicitPlural?.trim() || pluralizeLabel(getProfileTerm(profile, key));
}

export function lowerLabel(label: string) {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function isModuleEnabled(profile: InstitutionProfile, moduleKey: string) {
  return profile.enabledModules.includes(moduleKey);
}

export function getPrimaryHierarchyLevel(profile: InstitutionProfile): InstitutionHierarchyLevel {
  const preferredLevels: InstitutionHierarchyLevel[] = [
    "standard",
    "stream",
    "department",
    "course",
    "degree",
  ];

  return (
    preferredLevels.find((level) => profile.academicHierarchy.includes(level)) ??
    profile.academicHierarchy[0] ??
    "course"
  );
}

export function getPrimaryHierarchyLabel(profile: InstitutionProfile) {
  const level = getPrimaryHierarchyLevel(profile);
  return profile.levelLabels[level] ?? getProfileTerm(profile, "program");
}
