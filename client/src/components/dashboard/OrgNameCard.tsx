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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { SectionPanel } from "@/components/marketing_ui/SectionPanel";

type BrandingData = {
  name: string;
  sidebar_name: string;
};

function FieldEditor({ 
  label, 
  value, 
  onSave, 
  isSaving,
  placeholder, 
  maxLength 
}: { 
  label: string;
  value: string;
  onSave: (val: string, onSuccessCallback: () => void) => void;
  isSaving: boolean;
  placeholder: string;
  maxLength?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(localValue, () => setIsEditing(false));
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground">{label}</label>
      </div>

      <div className="flex flex-col gap-3">
        {isEditing ? (
          <input
            type="text"
            value={localValue}
            onChange={(e) => {
              const val = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
              setLocalValue(val);
            }}
            maxLength={maxLength}
            placeholder={placeholder}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        ) : (
          <div className="w-full bg-muted/20 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground min-h-[38px] flex items-center">
            {value ? value : <span className="text-muted-foreground italic">Not set</span>}
          </div>
        )}

        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving || !localValue.trim()} 
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCancel} 
              disabled={isSaving} 
              className="px-3"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setIsEditing(true)} 
            className="w-full text-xs font-medium mt-1"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

export function OrgNameCard() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<BrandingData>({
    queryKey: ["org-branding"],
    queryFn: async () => {
      const res = await apiClient.get("/api/org-admin/branding");
      return res.data;
    },
  });

  const updateBranding = useMutation({
    mutationFn: async (variables: Partial<BrandingData>) => {
      const res = await apiClient.patch("/api/org-admin/branding", variables);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-branding"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["global-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Organization name updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update organization name");
    }
  });

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">Organization Name</h3>
            <p className="text-sm text-muted-foreground mt-1">Set your official name and a short name for the sidebar.</p>
          </div>
          
          <FieldEditor
            label="Full Name"
            value={data?.name || ""}
            placeholder="e.g. Classgrid Org"
            isSaving={updateBranding.isPending}
            onSave={(name, closeEdit) => updateBranding.mutate({ name }, { onSuccess: closeEdit })}
          />
        </div>

        {/* Right Column */}
        <div className="flex flex-col justify-end">
          <FieldEditor
            label="Sidebar Name (Max 22 chars)"
            value={data?.sidebar_name || ""}
            placeholder="e.g. Classgrid"
            maxLength={22}
            isSaving={updateBranding.isPending}
            onSave={(sidebar_name, closeEdit) => updateBranding.mutate({ sidebar_name }, { onSuccess: closeEdit })}
          />
        </div>

      </div>
    </div>
  );
}
