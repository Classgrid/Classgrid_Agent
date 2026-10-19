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

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace raw buttons with Button component
  content = content.replace(/<button/g, '<Button');
  content = content.replace(/<\/button>/g, '</Button>');

  // Clean up styles
  content = content.replace(/style=\{\{[^}]+\}\}/g, '');

  // Fix known classNames to Shadcn variants
  content = content.replace(/className=\"inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2--ghost\"/g, 'variant=\"ghost\" size=\"icon\"');
  content = content.replace(/className=\"inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground\"/g, 'variant=\"outline\"');
  content = content.replace(/className=\"inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 bg-primary text-primary-foreground shadow\"/g, 'variant=\"default\"');
  content = content.replace(/className=\"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2\"/g, 'variant=\"outline\"');
  content = content.replace(/className=\"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary\/90 h-9 px-4 py-2\"/g, 'variant=\"default\"');
  
  // Clean up inputs
  content = content.replace(/<input /g, '<Input ');
  
  // Add Input import if needed
  if (content.includes('<Input ') && !content.includes('import { Input }')) {
    if (content.includes('import { Button } from "@/components/marketing_ui/button";')) {
      content = content.replace('import { Button } from "@/components/marketing_ui/button";', 'import { Button } from "@/components/marketing_ui/button";\nimport { Input } from "@/components/marketing_ui/input";');
    } else {
      content = 'import { Input } from "@/components/marketing_ui/input";\n' + content;
    }
  }

  // Add Select import if needed
  if (content.includes('import { Select, ') || content.includes('import { Select }')) {
    // Already has select
  } else if (content.includes('<Select') && !content.includes('import { Select }')) {
    content = 'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";\n' + content;
  }

  fs.writeFileSync(filePath, content);
}

const files = [
  'src/features/superadmin/pages/LeadsPage.tsx',
  'src/features/superadmin/pages/SupportTicketsPage.tsx',
  'src/features/superadmin/pages/DirectOnboardPage.tsx',
  'src/features/superadmin/pages/BackupPage.tsx',
  'src/features/superadmin/pages/ClassgridTalkPage.tsx',
  'src/features/superadmin/pages/AuditPage.tsx',
  'src/features/superadmin/pages/AlertsPage.tsx',
  'src/features/superadmin/pages/ActivityLogPage.tsx',
  'src/features/superadmin/pages/UsersPage.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    console.log('Fixing', f);
    fixFile(f);
  }
});
