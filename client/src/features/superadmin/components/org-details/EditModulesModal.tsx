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

import { useState } from "react";
import { Button } from "@/components/marketing_ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/marketing_ui/dialog";
import { Input } from "@/components/marketing_ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationControlCenterApi } from "../../services/organizationControlCenterApi";
import { toast } from "sonner";
import { Pencil, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/marketing_ui/switch";

export function EditModulesModal({ profile, orgId }: { profile: any; orgId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const initialFlags = profile?.feature_flags || {};
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);
  
  const initialLimits = profile?.subscription?.limits || {};
  const [limits, setLimits] = useState<{
    storage_limit_gb?: number;
  }>({
    storage_limit_gb: initialLimits.storage_limit_gb || 100,
  });

  // Sync state if profile changes when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFlags(profile?.feature_flags || {});
      const lim = profile?.subscription?.limits || {};
      setLimits({
        storage_limit_gb: lim.storage_limit_gb || 100,
      });
    }
    setOpen(isOpen);
  };

  const toggleFlag = (key: string) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  
  const handleLimitChange = (key: string, value: string) => {
    setLimits(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  const mutation = useMutation({
    mutationFn: () => organizationControlCenterApi.updateOrganizationConfig(orgId, { featureFlags: flags, limits }),
    onSuccess: () => {
      toast.success("Modules updated successfully");
      qc.invalidateQueries({ queryKey: ["super-admin", "org-full-profile", orgId] });
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update modules");
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit Modules
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Modules & Toggles</DialogTitle>
          <DialogDescription>
            Enable or disable premium modules and dashboards for this organization. These changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {Object.entries(flags).map(([key, value]) => (
            <div key={key} className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <label className="text-sm font-medium leading-none capitalize">
                  {key.replace(/_/g, " ")}
                </label>
              </div>
              <Switch
                checked={value}
                onCheckedChange={() => toggleFlag(key)}
              />
            </div>
          ))}
        </div>

        <div className="mt-2 border-t pt-4">
          <h4 className="font-semibold mb-3">Resource Limits</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Storage Limit (GB)</label>
              <Input type="number" value={limits.storage_limit_gb} onChange={(e) => handleLimitChange("storage_limit_gb", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
