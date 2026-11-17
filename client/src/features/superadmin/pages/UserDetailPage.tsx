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

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
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

// One person's page (rebuilt 2026-11-17 for Classgrid AI): who they are, their plan and how they got it, how they
// sign in, what they've made, what they've paid, and the account actions. Everything comes from one request
// (GET /api/super-admin/users/:id/overview) and refreshes live when an admin changes the account or someone buys.
import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/marketing_ui/empty";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";

import { usePerson, usePersonLive } from "../components/global-users/api";
import { httpStatus } from "../components/global-users/format";
import { PersonHeader } from "../components/global-users/PersonHeader";
import { PlanCard } from "../components/global-users/PlanCard";
import { AccountCard } from "../components/global-users/AccountCard";
import { ActivityCard } from "../components/global-users/ActivityCard";
import { PaymentsCard } from "../components/global-users/PaymentsCard";
import { ActionsCard } from "../components/global-users/ActionsCard";

const LIST_PATH = "/superadmin/global-users";

export function UserDetailPage() {
  const { userId = "" } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError, error, refetch } = usePerson(userId);
  usePersonLive(userId);

  // The parent page in the breadcrumbs is the list, named as in the sidebar
  const { setBreadcrumbs } = useBreadcrumbStore();
  const name = data?.person.name || data?.person.email;
  useEffect(() => {
    setBreadcrumbs([
      { label: "Global Users", href: LIST_PATH },
      { label: name || "User" },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, name]);

  // Back returns to the list as it was (filters, page) when the list opened this page; a link opened straight
  // here has nothing to go back to, so it goes to the list
  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate(LIST_PATH));

  const backButton = (
    <div>
      <Button variant="ghost" size="sm" onClick={goBack} className="-ml-2 gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to users
      </Button>
    </div>
  );

  let body: ReactNode;
  if (isLoading) {
    body = (
      <>
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      </>
    );
  } else if (isError || !data) {
    // (a wrong id in the address is the same as an account that isn't there)
    const missing = [400, 404].includes(httpStatus(error) ?? 0);
    body = missing ? (
      <Empty className="border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyTitle className="text-foreground">This user doesn&apos;t exist</EmptyTitle>
          <EmptyDescription>They may have been removed.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button size="sm" onClick={() => navigate(LIST_PATH)}>Back to users</Button></EmptyContent>
      </Empty>
    ) : (
      <Empty className="border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyTitle className="text-foreground">Couldn&apos;t load this user</EmptyTitle>
          <EmptyDescription>Check your connection and try again.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button size="sm" onClick={() => refetch()}>Try again</Button></EmptyContent>
      </Empty>
    );
  } else {
    body = (
      <>
        <PersonHeader overview={data} />
        {/* (Account is the tallest card, so on wide screens it spans the height of Plan and Activity beside it) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start min-w-0">
          <PlanCard userId={data.person._id} plan={data.plan} />
          <AccountCard account={data.account} person={data.person} className="lg:row-span-2" />
          <ActivityCard activity={data.activity} />
          <PaymentsCard userId={data.person._id} payments={data.payments} />
          <ActionsCard key={data.person._id} overview={data} />
        </div>
      </>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 min-w-0">
      {backButton}
      {body}
    </div>
  );
}
