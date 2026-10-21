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

import express from 'express';
import * as XLSX from 'xlsx';
import { isAuthenticated, requireRole } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { attachInstitutionProfile } from '../middleware/institution-profile.middleware.js';
import { getChatSb } from '../config/supabaseClient.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

const router = express.Router();
router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

router.get('/institution-profile', attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        examination_profile: req.institutionProfile.examinationProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});

const getSb = (req) => {
    const sb = getChatSb();
    const orgId = req.effectiveOrganizationId || req.user.organization_id?.toString();
    return { sb, orgId };
};

// ======================================================
// CONCURRENT LOCK + BATCH HELPER
// ======================================================
const generatingSchemes = new Map();

async function batchUpsert(sb, table, rows, onConflict, chunkSize = 1000) {
    const VALID_CONFLICTS = ['scheme_id, subject_id, student_id', 'scheme_id, student_id'];
    if (!VALID_CONFLICTS.includes(onConflict)) {
        throw new Error(`Invalid onConflict column mapping: ${onConflict}`);
    }
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await sb.from(table).upsert(chunk, { onConflict, ignoreDuplicates: false });
        if (error) throw error;
    }
}

// ======================================================
// AUDIT LOG HELPER
// ======================================================
async function logAuditEntry(sb, { schemeId, studentId, changedBy, reason, oldValue, newValue }) {
    try {
        await sb.from('result_audit_logs').insert({
            scheme_id: schemeId,
            student_id: studentId,
            changed_by: changedBy,
            reason: reason || 'Marks updated',
            old_value: oldValue || null,
            new_value: newValue || null,
        });
    } catch (err) {
        // Audit logging should never block the main operation
        console.error('[Audit Log Error]:', err.message);
    }
}

const STUDENT_ID_COLUMNS = new Set(['prn', 'roll no', 'roll_no', 'roll number', 'name', 'student', 'student name']);
const ABSENT_TOKENS = new Set(['', 'ab', 'absent', 'na', 'n/a']);
const COMPONENT_COLUMN_TOKENS = ['internal', 'external', 'theory', 'practical', 'oral'];

function normalizeColumn(value) {
    return String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function toNumberOrNull(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function isAbsentValue(value) {
    return ABSENT_TOKENS.has(normalizeColumn(value));
}

function toBooleanFlag(value) {
    if (typeof value === 'boolean') return value;
    const normalized = normalizeColumn(value);
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', ''].includes(normalized)) return false;
    return Boolean(value);
}

function parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];
        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            i += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
}

function parseCsvText(csvText) {
    const lines = String(csvText || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = parseCsvLine(line);
        return headers.reduce((row, header, idx) => {
            row[header] = values[idx] || '';
            return row;
        }, {});
    });
}

function parseSpreadsheetBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

function parseRowsPayload(body, file) {
    if (Array.isArray(body.rows)) return body.rows;
    if (typeof body.csvText === 'string') return parseCsvText(body.csvText);
    if (file?.buffer) {
        const fileName = file.originalname || '';
        const fileType = file.mimetype || '';
        const isCsv = fileType.includes('csv') || /\.csv$/i.test(fileName);
        return isCsv ? parseCsvText(file.buffer.toString('utf8')) : parseSpreadsheetBuffer(file.buffer);
    }
    if (typeof body.fileBase64 === 'string') {
        const clean = body.fileBase64.includes(',') ? body.fileBase64.split(',').pop() : body.fileBase64;
        return parseSpreadsheetBuffer(Buffer.from(clean, 'base64'));
    }
    return [];
}

function subjectAliases(subject) {
    return [
        subject.subject_name,
        subject.subject_code,
        subject.course_code,
    ].filter(Boolean).map(normalizeColumn);
}

function readColumnValue(row, aliases, component) {
    // 1. Exact match priority (without component)
    const exactMatch = Object.entries(row).find(([key]) => aliases.some(alias => normalizeColumn(key) === alias));
    if (exactMatch && !component) return exactMatch[1];

    // 2. Fallback to substring matching
    for (const [key, value] of Object.entries(row)) {
        const col = normalizeColumn(key);
        if (STUDENT_ID_COLUMNS.has(col)) continue;
        const exactAlias = aliases.some(alias => col === alias);
        const matchesAlias = exactAlias || aliases.some(alias => col.startsWith(`${alias} `) || col.endsWith(` ${alias}`));
        if (!matchesAlias) continue;
        if (!component && !exactAlias && COMPONENT_COLUMN_TOKENS.some(token => col.includes(token))) continue;
        if (!component) return value;
        if (col.includes(component)) return value;
    }
    return undefined;
}

function readSubjectInput(row, subject) {
    const aliases = subjectAliases(subject);
    const direct = readColumnValue(row, aliases);
    const internal = readColumnValue(row, aliases, 'internal');
    const external = readColumnValue(row, aliases, 'external') ?? readColumnValue(row, aliases, 'theory');

    if (direct === undefined && internal === undefined && external === undefined) {
        return { hasValue: false };
    }

    const componentValues = [internal, external].filter(value => value !== undefined);
    if (direct !== undefined && isAbsentValue(direct)) {
        return { hasValue: true, isAbsent: true, marks: null, internal: null, external: null };
    }
    if (direct === undefined && componentValues.length > 0 && componentValues.every(isAbsentValue)) {
        return { hasValue: true, isAbsent: true, marks: null, internal: null, external: null };
    }

    const internalMarks = toNumberOrNull(internal);
    const externalMarks = toNumberOrNull(external);
    const directMarks = toNumberOrNull(direct);
    const marks = directMarks ?? (componentValues.length > 0 ? (internalMarks ?? 0) + (externalMarks ?? 0) : null);

    return {
        hasValue: true,
        isAbsent: false,
        marks,
        internal: internalMarks,
        external: externalMarks,
    };
}

