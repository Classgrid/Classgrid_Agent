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

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { useOrgRoles } from "@/features/org-admin/queries/useOrgAdminMembers";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { apiClient as api } from "@/lib/apiClient";
import { filterAvailableRoles } from "@/lib/dashboardRoleMap";

export function SettingsRoleRequestCard() {
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: rolesData, isLoading: loadingRoles } = useOrgRoles();

  const [tenantCode, setTenantCode] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All roles from backend
  const allRoles: Array<{ value: string; label: string }> = rolesData?.roles ?? [];

  // Filter out roles the user already holds
  const mainRole = currentUser?.role ?? "";
  const additionalRoles: string[] = currentUser?.additional_roles ?? [];
  const availableRoles = filterAvailableRoles(allRoles, mainRole, additionalRoles);

  const isAdmin = mainRole === "org_admin";
  const userEmail = currentUser?.email ?? "";

  // Roles already held — show as chips so user knows what they have
  const heldRoles = [mainRole, ...additionalRoles].filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantCode.trim()) {
      toast.error("Please enter the Tenant ID");
      return;
    }
    if (!selectedRole) {
      toast.error("Please select a role to request");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/org/request-role", {
        email: userEmail,
        tenant_join_code: tenantCode.trim(),
        role: selectedRole,
      });

      if (res.data?.instant_approval) {
        toast.success("Role added successfully!");
        qc.invalidateQueries({ queryKey: ["current-user"] });
        qc.invalidateQueries({ queryKey: ["orgAdmin", "roles"] });
      } else {
        toast.success("Role request sent to your Org Admin for approval.");
      }

      setTenantCode("");
      setSelectedRole("");
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Failed to process role request.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {isAdmin ? "Add a Role" : "Request a Role"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Enter your organization's Tenant ID to add an additional role to your account."
            : "Need access to a specific dashboard? Enter your organization's Tenant ID and select a role to request."}
        </p>
      </div>

      {/* Current roles */}
      {heldRoles.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your current roles</p>
          <div className="flex flex-wrap gap-2">
            {heldRoles.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 font-medium"
              >
                <CheckCircle2 className="h-3 w-3" />
                {r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Email — read only */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email Address</label>
            <Input
              type="email"
              className="bg-muted text-muted-foreground cursor-not-allowed"
              value={userEmail}
              disabled
              readOnly
            />
          </div>

          {/* Tenant ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tenant ID</label>
            <Input
              type="text"
              placeholder="e.g. VHSIKZIREQM"
              className="bg-background"
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Required for security verification.</p>
          </div>

          {/* Role — only shows roles user doesn't already have */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Role to Request</label>
            {availableRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">You already hold all available roles.</p>
            ) : (
              <ResponsiveSelect
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={loadingRoles}
                required
              >
                <option value="">Select a role...</option>
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </ResponsiveSelect>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || availableRoles.length === 0}
            className="gap-2"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isAdmin ? "Add Role" : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
