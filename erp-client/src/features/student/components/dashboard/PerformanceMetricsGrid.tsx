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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { CheckCircle, FileText, BookOpen, Mic } from "lucide-react";
import { StudentAnalytics } from "../../queries/useStudentDashboard";
import { Progress } from "@/components/marketing_ui/progress";

export function PerformanceMetricsGrid({ data }: { data?: StudentAnalytics }) {
  if (!data) return null;

  const { overview } = data;

  const metrics = [
    {
      title: "Attendance",
      value: overview.attendance,
      icon: CheckCircle,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      progressColor: "bg-blue-500",
      desc: `${data.counts.attendedSessions} / ${data.counts.totalSessions} Sessions`
    },
    {
      title: "Assignments",
      value: overview.assignmentCompletion,
      icon: FileText,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      progressColor: "bg-indigo-500",
      desc: `${data.counts.assignmentsSubmitted} / ${data.counts.totalAssignments} Submitted`
    },
    {
      title: "Exams & Quizzes",
      value: overview.academicPerformance,
      icon: BookOpen,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      progressColor: "bg-emerald-500",
      desc: `${data.counts.examsTaken} Exams, ${data.counts.quizzesTaken} Quizzes`
    },
    {
      title: "AI Viva Score",
      value: (overview.vivaScore / 5) * 100, // Normalized to 100% for progress bar
      displayValue: overview.vivaScore,
      icon: Mic,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      progressColor: "bg-purple-500",
      desc: `${data.counts.vivaSessions} Sessions completed`,
      isScore: true
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {metrics.map((m, i) => (
        <Card key={i} className="transition-all hover:shadow-md hover:border-primary/50 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {m.title}
            </CardTitle>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.bgColor} ${m.color}`}>
              <m.icon className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {m.isScore ? `${m.displayValue} / 5` : `${m.value}%`}
            </div>
            <Progress 
              value={m.value} 
              className="h-1.5 mb-2" 
              indicatorClassName={m.progressColor} 
            />
            <p className="text-xs text-muted-foreground">
              {m.desc}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
