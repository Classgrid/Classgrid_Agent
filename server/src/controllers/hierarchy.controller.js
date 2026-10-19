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

import AcademicHierarchy from "../models/AcademicHierarchy.js";
import Organization from "../models/Organization.js";
import { getTerminology } from "../utils/terminology.js";
import TERMINOLOGY_MAP from "../utils/terminology.js";
import { getAvailableRoles, getAvailableRolesWithLabels, getAllOrgRolesWithLabels } from "../utils/roles.js";
import { trackOnboardingEvent } from "../services/onboarding-event.service.js";
import { syncDerivedOnboardingProgress } from "../services/onboarding-progress.service.js";

// Plan metadata for each org_type — defines hierarchy levels and examples
const ORG_PLAN_META = {
    engineering: {
        planNumber: 1,
        planName: "Engineering (with Divisions)",
        structureType: "engineering",
        hierarchyLevels: ["Degree", "Department", "Year", "Semester", "Division", "Sub Batch"],
        hierarchyExamples: ["B.Tech", "Computer / IT / ENTC", "FY / SY / TY", "Sem 1 / Sem 2", "A / B / C", "A1 / A2"],
    },
    school: {
        planNumber: 2,
        planName: "School (with Sections)",
        structureType: "school_with_div",
        hierarchyLevels: ["Standard", "Section"],
        hierarchyExamples: ["Class 1–10", "A / B / C"],
    },
    junior_college: {
        planNumber: 5,
        planName: "Junior College",
        structureType: "junior_college",
        hierarchyLevels: ["Stream", "Standard", "Division", "Batch"],
        hierarchyExamples: ["Science / Commerce / Arts", "11th / 12th", "A / B", "Batch 1"],
    },
    coaching: {
        planNumber: 4,
        planName: "Coaching Center",
        structureType: "coaching",
        hierarchyLevels: ["Course", "Batch"],
        hierarchyExamples: ["JEE / NEET / CET", "Morning / Evening"],
    },
    diploma: {
        planNumber: 6,
        planName: "Diploma / Polytechnic",
        structureType: "diploma",
        hierarchyLevels: ["Department", "Year", "Semester", "Division"],
        hierarchyExamples: ["Computer / Mech / Civil", "FY / SY", "Sem 1 / Sem 2", "A / B"],
    },
    other: {
        planNumber: 7,
        planName: "Custom",
        structureType: "custom",
        hierarchyLevels: ["Group", "Sub-Group"],
        hierarchyExamples: ["Group", "Sub-Group"],
    },
};

// Ordered list of comparison columns for the terminology table (shown in settings)
const TERMINOLOGY_COMPARISON_COLS = ["engineering", "school", "coaching", "junior_college", "diploma"];
const TERMINOLOGY_COMPARISON_CONCEPTS = [
    "org_label", "top_level", "course", "year", "period",
    "division", "sub_batch", "student_id", "teacher", "assignment_label", "exam_label",
];

/**
 * Hierarchy Controller — CRUD for academic structure nodes.
 * All operations are scoped to the requesting user's organization_id.
 */

/**
 * POST /api/hierarchy/node
 * Create a new node in the academic hierarchy.
 * Body: { level_type, name, code?, parent_id?, sort_order?, academic_year?, sub_batch_capacity? }
 */
