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
let authRoutes = fs.readFileSync('server/src/routes/auth.routes.js', 'utf8');

if (!authRoutes.includes('/chat/send-whatsapp-otp')) {
  authRoutes = authRoutes.replace(
    'router.post("/logout", authController.logout);',
    'router.post("/logout", authController.logout);\n\n// --- Chat Agent Real Auth Flow ---\nrouter.post("/chat/send-email-otp", authController.chatSendEmailOtp);\nrouter.post("/chat/verify-email-otp", authController.chatVerifyEmailOtp);\nrouter.post("/chat/send-whatsapp-otp", authController.chatSendWhatsappOtp);\nrouter.post("/chat/finalize-onboarding", authController.chatFinalizeOnboarding);\n'
  );
  fs.writeFileSync('server/src/routes/auth.routes.js', authRoutes);
}

let authController = fs.readFileSync('server/src/controllers/auth.controller.js', 'utf8');
if (!authController.includes('export const chatSendEmailOtp')) {
  const newEndpoints = `
// ============================================================================
// CHAT AGENT REAL AUTH FLOW (END-TO-END)
// ============================================================================

export const chatSendEmailOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const OnboardingOTP = (await import('../models/OnboardingOTP.js')).default;
        await OnboardingOTP.deleteMany({ target: email.toLowerCase() });
        await OnboardingOTP.create({
            target: email.toLowerCase(),
            type: 'email',
            otp,
            expires_at: new Date(Date.now() + 10 * 60 * 1000)
        });

        const { sendEmail } = await import('../services/aws-ses.service.js');
        await sendEmail({
            to: email.toLowerCase(),
            subject: 'Classgrid AI - Verification Code',
            html: \`<p>Your Classgrid AI verification code is: <strong>\${otp}</strong></p>\`,
            text: \`Your Classgrid AI verification code is: \${otp}\`
        });

        res.json({ message: 'OTP sent to email' });
    } catch (e) {
        console.error('chatSendEmailOtp Error:', e);
        res.status(500).json({ message: e.message });
    }
};

export const chatVerifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const OnboardingOTP = (await import('../models/OnboardingOTP.js')).default;
        const record = await OnboardingOTP.findOne({ target: email.toLowerCase(), type: 'email' });
        
        if (!record || record.otp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        await OnboardingOTP.deleteOne({ _id: record._id });
        res.json({ message: 'Email verified' });
    } catch (e) {
        console.error('chatVerifyEmailOtp Error:', e);
        res.status(500).json({ message: e.message });
    }
};

export const chatSendWhatsappOtp = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ message: 'Phone number required' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const OnboardingOTP = (await import('../models/OnboardingOTP.js')).default;
        
        await OnboardingOTP.deleteMany({ target: phoneNumber, type: 'phone' });
        await OnboardingOTP.create({
            target: phoneNumber,
            type: 'phone',
            otp,
            expires_at: new Date(Date.now() + 10 * 60 * 1000)
        });

        if (process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
            const waRes = await fetch(\`https://graph.facebook.com/v17.0/\${process.env.WHATSAPP_PHONE_ID}/messages\`, {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${process.env.WHATSAPP_ACCESS_TOKEN}\`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: phoneNumber,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: \`Your Classgrid AI verification OTP is: \${otp}\`
                    }
                })
            });
            const data = await waRes.json();
            if (data.error) throw new Error(data.error.message || 'WhatsApp API Error');
        } else {
            console.warn('WHATSAPP CREDENTIALS MISSING. OTP was generated but not sent:', otp);
        }

        res.json({ message: 'OTP sent to WhatsApp' });
    } catch (e) {
        console.error('chatSendWhatsappOtp Error:', e);
        res.status(500).json({ message: e.message });
    }
};

export const chatFinalizeOnboarding = async (req, res) => {
    try {
        const connectDB = (await import('../../config/db.js')).default;
        await connectDB();
        const { email, name, password, age, role, whatsappPhone, whatsappOtp } = req.body;

        const OnboardingOTP = (await import('../models/OnboardingOTP.js')).default;
        const record = await OnboardingOTP.findOne({ target: whatsappPhone, type: 'phone' });
        if (!record || record.otp !== whatsappOtp) {
            return res.status(400).json({ message: 'Invalid WhatsApp OTP' });
        }
        await OnboardingOTP.deleteOne({ _id: record._id });

        const User = (await import('../models/User.js')).default;
        const bcrypt = (await import('bcryptjs')).default;
        const jwt = (await import('jsonwebtoken')).default;
        
        let user = await User.findOne({ email: email.toLowerCase() });
        const orgId = '6ac4b95e0f8a97f45e98b0ff';

        if (!user) {
            user = new User({
                email: email.toLowerCase(),
                name: name || 'AI User',
                password: await bcrypt.hash(password, 10),
                role: 'student',
                organization_id: orgId,
                metadata: { age, job_role: role, whatsappPhone },
                isEmailVerified: true
            });
        } else {
            user.metadata = { ...(user.metadata || {}), age, job_role: role, whatsappPhone };
            user.organization_id = orgId;
            user.role = 'student';
            if (password) {
               user.password = await bcrypt.hash(password, 10);
            }
        }
        await user.save();

        const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
        const token = jwt.sign({ id: user._id.toString(), role: user.role, organization_id: user.organization_id }, JWT_SECRET, { expiresIn: '30d' });

        res.json({ token, user });
    } catch (error) {
        console.error('chatFinalizeOnboarding Error:', error);
        res.status(500).json({ message: error.message });
    }
};
`;
  authController += newEndpoints;
  fs.writeFileSync('server/src/controllers/auth.controller.js', authController);
}
console.log('Real backend connected');
