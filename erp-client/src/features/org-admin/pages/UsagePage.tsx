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

import { useState } from "react";
import { useOrgUsage } from "../queries/useOrgAdminBilling";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { format, subMonths } from "date-fns";
import { Mail, MessageSquare, Database, Video, Users, Briefcase, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function UsagePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMetric, setSelectedMetric] = useState("emails");

  const month = selectedDate.getMonth() + 1; // 1-12
  const year = selectedDate.getFullYear();

  const { data: usageData, isLoading, isError } = useOrgUsage(month, year);

  if (isLoading) {
    return (
      <div className="p-6 sm:p-10 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !usageData) {
    return (
      <div className="p-6 sm:p-10 max-w-7xl mx-auto">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-red-800 dark:text-red-200">
            Failed to load usage data.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, dailySeries, studentBreakdown, facultyBreakdown, deptAdminBreakdown } = usageData;

  const metricOptions = [
    { value: "emails", label: "Emails Sent", color: "#3b82f6" },
    { value: "sms", label: "SMS Sent", color: "#6366f1" },
    { value: "activeStudents", label: "Active Students", color: "#10b981" },
    { value: "liveMinutes", label: "Live Class Minutes", color: "#8b5cf6" },
    { value: "aiUsage", label: "AI Tokens", color: "#ec4899" },
  ];

  const selectedMetricObj = metricOptions.find((m) => m.value === selectedMetric) || metricOptions[0];

  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(new Date(), i);
    return {
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: format(d, "MMMM yyyy"),
      date: d,
    };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header & Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Usage Analytics</h2>
          <p className="text-muted-foreground mt-1">Monitor your organization's resource consumption and active seats.</p>
        </div>

        <div className="w-full sm:w-64">
          <select
            className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={`${year}-${month}`}
            onChange={(e) => {
              const opt = monthOptions.find((o) => o.value === e.target.value);
              if (opt) setSelectedDate(opt.date);
            }}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Resource Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm border-t-4 border-t-blue-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emails Sent</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                  {summary.emailsSent.thisMonth.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{summary.emailsSent.total.toLocaleString()} all-time</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-indigo-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SMS Sent</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                  {summary.smsSent.thisMonth.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{summary.smsSent.total.toLocaleString()} all-time</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-amber-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                  {(summary.storageUsedGb ?? 0).toFixed(2)} GB
                </h3>
              </div>
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                <Database className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {summary.storageLimitGb ? `Limit: ${summary.storageLimitGb} GB` : "Pay-as-you-go"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-violet-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Live Class Minutes</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                  {summary.liveClassMinutes.thisMonth.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl text-violet-600 dark:text-violet-400">
                <Video className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-t-4 border-t-pink-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Tokens Used</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                  {(summary.aiUsage?.thisMonth || 0).toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-pink-100 dark:bg-pink-900/30 rounded-xl text-pink-600 dark:text-pink-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Trends Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Daily Usage Trends</CardTitle>
              <CardDescription>Breakdown for {format(selectedDate, "MMMM yyyy")}</CardDescription>
            </div>
            <div className="w-full sm:w-48">
              <select
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                {metricOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full mt-4">
            {dailySeries && dailySeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
                    }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    tickFormatter={(val) => val.toLocaleString()}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                    formatter={(value: number) => [value.toLocaleString(), selectedMetricObj.label]}
                    labelFormatter={(label) => format(new Date(label), "dd MMM yyyy")}
                  />
                  <Bar dataKey={selectedMetric} fill={selectedMetricObj.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                No usage data available for this period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
