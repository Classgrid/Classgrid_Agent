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

/**
 * fraud.service.js
 * 
 * Real-time VPN/Proxy fraud detection for ClassGrid Billing.
 * Checks if the payer's IP is from a VPN, proxy, or foreign datacenter.
 * All legitimate ClassGrid payments originate from India (IN).
 * Any foreign IP or VPN/hosting IP is flagged as FRAUD.
 */

const FRAUD_ADMIN_EMAIL = "nikhil.shinde@classgrid.in";
import { baseTemplate } from "./email-templates.service.js";

/**
 * Check if an IP address belongs to a VPN, proxy, or datacenter.
 * Uses the free ip-api.com service (no API key needed, 45 req/min).
 * 
 * @param {string} ip - The IP address to check
 * @returns {Object} { isFraud, score, reason, country, isp, is_vpn, is_hosting }
 */
export async function detectFraud(ip) {
    try {
        // Skip localhost/private IPs
        if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
            return { isFraud: false, score: 0.0, reason: "Local/private IP — skipped", country: "IN", is_vpn: false, is_hosting: false };
        }

        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,isp,org,hosting,proxy,query,city,regionName`);
        const data = await response.json();

        if (data.status !== "success") {
            console.warn(`[Fraud] ip-api.com lookup failed for ${ip}:`, data);
            return { isFraud: false, score: 0.0, reason: "IP lookup failed — allowing as fail-safe", country: "UNKNOWN" };
        }

        const isVpnOrProxy = data.proxy === true;
        const isHosting = data.hosting === true;     // Datacenter IP (AWS, DigitalOcean, etc.)
        const isForeignCountry = data.countryCode !== "IN";

        // Calculate fraud score
        let score = 0.0;
        const reasons = [];

        if (isVpnOrProxy) {
            score += 0.50;
            reasons.push(`VPN/Proxy detected (ISP: ${data.isp})`);
        }
        if (isHosting) {
            score += 0.30;
            reasons.push(`Datacenter/Hosting IP (Org: ${data.org})`);
        }
        if (isForeignCountry) {
            score += 0.40;
            reasons.push(`Foreign country: ${data.country} (${data.countryCode})`);
        }

        // Cap at 1.0
        score = Math.min(score, 1.0);

        const isFraud = score >= 0.80;

        console.log(`[Fraud] IP: ${ip} | Country: ${data.country} | VPN: ${isVpnOrProxy} | Hosting: ${isHosting} | Score: ${score.toFixed(2)} | Fraud: ${isFraud}`);

        return {
            isFraud,
            score,
            reason: reasons.length > 0 ? reasons.join("; ") : "Clean IP — no anomalies detected",
            country: data.country,
            countryCode: data.countryCode,
            isp: data.isp,
            org: data.org,
            is_vpn: isVpnOrProxy,
            is_hosting: isHosting,
            ip: data.query,
            city: data.city,
            region: data.regionName,
        };
    } catch (error) {
        console.error("[Fraud] Detection error:", error.message);
        // Fail-safe: allow the payment if detection crashes
        return { isFraud: false, score: 0.0, reason: `Detection error: ${error.message}`, country: "UNKNOWN" };
    }
}

/**
 * Simple User-Agent Parser
 */
export function parseUserAgent(ua) {
    if (!ua) return "Unknown Device";
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return `${browser} on ${os}`;
}

/**
 * Build a fraud alert email HTML body
 */
export function buildFraudAlertHtml({ ip, country, isp, score, reason, amount, paymentId, payerEmail, paidAt, device, location, time }) {
    const content = `
        <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:16px; margin-bottom:24px; border-radius:4px;">
            <p style="font-size:16px;color:#991b1b;font-weight:bold;margin:0;">A suspicious payment was detected and automatically blocked.</p>
        </div>
        
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
                <td style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:40%;">Fraud Score</td>
                <td style="padding:10px 12px;color:#dc2626;font-weight:700;font-size:18px;border-bottom:1px solid #e5e7eb;">${(score * 100).toFixed(0)}%</td>
            </tr>
            <tr style="background:#f9fafb;">
                <td style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">Reason</td>
                <td style="padding:10px 12px;color:#dc2626;border-bottom:1px solid #e5e7eb;">${reason}</td>
            </tr>
            <tr>
                <td style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">Amount</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${amount}</td>
            </tr>
            <tr style="background:#f9fafb;">
                <td style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">Payment ID</td>
                <td style="padding:10px 12px;font-family:monospace;border-bottom:1px solid #e5e7eb;">${paymentId}</td>
            </tr>
            <tr>
                <td style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">Payer Email</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${payerEmail}</td>
            </tr>
        </table>

        <div style="margin-top:24px;border-top:2px dashed #e5e7eb;padding-top:16px;">
            <h3 style="margin:0 0 12px 0;font-size:15px;color:#111827;">Attempt Details</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:6px 0;font-weight:600;color:#4b5563;width:30%;">Device</td>
                    <td style="padding:6px 0;color:#111827;">${device}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-weight:600;color:#4b5563;">Location</td>
                    <td style="padding:6px 0;color:#111827;">${location}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-weight:600;color:#4b5563;">IP Address</td>
                    <td style="padding:6px 0;color:#111827;font-family:monospace;">${ip} (${isp || "Unknown ISP"})</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-weight:600;color:#4b5563;">Time</td>
                    <td style="padding:6px 0;color:#111827;">${time}</td>
                </tr>
            </table>
        </div>
        
        <p style="color:#991b1b;font-size:14px;margin-top:24px;">The payment has been automatically refunded. No further action is required.</p>
    `;
    return baseTemplate({ content, title: "🚨 FRAUD ALERT — Payment Blocked" });
}

export function buildUserFraudAlertHtml({ amount, paymentId, paidAt, device, location, ip, isp, time }) {
    const content = `
        <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:16px; margin-bottom:24px; border-radius:4px;">
            <p style="font-size:16px;color:#991b1b;font-weight:bold;margin:0;">Your recent payment was declined for security reasons.</p>
        </div>
        
        <p style="color:#374151;font-size:15px;line-height:1.5;margin-bottom:24px;">
            Hello,<br><br>
            Our automated security system flagged your recent transaction as suspicious due to network anomalies (e.g., active VPN or proxy). As a precaution, we have <strong>blocked this payment and initiated a full refund</strong>.
        </p>
        
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr>
                <td style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">Amount</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${amount}</td>
            </tr>
            <tr style="background:#f9fafb;">
                <td style="padding:10px 12px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">Payment ID</td>
                <td style="padding:10px 12px;font-family:monospace;border-bottom:1px solid #e5e7eb;">${paymentId}</td>
            </tr>
            <tr>
                <td style="padding:10px 12px;font-weight:600;color:#374151;">Timestamp</td>
                <td style="padding:10px 12px;">${paidAt}</td>
            </tr>
        </table>
        
        <div style="margin-top:24px;border-top:2px dashed #e5e7eb;padding-top:16px;">
            <h3 style="margin:0 0 12px 0;font-size:15px;color:#111827;">Attempt Details</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:6px 0;font-weight:600;color:#4b5563;width:30%;">Device</td>
                    <td style="padding:6px 0;color:#111827;">${device}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-weight:600;color:#4b5563;">Location</td>
                    <td style="padding:6px 0;color:#111827;">${location}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-weight:600;color:#4b5563;">IP Address</td>
                    <td style="padding:6px 0;color:#111827;font-family:monospace;">${ip} (${isp || "Unknown ISP"})</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-weight:600;color:#4b5563;">Time</td>
                    <td style="padding:6px 0;color:#111827;">${time}</td>
                </tr>
            </table>
        </div>
        
        <p style="color:#374151;font-size:15px;line-height:1.5;margin-top:24px;">
            <strong>What happens next?</strong><br>
            The amount of ${amount} will be refunded to your original payment method within 5-7 business days. Please disable any VPNs and try your payment again.
        </p>
    `;
    return baseTemplate({ content, title: "Payment Declined — Security Alert" });
}

export { FRAUD_ADMIN_EMAIL };
