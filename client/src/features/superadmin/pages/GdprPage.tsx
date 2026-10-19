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

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Download, Trash2, RefreshCw, AlertTriangle, User } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { DataTable } from "@/components/marketing_ui/data-table";
import { PageHeader } from "@/components/layout/PageHeader";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/marketing_ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/marketing_ui/dialog";
import { apiClient } from "@/lib/apiClient";
import { formatDate } from "@/utils/dateUtils";
import { getSocket } from "@/lib/socketClient";
import { resolveRescueNavigation } from "@/lib/rescue";


export function GdprPage() {
  const [search, setSearch] = useState("");
  const [eraseTarget, setEraseTarget] = useState<any>(null);
  const [eraseConfirmText, setEraseConfirmText] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["gdpr-users", search],
    queryFn: () => apiClient.get<any>("/api/super-admin/users", { params: { q: search, limit: 100 } }).then(r => r.data),
    staleTime: 30_000,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleUpdate = () => refetch();
    socket.on("platform_gdpr_updated", handleUpdate);
    return () => {
      socket.off("platform_gdpr_updated", handleUpdate);
    };
  }, [refetch]);

  const users: any[] = data?.data ?? [];

  const eraseMut = useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/super-admin/gdpr/erase/${userId}`, { confirm: "ERASE" }).then(r => r.data),
    onSuccess: () => { toast.success("User data erased."); setEraseTarget(null); setEraseConfirmText(""); refetch(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Erasure failed."),
  });

  async function handleExport(user: any) {
    const a = document.createElement("a");
    a.href = await resolveRescueNavigation(`/api/super-admin/gdpr/export/${user._id}`);
    a.download = `gdpr-export-${user._id}.json`;
    a.click();
    toast.success(`Export started for ${user.name}.`);
  }

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "name", header: "User", size: 220,
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
    { accessorKey: "role", header: "Role", size: 130, cell: ({ getValue }) => <Badge variant="neutral">{getValue<string>().replace(/_/g, " ")}</Badge> },
    {
      accessorKey: "organizationName", header: "Organization", size: 170,
      cell: ({ getValue }) => getValue<string>() || <span >Platform</span>,
    },
    {
      accessorKey: "status", header: "Status", size: 100,
      cell: ({ getValue }) => {
        const s = getValue<string>() ?? "active";
        if (s === "active") return <Badge variant="success" dot>Active</Badge>;
        if (s === "deleted") return <Badge variant="danger">Erased</Badge>;
        return <Badge variant="warning">{s}</Badge>;
      },
    },
    { accessorKey: "createdAt", header: "Joined", size: 120, cell: ({ getValue }) => <span >{formatDate(getValue<string>())}</span> },
    {
      id: "actions", header: "GDPR Actions", size: 180,
      cell: ({ row }) => {
        const u = row.original;
        const isErased = u.status === "deleted" || u.name === "Deleted User";
        return (
          <div >
            <Button size="sm" variant="outline" onClick={() => handleExport(u)}><Download size={12} /> Export</Button>
            {!isErased && u.role !== "super_admin" && (
              <Button size="sm" variant="destructive" onClick={() => setEraseTarget(u)}><Trash2 size={12} /> Erase</Button>
            )}
          </div>
        );
      },
    },
  ], []);

  // inline styles removed

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <PageHeader
        title="GDPR & Data Privacy"
        description="Export or erase user data — GDPR Article 17 (Right to Erasure) and Article 20 (Data Portability)."
      />
      <div >
        <AlertTriangle size={18}  />
        <div>
          <div >Erasure is irreversible</div>
          <div >
            Erasing a user anonymizes their account — name, email, and PII replaced with placeholders. Foreign keys are preserved. Super Admin accounts are protected from erasure. All actions are logged.
          </div>
        </div>
      </div>
      <SectionPanel title="All Users" description="Perform GDPR actions on any user account." noPadding>
        <div >
          <div searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by name or email…" />
        </div>
        <DataTable columns={columns} data={users} isLoading={isLoading} pageSize={50}
          emptyIcon={<User size={32} />} emptyTitle="No users found" emptyDescription="Try a different search." emptyMessage="No users." />
      </SectionPanel>

      <Dialog open={!!eraseTarget} onOpenChange={o => !o && setEraseTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>⚠️ Erase User Data (GDPR)</DialogTitle>
            <DialogDescription>
              This will permanently anonymize <strong>{eraseTarget?.name}</strong> ({eraseTarget?.email}). This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <div >
            <label className="text-sm font-medium mb-1 block">Type <strong>ERASE</strong> to confirm</label>
            <Input value={eraseConfirmText} onChange={e => setEraseConfirmText(e.target.value)} placeholder="ERASE" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEraseTarget(null); setEraseConfirmText(""); }}>Cancel</Button>
            <Button variant="destructive" isLoading={eraseMut.isPending} disabled={eraseConfirmText !== "ERASE"} onClick={() => eraseMut.mutate(eraseTarget._id)}>
              <Trash2 size={14} /> Erase Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
