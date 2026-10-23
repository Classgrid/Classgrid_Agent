/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
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

import {
    getAdmissionTrack,
    getDefaultQuotaByStructureType,
    isCETStructureType,
    isCoachingStructureType,
    isJuniorCollegeStructureType,
    isSchoolStructureType,
    resolveStructureType,
} from "./admissions/organization-admission-type.service.js";

export const INSTITUTION_PROFILE_ORG_SELECT =
    "name org_type structure_type division_mode allow_sub_batches status rollNumberLabel academic_config admission_config";

export const PROFILE_BY_ORG_TYPE = {
    school: {
        dashboardVariant: "school",
        admissionMode: "school_standard",
        terminology: {
            institution: "School",
            learner: "Student",
            educator: "Teacher",
            program: "Standard",
            group: "Division",
            identifier: "Roll No",
        },
        academicHierarchy: ["standard", "division"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "library", "transport"],
        admissionWorkflows: ["class_capacity", "parent_details", "age_check", "document_review"],
    },
    junior_college: {
        dashboardVariant: "junior_college",
        admissionMode: "junior_college_merit",
        terminology: {
            institution: "Junior College",
            learner: "Student",
            educator: "Faculty",
            program: "Stream",
            group: "Division",
            identifier: "Roll No",
        },
        academicHierarchy: ["stream", "standard", "division", "sub_batch"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "library"],
        admissionWorkflows: ["stream_selection", "tenth_marks_merit", "rounds", "document_review"],
    },
    engineering: {
        dashboardVariant: "engineering",
        admissionMode: "engineering_cet_cap",
        terminology: {
            institution: "Engineering College",
            learner: "Student",
            educator: "Faculty",
            program: "Branch",
            group: "Division",
            identifier: "PRN",
        },
        academicHierarchy: ["degree", "department", "year", "semester", "division", "sub_batch"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "library", "compliance", "placements"],
        admissionWorkflows: ["cet_import", "cap_rounds", "branch_merit", "seat_matrix", "document_review"],
    },
    coaching: {
        dashboardVariant: "coaching",
        admissionMode: "coaching_enrollment",
        terminology: {
            institution: "Coaching Institute",
            learner: "Learner",
            educator: "Mentor",
            program: "Course",
            group: "Batch",
            identifier: "Enrollment No",
        },
        academicHierarchy: ["course", "batch"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "crm"],
        admissionWorkflows: ["lead_tracking", "counselling", "trial_batch", "batch_capacity", "fee_plan"],
    },
    diploma: {
        dashboardVariant: "engineering",
        admissionMode: "diploma_merit",
        terminology: {
            institution: "Diploma Institute",
            learner: "Student",
            educator: "Faculty",
            program: "Department",
            group: "Division",
            identifier: "Enrollment No",
        },
        academicHierarchy: ["department", "year", "semester", "division", "sub_batch"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "library"],
        admissionWorkflows: ["department_merit", "seat_matrix", "document_review"],
    },
};

export function normalizeOrgType(org, resolvedStructureType) {
    const type = String(org?.org_type || "").toLowerCase();
    if (PROFILE_BY_ORG_TYPE[type]) return type;

    const structure = String(resolvedStructureType || org?.structure_type || "").toLowerCase();
    if (isSchoolStructureType(structure)) return "school";
    if (isJuniorCollegeStructureType(structure)) return "junior_college";
    if (isCoachingStructureType(structure)) return "coaching";
    if (isCETStructureType(structure)) return structure.includes("diploma") ? "diploma" : "engineering";
    return "school";
}

const NO_DIVISION_STRUCTURE_TYPES = new Set([
    "school_no_div",
    "junior_college_no_div",
    "engineering_no_div",
    "diploma_no_div",
]);

const WITH_DIVISION_STRUCTURE_TYPES = new Set([
    "school_with_div",
    "junior_college_with_div",
    "engineering_with_div",
    "diploma_with_div",
]);

const DIVISION_ORG_TYPES = new Set(["school", "junior_college", "engineering", "diploma"]);
const SEMESTER_ORG_TYPES = new Set(["engineering", "diploma"]);
const SUB_BATCH_ORG_TYPES = new Set(["junior_college", "engineering", "diploma"]);
const ENTRANCE_PREP_ORG_TYPES = new Set(["school", "junior_college", "engineering", "coaching"]);