function buildMarksFromRows({ rows, subjects, studentByPrn, schemeId, orgId, req, enforceTeacherOwnership = false }) {
    const marksToInsert = [];
    const errors = [];
    let successCount = 0;
    const teacherId = req.user._id.toString();

    for (const row of rows) {
        const prn = String(row.prn || row.PRN || row['Roll No'] || row.roll_no || '').trim().toLowerCase();
        const student = studentByPrn[prn];
        if (!student) {
            errors.push({ prn, reason: 'Student not found' });
            continue;
        }

        let rowValid = true;
        let rowSubjectCount = 0;
        const rowMarks = [];
        for (const subject of subjects) {
            const input = readSubjectInput(row, subject);
            if (!input.hasValue) continue;

            if (enforceTeacherOwnership && subject.teacher_id && String(subject.teacher_id) !== teacherId) {
                errors.push({ prn, subject: subject.subject_name, reason: 'Teacher is not assigned to this subject' });
                rowValid = false;
                break;
            }

            if (!input.isAbsent && (input.marks === null || input.marks < 0)) {
                errors.push({ prn, subject: subject.subject_name, reason: 'Invalid marks value' });
                rowValid = false;
                break;
            }
            if (!input.isAbsent && input.marks > subject.max_marks) {
                errors.push({ prn, subject: subject.subject_name, reason: `Marks exceed max (${subject.max_marks})` });
                rowValid = false;
                break;
            }

            rowMarks.push({
                scheme_id: schemeId,
                subject_id: subject.id,
                org_id: orgId,
                student_id: student._id.toString(),
                marks_obtained: input.isAbsent ? null : input.marks,
                internal_marks: input.internal,
                external_marks: input.external,
                seat_no: row.seat_no || row.seatNo || row.seatno || row['Seat No'] || row['seat no'] || null,
                is_absent: input.isAbsent,
                is_backlog: toBooleanFlag(row.is_backlog || row.backlog || row[`${subject.subject_name} backlog`]),
                passed_in_reexam: toBooleanFlag(row.passed_in_reexam || row.reexam || row[`${subject.subject_name} reexam`]),
                ordinance_applied: row.ordinance_applied || row.ordinance || row[`${subject.subject_name} ordinance`] || null,
            });
            rowSubjectCount += 1;
        }

        if (rowValid && rowSubjectCount > 0) {
            marksToInsert.push(...rowMarks);
            successCount += 1;
        }
    }

    return { marksToInsert, errors, successCount };
}

// ======================================================
// DYNAMIC RULE HELPERS (all from rules_json)
// ======================================================

/**
 * FULL rules_json schema (org admin sets everything):
 * {
 *   mode: "college" | "school",
 *
 *   // --- GRADE ---
 *   pass_percentage: 40,
 *   compartment_threshold: 2,
 *   grace_marks: 5,
 *   absent_counts_as_zero: true,
 *   include_all_subjects: true,
 *   best_of_n: null,
 *
 *   // --- GRADE SCALE ---
 *   grade_scale: [
 *     { min: 90, grade: "O",  points: 10 },
 *     { min: 75, grade: "A+", points: 9  },
 *     ...
 *     { min: 0,  grade: "F",  points: 0  }
 *   ],
 *
 *   // --- EXTENDED STATUS (Phase 2) ---
 *   status_rules: [
 *     { min_pct: 75, status: "distinction" },
 *     { min_pct: 60, status: "first_class" },
 *     { min_pct: 50, status: "higher_second_class" },
 *     { min_pct: 40, status: "pass" }
 *   ],
 *
 *   // --- NORMALIZATION ---
 *   normalization: { enabled: false, internal_max: 30, external_max: 70, normalize_to: 100 },
 *
 *   // --- SCHOOL MODE ---
 *   term_weights: { term1: 0.4, term2: 0.6 },
 *
 *   // --- CGPA to PERCENTAGE ---
 *   cgpa_to_percentage: { enabled: true, multiplier: 9.5 }
 * }
 */

function getGradeAndPoints(pct, rules) {
    for (const g of (rules.grade_scale || [])) {
        if (pct >= g.min) return { grade: g.grade, points: g.points ?? 0 };
    }
    return { grade: 'F', points: 0 };
}

function isRelativeGradingEnabled(rules) {
    return rules.relative_grading === true || rules.relativegrading === true || rules.relative_grading?.enabled === true;
}

function gradePointsForLabel(label, rules) {
    const scale = rules.relative_grading?.grade_points || { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, P: 4, F: 0 };
    return scale[label] ?? 0;
}

function computeSubjectStats(allMarks, subjectById, norm) {
    const grouped = {};
    for (const mark of allMarks) {
        if (mark.is_absent) continue;
        const subject = subjectById[mark.subject_id];
        if (!subject) continue;
        const value = normalizeMarks(mark, norm);
        if (value === null || value === undefined) continue;
        if (!grouped[mark.subject_id]) grouped[mark.subject_id] = [];
        grouped[mark.subject_id].push(value);
    }

    return Object.fromEntries(Object.entries(grouped).map(([subjectId, values]) => {
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
        return [subjectId, { mean, sd: Math.sqrt(variance), count: values.length }];
    }));
}

function getSubjectGradeAndPoints(mark, subject, stats, rules, passPercentage) {
    const threshold = subject.pass_marks ?? Math.ceil(subject.max_marks * passPercentage / 100);
    const passed = !mark.is_absent && (mark.marks_obtained || 0) >= threshold;
    if (!passed) return { grade: 'F', points: 0, passed };

    const pct = subject.max_marks > 0 ? ((mark.marks_obtained || 0) / subject.max_marks) * 100 : 0;
    if (!isRelativeGradingEnabled(rules)) {
        return { ...getGradeAndPoints(pct, rules), passed };
    }

    const subjectStats = stats[mark.subject_id];
    if (!subjectStats || subjectStats.count < 2 || subjectStats.sd === 0) {
        return { ...getGradeAndPoints(pct, rules), passed };
    }

    const markValue = mark.marks_obtained || 0;
    const { mean, sd } = subjectStats;
    let grade = 'P';
    if (markValue >= mean + (1.5 * sd)) grade = 'O';
    else if (markValue >= mean + sd) grade = 'A+';
    else if (markValue >= mean + (0.5 * sd)) grade = 'A';
    else if (markValue >= mean) grade = 'B+';
    else if (markValue >= mean - (0.5 * sd)) grade = 'B';
    else if (markValue >= mean - sd) grade = 'C';
    return { grade, points: gradePointsForLabel(grade, rules), passed };
}

// Grace: bump near-fail students to pass threshold
function applyGrace(obtained, threshold, grace) {
    if (!grace || grace <= 0 || obtained >= threshold) return obtained;
    if (obtained >= threshold - grace) return threshold;
    return obtained;
}

