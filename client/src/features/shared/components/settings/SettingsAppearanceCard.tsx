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

import React from "react";
import { Moon, Eye } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/marketing_ui/switch";
import { useUserProfile, useUpdateProfile } from "../../queries/useUserProfile";
import { toast } from "sonner";

export function SettingsAppearanceCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const { data: userProfile } = useUserProfile();
  const updateProfile = useUpdateProfile();

  // If metadata.show_role_in_sidebar is explicitly false, it is hidden. Otherwise true.
  const showRole = (userProfile as any)?.metadata?.show_role_in_sidebar !== false;

  const handleToggleRole = (checked: boolean) => {
    updateProfile.mutate(
      { metadata: { ...(userProfile as any)?.metadata, show_role_in_sidebar: checked } } as any,
      {
        onSuccess: () => {
          toast.success("Sidebar appearance updated.");
        }
      }
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm mb-6">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <Moon size={18} className="text-foreground" /> Appearance
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Customize how Classgrid looks on your device.</p>
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-foreground">Dark Mode</span>
            <span className="text-xs text-muted-foreground">Enable dark theme for the dashboard</span>
          </div>
          <Switch 
            checked={resolvedTheme === "dark"} 
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
          />
        </div>
        
        <div className="flex items-center justify-between p-5">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-foreground">Show Role in Sidebar</span>
            <span className="text-xs text-muted-foreground">Display your active role (e.g. Admin) in the sidebar</span>
          </div>
          <Switch 
            checked={showRole} 
            onCheckedChange={handleToggleRole}
            disabled={updateProfile.isPending}
          />
        </div>
      </div>
    </div>
  );
}
