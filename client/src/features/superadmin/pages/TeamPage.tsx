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

// Super admin > Platform Team: the people who run Classgrid from this dashboard (Super Admin and Co-Super Admin).
// Invite new members (each gets a @classgrid.in email and a temporary password, sent to their personal email),
// see who is online, and remove members or revoke invitations. The founder accounts are protected.
import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Search, X, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/marketing_ui/tabs";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { Skeleton } from "@/components/marketing_ui/skeleton";
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

// ── Roles ─────────────────────────────────────────────────────────────────────

const PLATFORM_ROLES: { value: PlatformRole; label: string; description: string }[] = [
  { value: "super_admin", label: "Super Admin", description: "Full access to everything, the owner controls too." },
  { value: "co_super_admin", label: "Co-Super Admin", description: "Full access to everything except the owner controls." },
];

/** Founder accounts: nobody can remove them (the server refuses it too) */
const PROTECTED_EMAILS = ["nikhil.shinde@classgrid.in", "support@classgrid.in"];

function fmtDate(iso?: string) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Never";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function lastSeenText(iso?: string) {
  if (!iso) return "Never seen";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Never seen";
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return "Seen just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Seen ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Seen ${hours} h ago`;
  return `Seen ${d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`;
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

  removeMember: (id: string) =>
    apiClient
      .delete<{ success: boolean }>(`/api/super-admin/team/${id}`)
      .then((r) => r.data),
};

const errorText = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

// ── Component ─────────────────────────────────────────────────────────────────

type InviteForm = { name: string; personalEmail: string; classgridEmail: string; password: string; role: PlatformRole };
type FormErrors = Partial<Record<keyof InviteForm, string>>;

const EMPTY_FORM: InviteForm = { name: "", personalEmail: "", classgridEmail: "", password: "", role: "co_super_admin" };