// Normalization: internal + external scaled
function normalizeMarks(mark, norm) {
    if (!norm?.enabled) return mark.marks_obtained;
    const hasComponents = mark.internal_marks != null || mark.external_marks != null;
    if (!hasComponents) return mark.marks_obtained;
    const total = (norm.internal_max || 0) + (norm.external_max || 0);
    if (!total) return mark.marks_obtained;
    const raw = (mark.internal_marks || 0) + (mark.external_marks || 0);
    return norm.normalize_to ? (raw / total) * norm.normalize_to : raw;
}

// Phase 2: Extended status — STRICT PRIORITY: fail > compartment > distinction > first_class > pass
function computeStatus(percentage, failedCount, compartmentThreshold, rules) {
    // #2 FIX: Fail/compartment ALWAYS override, even at 80%+
    if (failedCount > compartmentThreshold) return 'fail';
    if (failedCount > 0) return 'compartment';

    // Only apply extended status_rules if ALL subjects passed
    const statusRules = rules.status_rules;
    if (statusRules && Array.isArray(statusRules) && statusRules.length > 0) {
        // Always sort DESC by min_pct for correct priority
        const sorted = [...statusRules].sort((a, b) => b.min_pct - a.min_pct);
        for (const rule of sorted) {
            if (percentage >= (rule.min_pct ?? 0)) return rule.status;
        }
    }
    return 'pass';
}

// Phase 2: Ranking with ties (1,1,3 format)
function computeRanking(results) {
    // #1 FIX: Round percentage to 2 decimals BEFORE ranking to prevent floating-point ties
    results.forEach(r => { r.percentage = Math.round(r.percentage * 100) / 100; });
    const sorted = [...results].sort((a, b) => b.percentage - a.percentage);
    let rank = 1;
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i].percentage < sorted[i - 1].percentage) {
            rank = i + 1; // Skip ranks for ties (1,1,3)
        }
        sorted[i].scheme_rank = rank;
    }
    return sorted;
}


// ======================================================
// SCHEME MANAGEMENT
// ======================================================

router.get('/schemes', isAuthenticated, requireRole('org_admin', 'teacher'), async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const { data, error } = await sb
            .from('result_schemes')
            .select('*, result_subjects(count)')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ schemes: data });
    } catch (err) {
        console.error('[Result Schemes GET]:', err);
        res.status(500).json({ message: 'Failed to fetch schemes' });
    }
});

router.post('/schemes', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const { id, name, academic_year, semester, division_id, rules_json } = req.body;

        if (!name) return res.status(400).json({ message: 'Scheme name is required' });

        const defaultRules = {
            mode: 'college',
            pass_percentage: 40,
            compartment_threshold: 2,
            grace_marks: 0,
            absent_counts_as_zero: true,
            include_all_subjects: true,
            best_of_n: null,
            normalization: { enabled: false, internal_max: 30, external_max: 70, normalize_to: 100 },
            term_weights: { term1: 0.4, term2: 0.6 },
            cgpa_to_percentage: { enabled: false, multiplier: 9.5 },
            status_rules: [
                { min_pct: 75, status: 'distinction' },
                { min_pct: 60, status: 'first_class' },
                { min_pct: 50, status: 'higher_second_class' },
                { min_pct: 40, status: 'pass' }
            ],
            grade_scale: [
                { min: 90, grade: 'O', points: 10 },
                { min: 75, grade: 'A+', points: 9 },
                { min: 60, grade: 'A', points: 8 },
                { min: 50, grade: 'B+', points: 7 },
                { min: 45, grade: 'B', points: 6 },
                { min: 40, grade: 'C', points: 5 },
                { min: 0, grade: 'F', points: 0 }
            ]
        };

        // #5 FIX: Validate status_rules before saving
        const finalRules = rules_json || defaultRules;
        if (finalRules.status_rules && Array.isArray(finalRules.status_rules)) {
            // Sort descending by min_pct
            finalRules.status_rules.sort((a, b) => b.min_pct - a.min_pct);
            // Validate percentages 0–100
            for (const sr of finalRules.status_rules) {
                if (sr.min_pct < 0 || sr.min_pct > 100) {
                    return res.status(400).json({ message: `Invalid status rule: min_pct ${sr.min_pct} must be 0–100` });
                }
            }
        }

        const payload = {
            org_id: orgId,
            name: name.trim(),
            academic_year: academic_year || '',
            semester: semester || '',
            division_id: division_id || null,
            rules_json: finalRules,
            created_by: req.user._id.toString()
        };

        let result;
        if (id) {
            const { data, error } = await sb.from('result_schemes').update(payload).eq('id', id).eq('org_id', orgId).select().single();
            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await sb.from('result_schemes').insert(payload).select().single();
            if (error) throw error;
            result = data;
        }
        res.json({ message: 'Scheme saved', scheme: result });
    } catch (err) {
        console.error('[Result Scheme POST]:', err);
        res.status(500).json({ message: 'Failed to save scheme' });
    }
});

router.delete('/schemes/:id', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const { data: scheme } = await sb.from('result_schemes').select('status').eq('id', req.params.id).eq('org_id', orgId).single();
        if (scheme?.status === 'locked') return res.status(403).json({ message: 'Locked schemes cannot be deleted' });
        await sb.from('result_schemes').delete().eq('id', req.params.id).eq('org_id', orgId);
        res.json({ message: 'Scheme deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete scheme' });
    }
});

// ======================================================
// SUBJECTS
// ======================================================

router.get('/schemes/:id/subjects', isAuthenticated, async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const { data, error } = await sb.from('result_subjects').select('*')
            .eq('scheme_id', req.params.id).eq('org_id', orgId).order('created_at');
        if (error) throw error;
        res.json({ subjects: data });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch subjects' });
    }
});

