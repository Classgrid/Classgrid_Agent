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

import { useQuery } from "@tanstack/react-query";
import {  MessageSquare } from "lucide-react";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { getSmsBudget } from "../api";

import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";

export function BulkSmsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sms-budget"],
    queryFn: getSmsBudget
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk SMS / WhatsApp</h1>
          <p className="text-muted-foreground mt-1">Manage SMS credits and broadcast messages.</p>
        </div>
      </div>

      {isError && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md border border-red-200">
          <strong>Error</strong>
          <br/>Could not fetch SMS budget.
        </div>
      )}
      
      {isLoading ? (
        <div ><Spinner size={24} className=" text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Daily Limit" value={(data?.daily_limit ?? 0).toLocaleString()} icon={<MessageSquare size={20} />} />
            <StatCard title="Sent Today" value={(data?.sent_today ?? 0).toLocaleString()} icon={<MessageSquare size={20} />} />
            <StatCard title="Remaining" value={(data?.remaining ?? 0).toLocaleString()} icon={<MessageSquare size={20} />} />
            <StatCard title="Monthly Total" value={(data?.total_sent_this_month ?? 0).toLocaleString()} icon={<MessageSquare size={20} />} />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold">Send Custom Broadcast</h2>
              <p className="text-sm text-muted-foreground mt-1">Coming soon. For automated reminders, use the Communication tab.</p>
            </div>
            <div className="p-5">
              <Button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 opacity-50 cursor-not-allowed" disabled>Compose Broadcast</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
