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

import { useMemo, useEffect } from "react";
import { Activity, AlertCircle, CreditCard, Database, Rocket, Settings2, ShieldCheck } from "lucide-react";
import { useParams, useLocation } from "react-router-dom";
import { getSocket } from "@/lib/socketClient";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/marketing_ui/alert";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/marketing_ui/tabs";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";

import { OrgAccessTab } from "../components/org-details/OrgAccessTab";
import { OrgBillingTab } from "../components/org-details/OrgBillingTab";
import { OrgConfigurationTab } from "../components/org-details/OrgConfigurationTab";
import { OrgDetailsHeader } from "../components/org-details/OrgDetailsHeader";
import { OrgOverviewTab } from "../components/org-details/OrgOverviewTab";
import { OrgResourcesTab } from "../components/org-details/OrgResourcesTab";
import { OrgOnboardingTab } from "../components/org-details/OrgOnboardingTab";
import { useOrganizationControlCenter } from "../queries/useOrganizationControlCenter";

const tabTriggerClassName =
  "min-w-max px-3 py-2.5 data-active:bg-background data-active:shadow-sm";

function OrgDetailsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading organization details">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={`metric-skeleton-${index + 1}`} className="h-40 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function OrgDetailsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const controlCenter = useOrganizationControlCenter(orgId);
  const organizationName =
    controlCenter.profile?.name ?? controlCenter.detail?.name ?? "Organization details";
  const breadcrumbItems = useMemo(
    () => {
      const isDomains = window.location.pathname.includes("/domains");
      return [
        { label: isDomains ? "Custom domains" : "Organizations", href: isDomains ? "/superadmin/domains" : "/superadmin/orgs" },
        { label: organizationName },
      ];
    },
    [organizationName],
  );

  if (!orgId) {
    return (
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive" className="px-4 py-3">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Organization ID is missing</AlertTitle>
          <AlertDescription>Please navigate here from the Organizations or Domains list. Direct links without the internal ID are not supported yet.</AlertDescription>
        </Alert>
      </main>
    );
  }

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    const handleUpdate = (data: { orgId: string }) => {
      if (data?.orgId === orgId) {
        void controlCenter.refetchAll();
      }
    };
    
    socket.on("superadmin:org_updated", handleUpdate);
    return () => {
      socket.off("superadmin:org_updated", handleUpdate);
    };
  }, [orgId, controlCenter]);

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 p-4 pb-12 sm:p-6 lg:p-8">
      <PageBreadcrumbs items={breadcrumbItems} />

      {controlCenter.isInitialLoading ? (
        <OrgDetailsLoading />
      ) : !controlCenter.hasData ? (
        <Alert variant="destructive" className="px-4 py-3">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Organization could not be loaded</AlertTitle>
          <AlertDescription>
            The live organization endpoints returned no usable profile or detail data.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <OrgDetailsHeader
            profile={controlCenter.profile}
            detail={controlCenter.detail}
          />

          {controlCenter.errorSources.length > 0 ? (
            <Alert className="border-amber-500/30 bg-amber-500/5 px-4 py-3 text-amber-800 dark:text-amber-200">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Some live data sources are unavailable</AlertTitle>
              <AlertDescription>
                Loaded available sections. Failed sources: {controlCenter.errorSources.join(", ")}.
              </AlertDescription>
            </Alert>
          ) : null}

          <Tabs defaultValue="overview" className="gap-5">
            <div className="overflow-x-auto pb-1">
              <TabsList className="h-auto min-w-max gap-1 border border-border/60 bg-muted/50 p-1.5">
                <TabsTrigger value="overview" className={tabTriggerClassName}>
                  <Database aria-hidden="true" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="onboarding" className={tabTriggerClassName}>
                  <Rocket aria-hidden="true" />
                  Onboarding
                </TabsTrigger>
                <TabsTrigger value="configuration" className={tabTriggerClassName}>
                  <Settings2 aria-hidden="true" />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="access" className={tabTriggerClassName}>
                  <ShieldCheck aria-hidden="true" />
                  Access & domains
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <OrgOverviewTab
                profile={controlCenter.profile}
                detail={controlCenter.detail}
                insight={controlCenter.insight}
                emailAnalytics={controlCenter.emailAnalytics}
              />
            </TabsContent>

            <TabsContent value="onboarding">
              <OrgOnboardingTab profile={controlCenter.profile} />
            </TabsContent>


            <TabsContent value="configuration">
              <OrgConfigurationTab profile={controlCenter.profile} />
            </TabsContent>

            <TabsContent value="access">
              <OrgAccessTab profile={controlCenter.profile} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </main>
  );
}
