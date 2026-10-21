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

import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, Plus, X, BadgeCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/marketing_ui/tabs";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { Badge } from "@/components/marketing_ui/badge";
import { RefreshButton } from "@/components/marketing_ui/refresh-button";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import {
  useMembers,
  usePendingMembers,
  useInviteStaff,
  useRemoveMember,
  useResendInvite,
  useOrgRoles,
} from "../queries/useOrgAdminMembers";
import { Member, PendingMember } from "../services/orgAdminMembersApi";

function fmtDate(iso?: string) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

const EMPTY_FORM = { name: "", email: "", role: "" };

export function MembersPage() {
  const qc = useQueryClient();
  const [forms, setForms] = useState([EMPTY_FORM]);
  const [errors, setErrors] = useState<Array<Partial<typeof EMPTY_FORM>>>([]);
  const [formResult, setFormResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState("team-members");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [memberToDelete, setMemberToDelete] = useState<Member | PendingMember | null>(null);

  const { data: rolesData, isLoading: loadingRoles } = useOrgRoles();
  const roles = rolesData?.roles || [];

  const { data: membersData, isLoading: loadingMembers, refetch: refetchMembers, isFetching: fetchingMembers } = useMembers();
  const { data: pendingData, isLoading: loadingPending, refetch: refetchPending, isFetching: fetchingPending } = usePendingMembers();

  const inviteMutation = useInviteStaff();
  const removeMutation = useRemoveMember();
  const resendMutation = useResendInvite();

  const isFetching = fetchingMembers || fetchingPending;

  const getRoleLabel = (roleValue: string) => {
    return roles.find((r) => r.value === roleValue)?.label || roleValue;
  };

  const activeMembers = useMemo(() => {
    const list = membersData?.members || [];
    return list.filter((m) => {
      const matchesSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [membersData, searchQuery, roleFilter]);

  const pendingMembersList = useMemo(() => {
    const list = pendingData?.pending || [];
    return list.filter((m) => {
      const matchesSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [pendingData, searchQuery, roleFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormResult(null);

    const newErrors: Array<Partial<typeof EMPTY_FORM>> = [];
    let hasError = false;

    forms.forEach((f, i) => {
        const err: Partial<typeof EMPTY_FORM> = {};
        if (!f.name.trim()) {
            err.name = "Name is required.";
            hasError = true;
        }
        if (!f.email.trim()) {
            err.email = "Email is required.";
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
            err.email = "Invalid email format.";
            hasError = true;
        }
        if (!f.role) {
            err.role = "Role is required.";
            hasError = true;
        }
        newErrors[i] = err as any;
    });

    if (hasError) {
        setErrors(newErrors);
        return;
    }

    setErrors([]);
    
    try {
        await Promise.all(forms.map(f => 
            inviteMutation.mutateAsync({
                name: f.name,
                email: f.email,
                role: f.role
            })
        ));
        
        toast.success("Invitations sent successfully!");
        setFormResult({ success: true, message: "Invitations sent successfully! Welcome emails have been dispatched." });
        setForms([{ ...EMPTY_FORM, role: roles[0]?.value || "" }]);
        setActiveTab("pending-invitations");
        setTimeout(() => setFormResult(null), 5000);
    } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || "Failed to invite members.");
        setFormResult({ success: false, message: err?.response?.data?.message || err?.message || "Failed to invite members." });
    }
  };

  const handleAddMore = () => {
    setForms([...forms, { ...EMPTY_FORM, role: roles[0]?.value || "" }]);
  };

  const getColumns = (isPending: boolean) => [
    {
      key: "user",
      header: "Member",
      width: "w-full min-w-[250px]",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3 py-2 w-full min-w-[250px]">
          {row.profilePicture ? (
            <img 
                src={row.profilePicture} 
                alt={row.name} 
                className="h-8 w-8 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
              {row.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm truncate">{row.name}</span>
            <span className="text-muted-foreground text-xs truncate">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: "role",
      header: "Role",
      width: "w-[180px]",
      render: (_: any, row: any) => (
        <div className="pr-4">
          <Badge variant="secondary" className="font-medium text-xs">{getRoleLabel(row.role)}</Badge>
        </div>
      )
    },
    {
      key: "date",
      header: isPending ? "Invited On" : "Joined",
      width: "w-[140px]",
      render: (_: any, row: any) => (
        <span className="text-sm text-muted-foreground">{fmtDate(row.createdAt)}</span>
      )
    },
    {
      key: "actions",
      header: "",
      width: "w-[120px]",
      render: (_: any, row: any) => {
        return (
          <div className="flex justify-end gap-1">
              {isPending && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 h-8 px-2 rounded-md flex items-center"
                    onClick={() => {
                        resendMutation.mutate(row._id, {
                            onSuccess: () => toast.success("Invitation resent successfully!")
                        });
                    }}
                    title="Resend Invite"
                    disabled={resendMutation.isPending}
                >
                    <Send size={14} />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 h-8 px-2 rounded-md flex items-center"
                onClick={() => setMemberToDelete(row)}
                title={isPending ? "Revoke Invite" : "Remove Member"}
              >
                <Trash2 size={14} />
              </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1000px] mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Members</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage team members and invitations</p>
        </div>
        <RefreshButton onClick={() => { refetchMembers(); refetchPending(); }} isFetching={isFetching} />
      </div>

      {/* Invite Members Card (Vercel Style) */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 pb-4">
          <CardTitle className="text-lg">Invite Members</CardTitle>
          <CardDescription>
            Add new members to your organization by entering their email address and assigning a role
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="p-6 pb-4">
                {formResult && (
                    <div className={`mb-4 p-3 rounded-md text-sm border ${formResult.success ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"}`}>
                        {formResult.message}
                    </div>
                )}
                
                {forms.map((f, index) => (
                    <div key={index} className="mb-6 last:mb-0">
                        {index > 0 && <hr className="border-border mb-4" />}
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-muted-foreground">Member {index + 1}</span>
                            {forms.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-danger flex-shrink-0" onClick={() => {
                                    setForms(forms.filter((_, i) => i !== index));
                                    setErrors(errors.filter((_, i) => i !== index));
                                }}>
                                    <X size={14} />
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Full Name</label>
                                <Input
                                    type="text"
                                    placeholder="e.g. Jane Doe"
                                    className={(errors[index] as any)?.name ? "border-danger focus-visible:ring-danger bg-background" : "bg-background"}
                                    value={f.name}
                                    onChange={(e) => {
                                        const newForms = [...forms];
                                        newForms[index] = { ...newForms[index], name: e.target.value };
                                        setForms(newForms);
                                    }}
                                />
                                {(errors[index] as any)?.name && <span className="text-xs font-medium text-danger">{(errors[index] as any)?.name}</span>}
                            </div>
                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="e.g. member@school.edu"
                                    className={(errors[index] as any)?.email ? "border-danger focus-visible:ring-danger bg-background" : "bg-background"}
                                    value={f.email}
                                    onChange={(e) => {
                                        const newForms = [...forms];
                                        newForms[index] = { ...newForms[index], email: e.target.value };
                                        setForms(newForms);
                                    }}
                                />
                                {(errors[index] as any)?.email && <span className="text-xs font-medium text-danger">{(errors[index] as any)?.email}</span>}
                            </div>
                            {/* Role */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Role</label>
                                <ResponsiveSelect
                                    className={`flex h-10 w-full rounded-md border ${(errors[index] as any)?.role ? "border-danger" : "border-input"} bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                                    value={f.role}
                                    onChange={(e) => {
                                        const newForms = [...forms];
                                        newForms[index] = { ...newForms[index], role: e.target.value };
                                        setForms(newForms);
                                    }}
                                    disabled={loadingRoles}
                                >
                                    <option value="" disabled>Select a role...</option>
                                    {roles.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </ResponsiveSelect>
                                {(errors[index] as any)?.role && <span className="text-xs font-medium text-danger">{(errors[index] as any)?.role}</span>}
                            </div>
                        </div>
                    </div>
                ))}
                
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-muted-foreground mt-2" onClick={handleAddMore}>
                    <Plus size={14} /> Add more
                </Button>
            </div>

            <div className="bg-muted/30 border-t border-border px-6 py-4 flex items-center justify-end">
                <Button type="submit" isLoading={inviteMutation.isPending} className="bg-primary text-primary-foreground font-medium w-[120px]">
                    Send Invite
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs & Data Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="team-members">Team Members</TabsTrigger>
          <TabsTrigger value="pending-invitations">Pending Invitations</TabsTrigger>
        </TabsList>
        
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 mb-4 w-full">
            <div className="relative flex-1 w-full max-w-[400px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                    className="pl-9 h-10 w-full bg-background" 
                    placeholder="Filter by name or email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 sm:ml-auto">
                <ResponsiveSelect
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none w-[180px]"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="all">All Roles</option>
                    {roles.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </ResponsiveSelect>
            </div>
        </div>

        <TabsContent value="team-members" className="m-0 border border-border rounded-md overflow-hidden bg-background">
          <DataTable
            columns={getColumns(false)}
            rows={activeMembers}
            isLoading={loadingMembers}
            emptyMessage="No active members found."
          />
        </TabsContent>
        
        <TabsContent value="pending-invitations" className="m-0 border border-border rounded-md overflow-hidden bg-background">
          <DataTable
            columns={getColumns(true)}
            rows={pendingMembersList}
            isLoading={loadingPending}
            emptyMessage="No pending invitations."
          />
        </TabsContent>
      </Tabs>

      <DangerConfirmDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
        title={memberToDelete && 'status' in memberToDelete ? "Remove Member" : "Revoke Invitation"}
        description={
            <>
                Are you sure you want to remove <strong className="text-foreground">{memberToDelete?.name}</strong> ({memberToDelete?.email}) from this organization? 
                They will lose access to their dashboard and data.
            </>
        }
        warningMessage="This action cannot be undone."
        actionLabel={memberToDelete && 'status' in memberToDelete ? "Remove Member" : "Revoke Invitation"}
        isLoading={removeMutation.isPending}
        onConfirm={() => {
            if (memberToDelete) {
                removeMutation.mutate(memberToDelete._id, {
                    onSuccess: () => {
                        toast.success("Successfully removed.");
                        setMemberToDelete(null);
                    }
                });
            }
        }}
      />
    </div>
  );
}

