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


import { ExternalLink, Mail, MessageSquare } from "lucide-react";


export function SupportPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground mt-1">
            Get help, raise support tickets, and track your conversations with the ClassGrid team.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div title="Support Portal" icon={<MessageSquare size={18} className="text-emerald-600" />}>
            <div className="flex flex-col h-full justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-6">
                  Visit our dedicated support portal to raise new tickets, track the status of existing requests, and communicate directly with our technical team.
                </p>
              </div>
              <a
                href="https://classgrid.in/support/ticket"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 bg-primary text-primary-foreground shadow w-full justify-center"
              >
                Go to Support Portal
                <ExternalLink size={14} className="ml-2 opacity-80" />
              </a>
            </div>
          </div>

          <div title="Contact Us" icon={<Mail size={18} className="text-blue-600" />}>
            <div className="flex flex-col h-full space-y-6">
              <p className="text-muted-foreground text-sm">
                For immediate assistance, billing inquiries, or general questions, you can always reach out to us directly via email or phone.
              </p>
              
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Email Support
                  </div>
                  <div className="flex flex-col space-y-1">
                    <a href="mailto:support@classgrid.in" className="text-sm font-medium text-foreground hover:text-emerald-600 transition-colors">
                      support@classgrid.in
                    </a>
                    <a href="mailto:nikhil.shinde@classgrid.in" className="text-sm font-medium text-foreground hover:text-emerald-600 transition-colors">
                      nikhil.shinde@classgrid.in
                    </a>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Phone Support
                  </div>
                  <div className="flex flex-col space-y-1">
                    <a href="tel:+918623947038" className="text-sm font-medium text-foreground hover:text-emerald-600 transition-colors">
                      +91 8623947038
                    </a>
                    <a href="tel:+918149277038" className="text-sm font-medium text-foreground hover:text-emerald-600 transition-colors">
                      +91 8149277038
                    </a>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Headquarters
                  </div>
                  <a 
                    href="https://www.google.com/maps?q=Akurdi+Railway+Station+Road,+Sector+No.+26,+Pradhikaran,+Nigdi,+Pimpri-Chinchwad,+Maharashtra+411044" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground leading-relaxed hover:text-emerald-600 transition-colors block"
                  >
                    Akurdi Railway Station Road, Sector No. 26,<br />
                    Pradhikaran, Nigdi, Pimpri-Chinchwad,<br />
                    Maharashtra 411044
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
