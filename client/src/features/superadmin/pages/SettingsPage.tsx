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

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Save, Bell, Palette, Eye, Shield } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

import { toast } from "sonner";

import { Button } from "@/components/marketing_ui/button";
import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { Switch } from "@/components/marketing_ui/switch";

type EmailPrefs = {
  global: boolean;
  announcements: boolean;
  notes: boolean;
  quizzes: boolean;
  joinApproval: boolean;
  emailOnPost: boolean;
  digestMode: "instant" | "daily" | "weekly";
};

type PrivacyPrefs = {
  hideEmail: boolean;
  hideHobbies: boolean;
};

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [prefs, setPrefs] = useState<EmailPrefs>({
    global: true,
    announcements: true,
    notes: true,
    quizzes: true,
    joinApproval: true,
    emailOnPost: true,
    digestMode: "instant",
  });

  const [privacy, setPrivacy] = useState<PrivacyPrefs>({
    hideEmail: false,
    hideHobbies: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-settings"],
    queryFn: () => apiClient.get("/api/user/email-preferences").then((r) => r.data),
  });

  useEffect(() => {
    if (data?.emailNotifications) {
      setPrefs((prev) => ({ ...prev, ...data.emailNotifications }));
    }
    if (data?.privacySettings) {
      setPrivacy((prev) => ({ ...prev, ...data.privacySettings }));
    }
  }, [data]);

  const updatePrefs = useMutation({
    mutationFn: (updates: { emailNotifications?: EmailPrefs, privacySettings?: PrivacyPrefs }) => apiClient.put("/api/user/email-preferences", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["global-profile"] });
      toast.success("Settings saved successfully.");
    },
    onError: () => {
      toast.error("Failed to save settings. Please try again.");
    }
  });

  const handlePrefChange = (field: keyof EmailPrefs, value: any) => {
    const newPrefs = { ...prefs, [field]: value };
    setPrefs(newPrefs);
    updatePrefs.mutate({ emailNotifications: newPrefs, privacySettings: privacy });
  };

  const handlePrivacyChange = (field: keyof PrivacyPrefs, value: any) => {
    const newPrivacy = { ...privacy, [field]: value };
    setPrivacy(newPrivacy);
    updatePrefs.mutate({ emailNotifications: prefs, privacySettings: newPrivacy });
  };

  const isPending = updatePrefs.isPending;

  return (
    <div >
      <SectionPanel
        title="Settings"
        description="Manage your platform preferences, notifications, and appearance."
      />

      {/* Appearance */}
      <div >
        <div >
          <h2 className=" flex items-center gap-2">
            <Palette size={18} /> Appearance
          </h2>
          <p >Customize how Classgrid looks on your device.</p>
        </div>
        
        <div >
          <div >
            <span >Dark Mode</span>
            <span >Enable dark theme for the dashboard</span>
          </div>
          <label >
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </label>
        </div>
      </div>

      {/* Privacy */}
      <div >
        <div >
          <h2 className=" flex items-center gap-2">
            <Eye size={18} /> Privacy
          </h2>
          <p >Manage what others can see on your profile.</p>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading preferences...</div>
        ) : (
          <>
            <div >
              <div >
                <span >Hide Email</span>
                <span >Prevent others from seeing your email address</span>
              </div>
              <label >
                <Switch
                  checked={privacy.hideEmail}
                  onCheckedChange={(checked) => handlePrivacyChange("hideEmail", checked)}
                />
              </label>
            </div>

            <div >
              <div >
                <span >Hide Hobbies</span>
                <span >Prevent others from seeing your hobbies</span>
              </div>
              <label >
                <Switch
                  checked={privacy.hideHobbies}
                  onCheckedChange={(checked) => handlePrivacyChange("hideHobbies", checked)}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Privacy */}
      <div className="border border-border/50 bg-card rounded-xl p-6 space-y-6 shadow-sm mt-6">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Eye size={18} /> Privacy
          </h2>
          <p className="text-sm text-muted-foreground">Manage what others can see on your profile.</p>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading preferences...</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-foreground">Hide Email</span>
                <span className="text-[13px] text-muted-foreground">Prevent others from seeing your email address</span>
              </div>
              <label className="flex items-center">
                <Switch
                  checked={privacy.hideEmail}
                  onCheckedChange={(checked) => handlePrivacyChange("hideEmail", checked)}
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-foreground">Hide Hobbies</span>
                <span className="text-[13px] text-muted-foreground">Prevent others from seeing your hobbies</span>
              </div>
              <label className="flex items-center">
                <Switch
                  checked={privacy.hideHobbies}
                  onCheckedChange={(checked) => handlePrivacyChange("hideHobbies", checked)}
                />
              </label>
            </div>
          </>
        )}
      </div>

            {/* Privacy Settings */}
      <div className="border border-border/50 bg-card rounded-xl p-6 space-y-6 shadow-sm">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Eye size={18} /> Privacy
          </h2>
          <p className="text-sm text-muted-foreground">Manage what others can see on your profile.</p>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading preferences...</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-foreground">Hide Email</span>
                <span className="text-[13px] text-muted-foreground">Prevent others from seeing your email address</span>
              </div>
              <label className="flex items-center">
                <Switch
                  checked={privacy.hideEmail}
                  onCheckedChange={(checked) => handlePrivacyChange("hideEmail", checked)}
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-foreground">Hide Hobbies</span>
                <span className="text-[13px] text-muted-foreground">Prevent others from seeing your hobbies</span>
              </div>
              <label className="flex items-center">
                <Switch
                  checked={privacy.hideHobbies}
                  onCheckedChange={(checked) => handlePrivacyChange("hideHobbies", checked)}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      <div >
        <div >
          <h2 className=" flex items-center gap-2">
            <Bell size={18} /> Notifications
          </h2>
          <p >Manage what events trigger email notifications.</p>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading preferences...</div>
        ) : (
          <>
            <div >
              <div >
                <span >Global Notifications</span>
                <span >Master switch to enable or disable all emails</span>
              </div>
              <label >
                <Switch
                  checked={prefs.global}
                  onCheckedChange={(checked) => handlePrefChange("global", checked)}
                />
              </label>
            </div>

            <div  >
              <div >
                <span >Platform Announcements</span>
                <span >Receive emails about major platform updates</span>
              </div>
              <label >
                <Switch
                  checked={prefs.announcements}
                  onCheckedChange={(checked) => handlePrefChange("announcements", checked)}
                />
              </label>
            </div>

            <div  >
              <div >
                <span >Join Approvals</span>
                <span >Get notified when new organizations sign up</span>
              </div>
              <label >
                <Switch
                  checked={prefs.joinApproval}
                  onCheckedChange={(checked) => handlePrefChange("joinApproval", checked)}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Removed sticky banner, using react-hot-toast instead */}
    </div>
  );
}
