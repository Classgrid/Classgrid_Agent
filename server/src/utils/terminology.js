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
 * terminology.js — The Multi-Track Dictionary
 * 
 * Returns the correct word/label based on the organization's structure_type.
 * Used by both backend (API responses, validation messages) and frontend (sidebar labels, form titles).
 * 
 * Usage:
 *   import { getTerminology } from "../utils/terminology.js";
 *   const terms = getTerminology("engineering");
 *   console.log(terms.division);  // "Division"
 *   console.log(terms.course);    // "Branch"
 */

const TERMINOLOGY_MAP = {
    engineering: {
        org_label: "College",
        top_level: "Degree",
        course: "Branch",
        subject: "Course",
        subject_code: "Course Code",
        year: "Year",
        period: "Semester",
        division: "Division",
        sub_batch: "Lab Batch",
        student_id: "PRN",
        student_id_long: "Permanent Registration Number",
        teacher: "Faculty",
        classroom: "Classroom",
        add_student: "Register Student",
        add_teacher: "Add Faculty",
        hierarchy: ["Degree", "Department", "Year", "Semester", "Division"],
        // Dynamic UI labels
        assignment_label: "Assignment",
        exam_label: "Examination",
        id_card_title: "FACULTY IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Forum & Discussion",
        parent_comm: "Student Communication",
    },
    engineering_with_div: {
        org_label: "College",
        top_level: "Degree",
        course: "Branch",
        subject: "Course",
        subject_code: "Course Code",
        year: "Year",
        period: "Semester",
        division: "Division",
        sub_batch: "Lab Batch",
        student_id: "PRN",
        student_id_long: "Permanent Registration Number",
        teacher: "Faculty",
        classroom: "Classroom",
        add_student: "Register Student",
        add_teacher: "Add Faculty",
        hierarchy: ["Degree", "Department", "Year", "Semester", "Division"],
        assignment_label: "Assignment",
        exam_label: "Examination",
        id_card_title: "FACULTY IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Forum & Discussion",
        parent_comm: "Student Communication",
    },
    engineering_no_div: {
        org_label: "College",
        top_level: "Degree",
        course: "Branch",
        subject: "Course",
        subject_code: "Course Code",
        year: "Year",
        period: "Semester",
        division: "Division", // auto-created "Default", hidden in UI
        sub_batch: "Lab Batch",
        student_id: "PRN",
        student_id_long: "Permanent Registration Number",
        teacher: "Faculty",
        classroom: "Classroom",
        add_student: "Register Student",
        add_teacher: "Add Faculty",
        hierarchy: ["Degree", "Department", "Year", "Semester"],
        assignment_label: "Assignment",
        exam_label: "Examination",
        id_card_title: "FACULTY IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Forum & Discussion",
        parent_comm: "Student Communication",
    },

    school_with_div: {
        org_label: "School",
        top_level: "Standard",
        course: "Class",
        subject: "Subject",
        subject_code: "Subject Code",
        year: "Class",
        period: "Term",
        division: "Section",
        sub_batch: null,
        student_id: "Roll No",
        student_id_long: "Roll Number",
        teacher: "Teacher",
        classroom: "Classroom",
        add_student: "Add Student",
        add_teacher: "Add Teacher",
        hierarchy: ["Standard", "Division"],
        assignment_label: "Homework",
        exam_label: "Test",
        id_card_title: "TEACHER IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Student & Parent Board",
        parent_comm: "Parent Communication",
    },

    school_no_div: {
        org_label: "School",
        top_level: "Standard",
        course: "Class",
        subject: "Subject",
        subject_code: "Subject Code",
        year: "Class",
        period: "Term",
        division: "Section",  // auto-created "Default", hidden in UI
        sub_batch: null,
        student_id: "Roll No",
        student_id_long: "Roll Number",
        teacher: "Teacher",
        classroom: "Classroom",
        add_student: "Add Student",
        add_teacher: "Add Teacher",
        hierarchy: ["Standard"],
        assignment_label: "Homework",
        exam_label: "Test",
        id_card_title: "TEACHER IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Student & Parent Board",
        parent_comm: "Parent Communication",
    },

    coaching: {
        org_label: "Institute",
        top_level: "Course",
        course: "Course",
        subject: "Topic",
        subject_code: "Topic Code",
        year: "Year", 
        period: "Phase", 
        division: "Batch", 
        sub_batch: null,
        student_id: "Enrollment No",
        student_id_long: "Enrollment Number",
        teacher: "Mentor",
        classroom: "Classroom",
        add_student: "Enroll Student",
        add_teacher: "Add Mentor",
        hierarchy: ["Course", "Year", "Phase", "Batch"],
        assignment_label: "Practice Set",
        exam_label: "Mock Test",
        id_card_title: "MENTOR IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Doubt Forum",
        parent_comm: "Student Communication",
    },

    junior_college: {
        org_label: "Junior College",
        top_level: "Stream",
        course: "Stream",
        subject: "Subject",
        subject_code: "Subject Code",
        year: "Standard",
        period: "Term",
        division: "Division",
        sub_batch: "Batch",
        student_id: "Roll No",
        student_id_long: "Roll Number",
        teacher: "Lecturer",
        classroom: "Classroom",
        add_student: "Add Student",
        add_teacher: "Add Lecturer",
        hierarchy: ["Stream", "Standard", "Division", "Batch"],
        assignment_label: "Assignment",
        exam_label: "Examination",
        id_card_title: "LECTURER IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Discussion Forum",
        parent_comm: "Student Communication",
    },
    junior_college_with_div: {
        org_label: "Junior College",
        top_level: "Stream",
        course: "Stream",
        subject: "Subject",
        subject_code: "Subject Code",
        year: "Standard",
        period: "Term",
        division: "Division",
        sub_batch: "Batch",
        student_id: "Roll No",
        student_id_long: "Roll Number",
        teacher: "Lecturer",
        classroom: "Classroom",
        add_student: "Add Student",
        add_teacher: "Add Lecturer",
        hierarchy: ["Stream", "Standard", "Division", "Batch"],
        assignment_label: "Assignment",
        exam_label: "Examination",
        id_card_title: "LECTURER IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Discussion Forum",
        parent_comm: "Student Communication",
    },
    junior_college_no_div: {
        org_label: "Junior College",
        top_level: "Stream",
        course: "Stream",
        subject: "Subject",
        subject_code: "Subject Code",
        year: "Standard",
        period: "Term",
        division: "Division", // auto-created "Default", hidden in UI
        sub_batch: "Batch",
        student_id: "Roll No",
        student_id_long: "Roll Number",
        teacher: "Lecturer",
        classroom: "Classroom",
        add_student: "Add Student",
        add_teacher: "Add Lecturer",
        hierarchy: ["Stream", "Standard", "Batch"],
        assignment_label: "Assignment",
        exam_label: "Examination",
        id_card_title: "LECTURER IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Discussion Forum",
        parent_comm: "Student Communication",
    },

    diploma: {
        org_label: "Polytechnic",
        top_level: "Department",
        course: "Branch",
        subject: "Course",
        subject_code: "Course Code",
        year: "Year",
        period: "Semester",
        division: "Division",
        sub_batch: "Lab Batch",
        student_id: "Enrollment No",
        student_id_long: "Enrollment Number",
        teacher: "Faculty",
        classroom: "Classroom",
        add_student: "Register Student",
        add_teacher: "Add Faculty",
        hierarchy: ["Department", "Year", "Semester", "Division"],
        assignment_label: "Assignment",
        exam_label: "Examination",
        id_card_title: "FACULTY IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Forum & Discussion",
        parent_comm: "Student Communication",
    },
    diploma_with_div: {
        org_label: "Polytechnic",
        top_level: "Department",
        course: "Branch",
        subject: "Course",
        subject_code: "Course Code",
        year: "Year",
        period: "Semester",
        division: "Division",
        sub_batch: "Lab Batch",
        student_id: "Enrollment No",
        student_id_long: "Enrollment Number",
        teacher: "Faculty",
        classroom: "Classroom",
        add_student: "Register Student",
        add_teacher: "Add Faculty",
        hierarchy: ["Department", "Year", "Semester", "Division"],
        assignment_label: "Assignment",
        exam_label: "Examination",
        id_card_title: "FACULTY IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Forum & Discussion",
        parent_comm: "Student Communication",
    },
    diploma_no_div: {
        org_label: "Polytechnic",
        top_level: "Department",
        course: "Branch",
        subject: "Course",
        subject_code: "Course Code",
        year: "Year",
        period: "Semester",
        division: "Division", // auto-created "Default", hidden in UI
        sub_batch: "Lab Batch",
        student_id: "Enrollment No",
        student_id_long: "Enrollment Number",
        teacher: "Faculty",
        classroom: "Classroom",
        add_student: "Register Student",
        add_teacher: "Add Faculty",
        hierarchy: ["Department", "Year", "Semester"],
        assignment_label: "Assignment",
        exam_label: "Examination",
        id_card_title: "FACULTY IDENTITY CARD",
        student_id_card_title: "STUDENT IDENTITY CARD",
        forum_label: "Forum & Discussion",
        parent_comm: "Student Communication",
    },

    custom: {
        org_label: "Organization",
        top_level: "Group",
        course: "Program",
        subject: "Course",
        subject_code: "Course Code",
        year: "Level",
        period: "Phase",
        division: "Group",
        sub_batch: "Sub-Group",
        student_id: "ID",
        student_id_long: "Identifier",
        teacher: "Instructor",
        classroom: "Group",
        add_student: "Add Member",
        add_teacher: "Add Instructor",
        hierarchy: ["Group", "Sub-Group"],
        assignment_label: "Task",
        exam_label: "Assessment",
        id_card_title: "INSTRUCTOR IDENTITY CARD",
        student_id_card_title: "MEMBER IDENTITY CARD",
        forum_label: "Discussion Board",
        parent_comm: "Member Communication",
    },
};