router.post('/schemes/:id/subjects', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const { subjects } = req.body;
        if (!Array.isArray(subjects) || subjects.length === 0) return res.status(400).json({ message: 'Subjects array required' });

        const { data: scheme } = await sb.from('result_schemes').select('status').eq('id', req.params.id).eq('org_id', orgId).single();
        if (scheme?.status === 'locked') return res.status(403).json({ message: 'Scheme is locked' });

        await sb.from('result_subjects').delete().eq('scheme_id', req.params.id).eq('org_id', orgId);

        const VALID_TYPES = ['THEORY', 'LAB', 'ELECTIVE'];
        const insertData = subjects.map(s => ({
            scheme_id: req.params.id,
            org_id: orgId,
            subject_code: s.subject_code || s.course_code || '',
            course_code: s.course_code || s.subject_code || '',
            teacher_id: s.teacher_id || s.teacherId || null,
            subject_name: s.subject_name.trim(),
            course_type: VALID_TYPES.includes(s.course_type) ? s.course_type : 'THEORY',
            max_marks: parseInt(s.max_marks) || 100,
            pass_marks: s.pass_marks ? parseInt(s.pass_marks) : null,
            credits: parseInt(s.credits) || 2
        }));

        const { data, error } = await sb.from('result_subjects').insert(insertData).select();
        if (error) throw error;
        res.json({ message: 'Subjects saved', subjects: data });
    } catch (err) {
        console.error('[Result Subjects POST]:', err);
        res.status(500).json({ message: 'Failed to save subjects' });
    }
});

// ======================================================
// MARKS UPLOAD
// ======================================================

router.post('/schemes/:id/upload-marks', isAuthenticated, requireRole('org_admin', 'teacher'), async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const schemeId = req.params.id;
        const { rows } = req.body;

        if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: 'No rows provided' });

        const { data: schemeCheck } = await sb.from('result_schemes').select('status, rules_json').eq('id', schemeId).eq('org_id', orgId).single();
        if (schemeCheck?.status === 'locked') return res.status(403).json({ message: 'Scheme is locked' });

        const norm = schemeCheck?.rules_json?.normalization;

        const { data: subjects, error: subjErr } = await sb.from('result_subjects').select('*').eq('scheme_id', schemeId).eq('org_id', orgId);
        if (subjErr) throw subjErr;
        if (!subjects?.length) return res.status(400).json({ message: 'Add subjects first' });

        const prns = rows.map(r => r.prn || r.PRN || r['Roll No'] || r.roll_no).filter(Boolean);
        const students = await User.find({
            $or: [{ prn: { $in: prns } }, { roll_no: { $in: prns } }],
            organization_id: req.user.organization_id
        }, 'name prn roll_no _id').lean();

        const studentByPrn = {};
        students.forEach(s => {
            if (s.prn) studentByPrn[s.prn.toLowerCase()] = s;
            if (s.roll_no) studentByPrn[String(s.roll_no).toLowerCase()] = s;
        });

        const { marksToInsert, errors, successCount } = buildMarksFromRows({
            rows,
            subjects,
            studentByPrn,
            schemeId,
            orgId,
            req,
            enforceTeacherOwnership: req.user.role === 'teacher'
        });

        if (marksToInsert.length > 0) {
            // Fetch existing marks for audit trail before overwriting
            const existingStudentIds = [...new Set(marksToInsert.map(m => m.student_id))];
            const { data: existingMarks } = await sb.from('result_marks')
                .select('student_id, subject_id, marks_obtained, internal_marks, external_marks')
                .eq('scheme_id', schemeId)
                .eq('org_id', orgId)
                .in('student_id', existingStudentIds);

            const existingMap = {};
            (existingMarks || []).forEach(m => {
                existingMap[`${m.student_id}:${m.subject_id}`] = m;
            });

            await batchUpsert(sb, 'result_marks', marksToInsert, 'scheme_id, subject_id, student_id', 1000);

            // Log audit entries for marks that changed
            for (const newMark of marksToInsert) {
                const key = `${newMark.student_id}:${newMark.subject_id}`;
                const old = existingMap[key];
                if (old && old.marks_obtained !== newMark.marks_obtained) {
                    await logAuditEntry(sb, {
                        schemeId,
                        studentId: newMark.student_id,
                        changedBy: req.user._id.toString(),
                        reason: 'Marks re-uploaded via upload-marks',
                        oldValue: { marks_obtained: old.marks_obtained, internal: old.internal_marks, external: old.external_marks },
                        newValue: { marks_obtained: newMark.marks_obtained, internal: newMark.internal_marks, external: newMark.external_marks },
                    });
                }
            }
        }
        res.json({ success: successCount, failed: errors.length, errors });
    } catch (err) {
        console.error('[Upload Marks Error]:', err);
        res.status(500).json({ message: 'Failed to upload marks' });
    }
});

// ======================================================
// RESULT ENGINE - GENERATE (School + College, Phase 2)
// ======================================================

