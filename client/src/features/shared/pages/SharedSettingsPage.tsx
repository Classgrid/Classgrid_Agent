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

import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { SettingsAppearanceCard } from "../components/settings/SettingsAppearanceCard";
import { SettingsPushCard } from "../components/settings/SettingsPushCard";
import { useEmailPreferences, useUpdateEmailPreferences, EmailPrefs } from "../queries/useSettingsQueries";
import { useUserProfile, useUpdateProfile } from "../queries/useUserProfile";
import { CustomDomainCard } from "../../org/components/settings/CustomDomainCard";
import { OrgCodesCard } from "../../org/components/settings/OrgCodesCard";
import { OrgBrandingCard } from "@/components/dashboard/OrgBrandingCard";
import { OrgNameCard } from "@/components/dashboard/OrgNameCard";
import { PlatformNameCard } from "../components/settings/PlatformNameCard";
import { PlatformBrandingCard } from "../components/settings/PlatformBrandingCard";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { DeleteOrgCard } from "../../org/components/settings/DeleteOrgCard";
import { SettingsChangePasswordCard } from "../components/settings/SettingsChangePasswordCard";
import { SettingsDeleteAccountCard } from "../components/settings/SettingsDeleteAccountCard";
import { SettingsRoleRequestCard } from "../components/settings/SettingsRoleRequestCard";
import { SettingsIdentityCard } from "../components/settings/SettingsIdentityCard";
import { SettingsPrivacyCard } from "../components/settings/SettingsPrivacyCard";
import { SettingsVerifiedDomainCard } from "../components/settings/SettingsVerifiedDomainCard";

export function SharedSettingsPage() {
  const isChatApp = typeof window !== 'undefined' && window.location.hostname.startsWith('chat.');
  const { data: profileData, isLoading: isProfileLoading } = useUserProfile();
  const updateProfile = useUpdateProfile();
  
  const requiresPrefs = profileData?.role !== "org_admin" && profileData?.role !== "super_admin" && !isChatApp;
  
  const { data: prefData, isLoading: isPrefLoading } = useEmailPreferences(requiresPrefs);
  const updatePrefs = useUpdateEmailPreferences();

  const [prefs, setPrefs] = useState<EmailPrefs>({
    global: true,
    announcements: true,
    notes: true,
    quizzes: true,
    joinApproval: true,
    emailOnPost: true,
    digestMode: "instant",
  });

  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    if (prefData) {
      setPrefs((prev) => ({ ...prev, ...prefData }));
    }
  }, [prefData]);

  useEffect(() => {
    if (profileData?.pushNotifications) {
      setPushEnabled(profileData.pushNotifications.global ?? true);
    }
  }, [profileData]);

  const handlePrefChange = (field: keyof EmailPrefs, value: any) => {
    const newPrefs = { ...prefs, [field]: value };
    setPrefs(newPrefs);
    updatePrefs.mutate(newPrefs);
  };

  const handlePushChange = (enabled: boolean) => {
    setPushEnabled(enabled);
    updateProfile.mutate({ pushNotifications: { global: enabled } });
  };

  const isPending = updatePrefs.isPending || updateProfile.isPending;

  // Only block the page render if we are waiting for the initial profile data.
  // Email preferences loading state is handled by the SettingsNotificationsCard itself.
  if (!profileData && isProfileLoading) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pb-12 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
        
        {/* Cards Skeletons */}
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2 border-b border-border pb-4">
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-3 w-64 rounded-md" />
              </div>
              <div className="flex flex-col sm:flex-row gap-6">
                <Skeleton className="h-24 w-full sm:w-1/2 rounded-xl" />
                <Skeleton className="h-24 w-full sm:w-1/2 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <SettingsAppearanceCard />
      <SettingsPrivacyCard />
      <SettingsVerifiedDomainCard />
      {isChatApp && <SettingsIdentityCard />}
      
      {!isProfileLoading && profileData?.role !== "org_admin" && profileData?.role !== "super_admin" && profileData?.role !== "user" && !isChatApp && (
        <SettingsPushCard 
          pushEnabled={pushEnabled} 
          onChange={handlePushChange} 
        />
      )}

      {profileData?.role !== "org_admin" && (
        <>
          {profileData?.role !== "super_admin" && profileData?.role !== "user" && !isChatApp && <SettingsRoleRequestCard />}
          <SettingsChangePasswordCard />
          {profileData?.role !== "super_admin" && <SettingsDeleteAccountCard />}
        </>
      )}

      {profileData?.role === "super_admin" && (
        <>
          <PlatformBrandingCard />
          <PlatformNameCard />
        </>
      )}

      {profileData?.role === "org_admin" && (
        <>
          <OrgBrandingCard />
          <CustomDomainCard />
          <OrgCodesCard />
          <SettingsRoleRequestCard />
          <SettingsChangePasswordCard />
          <DeleteOrgCard />
        </>
      )}
    </div>
  );
}
