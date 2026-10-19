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
/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

const fs = require('fs');
const file = 'client/src/features/auth/pages/OnboardingWizardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import toast from sonner
if (!content.includes('import { toast } from "sonner";')) {
  content = content.replace(
    /import \{ useTheme \} from "next-themes";/,
    'import { useTheme } from "next-themes";\nimport { toast } from "sonner";'
  );
}

// 2. Add isInitializing and Timer states
content = content.replace(
  /const \[isVerifyingOrgEmail, setIsVerifyingOrgEmail\] = useState\(false\);/,
  `const [isVerifyingOrgEmail, setIsVerifyingOrgEmail] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // OTP Timers
  const [emailOtpTimer, setEmailOtpTimer] = useState(0);
  const [phoneOtpTimer, setPhoneOtpTimer] = useState(0);
  const [orgEmailOtpTimer, setOrgEmailOtpTimer] = useState(0);

  // Timer Effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (emailOtpTimer > 0 || phoneOtpTimer > 0 || orgEmailOtpTimer > 0) {
      interval = setInterval(() => {
        setEmailOtpTimer(prev => (prev > 0 ? prev - 1 : 0));
        setPhoneOtpTimer(prev => (prev > 0 ? prev - 1 : 0));
        setOrgEmailOtpTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [emailOtpTimer, phoneOtpTimer, orgEmailOtpTimer]);`
);

// 3. Fix the token validation to clear isInitializing
content = content.replace(
  /React\.useEffect\(\(\) => \{\n\s*if \(token\) \{\n\s*validateActivationToken\(token\)\n\s*\.then\(\(res\) => \{/,
  `React.useEffect(() => {
    if (token) {
      validateActivationToken(token)
        .then((res) => {`
);
content = content.replace(
  /\}\)\n\s*\.catch\(\(err\) => \{\n\s*console\.error\("Token validation failed:", err\);\n\s*\}\);\n\s*\}\n\s*\}, \[token\]\);/,
  `})
        .catch((err) => {
          console.error("Token validation failed:", err);
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, [token]);`
);

// 4. Update Send OTP handlers to use toast and timers
// Org Email
content = content.replace(
  /const handleSendOrgEmailOtp = async \(\) => \{[\s\S]*?alert\("OTP sent to organization email!"\);[\s\S]*?\} catch \(e: any\) \{[\s\S]*?alert\(e\.message \|\| "Failed to send OTP"\);[\s\S]*?\}\s*\};/,
  `const handleSendOrgEmailOtp = async () => {
    if (!orgEmail || !orgEmail.includes("@")) {
      toast.error("Please enter a valid organization email.");
      return;
    }
    try {
      await sendOnboardingOtp({ target: orgEmail, type: "email" });
      setOrgEmailOtpSent(true);
      setOrgEmailOtpTimer(30);
      toast.success("OTP sent to organization email!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    }
  };`
);

// User Email
content = content.replace(
  /const handleSendEmailOtp = async \(\) => \{[\s\S]*?alert\("OTP sent to your email!"\);[\s\S]*?\} catch \(e: any\) \{[\s\S]*?alert\(e\.message \|\| "Failed to send OTP"\);[\s\S]*?\}\s*\};/,
  `const handleSendEmailOtp = async () => {
    if (!fetchedEmail) return;
    try {
      await sendOnboardingOtp({ target: fetchedEmail, type: "email" });
      setEmailOtpSent(true);
      setEmailOtpTimer(30);
      toast.success("OTP sent to your email!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    }
  };`
);

// User Phone
content = content.replace(
  /const handleSendPhoneOtp = async \(\) => \{[\s\S]*?alert\("OTP sent to your phone!"\);[\s\S]*?\} catch \(e: any\) \{[\s\S]*?alert\(e\.message \|\| "Failed to send OTP"\);[\s\S]*?\}\s*\};/,
  `const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    try {
      await sendOnboardingOtp({ target: phone, type: "phone" });
      setPhoneOtpSent(true);
      setPhoneOtpTimer(30);
      toast.success("OTP sent to your phone!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    }
  };`
);

// Also replace the OTP verification alerts with toast errors
content = content.replace(/showAlert\(e\.message \|\| "Invalid OTP"\);/g, `toast.error(e.message || "Invalid OTP");`);
content = content.replace(/showAlert\("Please enter your name to continue."\);/g, `toast.error("Please enter your name to continue.");`);
content = content.replace(/showAlert\("Please enter a valid, matching, strong password to continue."\);/g, `toast.error("Please enter a valid, matching, strong password to continue.");`);
content = content.replace(/showAlert\("Please verify both your email and phone number to continue."\);/g, `toast.error("Please verify both your email and phone number to continue.");`);
content = content.replace(/showAlert\("Please choose a valid and available @username."\);/g, `toast.error("Please choose a valid and available @username.");`);
content = content.replace(/showAlert\("Please verify the organization contact email."\);/g, `toast.error("Please verify the organization contact email.");`);
content = content.replace(/showAlert\("Failed to save password or complete setup. Your link may have expired."\);/g, `toast.error("Failed to save password or complete setup. Your link may have expired.");`);


