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

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export type InstitutionDashboardVariant =
  | "school"
  | "junior_college"
  | "engineering"
  | "coaching";

export type InstitutionHierarchyLevel =
  | "degree"
  | "department"
  | "year"
  | "semester"
  | "division"
  | "sub_batch"
  | "standard"
  | "stream"
  | "course"
  | "batch";

export type InstitutionStructureFeatures = {
  hasStreams: boolean;
  hasDegree: boolean;
  hasDepartments: boolean;
  hasYears: boolean;
  hasSemesters: boolean;
  supportsSemesterTerms: boolean;
  supportsAcademicYear: boolean;
  hasDivisionLevel: boolean;
  hasDivisions: boolean;
  hasVisibleDivisions: boolean;
  usesDefaultDivision: boolean;
  canToggleDivisionMode: boolean;
  hasCoachingBatches: boolean;
  hasSubBatches: boolean;
  hasBatches: boolean;
  allowSubBatches: boolean;
  batchType: "coaching_batch" | "division_sub_batch" | "lab_sub_batch" | null;
};

export type InstitutionSemesterProfile = {
  numbering: string;
  terms: Array<"odd" | "even">;
  oddSemesters: number[];
  evenSemesters: number[];
  yearLabels: string[];
} | null;

export type InstitutionAcademicSessionProfile = {
  usesAcademicYear: boolean;
  yearLabel: string;
  exampleAcademicYear?: string;
  periodLabel: string | null;
  periodType: "term" | "semester" | null;
  periods: string[];
  supportsMidYearPeriodSwitch: boolean;
  commonPeriodNotes?: Record<string, string>;
};

export type InstitutionStaffAssignmentProfile = {
  supportsClassTeacher: boolean;
  supportsAssistantTeacher: boolean;
  supportsMentor: boolean;
  primaryOwnerLabel: string;
  classTeacherScope?: string;
  mentorScope: string;
};

export type InstitutionEntrancePreparationProfile = {
  supported: boolean;
  defaultEnabled: boolean;
  model: "primary_course_batch" | "parallel_entrance_batch";
  hierarchy: Array<"course" | "batch">;
  targetExams: Array<"JEE" | "NEET" | "MHT_CET">;
  canAttachToAcademicDivision: boolean;
  canShareStudentsWithAcademicClasses: boolean;
  examples: {
    course: string;
    batch: string;
  } | null;
};

export type InstitutionLearnerRecordField = {
  key: string;
  label: string;
  required: boolean;
  source?: string;
  system?: boolean;
  example?: string;
  options?: string[];
};

export type InstitutionLearnerRecordProfile = {
  universalFields: InstitutionLearnerRecordField[];
  identityFields: InstitutionLearnerRecordField[];
  academicPlacementFields: InstitutionLearnerRecordField[];
  staffAssignmentFields: InstitutionLearnerRecordField[];
  entrancePreparationFields: InstitutionLearnerRecordField[];
  optionalComplianceFields: InstitutionLearnerRecordField[];
  requiredFieldKeys: string[];
  displayFieldOrder: string[];
};

export type InstitutionAttendanceProfile = {
  mode: string;
  recordingUnit: string;
  primarySessionLabel: string;
  sessionTypeOptions: string[];
  visibleScopeHierarchy: InstitutionHierarchyLevel[];
  storageScopeHierarchy: InstitutionHierarchyLevel[];
  reportingPeriods: string[];
  subjectWiseSupported: boolean;
  facultyWiseSupported?: boolean;
  entranceBatchAttendanceSupported?: boolean;
  defaulterListSupported?: boolean;
  captureModes: string[];
  studentSelfMarkSupported: boolean;
  facultyQuickMarkSupported: boolean;
  gpsSupported: boolean;
  holidayGuardSupported: boolean;
  appealsSupported: boolean;
  suspiciousReviewSupported: boolean;
  defaultMinimumPercentage: number;
  ownerLabels: {
    primary: string;
    secondary: string;
  };
};

