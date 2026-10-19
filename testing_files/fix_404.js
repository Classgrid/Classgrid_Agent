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
const fs = require('fs');
const file = 'client/src/features/auth/pages/OnboardingWizardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<div className="max-w-md w-full bg-card rounded-2xl shadow-xl border border-border p-8 text-center">[\s\S]*?<\/div>\s*<\/div>\s*\);\s*\}/,
  `<div className="max-w-md w-full text-center relative z-10">
          <h1 className="text-9xl font-extrabold text-muted-foreground/20 tracking-widest relative">
            404
            <div className="bg-background/80 px-2 text-sm rounded absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 font-bold text-foreground">
              Page Not Found
            </div>
          </h1>
          <p className="text-muted-foreground mt-8 mb-6">The page you are looking for doesn't exist or has been moved.</p>
          <Button variant="outline" className="h-10 px-8" onClick={() => window.location.href = 'https://classgrid.in'}>Return to Homepage</Button>
        </div>
      </div>
    );
  }`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully replaced invalid link screen with 404');
