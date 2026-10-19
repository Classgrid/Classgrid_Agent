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
import { ChevronLeft, Users, ShieldAlert, GraduationCap, Clock, Activity } from "lucide-react";
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

interface FacultyMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

interface FacultyAuditData {
  faculty: FacultyMember[];
}

export function OrgFacultyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const orgName = location.state?.orgName || "Organization";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FacultyAuditData | null>(null);

  const breadcrumbItems = React.useMemo(() => [
    { label: "Organizations", href: "/superadmin/orgs" },
    { label: orgName, href: `/superadmin/detail/${id}` },
    { label: "Faculty & Staff Audit" }
  ], [id, orgName]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const response = await organizationControlCenterApi.getFacultyAudit(id);
        setData(response.data);
      } catch (err: any) {
        console.error("Failed to fetch faculty data:", err);
        toast.error("Failed to load faculty data from backend.");
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

  const faculty = data.faculty ?? [];
  const activeFaculty = faculty.filter(f => f.status === "active").length;
  const orgAdmins = faculty.filter(f => f.role === "org_admin").length;
  const teachers = faculty.filter(f => f.role === "teacher").length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <PageBreadcrumbs items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Faculty & Staff Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live read-only view of the organization's imported faculty and admin users.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              Total Staff
            </div>
            <div className="text-2xl font-bold">{faculty.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <ShieldAlert className="h-4 w-4" />
              Org Admins
            </div>
            <div className="text-2xl font-bold">{orgAdmins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <GraduationCap className="h-4 w-4" />
              Teachers
            </div>
            <div className="text-2xl font-bold">{teachers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />
              Active Status
            </div>
            <div className="text-2xl font-bold">{activeFaculty} <span className="text-sm font-normal text-muted-foreground">active</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="flex flex-col h-full overflow-hidden">
        <CardHeader className="border-b bg-muted/50 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Registered Faculty & Staff
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {faculty.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faculty.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "org_admin" ? "warning" : "info"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                      </span>
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
              No faculty or staff found for this organization.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
