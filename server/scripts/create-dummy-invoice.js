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
import dotenv from "dotenv";
import SaasInvoice from "../src/models/SaasInvoice.js";

dotenv.config({ path: "../.env" });

async function createDummyInvoice() {
  const orgId = "6a2d452b1c952d43497101c8";
  
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Clean up any existing dummy invoice for this org for this month
    await SaasInvoice.deleteMany({
      organizationId: orgId,
      "billingPeriod.month": 7,
      "billingPeriod.year": 2026
    });

    // Subtotal 8.47 + 18% GST (1.53) = 10.00 Total
    const dummyInvoice = new SaasInvoice({
      organizationId: orgId,
      invoiceNumber: `INV-TEST-REAL-${Date.now()}`,
      billingPeriod: {
        month: 7, // July
        year: 2026,
        startDate: new Date("2026-07-01T00:00:00Z"),
        endDate: new Date("2026-07-31T23:59:59Z")
      },
      lineItems: [
        {
          provider: "classgrid",
          resourceLabel: "Real Card Test Transaction",
          totalQuantity: 1,
          unit: "test",
          unitRateInr: 8.47,
          amountInr: 8.47
        }
      ],
      subtotalInr: 8.47,
      taxPercent: 18,
      taxAmountInr: 1.53,
      totalAmountInr: 10, // Exactly 10 Rupees for real card test
      currency: "INR",
      status: "sent",
      dueDate: new Date("2026-08-05T00:00:00Z")
    });

    await dummyInvoice.save();
    console.log("✅ 10 Rupee Test Invoice created successfully for org:", orgId);
    console.log("Invoice Details:", JSON.stringify(dummyInvoice, null, 2));
    
  } catch (error) {
    console.error("Error creating invoice:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createDummyInvoice();