export async function createNode(req, res) {
    try {
        const orgId = req.user.organization_id;
        const org = await Organization.findById(orgId).lean();
        if (!org) return res.status(404).json({ error: "Organization not found." });

        const { level_type, name, code, parent_id, sort_order, academic_year, sub_batch_capacity } = req.body;

        if (!level_type || !name) {
            return res.status(400).json({ error: "level_type and name are required." });
        }

        let parent = null;

        // Validate parent exists if provided
        if (parent_id) {
            parent = await AcademicHierarchy.findOne({ _id: parent_id, organization_id: orgId });
            if (!parent) {
                return res.status(404).json({ error: "Parent node not found in this organization." });
            }
        }

        if (level_type === "sub_batch" && parent?.level_type !== "division") {
            return res.status(400).json({ error: "Batch must be created under a division." });
        }

        const node = await AcademicHierarchy.create({
            organization_id: orgId,
            level_type,
            name: name.trim(),
            code: code?.trim() || "",
            parent_id: parent_id || null,
            sort_order: sort_order || 0,
            academic_year: academic_year || null,
            is_sub_batch: level_type === "sub_batch",
            sub_batch_capacity: level_type === "sub_batch" ? (sub_batch_capacity || 30) : null,
        });

        // 🛡️ Auto-Division Logic for "No Division" plans
        // For School/JC: Create Default Division under "standard"
        // For Engineering/Diploma: Create Default Division under "semester"
        const noDivPlans = ["school_no_div", "junior_college_no_div", "engineering_no_div", "diploma_no_div"];
        const isParentOfDivision = (level_type === "standard" || level_type === "semester");

        if (noDivPlans.includes(org.structure_type) && isParentOfDivision) {
            // Check if it's the correct level for the specific plan
            const isCorrectLevel = 
                (org.structure_type.startsWith("school") && level_type === "standard") ||
                (org.structure_type.startsWith("junior") && level_type === "standard") ||
                (org.structure_type.startsWith("engineering") && level_type === "semester") ||
                (org.structure_type.startsWith("diploma") && level_type === "semester");

            if (isCorrectLevel) {
                await AcademicHierarchy.create({
                    organization_id: orgId,
                    level_type: "division",
                    name: "Default",
                    code: "DEF",
                    parent_id: node._id,
                    sort_order: 0,
                });
            }
        }

        await syncDerivedOnboardingProgress(orgId);
        await trackOnboardingEvent({
            organizationId: orgId,
            userId: req.user?._id || null,
            eventType: "hierarchy_node_created",
            stage: "setup",
            actorRole: req.user?.role || "org_admin",
            metadata: { level_type, name: name.trim() },
        });

        return res.status(201).json({
            message: `${level_type} "${name}" created successfully.`,
            node,
        });
    } catch (err) {
        // Duplicate name under same parent
        if (err.code === 11000) {
            return res.status(409).json({
                error: `A node with this name already exists under the same parent.`,
            });
        }
        return res.status(500).json({ error: "Failed to create hierarchy node.", details: err.message });
    }
}

/**
 * GET /api/hierarchy/tree
 * Returns the full hierarchy tree for the org.
 * Query: ?flat=true for flat array, default is nested tree.
 */
export async function getTree(req, res) {
    try {
        const orgId = req.user.organization_id;
        const flat = req.query.flat === "true";

        const nodes = await AcademicHierarchy.find({
            organization_id: orgId,
            is_active: true,
        })
            .sort({ sort_order: 1, name: 1 })
            .lean();

        if (flat) {
            return res.json({ nodes });
        }

        // Build nested tree
        const nodeMap = {};
        const roots = [];

        for (const node of nodes) {
            nodeMap[node._id.toString()] = { ...node, children: [] };
        }

        for (const node of nodes) {
            const mappedNode = nodeMap[node._id.toString()];
            if (node.parent_id) {
                const parent = nodeMap[node.parent_id.toString()];
                if (parent) {
                    parent.children.push(mappedNode);
                } else {
                    roots.push(mappedNode); // orphaned node, treat as root
                }
            } else {
                roots.push(mappedNode);
            }
        }

        // Get org terminology for frontend labels
        const org = await Organization.findById(orgId).select("structure_type").lean();
        const terms = org ? getTerminology(org.structure_type) : null;

        return res.json({ tree: roots, terminology: terms });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch hierarchy.", details: err.message });
    }
}

/**
 * GET /api/hierarchy/children/:parentId
 * Get direct children of a specific node.
 */
export async function getChildren(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { parentId } = req.params;

        const children = await AcademicHierarchy.find({
            organization_id: orgId,
            parent_id: parentId,
            is_active: true,
        })
            .sort({ sort_order: 1, name: 1 })
            .lean();

        return res.json({ children });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch children.", details: err.message });
    }
}

