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
import { ChevronLeft, IndianRupee, Calendar, Layers, Activity, FileText } from "lucide-react";
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

interface FeeStructureNode {
  _id: string;
  hierarchy_id: {
    _id: string;
    name: string;
    code: string;
  };
  title: string;
  base_amount: number;
  tax_percentage: number;
  due_date: string;
  line_items: Array<{
    name: string;
    amount: number;
    _id: string;
  }>;
}

interface FeesAuditData {
  fees: FeeStructureNode[];
}

export function OrgFeesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const orgName = location.state?.orgName || "Organization";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FeesAuditData | null>(null);

  const breadcrumbItems = React.useMemo(() => [
    { label: "Organizations", href: "/superadmin/orgs" },
    { label: orgName, href: `/superadmin/detail/${id}` },
    { label: "Fee Structure Audit" }
  ], [id, orgName]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const response = await organizationControlCenterApi.getFeesAudit(id);
        setData(response.data);
      } catch (err: any) {
        console.error("Failed to fetch fees data:", err);
        toast.error("Failed to load fees structure from backend.");
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

  const fees = data.fees ?? [];
  const totalStructures = fees.length;
  
  let totalRevenuePotential = 0;
  fees.forEach(fee => {
    totalRevenuePotential += fee.base_amount + (fee.base_amount * (fee.tax_percentage / 100));
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <PageBreadcrumbs items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IndianRupee className="h-6 w-6 text-primary" />
            Fee Structure Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live read-only view of the organization's active fee structures and financial blueprints.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <FileText className="h-4 w-4" />
              Total Structures
            </div>
            <div className="text-2xl font-bold">{totalStructures}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Layers className="h-4 w-4" />
              Assigned Departments
            </div>
            <div className="text-2xl font-bold">{new Set(fees.map(f => f.hierarchy_id?._id)).size}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <IndianRupee className="h-4 w-4" />
              Base Value (Average)
            </div>
            <div className="text-2xl font-bold">
              ₹{totalStructures > 0 ? (totalRevenuePotential / totalStructures).toFixed(2) : "0"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />
              Status
            </div>
            <div className="mt-2">
              {totalStructures > 0 ? (
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
            <IndianRupee className="h-4 w-4" />
            Configured Fee Structures
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Hierarchy Level</TableHead>
                  <TableHead>Base Amount</TableHead>
                  <TableHead>Tax %</TableHead>
                  <TableHead>Line Items</TableHead>
                  <TableHead className="text-right">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee._id}>
                    <TableCell className="font-medium">{fee.title}</TableCell>
                    <TableCell>
                      <Badge variant="info">
                        {fee.hierarchy_id?.name || "Unknown"} ({fee.hierarchy_id?.code || "N/A"})
                      </Badge>
                    </TableCell>
                    <TableCell>₹{fee.base_amount.toLocaleString()}</TableCell>
                    <TableCell>{fee.tax_percentage}%</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{fee.line_items?.length || 0} items</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(fee.due_date).toLocaleDateString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No fee structures configured for this organization.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
