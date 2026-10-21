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

import AdmissionApplication from "../../models/AdmissionApplication.js";
import CETAllotment from "../../models/CETAllotment.js";
import Organization from "../../models/Organization.js";
import AdmissionConfig from "../../models/AdmissionConfig.js";

/**
 * merit-engine.service.js — Multi-Board Normalization & Merit List Generator
 *
 * Org-Type-Aware Routing:
 *   coaching                                → FCFS: ranked by application date, score = 0
 *   engineering / diploma (all variants)   → CET: mht_cet_score from CETAllotment record
 *   junior_college (all variants)          → Best-of-5: subject array → normalized %
 *   school (all variants)                  → previous_percentage with board normalization
 *
 * Board Multipliers (Maharashtra Standard):
 *   SSC   → x1.00 | CBSE  → x0.95 | ICSE → x0.93
 *   IB    → x0.92 | IGCSE → x0.94 | NIOS → x1.02
 */

const BOARD_MULTIPLIERS = {
    SSC:   1.00,
    CBSE:  0.95,
    ICSE:  0.93,
    IB:    0.92,
    IGCSE: 0.94,
    STATE: 1.00,
    NIOS:  1.02,
};

const CET_STRUCTURE_TYPES = [
    "engineering", "engineering_with_div", "engineering_no_div",
    "diploma", "diploma_with_div", "diploma_no_div"
];

const JUNIOR_COLLEGE_TYPES = [
    "junior_college", "junior_college_with_div", "junior_college_no_div"
];

/**
 * Convert CGPA to percentage.
 */
export function cgpaToPercentage(cgpa, board = "CBSE") {
    if (board === "CBSE" || board === "ICSE") return cgpa * 9.5;
    return cgpa * 10;
}

/**
 * Normalize a raw percentage to the unified scale.
 */
export function normalizeScore(rawPercentage, board = "SSC", options = {}) {
    let percentage = rawPercentage;

    if (options.is_cgpa && options.cgpa_value) {
        percentage = cgpaToPercentage(options.cgpa_value, board);
    }

    if (board === "IB" && percentage <= 45) {
        percentage = (percentage / 45) * 100;
    }

    const multiplier = BOARD_MULTIPLIERS[board.toUpperCase()] || 1.00;
    const normalizedScore = Math.round((percentage * multiplier) * 100) / 100;

    return {
        normalized_score: Math.min(normalizedScore, 100),
        raw: rawPercentage,
        board: board.toUpperCase(),
        multiplier,
        conversion_note: options.is_cgpa ? `CGPA ${options.cgpa_value} → ${percentage}%` : null
    };
}

/**
 * Compute Best-of-5 percentage from a 10th record's subjects array.
 * Falls back to percentage_or_cgpa, then to flat 10th_percentage.
 */
function computeBestOf5(tenthRecord, flatFallback = 0) {
    if (Array.isArray(tenthRecord.subjects) && tenthRecord.subjects.length > 0) {
        const valid = tenthRecord.subjects
            .filter(s => s.marks_obtained !== undefined && s.max_marks > 0)
            .sort((a, b) => (b.marks_obtained / b.max_marks) - (a.marks_obtained / a.max_marks))
            .slice(0, 5);

        if (valid.length === 5) {
            const obtained = valid.reduce((s, sub) => s + sub.marks_obtained, 0);
            const max = valid.reduce((s, sub) => s + sub.max_marks, 0);
            return Math.round((obtained / max) * 10000) / 100;
        }
    }
    return tenthRecord.percentage_or_cgpa || flatFallback;
}

/**
 * Generate a merit list for an organization + hierarchy.
 * Routing is determined by the org's structure_type.
 *
 * @param {string} orgId
 * @param {string|null} hierarchyId
 * @param {Object} options - { status_filter, category_filter, seat_type_filter, gender_filter }
 * @returns {Promise<Array|Object>} Sorted, ranked merit list (Array if combined, Object keyed by category if category_wise)
 */
