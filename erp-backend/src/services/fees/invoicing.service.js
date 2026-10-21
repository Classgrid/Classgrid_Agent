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

import Invoice from "../../models/Invoice.js";
import FeeStructure from "../../models/FeeStructure.js";

// ══════════════════════════════════════════════════════════════════════════════
// INVOICING SERVICE — The heart of the financial engine.
// Generates student bills, tracks partial payments, and reconciles balances.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a single invoice for a student based on a master FeeStructure.
 * Calculates total_amount inclusive of tax and sets the invoice to 'pending'.
 *
 * @param {string} studentId      - The student's User._id.
 * @param {string} feeStructureId - The master FeeStructure._id.
 * @param {string} orgId          - Tenant isolation.
 * @returns {Promise<Object>} The newly created Invoice document.
 */
export async function generateInvoice(studentId, feeStructureId, orgId) {
    if (!studentId || !feeStructureId || !orgId) {
        throw new Error("studentId, feeStructureId, and orgId are all required.");
    }

    try {
        // 1. Fetch the master fee template
        const structure = await FeeStructure.findOne({
            _id: feeStructureId,
            organization_id: orgId
        }).lean();

        if (!structure) {
            throw new Error("Fee structure not found or does not belong to this organization.");
        }

        // 2. Calculate total including tax
        const taxMultiplier = 1 + (structure.tax_percentage || 0) / 100;
        const totalAmount = Math.round(structure.base_amount * taxMultiplier * 100) / 100;

        // 3. Check for existing invoice to prevent duplicates
        const existing = await Invoice.findOne({
            student_id: studentId,
            fee_structure_id: feeStructureId
        }).lean();

        if (existing) {
            throw new Error("An invoice for this student and fee structure already exists.");
        }

        // 4. Create the invoice
        const invoice = await Invoice.create({
            organization_id: orgId,
            student_id: studentId,
            fee_structure_id: feeStructureId,
            total_amount: totalAmount,
            amount_paid: 0,
            remaining_amount: totalAmount,
            status: "pending"
        });

        return invoice.toObject();
    } catch (error) {
        if (error.code === 11000) {
            throw new Error("Duplicate invoice: this student has already been billed for this fee structure.");
        }
        throw new Error(`Failed to generate invoice: ${error.message}`);
    }
}

/**
 * Mass-generates invoices for an entire batch of students using MongoDB bulkWrite.
 * Designed for semester-start bulk billing operations.
 *
 * @param {string[]} studentIds    - Array of student User._ids.
 * @param {string} feeStructureId  - The master FeeStructure._id.
 * @param {string} orgId           - Tenant isolation.
 * @returns {Promise<Object>} The bulkWrite result summary.
 */
export async function bulkGenerateInvoices(studentIds, feeStructureId, orgId) {
    if (!studentIds?.length || !feeStructureId || !orgId) {
        throw new Error("studentIds array, feeStructureId, and orgId are all required.");
    }

    try {
        // 1. Fetch the master fee template
        const structure = await FeeStructure.findOne({
            _id: feeStructureId,
            organization_id: orgId
        }).lean();

        if (!structure) {
            throw new Error("Fee structure not found or does not belong to this organization.");
        }

        // 2. Calculate total including tax
        const taxMultiplier = 1 + (structure.tax_percentage || 0) / 100;
        const totalAmount = Math.round(structure.base_amount * taxMultiplier * 100) / 100;

        // 3. Build bulkWrite operations (updateOne with upsert to skip duplicates gracefully)
        const operations = studentIds.map((studentId) => ({
            updateOne: {
                filter: {
                    student_id: studentId,
                    fee_structure_id: feeStructureId
                },
                update: {
                    $setOnInsert: {
                        organization_id: orgId,
                        student_id: studentId,
                        fee_structure_id: feeStructureId,
                        total_amount: totalAmount,
                        amount_paid: 0,
                        remaining_amount: totalAmount,
                        status: "pending"
                    }
                },
                upsert: true
            }
        }));

        // 4. Execute bulk operation
        const result = await Invoice.bulkWrite(operations, { ordered: false });

        return {
            totalStudents: studentIds.length,
            invoicesCreated: result.upsertedCount,
            alreadyExisted: studentIds.length - result.upsertedCount,
            raw: result
        };
    } catch (error) {
        throw new Error(`Failed to bulk generate invoices: ${error.message}`);
    }
}