export type InstitutionFeeProfile = {
  mode: string;
  billingBasis: string;
  primaryFeeLabel: string;
  structureScopeHierarchy: InstitutionHierarchyLevel[];
  storageScopeHierarchy: InstitutionHierarchyLevel[];
  billingPeriods: string[];
  componentGroups: string[];
  admissionFeeLinked: boolean;
  categoryScholarshipSupported: boolean;
  capRoundFeeSupported?: boolean;
  ledgerSupported: boolean;
  feeStructureSupported: boolean;
  installmentsSupported: boolean;
  concessionsSupported: boolean;
  onlinePaymentsSupported: boolean;
  manualPaymentsSupported: boolean;
  remindersSupported: boolean;
  receiptSupported: boolean;
  paymentGatewayModules: string[];
  ownerLabel: string;
};

export type InstitutionExaminationProfile = {
  mode: string;
  academicPeriodType: "term" | "semester" | "target_year";
  primaryExamLabel: string;
  assessmentTypes: string[];
  resultMode: string;
  gradingModel: string;
  scopeHierarchy: InstitutionHierarchyLevel[];
  storageScopeHierarchy: InstitutionHierarchyLevel[];
  reportingPeriods: string[];
  creditsSupported: boolean;
  backlogSupported: boolean;
  entranceMockSupported?: boolean;
  offlineExamSupported: boolean;
  onlineExamSupported: boolean;
  internalTestsSupported: boolean;
  questionBankSupported: boolean;
  timetableSupported: boolean;
  hallTicketSupported: boolean;
  resultPublishingSupported: boolean;
  proctoringSupported: boolean;
  analyticsSupported: boolean;
  ownerLabel: string;
};

export type InstitutionLibraryProfile = {
  mode: string;
  moduleEnabled: boolean;
  physicalLibrarySupported: boolean;
  physicalCatalogSupported: boolean;
  circulationSupported: boolean;
  reservationSupported: boolean;
  overdueFineSupported: boolean;
  courseContentLibrarySupported: boolean;
  digitalResourcesSupported: boolean;
  analyticsSupported: boolean;
  aiBookSummarySupported: boolean;
  borrowerScopeHierarchy: InstitutionHierarchyLevel[];
  storageScopeHierarchy: InstitutionHierarchyLevel[];
  collectionTypes: string[];
  ownerLabel: string;
};

export type InstitutionModuleRoute = {
  key: string;
  label: string;
  frontendPath: string;
  apiProfilePath: string;
  profileKey: string | null;
  enabled: boolean;
  requiresInstitutionProfile: boolean;
};

export type InstitutionModuleRouting = {
  defaultDashboardPath: string;
  moduleOrder: string[];
  modules: Record<string, InstitutionModuleRoute>;
};

export type InstitutionProfile = {
  organization: {
    id: string;
    name: string;
    org_type: string;
    structure_type: string;
    division_mode?: string;
    allow_sub_batches: boolean;
    status: string;
  };
  dashboardVariant: InstitutionDashboardVariant;
  terminology: Record<string, string>;
  academicHierarchy: InstitutionHierarchyLevel[];
  storageHierarchy: InstitutionHierarchyLevel[];
  levelLabels: Record<InstitutionHierarchyLevel, string>;
  structureFeatures: InstitutionStructureFeatures;
  academicSessionProfile: InstitutionAcademicSessionProfile;
  staffAssignmentProfile: InstitutionStaffAssignmentProfile;
  entrancePreparationProfile: InstitutionEntrancePreparationProfile;
  learnerRecordProfile: InstitutionLearnerRecordProfile;
  attendanceProfile: InstitutionAttendanceProfile;
  feeProfile: InstitutionFeeProfile;
  examinationProfile: InstitutionExaminationProfile;
  libraryProfile: InstitutionLibraryProfile;
  semesterProfile: InstitutionSemesterProfile;
  enabledModules: string[];
  moduleRouting: InstitutionModuleRouting;
  admissionProfile: {
    mode: string;
    track: "cet" | "direct";
    structureType: string;
    baseOrgType: string;
    defaultQuota: string;
    dashboardVariant: InstitutionDashboardVariant;
    enabledWorkflows: string[];
  };
  academicConfig: Record<string, unknown>;
};

export function useInstitutionProfile() {
  return useQuery({
    queryKey: ["org-admin", "institution-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get<InstitutionProfile>("/api/org-admin/institution-profile");
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
