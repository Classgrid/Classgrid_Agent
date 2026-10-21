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

import fs from "fs";
import path from "path";
import { generateInvoicePdfBuffer } from "../services/pdf-invoice.service.js";

async function run() {
    const org = {
        name: "Classgrid Demo Institution",
        billing_settings: {
            billing_contact_name: "Demo Admin",
            invoice_email: "demo@classgrid.in",
            phone: "+91 86239 47038",
            address_line1: "Sample Education Campus",
            address_line2: "",
            city: "Pune",
            state: "Maharashtra",
            gstin: ""
        }
    };

    const invoice = {
        invoiceNumber: "CG-DEMOIN-202608",
        status: "SENT",
        createdAt: new Date(),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        lineItems: [
            // Layer 1: Base Platform Fee
            {
                provider: "classgrid",
                resourceLabel: "Base platform fee",
                totalQuantity: 1,
                unit: "month",
                unitRateInr: 1.00,
                amountInr: 1.00
            },
            // Layer 2: Module Fees
            {
                provider: "classgrid",
                resourceLabel: "Module: Attendance System",
                totalQuantity: 1,
                unit: "month",
                unitRateInr: 0.50,
                amountInr: 0.50
            },
            // Layer 3: Resource Usage
            {
                provider: "cloudflare_r2",
                resourceLabel: "Cloud storage (GB-days)",
                totalQuantity: 1.18,
                unit: "gb_day",
                unitRateInr: 0.16,
                amountInr: 0.19
            }
        ],
        subtotal: 1.69,
        taxPercent: 18,
        taxAmount: 0.31,
        total: 2.00
    };

    console.log("Generating 2 Rupee Sample PDF Invoice via Puppeteer...");
    const pdfBuffer = await generateInvoicePdfBuffer(invoice, org);
    
    // Write to client/public
    const outPath = path.resolve(process.cwd(), "../client/public/sample-invoice.pdf");
    fs.writeFileSync(outPath, pdfBuffer);
    
    console.log("Success! Saved sample invoice to:", outPath);
    process.exit(0);
}

run().catch(err => {
    console.error("Error generating invoice:", err);
    process.exit(1);
});