export async function generateMeritList(orgId, hierarchyId = null, options = {}) {
    // Resolve org structure type and admission config
    const org = await Organization.findById(orgId).select("structure_type").lean();
    const structureType = org?.structure_type || "custom";
    
    const config = await AdmissionConfig.findOne({ organization_id: orgId }).lean() || {};
    const meritListMode = config.merit_list_mode || "combined";
    const subjectMode = config.subject_computation_mode || "best_of_5";
    const bestOf5Options = {
        mandatoryLanguage: config.best_of_5_mandatory_language ?? true,
        languageSubjects: config.language_subjects || ["Marathi", "Hindi", "English", "Urdu", "Telugu", "Kannada", "First Language", "Second Language", "Third Language"]
    };

    const query = {
        organization_id: orgId,
        is_deleted: false,
        status: { $in: options.status_filter || ["applied", "under_verification", "verified", "fee_pending", "enrolled"] }
    };

    if (hierarchyId) query.hierarchy_id = hierarchyId;
    if (options.category_filter) query.category = options.category_filter;
    if (options.seat_type_filter) query.seat_type = options.seat_type_filter;
    if (options.gender_filter) query["form_data.personal_details.gender"] = options.gender_filter;

    const applications = await AdmissionApplication.find(query)
        .select("full_name en_number phone email category seat_type merit_score form_data dob status createdAt")
        .lean();

    // ── COACHING: Pure FCFS — no score needed ──
    if (structureType === "coaching") {
        const sorted = [...applications].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const list = sorted.map((app, idx) => ({
            _id: app._id,
            full_name: app.full_name,
            phone: app.phone || null,
            category: app.category || "GENERAL",
            seat_type: app.seat_type || null,
            status: app.status,
            raw_score: 0,
            normalized_score: 0,
            ranking_basis: "FCFS",
            merit_rank: idx + 1,
            applied_at: app.createdAt,
        }));
        return rankOutput(list, meritListMode);
    }

    // ── ENGINEERING / DIPLOMA CET: Score from CETAllotment.mht_cet_score ──
    if (CET_STRUCTURE_TYPES.includes(structureType)) {
        const enNumbers = applications.filter(a => a.en_number).map(a => a.en_number);

        // Fetch all CET allotments for this org in one query
        const allotments = await CETAllotment.find({
            organization_id: orgId,
            en_number: { $in: enNumbers }
        }).select("en_number mht_cet_score merit_number category candidature_type").lean();

        const allotmentMap = {};
        for (const a of allotments) {
            allotmentMap[a.en_number] = a;
        }

        const meritList = applications.map(app => {
            const cet = allotmentMap[app.en_number] || {};
            // mht_cet_score is a percentile (0–100). Use as-is — no board multiplier.
            const score = cet.mht_cet_score || app.merit_score || 0;

            return {
                _id: app._id,
                full_name: app.full_name,
                en_number: app.en_number || null,
                phone: app.phone || null,
                category: app.category || cet.category || "OPEN",
                candidature_type: cet.candidature_type || null,
                seat_type: app.seat_type || null,
                status: app.status,
                raw_score: score,
                normalized_score: score, // MHT-CET percentile is not board-normalized
                merit_number: cet.merit_number || null,
                ranking_basis: "MHT_CET",
                applied_at: app.createdAt,
            };
        });

        // Sort by CET merit number first (lower is better), then score desc, then date
        meritList.sort((a, b) => {
            if (a.merit_number && b.merit_number) return a.merit_number - b.merit_number;
            if (b.normalized_score !== a.normalized_score) return b.normalized_score - a.normalized_score;
            return new Date(a.applied_at) - new Date(b.applied_at);
        });

        return rankOutput(meritList, meritListMode);
    }

    // ── JUNIOR COLLEGE: Best-of-5 / All-Subjects from subjects array with board normalization ──
    // ── SCHOOL + ALL OTHERS: board-normalized percentage ──
    const isJuniorCollege = JUNIOR_COLLEGE_TYPES.includes(structureType);

    const meritList = applications.map(app => {
        const fd = app.form_data || {};
        let board = fd["10th_board"] || fd.board || "SSC";
        let rawScore = 0;
        let isCgpa = fd.is_cgpa || false;
        let cgpaVal = fd.cgpa_value || null;
        let usedBasis = isJuniorCollege ? (subjectMode === "best_of_5" ? "BEST_OF_5" : "ALL_SUBJECTS") : "PERCENTAGE";

        // Priority 1: structured previous_education array
        if (Array.isArray(fd.previous_education)) {
            const tenthRecord = fd.previous_education.find(e => e.level === "10th");
            if (tenthRecord) {
                if (tenthRecord.board) board = tenthRecord.board;
                if (isJuniorCollege) {
                    if (subjectMode === "best_of_5") {
                        rawScore = computeBestOf5(tenthRecord, fd["10th_percentage"] || tenthRecord.percentage_or_cgpa || 0, bestOf5Options);
                    } else {
                        // All subjects
                        if (Array.isArray(tenthRecord.subjects) && tenthRecord.subjects.length > 0) {
                            const valid = tenthRecord.subjects.filter(s => s.marks_obtained !== undefined && s.max_marks > 0);
                            if (valid.length > 0) {
                                const obt = valid.reduce((sum, s) => sum + s.marks_obtained, 0);
                                const max = valid.reduce((sum, s) => sum + s.max_marks, 0);
                                rawScore = Math.round((obt / max) * 10000) / 100;
                            } else {
                                rawScore = tenthRecord.percentage_or_cgpa || 0;
                            }
                        } else {
                            rawScore = tenthRecord.percentage_or_cgpa || 0;
                        }
                    }
                    isCgpa = false;
                    cgpaVal = null;
                } else {
                    rawScore = tenthRecord.percentage_or_cgpa || 0;
                }
            }
        }

        // Priority 2: flat fields
        if (rawScore === 0) {
            rawScore = fd["10th_percentage"] || fd.previous_percentage || app.merit_score || 0;
            usedBasis = "FLAT_PERCENTAGE";
        }

        const normalized = normalizeScore(rawScore, board, { is_cgpa: isCgpa, cgpa_value: cgpaVal });

        return {
            _id: app._id,
            full_name: app.full_name,
            en_number: app.en_number || null,
            phone: app.phone || null,
            category: app.category || "OPEN",
            seat_type: app.seat_type || null,
            status: app.status,
            raw_score: rawScore,
            board,
            normalized_score: normalized.normalized_score,
            multiplier: normalized.multiplier,
            conversion_note: normalized.conversion_note,
            ranking_basis: usedBasis,
            applied_at: app.createdAt,
        };
    });

    meritList.sort((a, b) => {
        if (b.normalized_score !== a.normalized_score) return b.normalized_score - a.normalized_score;
        return new Date(a.applied_at) - new Date(b.applied_at);
    });

    return rankOutput(meritList, meritListMode);
}

/**
 * Helper to structure and rank output based on mode
 */
function rankOutput(sortedList, mode) {
    if (mode === "category_wise") {
        const grouped = {};
        sortedList.forEach(item => {
            const cat = item.category || "GENERAL";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ ...item, category_merit_rank: grouped[cat].length + 1 });
        });
        return grouped;
    } else {
        // Combined mode
        return sortedList.map((item, idx) => ({ ...item, merit_rank: idx + 1 }));
    }
}

/**
 * Persist normalized merit_score back onto each AdmissionApplication document.
 */
export async function persistMeritScores(orgId, hierarchyId = null) {
    const meritList = await generateMeritList(orgId, hierarchyId);

    if (!meritList || meritList.length === 0) return { updated: 0, total: 0 };

    const bulkOps = meritList.map(item => ({
        updateOne: {
            filter: { _id: item._id },
            update: { merit_score: item.normalized_score }
        }
    }));

    const result = await AdmissionApplication.bulkWrite(bulkOps);
    return { updated: result.modifiedCount, total: meritList.length };
}

export default {
    normalizeScore,
    cgpaToPercentage,
    generateMeritList,
    persistMeritScores,
    BOARD_MULTIPLIERS
};