/**
 * PATCH /api/hierarchy/node/:nodeId
 * Update a hierarchy node (name, code, sort_order).
 */
export async function updateNode(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { nodeId } = req.params;
        const { name, code, sort_order, is_active } = req.body;

        const node = await AcademicHierarchy.findOneAndUpdate(
            { _id: nodeId, organization_id: orgId },
            {
                ...(name && { name: name.trim() }),
                ...(code !== undefined && { code: code.trim() }),
                ...(sort_order !== undefined && { sort_order }),
                ...(is_active !== undefined && { is_active }),
            },
            { returnDocument: 'after' }
        );

        if (!node) {
            return res.status(404).json({ error: "Hierarchy node not found." });
        }

        return res.json({ message: "Node updated.", node });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "A node with this name already exists under the same parent." });
        }
        return res.status(500).json({ error: "Failed to update node.", details: err.message });
    }
}

/**
 * DELETE /api/hierarchy/node/:nodeId
 * Soft-delete a hierarchy node (sets is_active = false).
 * Also soft-deletes all descendants.
 */
export async function deleteNode(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { nodeId } = req.params;

        const node = await AcademicHierarchy.findOne({ _id: nodeId, organization_id: orgId });
        if (!node) {
            return res.status(404).json({ error: "Hierarchy node not found." });
        }

        // Recursively soft-delete all descendants
        const deactivateDescendants = async (parentId) => {
            const children = await AcademicHierarchy.find({
                organization_id: orgId,
                parent_id: parentId,
                is_active: true,
            });
            for (const child of children) {
                child.is_active = false;
                await child.save();
                await deactivateDescendants(child._id);
            }
        };

        node.is_active = false;
        await node.save();
        await deactivateDescendants(node._id);

        return res.json({ message: `Node "${node.name}" and its children have been deactivated.` });
    } catch (err) {
        return res.status(500).json({ error: "Failed to delete node.", details: err.message });
    }
}

/**
 * GET /api/hierarchy/terminology
 * Returns the terminology dictionary for the requesting org.
 */
export async function getOrgTerminology(req, res) {
    try {
        const orgId = req.user.organization_id;
        const org = await Organization.findById(orgId).select("structure_type org_type").lean();
        if (!org) return res.status(404).json({ error: "Organization not found." });

        const terms = getTerminology(org.structure_type);
        return res.json({ structure_type: org.structure_type, org_type: org.org_type, terminology: terms });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch terminology.", details: err.message });
    }
}

/**
 * GET /api/hierarchy/terminology/all
 * Returns: org-type plan metadata + full terminology map for ALL org types.
 * Used by the Settings page to render the comparison table without any frontend hardcoding.
 * No body needed — the response is static metadata derived from server-side TERMINOLOGY_MAP.
 */
export async function getAllTerminology(req, res) {
    try {
        // Build per-org-type terminology, keyed by org_type
        const allTerminology = {};
        for (const orgType of TERMINOLOGY_COMPARISON_COLS) {
            const meta = ORG_PLAN_META[orgType];
            if (!meta) continue;
            try {
                const terms = getTerminology(meta.structureType);
                allTerminology[orgType] = {
                    ...meta,
                    terminology: terms,
                };
            } catch (_) {
                // skip invalid structure types gracefully
            }
        }

        return res.json({
            comparisonCols: TERMINOLOGY_COMPARISON_COLS,
            comparisonConcepts: TERMINOLOGY_COMPARISON_CONCEPTS,
            allTerminology,
        });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch all terminology.", details: err.message });
    }
}

/**
 * GET /api/hierarchy/roles
 * Returns the array of roles allowed for the requesting user's organization type.
 * 
 * Query params:
 *   ?invitable=true  — Only return roles that can be invited from the Members page
 *                       (excludes student, org_admin, super_admin)
 *   ?all=true        — Return roles for ALL org types (for comparison views)
 *   
 * Response format:
 *   { roles: [{ value: "hod", label: "Head of Department (HOD)", category: "dept_admin", description: "..." }, ...] }
 */
