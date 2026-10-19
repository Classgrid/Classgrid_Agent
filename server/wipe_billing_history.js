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
import mongoose from 'mongoose'; import dotenv from 'dotenv'; dotenv.config({ path: './.env' }); import BillingAuditLog from './src/models/BillingAuditLog.js'; import Invoice from './src/models/Invoice.js'; import SaasInvoice from './src/models/SaasInvoice.js'; import PaymentAttempt from './src/models/PaymentAttempt.js'; import PaymentOrder from './src/models/PaymentOrder.js'; import PaymentRefund from './src/models/PaymentRefund.js'; import PaymentTransaction from './src/models/PaymentTransaction.js'; import AiUsageLog from './src/models/AiUsageLog.js'; mongoose.connect(process.env.MONGO_URI).then(async () => { console.log('Connected to DB'); await BillingAuditLog.deleteMany({}); await Invoice.deleteMany({}); await SaasInvoice.deleteMany({}); await PaymentAttempt.deleteMany({}); await PaymentOrder.deleteMany({}); await PaymentRefund.deleteMany({}); await PaymentTransaction.deleteMany({}); await AiUsageLog.deleteMany({}); console.log('Deleted all billing history and invoices'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
