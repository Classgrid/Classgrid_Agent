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
const fs = require('fs');
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/super-admin/ai-credits-admin.controller.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix removeGrantedCredits
const oldRemoveTxn = `        if (user) {
            const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
            await AiCreditTransaction.create({
                userId: user._id,
                orgId: user.organization_id || null,
                amount_inr: 0,
                credits_added: 0,
                razorpay_payment_id: \`revoke_\${new Date().getTime()}\`,
                razorpay_order_id: \`admin_revoke\`,
                type: "revoke",
                status: "success",
                userName: user.name || "",
                userEmail: user.email || "",
                organizationName: user.organization_id ? "" : "Classgrid (Platform Team)"
            });
        }`;
const newRemoveTxn = `        if (user) {
            const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
            await AiCreditTransaction.findOneAndUpdate(
                { userId: user._id, type: "grant" },
                { $set: { status: "revoked" } },
                { sort: { createdAt: -1 }, returnDocument: "after" }
            );
        }`;
content = content.replace(oldRemoveTxn, newRemoveTxn);

// 2. Fix pauseGrantedCredits
const oldPauseTxn = `        if (user) {
            const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
            await AiCreditTransaction.create({
                userId: user._id,
                orgId: user.organization_id || null,
                amount_inr: 0,
                credits_added: 0,
                razorpay_payment_id: \`\${isPaused ? 'pause' : 'resume'}_\${new Date().getTime()}\`,
                razorpay_order_id: \`admin_\${isPaused ? 'pause' : 'resume'}\`,
                type: isPaused ? "pause" : "resume",
                status: "success",
                userName: user.name || "",
                userEmail: user.email || "",
                organizationName: user.organization_id ? "" : "Classgrid (Platform Team)"
            });
        }`;
const newPauseTxn = `        if (user) {
            const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
            await AiCreditTransaction.findOneAndUpdate(
                { userId: user._id, type: "grant" },
                { $set: { status: isPaused ? "paused" : "active" } },
                { sort: { createdAt: -1 }, returnDocument: "after" }
            );
        }`;
content = content.replace(oldPauseTxn, newPauseTxn);

// 3. Fix extendGrantedCredits
const oldExtendTxn = `        const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
        await AiCreditTransaction.create({
            userId: user._id,
            orgId: user.organization_id || null,
            amount_inr: 0,
            credits_added: 0,
            razorpay_payment_id: \`extend_\${new Date().getTime()}\`,
            razorpay_order_id: \`admin_extend\`,
            type: "extend",
            status: "success",
            metadata: { newEndDate: new Date(endDate).toISOString() },
            userName: user.name || "",
            userEmail: user.email || "",
            organizationName: user.organization_id ? "" : "Classgrid (Platform Team)"
        });`;
const newExtendTxn = `        const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
        await AiCreditTransaction.findOneAndUpdate(
            { userId: user._id, type: "grant" },
            { $set: { status: "active" } },
            { sort: { createdAt: -1 }, returnDocument: "after" }
        );`;
content = content.replace(oldExtendTxn, newExtendTxn);

fs.writeFileSync(file, content);
console.log('Backend fixed');