function validate(f: InviteForm): FormErrors {
  const err: FormErrors = {};
  if (!f.name.trim()) err.name = "Enter their name.";
  if (!f.personalEmail.trim()) err.personalEmail = "Enter their personal email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.personalEmail.trim())) err.personalEmail = "This is not an email address.";
  if (!f.classgridEmail.trim()) err.classgridEmail = "Enter their Classgrid email.";
  else if (!/^[^\s@]+@classgrid\.in$/i.test(f.classgridEmail.trim())) err.classgridEmail = "It must end in @classgrid.in.";
  if (!f.password.trim()) err.password = "Enter a temporary password.";
  else if (f.password.trim().length < 6) err.password = "Use 6 characters at least.";
  return err;
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label} {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </label>
      {children}
      {error && <span className="block text-xs font-medium text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

function StatusCell({ m }: { m: TeamMember }) {
  if (m.status === "pending") {
    return <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">Invited</span>;
  }
  if (m.status === "suspended") {
    return <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">Suspended</span>;
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {m.isOnline ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">
          <span className="h-1.5 w-1.5 rounded-full bg-background" /> Online
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-current" /> Offline
        </span>
      )}
      {!m.isOnline && <span className="whitespace-nowrap text-[11px] text-muted-foreground">{lastSeenText(m.lastSeen)}</span>}
    </div>
  );
}

function TeamTable({ rows, isLoading, pending, emptyMessage, onRemove }: {
  rows: TeamMember[]; isLoading: boolean; pending: boolean; emptyMessage: string; onRemove: (m: TeamMember) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  if (!rows.length) {
    return <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="bg-muted/30 text-left text-muted-foreground">
            <th className="p-3 font-medium">Member</th>
            <th className="p-3 font-medium">Role</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Last sign-in</th>
            <th className="p-3 font-medium">{pending ? "Invited on" : "Joined"}</th>
            <th className="p-3 font-medium"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const isProtected = PROTECTED_EMAILS.includes(m.email.toLowerCase());
            return (
              <tr key={m._id} className="border-t border-border/60">
                <td className="p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {m.profilePicture ? (
                      <img src={m.profilePicture} alt="" className="h-8 w-8 shrink-0 rounded-full border border-border object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                        {(m.name || m.email).substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="max-w-[220px] truncate font-medium text-foreground" title={m.name}>{m.name}</div>
                      <div className="max-w-[220px] truncate text-xs text-muted-foreground" title={m.email}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap text-foreground">{PLATFORM_ROLES.find((r) => r.value === m.role)?.label || m.role}</td>
                <td className="p-3"><StatusCell m={m} /></td>
                <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDate(m.lastLogin)}</td>
                <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDate(m.createdAt)}</td>
                <td className="p-3 text-right">
                  {isProtected ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Founder account: it can't be removed">
                      <BadgeCheck size={16} className="text-foreground" /> Founder
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 px-3 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                      onClick={() => onRemove(m)}
                    >
                      <Trash2 size={14} />
                      {pending ? "Revoke" : "Remove"}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TeamPage() {
  const qc = useQueryClient();
  const [forms, setForms] = useState<InviteForm[]>([EMPTY_FORM]);
  const [errors, setErrors] = useState<FormErrors[]>([]);
  const [activeTab, setActiveTab] = useState("team-members");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | PlatformRole>("all");
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["superadmin-platform-team"],
    queryFn: () => teamApi.getTeam(),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    // Own handler, so only this page's listeners are removed when it closes
    const onChange = () => { refetch(); };
    socket.on("platform_team_updated", onChange);
    socket.on("platform_user_status_changed", onChange);
    return () => {
      socket.off("platform_team_updated", onChange);
      socket.off("platform_user_status_changed", onChange);
    };
  }, [refetch]);

  const filteredTeam = useMemo(() => {
    const team: TeamMember[] = data?.team ?? [];
    const q = searchQuery.trim().toLowerCase();
    return team.filter((m) => {
      const matchesSearch = !q || (m.name || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [data, searchQuery, roleFilter]);

  const activeMembers = filteredTeam.filter((m) => m.status !== "pending");
  const pendingMembers = filteredTeam.filter((m) => m.status === "pending");

  const removeMutation = useMutation({
    mutationFn: (id: string) => teamApi.removeMember(id),
    onSuccess: () => {
      toast.success(memberToDelete?.status === "pending" ? "Invitation revoked." : "Team member removed.");
      setMemberToDelete(null);
      qc.invalidateQueries({ queryKey: ["superadmin-platform-team"] });
    },
    onError: (err: any) => toast.error(errorText(err, "Couldn't remove the member.")),
  });

  const updateForm = (index: number, key: keyof InviteForm, value: string) => {
    setForms((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
    if (errors[index]?.[key]) {
      setErrors((prev) => prev.map((e, i) => (i === index ? { ...e, [key]: undefined } : e)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = forms.map(validate);
    if (newErrors.some((err) => Object.keys(err).length)) {
      setErrors(newErrors);
      return;
    }
    setErrors([]);
    setIsSubmitting(true);
    // Each invitation on its own: the ones that went through leave the form, the failed ones stay with their reason
    const results = await Promise.allSettled(forms.map((f) =>
      teamApi.inviteMember({
        name: f.name.trim(),
        email: f.classgridEmail.trim().toLowerCase(),
        personalEmail: f.personalEmail.trim(),
        password: f.password.trim(),
        role: f.role,
      })
    ));
    setIsSubmitting(false);
    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failedForms: InviteForm[] = [];
    const failedErrors: FormErrors[] = [];
    results.forEach((r, i) => {
      const form = forms[i];
      if (r.status === "rejected" && form) {
        failedForms.push(form);
        failedErrors.push({ classgridEmail: errorText(r.reason, "Couldn't send this invitation.") });
      }
    });
    if (sent) {
      toast.success(sent === 1 ? "Invitation sent. The welcome email is on its way." : `${sent} invitations sent. The welcome emails are on their way.`);
      qc.invalidateQueries({ queryKey: ["superadmin-platform-team"] });
    }
    if (failedForms.length) {
      toast.error(failedForms.length === 1 ? "One invitation was not sent. See the reason below." : `${failedForms.length} invitations were not sent. See the reasons below.`);
      setForms(failedForms);
      setErrors(failedErrors);
    } else {
      setForms([EMPTY_FORM]);
      setActiveTab("pending-invitations");
    }
  };

  const inputCls = (bad?: string) => (bad ? "bg-background border-red-500 focus-visible:ring-red-500" : "bg-background");

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="border-b border-border bg-card px-4 py-5 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Platform Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">The people who run Classgrid from this dashboard. Invite new members and manage who has access.</p>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6">
        {/* Invite */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-foreground">Invite members</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Give each new member a @classgrid.in email and a temporary password. The welcome email with both goes to their personal email, and they change the password when they first sign in.
            </p>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-6 px-4 py-5 sm:px-6">
              {forms.map((f, index) => (
                <div key={index} className={index > 0 ? "border-t border-border pt-5" : ""}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Member {index + 1}</span>
                    {forms.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        title="Take this member out of the list"
                        onClick={() => {
                          setForms(forms.filter((_, i) => i !== index));
                          setErrors(errors.filter((_, i) => i !== index));
                        }}
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Name" error={errors[index]?.name}>
                      <Input type="text" placeholder="For example: Jane Doe" className={inputCls(errors[index]?.name)} value={f.name} onChange={(e) => updateForm(index, "name", e.target.value)} />
                    </Field>
                    <Field label="Personal email" hint="(the welcome email goes here)" error={errors[index]?.personalEmail}>
                      <Input type="email" placeholder="name@gmail.com" className={inputCls(errors[index]?.personalEmail)} value={f.personalEmail} onChange={(e) => updateForm(index, "personalEmail", e.target.value)} />
                    </Field>
                    <Field label="New Classgrid email" error={errors[index]?.classgridEmail}>
                      <Input type="email" placeholder="name@classgrid.in" className={inputCls(errors[index]?.classgridEmail)} value={f.classgridEmail} onChange={(e) => updateForm(index, "classgridEmail", e.target.value)} />
                    </Field>
                    <Field label="Temporary password" error={errors[index]?.password}>
                      <Input type="text" autoComplete="off" placeholder="6 characters at least" className={inputCls(errors[index]?.password)} value={f.password} onChange={(e) => updateForm(index, "password", e.target.value)} />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Role">
                        <ResponsiveSelect
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                          value={f.role}
                          onChange={(e) => updateForm(index, "role", e.target.value)}
                        >
                          {PLATFORM_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </ResponsiveSelect>
                        <p className="text-xs text-muted-foreground">{PLATFORM_ROLES.find((r) => r.value === f.role)?.description}</p>
                      </Field>
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={() => setForms([...forms, EMPTY_FORM])}>
                <Plus size={14} /> Add another member
              </Button>
            </div>

            <div className="flex items-center justify-end border-t border-border bg-muted/30 px-4 py-4 sm:px-6">
              <Button type="submit" isLoading={isSubmitting} className="bg-foreground font-medium text-background hover:bg-foreground/90">
                {forms.length > 1 ? "Send invitations" : "Send invitation"}
              </Button>
            </div>
          </form>
        </section>

        {/* Members */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
            <TabsTrigger value="team-members">Team members ({activeMembers.length})</TabsTrigger>
            <TabsTrigger value="pending-invitations">Invited ({pendingMembers.length})</TabsTrigger>
          </TabsList>

          <div className="mb-4 flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 w-full bg-background pl-9"
                placeholder="Search by name or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ResponsiveSelect
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:ml-auto sm:w-[200px]"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "all" | PlatformRole)}
            >
              <option value="all">All roles</option>
              {PLATFORM_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </ResponsiveSelect>
          </div>

          {isError ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Couldn't load the team.{" "}
              <button type="button" className="font-medium text-foreground underline underline-offset-2" onClick={() => refetch()}>Try again</button>
            </div>
          ) : (
            <>
              <TabsContent value="team-members" className="m-0">
                <TeamTable rows={activeMembers} isLoading={isLoading} pending={false} onRemove={setMemberToDelete}
                  emptyMessage={searchQuery || roleFilter !== "all" ? "No team member matches." : "No team members yet."} />
              </TabsContent>
              <TabsContent value="pending-invitations" className="m-0">
                <TeamTable rows={pendingMembers} isLoading={isLoading} pending onRemove={setMemberToDelete}
                  emptyMessage={searchQuery || roleFilter !== "all" ? "No invitation matches." : "No open invitations."} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <DangerConfirmDialog
        open={!!memberToDelete}
        onOpenChange={(open) => { if (!open && !removeMutation.isPending) setMemberToDelete(null); }}
        title={memberToDelete?.status === "pending" ? "Revoke invitation" : "Remove team member"}
        description={
          <>
            Remove <strong className="text-foreground">{memberToDelete?.name}</strong> ({memberToDelete?.email}) from the platform team?
            {memberToDelete?.status === "pending"
              ? " Their invitation stops working and the account made for it is deleted."
              : " They lose all access to the super admin dashboard and their account is deleted."}
          </>
        }
        warningMessage="This can't be undone."
        actionLabel={memberToDelete?.status === "pending" ? "Revoke invitation" : "Remove member"}
        isLoading={removeMutation.isPending}
        onConfirm={() => { if (memberToDelete) removeMutation.mutate(memberToDelete._id); }}
      />
    </div>
  );
}