router.post('/schemes/:id/generate', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    const { sb, orgId } = getSb(req);
    const schemeId = req.params.id;

    if (generatingSchemes.get(schemeId)) {
        return res.status(409).json({ message: 'Already generating. Please wait.' });
    }
    generatingSchemes.set(schemeId, true);

    // TTL Cleanup: Reset lock after 5 minutes to prevent permanent lock on crash
    let ttlTimer = setTimeout(async () => {
        generatingSchemes.delete(schemeId);
        await sb.from('result_schemes').update({ is_generating: false }).eq('id', schemeId).catch(() => { });
    }, 5 * 60 * 1000);

    const startTime = Date.now();

    try {
        const { data: scheme, error: schErr } = await sb
            .from('result_schemes').select('*').eq('id', schemeId).eq('org_id', orgId).single();
        if (schErr || !scheme) return res.status(404).json({ message: 'Scheme not found' });
        if (scheme.status === 'locked') return res.status(403).json({ message: 'Scheme is locked' });
        if (scheme.is_generating) {
            return res.status(409).json({ message: 'Generation in progress (DB lock). Wait and retry.' });
        }

        await sb.from('result_schemes').update({ is_generating: true }).eq('id', schemeId);

        // ======== ALL CONFIG FROM rules_json ========
        const rules = scheme.rules_json;
        const mode = rules.mode || 'college';
        const passPercentage = rules.pass_percentage ?? 40;
        const compartmentThreshold = rules.compartment_threshold ?? 2;
        const graceMarks = rules.grace_marks ?? 0;
        const absentCountsAsZero = rules.absent_counts_as_zero ?? true;
        const includeAllSubjects = rules.include_all_subjects ?? true;
        const bestOfN = rules.best_of_n ?? null;
        const norm = rules.normalization ?? { enabled: false };
        const cgpaConv = rules.cgpa_to_percentage ?? { enabled: false, multiplier: 9.5 };

        const { data: subjects, error: sErr } = await sb
            .from('result_subjects').select('*').eq('scheme_id', schemeId);
        if (sErr) throw sErr;
        if (!subjects?.length) return res.status(400).json({ message: 'No subjects found' });

        const subjectById = {};
        subjects.forEach(s => { subjectById[s.id] = s; });

        const { data: allMarks, error: marksErr } = await sb
            .from('result_marks').select('*').eq('scheme_id', schemeId).eq('org_id', orgId);
        if (marksErr) throw marksErr;
        if (!allMarks?.length) return res.status(400).json({ message: 'No marks uploaded' });



        // Group by student
        const studentMarksMap = {};
        for (const mark of allMarks) {
            if (!studentMarksMap[mark.student_id]) studentMarksMap[mark.student_id] = {};
            if (!studentMarksMap[mark.student_id][mark.subject_id]) {
                studentMarksMap[mark.student_id][mark.subject_id] = mark;
            } else {
                if (mark.internal_marks != null) studentMarksMap[mark.student_id][mark.subject_id].internal_marks = mark.internal_marks;
                if (mark.external_marks != null) studentMarksMap[mark.student_id][mark.subject_id].external_marks = mark.external_marks;
                if (mark.seat_no) studentMarksMap[mark.student_id][mark.subject_id].seat_no = mark.seat_no;
            }
        }

        const totalCredits = subjects.reduce((acc, s) => acc + (s.credits || 2), 0);
        const relativeStats = computeSubjectStats(allMarks, subjectById, norm);
        const studentIds = [...new Set(allMarks.map(m => m.student_id))];
        const studentDocs = await User.find({ _id: { $in: studentIds } }, 'name prn roll_no abc_id fatherName motherName dob eligibilityNo pattern branch batch profilePicture signature').lean();
        const studentSnapshotMap = studentDocs.reduce((acc, student) => {
            acc[student._id.toString()] = student;
            return acc;
        }, {});
        const resultsToSave = [];

        for (const [studentId, subjectMarkMap] of Object.entries(studentMarksMap)) {
            const marks = Object.values(subjectMarkMap);

            // STEP 1: Normalize (internal+external)
            const normalized = marks.map(m => {
                if (m.is_absent) return m;
                const val = normalizeMarks(m, norm);
                return { ...m, marks_obtained: val ?? m.marks_obtained };
            });

            // STEP 2: Grace marks
            const graced = normalized.map(m => {
                const subj = subjectById[m.subject_id];
                if (!subj || m.is_absent) return m;
                const threshold = subj.pass_marks ?? Math.ceil(subj.max_marks * passPercentage / 100);
                return { ...m, marks_obtained: applyGrace(m.marks_obtained || 0, threshold, graceMarks) };
            });

            // STEP 3: Absent handling
            const effective = graced.map(m => ({
                ...m,
                marks_obtained: m.is_absent ? (absentCountsAsZero ? 0 : null) : m.marks_obtained
            })).filter(m => m.marks_obtained !== null);

            // STEP 4: Best-of-N
            let scoring = effective;
            if (!includeAllSubjects && bestOfN && bestOfN > 0) {
                scoring = [...effective].sort((a, b) => (b.marks_obtained || 0) - (a.marks_obtained || 0)).slice(0, bestOfN);
            }

            // STEP 5: Totals
            const totalMax = scoring.reduce((acc, m) => acc + (subjectById[m.subject_id]?.max_marks || 0), 0);
            const totalObt = scoring.reduce((acc, m) => acc + (m.marks_obtained || 0), 0);
            const percentage = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
            const { grade, points: gradePoints } = getGradeAndPoints(percentage, rules);

            // STEP 6: Per-subject pass check
            let failedCount = 0;
            let earnedCredits = 0;
            for (const m of effective) {
                const subj = subjectById[m.subject_id];
                if (!subj) continue;
                const threshold = subj.pass_marks ?? Math.ceil(subj.max_marks * passPercentage / 100);
                const passed = !m.is_absent && (m.marks_obtained || 0) >= threshold;
                if (!passed) failedCount++;
                else earnedCredits += (subj.credits || 2);
            }

            // STEP 7: Status (Phase 2 extended: distinction, first_class, etc.)
            const resultStatus = computeStatus(percentage, failedCount, compartmentThreshold, rules);

            // STEP 8: SGPA (college mode) / null for school
            // #3 FIX: School mode stores null (not 0) for SGPA/CGPA/credits
            let sgpa = null;
            let cgpa = null;
            let percentageEquiv = null;

            if (mode === 'college') {
                const cwp = effective.reduce((acc, m) => {
                    const subj = subjectById[m.subject_id];
                    if (!subj) return acc;
                    const { points, passed } = getSubjectGradeAndPoints(m, subj, relativeStats, rules, passPercentage);
                    return acc + (passed ? points * (subj.credits || 2) : 0);
                }, 0);
                sgpa = totalCredits > 0 ? Math.round((cwp / totalCredits) * 100) / 100 : 0;
                cgpa = sgpa; // Single sem = SGPA (true CGPA from /cgpa endpoint)

                // #4 FIX: Only compute if CGPA is valid and non-null
                if (cgpaConv.enabled && cgpaConv.multiplier && cgpa != null && cgpa > 0) {
                    percentageEquiv = Math.round(cgpa * cgpaConv.multiplier * 100) / 100;
                }
            }
            // School mode: sgpa/cgpa/credits all null, percentage is the main metric

            // STEP 9: Per-subject detail
            const resultDetail = effective.map(m => {
                const subj = subjectById[m.subject_id];
                if (!subj) return null;
                const threshold = subj.pass_marks ?? Math.ceil(subj.max_marks * passPercentage / 100);
                const { grade: sg, points: sp, passed } = getSubjectGradeAndPoints(m, subj, relativeStats, rules, passPercentage);
                return {
                    subject_id: m.subject_id,
                    subject_code: subj.subject_code,
                    course_code: subj.course_code || subj.subject_code,
                    subject_name: subj.subject_name,
                    course_type: subj.course_type,
                    max_marks: subj.max_marks,
                    credits: subj.credits,
                    marks_obtained: m.marks_obtained,
                    internal_marks: m.internal_marks ?? null,
                    external_marks: m.external_marks ?? null,
                    is_absent: m.is_absent,
                    is_backlog: Boolean(m.is_backlog),
                    passed_in_reexam: Boolean(m.passed_in_reexam),
                    ordinance_applied: m.ordinance_applied || '',
                    grade: sg,
                    grade_points: sp,
                    credit_earned: passed ? (subj.credits || 2) : 0,
                    earn_credits: passed ? (subj.credits || 2) : 0,
                    pass_marks: threshold
                };
            }).filter(Boolean);

            // #3 FIX: School mode nulls out credit fields
            const studentSnapshot = studentSnapshotMap[studentId] || {};
            const studentSeatNo = marks.find(m => m.seat_no)?.seat_no || studentSnapshot.roll_no || studentSnapshot.prn || null;
            resultsToSave.push({
                scheme_id: schemeId, org_id: orgId, student_id: studentId,
                total_marks: Math.round(totalObt * 100) / 100,
                max_total_marks: totalMax,
                percentage: Math.round(percentage * 100) / 100,
                grade, grade_points: gradePoints,
                sgpa, cgpa,
                percentage_equivalent: percentageEquiv,
                earn_credits: mode === 'college' ? earnedCredits : null,
                total_credits: mode === 'college' ? totalCredits : null,
                status: resultStatus,
                result_detail: resultDetail,
                seat_no: studentSeatNo,
                snapshot_student_name: studentSnapshot.name || '',
                snapshot_prn: studentSnapshot.prn || studentSnapshot.roll_no || '',
                snapshot_abc_id: studentSnapshot.abc_id || '',
                snapshot_father_name: studentSnapshot.fatherName || '',
                snapshot_mother_name: studentSnapshot.motherName || '',
                snapshot_dob: studentSnapshot.dob || null,
                snapshot_eligibility_no: studentSnapshot.eligibilityNo || '',
                snapshot_pattern: studentSnapshot.pattern || '',
                snapshot_program: studentSnapshot.branch || studentSnapshot.batch || '',
                snapshot_college: req.institutionProfile?.organizationName || '',
                generated_at: new Date().toISOString()
            });
        }

        // STEP 10: RANKING (ties: 1,1,3)
        const rankedResults = computeRanking(resultsToSave);

        // Version tracking
        const { data: existing } = await sb.from('results').select('student_id, version').eq('scheme_id', schemeId);
        const existVer = {};
        (existing || []).forEach(r => { existVer[r.student_id] = r.version || 1; });

        const final = rankedResults.map(r => ({
            ...r,
            version: (existVer[r.student_id] || 0) + 1
        }));

        // Delete then batch insert (failure recovery)
        await sb.from('results').delete().eq('scheme_id', schemeId).eq('org_id', orgId);
        await batchUpsert(sb, 'results', final, 'scheme_id, student_id', 1000);

        const dur = Math.round((Date.now() - startTime) / 100) / 10;
        await sb.from('result_schemes').update({
            status: 'generated', is_generating: false,
            generation_time_seconds: dur, last_student_count: final.length,
            updated_at: new Date().toISOString()
        }).eq('id', schemeId);

        console.log(`[Generate] ${schemeId}: ${final.length} students, ${dur}s, mode=${mode}`);

        res.json({
            message: `Results generated for ${final.length} students`,
            generated: final.length, duration_seconds: dur, mode,
            pass: final.filter(r => r.status === 'pass').length,
            distinction: final.filter(r => r.status === 'distinction').length,
            first_class: final.filter(r => r.status === 'first_class').length,
            compartment: final.filter(r => r.status === 'compartment').length,
            fail: final.filter(r => r.status === 'fail').length
        });

    } catch (err) {
        await sb.from('result_schemes').update({ is_generating: false }).eq('id', schemeId).catch(() => { });
        console.error('[Generate Results Error]:', err);
        res.status(500).json({ message: 'Failed to generate. You can retry safely.' });
    } finally {
        if (ttlTimer) clearTimeout(ttlTimer);
        generatingSchemes.delete(schemeId);
    }
});

