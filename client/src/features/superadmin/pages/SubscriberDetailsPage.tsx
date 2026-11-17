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

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Badge } from "@/components/marketing_ui/badge";
import { Switch } from "@/components/marketing_ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";

import { useSubscribers, useUpdateSubscriberPreferences } from "../queries/useSubscribers";
import { formatDate } from "@/utils/dateUtils";

function formatSubscriberDate(value?: string | null) {
  return value ? formatDate(value, "dd MMM, yyyy hh:mm a") : "—";
}

export function SubscriberDetailsPage() {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useSubscribers({ q: email }, true);
  const updatePreferences = useUpdateSubscriberPreferences();
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);

  const subscriber = data?.data?.find((s) => s.email === email);

  const handlePreferenceChange = (key: 'receives_blog' | 'receives_changelog' | 'receives_legal', checked: boolean) => {
    if (!subscriber) return;

    updatePreferences.mutate(
      { email: subscriber.email, preferences: { [key]: checked } },
      {
        onSuccess: () => {
          let type = "Preferences";
          if (key === 'receives_blog') type = "Blog";
          if (key === 'receives_changelog') type = "Changelog";
          if (key === 'receives_legal') type = "Legal";
          
          const action = checked ? "updated" : "paused";
          toast.success(`${type} ${action}.`);
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to update preferences.");
        }
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
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
          <Skeleton className="h-6 w-16 ml-auto rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!subscriber) {
    return <div className="p-8">Subscriber not found.</div>;
  }

  const receivesBlog = subscriber.receives_blog !== false;
  const receivesChangelog = subscriber.receives_changelog !== false;
  const receivesLegal = subscriber.receives_legal !== false;

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">
            {subscriber.name ? subscriber.name : subscriber.email}
          </h1>
          <p className="text-sm text-muted-foreground">
            {subscriber.name ? subscriber.email : "Subscriber details and preferences"}
          </p>
        </div>
        <div className="ml-auto">
          {subscriber.is_active ? (
            <Badge variant="success" dot className="w-fit text-sm py-1">Active</Badge>
          ) : (
            <Badge variant="warning" className="w-fit text-sm py-1">Paused</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Subscriber Information</CardTitle>
            <CardDescription>Timestamps and general information</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Subscribed Date</span>
              <span className="text-sm font-medium">{formatSubscriberDate(subscriber.created_at)}</span>
            </div>
            {!subscriber.is_active && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Paused Date</span>
                <span className="text-sm font-medium">{formatSubscriberDate(subscriber.updated_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Email Preferences</CardTitle>
            <CardDescription>Manage exactly what emails they receive</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1 pr-4">
                <span className="text-sm font-medium">Blog Posts</span>
                <span className="text-xs text-muted-foreground">Receive updates when new articles are published.</span>
              </div>
              <Switch 
                checked={receivesBlog} 
                onCheckedChange={(checked) => handlePreferenceChange('receives_blog', checked)} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1 pr-4">
                <span className="text-sm font-medium">Product Changelogs</span>
                <span className="text-xs text-muted-foreground">Receive updates about new platform features.</span>
              </div>
              <Switch 
                checked={receivesChangelog} 
                onCheckedChange={(checked) => handlePreferenceChange('receives_changelog', checked)} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1 pr-4">
                <span className="text-sm font-medium">Legal Notices</span>
                <span className="text-xs text-muted-foreground">Receive required terms and policy updates.</span>
              </div>
              <Switch 
                checked={receivesLegal} 
                onCheckedChange={(checked) => handlePreferenceChange('receives_legal', checked)} 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
