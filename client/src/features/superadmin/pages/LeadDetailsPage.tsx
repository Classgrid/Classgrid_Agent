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

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, type ReactNode } from "react";
import { Copy, ExternalLink, AlertTriangle, Globe, Mail, Phone } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Badge } from "@/components/marketing_ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/marketing_ui/tooltip";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/marketing_ui/select";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useLeads, useScheduleMeeting, useDeleteLead, useUpdateLeadNotes } from "../queries/useLeads";
import { useAllUsers } from "../queries/useUsers";
import { formatDate } from "@/utils/dateUtils";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { toast } from "sonner";
import RichReplyEditor from "@/app/support/components/RichReplyEditor";
import { getSocket } from "@/lib/socketClient";
import { getLeadStatus, personPhoto } from "../components/LeadTable";

// One demo lead from the "Book a Demo" form on classgrid.in (Classgrid AI): who sent it, their company, what they
// want Classgrid AI for and their message; then the meeting, who on the team has it, its status, the meeting notes
// and the final review. Leads saved before the form changed have no team size or use case; those rows show a dash.

// The meeting statuses the team sets by hand. "scheduled" is set only by the website when the lead books the first
// meeting (see the rule in LeadsPage.tsx), so it is shown but never offered here.
const MEETING_STATUS_OPTIONS = [
  { value: "pending", label: "Not booked yet" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "missed", label: "Missed" },
  { value: "closed", label: "Closed" },
] as const;

function Section({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="break-words text-sm text-foreground">{children}</div>
    </div>
  );
}

