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

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, GraduationCap, Users, Clock, Activity, ScrollText } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Badge } from "@/components/marketing_ui/badge";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/marketing_ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/marketing_ui/table";
import { toast } from "sonner";
import { organizationControlCenterApi } from "../services/organizationControlCenterApi";
import { formatDateTime } from "../components/org-details/formatters";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";

interface StudentProfile {
  prn?: string;
  batch?: string;
  branch?: string;
}

interface StudentMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  profile?: {
    student?: StudentProfile;
  };
}

interface StudentsAuditData {
  students: StudentMember[];
}

export function OrgStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const orgName = location.state?.orgName || "Organization";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentsAuditData | null>(null);

  const breadcrumbItems = React.useMemo(() => [
    { label: "Organizations", href: "/superadmin/orgs" },
    { label: orgName, href: `/superadmin/detail/${id}` },
    { label: "Students Audit" }
  ], [id, orgName]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const response = await organizationControlCenterApi.getStudentsAudit(id);
        setData(response.data);
      } catch (err: any) {
        console.error("Failed to fetch students data:", err);
        toast.error("Failed to load students data from backend.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardContent className="pt-6 text-center flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold">Failed to load data</h2>
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const students = data.students ?? [];
  const activeStudents = students.filter(s => s.status === "active").length;
  
  // Calculate batch distribution
  const batchCounts: Record<string, number> = {};
  students.forEach(s => {
    const batch = s.profile?.student?.batch || "Unassigned";
    batchCounts[batch] = (batchCounts[batch] || 0) + 1;
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <PageBreadcrumbs items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Students Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live read-only view of the organization's imported students. (Limited to 1000 records)
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              Total Students
            </div>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />
              Active Status
            </div>
            <div className="text-2xl font-bold">{activeStudents} <span className="text-sm font-normal text-muted-foreground">active</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <ScrollText className="h-4 w-4" />
              Batches (Grades/Years)
            </div>
            <div className="text-2xl font-bold">{Object.keys(batchCounts).length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        {/* Main Content: Student Table */}
        <Card className="flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b bg-muted/50 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Registered Students
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px]">
            {students.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PRN / Roll No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Batch / Branch</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-mono text-xs">{user.profile?.student?.prn || "-"}</TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="font-medium">{user.profile?.student?.batch || "N/A"}</span>
                          <span className="text-muted-foreground">{user.profile?.student?.branch || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={user.status === "active" ? "success" : "neutral"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No students found for this organization.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: Batch Distribution */}
        <Card className="h-fit">
          <CardHeader className="border-b bg-muted/50 pb-4">
            <CardTitle className="text-base font-semibold">Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {Object.entries(batchCounts).sort((a, b) => b[1] - a[1]).map(([batch, count]) => (
                <div key={batch} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{batch}</span>
                  <Badge variant="neutral">{count}</Badge>
                </div>
              ))}
              {Object.keys(batchCounts).length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No batch data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