/**
 * Get the full terminology object for a given structure_type.
 * @param {string} structureType - One of: engineering, school_with_div, school_no_div, coaching, junior_college, diploma, custom
 * @returns {Object} The terminology map for the given type
 * @throws {Error} If structureType is invalid
 */
export function getTerminology(structureType) {
    const terms = TERMINOLOGY_MAP[structureType];
    if (!terms) {
        throw new Error(
            `Invalid structure_type: "${structureType}". ` +
            `Valid options: ${Object.keys(TERMINOLOGY_MAP).join(", ")}`
        );
    }
    return terms;
}

/**
 * Get a specific term for a structure_type.
 * @param {string} structureType 
 * @param {string} key - e.g. "division", "course", "student_id"
 * @returns {string|null}
 */
export function getTerm(structureType, key) {
    const terms = getTerminology(structureType);
    return terms[key] ?? null;
}

/**
 * Get the allowed hierarchy levels for a structure_type.
 * Used by the parser middleware to validate requests.
 * @param {string} structureType 
 * @returns {string[]}
 */
export function getAllowedLevels(structureType) {
    return getTerminology(structureType).hierarchy;
}

/**
 * Check if a specific feature is blocked for a structure_type.
 * e.g., Coaching blocks "division" and "semester".
 * @param {string} structureType 
 * @param {string} feature - "division", "period", "sub_batch", "year"
 * @returns {boolean} true if the feature is blocked (null in terminology)
 */
export function isFeatureBlocked(structureType, feature) {
    const terms = getTerminology(structureType);
    return terms[feature] === null;
}

export default TERMINOLOGY_MAP;