function Initial({ name, photo, size = "h-6 w-6" }: { name?: string; photo?: string; size?: string }) {
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-semibold text-foreground`}>
      {photo ? <img src={photo} alt={name || ""} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

/** Meeting notes / final review: read view, and an editor that saves once when you press Save */
function NotesSection({ title, emptyText, placeholder, html, saving, onSave }: {
  title: string; emptyText: string; placeholder: string; html: string; saving: boolean; onSave: (html: string, done: () => void) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(html);

  const startEditing = () => { setDraft(html); setEditing(true); };

  return (
    <Section
      title={title}
      action={editing ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" size="sm" className="h-8" onClick={() => onSave(draft, () => setEditing(false))} disabled={saving}>
            {saving ? "Saving" : "Save"}
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={startEditing}>Edit</Button>
      )}
    >
      {editing ? (
        <RichReplyEditor initialHtml={html} onChange={setDraft} placeholder={placeholder} hideAttachments={true} minHeight={150} />
      ) : html ? (
        <div className="prose prose-sm max-w-none break-words text-sm text-foreground dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </Section>
  );
}

export function LeadDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useLeads();
  const { data: usersData } = useAllUsers();
  const scheduleMutation = useScheduleMeeting();
  const deleteMutation = useDeleteLead();
  const updateNotesMutation = useUpdateLeadNotes();
  const navigate = useNavigate();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingField, setSavingField] = useState<"meetingNotes" | "demoReview" | null>(null);

  const lead = data?.leads.find(l => l._id === id);
  const allUsers: any[] = (Array.isArray(usersData) ? usersData : (usersData as any)?.users) || [];
  let superAdmins = allUsers.filter((u: any) => u.role === "super_admin" || u.role === "co_super_admin");

  // If the lead is already assigned to someone, make sure they are in the list so the menu shows their name
  const currentAssignedId = typeof lead?.assignedTo === "string" ? (lead.assignedTo as string) : lead?.assignedTo?._id;
  if (currentAssignedId && !superAdmins.some((admin: any) => String(admin._id) === String(currentAssignedId))) {
    const foundUser = allUsers.find((u: any) => String(u._id) === String(currentAssignedId));
    const fallback = typeof lead?.assignedTo === "object" && lead.assignedTo !== null ? lead.assignedTo : { _id: currentAssignedId, name: "Unknown team member" };
    superAdmins = [foundUser || fallback, ...superAdmins];
  }
  const assignedAdmin = superAdmins.find((a: any) => String(a._id) === String(currentAssignedId)) || (typeof lead?.assignedTo === "object" ? lead?.assignedTo : null);
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);

  useEffect(() => {
    if (lead) {
      setBreadcrumbs([
        { label: "Demo Leads", href: "/superadmin/leads" },
        { label: lead.institutionName || lead.adminName, href: `/superadmin/leads/${id}` }
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, lead, id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onLeadsUpdated = () => { refetch(); };
    socket.on("superadmin:leads_updated", onLeadsUpdated);
    return () => {
      socket.off("superadmin:leads_updated", onLeadsUpdated);
    };
  }, [refetch]);

  useEffect(() => {
    const meetDate = lead?.meetingScheduledAt || lead?.scheduledAt;
    setDate(meetDate ? new Date(meetDate) : undefined);
    setMeetingUrl(lead?.meetingUrl || "");
  }, [lead?.meetingScheduledAt, lead?.scheduledAt, lead?.meetingUrl]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="space-y-3 border-b border-border pb-6">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
          <div className="space-y-6 xl:col-span-4">
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="font-medium text-foreground">Could not load this demo lead.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }
  if (!lead) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="font-medium text-foreground">This demo lead was not found.</p>
        <p className="mt-1 text-sm text-muted-foreground">It may have been deleted.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/superadmin/leads")}>Back to Demo Leads</Button>
      </div>
    );
  }

  const status = getLeadStatus(lead);
  const isConverted = lead.status === "converted";
  const hadMeeting = !!(lead.meetingScheduledAt || lead.scheduledAt);
  const isPastMeeting = !!date && date < new Date() && !isConverted && lead.meetingStatus !== "completed";
  const websiteHref = lead.website ? (lead.website.startsWith("http") ? lead.website : `https://${lead.website}`) : "";

  const handleSchedule = () => {
    if (!id) return;
    if (!date) return toast.error("Pick a date and time.");
    if (!meetingUrl.trim()) return toast.error("Add the meeting link.");

    toast.loading(hadMeeting ? "Moving the meeting" : "Saving the meeting", { id: "schedule-meet" });
    scheduleMutation.mutate({
      id,
      scheduledAt: date.toISOString(),
      meetingUrl: meetingUrl.trim(),
      provider: "google_meet"
    }, {
      onSuccess: () => {
        toast.success(hadMeeting ? "Meeting moved." : "Meeting saved.", { id: "schedule-meet" });
        setIsEditingMeeting(false);
      },
      onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Could not save the meeting.", { id: "schedule-meet" })
    });
  };

  const cancelMeetingEdit = () => {
    setIsEditingMeeting(false);
    const meetDate = lead.meetingScheduledAt || lead.scheduledAt;
    setDate(meetDate ? new Date(meetDate) : undefined);
    setMeetingUrl(lead.meetingUrl || "");
  };

  const copyToClipboard = () => {
    if (!meetingUrl) return;
    navigator.clipboard.writeText(meetingUrl).then(() => {
      setCopied(true);
      toast.success("Meeting link copied.");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error("Could not copy the link."));
  };

  const saveNotes = (field: "meetingNotes" | "demoReview") => (html: string, done: () => void) => {
    setSavingField(field);
    updateNotesMutation.mutate({ id: lead._id, payload: { [field]: html } }, {
      onSuccess: () => done(),
      onSettled: () => setSavingField(null),
    });
  };

  const assignedValue = currentAssignedId ? String(currentAssignedId) : "unassigned";
  const meetingStatusValue = lead.meetingStatus || "pending";
  const statusLocked = lead.meetingStatus === "completed" || isConverted;

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 pb-12 sm:p-6 lg:p-8">

      {/* ── HEADER ── */}
      <div className="mb-6 flex flex-col gap-3 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{lead.institutionName || lead.adminName}</h1>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <span className={status.text}>{status.label}</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Demo request #{lead._id.slice(-6).toUpperCase()} · sent on {formatDate(lead.createdAt, "dd MMM yyyy, hh:mm a")}
        </p>
        <TooltipProvider delay={200}>
          {assignedAdmin ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex w-fit cursor-default items-center gap-2">
                  <Initial name={assignedAdmin.name} photo={personPhoto(assignedAdmin)} size="h-7 w-7" />
                  <span className="text-sm font-medium text-foreground">{assignedAdmin.name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="flex flex-col items-start gap-0.5 py-2">
                <span className="text-sm font-semibold">Assigned to {assignedAdmin.name}</span>
                {lead.assignedAt && <span className="text-xs opacity-70">on {formatDate(lead.assignedAt, "dd MMM yyyy, hh:mm a")}</span>}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Not assigned yet
            </span>
          )}
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

        {/* LEFT: what the form sent */}
        <div className="space-y-6 xl:col-span-8">
          <Section title="Contact" description="The person who filled in the form">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Name">{lead.adminName || "—"}</Field>
              <Field label="Role / job title">{lead.role || "—"}</Field>
              <Field label="Work email">
                <a href={`mailto:${lead.adminEmail}`} className="inline-flex max-w-full items-center gap-1.5 text-foreground underline-offset-2 hover:underline">
                  <Mail size={14} className="shrink-0 text-muted-foreground" /><span className="break-all">{lead.adminEmail}</span>
                </a>
              </Field>
              <Field label="Phone">
                {lead.adminPhone ? (
                  <a href={`tel:${lead.adminPhone}`} className="inline-flex items-center gap-1.5 text-foreground underline-offset-2 hover:underline">
                    <Phone size={14} className="shrink-0 text-muted-foreground" />{lead.adminPhone}
                  </a>
                ) : "—"}
              </Field>
            </div>
          </Section>

          <Section title="Company">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Company">{lead.institutionName || "—"}</Field>
              <Field label="Team size">{lead.teamSize ? `${lead.teamSize} people` : "—"}</Field>
              <Field label="Wants Classgrid AI for">{lead.useCase || "—"}</Field>
              <Field label="Website">
                {websiteHref ? (
                  <a href={websiteHref} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-start gap-1.5 text-foreground underline-offset-2 hover:underline">
                    <Globe size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="break-all">{lead.website}</span>
                    <ExternalLink size={12} className="mt-1 shrink-0 text-muted-foreground" />
                  </a>
                ) : "—"}
              </Field>
            </div>
          </Section>

          <Section title="Message">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {lead.message || <span className="text-muted-foreground">No message.</span>}
            </p>
          </Section>
        </div>

        {/* RIGHT: meeting and follow-up */}
        <div className="space-y-6 xl:col-span-4">
          <Section
            title="Meeting"
            action={!isEditingMeeting && date ? (
              lead.meetingStatus === "completed" ? (
                <Badge variant="neutral" className="shrink-0">Completed</Badge>
              ) : (
                <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => setIsEditingMeeting(true)}>Change</Button>
              )
            ) : undefined}
          >
            {!isEditingMeeting && date ? (
              <div className="space-y-4">
                <Field label="Date and time">
                  <span className="font-medium">{formatDate(date.toISOString(), "dd MMMM yyyy, hh:mm a")}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">Asia/Kolkata (IST)</span>
                </Field>
                <Field label="Google Meet link">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <span className="min-w-0 truncate text-sm">{meetingUrl || "No link yet"}</span>
                    {meetingUrl && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" aria-label="Copy link" title={copied ? "Copied" : "Copy link"}>
                          <Copy size={13} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => window.open(meetingUrl, "_blank", "noopener")} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" aria-label="Open link" title="Open link">
                          <ExternalLink size={13} />
                        </Button>
                      </div>
                    )}
                  </div>
                </Field>
                {isPastMeeting && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>This meeting time has passed. Set its status below.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">{date ? "Date and time" : "Pick a date and time"}</div>
                  <NikhilTimeCalendar value={date} onChange={setDate} />
                  {date && <p className="mt-2 pl-1 text-[11px] text-muted-foreground">Asia/Kolkata (IST)</p>}
                  {isPastMeeting && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>This time is in the past.</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">Google Meet link</div>
                  <Input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" />
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 flex-1 text-xs" disabled={!meetingUrl}>
                      <Copy size={12} className="mr-1.5" />
                      {copied ? "Copied" : "Copy link"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(meetingUrl, "_blank", "noopener")} className="h-8 flex-1 text-xs" disabled={!meetingUrl}>
                      <ExternalLink size={12} className="mr-1.5" />
                      Open
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-border pt-4">
                  {hadMeeting && (
                    <Button onClick={cancelMeetingEdit} variant="outline" className="h-9 flex-1">Cancel</Button>
                  )}
                  <Button onClick={handleSchedule} disabled={scheduleMutation.isPending} variant="primary" className="h-9 flex-1">
                    {scheduleMutation.isPending ? "Saving" : hadMeeting ? "Move meeting" : "Save meeting"}
                  </Button>
                </div>
              </div>
            )}
          </Section>

          <Section title="Follow-up">
            <div className="space-y-5">
              <div>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">Assigned to</div>
                {!!currentAssignedId && lead.meetingStatus !== "rescheduled" ? (
                  // Kept with the person who took it, until the meeting is moved
                  <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                    <Initial name={assignedAdmin?.name} photo={personPhoto(assignedAdmin)} />
                    <span className="min-w-0 truncate font-medium text-foreground">{assignedAdmin?.name || currentAssignedId}</span>
                    <Badge variant="outline" className="ml-auto shrink-0 text-muted-foreground">Locked</Badge>
                  </div>
                ) : (
                  <Select
                    value={assignedValue}
                    onValueChange={(val) => updateNotesMutation.mutate({ id: lead._id, payload: { assignedTo: val && val !== "unassigned" ? val : null } })}
                  >
                    <SelectTrigger className="h-10 w-full bg-background">
                      <SelectValue placeholder="Not assigned">
                        {() => {
                          if (assignedValue === "unassigned") return "Not assigned";
                          return superAdmins.find((a: any) => String(a._id) === assignedValue)?.name || "Unknown team member";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Not assigned</SelectItem>
                      {superAdmins.map((admin: any) => (
                        <SelectItem key={String(admin._id)} value={String(admin._id)}>
                          <div className="flex items-center gap-2">
                            <Initial name={admin.name} photo={personPhoto(admin)} size="h-5 w-5" />
                            <span>{admin.name || "Unknown team member"}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">Meeting status</div>
                <Select
                  value={meetingStatusValue}
                  disabled={statusLocked}
                  onValueChange={(val) => { if (val) updateNotesMutation.mutate({ id: lead._id, payload: { meetingStatus: val } }); }}
                >
                  <SelectTrigger className="h-10 w-full bg-background">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                      <span className={`font-medium ${status.text}`}>{status.label}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {meetingStatusValue === "scheduled" && <SelectItem value="scheduled">Scheduled</SelectItem>}
                    {MEETING_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {statusLocked && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {isConverted ? "This lead is converted, so its status is final." : "The meeting is completed, so its status is final."}
                  </p>
                )}
              </div>
            </div>
          </Section>

          <Button
            variant="outline"
            className="h-10 w-full border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
            disabled={deleteMutation.isPending}
            onClick={() => setShowDeleteConfirm(true)}
          >
            {deleteMutation.isPending ? "Deleting" : "Delete lead"}
          </Button>
        </div>
      </div>

      {/* Notes and review, full width */}
      <div className="mt-6 flex flex-col gap-6">
        <NotesSection
          title="Meeting notes"
          emptyText="No meeting notes yet."
          placeholder="What was said in the meeting"
          html={lead.meetingNotes || ""}
          saving={savingField === "meetingNotes"}
          onSave={saveNotes("meetingNotes")}
        />
        <NotesSection
          title="Final demo review"
          emptyText="No review yet."
          placeholder="How the demo went and what happens next"
          html={lead.demoReview || ""}
          saving={savingField === "demoReview"}
          onSave={saveNotes("demoReview")}
        />
      </div>

      <DangerConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete demo lead"
        description={<>Permanently delete the demo lead from <strong>{lead.adminName}</strong>{lead.institutionName ? <> ({lead.institutionName})</> : null}.</>}
        warningMessage="This cannot be undone. Everything saved for this demo request is lost."
        confirmationSteps={[
          {
            label: "To confirm, type",
            value: "delete",
          },
        ]}
        actionLabel="Delete lead"
        cancelLabel="Cancel"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (id) {
            deleteMutation.mutate(id, {
              onSuccess: () => navigate("/superadmin/leads"),
              onError: () => setShowDeleteConfirm(false)
            });
          }
        }}
        variant="danger"
      />
    </div>
  );
}
