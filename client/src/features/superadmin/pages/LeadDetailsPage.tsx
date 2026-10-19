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
import { useState, useEffect } from "react";
import {
  Building2, User, MapPin, Globe, MessageSquare,
  Copy, ExternalLink, AlertTriangle, CheckCircle2, Users
} from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Badge } from "@/components/marketing_ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/marketing_ui/tooltip";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/marketing_ui/select";
import { Textarea } from "@/components/marketing_ui/textarea";
import { Checkbox } from "@/components/marketing_ui/checkbox";
import { Spinner } from "@/components/marketing_ui/spinner";
import { useLeads, useApproveLead, useScheduleMeeting, useDeleteLead, useRegenerateActivation, useUpdateLeadNotes, useRequestVettingApproval } from "../queries/useLeads";
import { useAllUsers } from "../queries/useUsers";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { formatDate } from "@/utils/dateUtils";
import { formatOrgType } from "@/utils/orgHelpers";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { toast } from "sonner";
import { SandboxProvisioningWizard } from "../components/SandboxProvisioningWizard";
import RichReplyEditor from "@/app/support/components/RichReplyEditor";
import { getSocket } from "@/lib/socketClient";

export function LeadDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = useLeads();
  const { data: usersData } = useAllUsers();
  const { data: user } = useCurrentUser();
  const scheduleMutation = useScheduleMeeting();
  const deleteMutation = useDeleteLead();
  const regenerateMutation = useRegenerateActivation();
  const updateNotesMutation = useUpdateLeadNotes();
  const requestVettingMutation = useRequestVettingApproval();
  const navigate = useNavigate();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [provisionedData, setProvisionedData] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showProvisioningWizard, setShowProvisioningWizard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditingMeetingNotes, setIsEditingMeetingNotes] = useState(false);
  const [isEditingDemoReview, setIsEditingDemoReview] = useState(false);

  const lead = data?.leads.find(l => l._id === id);
  const allUsers = (Array.isArray(usersData) ? usersData : usersData?.users || []) || [];
  let superAdmins = allUsers.filter((u: any) => u.role === 'super_admin' || u.role === 'co_super_admin') || [];
  
  // If the lead is already assigned to someone, ensure they are in the list so the dropdown renders their name properly
  const currentAssignedId = typeof lead?.assignedTo === 'string' ? lead.assignedTo : lead?.assignedTo?._id;
  if (currentAssignedId) {
    const isAlreadyInList = superAdmins.some((admin: any) => admin._id === currentAssignedId);
    if (!isAlreadyInList) {
      const foundUser = allUsers.find((u: any) => u._id === currentAssignedId);
      if (foundUser) {
        superAdmins = [foundUser, ...superAdmins];
      } else if (typeof lead?.assignedTo === 'object' && lead.assignedTo !== null) {
        superAdmins = [lead.assignedTo, ...superAdmins];
      } else {
        superAdmins = [{ _id: currentAssignedId, name: "Unknown Admin" }, ...superAdmins];
      }
    }
  }
  const assignedAdminObj = typeof lead?.assignedTo === 'object' ? lead.assignedTo : null;
  const assignedAdmin = superAdmins.find((a: any) => String(a._id) === String(currentAssignedId)) || assignedAdminObj;
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);

  useEffect(() => {
    if (lead) {
      setBreadcrumbs([
        { label: "Demo Leads", href: "/superadmin/leads" },
        { label: lead.institutionName, href: `/superadmin/leads/${id}` }
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, lead, id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("superadmin:leads_updated", () => {
      refetch();
    });

    return () => {
      socket.off("superadmin:leads_updated");
    };
  }, [refetch]);

  useEffect(() => {
    const meetDate = lead?.meetingScheduledAt || lead?.scheduledAt;
    if (meetDate) {
      setDate(new Date(meetDate));
    }
    if (lead?.meetingUrl) {
      setMeetingUrl(lead.meetingUrl);
    }
  }, [lead]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto pb-12 w-full animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8">
          <div className="flex flex-col gap-3">
            <div className="h-8 w-64 bg-muted rounded-md" />
            <div className="h-4 w-48 bg-muted rounded-md" />
            <div className="h-4 w-56 bg-muted rounded-md" />
            <div className="mt-4 h-8 w-8 bg-muted rounded-full" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-24 bg-muted rounded-md" />
            <div className="h-9 w-24 bg-muted rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column Skeleton */}
          <div className="xl:col-span-8 space-y-6">
            <div className="h-48 bg-card border rounded-xl" />
            <div className="h-64 bg-card border rounded-xl" />
            <div className="h-56 bg-card border rounded-xl" />
          </div>
          {/* Right Column Skeleton */}
          <div className="xl:col-span-4 space-y-6">
            <div className="h-80 bg-card border rounded-xl" />
            <div className="h-64 bg-card border rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  if (!lead) return <div className="p-8 text-center text-rose-500 font-medium">Lead not found</div>;

  const isConverted = lead.status === "converted";

  let statusText = "● Pending";
  let statusClasses = "bg-muted border-border text-foreground";

  if (lead.status === "converted") {
    statusText = "● Provisioned";
    statusClasses = "bg-emerald-100 text-emerald-800 border-emerald-200";
  } else if (lead.status === "contacted" || lead.meetingStatus === "scheduled" || !!lead.assignedTo) {
    statusText = "● Contacted";
    statusClasses = "bg-blue-100 text-blue-800 border-blue-200";
  } else if (lead.status === "closed") {
    statusText = "● Closed";
    statusClasses = "bg-gray-100 text-gray-800 border-gray-200";
  }



  const handleSchedule = () => {
    if (!id) return;
    if (!date) return toast.error("Please select a date");
    if (!meetingUrl) return toast.error("Please enter a meeting link");
    
    toast.loading("Rescheduling meeting...", { id: "schedule-meet" });
    
    scheduleMutation.mutate({
      id,
      scheduledAt: date.toISOString(),
      meetingUrl,
      provider: "google_meet"
    }, {
      onSuccess: () => {
        toast.success("Meeting rescheduled successfully!", { id: "schedule-meet" });
        setIsEditingMeeting(false);
      },
      onError: (err: any) => toast.error(err?.message || "Failed to update meeting", { id: "schedule-meet" })
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    toast.success("Meeting link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Warning if meeting was in the past
  const isPastMeeting = date && date < new Date() && !isConverted;

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 pb-12">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-6 mb-8">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{lead.institutionName}</h1>
            <Badge variant={isConverted ? "success" : "neutral"} className={`text-xs px-2.5 py-0.5 rounded-full ${statusClasses}`}>
              {statusText}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
            <span>{formatOrgType(lead.orgType)}</span>
            <span>&middot;</span>
            <span>Demo Request #{lead._id.slice(-6).toUpperCase()}</span>
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Submitted on {formatDate(lead.createdAt, "dd MMM yyyy, hh:mm a")}
          </p>
          <div className="mt-4">
            <TooltipProvider>
              {!lead.assignedTo ? (
                <Tooltip delay={200}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center h-8 w-8 bg-muted/40 border border-border/50 rounded-full cursor-default hover:bg-muted/80 transition-colors">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Unassigned (Needs Attention)</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip delay={200}>
                  <TooltipTrigger asChild>
                    <div className="flex w-fit items-center gap-2 cursor-default hover:opacity-80 transition-opacity">
                      <div className="relative flex items-center justify-center h-8 w-8 rounded-full border border-border/50">
                        {/* Green Dot Indicator */}
                        <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background z-10" />

                        {/* Photo or Fallback Initial */}
                        {(lead.assignedTo as any).avatarUrl || (lead.assignedTo as any).profilePicture || (lead.assignedTo as any).picture ? (
                          <img src={(lead.assignedTo as any).avatarUrl || (lead.assignedTo as any).profilePicture || (lead.assignedTo as any).picture} alt={lead.assignedTo.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <div className="h-full w-full rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                            {lead.assignedTo.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground">{lead.assignedTo.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="flex flex-col items-start gap-0.5 py-2">
                    <span className="font-semibold text-sm">Assigned to {lead.assignedTo.name}</span>
                    {lead.assignedAt && <span className="text-xs opacity-70">on {formatDate(lead.assignedAt, "dd MMM yyyy, hh:mm a")}</span>}
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* ── 12-COLUMN GRID ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* LEFT CONTENT (col-span-8) */}
        <div className="xl:col-span-8 space-y-6">

          {/* INSTITUTION DETAILS */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-5 py-4 border-b">
              <h2 className="font-semibold text-card-foreground">INSTITUTION DETAILS</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Basic information about the organization</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Institution Name</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm font-medium">
                  {lead.institutionName}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Organization Type</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm">
                  {formatOrgType(lead.orgType)}
                </div>
              </div>
            </div>
          </div>

          {/* CONTACT PERSON */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-5 py-4 border-b">
              <h2 className="font-semibold text-card-foreground">CONTACT PERSON</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Primary person responsible for this request</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contact Person Name</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm font-medium flex items-center gap-2">
                  <User size={14} className="text-muted-foreground" />
                  {lead.adminName}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Role</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm">
                  {lead.role || "Administrator"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email Address</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm">
                  <a href={`mailto:${lead.adminEmail}`} className="text-primary hover:underline">{lead.adminEmail}</a>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Phone Number</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm">
                  {lead.adminPhone || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* LOCATION */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-5 py-4 border-b">
              <h2 className="font-semibold text-card-foreground">LOCATION</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Institution's registered location</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">State</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground" />
                  {lead.state || "—"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">District</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm">
                  {lead.district || "—"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Taluka</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm">
                  {lead.taluka || "—"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">City / Village</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm">
                  {lead.cityVillage || lead.city || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* ADDITIONAL INFORMATION */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-5 py-4 border-b">
              <h2 className="font-semibold text-card-foreground">ADDITIONAL INFORMATION</h2>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Website</label>
                <div className="border rounded-lg px-3 py-2.5 bg-background text-sm">
                  {lead.website ? (
                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-start gap-1.5 break-all">
                      <Globe size={14} className="shrink-0 mt-0.5" />
                      {lead.website}
                      <ExternalLink size={12} className="ml-1 shrink-0 mt-0.5" />
                    </a>
                  ) : "—"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Message</label>
                <div className="border rounded-lg px-3 py-3 bg-background text-sm min-h-[100px] whitespace-pre-wrap leading-relaxed">
                  {lead.message || "No message provided."}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT SIDEBAR (col-span-4) */}
        <div className="xl:col-span-4 space-y-6">
          <div className="sticky top-6 space-y-6">

            {/* MEETING MANAGEMENT */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-muted/30 px-5 py-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-card-foreground">MEETING MANAGEMENT</h2>
                {(!isEditingMeeting && date) && (
                  lead.meetingStatus === "completed" ? (
                    <Badge variant="success" className="h-8 text-xs font-semibold px-4 rounded-full">Meeting Completed</Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingMeeting(true)} className="h-8 text-xs font-semibold px-4 rounded-full border-border hover:bg-accent/50 text-foreground transition-all duration-300">
                      Change
                    </Button>
                  )
                )}
              </div>
              <div className="p-5 space-y-5">
                {/* View Mode */}
                {!isEditingMeeting && date ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Scheduled Date & Time</label>
                      <div className="font-medium text-foreground">
                        {formatDate(date.toISOString(), "dd MMMM yyyy, hh:mm a")}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Asia/Kolkata &middot; IST</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Google Meet Link</label>
                      <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-background">
                        <span className="text-sm truncate mr-2">{meetingUrl || "No link provided"}</span>
                        {meetingUrl && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                              <Copy size={12} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => window.open(meetingUrl, "_blank")} className="h-6 w-6 p-0 text-primary hover:text-primary/80">
                              <ExternalLink size={12} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {isPastMeeting && (
                      <div className="mt-3 flex items-start gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-2.5 rounded-lg text-xs">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>⚠ This meeting was scheduled for the past.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Edit Mode */
                  <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        {date ? "Update Date & Time" : "Set Date & Time"}
                      </label>
                      <NikhilTimeCalendar value={date} onChange={setDate} />
                      {date && (
                        <p className="text-[11px] text-muted-foreground mt-2 pl-1">
                          Asia/Kolkata &middot; IST
                        </p>
                      )}
                      {isPastMeeting && (
                        <div className="mt-3 flex items-start gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-2.5 rounded-lg text-xs">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                          <span>⚠ This meeting was scheduled for the past.</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Google Meet Link</label>
                      <div className="relative">
                        <Input
                          value={meetingUrl}
                          onChange={e => setMeetingUrl(e.target.value)}
                          placeholder="https://meet.google.com/..."
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-7 text-xs flex-1" disabled={!meetingUrl}>
                          <Copy size={12} className="mr-1.5" />
                          {copied ? "Copied" : "Copy link"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(meetingUrl, "_blank")} className="h-7 text-xs flex-1" disabled={!meetingUrl}>
                          <ExternalLink size={12} className="mr-1.5" />
                          Open ↗
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center gap-2">
                      {date && (
                        <Button onClick={() => {
                          setIsEditingMeeting(false);
                          // Reset state back to original
                          const meetDate = lead?.meetingScheduledAt || lead?.scheduledAt;
                          if (meetDate) setDate(new Date(meetDate));
                          if (lead?.meetingUrl) setMeetingUrl(lead.meetingUrl);
                        }} variant="outline" className="h-9 flex-1">
                          Cancel
                        </Button>
                      )}
                      <Button onClick={handleSchedule} disabled={scheduleMutation.isPending} variant="secondary" className="w-full h-9 flex-1">
                        {scheduleMutation.isPending ? "Rescheduling..." : "Reschedule"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* APPROVAL AREA */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              {provisionedData || isConverted ? (
                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold mb-3">
                    <CheckCircle2 size={18} />
                    Organization Provisioned
                  </div>
                  <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80 mb-4">
                    Provisioned on {formatDate(lead.updatedAt || new Date().toISOString(), "dd MMM yyyy")}
                  </p>

                  {provisionedData && (
                    <div className="mb-4 space-y-3 bg-white dark:bg-black/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-emerald-700/60 mb-0.5">Activation Link</div>
                        <code className="text-[11px] block break-all text-emerald-900 dark:text-emerald-200">
                          {provisionedData.activationLink}
                        </code>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-emerald-700/60 mb-0.5">6-Digit Code</div>
                        <code className="text-lg font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-400">
                          {provisionedData.activationCode}
                        </code>
                      </div>
                    </div>
                  )}

                  <Button className="w-full mb-2" variant="primary" onClick={() => window.open(`/superadmin/detail/${lead?.provisionedOrganizationId || provisionedData?.orgId || provisionedData?.orgName || 'unknown'}`, '_self')}>
                    View Organization Details &rarr;
                  </Button>

                  {!provisionedData && !["activated", "setup", "live"].includes(lead.lifecycleStage || "") && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={regenerateMutation.isPending}
                      onClick={() => {
                        regenerateMutation.mutate(id!, {
                          onSuccess: (res: any) => {
                            if (res?.activation) {
                              setProvisionedData({
                                activationLink: res.activation.activationLink,
                                activationCode: res.activation.activationCode
                              });
                              toast.success("New activation link generated!");
                            }
                          },
                          onError: (err: any) => toast.error(err?.message || "Failed to generate link")
                        });
                      }}
                    >
                      {regenerateMutation.isPending ? "Sending..." : "Resend Activation Link"}
                    </Button>
                  )}

                  {["activated", "setup", "live"].includes(lead.lifecycleStage || "") && (
                    <div className="mt-2 text-center text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      ✓ Sandbox Activated
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5">
                  <h2 className="font-semibold text-card-foreground mb-2">APPROVAL CHECKLIST</h2>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {!!lead.assignedTo ? <CheckCircle2 size={14} className="text-emerald-500" /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />}
                      Contact reviewed
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {date && meetingUrl ? <CheckCircle2 size={14} className="text-emerald-500" /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />}
                      Meeting scheduled
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!lead) return;
                        const newVetted = !lead.isOrganizationVetted;
                        setLead({ ...lead, isOrganizationVetted: newVetted });
                        try {
                          await leadsApi.updateMeetingNotes(lead._id, { isOrganizationVetted: newVetted });
                          toast.success(newVetted ? "Organization vetted & approved" : "Organization vetting reset");
                        } catch (err) {
                          setLead({ ...lead, isOrganizationVetted: !newVetted });
                          toast.error("Failed to update vetting status");
                        }
                      }}
                      className="flex items-center gap-2 text-sm text-card-foreground hover:text-emerald-500 transition cursor-pointer text-left w-full select-none py-1 group"
                    >
                      {lead.isOrganizationVetted ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0 group-hover:border-emerald-500 transition" />
                      )}
                      <span className={lead.isOrganizationVetted ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-normal text-muted-foreground"}>
                        Organization vetted & approved
                      </span>
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground mb-4">
                    Provisioning creates the organization and administrator account. This action requires confirmation.
                  </p>

                  <button
                    onClick={() => setShowProvisioningWizard(true)}
                    disabled={!lead.isOrganizationVetted}
                    className={`
                      min-h-14 w-full rounded-xl
                      px-5 text-sm font-bold transition
                      ${lead.isOrganizationVetted
                        ? 'bg-emerald-500 text-emerald-950 shadow-[0_10px_30px_rgba(16,185,129,0.22)] hover:bg-emerald-400 active:scale-[0.99] cursor-pointer'
                        : 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'}
                    `}
                  >
                    PROVISION SANDBOX WIZARD
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-red-500/20 border-t mt-4">
              <Button
                variant="destructive"
                className="w-full h-12 rounded-xl text-sm font-bold"
                disabled={deleteMutation.isPending}
                onClick={() => setShowDeleteConfirm(true)}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Lead"}
              </Button>
            </div>

          </div>
        </div>
      </div>

      {/* ── NEW COMPACT MANAGEMENT SECTION ── */}
      <div className="mt-10 w-full">
        <h2 className="font-bold text-foreground text-xl mb-6 px-1 flex items-center gap-2">
          Lead Management & Status
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* LEFT: Assignment & Status */}
          <div className="lg:col-span-1 space-y-6">

            {/* Assignment Handoff */}
            <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-3">
                <Users size={16} className="text-muted-foreground" /> Assignment Handoff
              </h3>
              <div className="flex gap-2 w-full">
                {!!currentAssignedId && lead.meetingStatus !== 'rescheduled' ? (
                  <div className="flex items-center gap-3 px-3 py-2 border rounded-md bg-muted/30 w-full text-sm">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-border bg-emerald-500">
                      {assignedAdmin?.avatarUrl || assignedAdmin?.profilePicture ? (
                        <img src={assignedAdmin.avatarUrl || assignedAdmin.profilePicture} alt={assignedAdmin.name || 'Admin'} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-[10px]">{(assignedAdmin?.name || 'Admin').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="font-medium text-foreground">{assignedAdmin?.name || currentAssignedId}</span>
                    <Badge variant="outline" className="ml-auto text-muted-foreground bg-muted">Locked</Badge>
                  </div>
                ) : (
                    <Select
                      value={typeof lead.assignedTo === 'string' ? lead.assignedTo : (lead.assignedTo?._id || '')}
                      onValueChange={(val) => updateNotesMutation.mutate({ id: lead._id, payload: { assignedTo: val || null } })}
                    >
                      <SelectTrigger className="flex-1 bg-background h-10 w-full">
                        <SelectValue placeholder="Unassigned">
                          {(() => {
                            const val = typeof lead.assignedTo === 'string' ? lead.assignedTo : (lead.assignedTo?._id || '');
                            if (!val) return "Unassigned";
                            const adminObj = superAdmins.find((a: any) => String(a._id) === String(val));
                            if (adminObj) {
                              return adminObj.name || "Unknown Admin";
                            }
                            return val;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {superAdmins.map((admin: any) => (
                          <SelectItem key={String(admin._id)} value={String(admin._id)}>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-border bg-emerald-500">
                                {admin.avatarUrl || admin.profilePicture ? (
                                  <img src={admin.avatarUrl || admin.profilePicture} alt={admin.name || 'Admin'} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white font-bold text-[9px]">{(admin.name || 'Admin').charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <span>{admin.name || "Unknown Admin"}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                )}
              </div>
            </div>

            {/* Status & Tracking */}
            <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-3">
                <AlertTriangle size={16} className="text-muted-foreground" /> Status & Tracking
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Meeting Status</label>
                  <Select
                    value={lead.meetingStatus || 'pending'}
                    disabled={lead.meetingStatus === "completed" || lead.status === "converted"}
                    onValueChange={(val) => updateNotesMutation.mutate({ id: lead._id, payload: { meetingStatus: val } })}
                  >
                    <SelectTrigger className="w-full h-10 bg-background">
                      <div className="flex items-center gap-2">
                        {lead.meetingStatus === "scheduled" ? (
                          <><span className="h-2 w-2 rounded-full bg-blue-500" /><span className="font-medium text-blue-500">Scheduled</span></>
                        ) : lead.meetingStatus === "completed" ? (
                          <><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="font-medium text-emerald-500">Completed</span></>
                        ) : lead.meetingStatus === "cancelled" ? (
                          <><span className="h-2 w-2 rounded-full bg-red-500" /><span className="font-medium text-red-500">Cancelled</span></>
                        ) : lead.meetingStatus === "rescheduled" ? (
                          <><span className="h-2 w-2 rounded-full bg-purple-500" /><span className="font-medium text-purple-500">Rescheduled</span></>
                        ) : lead.meetingStatus === "missed" ? (
                          <><span className="h-2 w-2 rounded-full bg-orange-500" /><span className="font-medium text-orange-500">Missed</span></>
                        ) : lead.meetingStatus === "closed" ? (
                          <><span className="h-2 w-2 rounded-full bg-gray-500" /><span className="font-medium text-gray-500">Closed</span></>
                        ) : (
                          <><span className={`h-2 w-2 rounded-full ${lead.assignedTo ? 'bg-blue-500' : 'bg-yellow-500'}`} /><span className={`font-medium ${lead.assignedTo ? 'text-blue-500' : 'text-yellow-500'}`}>{lead.assignedTo ? 'Contacted' : 'Pending'}</span></>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${lead.assignedTo ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                          <span className={`font-medium ${lead.assignedTo ? 'text-blue-500' : 'text-yellow-500'}`}>
                            {lead.assignedTo ? 'Contacted' : 'Pending'}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="font-medium text-emerald-500">Completed</span></div></SelectItem>
                      <SelectItem value="cancelled"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="font-medium text-red-500">Cancelled</span></div></SelectItem>
                      <SelectItem value="rescheduled"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-purple-500" /><span className="font-medium text-purple-500">Rescheduled</span></div></SelectItem>
                      <SelectItem value="missed"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" /><span className="font-medium text-orange-500">Missed</span></div></SelectItem>
                      <SelectItem value="closed"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-gray-500" /><span className="font-medium text-gray-500">Closed</span></div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Vetted Checkbox Card */}
            <div 
              className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                (lead.meetingStatus !== 'completed' || lead.isOrganizationVetted)
                ? 'border-muted opacity-70 cursor-not-allowed' 
                : 'border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer'
              }`}
              onClick={() => {
                if (updateNotesMutation.isPending || requestVettingMutation.isPending || lead.meetingStatus !== 'completed' || lead.isOrganizationVetted) {
                  if (lead.meetingStatus !== 'completed') {
                    toast.error("Meeting must be 'Completed' first.");
                  } else if (lead.isOrganizationVetted) {
                    toast.error("Already vetted. Cannot be undone.");
                  }
                  return;
                }
                
                // Only Nikhil can actually check/uncheck it
                if (user?.email?.toLowerCase() === 'nikhil.shinde@classgrid.in') {
                  updateNotesMutation.mutate({ id: lead._id, payload: { isOrganizationVetted: true } });
                  toast.success("Organization vetted & approved");
                } else {
                  // Anyone else requesting approval
                  if (lead.isOrganizationVetted) {
                    toast.error("Already vetted by Nikhil.");
                  } else {
                    requestVettingMutation.mutate(lead._id);
                  }
                }
              }}
            >
              <Checkbox 
                checked={lead.isOrganizationVetted || false} 
                className="mt-1 shrink-0" 
                disabled={lead.meetingStatus !== 'completed' || lead.isOrganizationVetted}
              />
              <div>
                <p className="text-sm font-bold text-foreground">Organization Vetted & Approved</p>
                <p className="text-xs text-muted-foreground mt-0.5">Required to unlock sandbox provisioning wizard.</p>
              </div>
            </div>

          </div>

          {/* MIDDLE: Discovery */}
          <div className="lg:col-span-1 bg-card border rounded-2xl p-5 shadow-sm h-fit space-y-5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-3">
              <CheckCircle2 size={16} className="text-muted-foreground" /> Discovery & Requirements
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Student Count</label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  defaultValue={lead.studentCount || ''}
                  onBlur={(e) => updateNotesMutation.mutate({ id: lead._id, payload: { studentCount: parseInt(e.target.value) || null } })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                  className="bg-background h-10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Staff/Teacher Count</label>
                <Input
                  type="number"
                  placeholder="e.g. 50"
                  defaultValue={lead.staffCount || ''}
                  onBlur={(e) => updateNotesMutation.mutate({ id: lead._id, payload: { staffCount: parseInt(e.target.value) || null } })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                  className="bg-background h-10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Campus Count</label>
                <Input
                  type="number"
                  placeholder="e.g. 1"
                  defaultValue={lead.campusCount || ''}
                  onBlur={(e) => updateNotesMutation.mutate({ id: lead._id, payload: { campusCount: parseInt(e.target.value) || null } })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                  className="bg-background h-10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Current System</label>
                <Select
                  value={lead.currentSystem || ''}
                  onValueChange={(val) => updateNotesMutation.mutate({ id: lead._id, payload: { currentSystem: val || null } })}
                >
                  <SelectTrigger className="w-full h-10 bg-background">
                    <SelectValue placeholder="Select System" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select System</SelectItem>
                    <SelectItem value="excel">Excel / Spreadsheets</SelectItem>
                    <SelectItem value="manual_registers">Manual Registers</SelectItem>
                    <SelectItem value="other_erp">Other ERP</SelectItem>
                    <SelectItem value="no_system">No System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* BOTTOM ROWS: Notes & Reviews (Full Width) */}
      <div className="flex flex-col gap-6">

        {/* Meeting Notes */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col h-fit w-full">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Copy size={16} className="text-muted-foreground" /> Meeting Notes
            </h3>
            <Button variant="outline" size="sm" className="h-7 px-3 text-xs rounded-full font-semibold" onClick={() => setIsEditingMeetingNotes(!isEditingMeetingNotes)}>
              {isEditingMeetingNotes ? "Save Notes" : "Edit"}
            </Button>
          </div>

          {isEditingMeetingNotes ? (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <RichReplyEditor
                initialHtml={lead.meetingNotes || ''}
                onChange={(html) => updateNotesMutation.mutate({ id: lead._id, payload: { meetingNotes: html } })}
                placeholder="Enter detailed meeting notes..."
                hideAttachments={true}
                minHeight={150}
              />
            </div>
          ) : (
            <div
              className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none p-3 -mx-3 rounded-xl transition-colors min-h-[100px] border border-transparent"
              dangerouslySetInnerHTML={{ __html: lead.meetingNotes || '<span class="text-muted-foreground italic">No meeting notes added.</span>' }}
            />
          )}
        </div>

        {/* Final Demo Review */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col h-fit w-full">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Copy size={16} className="text-muted-foreground" /> Final Demo Review
            </h3>
            <Button variant="outline" size="sm" className="h-7 px-3 text-xs rounded-full font-semibold" onClick={() => setIsEditingDemoReview(!isEditingDemoReview)}>
              {isEditingDemoReview ? "Save Review" : "Edit"}
            </Button>
          </div>

          {isEditingDemoReview ? (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <RichReplyEditor
                initialHtml={lead.demoReview || ''}
                onChange={(html) => updateNotesMutation.mutate({ id: lead._id, payload: { demoReview: html } })}
                placeholder="Enter final review..."
                hideAttachments={true}
                minHeight={150}
              />
            </div>
          ) : (
            <div
              className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none p-3 -mx-3 rounded-xl transition-colors min-h-[100px] border border-transparent"
              dangerouslySetInnerHTML={{ __html: lead.demoReview || '<span class="text-muted-foreground italic">No review added.</span>' }}
            />
          )}
        </div>

      </div>

      {/* ── PROVISIONING WIZARD ── */ }
  {
    showProvisioningWizard && (
      <SandboxProvisioningWizard
        lead={lead}
        onClose={() => setShowProvisioningWizard(false)}
        onSuccess={(result) => {
          setShowProvisioningWizard(false);
          const orgName = result?.organization?.name || "unknown";
          const orgId = result?.organization?._id;

          // Auto redirect to the org details page immediately
          navigate(`/superadmin/detail/${orgId}`);
        }}
      />
    )
  }

  <DangerConfirmDialog
    open={showDeleteConfirm}
    onOpenChange={setShowDeleteConfirm}
    title="Delete Demo Lead"
    description={<>Permanently delete the demo lead for <strong>{lead.institutionName}</strong>.</>}
    warningMessage="This action is irreversible. All details associated with this demo request will be permanently lost."
    confirmationSteps={[
      {
        label: "To confirm, type",
        value: "delete",
      },
    ]}
    actionLabel="Delete Lead"
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

    </div >
  );
}
