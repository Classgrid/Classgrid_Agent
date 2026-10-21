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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { StudentAnalytics } from "../../queries/useStudentDashboard";
import { Lightbulb, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/marketing_ui/badge";

export function InsightsWidget({ data }: { data?: StudentAnalytics }) {
  if (!data) return null;

  const hasStrong = data.insights.strongAreas && data.insights.strongAreas.length > 0;
  const hasWeak = data.insights.weakAreas && data.insights.weakAreas.length > 0;

  if (!hasStrong && !hasWeak) return null;

  return (
    <Card className="bg-gradient-to-r from-card to-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <Lightbulb className="w-4 h-4" />
          Focus Areas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          {hasStrong && (
            <div className="flex-1 space-y-3">
              <h4 className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase">
                <TrendingUp className="w-3.5 h-3.5" />
                Strong Areas
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.insights.strongAreas.map((area, i) => (
                  <Badge key={i} variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20">
                    {area.area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {hasWeak && (
            <div className="flex-1 space-y-3">
              <h4 className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1.5 uppercase">
                <TrendingDown className="w-3.5 h-3.5" />
                Needs Attention
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.insights.weakAreas.map((area, i) => (
                  <Badge key={i} variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border-orange-500/20">
                    {area.area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