// ======================================================
// TRUE CGPA (across all published semesters)
// ======================================================

router.get('/student/:studentId/cgpa', isAuthenticated, async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const studentId = req.params.studentId;

        if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { data: allResults, error } = await sb
            .from('results')
            .select('sgpa, total_credits, earn_credits, scheme_id, result_schemes!inner(name, semester, academic_year, status, rules_json)')
            .eq('org_id', orgId)
            .eq('student_id', studentId)
            .eq('result_schemes.status', 'published');

        if (error) throw error;
        if (!allResults?.length) return res.json({ cgpa: null, semesters: [] });

        // True CGPA = weighted average of SGPAs across all semesters
        const totalWeighted = allResults.reduce((acc, r) => acc + (r.sgpa * (r.total_credits || 0)), 0);
        const totalCreds = allResults.reduce((acc, r) => acc + (r.total_credits || 0), 0);
        const cgpa = totalCreds > 0 ? Math.round((totalWeighted / totalCreds) * 100) / 100 : 0;

        // CGPA to percentage conversion from the latest scheme's rules
        const latestRules = allResults[allResults.length - 1]?.result_schemes?.rules_json;
        const conv = latestRules?.cgpa_to_percentage;
        const pctEquiv = (conv?.enabled && conv?.multiplier) ? Math.round(cgpa * conv.multiplier * 100) / 100 : null;

        res.json({
            cgpa, percentage_equivalent: pctEquiv,
            total_semesters: allResults.length,
            semesters: allResults.map(r => ({
                scheme_id: r.scheme_id,
                scheme_name: r.result_schemes?.name,
                semester: r.result_schemes?.semester,
                academic_year: r.result_schemes?.academic_year,
                sgpa: r.sgpa,
                credits: r.total_credits,
                earn_credits: r.earn_credits
            }))
        });
    } catch (err) {
        console.error('[CGPA GET]:', err);
        res.status(500).json({ message: 'Failed to calculate CGPA' });
    }
});

// ======================================================
// PUBLISH / LOCK
// ======================================================

router.post('/schemes/:id/publish', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const { data: scheme } = await sb.from('result_schemes').select('status').eq('id', req.params.id).eq('org_id', orgId).single();
        if (!scheme) return res.status(404).json({ message: 'Scheme not found' });
        if (scheme.status === 'draft') return res.status(400).json({ message: 'Generate results first' });
        if (scheme.status === 'locked') return res.status(403).json({ message: 'Already locked' });
        await sb.from('result_schemes').update({ status: 'published' }).eq('id', req.params.id);
        res.json({ message: 'Results published to students' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to publish' });
    }
});

router.post('/schemes/:id/lock', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        await sb.from('result_schemes').update({ status: 'locked' }).eq('id', req.params.id).eq('org_id', orgId);
        res.json({ message: 'Scheme locked permanently' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to lock scheme' });
    }
});

