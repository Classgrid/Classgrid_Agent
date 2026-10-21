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

import { Input } from "@/components/marketing_ui/input";
import { useState, useMemo } from "react";
import { Download, FileBarChart, Users, GraduationCap, Building2, RefreshCw } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { DataTable } from "@/components/marketing_ui/data-table";
import { useAuditData } from "../queries/useAudit";
import { apiClient } from "@/lib/apiClient";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchChatAuditLogs } from "@/features/chat/services/chatApi";
import { Button } from "@/components/marketing_ui/button";

export function AuditPage() {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isExporting, setIsExporting] = useState(false);

  const startStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
  const endStr = endDate ? format(endDate, "yyyy-MM-dd") : "";

  const { data, isLoading, isError, refetch, isFetching } = useAuditData(startStr, endStr);
  const audit = data?.data;

  const { data: chatLogsData, isLoading: isChatLogsLoading, refetch: refetchChatLogs } = useQuery({
    queryKey: ["chat-audit-logs"],
    queryFn: fetchChatAuditLogs,
  });
  const chatLogs = chatLogsData || [];

  // CSV Export logic
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const response = await apiClient.get("/api/audit/export/csv", {
        params: { startDate: startStr, endDate: endStr },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `NAAC_Audit_${startStr}_to_${endStr}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const response = await apiClient.get("/api/audit/report", {
        params: { startDate: startStr, endDate: endStr },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `NAAC_Audit_Report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error("Export failed", error);
      alert(error?.response?.data?.message || error?.message || "Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const perfColumns: ColumnDef<any>[] = useMemo(
    () => [
      { accessorKey: "classroomName", header: "Classroom", size: 150 },
      { accessorKey: "totalStudents", header: "Students", size: 100 },
      { accessorKey: "passedStudents", header: "Passed", size: 100 },
      {
        accessorKey: "passRate",
        header: "Pass Rate",
        size: 100,
        cell: ({ getValue }) => `${(getValue<number>() ?? 0).toFixed(1)}%`,
      },
      { accessorKey: "avgPercentage", header: "Avg %", size: 100 },
      { accessorKey: "avgCGPA", header: "Avg CGPA", size: 100, cell: ({ getValue }) => getValue() || "N/A" },
    ],
    []
  );

  const chatLogColumns: ColumnDef<any>[] = useMemo(
    () => [
      { accessorKey: "created_at", header: "Date & Time", size: 150, cell: ({ getValue }) => format(new Date(getValue<string>()), "MMM d, yyyy HH:mm") },
      { accessorKey: "group.name", header: "Group", size: 150, cell: ({ row }) => row.original.group?.name || "Unknown Group" },
      { accessorKey: "actor_name", header: "Actor", size: 150 },
      { accessorKey: "action", header: "Action", size: 150, cell: ({ getValue }) => (
        <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
          {(getValue<string>() || "").replace(/_/g, ' ').toUpperCase()}
        </span>
      ) },
      { accessorKey: "new_value", header: "Details", size: 250, cell: ({ getValue }) => (
        <div className="max-w-[250px] truncate text-muted-foreground" title={JSON.stringify(getValue())}>
          {JSON.stringify(getValue())}
        </div>
      ) },
    ],
    []
  );

  const academicData = audit?.criterion2?.academicPerformance ?? [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Institutional Audit (NAAC / NBA)</h1>
          <p className="text-muted-foreground mt-1">
            Automated compliance and data aggregation engine for government reports.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div >
            <div >
              <Input
                className="border border-border rounded-md px-3 py-2 text-sm bg-background w-full"
                type="date"
                value={startStr}
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
            <span className="text-muted-foreground">to</span>
            <div >
              <Input
                className="border border-border rounded-md px-3 py-2 text-sm bg-background w-full"
                type="date"
                value={endStr}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          </div>
          <Button variant="outline" onClick={handleExportCSV} disabled={isExporting || isLoading}>
            <Download size={14} className="mr-2" />
            CSV Export
          </Button>
          <Button variant="default" onClick={handleExportPDF} disabled={isExporting || isLoading}>
            <FileBarChart size={14} className="mr-2" />
            PDF Report
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="bg-red-100 text-red-800 p-4 rounded-md border border-red-200">Failed to load audit data.</div>
      ) : (
        <>
          {/* Enrollment Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Students"
              value={isLoading ? "—" : audit?.enrollment?.totalStudents ?? 0}
              icon={<Users size={16} />}
            />
            <StatCard
              title="Total Faculty"
              value={isLoading ? "—" : audit?.enrollment?.totalFaculty ?? 0}
              icon={<GraduationCap size={16} />}
            />
            <StatCard
              title="Student-Faculty Ratio"
              value={isLoading ? "—" : audit?.enrollment?.studentFacultyRatio ?? "0:1"}
            />
            <StatCard
              title="Classrooms"
              value={isLoading ? "—" : audit?.enrollment?.totalClassrooms ?? 0}
              icon={<Building2 size={16} />}
            />
          </div>

          <div >
            {/* Criterion 2: Academic Performance Table */}
            <SectionPanel title="Criterion 2: Academic Performance" description="Aggregated pass rates and averages by classroom." noPadding>
              <DataTable
                columns={perfColumns}
                data={academicData}
                pageSize={5}
                emptyMessage={isLoading ? "Aggregating data..." : "No academic records for this period."}
              />
            </SectionPanel>

            <SectionPanel title="Chat & Communication Audit Logs" description="Administrative actions within organization chat groups." noPadding className="mt-6">
              <DataTable
                columns={chatLogColumns}
                data={chatLogs}
                pageSize={10}
                emptyMessage={isChatLogsLoading ? "Loading chat audit logs..." : "No chat audit logs found for this organization."}
              />
            </SectionPanel>
          </div>
        </>
      )}
    </div>
  );
}
