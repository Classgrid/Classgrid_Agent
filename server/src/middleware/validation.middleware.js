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

import Joi from "joi";

export const validateOrganization = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        ownerName: Joi.string().trim().min(2).max(100).required(),
        ownerEmail: Joi.string().email().required(),
        address: Joi.string().trim().min(5).max(250).required(),
        designation: Joi.string().trim().max(100).optional().allow(""),
        contactNumber: Joi.string().trim().max(20).optional().allow(""),
        website: Joi.string().uri().optional().allow(""),
    }).unknown(true);

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: "VALIDATION_ERROR" });
    next();
};

export const validateApplyOrg = (req, res, next) => {
    const schema = Joi.object({
        institute_name: Joi.string().trim().min(2).max(100).required(),
        owner_name: Joi.string().trim().min(2).max(100).required(),
        owner_email: Joi.string().email().required(),
        address: Joi.string().trim().min(5).max(250).required(),
        designation: Joi.string().trim().max(100).optional().allow(""),
        phone: Joi.string().trim().max(20).required(),
        website: Joi.string().trim().max(200).optional().allow(""),
        logo_base64: Joi.string().optional().allow(""),
        planRequested: Joi.string().valid('PAID').optional(),
        transactionId: Joi.string().trim().max(100).optional().allow(""),
        paymentScreenshot_base64: Joi.string().optional().allow("")
    }).unknown(true);

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: "VALIDATION_ERROR" });
    next();
};

export const validateFaculty = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        email: Joi.string().email().required(),
        department: Joi.string().trim().max(100).optional().allow(""),
        qualification: Joi.string().trim().max(100).optional().allow(""),
        subject: Joi.string().trim().max(100).optional().allow(""),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: "VALIDATION_ERROR" });
    next();
};

export const validateClassroom = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        subject: Joi.string().trim().min(2).max(100).required(),
        description: Joi.string().trim().max(500).optional().allow(""),
        subjectSlug: Joi.string().trim().max(100).optional().allow(""),
        settings: Joi.object({
            allowJoinRequests: Joi.boolean().optional(),
        }).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: "VALIDATION_ERROR" });
    next();
};

export const validateJoinCode = (req, res, next) => {
    const schema = Joi.object({
        classCode: Joi.string().pattern(/^[A-Z]{4}[0-9]{6}$/).required().messages({
            "string.pattern.base": '"classCode" must be exactly 4 uppercase letters followed by 6 numbers (e.g., ABCD123456)',
        }),
        requestMessage: Joi.string().trim().max(500).optional().allow(""),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: "VALIDATION_ERROR" });
    next();
};

export const validateOrgCode = (req, res, next) => {
    const schema = Joi.object({
        organizationCode: Joi.string().trim().alphanum().min(3).max(50).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: "VALIDATION_ERROR" });
    next();
};

// Validation for the new dual-code verify endpoint
export const validateVerifyCode = (req, res, next) => {
    const schema = Joi.object({
        code: Joi.string().trim().alphanum().min(3).max(50).uppercase().required().messages({
            "string.min": "Code must be at least 3 characters",
            "string.max": "Code must not exceed 50 characters",
            "string.alphanum": "Code must contain only letters and numbers",
            "any.required": "Code is required",
        }),
        type: Joi.string().valid("faculty", "student").required().messages({
            "any.only": "Type must be 'faculty' or 'student'",
            "any.required": "Type is required",
        }),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: "VALIDATION_ERROR" });
    next();
};

export const validateOrganizationAnnouncement = (req, res, next) => {
    const schema = Joi.object({
        title: Joi.string().trim().min(3).max(200).required(),
        content: Joi.string().required(), // HTML content
        type: Joi.string().valid("announcement", "notice", "event", "holiday", "emergency").optional(),
        target_type: Joi.string().valid("specific", "all").required(),
        target_classrooms: Joi.when('target_type', {
            is: 'specific',
            then: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
            otherwise: Joi.forbidden() // Must not pass classrooms if target is 'all'
        }),
        status: Joi.string().valid("draft", "scheduled", "published").optional(),
        expires_at: Joi.date().iso().greater('now').optional().allow(null),
        attachment_base64: Joi.string().optional().allow(""),
        attachment_name: Joi.string().trim().max(255).optional().allow(""),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: "VALIDATION_ERROR" });
    next();
};
