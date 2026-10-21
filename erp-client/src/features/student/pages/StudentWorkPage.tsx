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
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/marketing_ui/card";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Button } from "@/components/marketing_ui/button";
import { 
  GraduationCap, FileText, FileEdit, BarChart, Clock, IndianRupee, Slash,
  ClipboardCheck, CalendarX, CalendarCheck, MessageSquare, HelpCircle, 
  Palmtree, Bot, Home, Library, Coffee, Bus, Store, Users, UserCircle, 
  IdCard, HardDrive, ScrollText, CheckSquare
} from "lucide-react";
import { useInstitutionProfile } from "@/features/org/queries/useInstitutionProfile";

export function StudentWorkPage() {
  const { data: profile } = useInstitutionProfile();

  // Handle 4x2 rule filtering based on capabilities/variant
  const isCoaching = (profile as any)?.capabilities?.isCoaching ?? (profile?.dashboardVariant === "coaching");
  const hasHostel = (profile as any)?.capabilities?.hasHostel ?? profile?.enabledModules?.includes("hostel") ?? true;
  const hasLibrary = (profile as any)?.capabilities?.hasLibrary ?? profile?.libraryProfile?.moduleEnabled ?? true;

  const MODULES = [
    { label: "My Class", route: "/student/work/class", icon: GraduationCap, condition: true },
    { label: "Assignments", route: "/student/work/assignments", icon: FileText, condition: true },
    { label: "Internal Test", route: "/student/work/internal-test", icon: FileEdit, condition: !isCoaching },
    { label: "Test Series", route: "/student/work/test-series", icon: CheckSquare, condition: isCoaching },
    { label: "Result", route: "/student/work/result", icon: BarChart, condition: true },
    { label: "Timetable", route: "/student/work/timetable", icon: Clock, condition: true },
    { label: "Fees", route: "/student/work/fees", icon: IndianRupee, condition: true },
    { label: "Attendance", route: "/student/work/attendance", icon: ClipboardCheck, condition: true },
    { label: "Apply for Leave", route: "/student/work/leave", icon: CalendarX, condition: true },
    { label: "Events", route: "/student/work/events", icon: CalendarCheck, condition: true },
    { label: "Feedback", route: "/student/work/feedback", icon: MessageSquare, condition: true },
    { label: "Examination", route: "/student/work/examination", icon: FileEdit, condition: true },
    { label: "Quizzes", route: "/student/work/quizzes", icon: HelpCircle, condition: true },
    { label: "Holidays", route: "/student/work/holidays", icon: Palmtree, condition: true },
    { label: "Classgrid AI", route: "/classgrid-ai", icon: Bot, condition: true },
    { label: "Hostel", route: "/student/work/hostel", icon: Home, condition: hasHostel },
    { label: "Library", route: "/student/work/library", icon: Library, condition: hasLibrary },
    { label: "Canteen", route: "/student/work/canteen", icon: Coffee, condition: true },
    { label: "Transport", route: "/student/work/transport", icon: Bus, condition: true },
    { label: "Notes Marketplace", route: "/student/work/marketplace", icon: Store, condition: true },
    { label: "Alumni", route: "/student/work/alumni", icon: Users, condition: true },
    { label: "Profile", route: "/profile", icon: UserCircle, condition: true },
    { label: "Virtual ID", route: "/virtual-id", icon: IdCard, condition: true },
    { label: "Drive", route: "/drive", icon: HardDrive, condition: true },
    { label: "Certificate", route: "/student/work/certificate", icon: ScrollText, condition: true },
  ];

  const visibleModules = MODULES.filter((m) => m.condition !== false);

  return (
    <DashboardLayout role="student">


      <PageHeader 
        title="Work & Resources" 
        description="Access all your academic modules and learning tools." 
      />

      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.route} to={mod.route} className="block group">
                <Card className="h-full flex flex-col items-center justify-center p-6 text-center hover:border-emerald-500 hover:shadow-sm transition-all bg-card border border-border rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-sm">{mod.label}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Assignments</h2>
          <Button variant="outline" size="sm">View All</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard 
            title="Total Assignments" 
            value="0" 
            icon={FileText} 
          />
          <StatCard 
            title="Pending" 
            value="0" 
            icon={FileEdit} 
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
