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
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "src", "routes", "razorpay-webhook.routes.js");
let content = fs.readFileSync(filePath, "utf-8");

const replacement = `                else {
                    // Log it anyway so nothing is lost
                    const existing = await PlatformTransaction.findOne({ razorpayPaymentId: paymentId });
                    if (!existing) {
                        let resolvedUserName = notes?.payerName || notes?.userName || "Unknown";
                        let resolvedUserEmail = email || notes?.payerEmail || "";
                        let resolvedUserMobile = contact || notes?.payerPhone || "";
                        let resolvedUserId = notes?.user_id || null;
                        let resolvedUserRole = "";
                        let resolvedOrgName = "";

                        try {
                            const User = (await import("../models/User.js")).default;
                            let user = null;
                            if (resolvedUserId) {
                                user = await User.findById(resolvedUserId).populate("organization_id");
                            } else if (organizationId) {
                                user = await User.findOne({ organization_id: organizationId, role: "owner" }).populate("organization_id");
                            }

                            if (user) {
                                if (resolvedUserName === "Unknown") resolvedUserName = user.name || "Unknown";
                                if (!resolvedUserEmail) resolvedUserEmail = user.email || "";
                                if (!resolvedUserMobile) resolvedUserMobile = user.phoneNumber || "";
                                if (!resolvedUserId) resolvedUserId = user._id;
                                resolvedUserRole = user.role || "";
                                if (user.organization_id) resolvedOrgName = user.organization_id.name || "";
                            }
                        } catch (e) {
                            console.error("[Razorpay Webhook] User lookup failed for generic payment:", e);
                        }

                        await PlatformTransaction.create({
                            organizationId: organizationId || null,
                            organizationName: resolvedOrgName,
                            type: "razorpay",
                            amount: amountInr,
                            currency,
                            status: "success",
                            razorpayOrderId: orderId,
                            razorpayPaymentId: paymentId,
                            note: \`Webhook: \${event} | Type: \${paymentType} | Notes: \${JSON.stringify(notes || {})}\`,
                            userName: resolvedUserName,
                            userEmail: resolvedUserEmail,
                            userMobile: resolvedUserMobile,
                            userId: resolvedUserId,
                            userRole: resolvedUserRole,
                            paymentMethod: method || "",
                            paymentTime: paymentEntity?.created_at ? new Date(paymentEntity.created_at * 1000) : new Date(),
                        });
                    }
                    console.log(\`[Razorpay Webhook] ✅ Generic payment logged: ₹\${amountInr}\`);
                }`;

// Regex to find the block
const regex = /else \{\s*\/\/ Log it anyway so nothing is lost\s*const existing = await PlatformTransaction\.findOne\(\{ razorpayPaymentId: paymentId \}\);\s*if \(\!existing\) \{([\s\S]*?)console\.log\(`\[Razorpay Webhook\] ✅ Generic payment logged: ₹\$\{amountInr\}`\);\s*\}/;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, "utf-8");
    console.log("Successfully replaced webhook content.");
} else {
    console.log("Regex didn't match!");
}
