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

import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { ROLE_TO_DASHBOARD, DASHBOARDS } from "@/lib/dashboardRoleMap";

/**
 * NewRoleWelcomePage
 * Shown to an existing user AFTER a new additional role is approved and added.
 * This is NOT the full onboarding — just a quick 1-page "here's your new access" screen.
 * 
 * URL: /welcome-new-role?role=admission_clerk
 */
export default function NewRoleWelcomePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const newRole = params.get("role") ?? currentUser?.additional_roles?.at(-1) ?? "";
  const dashKey = ROLE_TO_DASHBOARD[newRole];
  const dashInfo = dashKey ? DASHBOARDS[dashKey] : null;

  const roleLabel = newRole
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Refresh user data when page loads (so additional_roles is fresh)
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["current-user"] });
  }, [qc]);

  const handleGoToDashboard = () => {
    if (dashInfo) {
      navigate(dashInfo.path);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full flex flex-col items-center gap-8 text-center">

        {/* Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-5xl">{dashInfo?.icon ?? "🎉"}</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center border-2 border-background">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2 text-primary text-sm font-semibold tracking-wide uppercase">
            <Sparkles className="h-4 w-4" />
            New Access Granted
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            You're now a{" "}
            <span className="text-primary">{roleLabel}</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Your request has been approved. You now have access to the{" "}
            <strong className="text-foreground">{dashInfo?.label ?? "new dashboard"}</strong>.
            {currentUser?.name ? `, ${currentUser.name.split(" ")[0]}` : ""}
          </p>
        </div>

        {/* What you can do card */}
        <div className="w-full bg-muted/50 border border-border rounded-xl p-5 text-left flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">What this means for you:</p>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Your role <strong className="text-foreground">{roleLabel}</strong> has been added to your account
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              A <strong className="text-foreground">Dashboard Switcher</strong> will appear in your header so you can switch between your dashboards
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Your chat, profile, and notifications stay the same across all dashboards
            </li>
          </ul>
        </div>

        {/* CTA */}
        <Button
          onClick={handleGoToDashboard}
          size="lg"
          className="w-full gap-2 text-base h-12"
        >
          Go to {dashInfo?.label ?? "Dashboard"}
          <ArrowRight className="h-5 w-5" />
        </Button>

        <p className="text-xs text-muted-foreground">
          You can always switch dashboards from the header dropdown.
        </p>
      </div>
    </div>
  );
}
