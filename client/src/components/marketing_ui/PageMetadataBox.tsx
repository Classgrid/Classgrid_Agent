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

"use client";

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
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
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
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



import { Calendar, Clock, Info, ShieldCheck, Target } from "lucide-react";
import { Card, CardContent } from "@/components/marketing_ui/card";
import { Badge } from "@/components/marketing_ui/badge";
import { cn } from "@/lib/utils";

type PageMetadataBoxProps = {
  updatedAt?: string;
  category?: string;
  availableFor?: string[];
  className?: string;
};

export function PageMetadataBox({
  updatedAt,
  category,
  availableFor = [],
  className,
}: PageMetadataBoxProps) {
  return (
    <Card className={cn("mb-12 border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden", className)}>
      <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase tracking-wider font-bold">
              <Info className="mr-1.5 h-3 w-3" />
              Page Metadata
            </Badge>
          </div>
          
          <div className="space-y-2.5">
            {category && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Target className="h-4 w-4 text-emerald-500/70" />
                <span className="font-medium text-foreground/80">Category:</span>
                <span className="text-foreground capitalize">{category}</span>
              </div>
            )}
          </div>
        </div>

        {availableFor && availableFor.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase tracking-wider font-bold">
                <ShieldCheck className="mr-1.5 h-3 w-3" />
                Availability
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {availableFor.map((item) => (
                <span 
                  key={item} 
                  className="rounded-md border border-border bg-background/50 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
