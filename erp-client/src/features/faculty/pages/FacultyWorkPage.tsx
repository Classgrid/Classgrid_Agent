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
import { 
  GraduationCap, FileText, FileEdit, BarChart, Clock, Slash,
  ClipboardCheck, CalendarX, CalendarCheck, MessageSquare, HelpCircle, 
  Palmtree, Bot, Home, Library, Coffee, Bus, Store, UserCircle, 
  IdCard, HardDrive, CheckSquare, UserCog, CheckCircle, Globe, Video
} from "lucide-react";
import { useInstitutionProfile } from "@/features/org/queries/useInstitutionProfile";

export function FacultyWorkPage() {
  const { data: profile } = useInstitutionProfile();

  // Handle 4x2 rule filtering based on capabilities/variant
  const isCoaching = (profile as any)?.capabilities?.isCoaching ?? (profile?.dashboardVariant === "coaching");
  const hasHostel = (profile as any)?.capabilities?.hasHostel ?? profile?.enabledModules?.includes("hostel") ?? true;
  const hasLibrary = (profile as any)?.capabilities?.hasLibrary ?? profile?.libraryProfile?.moduleEnabled ?? true;
  const hasCanteen = (profile as any)?.capabilities?.hasCanteen ?? profile?.enabledModules?.includes("canteen") ?? true;
  const hasTransport = (profile as any)?.capabilities?.hasTransport ?? profile?.enabledModules?.includes("transport") ?? true;

  const MODULES = [
    { label: "My Class", route: "/faculty/work/class", icon: GraduationCap, condition: true },
    { label: "My Roles", route: "/faculty/work/roles", icon: UserCog, condition: true },
    { label: "Assignments", route: "/faculty/work/assignments", icon: FileText, condition: true },
    { label: "Internal Test", route: "/faculty/work/internal-test", icon: FileEdit, condition: !isCoaching },
    { label: "Exam Grading", route: "/faculty/work/grading", icon: CheckCircle, condition: !isCoaching },
    { label: "Test Series", route: "/faculty/work/test-series", icon: CheckSquare, condition: isCoaching },
    { label: "Online Exam Builder", route: "/faculty/work/exam-builder", icon: Globe, condition: true },
    { label: "Go Live", route: "/faculty/work/go-live", icon: Video, condition: true },
    { label: "Analytics", route: "/faculty/work/analytics", icon: BarChart, condition: true },
    { label: "Timetable", route: "/faculty/work/timetable", icon: Clock, condition: true },
    { label: "Attendance", route: "/faculty/work/attendance", icon: ClipboardCheck, condition: true },
    { label: "Leave Requests", route: "/faculty/work/leave", icon: CalendarX, condition: true },
    { label: "Events", route: "/faculty/work/events", icon: CalendarCheck, condition: true },
    { label: "Feedback", route: "/faculty/work/feedback", icon: MessageSquare, condition: true },
    { label: "Quizzes", route: "/faculty/work/quizzes", icon: HelpCircle, condition: true },
    { label: "Holidays", route: "/faculty/work/holidays", icon: Palmtree, condition: true },
    { label: "Classgrid AI", route: "/classgrid-ai", icon: Bot, condition: true },
    { label: "Hostel", route: "/faculty/work/hostel", icon: Home, condition: hasHostel },
    { label: "Library", route: "/faculty/work/library", icon: Library, condition: hasLibrary },
    { label: "Canteen", route: "/faculty/work/canteen", icon: Coffee, condition: hasCanteen },
    { label: "Transport", route: "/faculty/work/transport", icon: Bus, condition: hasTransport },
    { label: "Notes Marketplace", route: "/faculty/work/marketplace", icon: Store, condition: true },
    { label: "Profile", route: "/profile", icon: UserCircle, condition: true },
    { label: "Virtual ID", route: "/virtual-id", icon: IdCard, condition: true },
    { label: "Drive", route: "/drive", icon: HardDrive, condition: true },
  ];

  const visibleModules = MODULES.filter((m) => m.condition !== false);

  return (
    <DashboardLayout role="faculty">


      <PageHeader 
        title="Work & Resources" 
        description="Access all your faculty modules, tools, and classrooms." 
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
    </DashboardLayout>
  );
}
