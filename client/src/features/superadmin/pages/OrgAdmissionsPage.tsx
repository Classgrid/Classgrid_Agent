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
import { ChevronLeft, FileSpreadsheet, Send, ShieldCheck, Activity, Users } from "lucide-react";
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

interface AdmissionConfig {
  _id: string;
  name: string;
  academic_year_id: {
    _id: string;
    name: string;
  };
  hierarchy_nodes: Array<{
    _id: string;
    name: string;
  }>;
  status: string;
  startDate: string;
  endDate: string;
  allow_online_payment: boolean;
  application_fee: number;
}

interface AdmissionsAuditData {
  configs: AdmissionConfig[];
  applicationsCount: number;
}

export function OrgAdmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const orgName = location.state?.orgName || "Organization";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdmissionsAuditData | null>(null);

  const breadcrumbItems = React.useMemo(() => [
    { label: "Organizations", href: "/superadmin/orgs" },
    { label: orgName, href: `/superadmin/detail/${id}` },
    { label: "Admissions Audit" }
  ], [id, orgName]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const response = await organizationControlCenterApi.getAdmissionsAudit(id);
        setData(response.data);
      } catch (err: any) {
        console.error("Failed to fetch admissions data:", err);
        toast.error("Failed to load admission forms from backend.");
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

  const configs = data.configs ?? [];
  const applicationsCount = data.applicationsCount;
  const activeConfigs = configs.filter(c => c.status === "active").length;
  
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <PageBreadcrumbs items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Admissions Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live read-only view of the organization's admission forms and application data.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <FileSpreadsheet className="h-4 w-4" />
              Forms Configured
            </div>
            <div className="text-2xl font-bold">{configs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />
              Active Forms
            </div>
            <div className="text-2xl font-bold">{activeConfigs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Send className="h-4 w-4" />
              Applications Received
            </div>
            <div className="text-2xl font-bold">{applicationsCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <ShieldCheck className="h-4 w-4" />
              Status
            </div>
            <div className="mt-2">
              {configs.length > 0 ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="warning">Not Configured</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="flex flex-col h-full overflow-hidden">
        <CardHeader className="border-b bg-muted/50 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Admission Configurations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {configs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Departments</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config._id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {config.academic_year_id?.name || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{config.hierarchy_nodes?.length || 0} depts</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <span>{new Date(config.startDate).toLocaleDateString()}</span>
                        <span>{new Date(config.endDate).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {config.application_fee > 0 ? `₹${config.application_fee}` : "Free"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={config.status === "active" ? "success" : "neutral"}>
                        {config.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No admission forms configured for this organization.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
