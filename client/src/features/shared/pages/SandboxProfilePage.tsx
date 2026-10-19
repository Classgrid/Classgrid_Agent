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
import { DobleTimeSlet } from "@/components/marketing_ui/doble_time_slet";
import { ContextualProfile } from "@/features/shared/components/ContextualProfile";

export default function SandboxProfilePage() {
  return (
    <div className="min-h-screen bg-muted/20 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Stepper Sandbox</h1>
          <p className="text-muted-foreground mt-2">
            Testing the ContextualProfile stepper (Vertical Stepper) based on the profile-strategy-selector.
          </p>
        </div>

        {/* Example: A Student viewing their OWN profile */}
        <div className="border rounded-xl bg-background shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">Example: Student (Self View)</h2>
          <p className="text-sm text-muted-foreground">
            This simulates an engineering student viewing their own profile. They can see all fields assigned to them.
          </p>
          <ContextualProfile 
            targetRole="student" 
            viewerRole="student" 
            orgType="engineering" 
            structureType="engineering_with_div" 
            isSelfView={true} 
          />
        </div>

        {/* Example: A Faculty viewing a Student profile */}
        <div className="border rounded-xl bg-background shadow-sm p-6 space-y-4 mt-8">
          <h2 className="text-xl font-semibold border-b pb-2">Example: Faculty viewing a Student</h2>
          <p className="text-sm text-muted-foreground">
            This simulates a faculty member viewing an engineering student's profile. Notice how the restricted fields are hidden by the strategy selector!
          </p>
          <ContextualProfile 
            targetRole="student" 
            viewerRole="faculty" 
            orgType="engineering" 
            structureType="engineering_with_div" 
            isSelfView={false} 
          />
        </div>

        {/* Example: Super Admin */}
        <div className="border rounded-xl bg-background shadow-sm p-6 space-y-4 mt-8">
          <h2 className="text-xl font-semibold border-b pb-2">Example: Super Admin (Self View)</h2>
          <p className="text-sm text-muted-foreground">
            A Super Admin has a very specific set of fields. They do not have Academic Placement or Education details mapped.
          </p>
          <ContextualProfile 
            targetRole="super_admin" 
            viewerRole="super_admin" 
            orgType="engineering" 
            structureType="engineering" 
            isSelfView={true} 
          />
        </div>

        {/* Example: Org Admin */}
        <div className="border rounded-xl bg-background shadow-sm p-6 space-y-4 mt-8">
          <h2 className="text-xl font-semibold border-b pb-2">Example: Org Admin (Self View)</h2>
          <p className="text-sm text-muted-foreground">
            An Org Admin profile, including Experience Details but no Academic Placements.
          </p>
          <ContextualProfile 
            targetRole="org_admin" 
            viewerRole="org_admin" 
            orgType="engineering" 
            structureType="engineering" 
            isSelfView={true} 
          />
        </div>

        {/* Example: Department Admin */}
        <div className="border rounded-xl bg-background shadow-sm p-6 space-y-4 mt-8">
          <h2 className="text-xl font-semibold border-b pb-2">Example: Department Admin (Self View)</h2>
          <p className="text-sm text-muted-foreground">
            Department Admin profile, explicitly configured based on your request.
          </p>
          <ContextualProfile 
            targetRole="department_admin" 
            viewerRole="department_admin" 
            orgType="engineering" 
            structureType="engineering" 
            isSelfView={true} 
          />
        </div>

        {/* Example: Doble Time Slet Calendar */}
        <div className="border rounded-xl bg-background shadow-sm p-6 space-y-4 mt-8">
          <h2 className="text-xl font-semibold border-b pb-2">Example: Doble Time Slet Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Testing the new DobleTimeSlet calendar component.
          </p>
          <DobleTimeSlet mode="single" />
        </div>

      </div>
    </div>
  );
}