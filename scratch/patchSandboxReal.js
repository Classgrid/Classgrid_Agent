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
const file = 'client/src/features/public-chat/pages/PublicChatSandbox.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'await apiClient.post("/api/auth/chat/send-otp", { email: email.toLowerCase() });',
  'await apiClient.post("/api/auth/chat/send-email-otp", { email: email.toLowerCase() });'
);

content = content.replace(
  'const res = await apiClient.post("/api/auth/chat/verify-otp", {',
  'const res = await apiClient.post("/api/auth/chat/verify-email-otp", {'
);

content = content.replace(
  'setStep("whatsapp_otp");\\n      startWhatsappCountdown();',
  'await apiClient.post("/api/auth/chat/send-whatsapp-otp", { phoneNumber: `+${whatsappCountryCode}${whatsappPhone}` });\n      setStep("whatsapp_otp");\n      startWhatsappCountdown();'
);

content = content.replace(
  'const response = await apiClient.post("/api/auth/chat/onboard", {',
  'const response = await apiClient.post("/api/auth/chat/finalize-onboarding", {\n        whatsappOtp,'
);

fs.writeFileSync(file, content);
console.log('Sandbox Patched with Real Flow');
