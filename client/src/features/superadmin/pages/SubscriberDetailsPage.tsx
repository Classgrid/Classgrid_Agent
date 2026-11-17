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

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Switch } from "@/components/marketing_ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";

import { useSubscribers, useUpdateSubscriberPreferences } from "../queries/useSubscribers";
import { formatDate } from "@/utils/dateUtils";

// One subscriber on the classgrid.in email list: when they joined and which of the three emails they get.

type PreferenceKey = "receives_blog" | "receives_changelog" | "receives_legal";

const PREFERENCES: { key: PreferenceKey; name: string; title: string; description: string }[] = [
  { key: "receives_blog", name: "Blog", title: "Blog posts", description: "An email when a new article is published." },
  { key: "receives_changelog", name: "Changelog", title: "Changelog", description: "An email about new Classgrid features and fixes." },
  { key: "receives_legal", name: "Legal", title: "Legal notices", description: "Changes to the terms and policies." },
];

function formatSubscriberDate(value?: string | null) {
  return value ? formatDate(value, "dd MMM, yyyy hh:mm a") : "—";
}

export function SubscriberDetailsPage() {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useSubscribers({ q: email }, !!email);
  const updatePreferences = useUpdateSubscriberPreferences();
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);

  const subscriber = data?.data?.find((s) => s.email.toLowerCase() === (email || "").toLowerCase());

  const handlePreferenceChange = (pref: (typeof PREFERENCES)[number], checked: boolean) => {
    if (!subscriber) return;

    updatePreferences.mutate(
      { email: subscriber.email, preferences: { [pref.key]: checked } },
      {
        onSuccess: () => toast.success(`${pref.name} emails turned ${checked ? "on" : "off"}.`),
        onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Could not change the emails."),
      }
    );
  };

  useEffect(() => {
    if (subscriber) {
      setBreadcrumbs([
        { label: "Subscribers", href: "/superadmin/subscribers" },
        { label: subscriber.email }
      ]);
    }
    return () => {
      setBreadcrumbs([]);
    };
  }, [subscriber, setBreadcrumbs]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
        <div className="flex items-center gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-8 w-[250px] max-w-full" />
            <Skeleton className="h-4 w-[200px] max-w-full" />
          </div>
          <Skeleton className="h-6 w-16 ml-auto rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="font-medium text-foreground">{(error as any)?.response?.data?.message || "Could not load this subscriber."}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (!subscriber) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="font-medium text-foreground">This subscriber was not found.</p>
        <p className="mt-1 text-sm text-muted-foreground">They may have been removed from the list.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/superadmin/subscribers")}>Back to Subscribers</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-col">
          <h1 className="break-all text-2xl font-bold tracking-tight text-foreground">
            {subscriber.name ? subscriber.name : subscriber.email}
          </h1>
          <p className="break-all text-sm text-muted-foreground">
            {subscriber.name ? subscriber.email : "On the classgrid.in email list"}
          </p>
        </div>
        <div className="ml-auto shrink-0">
          {subscriber.is_active ? (
            <Badge variant="info" dot className="w-fit text-sm py-1">Active</Badge>
          ) : (
            <Badge variant="warning" dot className="w-fit text-sm py-1">Paused</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscriber</CardTitle>
            <CardDescription>When they joined the list</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Subscribed</span>
              <span className="text-sm font-medium text-foreground">{formatSubscriberDate(subscriber.created_at)}</span>
            </div>
            {!subscriber.is_active && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Paused (all emails off)</span>
                <span className="text-sm font-medium text-foreground">{formatSubscriberDate(subscriber.updated_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emails</CardTitle>
            <CardDescription>Which emails they get. With all three off they are paused.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {PREFERENCES.map((pref) => (
              <div key={pref.key} className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">{pref.title}</span>
                  <span className="text-xs text-muted-foreground">{pref.description}</span>
                </div>
                <Switch
                  checked={subscriber[pref.key] !== false}
                  disabled={updatePreferences.isPending}
                  onCheckedChange={(checked) => handlePreferenceChange(pref, checked)}
                  aria-label={`${pref.title} emails`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
