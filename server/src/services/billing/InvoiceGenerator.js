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

import OrganizationSubscription from "../../models/OrganizationSubscription.js";
import OrganizationSubscriptionItem from "../../models/OrganizationSubscriptionItem.js";
import Invoice from "../../models/Invoice.js";
import InvoiceLineItem from "../../models/InvoiceLineItem.js";
import InvoiceSequence from "../../models/InvoiceSequence.js";

import OrganizationBillingContextService from "./OrganizationBillingContextService.js";
import PricingEngine from "./PricingEngine.js";
import TaxEngine from "./TaxEngine.js";
import DiscountEngine from "./DiscountEngine.js";
import CreditApplicationService from "./CreditApplicationService.js";

/**
 * InvoiceGenerator
 * High-level orchestration for generating an invoice.
 */
class InvoiceGenerator {
    static async generateForSubscription(organizationId, subscriptionId, periodStart, periodEnd, isPreview = false) {
        // 1. Context
        const context = await OrganizationBillingContextService.getContext(organizationId);

        // 2. Load Subscription & Items
        const subscription = await OrganizationSubscription.findById(subscriptionId).populate("billingPlanVersionId").lean();
        const items = await OrganizationSubscriptionItem.find({ organizationSubscriptionId: subscriptionId }).populate("billingModuleVersionId").lean();

        // 3. Draft Line Items (Base Plan + Modules)
        let subtotalPaise = 0;
        let taxTotalPaise = 0;
        const lineItems = [];

        // Base Plan
        if (subscription.billingPlanVersionId) {
            const planPrice = subscription.billingCycle === "ANNUAL" 
                ? subscription.billingPlanVersionId.annualBasePricePaise 
                : subscription.billingPlanVersionId.monthlyBasePricePaise;
            
            subtotalPaise += planPrice;
            lineItems.push({
                description: `Base Plan: ${subscription.billingPlanVersionId.name || 'Subscription'}`,
                unitPricePaise: planPrice,
                subtotalPaise: planPrice,
                planVersionId: subscription.billingPlanVersionId._id,
                quantity: 1
            });
        }

        // Modules
        for (const item of items) {
            const price = await PricingEngine.resolveModulePrice(
                organizationId, 
                subscription.billingPlanVersionId._id, 
                item.billingModuleVersionId._id, 
                item.billingModuleVersionId.monthlyPricePaise, 
                item.billingModuleVersionId.annualPricePaise, 
                subscription.billingCycle
            );

            const itemSubtotal = price.amountPaise * item.quantity;
            subtotalPaise += itemSubtotal;

            lineItems.push({
                description: `Module: ${item.billingModuleVersionId.name || 'Add-on'}`,
                unitPricePaise: price.amountPaise,
                subtotalPaise: itemSubtotal,
                moduleVersionId: item.billingModuleVersionId._id,
                quantity: item.quantity
            });
        }

        // 4. Discounts
        // (Simplified for this file: assuming no invoice-level discount here)
        const discountTotalPaise = 0; 
        
        // 5. Credits
        // We do this at issue time, not draft time usually, but skipping for draft generation
        const creditAppliedPaise = 0;

        const taxableAmountPaise = subtotalPaise - discountTotalPaise - creditAppliedPaise;

        // 6. Taxes (Assuming a default rule for the example)
        // const taxResult = await TaxEngine.calculateTax(defaultRule, taxableAmountPaise, false);
        // taxTotalPaise = taxResult.taxTotalPaise;

        const grandTotalPaise = taxableAmountPaise + taxTotalPaise;

        if (isPreview) {
            return {
                invoiceNumber: "PREVIEW-AUTO",
                organizationId,
                organizationSubscriptionId: subscriptionId,
                status: "DRAFT",
                servicePeriodStart: periodStart,
                servicePeriodEnd: periodEnd,
                subtotalPaise,
                discountAmountPaise: discountTotalPaise,
                creditAmountAppliedPaise: creditAppliedPaise,
                taxableAmountPaise,
                taxAmountPaise: taxTotalPaise,
                totalAmountPaise: grandTotalPaise,
                amountDuePaise: grandTotalPaise,
                lineItems,
                estimatedDate: new Date()
            };
        }

        // 7. Generate Number
        const financialYear = "2026-2027";
        const invoiceNumber = await InvoiceSequence.getNextNumber(financialYear);

        // 8. Save Invoice
        const invoice = await Invoice.create({
            invoiceNumber,
            organizationId,
            organizationSubscriptionId: subscriptionId,
            status: "DRAFT",
            servicePeriodStart: periodStart,
            servicePeriodEnd: periodEnd,
            subtotalPaise,
            discountAmountPaise: discountTotalPaise,
            creditAmountAppliedPaise: creditAppliedPaise,
            taxableAmountPaise,
            taxAmountPaise: taxTotalPaise,
            totalAmountPaise: grandTotalPaise,
            amountDuePaise: grandTotalPaise
        });

        // 9. Save Lines
        const lineItemDocs = lineItems.map(li => ({
            ...li,
            invoiceId: invoice._id
        }));
        await InvoiceLineItem.insertMany(lineItemDocs);

        // Return combined object for easier use
        return { ...invoice.toObject(), lineItems: lineItemDocs };
    }

}

export default InvoiceGenerator;