// 5. Replace Welcome screen animation
// Since my previous script failed due to quotes, I will just write a very simple staggered animation
content = content.replace(
  /<motion\.div\n\s*initial={{ opacity: 0, scale: 0\.95 }}[\s\S]*?Welcome to Classgrid[\s\S]*?Hey, {adminName\.split\(' '\)\[0\] \|\| 'Admin'}[\s\S]*?<\/Button>\n\s*<\/motion\.div>\n\s*<\/motion\.div>/,
  `<motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="flex flex-col items-center relative z-10 text-center px-6 max-w-2xl"
                      >
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-white/60 text-sm font-semibold tracking-widest uppercase mb-4"
                        >
                          Welcome to Classgrid
                        </motion.p>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight flex flex-wrap justify-center gap-x-3">
                          {!isInitializing && (adminName ? \`Hey, \${adminName.split(' ')[0]}\` : "Welcome").split(' ').map((word, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 + i * 0.15, duration: 0.6, ease: "easeOut" }}
                              className="inline-block"
                            >
                              {word}
                            </motion.span>
                          ))}
                        </h1>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8 }}
                          className="text-white/70 text-lg leading-relaxed mb-10"
                        >
                          Let's set up your digital campus. Just a few quick basics before you jump in.
                        </motion.p>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.0, type: "spring", stiffness: 100 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            size="lg"
                            onClick={() => { setCurrentStep(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="h-14 px-10 text-base font-semibold rounded-full bg-white text-black hover:bg-white/90 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all duration-300 cursor-pointer"
                          >
                            Get Started <ChevronRight className="ml-2 size-5" />
                          </Button>
                        </motion.div>
                      </motion.div>`
);

// 6. Update the Send OTP buttons to show Resend in X seconds
content = content.replace(
  /<Button \n\s*variant="outline" \n\s*className="h-10 px-4 text-sm font-semibold cursor-pointer"\n\s*onClick=\{handleSendEmailOtp\}\n\s*disabled=\{isVerifyingEmail\}\n\s*>\n\s*\{emailOtpSent \? "Resend OTP" : "Send OTP"\}\n\s*<\/Button>/g,
  `<Button 
                                  variant="outline" 
                                  className="h-10 px-4 text-sm font-semibold cursor-pointer"
                                  onClick={handleSendEmailOtp}
                                  disabled={isVerifyingEmail || emailOtpTimer > 0}
                                >
                                  {emailOtpTimer > 0 ? \`Resend in \${emailOtpTimer}s\` : emailOtpSent ? "Resend OTP" : "Send OTP"}
                                </Button>`
);

content = content.replace(
  /<Button \n\s*className="h-10 px-4 text-sm font-semibold cursor-pointer"\n\s*onClick=\{handleSendPhoneOtp\}\n\s*disabled=\{isVerifyingPhone\}\n\s*>\n\s*\{phoneOtpSent \? "Resend OTP" : "Send OTP"\}\n\s*<\/Button>/g,
  `<Button 
                                  className="h-10 px-4 text-sm font-semibold cursor-pointer"
                                  onClick={handleSendPhoneOtp}
                                  disabled={isVerifyingPhone || phoneOtpTimer > 0}
                                >
                                  {phoneOtpTimer > 0 ? \`Resend in \${phoneOtpTimer}s\` : phoneOtpSent ? "Resend OTP" : "Send OTP"}
                                </Button>`
);

content = content.replace(
  /<Button \n\s*variant="outline" \n\s*className="h-12 px-6 text-sm font-semibold cursor-pointer"\n\s*onClick=\{handleSendOrgEmailOtp\}\n\s*disabled=\{isVerifyingOrgEmail\}\n\s*>\n\s*\{orgEmailOtpSent \? "Resend OTP" : "Send OTP"\}\n\s*<\/Button>/g,
  `<Button 
                                  variant="outline" 
                                  className="h-12 px-6 text-sm font-semibold cursor-pointer"
                                  onClick={handleSendOrgEmailOtp}
                                  disabled={isVerifyingOrgEmail || orgEmailOtpTimer > 0}
                                >
                                  {orgEmailOtpTimer > 0 ? \`Resend in \${orgEmailOtpTimer}s\` : orgEmailOtpSent ? "Resend OTP" : "Send OTP"}
                                </Button>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed OTP logic and animations!');
