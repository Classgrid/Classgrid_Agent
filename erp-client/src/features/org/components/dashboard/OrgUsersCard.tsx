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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/marketing_ui/card";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Badge } from "@/components/marketing_ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/marketing_ui/avatar";
import { useOrgDashboardUsers } from "../../queries/useOrgDashboard";

interface OrgUsersCardProps {
  profile: any;
  capabilities: any;
}

export function OrgUsersCard({ profile, capabilities }: OrgUsersCardProps) {
  const { data: usersData, isLoading: isUsersLoading } = useOrgDashboardUsers({ role: "student", limit: 5 });

  const studentColumns = [
    { 
      key: "name", 
      header: profile?.terminology?.learner ? `${profile.terminology.learner} Name` : "Student Name",
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarImage src={row.profileImageUrl} alt={value} />
            <AvatarFallback>{value.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    { key: "prn", header: profile?.terminology?.identifier || "ID" },
    { key: "branch", header: profile?.terminology?.program || "Program" },
    { key: "batch", header: "Batch" },
    ...(capabilities.hasDivisions ? [{ key: "department", header: profile?.terminology?.group || "Section" }] : []),
    { 
      key: "status", 
      header: "Status",
      render: (value: string) => {
        const variant = value.toLowerCase() === "active" ? "success" : 
                        value.toLowerCase() === "pending" ? "warning" : "default";
        return <Badge variant={variant}>{value}</Badge>;
      }
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Enrollments</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={studentColumns} 
          rows={usersData?.users || []} 
          isLoading={isUsersLoading} 
        />
      </CardContent>
    </Card>
  );
}
