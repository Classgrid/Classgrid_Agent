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

import mongoose from "mongoose";

const assessmentComponentSchema = new mongoose.Schema(
  {
    component: {
      type: String,
      enum: ["theory", "practical", "oral", "notebook", "project", "activity", "internal", "external", "other"],
      required: true,
    },
    marksObtained: { type: Number, default: null },
    maxMarks: { type: Number, default: null },
    passMarks: { type: Number, default: null },
    grade: { type: String, default: "" },
    remark: { type: String, default: "" },
  },
  { _id: false }
);

const subjectResultSchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "OrgSubject", default: null },
    subjectCode: { type: String, default: "" },
    subjectName: { type: String, required: true, trim: true },
    subjectGroup: {
      type: String,
      enum: ["compulsory", "elective", "optional", "bifocal", "vocational", "co_scholastic", "other"],
      default: "compulsory",
    },
    components: { type: [assessmentComponentSchema], default: [] },
    totalMarks: { type: Number, default: null },
    maxMarks: { type: Number, default: null },
    percentage: { type: Number, default: null },
    grade: { type: String, default: "" },
    isPassed: { type: Boolean, default: null },
    teacherRemark: { type: String, default: "" },
  },
  { _id: false }
);

const termResultSchema = new mongoose.Schema(
  {
    termKey: { type: String, required: true, trim: true },
    termName: { type: String, required: true, trim: true },
    assessmentType: {
      type: String,
      enum: ["unit_test", "term_exam", "annual_exam", "oral", "practical", "prelim", "board_practical", "entrance_mock", "other"],
      default: "term_exam",
    },
    subjects: { type: [subjectResultSchema], default: [] },
    totalMarks: { type: Number, default: null },
    maxMarks: { type: Number, default: null },
    percentage: { type: Number, default: null },
    grade: { type: String, default: "" },
    rank: { type: Number, default: null },
    resultStatus: {
      type: String,
      enum: ["pass", "fail", "promoted", "detained", "needs_improvement", "withheld", "not_applicable"],
      default: "not_applicable",
    },
  },
  { _id: false }
);

const coScholasticSchema = new mongoose.Schema(
  {
    area: { type: String, required: true, trim: true },
    grade: { type: String, default: "" },
    remark: { type: String, default: "" },
  },
  { _id: false }
);

const schoolReportCardSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      default: null,
      index: true,
    },
    academicYear: { type: String, required: true, trim: true },
    standard: { type: String, required: true, trim: true },
    division: { type: String, default: "" },
    stream: { type: String, default: "" },
    subBatch: { type: String, default: "" },
    reportMode: {
      type: String,
      enum: ["school_term_report", "junior_college_stream_report"],
      required: true,
    },
    snapshot: {
      studentName: { type: String, default: "" },
      prn: { type: String, default: "" },
      rollNo: { type: String, default: "" },
      dob: { type: Date, default: null },
      classTeacherName: { type: String, default: "" },
      organizationName: { type: String, default: "" },
    },
    terms: { type: [termResultSchema], default: [] },
    coScholasticAreas: { type: [coScholasticSchema], default: [] },
    attendance: {
      totalWorkingDays: { type: Number, default: null },
      presentDays: { type: Number, default: null },
      attendancePercentage: { type: Number, default: null },
    },
    finalOutcome: {
      totalMarks: { type: Number, default: null },
      maxMarks: { type: Number, default: null },
      percentage: { type: Number, default: null },
      grade: { type: String, default: "" },
      promotionStatus: {
        type: String,
        enum: ["promoted", "detained", "needs_improvement", "eligible_for_12th", "withheld", "not_applicable"],
        default: "not_applicable",
      },
      classTeacherRemark: { type: String, default: "" },
      principalRemark: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["draft", "verified", "published", "locked"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schoolReportCardSchema.index(
  { organization_id: 1, student: 1, academicYear: 1, standard: 1, reportMode: 1 },
  { unique: true }
);

export default mongoose.models.SchoolReportCard || mongoose.model("SchoolReportCard", schoolReportCardSchema);
