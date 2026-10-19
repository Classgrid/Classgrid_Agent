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
import React from "react";
import { CopySnippetCard } from "@/components/marketing_ui/copy-snippet-card";
import { useUserProfile } from "../../queries/useUserProfile";

export function SettingsIdentityCard() {
  const { data: userProfile } = useUserProfile();

  if (!userProfile) return null;

  return (
    <>
      <CopySnippetCard
        title="User ID"
        description="Your unique user identifier."
        value={(userProfile as any)._id || userProfile.id || "N/A"}
      />
      
      <CopySnippetCard
        title="Organization ID"
        description="Use this ID to identify your organization when contacting support."
        value={
          (userProfile.organization_id as any)?._id || 
          userProfile.organization_id?.id || 
          (typeof userProfile.organization_id === 'string' ? userProfile.organization_id : "N/A")
        }
      />
    </>
  );
}