/**
 * Fetches all invoices for a specific student, fully populated with FeeStructure details.
 *
 * @param {string} studentId - The student's User._id.
 * @param {string} orgId     - Tenant isolation.
 * @returns {Promise<Array>} List of invoices with populated fee structure data.
 */
export async function getStudentInvoices(studentId, orgId) {
    if (!studentId || !orgId) {
        throw new Error("studentId and orgId are required.");
    }

    try {
        return await Invoice.find({
            student_id: studentId,
            organization_id: orgId
        })
            .populate("fee_structure_id", "title base_amount tax_percentage due_date line_items hierarchy_id")
            .sort({ createdAt: -1 })
            .lean();
    } catch (error) {
        throw new Error(`Failed to fetch student invoices: ${error.message}`);
    }
}

/**
 * Admin dashboard view — fetches all invoices for an organization.
 * Supports filtering by status and hierarchy_id for drill-down analytics.
 *
 * @param {string} orgId   - Tenant isolation.
 * @param {Object} filters - Optional: { status, hierarchy_id }.
 * @returns {Promise<Array>} List of invoices.
 */
export async function getOrgInvoices(orgId, filters = {}) {
    if (!orgId) throw new Error("orgId is required.");

    try {
        const query = { organization_id: orgId };

        if (filters.status) {
            query.status = filters.status;
        }

        // If filtering by hierarchy, we need to find fee structures for that hierarchy first
        if (filters.hierarchy_id) {
            const structureIds = await FeeStructure.find({
                organization_id: orgId,
                hierarchy_id: filters.hierarchy_id
            }).distinct("_id");

            query.fee_structure_id = { $in: structureIds };
        }

        return await Invoice.find(query)
            .populate("student_id", "name email phone")
            .populate("fee_structure_id", "title base_amount due_date hierarchy_id line_items")
            .sort({ createdAt: -1 })
            .lean();
    } catch (error) {
        throw new Error(`Failed to fetch organization invoices: ${error.message}`);
    }
}

/**
 * The critical reconciliation function.
 * After a successful payment, this updates the invoice's financial state:
 * adds to amount_paid, recalculates remaining_amount, and auto-transitions status.
 *
 * @param {string} invoiceId  - The Invoice._id.
 * @param {number} amountPaid - The amount just paid in this transaction.
 * @param {string} orgId      - Tenant isolation.
 * @returns {Promise<Object>} The updated Invoice document.
 */
export async function updateInvoiceAfterPayment(invoiceId, amountPaid, orgId) {
    if (!invoiceId || !orgId) {
        throw new Error("invoiceId and orgId are required.");
    }
    if (!amountPaid || amountPaid <= 0) {
        throw new Error("amountPaid must be a positive number.");
    }

    try {
        const invoice = await Invoice.findOne({
            _id: invoiceId,
            organization_id: orgId
        });

        if (!invoice) {
            throw new Error("Invoice not found or unauthorized.");
        }

        if (invoice.status === "paid") {
            throw new Error("This invoice has already been fully paid.");
        }

        if (amountPaid > invoice.remaining_amount) {
            throw new Error(
                `Payment of ₹${amountPaid} exceeds remaining balance of ₹${invoice.remaining_amount}.`
            );
        }

        // Reconcile
        invoice.amount_paid += amountPaid;
        invoice.remaining_amount = Math.round((invoice.total_amount - invoice.amount_paid) * 100) / 100;

        // Auto-transition status
        if (invoice.remaining_amount <= 0) {
            invoice.status = "paid";
            invoice.remaining_amount = 0; // Safety clamp
        } else {
            invoice.status = "partial";
        }

        await invoice.save();
        return invoice.toObject();
    } catch (error) {
        throw new Error(`Failed to reconcile invoice: ${error.message}`);
    }
}
