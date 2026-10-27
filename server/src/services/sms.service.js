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
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import NotificationTemplate from "../models/NotificationTemplate.js";
import NotificationLog from "../models/NotificationLog.js";
import Handlebars from "handlebars";

/**
 * Classgrid SMS Service
 * Uses AWS SNS API to deliver low-latency OTPs for admission verification.
 */

const getSnsClient = () => {
    return new SNSClient({
        region: process.env.AWS_SNS_REGION || "ap-south-1",
        credentials: {
            accessKeyId: process.env.AWS_SNS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY || "",
        },
    });
};

/**
 * Sends a generic transactional SMS.
 * 
 * @param {string} phoneNumber - Full 10-digit Indian mobile number
 * @param {string} message - The text body to send (max 160 chars for 1 credit)
 * @returns {Promise<Object>} API response detailing success or failure
 */
export const sendSMS = async (phoneNumber, message) => {
    if (!process.env.AWS_SNS_ACCESS_KEY_ID || !process.env.AWS_SNS_SECRET_ACCESS_KEY) {
        console.warn('⚠️ AWS SNS credentials are not configured in .env. SMS will not be sent.');
        return { success: false, error: 'API key not configured' };
    }

    try {
        const snsClient = getSnsClient();
        // SNS expects E.164 format, assuming Indian numbers without +91 prefix
        let formattedNumber = phoneNumber;
        if (!formattedNumber.startsWith('+')) {
            formattedNumber = `+91${formattedNumber.replace(/^0+/, '')}`;
        }

        const command = new PublishCommand({
            Message: message,
            PhoneNumber: formattedNumber,
            MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: 'Transactional' // Or 'Promotional' depending on the use case
                }
            }
        });

        const response = await snsClient.send(command);
        console.log(`✅ SMS successfully delivered to ${formattedNumber} (MessageId: ${response.MessageId})`);
        return { success: true, data: response, messageId: response.MessageId };
    } catch (error) {
        console.error('❌ SMS transmission failed:', error.message);
        return { 
            success: false, 
            error: error.message 
        };
    }
};

/**
 * Convenience method specifically for generating and sending a 6-digit OTP
 * @param {string} phoneNumber 
 * @returns {Promise<Object>} { success: true, otp: "123456", messageId: "..." }
 */
export const sendOTP = async (phoneNumber) => {
    // Generate a secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const message = `Your Classgrid Verification OTP is ${otp}. Do not share this code with anyone.`;
    
    const result = await sendSMS(phoneNumber, message);
    
    if (result.success) {
        // Return both success and the generated OTP so the route controller can save it to Redis/MongoDB
        return { success: true, otp, messageId: result.messageId };
    }
    return result;
};

export const sendTemplateSMS = async ({ templateName, phoneNumber, data, userId, organizationId }) => {
    try {
        const template = await NotificationTemplate.findOne({ name: templateName, type: "SMS", isActive: true });
        if (!template) throw new Error(`SMS template not found or inactive: ${templateName}`);

        const compiledText = Handlebars.compile(template.textBody)(data || {});

        const result = await sendSMS(phoneNumber, compiledText);

        await NotificationLog.create({
            organizationId,
            userId,
            templateId: template._id,
            type: "SMS",
            recipient: phoneNumber,
            status: result.success ? "SENT" : "FAILED",
            providerMessageId: result.messageId,
            failureReason: result.success ? undefined : result.error,
            metadata: data
        });

        if (!result.success) throw new Error(result.error);

        return result;
    } catch (error) {
        console.error(`[AWS SNS] Failed to send template SMS (${templateName}):`, error.message);
        await NotificationLog.create({
            organizationId,
            userId,
            type: "SMS",
            recipient: phoneNumber,
            status: "FAILED",
            failureReason: error.message,
            metadata: { templateName, ...data }
        });
        throw error;
    }
};
