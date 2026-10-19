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

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Search, Calendar as CalendarIcon, ChevronDown, MoreHorizontal, LayoutTemplate } from "lucide-react";
import { EditOrganizationDailyLimit } from "../components/EditOrganizationDailyLimit";
import { ResetOrganizationDailyLimit } from "../components/ResetOrganizationDailyLimit";
import { BlockOrganizationAiUsage } from "../components/BlockOrganizationAiUsage";
import { GrantCreditsModal, OrgRow } from "../components/GrantCredits";
import { Button } from "@/components/marketing_ui/button";


// If UI table isn't found, fallback to simple HTML table styled with Tailwind
const dummyData = [
  { id: "T-1001", name: "Rahul Sharma", email: "rahul@example.com", orgType: "College", status: "Open", date: "Jul 25, 2026" },
  { id: "T-1002", name: "Priya Patel", email: "priya@example.com", orgType: "School", status: "Resolved", date: "Jul 24, 2026" },
  { id: "T-1003", name: "Amit Kumar", email: "amit@example.com", orgType: "Coaching", status: "In Progress", date: "Jul 23, 2026" },
  { id: "T-1004", name: "Neha Singh", email: "neha@example.com", orgType: "School", status: "Closed", date: "Jul 22, 2026" },
  { id: "T-1005", name: "Vikram Reddy", email: "vikram@example.com", orgType: "College", status: "Open", date: "Jul 21, 2026" },
];