const DEFAULT_LEVEL_LABELS = {
    degree: "Degree",
    department: "Department",
    year: "Year",
    semester: "Semester",
    division: "Division",
    sub_batch: "Lab Batch",
    standard: "Standard",
    stream: "Stream",
    course: "Course",
    batch: "Batch",
};

const LEVEL_LABELS_BY_ORG_TYPE = {
    school: {
        standard: "Standard",
        division: "Division",
    },
    junior_college: {
        stream: "Stream",
        standard: "Standard",
        division: "Division",
        sub_batch: "Batch",
    },
    engineering: {
        degree: "Degree",
        department: "Branch / Department",
        year: "Academic Year",
        semester: "Semester",
        division: "Division",
        sub_batch: "Lab Batch",
    },
    coaching: {
        course: "Course",
        batch: "Batch",
    },
    diploma: {
        department: "Department",
        year: "Academic Year",
        semester: "Semester",
        division: "Division",
        sub_batch: "Lab Batch",
    },
};

const MODULE_ROUTE_CONTRACT = {
    org_dashboard: {
        label: "Dashboard",
        frontendPath: "/org/dashboard",
        apiProfilePath: "/api/org-admin/institution-profile",
        profileKey: null,
    },
    admissions: {
        label: "Admissions",
        frontendPath: "/dept/admissions/dashboard",
        apiProfilePath: "/api/admission/institution-profile",
        profileKey: "admissionProfile",
    },
    fees: {
        label: "Fees",
        frontendPath: "/dept/fees/dashboard",
        apiProfilePath: "/api/fees/institution-profile",
        profileKey: "feeProfile",
    },
    attendance: {
        label: "Attendance",
        frontendPath: "/dept/attendance/dashboard",
        apiProfilePath: "/api/attendance/institution-profile",
        profileKey: "attendanceProfile",
    },
    examinations: {
        label: "Examinations",
        frontendPath: "/dept/exams/dashboard",
        apiProfilePath: "/api/examinations/institution-profile",
        profileKey: "examinationProfile",
    },
    library: {
        label: "Library",
        frontendPath: "/dept/library/dashboard",
        apiProfilePath: "/api/library/institution-profile",
        profileKey: "libraryProfile",
    },
    hr: {
        label: "HR & Payroll",
        frontendPath: "/dept/hr/dashboard",
        apiProfilePath: "/api/payroll/institution-profile",
        profileKey: "staffAssignmentProfile",
    },
};

function usesDefaultDivision(orgType, structureType, org) {
    if (!DIVISION_ORG_TYPES.has(orgType)) return false;
    if (NO_DIVISION_STRUCTURE_TYPES.has(structureType)) return true;
    if (WITH_DIVISION_STRUCTURE_TYPES.has(structureType)) return false;
    return org.division_mode === "without_divisions";
}

function buildLevelLabels(orgType) {
    return {
        ...DEFAULT_LEVEL_LABELS,
        ...(LEVEL_LABELS_BY_ORG_TYPE[orgType] || {}),
    };
}

function buildSemesterProfile(orgType) {
    if (!SEMESTER_ORG_TYPES.has(orgType)) return null;

    const maxSemesters = orgType === "diploma" ? 6 : 8;
    return {
        numbering: `semester_1_to_${maxSemesters}`,
        terms: ["odd", "even"],
        oddSemesters: Array.from({ length: Math.ceil(maxSemesters / 2) }, (_, index) => index * 2 + 1),
        evenSemesters: Array.from({ length: Math.floor(maxSemesters / 2) }, (_, index) => index * 2 + 2),
        yearLabels: orgType === "diploma" ? ["FY", "SY", "TY"] : ["FY", "SY", "TY", "Final Year"],
    };
}

function buildAcademicSessionProfile(orgType) {
    if (orgType === "coaching") {
        return {
            usesAcademicYear: false,
            yearLabel: "Target Year",
            periodLabel: null,
            periodType: null,
            periods: [],
            supportsMidYearPeriodSwitch: false,
        };
    }

    if (orgType === "engineering" || orgType === "diploma") {
        return {
            usesAcademicYear: true,
            yearLabel: "Academic Year",
            exampleAcademicYear: "2025-2026",
            periodLabel: "Semester",
            periodType: "semester",
            periods: ["Semester 1", "Semester 2"],
            supportsMidYearPeriodSwitch: true,
        };
    }

    return {
        usesAcademicYear: true,
        yearLabel: "Academic Year",
        exampleAcademicYear: "2025-2026",
        periodLabel: "Term",
        periodType: "term",
        periods: ["Term 1", "Term 2"],
        supportsMidYearPeriodSwitch: true,
        commonPeriodNotes: {
            term2: "After Diwali",
        },
    };
}

