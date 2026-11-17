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

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Trash2, Plus, MoreHorizontal, Search, XCircle, X, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/marketing_ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/marketing_ui/tooltip";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { Badge } from "@/components/marketing_ui/badge";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { apiClient } from "@/lib/apiClient";
import { getSocket } from "@/lib/socketClient";

// ── Types ─────────────────────────────────────────────────────────────────────

type PlatformRole = "super_admin" | "co_super_admin";

type TeamMember = {
  _id: string;
  name: string;
  email: string;
  role: PlatformRole;
  isEmailVerified: boolean;
  status: "active" | "suspended" | "pending";
  createdAt: string;
  lastLogin?: string;
  lastSeen?: string;
  profilePicture?: string;
  isOnline?: boolean;
};

// ── Role definitions ──────────────────────────────────────────────────────────

const PLATFORM_ROLES: { value: PlatformRole; label: string; description: string; icon: React.ComponentType<any> }[] = [
  {
    value: "super_admin",
    label: "Super Admin",
    description: "God mode. Unrestricted access to everything.",
    icon: Shield
  },
  {
    value: "co_super_admin",
    label: "Co-Super Admin",
    description: "Full platform access. Can manage everything except God-Owner controls.",
    icon: Shield
  },
];

const ROLE_MAP: Record<PlatformRole, { label: string; variant: "danger" | "success" }> = {
  super_admin: { label: "Super Admin", variant: "danger" },
  co_super_admin: { label: "Co-Super Admin", variant: "success" }
};

function fmtDate(iso?: string) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function getRelativeTime(iso?: string) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Never";
  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  // Show exact date and time if it's older than 24 hours
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── API calls ─────────────────────────────────────────────────────────────────

const teamApi = {
  getTeam: () =>
    apiClient
      .get<{ success: boolean; team: TeamMember[] }>("/api/super-admin/team")
      .then((r) => r.data),

  inviteMember: (payload: { name: string; email: string; personalEmail?: string; password: string; role: PlatformRole }) =>
    apiClient
      .post<{ success: boolean; message: string; member: TeamMember }>("/api/super-admin/team/invite", payload)
      .then((r) => r.data),

  updateRole: (id: string, role: PlatformRole) =>
    apiClient
      .patch<{ success: boolean }>(`/api/super-admin/team/${id}/role`, { role })
      .then((r) => r.data),

  removeMember: (id: string) =>
    apiClient
      .delete<{ success: boolean }>(`/api/super-admin/team/${id}`)
      .then((r) => r.data)
};

// ── Component ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", personalEmail: "", classgridEmail: "", password: "", role: "co_super_admin" as PlatformRole };