// Sandbox-only dummy org data (for testing GrantCredits modal)
const SANDBOX_ORGS = [
  { id: "1", name: "Rahul Sharma", orgName: "Sunrise Academy", email: "rahul@sunriseacademy.in", role: "Admin", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul" },
  { id: "2", name: "Priya Patel", orgName: "Greenwood School", email: "priya@greenwood.in", role: "Owner", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" },
  { id: "3", name: "Amit Kumar", orgName: "Elite Coaching Centre", email: "amit@elitecoach.in", role: "Member", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit" },
  { id: "4", name: "Neha Singh", orgName: "Bright Minds College", email: "neha@brightminds.in", role: "Admin", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neha" },
  { id: "5", name: "Vikram Reddy", orgName: "TechGuru Institute", email: "vikram@techguru.in", role: "Owner", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram" },
  { id: "6", name: "Sana Khan", orgName: "Al-Noor School", email: "sana@alnoor.in", role: "Member", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sana" },
];

import { SetupUsageCredits } from "../components/SetupUsageCredits";
import { GlobalAiConfigPanel } from "../components/GlobalAiConfigPanel";
import { SuperadminFilterBar } from "../components/SuperadminFilterBar";
import { AiUsageBar } from "@/components/ai/components/AiUsageBar";
import { AiUsageTrendsChart } from "../components/AiUsageTrendsChart";
import { AiTokenUsageChart } from "../components/AiTokenUsageChart";

import { TopAiUsersTable } from "../components/TopAiUsersTable";
import { NikhilDateCalendar } from "@/components/marketing_ui/nikhil_date_calendar";

export function SandboxPage() {
  const [isGrantCreditsOpen, setIsGrantCreditsOpen] = React.useState(false);
  const [testDate, setTestDate] = React.useState<{from?: Date; to?: Date} | undefined>({ from: new Date() });
  return (
    <div className="min-h-screen w-full bg-[#050505]">
      <div className="px-6 pt-6 pb-2 w-full max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Nikhil Date Calendar Test */}
        <div className="border border-[#222] rounded-xl shadow-sm bg-[#0a0a0a] p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white tracking-tight">
            Nikhil Date Calendar
          </h3>
          <p className="text-sm text-gray-400">
            Testing the new pure date calendar component.
          </p>
          <div className="w-72">
            <NikhilDateCalendar 
              value={testDate} 
              onChange={setTestDate} 
            />
          </div>
        </div>

        {/* 1, 2, 3 */}
        <AiUsageTrendsChart />

        {/* 4 */}
        <AiUsageBar initialData={{type: 'pro', used: 250, limit: 1000, remaining: 750, freeData: {used: 50, limit: 100, remaining: 50}}} />

        {/* 5 */}
        <TopAiUsersTable />

        {/* 6 */}
        <SetupUsageCredits />

        {/* 7 */}
        <div className="border border-border rounded-xl shadow-sm bg-[#0a0a0a]">
          <div className="p-6 bg-card flex flex-col gap-6 bg-[#0a0a0a]">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-semibold text-white tracking-tight">
                Grant Organization Credits
              </h3>
              <p className="text-sm text-gray-400">
                Open the AI Hub Panel to securely grant tokens to an organization.
              </p>
            </div>
          </div>
          <div className="p-4 bg-[#111111] border-t border-[#222222] flex items-center justify-end">
            <Button variant="outline" onClick={() => setIsGrantCreditsOpen(true)} className="bg-black border-[#222222] text-white hover:bg-[#1a1a1a]">
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Open Grant Credits Panel
            </Button>
          </div>
        </div>

        {/* 8 */}
        <ResetOrganizationDailyLimit />

        {/* 9 */}
        <EditOrganizationDailyLimit />

        {/* 10 */}
        <BlockOrganizationAiUsage />

        {/* 11 */}
        <GlobalAiConfigPanel />

        <GrantCreditsModal 
          isOpen={isGrantCreditsOpen} 
          onClose={() => setIsGrantCreditsOpen(false)}
          orgs={SANDBOX_ORGS}
        />
      </div>
      
      {/* 
      <div className="flex flex-nowrap items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide w-full max-w-full text-sm px-6 pt-6">
        
        <button className="flex h-9 min-w-[140px] flex-1 items-center justify-between rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors">
          <div className="flex items-center text-muted-foreground">
            <Search size={14} className="mr-2" />
            <span className="truncate">All Branc...</span>
          </div>
          <ChevronDown size={14} className="text-muted-foreground ml-2 shrink-0" />
        </button>

        <button className="flex h-9 min-w-[140px] flex-1 items-center justify-between rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors">
          <div className="flex items-center text-muted-foreground">
            <Search size={14} className="mr-2" />
            <span className="truncate">All Autho...</span>
          </div>
          <ChevronDown size={14} className="text-muted-foreground ml-2 shrink-0" />
        </button>

        <button className="flex h-9 min-w-[150px] flex-1 items-center justify-between rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-foreground">
          <span className="truncate">All Environments</span>
          <ChevronDown size={14} className="text-muted-foreground ml-2 shrink-0" />
        </button>

        <button className="flex h-9 min-w-[200px] flex-[2] items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-muted-foreground">
          <CalendarIcon size={14} className="mr-2 shrink-0" />
          <span className="truncate">Select Date Range</span>
        </button>

        <button className="flex h-9 min-w-[140px] flex-1 items-center justify-between rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors">
          <div className="flex items-center">
            <div className="flex -space-x-1.5 mr-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border border-background z-30" />
              <div className="w-3 h-3 rounded-full bg-red-500 border border-background z-20" />
              <div className="w-3 h-3 rounded-full bg-amber-500 border border-background z-10" />
              <div className="w-3 h-3 rounded-full bg-slate-200 border border-background z-0" />
            </div>
            <span className="text-foreground">Status</span>
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">6/7</span>
          </div>
          <ChevronDown size={14} className="text-muted-foreground ml-2 shrink-0" />
        </button>

        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-transparent shadow-sm hover:bg-accent/50 transition-colors">
          <MoreHorizontal size={14} className="text-foreground" />
        </button>

      </div>

      <div className="overflow-hidden bg-card border-t border-border">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Ticket ID</th>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Org Type</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...dummyData, ...dummyData, ...dummyData].map((row, index) => (
              <tr key={`${row.id}-${index}`} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">{row.id}</td>
                <td className="px-6 py-4 text-foreground">{row.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{row.email}</td>
                <td className="px-6 py-4 text-muted-foreground">{row.orgType}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    row.status === 'Open' ? 'bg-blue-500/10 text-blue-500' :
                    row.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500' :
                    row.status === 'In Progress' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-slate-500/10 text-slate-500'
                  }`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-muted-foreground">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      */}
    </div>
  );
}