function buildStaffAssignmentProfile(orgType, features) {
    if (orgType === "coaching") {
        return {
            supportsClassTeacher: false,
            supportsAssistantTeacher: false,
            supportsMentor: true,
            primaryOwnerLabel: "Mentor",
            mentorScope: "batch",
        };
    }

    const classTeacherScope = features.hasVisibleDivisions
        ? "division"
        : features.usesDefaultDivision
            ? "default_division"
            : "class_group";

    return {
        supportsClassTeacher: true,
        supportsAssistantTeacher: true,
        supportsMentor: true,
        primaryOwnerLabel: orgType === "school" ? "Class Teacher" : "Class Teacher / Faculty Mentor",
        classTeacherScope,
        mentorScope: features.hasSubBatches ? "division_or_batch" : classTeacherScope,
    };
}

function buildEntrancePreparationProfile(orgType) {
    const supported = ENTRANCE_PREP_ORG_TYPES.has(orgType);

    return {
        supported,
        defaultEnabled: orgType === "coaching",
        model: orgType === "coaching" ? "primary_course_batch" : "parallel_entrance_batch",
        hierarchy: supported ? ["course", "batch"] : [],
        targetExams: supported ? ["JEE", "NEET", "MHT_CET"] : [],
        canAttachToAcademicDivision: supported && orgType !== "coaching",
        canShareStudentsWithAcademicClasses: supported,
        examples: supported
            ? {
                course: "MHT-CET 2027",
                batch: orgType === "coaching" ? "Morning Batch" : "Science J2 CET Batch",
            }
            : null,
    };
}

function field(key, label, required = false, extra = {}) {
    return { key, label, required, ...extra };
}

function buildLearnerRecordProfile(orgType, features) {
    const universalFields = [
        field("student_id", "Student ID", true, { source: "User._id", system: true }),
        field("name", "Student Name", true, { source: "User.name" }),
        field("email", "Student Email", true, { source: "User.email" }),
    ];

    const staffFields = orgType === "coaching"
        ? [field("mentor", "Mentor", true)]
        : [
            field("class_teacher", "Class Teacher", true),
            field("mentor", "Mentor", false),
        ];

    const entranceFields = ENTRANCE_PREP_ORG_TYPES.has(orgType)
        ? [
            field("entrance_course", "Entrance Course", orgType === "coaching"),
            field("entrance_exam", "Target Exam", orgType === "coaching", { options: ["JEE", "NEET", "MHT_CET"] }),
            field("entrance_batch", "Entrance Batch", orgType === "coaching"),
        ]
        : [];

    const profiles = {
        school: {
            identityFields: [
                field("roll_no", "Roll No", true),
            ],
            academicPlacementFields: [
                field("standard", "Standard", true),
                field("academic_year", "Academic Year", true, { example: "2025-2026" }),
                field("term", "Term", false, { example: "Term 2" }),
                ...(features.hasVisibleDivisions ? [field("division", "Division", true)] : []),
            ],
            optionalComplianceFields: [],
        },
        junior_college: {
            identityFields: [
                field("roll_no", "Roll No", true),
            ],
            academicPlacementFields: [
                field("stream", "Stream", true, { example: "Science" }),
                field("standard", "Standard", true, { options: ["11th", "12th"] }),
                field("academic_year", "Academic Year", true, { example: "2025-2026" }),
                field("term", "Term", false, { example: "Term 2" }),
                ...(features.hasVisibleDivisions ? [field("division", "Division", true)] : []),
                ...(features.hasSubBatches ? [field("sub_batch", "Batch", false, { example: "J2" })] : []),
            ],
            optionalComplianceFields: [],
        },
        engineering: {
            identityFields: [
                field("prn", "PRN", true),
                field("abc_id", "ABC ID", false),
            ],
            academicPlacementFields: [
                field("degree", "Degree", false, { example: "B.Tech" }),
                field("department", "Department", true, { example: "Computer Engineering" }),
                field("branch", "Branch", true, { example: "Computer" }),
                field("academic_year", "Academic Year", true, { example: "2025-2026" }),
                field("year", "Year", true, { options: ["FY", "SY", "TY", "Final Year"] }),
                field("semester", "Current Semester", true),
                ...(features.hasVisibleDivisions ? [field("division", "Division", true)] : []),
                ...(features.hasSubBatches ? [field("sub_batch", "Division Batch", false)] : []),
            ],
            optionalComplianceFields: [
                field("anti_ragging_undertaking_no", "Anti-Ragging Undertaking No", false),
                field("category", "Category", false),
                field("admission_type", "Admission Type", false),
            ],
        },
        coaching: {
            identityFields: [
                field("enrollment_no", "Enrollment No", true),
            ],
            academicPlacementFields: [
                field("course", "Course", true, { example: "JEE Advanced" }),
                field("batch", "Batch", true, { example: "Morning Batch" }),
                field("target_year", "Target Year", false, { example: "2027" }),
            ],
            optionalComplianceFields: [
                field("school_or_college", "School / College", false),
                field("standard", "Standard", false),
            ],
        },
        diploma: {
            identityFields: [
                field("enrollment_no", "Enrollment No", true),
                field("abc_id", "ABC ID", false),
            ],
            academicPlacementFields: [
                field("department", "Department", true),
                field("academic_year", "Academic Year", true, { example: "2025-2026" }),
                field("year", "Year", true, { options: ["FY", "SY", "TY"] }),
                field("semester", "Current Semester", true),
                ...(features.hasVisibleDivisions ? [field("division", "Division", true)] : []),
                ...(features.hasSubBatches ? [field("sub_batch", "Division Batch", false)] : []),
            ],
            optionalComplianceFields: [
                field("category", "Category", false),
                field("admission_type", "Admission Type", false),
            ],
        },
    };

    const profile = profiles[orgType] || profiles.school;
    const allFields = [
        ...universalFields,
        ...profile.identityFields,
        ...profile.academicPlacementFields,
        ...staffFields,
        ...entranceFields,
        ...profile.optionalComplianceFields,
    ];

    return {
        universalFields,
        identityFields: profile.identityFields,
        academicPlacementFields: profile.academicPlacementFields,
        staffAssignmentFields: staffFields,
        entrancePreparationFields: entranceFields,
        optionalComplianceFields: profile.optionalComplianceFields,
        requiredFieldKeys: allFields.filter((item) => item.required).map((item) => item.key),
        displayFieldOrder: allFields.map((item) => item.key),
    };
}