export async function getOrgRoles(req, res) {
    try {
        // ?all=true — return roles for every org type (super admin or settings comparison)
        if (req.query.all === "true") {
            const allRoles = getAllOrgRolesWithLabels();
            return res.json({ allRoles });
        }

        const invitableOnly = req.query.invitable === "true";

        if (req.user.role === "super_admin") {
            const roles = getAvailableRolesWithLabels(null, "super_admin", { invitableOnly });
            return res.json({ roles });
        }

        const orgId = req.user.organization_id;
        if (!orgId) return res.status(404).json({ error: "Organization ID missing." });
        
        const org = await Organization.findById(orgId).select("org_type structure_type").lean();
        if (!org) return res.status(404).json({ error: "Organization not found." });

        const orgType = org.org_type || org.structure_type;
        const roles = getAvailableRolesWithLabels(orgType, req.user.role, { invitableOnly });
        return res.json({ org_type: org.org_type, structure_type: org.structure_type, roles });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch org roles.", details: err.message });
    }
}

/**
 * POST /api/hierarchy/seed
 * Seed a default hierarchy structure based on the org's structure_type.
 * Called once during org onboarding. Idempotent (skips if nodes exist).
 */
export async function seedHierarchy(req, res) {
    try {
        const orgId = req.user.organization_id;
        const org = await Organization.findById(orgId).lean();
        if (!org) return res.status(404).json({ error: "Organization not found." });

        // Check if hierarchy already exists
        const existing = await AcademicHierarchy.countDocuments({ organization_id: orgId });
        if (existing > 0) {
            return res.status(409).json({
                error: "Hierarchy already seeded. Use the CRUD endpoints to modify.",
                existing_count: existing,
            });
        }

        const nodes = [];
        const st = org.structure_type;

        if (st === "engineering" || st === "engineering_with_div" || st === "engineering_no_div") {
            // Seed: B.Tech → Default Departments → Years → Semesters → Divisions
            const degree = await AcademicHierarchy.create({
                organization_id: orgId, level_type: "degree", name: "B.Tech", code: "BTECH", sort_order: 0,
            });
            const depts = ["Computer Engineering", "Information Technology", "Electronics & Telecommunication", "Mechanical Engineering"];
            for (let i = 0; i < depts.length; i++) {
                const dept = await AcademicHierarchy.create({
                    organization_id: orgId, level_type: "department", name: depts[i],
                    code: ["CE", "IT", "ENTC", "ME"][i], parent_id: degree._id, sort_order: i,
                });
                
                // For seeding, we'll just add one Year and one Semester to keep it clean
                const year = await AcademicHierarchy.create({
                    organization_id: orgId, level_type: "year", name: "First Year", code: "FE", parent_id: dept._id, sort_order: 0
                });
                const sem = await AcademicHierarchy.create({
                    organization_id: orgId, level_type: "semester", name: "Semester 1", code: "SEM1", parent_id: year._id, sort_order: 0
                });

                if (st === "engineering_no_div") {
                    nodes.push(await AcademicHierarchy.create({
                        organization_id: orgId, level_type: "division", name: "Default", code: "DEF", parent_id: sem._id, sort_order: 0
                    }));
                } else {
                    nodes.push(await AcademicHierarchy.create({
                        organization_id: orgId, level_type: "division", name: "Division A", code: "A", parent_id: sem._id, sort_order: 0
                    }));
                }
            }
        } else if (st === "school_with_div" || st === "school_no_div") {
            // Seed: Standards 1-10
            for (let i = 1; i <= 10; i++) {
                const std = await AcademicHierarchy.create({
                    organization_id: orgId, level_type: "standard", name: `Class ${i}`,
                    code: `${i}`, sort_order: i,
                });
                if (st === "school_with_div") {
                    for (const div of ["A", "B"]) {
                        nodes.push(await AcademicHierarchy.create({
                            organization_id: orgId, level_type: "division", name: div,
                            code: div, parent_id: std._id, sort_order: div === "A" ? 0 : 1,
                        }));
                    }
                } else {
                    // school_no_div: auto-create hidden Default division
                    nodes.push(await AcademicHierarchy.create({
                        organization_id: orgId, level_type: "division", name: "Default",
                        code: "DEF", parent_id: std._id, sort_order: 0,
                    }));
                }
            }
        } else if (st === "coaching") {
            // Seed: Sample courses
            for (const course of ["JEE Advanced", "NEET", "MHT-CET"]) {
                const c = await AcademicHierarchy.create({
                    organization_id: orgId, level_type: "course", name: course,
                    code: course.replace(/[^A-Z]/g, ""), sort_order: 0,
                });
                for (const batch of ["Morning Batch", "Evening Batch"]) {
                    nodes.push(await AcademicHierarchy.create({
                        organization_id: orgId, level_type: "batch", name: batch,
                        parent_id: c._id, sort_order: batch === "Morning Batch" ? 0 : 1,
                    }));
                }
            }
        } else if (st === "junior_college" || st === "junior_college_with_div" || st === "junior_college_no_div") {
            // Seed: Science/Commerce/Arts → 11th/12th
            for (const stream of ["Science", "Commerce", "Arts"]) {
                const s = await AcademicHierarchy.create({
                    organization_id: orgId, level_type: "stream", name: stream,
                    code: stream[0], sort_order: 0,
                });
                for (const yr of ["11th", "12th"]) {
                    const std = await AcademicHierarchy.create({
                        organization_id: orgId, level_type: "standard", name: yr,
                        code: yr, parent_id: s._id, sort_order: yr === "11th" ? 0 : 1,
                    });

                    if (st === "junior_college_no_div") {
                        // auto-create hidden Default division
                        nodes.push(await AcademicHierarchy.create({
                            organization_id: orgId, level_type: "division", name: "Default",
                            code: "DEF", parent_id: std._id, sort_order: 0,
                        }));
                    } else {
                        // Create A and B by default for with_div
                        for (const div of ["A", "B"]) {
                            nodes.push(await AcademicHierarchy.create({
                                organization_id: orgId, level_type: "division", name: div,
                                code: div, parent_id: std._id, sort_order: div === "A" ? 0 : 1,
                            }));
                        }
                    }
                }
            }
        } else if (st === "diploma" || st === "diploma_with_div" || st === "diploma_no_div") {
            // Seed: Default departments → Semesters
            for (const deptName of ["Computer Engineering", "Mechanical Engineering", "Civil Engineering"]) {
                const dept = await AcademicHierarchy.create({
                    organization_id: orgId, level_type: "department", name: deptName,
                    code: deptName.split(" ").map((w) => w[0]).join(""), sort_order: 0,
                });
                
                const year = await AcademicHierarchy.create({
                    organization_id: orgId, level_type: "year", name: "First Year", code: "FY", parent_id: dept._id, sort_order: 0
                });
                const sem = await AcademicHierarchy.create({
                    organization_id: orgId, level_type: "semester", name: "Semester 1", code: "S1", parent_id: year._id, sort_order: 0
                });

                if (st === "diploma_no_div") {
                    nodes.push(await AcademicHierarchy.create({
                        organization_id: orgId, level_type: "division", name: "Default", code: "DEF", parent_id: sem._id, sort_order: 0
                    }));
                } else {
                    nodes.push(await AcademicHierarchy.create({
                        organization_id: orgId, level_type: "division", name: "Division A", code: "A", parent_id: sem._id, sort_order: 0
                    }));
                }
            }
        }

        const totalCreated = await AcademicHierarchy.countDocuments({ organization_id: orgId });
        await syncDerivedOnboardingProgress(orgId);
        await trackOnboardingEvent({
            organizationId: orgId,
            userId: req.user?._id || null,
            eventType: "hierarchy_seeded",
            stage: "setup",
            actorRole: req.user?.role || "org_admin",
            metadata: { structure_type: st, total_nodes: totalCreated },
        });
        return res.status(201).json({
            message: `Hierarchy seeded for "${st}" structure.`,
            total_nodes: totalCreated,
        });
    } catch (err) {
        return res.status(500).json({ error: "Failed to seed hierarchy.", details: err.message });
    }
}
