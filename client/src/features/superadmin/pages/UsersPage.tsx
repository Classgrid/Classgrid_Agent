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

import { useState, useMemo } from "react";
import { Users, Building2, ShieldAlert, CheckCircle, RefreshCw, MoreVertical } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Badge } from "@/components/marketing_ui/badge";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/marketing_ui/avatar";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { formatDate } from "@/utils/dateUtils";
import { useAllUsers, useSuspendUser, useReactivateUser, useImpersonateUser } from "../queries/useUsers";
import { LogIn } from "lucide-react";
import type { SuperAdminUser } from "../services/superAdminApi";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";


// ── columns ───────────────────────────────────────────────────────────────────

function buildColumns(
  onSuspend: (id: string) => void,
  onReactivate: (id: string) => void,
  onImpersonate: (id: string) => void,
  isMutating: boolean
): ColumnDef<SuperAdminUser>[] {
  return [
    {
      accessorKey: "name",
      header: "User",
      size: 200,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div >
            <Avatar className="w-8 h-8"><AvatarFallback>{u.name?.charAt(0)}</AvatarFallback></Avatar>
            <div>
              <div >{u.name}</div>
              <div >{u.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      size: 130,
      cell: ({ getValue }) => {
        const role = getValue<string>();
        const isSuper = role === "super_admin";
        return (
          <Badge variant={isSuper ? "danger" : "info"}>
            {role.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "organization",
      header: "Organization",
      size: 180,
      cell: ({ getValue }) => {
        const org = getValue<{ name: string } | undefined>();
        return org ? org.name : <span >System</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 110,
      cell: ({ getValue, row }) => {
        // Fallback to isEmailVerified if status is missing
        const s = getValue<string>();
        const isActive = s === "active" || (!s && row.original.isEmailVerified);
        return isActive ? (
          <Badge variant="success" dot>Active</Badge>
        ) : (
          <Badge variant="warning">Suspended</Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      size: 120,
      cell: ({ getValue }) => (
        <span >{formatDate(getValue<string>())}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 220,
      cell: ({ row }) => {
        const u = row.original;
        
        // Safeguard: Protect the primary super admin account from any modifications
        if (u.email === "support@classgrid.in") {
          return <span >Protected</span>;
        }
        
        if (u.role === "super_admin") return null; // Don't allow suspending other super admins from here easily

        const s = u.status;
        const isActive = s === "active" || (!s && u.isEmailVerified);

        return (
          <div className="flex gap-2">
            <Button
              variant={isActive ? "outline" : "default"}
              className="flex-1"
              disabled={isMutating}
              onClick={() => (isActive ? onSuspend(u._id) : onReactivate(u._id))}
            >
              {isActive ? "Suspend" : "Reactivate"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={isMutating}
              onClick={() => onImpersonate(u._id)}
            >
              <LogIn size={14} className="mr-2" /> Login As
            </Button>
          </div>
        );
      },
    },
  ];
}

// ── page ─────────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { data, isLoading, isError, refetch, isFetching } = useAllUsers();
  const suspendMutation = useSuspendUser();
  const reactivateMutation = useReactivateUser();
  const impersonateMutation = useImpersonateUser();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const users = data?.users ?? [];

  const stats = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role === "super_admin").length;
    const orgAdmins = users.filter((u) => u.role === "org_admin").length;
    const suspended = users.filter((u) => u.status === "suspended").length;
    return { total, superAdmins, orgAdmins, suspended };
  }, [users]);

  const filtered = useMemo(() => {
    let result = users;
    if (roleFilter) {
      result = result.filter(u => u.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.organization?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, search, roleFilter]);

  const columns = useMemo(
    () =>
      buildColumns(
        (id) => suspendMutation.mutate(id),
        (id) => reactivateMutation.mutate(id),
        (id) => impersonateMutation.mutate(id),
        suspendMutation.isPending || reactivateMutation.isPending || impersonateMutation.isPending
      ),
    [suspendMutation, reactivateMutation, impersonateMutation]
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage all users across all organizations, including super admins and org admins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={isLoading ? "—" : stats.total}
          icon={<Users size={16} />}
        />
        <StatCard
          title="Super Admins"
          value={isLoading ? "—" : stats.superAdmins}
          icon={<ShieldAlert size={16} />}
        />
        <StatCard
          title="Org Admins"
          value={isLoading ? "—" : stats.orgAdmins}
          icon={<Building2 size={16} />}
        />
        <StatCard
          title="Suspended"
          value={isLoading ? "—" : stats.suspended}
          icon={<CheckCircle size={16} />}
        />
      </div>

      <SectionPanel
        title="User Directory"
        description="Search by name, email, or organization."
      >
        <div className="p-4 flex gap-2 items-center border-b border-border">
          <Input
            type="text"
            className="border border-border rounded-md px-3 py-2 text-sm bg-background flex-1"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ResponsiveSelect
            className="border border-border rounded-md px-3 py-2 text-sm bg-background w-48"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Filter by Role</option>
            <option value="super_admin">Super Admin</option>
            <option value="org_admin">Org Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </ResponsiveSelect>
        </div>
        {isError ? (
          <div className="bg-red-100 text-red-800 p-4 rounded-md border border-red-200 flex flex-col items-start gap-2 m-4">
            <span className="font-bold">Failed to load users</span>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            pageSize={10}
            emptyMessage={isLoading ? "Loading users…" : "No users found."}
          />
        )}
      </SectionPanel>
    </div>
  );
}
