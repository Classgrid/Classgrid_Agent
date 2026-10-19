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

// Replace mock `signIn` and use real API client
if (!content.includes('import { apiClient }')) {
  content = content.replace(
    'import { useState, useRef, useEffect, useMemo } from "react";',
    'import { useState, useRef, useEffect, useMemo } from "react";\nimport { apiClient } from "@/lib/apiClient";'
  );
}

// 1. handleSendOTP
content = content.replace(
  'await new Promise(r => setTimeout(r, 800)); // Sandbox mock delay',
  'await apiClient.post("/api/auth/chat/send-otp", { email: email.toLowerCase() });'
);

// 2. handleVerifyOTP
content = content.replace(
  'const res = await signIn("credentials", {',
  'const res = await apiClient.post("/api/auth/chat/verify-otp", {'
);
content = content.replace(
  'email,\n        otp,\n        name: mode === "signup" ? `${firstName} ${lastName}`.trim() : undefined,\n      });',
  'email: email.toLowerCase(),\n        otp\n      });'
);
content = content.replace(
  '      if (!res) {\n        setError("Something went wrong. Please try again.");\n        setLoading(false);\n        return;\n      }\n\n      if (res.error) {\n        const errorMap: Record<string, string> = {\n          "OTP has expired": "Your code has expired. Please resend.",\n          "Invalid OTP": "Incorrect code. Please try again.",\n          "Too many attempts. Please request a new OTP.": "Too many wrong attempts. Please resend.",\n          "Invalid or expired OTP": "Code not found. Please resend.",\n        };\n        setError(Object.prototype.hasOwnProperty.call(errorMap, res.error) ? errorMap[res.error] : (typeof res.error === "string" ? res.error : "Sign-in error"));\n        setLoading(false);\n        return;\n      }',
  ''
);

// 3. handleSetupPassword - no change (just removes timeout), let's keep it moving to next step
content = content.replace(
  'await new Promise(r => setTimeout(r, 800));\n      setStep("whatsapp");',
  'setStep("whatsapp");'
);

// 4. handleSetupAge
content = content.replace(
  'await new Promise(r => setTimeout(r, 800));\n      setStep("role");',
  'setStep("role");'
);

// 5. handleSendWhatsappOtp
content = content.replace(
  'await new Promise(r => setTimeout(r, 800));\n      setStep("whatsapp_otp");\n      startWhatsappCountdown();',
  'setStep("whatsapp_otp");\n      startWhatsappCountdown();'
);

// 6. handleVerifyWhatsappOtp (FINAL ONBOARDING CALL)
content = content.replace(
  'await new Promise(r => setTimeout(r, 800));\n      setStep("success");\n      setTimeout(() => {\n        window.location.href = ssoReturnTo || explicitNext || "/dashboard";\n      }, 1500);',
  `const response = await apiClient.post("/api/auth/chat/onboard", {
        email: email.toLowerCase(),
        name: mode === "signup" ? \`\${firstName} \${lastName}\`.trim() : undefined,
        password,
        age,
        role,
        whatsappPhone: \`+\${whatsappCountryCode}\${whatsappPhone}\`
      });
      localStorage.setItem("token", response.data.token);
      setStep("success");
      setTimeout(() => {
        window.location.href = ssoReturnTo || explicitNext || "/agent";
      }, 1500);`
);

fs.writeFileSync(file, content);
console.log('Sandbox Patched');