// ======================================================
// ADMIN VIEW / STUDENT VIEW
// ======================================================

async function getOrganizationSnapshot(orgId) {
    if (!orgId) return null;
    try {
        return await Organization.findById(orgId)
            .select('name logo_url address website organizationCode private_code branding')
            .lean();
    } catch {
        return null;
    }
}

function romanSemester(value) {
    const map = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };
    const key = String(value || '').replace(/\D/g, '');
    return map[key] || String(value || '');
}

function formatErpDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

function normalizeErpSubjectDetail(subject) {
    const credits = subject.credits ?? subject.course_credit ?? 0;
    const gradePoints = subject.grade_points ?? subject.gradepoint ?? 0;
    const creditEarned = subject.credit_earned ?? subject.earn_credits ?? 0;
    return {
        ...subject,
        course_code: subject.course_code || subject.subject_code || '',
        course_name: subject.course_name || subject.subject_name || '',
        coursetype: subject.coursetype || subject.course_type || '',
        coursetypename: subject.coursetypename || subject.course_type || '',
        course_credit: credits,
        credit_earned: creditEarned,
        subtotal: subject.subtotal ?? subject.max_marks ?? null,
        obtainmarks: subject.obtainmarks ?? subject.marks_obtained ?? null,
        gradepoint: gradePoints,
        ispassgrade: creditEarned > 0,
        appearedinbacklog: Boolean(subject.is_backlog),
        passedinreexam: Boolean(subject.passed_in_reexam),
        ordianance: subject.ordianance || subject.ordinance_applied || '',
    };
}