export function TeamPage() {
  const qc = useQueryClient();
  const [forms, setForms] = useState([EMPTY_FORM]);
  const [errors, setErrors] = useState<Array<Partial<typeof EMPTY_FORM>>>([]);
  const [formResult, setFormResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState("team-members");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | PlatformRole>("all");
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["superadmin-platform-team"],
    queryFn: () => teamApi.getTeam(),
    staleTime: 60_000,
    retry: 1
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    socket.on("platform_team_updated", () => {
      refetch();
    });
    socket.on("platform_user_status_changed", () => {
      refetch();
    });
    return () => {
      socket.off("platform_team_updated");
      socket.off("platform_user_status_changed");
    };
  }, [refetch]);

  const team: TeamMember[] = data?.team ?? [];
  
  const filteredTeam = useMemo(() => {
    return team.filter((m) => {
        const matchesSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "all" || m.role === roleFilter;
        return matchesSearch && matchesRole;
    });
  }, [team, searchQuery, roleFilter]);

  const activeMembers = filteredTeam.filter((m) => m.status !== "pending");
  const pendingMembers = filteredTeam.filter((m) => m.status === "pending");

  const removeMutation = useMutation({
    mutationFn: (id: string) => teamApi.removeMember(id),
    onSuccess: () => {
      toast.success("Team member removed successfully.");
      qc.invalidateQueries({ queryKey: ["superadmin-platform-team"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to remove member.");
    }
  });

  const roleUpdateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: PlatformRole }) => teamApi.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["superadmin-platform-team"] })
  });

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
        if (!f.personalEmail.trim()) {
            err.personalEmail = "Personal email is required.";
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.personalEmail)) {
            err.personalEmail = "Invalid email format.";
            hasError = true;
        }
        if (!f.classgridEmail.trim()) {
            err.classgridEmail = "Classgrid email is required.";
            hasError = true;
        } else if (!/^[^\s@]+@classgrid\.in$/.test(f.classgridEmail)) {
            err.classgridEmail = "Must be a @classgrid.in email.";
            hasError = true;
        }
        if (!f.password.trim()) {
            err.password = "Password is required.";
            hasError = true;
        } else if (f.password.length < 6) {
            err.password = "Password must be at least 6 characters.";
            hasError = true;
        }
        newErrors[i] = err as any;
    });

    if (hasError) {
        setErrors(newErrors);
        return;
    }

    setErrors([]);
    setIsSubmitting(true);
    
    try {
        await Promise.all(forms.map(f => 
            teamApi.inviteMember({
                name: f.name,
                email: f.classgridEmail,
                personalEmail: f.personalEmail,
                password: f.password,
                role: f.role
            })
        ));
        
        toast.success("Invitations sent successfully! Welcome emails have been dispatched.");
        setFormResult({ success: true, message: "Invitations sent successfully! Welcome emails have been dispatched." });
        setForms([EMPTY_FORM]);
        setActiveTab("pending-invitations");
        qc.invalidateQueries({ queryKey: ["superadmin-platform-team"] });
        setTimeout(() => setFormResult(null), 5000);
    } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || "Failed to invite members.");
        setFormResult({ success: false, message: err?.response?.data?.message || err?.message || "Failed to invite members." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAddMore = () => {
    setForms([...forms, EMPTY_FORM]);
  };

  const getColumns = (isPending: boolean) => [
    {
      key: "user",
      header: "Admin",
      width: "w-full min-w-[250px]", // Let user column expand to fill space
      render: (_: any, row: TeamMember) => (
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium text-sm truncate cursor-help max-w-[200px] block">{row.name}</span>
              </TooltipTrigger>
              <TooltipContent side="top" align="start">
                <p>{row.name}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground text-xs truncate cursor-help max-w-[200px] block">{row.email}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <p>{row.email}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )
    },
    {
      key: "role",
      header: "Role",
      width: "w-[180px]",
      render: (_: any, row: TeamMember) => {
        const roleInfo = PLATFORM_ROLES.find(r => r.value === row.role);
        return (
          <div className="pr-4">
            <span className="text-sm font-medium text-foreground">
              {roleInfo?.label || row.role}
            </span>
          </div>
        );
      }
    },
    {
      key: "status",
      header: "Status",
      width: "w-[150px]",
      render: (_: any, row: TeamMember) => {
        if (row.status === "pending") {
          return <Badge variant="warning" dot>Pending</Badge>;
        }
        if (row.status === "suspended") {
          return <Badge variant="danger" dot>Suspended</Badge>;
        }
        
        if (row.isOnline) {
          return <Badge variant="success" dot>Online</Badge>;
        }

        // Offline state
        let lastSeenText = "Never";
        if (row.lastSeen) {
          const d = new Date(row.lastSeen);
          if (!isNaN(d.getTime())) {
            const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            
            const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
            let relative = "";
            if (seconds < 60) relative = `${seconds}s ago`;
            else {
              const minutes = Math.floor(seconds / 60);
              if (minutes < 60) relative = `${minutes}m ago`;
              else {
                const hours = Math.floor(minutes / 60);
                if (hours < 24) relative = `${hours}h ago`;
                else relative = `${Math.floor(hours / 24)}d ago`;
              }
            }
            lastSeenText = `${dateStr}, ${timeStr} (${relative})`;
          }
        }

        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge variant="neutral" dot>Offline</Badge>
            <span className="text-[10px] text-muted-foreground ml-1 whitespace-nowrap" title={lastSeenText}>Seen: {lastSeenText}</span>
          </div>
        );
      }
    },
    {
      key: "lastLogin",
      header: "Last Login",
      width: "w-[140px]",
      render: (_: any, row: TeamMember) => (
        <span className="text-sm text-muted-foreground">{fmtDate(row.lastLogin)}</span>
      )
    },
    {
      key: "date",
      header: isPending ? "Invited On" : "Joined",
      width: "w-[140px]",
      render: (_: any, row: TeamMember) => (
        <span className="text-sm text-muted-foreground">{fmtDate(row.createdAt)}</span>
      )
    },
    {
      key: "actions",
      header: "",
      width: "w-[100px]",
      render: (_: any, row: TeamMember) => {
        // Protected founder account — cannot be deleted by anyone
        const PROTECTED_EMAILS = ["nikhil.shinde@classgrid.in", "support@classgrid.in"];
        if (PROTECTED_EMAILS.includes(row.email.toLowerCase())) {
          return <div className="flex justify-end"><BadgeCheck size={20} className="text-blue-500" /></div>;
        }
        return (
          <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 h-8 px-3 rounded-md flex items-center gap-2"
                onClick={() => setMemberToDelete(row)}
                title={row.status === "pending" ? "Revoke Invite" : "Remove Member"}
              >
                <Trash2 size={14} />
                <span>Delete</span>
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
        
      </div>

      {/* Invite Members Card (Vercel Style) */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 pb-4">
          <CardTitle className="text-lg">Invite Members</CardTitle>
          <CardDescription>
            Add new members to your team by entering their email address and assigning a role
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
                                <label className="text-sm font-medium text-foreground">Team Member Name</label>
                                <Input
                                    type="text"
                                    placeholder="e.g. Jane Doe"
                                    className={(errors[index] as any)?.name ? "border-danger focus-visible:ring-danger bg-background" : "bg-background"}
                                    value={f.name}
                                    onChange={(e) => {
                                        const newForms = [...forms];
                                        newForms[index] = { ...newForms[index], name: e.target.value };
                                        setForms(newForms);
                                        if ((errors[index] as any)?.name) {
                                            const newErrors = [...errors];
                                            newErrors[index] = { ...newErrors[index], name: undefined } as any;
                                            setErrors(newErrors);
                                        }
                                    }}
                                />
                                {(errors[index] as any)?.name && <span className="text-xs font-medium text-danger">{(errors[index] as any)?.name}</span>}
                            </div>
                            {/* Personal Email */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Personal Email <span className="text-muted-foreground font-normal">(Where to send this email)</span></label>
                                <Input
                                    type="email"
                                    placeholder="e.g. personal@gmail.com"
                                    className={(errors[index] as any)?.personalEmail ? "border-danger focus-visible:ring-danger bg-background" : "bg-background"}
                                    value={f.personalEmail}
                                    onChange={(e) => {
                                        const newForms = [...forms];
                                        newForms[index] = { ...newForms[index], personalEmail: e.target.value };
                                        setForms(newForms);
                                        if ((errors[index] as any)?.personalEmail) {
                                            const newErrors = [...errors];
                                            newErrors[index] = { ...newErrors[index], personalEmail: undefined } as any;
                                            setErrors(newErrors);
                                        }
                                    }}
                                />
                                {(errors[index] as any)?.personalEmail && <span className="text-xs font-medium text-danger">{(errors[index] as any)?.personalEmail}</span>}
                            </div>
                            {/* Classgrid Email */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">New Classgrid Email</label>
                                <Input
                                    type="email"
                                    placeholder="e.g. name@classgrid.in"
                                    className={(errors[index] as any)?.classgridEmail ? "border-danger focus-visible:ring-danger bg-background" : "bg-background"}
                                    value={f.classgridEmail}
                                    onChange={(e) => {
                                        const newForms = [...forms];
                                        newForms[index] = { ...newForms[index], classgridEmail: e.target.value };
                                        setForms(newForms);
                                        if ((errors[index] as any)?.classgridEmail) {
                                            const newErrors = [...errors];
                                            newErrors[index] = { ...newErrors[index], classgridEmail: undefined } as any;
                                            setErrors(newErrors);
                                        }
                                    }}
                                />
                                {(errors[index] as any)?.classgridEmail && <span className="text-xs font-medium text-danger">{(errors[index] as any)?.classgridEmail}</span>}
                            </div>
                            {/* Temporary Password */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Temporary Password</label>
                                <Input
                                    type="text"
                                    placeholder="Enter a secure temporary password"
                                    className={(errors[index] as any)?.password ? "border-danger focus-visible:ring-danger bg-background" : "bg-background"}
                                    value={f.password}
                                    onChange={(e) => {
                                        const newForms = [...forms];
                                        newForms[index] = { ...newForms[index], password: e.target.value };
                                        setForms(newForms);
                                        if ((errors[index] as any)?.password) {
                                            const newErrors = [...errors];
                                            newErrors[index] = { ...newErrors[index], password: undefined } as any;
                                            setErrors(newErrors);
                                        }
                                    }}
                                />
                                {(errors[index] as any)?.password && <span className="text-xs font-medium text-danger">{(errors[index] as any)?.password}</span>}
                            </div>
                            {/* Role */}
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-medium text-foreground">Role</label>
                                <ResponsiveSelect
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={f.role}
                                    onChange={(e) => {
                                        const newForms = [...forms];
                                        newForms[index] = { ...newForms[index], role: e.target.value as PlatformRole };
                                        setForms(newForms);
                                    }}
                                >
                                    {PLATFORM_ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </ResponsiveSelect>
                            </div>
                        </div>
                    </div>
                ))}
                
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-muted-foreground mt-2" onClick={handleAddMore}>
                    <Plus size={14} /> Add more
                </Button>
            </div>

            <div className="bg-muted/30 border-t border-border px-6 py-4 flex items-center justify-end">
                <Button type="submit" isLoading={isSubmitting} className="bg-primary text-primary-foreground font-medium w-[120px]">
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
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                >
                    <option value="all">All Team Roles</option>
                    {PLATFORM_ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </ResponsiveSelect>
            </div>
        </div>

        <TabsContent value="team-members" className="m-0 border border-border rounded-md overflow-hidden bg-background">
          <DataTable
            columns={getColumns(false)}
            rows={activeMembers}
            isLoading={isLoading}
            emptyMessage="No active team members found."
          />
        </TabsContent>
        
        <TabsContent value="pending-invitations" className="m-0 border border-border rounded-md overflow-hidden bg-background">
          <DataTable
            columns={getColumns(true)}
            rows={pendingMembers}
            isLoading={isLoading}
            emptyMessage="No pending invitations."
          />
        </TabsContent>
      </Tabs>

      <DangerConfirmDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
        title={memberToDelete?.status === "pending" ? "Revoke Invitation" : "Remove Team Member"}
        description={
            <>
                Are you sure you want to remove <strong className="text-foreground">{memberToDelete?.name}</strong> ({memberToDelete?.email}) from the platform team? 
                They will lose all administrative access to the Classgrid super admin dashboard.
            </>
        }
        warningMessage="This action cannot be undone."
        actionLabel={memberToDelete?.status === "pending" ? "Revoke Invitation" : "Remove Member"}
        isLoading={removeMutation.isPending}
        onConfirm={() => {
            if (memberToDelete) {
                removeMutation.mutate(memberToDelete._id, {
                    onSuccess: () => setMemberToDelete(null)
                });
            }
        }}
      />
    </div>
  );
}