function buildAttendanceProfile(orgType, features) {
    const divisionLevel = features.hasVisibleDivisions ? ["division"] : [];
    const subBatchLevel = features.hasSubBatches ? ["sub_batch"] : [];
    const shared = {
        captureModes: ["live_code", "quick_mark", "manual_override"],
        studentSelfMarkSupported: true,
        facultyQuickMarkSupported: true,
        gpsSupported: true,
        holidayGuardSupported: true,
        appealsSupported: true,
        suspiciousReviewSupported: true,
        defaultMinimumPercentage: 75,
    };

    const profiles = {
        school: {
            mode: "school_attendance",
            recordingUnit: "day_or_period",
            primarySessionLabel: "Class Period",
            sessionTypeOptions: ["day", "period", "activity"],
            visibleScopeHierarchy: ["standard", ...divisionLevel],
            storageScopeHierarchy: ["standard", "division"],
            reportingPeriods: ["day", "week", "month", "term", "academic_year"],
            subjectWiseSupported: true,
            ownerLabels: {
                primary: "Class Teacher",
                secondary: "Subject Teacher",
            },
            ...shared,
        },
        junior_college: {
            mode: "junior_college_attendance",
            recordingUnit: "lecture_or_practical",
            primarySessionLabel: "Lecture",
            sessionTypeOptions: ["lecture", "practical", "tutorial", "activity"],
            visibleScopeHierarchy: ["stream", "standard", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["stream", "standard", "division", ...subBatchLevel],
            reportingPeriods: ["day", "week", "month", "term", "academic_year"],
            subjectWiseSupported: true,
            entranceBatchAttendanceSupported: true,
            ownerLabels: {
                primary: "Class Teacher / Faculty Mentor",
                secondary: "Subject Faculty",
            },
            ...shared,
        },
        engineering: {
            mode: "engineering_attendance",
            recordingUnit: "lecture_practical_or_lab",
            primarySessionLabel: "Lecture / Practical",
            sessionTypeOptions: ["lecture", "practical", "lab", "tutorial"],
            visibleScopeHierarchy: ["degree", "department", "year", "semester", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["degree", "department", "year", "semester", "division", ...subBatchLevel],
            reportingPeriods: ["day", "week", "month", "semester", "academic_year"],
            subjectWiseSupported: true,
            facultyWiseSupported: true,
            defaulterListSupported: true,
            ownerLabels: {
                primary: "Subject Faculty",
                secondary: "Faculty Mentor",
            },
            ...shared,
        },
        coaching: {
            mode: "coaching_attendance",
            recordingUnit: "session",
            primarySessionLabel: "Session",
            sessionTypeOptions: ["class", "test", "doubt_session", "counselling"],
            visibleScopeHierarchy: ["course", "batch"],
            storageScopeHierarchy: ["course", "batch"],
            reportingPeriods: ["day", "week", "month", "target_year"],
            subjectWiseSupported: true,
            facultyWiseSupported: true,
            defaulterListSupported: false,
            ownerLabels: {
                primary: "Mentor",
                secondary: "Faculty",
            },
            ...shared,
        },
        diploma: {
            mode: "diploma_attendance",
            recordingUnit: "lecture_practical_or_lab",
            primarySessionLabel: "Lecture / Practical",
            sessionTypeOptions: ["lecture", "practical", "lab", "tutorial"],
            visibleScopeHierarchy: ["department", "year", "semester", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["department", "year", "semester", "division", ...subBatchLevel],
            reportingPeriods: ["day", "week", "month", "semester", "academic_year"],
            subjectWiseSupported: true,
            facultyWiseSupported: true,
            defaulterListSupported: true,
            ownerLabels: {
                primary: "Subject Faculty",
                secondary: "Faculty Mentor",
            },
            ...shared,
        },
    };

    return profiles[orgType] || profiles.school;
}

function buildFeeProfile(orgType, features) {
    const divisionLevel = features.hasVisibleDivisions ? ["division"] : [];
    const subBatchLevel = features.hasSubBatches ? ["sub_batch"] : [];
    const shared = {
        ledgerSupported: true,
        feeStructureSupported: true,
        installmentsSupported: true,
        concessionsSupported: true,
        onlinePaymentsSupported: true,
        manualPaymentsSupported: true,
        remindersSupported: true,
        receiptSupported: true,
        paymentGatewayModules: ["razorpay"],
    };

    const profiles = {
        school: {
            mode: "school_fee",
            billingBasis: "academic_year_or_term",
            primaryFeeLabel: "School Fee",
            structureScopeHierarchy: ["standard", ...divisionLevel],
            storageScopeHierarchy: ["standard", "division"],
            billingPeriods: ["annual", "term", "monthly"],
            componentGroups: ["tuition", "admission", "exam", "transport", "activity", "library"],
            admissionFeeLinked: true,
            categoryScholarshipSupported: false,
            ownerLabel: "Fee Manager",
            ...shared,
        },
        junior_college: {
            mode: "junior_college_fee",
            billingBasis: "academic_year_or_term",
            primaryFeeLabel: "Junior College Fee",
            structureScopeHierarchy: ["stream", "standard", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["stream", "standard", "division", ...subBatchLevel],
            billingPeriods: ["annual", "term", "monthly"],
            componentGroups: ["tuition", "admission", "exam", "practical", "library", "entrance_batch"],
            admissionFeeLinked: true,
            categoryScholarshipSupported: true,
            ownerLabel: "Fee Manager",
            ...shared,
        },
        engineering: {
            mode: "engineering_fee",
            billingBasis: "academic_year_and_semester",
            primaryFeeLabel: "College Fee",
            structureScopeHierarchy: ["degree", "department", "year", "semester", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["degree", "department", "year", "semester", "division", ...subBatchLevel],
            billingPeriods: ["annual", "semester", "installment"],
            componentGroups: ["tuition", "development", "exam", "lab", "library", "hostel", "transport"],
            admissionFeeLinked: true,
            categoryScholarshipSupported: true,
            capRoundFeeSupported: true,
            ownerLabel: "Accounts / Fee Manager",
            ...shared,
        },
        coaching: {
            mode: "coaching_fee",
            billingBasis: "course_or_batch",
            primaryFeeLabel: "Course Fee",
            structureScopeHierarchy: ["course", "batch"],
            storageScopeHierarchy: ["course", "batch"],
            billingPeriods: ["course", "monthly", "installment"],
            componentGroups: ["registration", "course", "test_series", "materials", "counselling"],
            admissionFeeLinked: true,
            categoryScholarshipSupported: false,
            capRoundFeeSupported: false,
            ownerLabel: "Accounts / Center Manager",
            ...shared,
        },
        diploma: {
            mode: "diploma_fee",
            billingBasis: "academic_year_and_semester",
            primaryFeeLabel: "Diploma Fee",
            structureScopeHierarchy: ["department", "year", "semester", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["department", "year", "semester", "division", ...subBatchLevel],
            billingPeriods: ["annual", "semester", "installment"],
            componentGroups: ["tuition", "development", "exam", "lab", "library", "transport"],
            admissionFeeLinked: true,
            categoryScholarshipSupported: true,
            capRoundFeeSupported: false,
            ownerLabel: "Accounts / Fee Manager",
            ...shared,
        },
    };

    return profiles[orgType] || profiles.school;
}

function buildExaminationProfile(orgType, features) {
    const divisionLevel = features.hasVisibleDivisions ? ["division"] : [];
    const subBatchLevel = features.hasSubBatches ? ["sub_batch"] : [];
    const shared = {
        offlineExamSupported: true,
        onlineExamSupported: true,
        internalTestsSupported: true,
        questionBankSupported: true,
        timetableSupported: true,
        hallTicketSupported: true,
        resultPublishingSupported: true,
        proctoringSupported: true,
        analyticsSupported: true,
    };

    const profiles = {
        school: {
            mode: "school_examinations",
            academicPeriodType: "term",
            primaryExamLabel: "Exam",
            assessmentTypes: ["unit_test", "term_exam", "annual_exam", "oral", "practical"],
            resultMode: "term_report",
            gradingModel: "percentage_or_grade",
            scopeHierarchy: ["standard", ...divisionLevel],
            storageScopeHierarchy: ["standard", "division"],
            reportingPeriods: ["term", "academic_year"],
            creditsSupported: false,
            backlogSupported: false,
            ownerLabel: "Exam Coordinator",
            ...shared,
        },
        junior_college: {
            mode: "junior_college_examinations",
            academicPeriodType: "term",
            primaryExamLabel: "Exam",
            assessmentTypes: ["unit_test", "term_exam", "prelim", "board_practical", "entrance_mock"],
            resultMode: "stream_term_report",
            gradingModel: "marks_percentage_rank",
            scopeHierarchy: ["stream", "standard", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["stream", "standard", "division", ...subBatchLevel],
            reportingPeriods: ["term", "academic_year"],
            creditsSupported: false,
            backlogSupported: false,
            entranceMockSupported: true,
            ownerLabel: "Exam Coordinator",
            ...shared,
        },
        engineering: {
            mode: "engineering_examinations",
            academicPeriodType: "semester",
            primaryExamLabel: "Semester Exam",
            assessmentTypes: ["internal", "external", "end_sem", "practical", "lab", "viva"],
            resultMode: "sgpa_cgpa",
            gradingModel: "credit_grade_point",
            scopeHierarchy: ["degree", "department", "year", "semester", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["degree", "department", "year", "semester", "division", ...subBatchLevel],
            reportingPeriods: ["semester", "academic_year"],
            creditsSupported: true,
            backlogSupported: true,
            ownerLabel: "Exam Controller",
            ...shared,
        },
        coaching: {
            mode: "coaching_examinations",
            academicPeriodType: "target_year",
            primaryExamLabel: "Test",
            assessmentTypes: ["topic_test", "chapter_test", "mock_test", "full_length_test", "doubt_test"],
            resultMode: "rank_percentile_analysis",
            gradingModel: "marks_rank_percentile",
            scopeHierarchy: ["course", "batch"],
            storageScopeHierarchy: ["course", "batch"],
            reportingPeriods: ["week", "month", "target_year"],
            creditsSupported: false,
            backlogSupported: false,
            entranceMockSupported: true,
            hallTicketSupported: false,
            ownerLabel: "Test Series Manager",
            ...shared,
        },
        diploma: {
            mode: "diploma_examinations",
            academicPeriodType: "semester",
            primaryExamLabel: "Semester Exam",
            assessmentTypes: ["internal", "external", "end_sem", "practical", "lab", "viva"],
            resultMode: "semester_grade_report",
            gradingModel: "credit_grade_point",
            scopeHierarchy: ["department", "year", "semester", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["department", "year", "semester", "division", ...subBatchLevel],
            reportingPeriods: ["semester", "academic_year"],
            creditsSupported: true,
            backlogSupported: true,
            ownerLabel: "Exam Controller",
            ...shared,
        },
    };

    return profiles[orgType] || profiles.school;
}

function buildLibraryProfile(orgType, features) {
    const divisionLevel = features.hasVisibleDivisions ? ["division"] : [];
    const subBatchLevel = features.hasSubBatches ? ["sub_batch"] : [];
    const hasPhysicalLibrary = orgType !== "coaching";
    const shared = {
        courseContentLibrarySupported: true,
        digitalResourcesSupported: true,
        analyticsSupported: true,
        aiBookSummarySupported: true,
    };

    const profiles = {
        school: {
            mode: "school_library",
            moduleEnabled: true,
            physicalCatalogSupported: true,
            circulationSupported: true,
            reservationSupported: true,
            overdueFineSupported: true,
            borrowerScopeHierarchy: ["standard", ...divisionLevel],
            storageScopeHierarchy: ["standard", "division"],
            collectionTypes: ["textbook", "reference", "story", "activity", "digital_resource"],
            ownerLabel: "Librarian / Library Manager",
            ...shared,
        },
        junior_college: {
            mode: "junior_college_library",
            moduleEnabled: true,
            physicalCatalogSupported: true,
            circulationSupported: true,
            reservationSupported: true,
            overdueFineSupported: true,
            borrowerScopeHierarchy: ["stream", "standard", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["stream", "standard", "division", ...subBatchLevel],
            collectionTypes: ["textbook", "reference", "competitive_exam", "practical_manual", "digital_resource"],
            ownerLabel: "Librarian / Library Manager",
            ...shared,
        },
        engineering: {
            mode: "engineering_library",
            moduleEnabled: true,
            physicalCatalogSupported: true,
            circulationSupported: true,
            reservationSupported: true,
            overdueFineSupported: true,
            borrowerScopeHierarchy: ["degree", "department", "year", "semester", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["degree", "department", "year", "semester", "division", ...subBatchLevel],
            collectionTypes: ["textbook", "reference", "journal", "lab_manual", "project_report", "digital_resource"],
            ownerLabel: "Librarian / Library Manager",
            ...shared,
        },
        coaching: {
            mode: "coaching_content_library",
            moduleEnabled: false,
            physicalCatalogSupported: false,
            circulationSupported: false,
            reservationSupported: false,
            overdueFineSupported: false,
            borrowerScopeHierarchy: ["course", "batch"],
            storageScopeHierarchy: ["course", "batch"],
            collectionTypes: ["course_video", "test_solution", "study_material", "digital_resource"],
            ownerLabel: "Content Manager / Mentor",
            ...shared,
        },
        diploma: {
            mode: "diploma_library",
            moduleEnabled: true,
            physicalCatalogSupported: true,
            circulationSupported: true,
            reservationSupported: true,
            overdueFineSupported: true,
            borrowerScopeHierarchy: ["department", "year", "semester", ...divisionLevel, ...subBatchLevel],
            storageScopeHierarchy: ["department", "year", "semester", "division", ...subBatchLevel],
            collectionTypes: ["textbook", "reference", "lab_manual", "project_report", "digital_resource"],
            ownerLabel: "Librarian / Library Manager",
            ...shared,
        },
    };

    const profile = profiles[orgType] || profiles.school;
    return {
        ...profile,
        physicalLibrarySupported: hasPhysicalLibrary,
    };
}

export function buildStructureFeatures(orgType, structureType, org) {
    const hasDivisionLevel = DIVISION_ORG_TYPES.has(orgType);
    const defaultDivision = usesDefaultDivision(orgType, structureType, org);
    const hasSemesters = SEMESTER_ORG_TYPES.has(orgType);
    const allowSubBatches = SUB_BATCH_ORG_TYPES.has(orgType) && Boolean(org.allow_sub_batches);

    return {
        hasStreams: orgType === "junior_college",
        hasDegree: orgType === "engineering",
        hasDepartments: SEMESTER_ORG_TYPES.has(orgType),
        hasYears: hasSemesters,
        hasSemesters,
        supportsSemesterTerms: hasSemesters,
        supportsAcademicYear: hasSemesters,
        hasDivisionLevel,
        hasDivisions: hasDivisionLevel && !defaultDivision,
        hasVisibleDivisions: hasDivisionLevel && !defaultDivision,
        usesDefaultDivision: hasDivisionLevel && defaultDivision,
        canToggleDivisionMode: hasDivisionLevel,
        hasCoachingBatches: orgType === "coaching",
        hasSubBatches: allowSubBatches,
        hasBatches: orgType === "coaching" || allowSubBatches,
        allowSubBatches,
        batchType:
            orgType === "coaching"
                ? "coaching_batch"
                : orgType === "junior_college" && allowSubBatches
                    ? "division_sub_batch"
                    : allowSubBatches
                        ? "lab_sub_batch"
                        : null,
    };
}

function filterVisibleHierarchy(hierarchy, features) {
    return hierarchy.filter((level) => {
        if (level === "division") return features.hasVisibleDivisions;
        if (level === "sub_batch") return features.hasSubBatches;
        return true;
    });
}

function filterStorageHierarchy(hierarchy, features) {
    return hierarchy.filter((level) => level !== "sub_batch" || features.hasSubBatches);
}

function buildModuleRouting(base) {
    const enabledModules = new Set(base.enabledModules);
    const alwaysAvailable = new Set(["org_dashboard", "hr"]);
    const moduleOrder = ["org_dashboard", "admissions", "fees", "attendance", "examinations", "library", "hr"];

    const modules = moduleOrder.reduce((acc, key) => {
        const contract = MODULE_ROUTE_CONTRACT[key];
        acc[key] = {
            key,
            ...contract,
            enabled: alwaysAvailable.has(key) || enabledModules.has(key),
            requiresInstitutionProfile: true,
        };
        return acc;
    }, {});

    return {
        defaultDashboardPath: MODULE_ROUTE_CONTRACT.org_dashboard.frontendPath,
        moduleOrder,
        modules,
    };
}

export function buildInstitutionProfile(org) {
    const structureType = resolveStructureType(org) || org.structure_type;
    const orgType = normalizeOrgType(org, structureType);
    const base = PROFILE_BY_ORG_TYPE[orgType] || PROFILE_BY_ORG_TYPE.school;
    const identifierLabel = org.academic_config?.identifierLabel || org.rollNumberLabel || base.terminology.identifier;
    const admissionTrack = getAdmissionTrack(structureType);
    const structureFeatures = buildStructureFeatures(orgType, structureType, org);
    const visibleAcademicHierarchy = filterVisibleHierarchy(base.academicHierarchy, structureFeatures);
    const storageHierarchy = filterStorageHierarchy(base.academicHierarchy, structureFeatures);

    return {
        organization: {
            id: org._id.toString(),
            name: org.name,
            org_type: orgType,
            structure_type: structureType,
            division_mode: org.division_mode,
            allow_sub_batches: Boolean(org.allow_sub_batches),
            status: org.status,
        },
        dashboardVariant: base.dashboardVariant,
        terminology: {
            ...base.terminology,
            identifier: identifierLabel,
        },
        academicHierarchy: visibleAcademicHierarchy,
        storageHierarchy,
        levelLabels: buildLevelLabels(orgType),
        structureFeatures,
        academicSessionProfile: buildAcademicSessionProfile(orgType),
        staffAssignmentProfile: buildStaffAssignmentProfile(orgType, structureFeatures),
        entrancePreparationProfile: buildEntrancePreparationProfile(orgType),
        learnerRecordProfile: buildLearnerRecordProfile(orgType, structureFeatures),
        attendanceProfile: buildAttendanceProfile(orgType, structureFeatures),
        feeProfile: buildFeeProfile(orgType, structureFeatures),
        examinationProfile: buildExaminationProfile(orgType, structureFeatures),
        libraryProfile: buildLibraryProfile(orgType, structureFeatures),
        semesterProfile: buildSemesterProfile(orgType),
        enabledModules: base.enabledModules,
        moduleRouting: buildModuleRouting(base),
        admissionProfile: {
            mode: base.admissionMode,
            track: admissionTrack,
            structureType,
            baseOrgType: orgType,
            defaultQuota: getDefaultQuotaByStructureType(structureType),
            dashboardVariant: base.dashboardVariant,
            enabledWorkflows: base.admissionWorkflows,
        },
        academicConfig: org.academic_config || {},
    };
}