function buildErpPayload({ result, scheme, student, orgId, organization }) {
    const semLabel = scheme?.semester || '';
    const resultDetail = (result.result_detail || []).map(normalizeErpSubjectDetail);
    const qrData = `${orgId}:${result.scheme_id}:${result.student_id}`;
    const status = String(result.status || '').toUpperCase();
    const organizationName = result.snapshot_college || organization?.name || '';
    const organizationCode = organization?.organizationCode || organization?.private_code || '';
    const fatherName = result.snapshot_father_name || student?.fatherName || '';
    const motherName = result.snapshot_mother_name || student?.motherName || '';
    const dob = result.snapshot_dob || student?.dob || null;
    const eligibilityNo = result.snapshot_eligibility_no || student?.eligibilityNo || '';
    const pattern = result.snapshot_pattern || student?.pattern || '';
    const totalCreditGradePoints = resultDetail.reduce((sum, item) => {
        return sum + (Number(item.course_credit || 0) * Number(item.gradepoint || 0));
    }, 0);

    return {
        regData: {
            relativegrading: isRelativeGradingEnabled(scheme?.rules_json || {}),
            qrimageMultipleNew: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`,
            displayabcid: 'true',
            displaytransitionalgrade: 'true',
            displayfinalgrade: 'true',
            displaystudentphotograph: 'true',
            displayseatno: 'true',
            displayeligibiltyno: 'true',
            displaydeclarationresultdate: 'true',
            displayresultdate: 'false',
            hidecummulativeresult: false,
            hideprintbutton: null,
            currentay: scheme?.academic_year || '',
            currentsem: semLabel,
            currentromansem: romanSemester(semLabel),
            currentsemspi: result.sgpa,
            percentage: result.percentage,
            totalcreditEarned: result.earn_credits,
            totalCredits: result.total_credits,
            totalcreditintogradepoint: totalCreditGradePoints,
            cumulativeresultstatus: status,
            currentsecondsemresultstatus: status,
            fullname_as_per_previous_marksheet: result.snapshot_student_name || student?.name || '',
            father_first_name: fatherName,
            father_full_name: fatherName,
            mother_first_name: motherName,
            dob: formatErpDate(dob),
            eligibility_no: eligibilityNo,
            pattern,
            registration_number: result.snapshot_prn || student?.prn || student?.roll_no || '',
            seatno: result.seat_no || student?.roll_no || '',
            abcid: result.snapshot_abc_id || student?.abc_id || '',
            pname: result.snapshot_program || student?.branch || '',
            program: result.snapshot_program || student?.branch || '',
            organization_name: organizationName,
            organization_code: organizationCode,
            address: organization?.address || '',
            website: organization?.website || '',
            logo: organization?.logo_url || '',
            assetstorageprovider: 'r2',
            photourl: student?.profilePicture || '',
            examSignature: student?.signature || '',
            resultarray: resultDetail,
            spiarray: [result.total_credits, result.earn_credits, result.total_marks, result.sgpa, result.cgpa],
            spiarray2: result._allSemesterSpi || [{ sem: semLabel, spi: result.sgpa, cpi: result.cgpa }],
            spiarray3: resultDetail,
            spiarraypcu: result._allSemesterPcu || [{ sem: semLabel, percentage: result.percentage, credits: result.earn_credits }],
            ordinancemasterlist: (scheme?.rules_json?.ordinance_master_list) || [
                { name: 'Ordinance 8', ledgersymbol: '$', description: 'Grant of additional marks for extra-curricular activity', do_not_add_in_aggregrate: true },
                { name: 'Ordinance 9', ledgersymbol: '#', description: 'Providing of additional facilities and benefits to PwD Students', do_not_add_in_aggregrate: false },
                { name: 'Ordinance 1', ledgersymbol: '@', description: 'About Grace marks', do_not_add_in_aggregrate: false },
            ],
        },
        status: '200',
    };
}

router.get('/schemes/:id/results', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const [{ data, error }, { data: scheme, error: schemeErr }, organization] = await Promise.all([
            sb.from('results').select('*')
                .eq('scheme_id', req.params.id).eq('org_id', orgId)
                .order('scheme_rank', { ascending: true }),
            sb.from('result_schemes').select('*').eq('id', req.params.id).eq('org_id', orgId).single(),
            getOrganizationSnapshot(orgId)
        ]);
        if (error) throw error;
        if (schemeErr) throw schemeErr;

        const studentIds = data.map(r => r.student_id);
        const students = await User.find({ _id: { $in: studentIds } }, 'name prn roll_no abc_id fatherName motherName dob eligibilityNo pattern branch profilePicture signature').lean();
        const studentMap = students.reduce((acc, s) => { acc[s._id.toString()] = s; return acc; }, {});

        res.json({
            results: data.map(r => ({
                ...r,
                studentInfo: studentMap[r.student_id] || {},
                erpPayload: buildErpPayload({ result: r, scheme, student: studentMap[r.student_id], orgId, organization })
            }))
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch results' });
    }
});

router.get('/student/me', isAuthenticated, async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const studentId = req.user._id.toString();

        const { data: myResults, error } = await sb
            .from('results')
            .select('*, result_schemes!inner(id, name, academic_year, semester, status, rules_json)')
            .eq('org_id', orgId)
            .eq('student_id', studentId)
            .eq('result_schemes.status', 'published');

        if (error) throw error;
        const organization = await getOrganizationSnapshot(orgId);
        const student = {
            name: req.user.name,
            prn: req.user.prn,
            roll_no: req.user.roll_no,
            abc_id: req.user.abc_id,
            fatherName: req.user.fatherName,
            motherName: req.user.motherName,
            dob: req.user.dob,
            eligibilityNo: req.user.eligibilityNo,
            pattern: req.user.pattern,
            branch: req.user.branch,
            profilePicture: req.user.profilePicture,
            signature: req.user.signature,
            email: req.user.email
        };

        // Build multi-semester SPI progression array (Sem I through VIII)
        // Sort by semester so cumulative CGPA is correct
        const sortedResults = [...(myResults || [])].sort((a, b) => {
            const semA = parseInt(String(a.result_schemes?.semester || '0').replace(/\D/g, '')) || 0;
            const semB = parseInt(String(b.result_schemes?.semester || '0').replace(/\D/g, '')) || 0;
            return semA - semB;
        });

        let cumulativeWeighted = 0;
        let cumulativeCredits = 0;
        const allSemesterSpi = [];
        const allSemesterPcu = [];

        for (const r of sortedResults) {
            const semLabel = r.result_schemes?.semester || '';
            cumulativeWeighted += (r.sgpa || 0) * (r.total_credits || 0);
            cumulativeCredits += (r.total_credits || 0);
            const cpi = cumulativeCredits > 0 ? Math.round((cumulativeWeighted / cumulativeCredits) * 100) / 100 : null;
            allSemesterSpi.push({ sem: romanSemester(semLabel), spi: r.sgpa, cpi });
            allSemesterPcu.push({ sem: romanSemester(semLabel), percentage: r.percentage, credits: r.earn_credits });
        }

        // Fill remaining semesters up to 8 with nulls (like EduPlusCampus)
        const TOTAL_SEMESTERS = 8;
        for (let i = allSemesterSpi.length + 1; i <= TOTAL_SEMESTERS; i++) {
            allSemesterSpi.push({ sem: romanSemester(i), spi: null, cpi: null });
            allSemesterPcu.push({ sem: romanSemester(i), percentage: null, credits: null });
        }

        res.json({
            results: myResults.map(result => ({
                ...result,
                erpPayload: buildErpPayload({
                    result: { ...result, _allSemesterSpi: allSemesterSpi, _allSemesterPcu: allSemesterPcu },
                    scheme: result.result_schemes,
                    student,
                    orgId,
                    organization
                })
            })),
            student
        });
    } catch (err) {
        console.error('[Student Results GET]:', err);
        res.status(500).json({ message: 'Failed to fetch your results' });
    }
});

// ======================================================
// CSV UPLOAD → PARSE → GENERATE (One-Shot Pipeline)
// POST /api/results/upload-csv
// Body: { schemeId, csvText }
// Parses CSV, maps to students, uploads marks, then auto-generates SGPA/Ranks
// ======================================================
router.post('/upload-csv', isAuthenticated, requireRole('org_admin'), upload.single('file'), async (req, res) => {
    try {
        const { sb, orgId } = getSb(req);
        const { schemeId } = req.body;

        if (!schemeId) return res.status(400).json({ message: 'schemeId is required.' });

        // 1. Parse CSV/Excel payload
        const rows = parseRowsPayload(req.body, req.file);
        if (rows.length < 1) return res.status(400).json({ message: 'Upload must include rows, csvText, fileBase64, or multipart file.' });

        // 2. Validate scheme
        const { data: scheme, error: schErr } = await sb
            .from('result_schemes').select('status, rules_json').eq('id', schemeId).eq('org_id', orgId).single();
        if (schErr || !scheme) return res.status(404).json({ message: 'Scheme not found.' });
        if (scheme.status === 'locked') return res.status(403).json({ message: 'Scheme is locked.' });

        // ── 3. Fetch subjects for this scheme ──
        const { data: subjects, error: subjErr } = await sb
            .from('result_subjects').select('*').eq('scheme_id', schemeId).eq('org_id', orgId);
        if (subjErr || !subjects?.length) return res.status(400).json({ message: 'Add subjects to this scheme first.' });

        // 4. Resolve students
        const identifiers = rows.map(r => r.prn || r.PRN || r['Roll No'] || r.roll_no || '').filter(Boolean);
        const students = await User.find({
            $or: [{ prn: { $in: identifiers } }, { roll_no: { $in: identifiers } }],
            organization_id: req.user.organization_id
        }, 'name prn roll_no _id').lean();

        const studentByPrn = {};
        students.forEach(s => {
            if (s.prn) studentByPrn[s.prn.toLowerCase()] = s;
            if (s.roll_no) studentByPrn[String(s.roll_no).toLowerCase()] = s;
        });

        // 5. Build marks entries
        const { marksToInsert, errors, successCount } = buildMarksFromRows({
            rows,
            subjects,
            studentByPrn,
            schemeId,
            orgId,
            req,
            enforceTeacherOwnership: false
        });

        // 6. Batch upsert marks
        if (marksToInsert.length > 0) {
            await batchUpsert(sb, 'result_marks', marksToInsert, 'scheme_id, subject_id, student_id', 1000);
        }

        res.json({
            message: `CSV processed. ${successCount} students mapped, ${errors.length} errors. Use POST /api/results/schemes/${schemeId}/generate to compute SGPA/Ranks.`,
            parsed_rows: rows.length,
            success: successCount,
            failed: errors.length,
            errors: errors.slice(0, 50), // Cap error list at 50
        });
    } catch (err) {
        console.error('[Upload CSV Error]:', err);
        res.status(500).json({ message: 'CSV processing failed.' });
    }
});

// Exporting only what's needed for testing or other modules
export {
    parseCsvText,
    parseRowsPayload,
    buildMarksFromRows,
};

export default router;
