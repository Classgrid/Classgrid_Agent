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
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { ChevronLeft, GraduationCap, Users, LayoutDashboard, Layers, Activity } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Badge } from "@/components/marketing_ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/marketing_ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/marketing_ui/table";
import { toast } from "sonner";
import { organizationControlCenterApi } from "../services/organizationControlCenterApi";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";

interface HierarchyNode {
  _id: string;
  name: string;
  code: string;
  type?: string;
  is_active: boolean;
  parent_id: string | null;
  sort_order: number;
}

interface Classroom {
  _id: string;
  name: string;
  is_active: boolean;
  hierarchy_node_id: string;
}

interface OrgSubject {
  _id: string;
  name: string;
  code: string;
  credits?: number;
  is_active: boolean;
}

interface HierarchyAuditData {
  nodes: HierarchyNode[];
  classrooms: Classroom[];
  subjects: OrgSubject[];
}

export function OrgHierarchyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const orgName = location.state?.orgName || "Organization";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HierarchyAuditData | null>(null);

  const breadcrumbItems = React.useMemo(() => [
    { label: "Organizations", href: "/superadmin/orgs" },
    { label: orgName, href: `/superadmin/detail/${id}` },
    { label: "Academic Hierarchy Audit" }
  ], [id, orgName]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const response = await organizationControlCenterApi.getHierarchyAudit(id);
        setData(response.data);
      } catch (err: any) {
        console.error("Failed to fetch hierarchy data:", err);
        toast.error("Failed to load hierarchy data from backend.");
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

  const nodes = data.nodes ?? [];
  const classrooms = data.classrooms ?? [];
  const subjects = data.subjects ?? [];
  const rootNodes = nodes.filter(n => !n.parent_id);
  const activeClassrooms = classrooms.filter(c => c.is_active).length;
  const activeSubjects = subjects.filter(s => s.is_active).length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <PageBreadcrumbs items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Academic Hierarchy Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live read-only view of the organization's actual academic structure and curriculum.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Layers className="h-4 w-4" />
              Total Nodes
            </div>
            <div className="text-2xl font-bold">{nodes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <LayoutDashboard className="h-4 w-4" />
              Classrooms
            </div>
            <div className="text-2xl font-bold">{classrooms.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeClassrooms} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <GraduationCap className="h-4 w-4" />
              Subjects
            </div>
            <div className="text-2xl font-bold">{subjects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeSubjects} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />
              Status
            </div>
            <div className="mt-2">
              {nodes.length > 0 ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="warning">Not Configured</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hierarchy Tree Visual */}
        <Card className="flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b bg-muted/50 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Root Departments / Programs
            </CardTitle>
            <Badge variant="neutral">{rootNodes.length} Roots</Badge>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            {rootNodes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rootNodes.map((node) => (
                    <TableRow key={node._id}>
                      <TableCell className="font-medium">{node.name}</TableCell>
                      <TableCell>{node.code}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={node.is_active ? "success" : "neutral"}>
                          {node.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No hierarchy configured.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classes List */}
        <Card className="flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b bg-muted/50 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Actual Classrooms
            </CardTitle>
            <Badge variant="neutral">{classrooms.length} Total</Badge>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            {classrooms.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classrooms.map((cls) => (
                    <TableRow key={cls._id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={cls.is_active ? "success" : "neutral"}>
                          {cls.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No classrooms exist in the database.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
