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

/**
 * division-allocator.service.js — Queue-based Division Allocation Algorithm
 * 
 * Allocation Methods:
 * 
 * 1. ALPHABETICAL: Sort students by surname → Fill divisions sequentially
 *    Students: [Agarwal, Bhat, Chavan, Desai, Eknath, Fadnis]
 *    Div A (cap 2): [Agarwal, Bhat]
 *    Div B (cap 2): [Chavan, Desai]
 *    Div C (cap 2): [Eknath, Fadnis]
 *
 * 2. MERIT: Sort by merit_score DESC → Top students in Div A, rest in B/C
 *
 * 3. RANDOM: Fisher-Yates shuffle → Sequential fill
 *
 * 4. MANUAL: Admin drag-and-drop (no auto-allocation, API does nothing)
 */

/**
 * Fisher-Yates (Knuth) shuffle for arrays.
 * @param {Array} arr 
 * @returns {Array} Shuffled copy
 */
function fisherYatesShuffle(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Core allocation algorithm — distributes students into divisions.
 * 
 * @param {Array<Object>} students - Array of { _id, full_name, merit_score }
 * @param {Array<Object>} divisions - Array of { name: "A", capacity: 70 }
 * @param {string} method - "alphabetical" | "merit" | "random" | "manual"
 * @returns {Object} { allocations: { [divisionName]: [studentIds] }, overflow: [studentIds] }
 */
export function allocateDivisions(students, divisions, method = "alphabetical") {
    if (method === "manual") {
        return { allocations: {}, overflow: [], message: "Manual mode: No auto-allocation performed." };
    }

    let sortedStudents;

    switch (method) {
        case "alphabetical":
            sortedStudents = [...students].sort((a, b) => 
                (a.full_name || "").localeCompare(b.full_name || "")
            );
            break;

        case "merit":
            sortedStudents = [...students].sort((a, b) => 
                (b.merit_score || 0) - (a.merit_score || 0)
            );
            break;

        case "random":
            sortedStudents = fisherYatesShuffle(students);
            break;

        default:
            throw new Error(`Invalid allocation method: "${method}". Use: alphabetical, merit, random, manual.`);
    }

    // Sequential fill: place students into divisions until each reaches capacity
    const allocations = {};
    const overflow = [];

    for (const div of divisions) {
        allocations[div.name] = [];
    }

    let divIndex = 0;
    for (const student of sortedStudents) {
        // Find the next division with available capacity
        let placed = false;
        let checked = 0;

        while (checked < divisions.length) {
            const div = divisions[divIndex % divisions.length];
            if (allocations[div.name].length < div.capacity) {
                allocations[div.name].push({
                    _id: student._id,
                    full_name: student.full_name,
                    roll_number: allocations[div.name].length + 1 // 1-indexed roll number within division
                });
                placed = true;
                // Move to next division for round-robin or stay for sequential
                if (method === "merit") {
                    // For merit: fill Div A completely first, then B, then C
                    if (allocations[div.name].length >= div.capacity) {
                        divIndex++;
                    }
                } else {
                    // For alphabetical/random: sequential fill (fill A, then B, then C)
                    if (allocations[div.name].length >= div.capacity) {
                        divIndex++;
                    }
                }
                break;
            }
            divIndex++;
            checked++;
        }

        if (!placed) {
            overflow.push({ _id: student._id, full_name: student.full_name });
        }
    }

    return { allocations, overflow };
}

/**
 * Execute division allocation for an organization and persist results.
 * 
 * @param {string} orgId 
 * @param {string} hierarchyId - Branch/Standard to allocate for
 * @param {Array<Object>} divisions - [{ name: "A", capacity: 70 }, { name: "B", capacity: 70 }]
 * @param {string} method - "alphabetical" | "merit" | "random"
 * @returns {Promise<Object>} { allocations, overflow, totalAllocated }
 */
export async function executeAllocation(orgId, hierarchyId, divisions, method) {
    // 1. Fetch all enrolled students for this branch/standard
    const students = await AdmissionApplication.find({
        organization_id: orgId,
        hierarchy_id: hierarchyId,
        status: "enrolled",
        is_deleted: false
    }).select("_id full_name merit_score").lean();

    if (students.length === 0) {
        throw new Error("No enrolled students found for allocation.");
    }

    // 2. Run the allocation algorithm
    const result = allocateDivisions(students, divisions, method);

    // 3. Persist division + roll number assignments to each application
    let totalAllocated = 0;
    for (const [divName, studentList] of Object.entries(result.allocations)) {
        for (const student of studentList) {
            await AdmissionApplication.findByIdAndUpdate(student._id, {
                $set: {
                    "form_data.assigned_division": divName,
                    "form_data.assigned_roll_number": student.roll_number
                }
            });
            totalAllocated++;
        }
    }

    return {
        allocations: result.allocations,
        overflow: result.overflow,
        totalAllocated,
        method
    };
}

export default {
    allocateDivisions,
    executeAllocation
};
