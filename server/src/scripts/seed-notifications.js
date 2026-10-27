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

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import NotificationTemplate from "../models/NotificationTemplate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const templates = [
    // -------------------------------------------------------------
    // SaaS Billing Emails (14 Templates)
    // -------------------------------------------------------------
    {
        name: "SAAS_SUBSCRIPTION_ACTIVATED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Your Classgrid subscription is active",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>The Classgrid subscription for {{organization_name}} is now active.</p>
<ul>
  <li><strong>Plan:</strong> {{plan_name}}</li>
  <li><strong>Billing cycle:</strong> {{billing_cycle}}</li>
  <li><strong>Subscription start:</strong> {{subscription_start}}</li>
  <li><strong>Next billing date:</strong> {{next_billing_date}}</li>
  <li><strong>Activated at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Manage your subscription:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>If you did not authorize this subscription, contact Classgrid Support immediately.</p>
<p><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: ["admin_name", "organization_name", "plan_name", "billing_cycle", "subscription_start", "next_billing_date", "event_time", "timezone", "portal_url", "support_url"]
    },
    {
        name: "SAAS_SUBSCRIPTION_CHANGED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Your Classgrid subscription was updated",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>The subscription configuration for {{organization_name}} has been updated.</p>
<ul>
  <li><strong>Previous plan:</strong> {{previous_plan_name}}</li>
  <li><strong>Current plan:</strong> {{plan_name}}</li>
  <li><strong>Modules added:</strong> {{modules_added}}</li>
  <li><strong>Modules removed:</strong> {{modules_removed}}</li>
  <li><strong>Effective from:</strong> {{effective_date}}</li>
  <li><strong>Changed by:</strong> {{changed_by}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>
<p>Review your subscription:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>If you did not authorize this change, contact Classgrid Support immediately.</p>
<p><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: ["admin_name", "organization_name", "previous_plan_name", "plan_name", "modules_added", "modules_removed", "effective_date", "changed_by", "reason", "portal_url", "support_url"]
    },
    {
        name: "SAAS_PRICE_CHANGE_SCHEDULED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Upcoming Classgrid pricing change",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>A pricing change has been scheduled for the Classgrid subscription of {{organization_name}}.</p>
<ul>
  <li><strong>Current recurring amount:</strong> {{current_amount}}</li>
  <li><strong>New recurring amount:</strong> {{new_amount}}</li>
  <li><strong>Effective date:</strong> {{effective_date}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>
<p>Your existing issued invoices will not be changed.</p>
<p>Review the pricing details:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>For assistance, contact Classgrid Support:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_INVOICE_ISSUED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Classgrid invoice {{invoice_number}} is ready",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>A new Classgrid subscription invoice has been issued for {{organization_name}}.</p>
<ul>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Billing period:</strong> {{billing_period}}</li>
  <li><strong>Plan:</strong> {{plan_name}}</li>
  <li><strong>Module charges:</strong> {{module_amount}}</li>
  <li><strong>Tax:</strong> {{tax_amount}}</li>
  <li><strong>Total amount:</strong> {{amount}}</li>
  <li><strong>Amount due:</strong> {{amount_due}}</li>
  <li><strong>Due date:</strong> {{due_date}}</li>
</ul>
<p>Review and pay the invoice:<br><a href="{{payment_url}}">{{payment_url}}</a></p>
<p>Download the invoice:<br><a href="{{invoice_url}}">{{invoice_url}}</a></p>
<p>For billing assistance, contact Classgrid Support:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_PAYMENT_DUE_REMINDER",
        type: "EMAIL",
        category: "SAAS",
        subject: "Classgrid invoice {{invoice_number}} is due on {{due_date}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>This is a reminder that a Classgrid subscription payment for {{organization_name}} is due soon.</p>
<ul>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Amount due:</strong> {{amount_due}}</li>
  <li><strong>Due date:</strong> {{due_date}}</li>
</ul>
<p>Pay securely:<br><a href="{{payment_url}}">{{payment_url}}</a></p>
<p>Please ignore this reminder if the payment has already been completed and is still being processed.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_PAYMENT_PROCESSING",
        type: "EMAIL",
        category: "SAAS",
        subject: "Your Classgrid payment is being processed",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Your payment for Classgrid invoice {{invoice_number}} is being processed.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Amount:</strong> {{amount}}</li>
  <li><strong>Order ID:</strong> {{order_id}}</li>
  <li><strong>Started at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Do not make another payment for this invoice while the transaction is being verified.</p>
<p>Check payment status:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_PAYMENT_SUCCESSFUL",
        type: "EMAIL",
        category: "SAAS",
        subject: "Payment successful for Classgrid invoice {{invoice_number}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Your Classgrid subscription payment was completed successfully.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Amount paid:</strong> {{amount_paid}}</li>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Payment method:</strong> {{payment_method}}</li>
  <li><strong>Paid at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Download your receipt:<br><a href="{{receipt_url}}">{{receipt_url}}</a></p>
<p>Your subscription remains active.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_PAYMENT_FAILED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Payment unsuccessful for Classgrid invoice {{invoice_number}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Your payment for Classgrid invoice {{invoice_number}} could not be completed.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Amount:</strong> {{amount}}</li>
  <li><strong>Reason:</strong> {{public_failure_reason}}</li>
  <li><strong>Attempted at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>No successful payment was recorded for this attempt.</p>
<p>Try again:<br><a href="{{payment_url}}">{{payment_url}}</a></p>
<p>If your account was debited, do not retry immediately. Check the payment status or contact Classgrid Support.</p>
<p><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_INVOICE_OVERDUE",
        type: "EMAIL",
        category: "SAAS",
        subject: "Action required: Classgrid invoice {{invoice_number}} is overdue",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Classgrid invoice {{invoice_number}} for {{organization_name}} is overdue.</p>
<ul>
  <li><strong>Amount due:</strong> {{amount_due}}</li>
  <li><strong>Original due date:</strong> {{due_date}}</li>
  <li><strong>Grace period ends:</strong> {{grace_period_end}}</li>
</ul>
<p>Pay the outstanding invoice:<br><a href="{{payment_url}}">{{payment_url}}</a></p>
<p>Your organization’s subscription may be restricted if payment is not completed before the grace period ends.</p>
<p>For assistance:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_SUBSCRIPTION_SUSPENDED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Classgrid subscription suspended for {{organization_name}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>The Classgrid subscription for {{organization_name}} has been suspended.</p>
<ul>
  <li><strong>Reason:</strong> {{reason}}</li>
  <li><strong>Outstanding amount:</strong> {{amount_due}}</li>
  <li><strong>Suspended at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Organization data remains stored according to the applicable Classgrid terms, but access to paid modules may be restricted.</p>
<p>Resolve the issue:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>For assistance:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_SUBSCRIPTION_RESTORED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Classgrid subscription restored",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>The Classgrid subscription for {{organization_name}} has been restored.</p>
<ul>
  <li><strong>Plan:</strong> {{plan_name}}</li>
  <li><strong>Restored at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Your enabled Classgrid modules are available again.</p>
<p>Open Classgrid:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_CANCELLATION_SCHEDULED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Classgrid subscription cancellation scheduled",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Cancellation has been scheduled for the Classgrid subscription of {{organization_name}}.</p>
<ul>
  <li><strong>Current plan:</strong> {{plan_name}}</li>
  <li><strong>Access available until:</strong> {{access_end_date}}</li>
  <li><strong>Scheduled by:</strong> {{changed_by}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>
<p>You can review the cancellation before it becomes effective:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>If you did not authorize this action, contact Classgrid Support immediately.</p>
<p><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_SUBSCRIPTION_CANCELLED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Classgrid subscription cancelled for {{organization_name}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>The Classgrid subscription for {{organization_name}} has been cancelled.</p>
<ul>
  <li><strong>Cancelled at:</strong> {{event_time}} {{timezone}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
  <li><strong>Final access date:</strong> {{access_end_date}}</li>
  <li><strong>Outstanding amount, if any:</strong> {{amount_due}}</li>
</ul>
<p>Review billing records:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>For assistance:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "SAAS_CREDIT_ADJUSTMENT_ISSUED",
        type: "EMAIL",
        category: "SAAS",
        subject: "Billing adjustment issued for {{organization_name}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>A billing adjustment has been issued for {{organization_name}}.</p>
<ul>
  <li><strong>Related invoice:</strong> {{invoice_number}}</li>
  <li><strong>Adjustment type:</strong> {{adjustment_type}}</li>
  <li><strong>Adjustment amount:</strong> {{adjustment_amount}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
  <li><strong>Issued at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>The adjustment has been applied as:<br>{{adjustment_application}}</p>
<p>Review the adjustment:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },

    // -------------------------------------------------------------
    // Institution Payment Setup Emails (4 Templates)
    // -------------------------------------------------------------
    {
        name: "INSTITUTION_PAYMENT_ACCOUNT_CONNECTED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Payment account connected successfully",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>The payment account for {{organization_name}} has been connected successfully.</p>
<ul>
  <li><strong>Status:</strong> Connected</li>
  <li><strong>Connected at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>You can now continue with payment testing and institution fee configuration.</p>
<p>Review payment settings:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>If you did not authorize this action, contact Classgrid Support immediately.</p>
<p><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PAYMENT_ACCOUNT_ACTION_REQUIRED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Action required for your payment account",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Action is required for the payment account connected to {{organization_name}}.</p>
<ul>
  <li><strong>Current status:</strong> {{account_status}}</li>
  <li><strong>Required action:</strong> {{required_action}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>
<p>Online fee payments may be unavailable until this issue is resolved.</p>
<p>Review payment settings:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>For assistance:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_FEE_COLLECTION_STATUS_CHANGED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Online fee collection {{collection_status}} for {{organization_name}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Online fee collection for {{organization_name}} has been {{collection_status}}.</p>
<ul>
  <li><strong>Changed by:</strong> {{changed_by}}</li>
  <li><strong>Changed at:</strong> {{event_time}} {{timezone}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
  <li><strong>Current status:</strong> {{collection_status}}</li>
</ul>
<p>Review payment settings:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>If you did not authorize this change, contact Classgrid Support immediately.</p>
<p><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PAYMENT_SETTINGS_CHANGED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Security notice: Payment settings changed",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Payment settings for {{organization_name}} were changed.</p>
<ul>
  <li><strong>Changed by:</strong> {{changed_by}}</li>
  <li><strong>Changed at:</strong> {{event_time}} {{timezone}}</li>
  <li><strong>IP address:</strong> {{masked_ip_address}}</li>
</ul>
<p>Changes:<br>{{change_summary}}</p>
<p>Review payment settings:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>If you did not authorize this change, contact Classgrid Support immediately.</p>
<p><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },

    // -------------------------------------------------------------
    // Institution Fee & Ledger Emails (10 Templates)
    // -------------------------------------------------------------
    {
        name: "INSTITUTION_FEE_INVOICE_ISSUED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "New {{fee_name}} invoice from {{organization_name}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>{{organization_name}} has issued a new fee invoice for {{learner_name}}.</p>
<ul>
  <li><strong>{{learner_id_label}}:</strong> {{learner_id}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee category:</strong> {{fee_category}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Academic scope:</strong> {{academic_scope}}</li>
  <li><strong>Total amount:</strong> {{amount}}</li>
  <li><strong>Amount due:</strong> {{amount_due}}</li>
  <li><strong>Due date:</strong> {{due_date}}</li>
</ul>
<p>Review the invoice and pay securely:<br><a href="{{payment_url}}">{{payment_url}}</a></p>
<p>For questions about the fee, contact {{organization_name}}.</p>
<p>For technical assistance:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_FEE_INVOICE_UPDATED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Fee invoice {{invoice_number}} has been updated",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>{{organization_name}} has updated the fee invoice for {{learner_name}}.</p>
<ul>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Previous amount due:</strong> {{previous_amount_due}}</li>
  <li><strong>Updated amount due:</strong> {{amount_due}}</li>
  <li><strong>Due date:</strong> {{due_date}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>
<p>Review the updated invoice:<br><a href="{{payment_url}}">{{payment_url}}</a></p>
<p>For questions about the change, contact {{organization_name}}.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_FEE_INVOICE_CANCELLED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Fee invoice {{invoice_number}} has been cancelled",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>{{organization_name}} has cancelled fee invoice {{invoice_number}} for {{learner_name}}.</p>
<ul>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Cancelled at:</strong> {{event_time}} {{timezone}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>
<p>No further payment is required for this invoice.</p>
<p>For questions, contact {{organization_name}}.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_INSTALLMENT_PLAN_CREATED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Fee installment plan created for {{learner_name}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>{{organization_name}} has created an installment plan for {{learner_name}}.</p>
<ul>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Total amount:</strong> {{amount}}</li>
  <li><strong>Number of installments:</strong> {{installment_count}}</li>
  <li><strong>Next installment amount:</strong> {{next_installment_amount}}</li>
  <li><strong>Next due date:</strong> {{due_date}}</li>
</ul>
<p>View the complete installment schedule:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_FEE_DUE_REMINDER",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "{{fee_name}} payment due {{due_description}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>This is a reminder that a fee payment for {{learner_name}} is due {{due_description}}.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Amount due:</strong> {{amount_due}}</li>
  <li><strong>Due date:</strong> {{due_date}}</li>
</ul>
<p>Pay securely:<br><a href="{{payment_url}}">{{payment_url}}</a></p>
<p>Please ignore this reminder if payment has already been completed and is still being processed.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_FEE_OVERDUE",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Fee payment overdue for invoice {{invoice_number}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>The fee payment for {{learner_name}} is overdue.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Amount due:</strong> {{amount_due}}</li>
  <li><strong>Original due date:</strong> {{due_date}}</li>
  <li><strong>Late fee, if applicable:</strong> {{late_fee_amount}}</li>
</ul>
<p>Pay securely:<br><a href="{{payment_url}}">{{payment_url}}</a></p>
<p>For fee-related questions, contact {{organization_name}}.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_FEE_CONCESSION_APPLIED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Fee concession applied to invoice {{invoice_number}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>{{organization_name}} has applied an institution-approved fee concession or discount to the invoice for {{learner_name}}.</p>
<ul>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Original amount:</strong> {{original_amount}}</li>
  <li><strong>Concession or discount:</strong> {{discount_amount}}</li>
  <li><strong>Updated amount due:</strong> {{amount_due}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>
<p>Review the invoice:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_OFFLINE_PAYMENT_RECORDED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Offline payment recorded for invoice {{invoice_number}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>{{organization_name}} has recorded an offline payment for {{learner_name}}.</p>
<ul>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Amount recorded:</strong> {{amount_paid}}</li>
  <li><strong>Payment method:</strong> {{payment_method}}</li>
  <li><strong>Reference:</strong> {{payment_reference}}</li>
  <li><strong>Recorded at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Download the receipt:<br><a href="{{receipt_url}}">{{receipt_url}}</a></p>
<p>Contact {{organization_name}} if any information is incorrect.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PARTIAL_PAYMENT_RECEIVED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Partial payment received — balance remaining",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>{{organization_name}} has received a partial payment for {{learner_name}}.</p>
<ul>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Amount received:</strong> {{amount_paid}}</li>
  <li><strong>Remaining balance:</strong> {{amount_due}}</li>
  <li><strong>Next due date:</strong> {{due_date}}</li>
</ul>
<p>Download the receipt:<br><a href="{{receipt_url}}">{{receipt_url}}</a></p>
<p>Pay the remaining balance:<br><a href="{{payment_url}}">{{payment_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_INVOICE_GENERATION_FAILED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Action required: Fee invoice generation failed",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Classgrid could not complete fee invoice generation for {{organization_name}}.</p>
<ul>
  <li><strong>Fee structure:</strong> {{fee_structure_name}}</li>
  <li><strong>Academic scope:</strong> {{academic_scope}}</li>
  <li><strong>Successful records:</strong> {{successful_count}}</li>
  <li><strong>Failed records:</strong> {{failed_count}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>
<p>Classgrid will use idempotency protection to prevent duplicate invoices when the operation is retried.</p>
<p>Review the failed records:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>For technical assistance:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },

    // -------------------------------------------------------------
    // Checkout and payment emails (9 Templates)
    // -------------------------------------------------------------
    {
        name: "PAYMENT_OTP_SENT",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Your Classgrid payment verification code",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>Use the following verification code to continue your payment:</p>
<h2 style="letter-spacing: 4px;">{{otp}}</h2>
<p>This code expires in {{otp_expiry_minutes}} minutes.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Amount:</strong> {{amount}}</li>
</ul>
<p>Do not share this code with anyone. Classgrid and {{organization_name}} will never ask you to disclose your OTP by phone, message, or email.</p>
<p>If you did not initiate this payment, do not use the code.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "PAYMENT_SESSION_EXPIRED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Your payment session has expired",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>Your payment session expired for security reasons.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Amount:</strong> {{amount}}</li>
</ul>
<p>No successful payment was completed through this expired session.</p>
<p>Start a new secure payment:<br><a href="{{payment_url}}">{{payment_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PAYMENT_PROCESSING",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Your payment is being processed",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>Your payment is still being processed.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Amount:</strong> {{amount}}</li>
  <li><strong>Order ID:</strong> {{order_id}}</li>
</ul>
<p>Do not make another payment for the same invoice while this transaction is being checked.</p>
<p>Classgrid will notify you when the final status is available.</p>
<p>Check payment status:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PAYMENT_SUCCESSFUL_PAYER",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Payment successful — receipt for {{invoice_number}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>Your payment to {{organization_name}} was completed successfully through Classgrid.</p>
<ul>
  <li><strong>{{learner_label}}:</strong> {{learner_name}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Amount paid:</strong> {{amount_paid}}</li>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Payment method:</strong> {{payment_method}}</li>
  <li><strong>Paid at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Download your receipt:<br><a href="{{receipt_url}}">{{receipt_url}}</a></p>
<p>Keep this receipt for your records.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PAYMENT_SUCCESSFUL_ADMIN",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Payment received for invoice {{invoice_number}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>A fee payment for {{organization_name}} was completed successfully.</p>
<ul>
  <li><strong>{{learner_label}}:</strong> {{learner_name}}</li>
  <li><strong>{{learner_id_label}}:</strong> {{learner_id}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Amount received:</strong> {{amount_paid}}</li>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Payment method:</strong> {{payment_method}}</li>
  <li><strong>Received at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Review the transaction:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>For high payment volumes, allow this email to be replaced by a daily collection summary.</p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PAYMENT_FAILED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Payment unsuccessful for invoice {{invoice_number}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>Your payment to {{organization_name}} could not be completed.</p>
<ul>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Fee:</strong> {{fee_name}}</li>
  <li><strong>Amount:</strong> {{amount}}</li>
  <li><strong>Reason:</strong> {{public_failure_reason}}</li>
</ul>
<p>No successful payment was recorded for this attempt.</p>
<p>Try again:<br><a href="{{payment_url}}">{{payment_url}}</a></p>
<p>If your bank account was debited, do not retry immediately. Check the payment status or contact Classgrid Support.</p>
<p><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "PAYMENT_STATUS_RECONCILED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Final payment status confirmed for {{invoice_number}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>Classgrid has completed verification of your payment status.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Order ID:</strong> {{order_id}}</li>
  <li><strong>Final status:</strong> {{final_payment_status}}</li>
  <li><strong>Amount:</strong> {{amount}}</li>
  <li><strong>Confirmed at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>{{status_explanation}}</p>
<p>Review the payment:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>Receipt, when applicable:<br><a href="{{receipt_url}}">{{receipt_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "PAYMENT_REVERSED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Payment reversed for invoice {{invoice_number}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>A payment associated with invoice {{invoice_number}} was reversed.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Reversed amount:</strong> {{amount}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
  <li><strong>Reversed at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>The time required for the amount to appear in your account depends on your bank or payment method.</p>
<p>Review the payment:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "DUPLICATE_PAYMENT_BLOCKED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Duplicate payment attempt prevented",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>Classgrid prevented a possible duplicate payment for invoice {{invoice_number}}.</p>
<p>A payment for this invoice is already processing or has already been completed.</p>
<p>Review the current invoice status before trying again:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>For technical assistance:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },

    // -------------------------------------------------------------
    // Refund Emails (7 Templates)
    // -------------------------------------------------------------
    {
        name: "REFUND_REQUEST_RECEIVED_PAYER",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Refund request received",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>Your refund request has been received and sent to {{organization_name}} for review.</p>
<ul>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Requested refund:</strong> {{refund_amount}}</li>
  <li><strong>Reason:</strong> {{refund_reason}}</li>
  <li><strong>Requested at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Classgrid provides the workflow, but the refund decision belongs to {{organization_name}}.</p>
<p>Track the request:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "REFUND_REQUEST_RECEIVED_ADMIN",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Refund request requires review",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>A refund request requires review by {{organization_name}}.</p>
<ul>
  <li><strong>{{learner_label}}:</strong> {{learner_name}}</li>
  <li><strong>Invoice number:</strong> {{invoice_number}}</li>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Original payment:</strong> {{amount_paid}}</li>
  <li><strong>Requested refund:</strong> {{refund_amount}}</li>
  <li><strong>Reason:</strong> {{refund_reason}}</li>
  <li><strong>Requested at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Review the request:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "REFUND_APPROVED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Your refund request was approved",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>{{organization_name}} approved your refund request.</p>
<ul>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Approved refund amount:</strong> {{refund_amount}}</li>
  <li><strong>Approved at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Classgrid will submit the approved refund for processing. You will receive another notification when the payment provider confirms its status.</p>
<p>Track the refund:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "REFUND_REJECTED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Update on your refund request",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>{{organization_name}} did not approve your refund request.</p>
<ul>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Requested refund:</strong> {{refund_amount}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
</ul>
<p>For questions about this decision, contact {{organization_name}}.</p>
<p>Review the request:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "REFUND_INITIATED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Refund initiated for payment {{payment_id}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>The approved refund has been submitted for processing.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Refund ID:</strong> {{refund_id}}</li>
  <li><strong>Refund amount:</strong> {{refund_amount}}</li>
  <li><strong>Initiated at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Bank or payment-provider processing time may apply.</p>
<p>Track the refund:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "REFUND_COMPLETED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Refund completed for payment {{payment_id}}",
        htmlBody: `
<p>Hello {{payer_name}},</p>
<p>Your refund has been processed successfully.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Refund ID:</strong> {{refund_id}}</li>
  <li><strong>Refund amount:</strong> {{refund_amount}}</li>
  <li><strong>Processed at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>The amount should appear according to your bank or payment method’s processing timeline.</p>
<p>Review the refund:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "REFUND_FAILED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Refund processing could not be completed",
        htmlBody: `
<p>Hello {{recipient_name}},</p>
<p>The refund could not be completed.</p>
<ul>
  <li><strong>Organization:</strong> {{organization_name}}</li>
  <li><strong>Payment ID:</strong> {{payment_id}}</li>
  <li><strong>Refund ID:</strong> {{refund_id}}</li>
  <li><strong>Refund amount:</strong> {{refund_amount}}</li>
  <li><strong>Reason:</strong> {{public_failure_reason}}</li>
</ul>
<p>The original successful payment remains unchanged until the refund is completed.</p>
<p>Review the refund:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>For technical assistance:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },

    // -------------------------------------------------------------
    // Settlement and reconciliation emails (4 Templates)
    // -------------------------------------------------------------
    {
        name: "INSTITUTION_SETTLEMENT_COMPLETED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Settlement completed — {{settlement_id}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>A payment settlement for {{organization_name}} has been completed.</p>
<ul>
  <li><strong>Settlement ID:</strong> {{settlement_id}}</li>
  <li><strong>Gross transaction amount:</strong> {{gross_amount}}</li>
  <li><strong>Gateway charges and taxes:</strong> {{deduction_amount}}</li>
  <li><strong>Net settlement amount:</strong> {{net_amount}}</li>
  <li><strong>Receiving account:</strong> Ending in {{bank_last4}}</li>
  <li><strong>Settled at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Review or download the settlement report:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_SETTLEMENT_DELAYED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Settlement delayed for {{organization_name}}",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Settlement {{settlement_id}} has not completed within the expected period.</p>
<ul>
  <li><strong>Expected net amount:</strong> {{net_amount}}</li>
  <li><strong>Expected settlement date:</strong> {{settlement_date}}</li>
  <li><strong>Current status:</strong> Delayed</li>
  <li><strong>Reason, if available:</strong> {{reason}}</li>
</ul>
<p>Classgrid is checking the provider status.</p>
<p>Track the settlement:<br><a href="{{portal_url}}">{{portal_url}}</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_SETTLEMENT_FAILED",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Action required: Settlement failed",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Settlement {{settlement_id}} for {{organization_name}} could not be completed.</p>
<ul>
  <li><strong>Net amount:</strong> {{net_amount}}</li>
  <li><strong>Reason:</strong> {{reason}}</li>
  <li><strong>Failed at:</strong> {{event_time}} {{timezone}}</li>
</ul>
<p>Review the payment-account and settlement status:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>For technical assistance:<br><a href="{{support_url}}">Contact Support</a></p>`,
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_RECONCILIATION_MISMATCH",
        type: "EMAIL",
        category: "PAYMENT",
        subject: "Payment reconciliation mismatch requires review",
        htmlBody: `
<p>Hello {{admin_name}},</p>
<p>Classgrid identified a mismatch while reconciling payment records for {{organization_name}}.</p>
<ul>
  <li><strong>Period:</strong> {{period_start}} to {{period_end}}</li>
  <li><strong>Mismatch type:</strong> {{mismatch_type}}</li>
  <li><strong>Reference:</strong> {{reference_id}}</li>
  <li><strong>Expected amount:</strong> {{expected_amount}}</li>
  <li><strong>Recorded amount:</strong> {{recorded_amount}}</li>
</ul>
<p>Review the mismatch:<br><a href="{{portal_url}}">{{portal_url}}</a></p>
<p>Do not manually alter financial records without recording a reason and preserving the audit history.</p>`,
        requiredPlaceholders: []
    },

    // -------------------------------------------------------------
    // Required AWS SNS SMS templates (12 Templates)
    // -------------------------------------------------------------
    {
        name: "PAYMENT_OTP_SENT_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Your Classgrid payment OTP is {{otp}}. It expires in {{otp_expiry_minutes}} minutes. Do not share it with anyone.",
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_FEE_DUE_TOMORROW_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Reminder: {{amount_due}} for {{learner_name}} is due to {{organization_name}} tomorrow. Pay: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_FEE_DUE_TODAY_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Reminder: {{amount_due}} for {{learner_name}} is due to {{organization_name}} today. Pay: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PAYMENT_SUCCESSFUL_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Payment successful: {{amount_paid}} paid to {{organization_name}}. Payment ID: {{payment_id}}. Receipt: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PAYMENT_FAILED_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Payment of {{amount}} to {{organization_name}} was unsuccessful. If debited, do not retry immediately. Status: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "SAAS_PAYMENT_FAILED_SMS",
        type: "SMS",
        category: "SAAS",
        textBody: "Classgrid: Payment failed for invoice {{invoice_number}}. Review and retry securely: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_PAYMENT_SETTINGS_CHANGED_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Security alert: Payment settings for {{organization_name}} were changed. If unauthorized, review immediately: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_FEE_COLLECTION_DISABLED_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Classgrid: Online fee collection was disabled for {{organization_name}}. Review: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "REFUND_INITIATED_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Refund of {{refund_amount}} was initiated for payment {{payment_id}}. Track: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "REFUND_COMPLETED_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Refund completed: {{refund_amount}} for payment {{payment_id}}. Details: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_SETTLEMENT_COMPLETED_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Settlement {{settlement_id}} completed for {{net_amount}}. Account ending {{bank_last4}}. Details: {{short_url}}",
        requiredPlaceholders: []
    },
    {
        name: "INSTITUTION_SETTLEMENT_FAILED_SMS",
        type: "SMS",
        category: "PAYMENT",
        textBody: "Urgent: Settlement {{settlement_id}} failed for {{organization_name}}. Review: {{short_url}}",
        requiredPlaceholders: []
    }
];

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");
        
        let added = 0;
        let skipped = 0;

        for (const tmpl of templates) {
            const exists = await NotificationTemplate.findOne({ name: tmpl.name });
            
            // Map fromEmail based on category if not explicitly provided
            let fromEmail = tmpl.fromEmail;
            let fromName = tmpl.fromName;
            
            if (!fromEmail) {
                if (tmpl.category === 'SAAS' || tmpl.category === 'PAYMENT') {
                    fromEmail = "billing@classgrid.in";
                    fromName = "Classgrid Billing";
                } else if (tmpl.name.includes('_ADMIN') || tmpl.name.includes('SYSTEM')) {
                    fromEmail = "team@classgrid.in";
                    fromName = "Classgrid Team";
                } else {
                    fromEmail = "support@classgrid.in";
                    fromName = "Classgrid Support";
                }
            }

            if (!exists) {
                await NotificationTemplate.create({
                    ...tmpl,
                    isActive: true,
                    fromEmail,
                    fromName,
                    htmlBody: tmpl.htmlBody ? tmpl.htmlBody.trim() : undefined
                });
                added++;
                console.log(`+ Added ${tmpl.name}`);
            } else {
                skipped++;
                console.log(`- Skipped ${tmpl.name} (already exists)`);
            }
        }

        console.log(`\nSeeding completed. Added: ${added}, Skipped: ${skipped}`);
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seed();
