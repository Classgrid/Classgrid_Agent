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
import assert from "node:assert/strict";
import * as XLSX from "xlsx";

import {
  parseCsvText,
  parseRowsPayload,
  buildMarksFromRows,
  computeSubjectStats,
  getSubjectGradeAndPoints,
  buildErpPayload,
} from "../src/routes/result.routes.js";

const csvRows = parseCsvText('prn,name,Math\nP001,"Shinde, Nikhil",88');
assert.equal(csvRows.length, 1);
assert.equal(csvRows[0].name, "Shinde, Nikhil");
assert.equal(csvRows[0].Math, "88");

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet([{ prn: "P002", "Physics Internal": 20, "Physics External": 62 }]),
  "Marks",
);
const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
const uploadedRows = parseRowsPayload({}, {
  originalname: "marks.xlsx",
  mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  buffer: xlsxBuffer,
});
assert.equal(uploadedRows.length, 1);
assert.equal(uploadedRows[0].prn, "P002");
assert.equal(uploadedRows[0]["Physics External"], 62);

const subjects = [
  { id: "math", subject_name: "Math", subject_code: "M101", course_code: "M101", max_marks: 100, credits: 4, teacher_id: "teacher-1" },
  { id: "physics", subject_name: "Physics", subject_code: "P101", course_code: "P101", max_marks: 100, credits: 3, teacher_id: "teacher-2" },
];
const studentByPrn = {
  p001: { _id: { toString: () => "student-1" }, prn: "P001" },
};

const teacherUpload = buildMarksFromRows({
  rows: [{ prn: "P001", seat_no: "S001", "Math Internal": 22, "Math External": 63 }],
  subjects,
  studentByPrn,
  schemeId: "scheme-1",
  orgId: "org-1",
  req: { user: { _id: { toString: () => "teacher-1" } } },
  enforceTeacherOwnership: true,
});
assert.equal(teacherUpload.successCount, 1);
assert.equal(teacherUpload.errors.length, 0);
assert.equal(teacherUpload.marksToInsert[0].marks_obtained, 85);
assert.equal(teacherUpload.marksToInsert[0].internal_marks, 22);
assert.equal(teacherUpload.marksToInsert[0].external_marks, 63);
assert.equal(teacherUpload.marksToInsert[0].seat_no, "S001");

const blockedTeacherUpload = buildMarksFromRows({
  rows: [{ prn: "P001", Physics: 91 }],
  subjects,
  studentByPrn,
  schemeId: "scheme-1",
  orgId: "org-1",
  req: { user: { _id: { toString: () => "teacher-1" } } },
  enforceTeacherOwnership: true,
});
assert.equal(blockedTeacherUpload.successCount, 0);
assert.equal(blockedTeacherUpload.marksToInsert.length, 0);
assert.match(blockedTeacherUpload.errors[0].reason, /not assigned/);

const subjectById = { math: subjects[0] };
const allMarks = [50, 60, 70, 80, 90].map((marks, index) => ({
  subject_id: "math",
  student_id: `student-${index}`,
  marks_obtained: marks,
  is_absent: false,
}));
const stats = computeSubjectStats(allMarks, subjectById, null);
assert.equal(Math.round(stats.math.mean), 70);
assert.ok(stats.math.sd > 14 && stats.math.sd < 15);
const relativeGrade = getSubjectGradeAndPoints(allMarks[4], subjects[0], stats, { relative_grading: true }, 40);
assert.equal(relativeGrade.grade, "A+");
assert.equal(relativeGrade.points, 9);

const erpPayload = buildErpPayload({
  result: {
    scheme_id: "scheme-1",
    student_id: "student-1",
    sgpa: 7.25,
    cgpa: 7.25,
    percentage: 68.75,
    earn_credits: 7,
    total_credits: 7,
    total_marks: 176,
    status: "pass",
    seat_no: "S001",
    snapshot_student_name: "Demo Student",
    snapshot_prn: "P001",
    snapshot_abc_id: "ABC123",
    snapshot_father_name: "Demo Father",
    snapshot_mother_name: "Demo Mother",
    snapshot_dob: "2007-01-23",
    snapshot_eligibility_no: "ELIG123",
    snapshot_pattern: "2023",
    snapshot_program: "Computer Engineering",
    snapshot_college: "Classgrid Engineering College",
    result_detail: [
      { subject_code: "M101", subject_name: "Math", course_type: "THEORY", credits: 4, max_marks: 100, marks_obtained: 85, grade: "A", grade_points: 8, credit_earned: 4 },
    ],
  },
  scheme: { semester: "2", academic_year: "2025-26", rules_json: { relative_grading: true } },
  student: { name: "Demo Student", prn: "P001", roll_no: "S001", abc_id: "ABC123", fatherName: "Fallback Father", motherName: "Fallback Mother", dob: "2007-01-23", eligibilityNo: "ELIG-FALLBACK", pattern: "2023", profilePicture: "https://pub.example.r2.dev/photo.jpg", signature: "https://pub.example.r2.dev/sign.png" },
  orgId: "org-1",
  organization: { name: "Classgrid Engineering College", organizationCode: "CGEC", address: "Pune", website: "https://classgrid.example", logo_url: "https://pub.example.r2.dev/logo.png" },
});
assert.equal(erpPayload.status, "200");
assert.equal(erpPayload.regData.relativegrading, true);
assert.equal(erpPayload.regData.currentromansem, "II");
assert.equal(erpPayload.regData.logo, "https://pub.example.r2.dev/logo.png");
assert.equal(erpPayload.regData.father_first_name, "Demo Father");
assert.equal(erpPayload.regData.mother_first_name, "Demo Mother");
assert.equal(erpPayload.regData.dob, "23-Jan-2007");
assert.equal(erpPayload.regData.eligibility_no, "ELIG123");
assert.equal(erpPayload.regData.pattern, "2023");
assert.equal(erpPayload.regData.photourl, "https://pub.example.r2.dev/photo.jpg");
assert.equal(erpPayload.regData.examSignature, "https://pub.example.r2.dev/sign.png");
assert.match(erpPayload.regData.qrimageMultipleNew, /^https:\/\/api\.qrserver\.com/);
assert.equal(erpPayload.regData.resultarray[0].course_code, "M101");
assert.equal(erpPayload.regData.resultarray[0].obtainmarks, 85);

console.log("result-engine tests passed");