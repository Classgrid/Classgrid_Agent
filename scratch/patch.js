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
if (!authRoutes.includes('/chat/onboard')) {
  authRoutes = authRoutes.replace(
    'router.post("/logout", authController.logout);',
    'router.post("/logout", authController.logout);\n\n// Chat Onboarding Sandbox Endpoints\nrouter.post("/chat/send-otp", authController.chatSendOtp);\nrouter.post("/chat/verify-otp", authController.chatVerifyOtp);\nrouter.post("/chat/onboard", authController.chatOnboard);'
  );
  fs.writeFileSync('server/src/routes/auth.routes.js', authRoutes);
}

let authController = fs.readFileSync('server/src/controllers/auth.controller.js', 'utf8');
if (!authController.includes('export const chatOnboard')) {
  const newEndpoints = `
// --- Chat Sandbox Endpoints ---
const chatOtps = new Map();

export const chatSendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = '123456';
        chatOtps.set(email.toLowerCase(), otp);
        res.json({ message: 'OTP sent' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const chatVerifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (chatOtps.get(email.toLowerCase()) === otp || otp === '123456') {
            res.json({ message: 'OTP verified' });
        } else {
            res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const chatOnboard = async (req, res) => {
    try {
        const connectDB = (await import('../../config/db.js')).default;
        await connectDB();
        const { email, name, password, age, role, whatsappPhone } = req.body;
        const User = (await import('../models/User.js')).default;
        const bcrypt = (await import('bcryptjs')).default;
        const jwt = (await import('jsonwebtoken')).default;
        
        let user = await User.findOne({ email: email.toLowerCase() });
        const orgId = '6ac4b95e0f8a97f45e98b0ff';

        if (!user) {
            user = new User({
                email: email.toLowerCase(),
                name: name || 'Chat User',
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
        res.status(500).json({ message: error.message });
    }
};
`;
  authController += newEndpoints;
  fs.writeFileSync('server/src/controllers/auth.controller.js', authController);
}
console.log('Done');
