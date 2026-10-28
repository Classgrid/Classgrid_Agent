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

import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Filter,
  Send,
  ShieldCheck,
  BadgeCheck,
  Paperclip,
  Eye,
  Building2,
  Copy,
  ArrowLeft,
  FileText,
  Search,
  Calendar,
  X,
  Lock,
  Edit2,
} from "lucide-react";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { RecentActivityTable } from "@/components/marketing_ui/data-table";
import { Button } from "@/components/marketing_ui/button";
import { Switch } from "@/components/marketing_ui/switch";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/marketing_ui/alert-dialog";
import { SuperadminFilterBar } from "../components/SuperadminFilterBar";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/marketing_ui/tooltip";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { motion, AnimatePresence } from "framer-motion";

import { toast } from "sonner";
import { getSocket } from "@/lib/socketClient";
import RichReplyEditor from "@/app/support/components/RichReplyEditor";
import type { RichReplyEditorRef } from "@/app/support/components/RichReplyEditor";
import FilePreviewModal from "@/app/support/components/FilePreviewModal";
import type { FilePreviewSource } from "@/app/support/components/FilePreviewModal";
import {
  useReplyToTicket,
  useSupportTickets,
  useUpdateTicket,
  useDeleteTicket,
  useEditTicketReply,
  useTicketDraft,
  useSaveTicketDraft,
} from "../queries/useSupportTickets";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
} from "../services/superAdminApi";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TicketStatus,
  {
    label: string;
    variant: "success" | "warning" | "info" | "danger" | "neutral";
  }
> = {
  open: { label: "Open", variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  waiting_on_user: { label: "Awaiting your reply", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "neutral" },
  reopened: { label: "Reopened", variant: "info" },
};

const PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; variant: "danger" | "warning" | "info" | "neutral" }
> = {
  urgent: { label: "Urgent", variant: "danger" },
  critical: { label: "Critical", variant: "danger" },
  high: { label: "High", variant: "warning" },
  medium: { label: "Medium", variant: "info" },
  low: { label: "Low", variant: "neutral" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRelativeTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getRequester(ticket: SupportTicket) {
  return {
    name:
      ticket.submittedBy?.name ??
      ticket.submitterName ??
      ticket.name ??
      (ticket as any).createdBy?.name ??
      (ticket as any).author ??
      "Unknown",
    email:
      ticket.submittedBy?.email ??
      ticket.submitterEmail ??
      ticket.email ??
      (ticket as any).createdBy?.email ??
      "",
    role:
      ticket.submittedBy?.role ??
      (ticket as any).createdBy?.role ??
      (ticket as any).requester?.role ??
      (ticket as any).submitterRole ??
      "",
    profilePicture:
      ticket.submittedBy?.profilePicture ??
      (ticket as any).createdBy?.profilePicture ??
      (ticket as any).requester?.profilePicture ??
      (ticket as any).profilePicture ??
      "",
  };
}

function isPlatformUser(ticket: SupportTicket) {
  return ticket.isPlatformUser ?? !!ticket.submittedBy;
}

function getConversation(ticket: SupportTicket) {
  if (ticket.messages?.length) return ticket.messages;

  return [
    {
      author: getRequester(ticket).name,
      role: "user" as const,
      body: ticket.message,
      date: ticket.createdAt,
      footer: ticket.submitterEmail
        ? `Email: ${ticket.submitterEmail}`
        : "",
      attachments: (ticket as any).attachments || [],
    },
    ...(ticket.replies ?? []).map((reply) => ({
      _id: reply._id,
      author: reply.authorName,
      role:
        reply.authorRole === "super_admin" || reply.authorRole === "admin"
          ? ("admin" as const)
          : ("user" as const),
      body: reply.message,
      date: reply.createdAt,
      footer: "",
      attachments: (reply as any).attachments || [],
    })),
  ].filter((message) => message.body);
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTicketDate(dateString: string | Date) {
  const date = new Date(dateString);
  const currentYear = new Date().getFullYear();
  if (date.getFullYear() !== currentYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const avatarColors = [
  "bg-emerald-500",
  "bg-emerald-600",
  "bg-green-500",
  "bg-green-600",
  "bg-teal-500",
  "bg-teal-600",
];

function getAvatarColor(name: string) {
  if (!name) return "bg-emerald-500";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
}

function statusColor(status: string) {
  switch (status) {
    case "resolved":
    case "closed":
      return "bg-zinc-400";
    case "reopened":
      return "bg-indigo-500";
    case "open":
      return "bg-emerald-500"; // Green for Open
    case "in_progress":
      return "bg-amber-500";
    case "waiting_on_user":
      return "bg-red-500"; // Red for Waiting on User
    default:
      return "bg-zinc-400";
  }
}

function statusBadgeBg(status: string) {
  switch (status) {
    case "resolved":
      return "bg-zinc-500";
    case "closed":
      return "bg-zinc-600";
    case "in_progress":
      return "bg-amber-500";
    case "reopened":
      return "bg-indigo-500";
    case "open":
      return "bg-emerald-500"; // Green for Open
    case "waiting_on_user":
      return "bg-red-500"; // Red for Waiting on User
    default:
      return "bg-zinc-500";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "waiting_on_user":
      return "Awaiting your reply";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

// ── page ─────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Status: All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_user", label: "Awaiting your reply" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "reopened", label: "Reopened" },
];

const ORG_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Org Type: All" },
  { value: "school", label: "School" },
  { value: "junior_college", label: "Junior College" },
  { value: "engineering", label: "Engineering" },
  { value: "coaching", label: "Coaching" },
  { value: "diploma", label: "Diploma" },
  { value: "other", label: "Other" },
];

const STATUS_CHANGE_OPTIONS: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_on_user",
  "resolved",
  "closed",
];

const ticketCols = [
  { key: "requester", header: "Requester", width: "w-[200px]" },
  { key: "subject", header: "Subject" },
  { key: "status", header: "Status", width: "w-[110px]" },
  { key: "priority", header: "Priority", width: "w-[80px]" },
  { key: "assigned", header: "Assigned", width: "w-[140px]" },
  { key: "action", header: "", width: "w-[90px]" },
];

const CATEGORY_LABELS: Record<string, string> = {
  login: "Login & Authentication Issues",
  dashboard: "Dashboard Not Loading",
  profile: "Profile & Settings",
  attendance: "Attendance & Biometric",
  fee: "Fee Payment & Receipts",
  examination: "Examination & Results",
  timetable: "Timetable & Scheduling",
  assignments: "Assignments & Submissions",
  "live-classes": "Live Classes & Video",
  chat: "Chat & Notifications",
  admission: "Admission & Enrollment",
  library: "Library & Resources",
  documents: "Documents & Uploads",
  erp: "ERP Module Issues",
  ai: "AI Assistant",
  bug: "Bug Report",
  feature: "Feature Request",
  other: "Other",
  // Inquiries
  technical: "Technical Support / ERP / AI / API",
  billing: "Billing & Subscription",
  academics: "Academics / Attendance / Admissions",
  exams: "Examination Systems",
  communication: "Communication & Scheduling",
  finance: "HR & Payroll / Finance",
  getting_started: "Getting Started",
  account_security: "Account & Security",
  general: "General Inquiry",
};

export function SupportTicketsPage() {
  const { id: urlTicketIdParam } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTicketId = urlTicketIdParam || searchParams.get("ticketId") || undefined;
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [orgTypeFilter, setOrgTypeFilter] = useState("");
  const [orgNameFilter, setOrgNameFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );
  const [replyBody, setReplyBody] = useState("");
  const replyEditorRef = useRef<RichReplyEditorRef>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [previewFile, setPreviewFile] = useState<FilePreviewSource | null>(null);
  const [replySent, setReplySent] = useState(false);
  const replySentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);

  // New states for editing and confirmation
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const editEditorRef = useRef<RichReplyEditorRef>(null);
  const [sendEmailWithReply, setSendEmailWithReply] = useState(true);

  const { data: currentUser } = useCurrentUser();

  const { data: draftData, isLoading: isDraftLoading } = useTicketDraft(selectedTicket?._id || null);
  const saveDraftMutation = useSaveTicketDraft();
  const isSendingRef = useRef(false);
  const [isAiDraft, setIsAiDraft] = useState(false);

  const draftLoadedForTicketId = useRef<string | null>(null);

  // Load draft into editor when ticket changes or draft loads
  useEffect(() => {
    if (!selectedTicket || isDraftLoading) return;
    
    if (draftLoadedForTicketId.current === selectedTicket._id) return;

    if (draftData?.draft?.draftContent !== undefined) {
      const draftContent = draftData.draft.draftContent || "";
      let parsed = draftContent;
      try {
        const p = JSON.parse(draftContent);
        if (p.text || p.content) parsed = p.content || p.text;
      } catch(e) {}
      
      setReplyBody(parsed);
      replyEditorRef.current?.setHTML(parsed);
      setIsAiDraft(draftData.draft.source === "ai_generated");
      draftLoadedForTicketId.current = selectedTicket._id;
    } else {
      setReplyBody("");
      replyEditorRef.current?.clear();
      setIsAiDraft(false);
      draftLoadedForTicketId.current = selectedTicket._id;
    }
  }, [selectedTicket?._id, draftData?.draft?.draftContent, isDraftLoading]);

  // Debounced auto-save
  useEffect(() => {
    if (!selectedTicket || replyBody === undefined) return;
    
    // Prevent saving if the body matches the fetched draft
    let parsedDraft = draftData?.draft?.draftContent || "";
    try {
      const p = JSON.parse(parsedDraft);
      if (p.text || p.content) parsedDraft = p.content || p.text;
    } catch(e) {}
    
    if (replyBody === parsedDraft) return;

    const timer = setTimeout(() => {
      if (isSendingRef.current) return;
      saveDraftMutation.mutate({ id: selectedTicket._id, draftContent: replyBody });
      if (isAiDraft && replyBody !== parsedDraft) {
        setIsAiDraft(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [replyBody, selectedTicket?._id, draftData?.draft?.draftContent]);

  const { data, isLoading, isError, refetch, isFetching } = useSupportTickets({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    limit: 50,
    type: "support",
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    socket.on("support_ticket_created", () => refetch());
    socket.on("support_ticket_updated", () => refetch());
    return () => {
      socket.off("support_ticket_created");
      socket.off("support_ticket_updated");
    };
  }, [refetch]);

  const updateTicket = useUpdateTicket();
  const replyToTicket = useReplyToTicket();
  const deleteTicketMutation = useDeleteTicket();
  const editTicketReply = useEditTicketReply();

  const tickets = data?.tickets ?? [];
  const apiStats = data?.stats;

  const orgTypes = useMemo(() => {
    const types = new Set<string>();
    tickets.forEach((t) => {
      const type = (t as any).organization_id?.org_type;
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  }, [tickets]);

  const orgEntries = useMemo(() => {
    const map = new Map<string, string>();
    tickets.forEach((t) => {
      const name = (t as any).organization_id?.name || (t as any).institution;
      const logo = (t as any).organization_id?.logo_url || "";
      if (name && !map.has(name)) map.set(name, logo);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tickets]);

  const roles = useMemo(() => {
    const rs = new Set<string>();
    tickets.forEach((t) => {
      const role = t.submittedBy?.role;
      if (role) rs.add(role);
    });
    return Array.from(rs).sort();
  }, [tickets]);

  // Client-side search & date filtering
  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (orgTypeFilter) {
      result = result.filter((t) => {
        const type = (t as any).organization_id?.org_type;
        return type && type.toLowerCase() === orgTypeFilter.toLowerCase();
      });
    }

    if (orgNameFilter) {
      result = result.filter((t) => {
        const name = (t as any).organization_id?.name || (t as any).institution;
        return name === orgNameFilter;
      });
    }
    
    if (roleFilter) {
      result = result.filter((t) => t.submittedBy?.role === roleFilter);
    }

    if (userTypeFilter) {
      result = result.filter((t) =>
        userTypeFilter === "user" ? isPlatformUser(t) : !isPlatformUser(t)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/^#/, "");

      result = result.filter((t) => {
        const req = getRequester(t);
        const name = req.name.toLowerCase();
        const email = req.email.toLowerCase();
        const id = (t._id || "").toLowerCase();

        return (
          id.includes(cleanQ) ||
          name.includes(q) ||
          email.includes(q)
        );
      });
    }
    if (dateFrom) {
      // Filter for exact day
      const startOfDay = new Date(dateFrom);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFrom);
      endOfDay.setHours(23, 59, 59, 999);
      
      result = result.filter((t) => {
        const cDate = new Date(t.createdAt);
        const uDate = t.updatedAt ? new Date(t.updatedAt) : cDate;
        
        // Check if ticket was created or updated on this day
        if ((cDate >= startOfDay && cDate <= endOfDay) || 
            (uDate >= startOfDay && uDate <= endOfDay)) {
          return true;
        }

        // Also check if any reply was made on this day
        if (t.replies && Array.isArray(t.replies)) {
          return t.replies.some((r: any) => {
            const rDate = new Date(r.createdAt);
            return rDate >= startOfDay && rDate <= endOfDay;
          });
        }
        
        return false;
      });
    }

    if (priorityFilter) {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    
    if (statusFilter) {
      result = result.filter((t) => t.status === statusFilter);
    }

    return result;
  }, [tickets, searchQuery, dateFrom, orgTypeFilter, orgNameFilter, roleFilter, userTypeFilter, priorityFilter, statusFilter]);

  const displayStats = useMemo(
    () => ({
      open: apiStats?.open ?? 0,
      inProgress: apiStats?.inProgress ?? 0,
      resolved: apiStats?.resolved ?? 0,
      total: tickets.length,
    }),
    [apiStats, tickets.length]
  );

  const selectedRequester = selectedTicket
    ? getRequester(selectedTicket)
    : null;
  const selectedMessages = selectedTicket
    ? getConversation(selectedTicket)
    : [];

  // Sync selectedTicket when tickets data updates from a refresh
  useEffect(() => {
    if (selectedTicket && tickets.length > 0) {
      const freshTicket = tickets.find(t => t._id === selectedTicket._id);
      if (freshTicket && freshTicket.updatedAt !== selectedTicket.updatedAt) {
        setSelectedTicket(freshTicket);
      }
    }
  }, [tickets]);

  // Instantly jump to bottom when opening a ticket or when messages change
  useEffect(() => {
    if (selectedMessages.length) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    }
  }, [selectedTicket?._id, selectedMessages.length]);

  // Handle direct URL routing for a specific ticket
  useEffect(() => {
    if (urlTicketId && tickets.length > 0 && !selectedTicket) {
      const ticketToOpen = tickets.find((t) => t._id === urlTicketId);
      if (ticketToOpen) {
        setSelectedTicket(ticketToOpen);
        
        const autoAssign = searchParams.get("autoAssign") === "true";
        const currentAssigneeId = typeof ticketToOpen.assignedTo === 'object' ? (ticketToOpen.assignedTo as any)?._id : ticketToOpen.assignedTo;
        
        // Auto-assign if requested by URL AND it's not already assigned to the current user
        if (autoAssign && currentAssigneeId !== currentUser?._id && currentUser?._id) {
          updateTicket.mutate({
            id: ticketToOpen._id,
            assignedTo: currentUser._id
          }, {
            onSuccess: () => {
              toast.success("Ticket auto-assigned to you!");
            }
          });
          
          // Clear the param so it doesn't keep assigning on refresh
          searchParams.delete("autoAssign");
          setSearchParams(searchParams, { replace: true });
        } else if (!ticketToOpen.assignedTo && currentUser?._id) {
          // Fallback: auto-assign if unassigned
          updateTicket.mutate({
            id: ticketToOpen._id,
            assignedTo: currentUser._id
          }, {
            onSuccess: () => {
              toast.success("Ticket auto-assigned to you!");
            }
          });
        }
      } else {
        toast.error("Ticket not found or you don't have access to it.");
        navigate("/superadmin/support", { replace: true });
      }
    }
  }, [urlTicketId, tickets, selectedTicket, navigate, currentUser?._id, searchParams, setSearchParams]);

  const { setBreadcrumbs } = useBreadcrumbStore();

  useEffect(() => {
    if (selectedTicket) {
      const requesterName = getRequester(selectedTicket).name || "Unknown";
      setBreadcrumbs([
        { label: "Tickets", onClick: () => setSelectedTicket(null) },
        { label: requesterName }
      ]);
    } else {
      setBreadcrumbs([]);
    }
    return () => setBreadcrumbs([]);
  }, [selectedTicket, setBreadcrumbs]);

  const submitStatusChange = async () => {
    if (!selectedTicket || !pendingStatus) return;
    try {
      const result = await updateTicket.mutateAsync({
        id: selectedTicket._id,
        status: pendingStatus,
      });
      setSelectedTicket(result.ticket);
      setPendingStatus(null);
      refetch();
      toast.success(`Status changed to ${statusLabel(pendingStatus)}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const submitReply = async () => {
    const currentHTML = replyEditorRef.current?.getHTML() || "";
    const cleanText = currentHTML.replace(/<[^>]+>/g, "").trim();
    const files = replyEditorRef.current?.getFiles() || [];

    // Allow submission if there is text OR if there are files attached
    if (!selectedTicket || (!cleanText && files.length === 0)) return;

    try {
      const result = await replyToTicket.mutateAsync({
        id: selectedTicket._id,
        message: currentHTML,
        files: files.length > 0 ? files : undefined,
        sendEmail: sendEmailWithReply,
      });
      // Clear draft on successful send
      saveDraftMutation.mutate({ id: selectedTicket._id, draftContent: "" });
      
      setSelectedTicket(result.ticket);
      setReplyBody("");
      replyEditorRef.current?.clear();
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add reply");
    } finally {
      setTimeout(() => {
        isSendingRef.current = false;
      }, 500);
    }
  };

  const submitEditReply = async (replyId: string) => {
    if (!selectedTicket || !editEditorRef.current || isSendingRef.current) return;
    const currentHTML = editEditorRef.current.getHTML() || "";
    const cleanText = currentHTML.replace(/<[^>]+>/g, "").trim();
    if (!cleanText) return;

    isSendingRef.current = true;
    try {
      const result = await editTicketReply.mutateAsync({
        ticketId: selectedTicket._id,
        replyId,
        message: currentHTML,
      });
      setSelectedTicket(result.ticket);
      setEditingReplyId(null);
      refetch();
      toast.success("Reply updated successfully");
    } catch {
      toast.error("Failed to update reply");
    }
  };

  // ── Ticket List View ──────────────────────────────────────────────────────
  if (!selectedTicket) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header - Actions only */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Open"
            value={isLoading ? "—" : displayStats.open}
            icon={<AlertCircle size={16} />}
          />
          <StatCard
            title="In Progress"
            value={isLoading ? "—" : displayStats.inProgress}
            icon={<Clock size={16} />}
          />
          <StatCard
            title="Resolved"
            value={isLoading ? "—" : displayStats.resolved}
            icon={<CheckCircle2 size={16} />}
          />
          <StatCard
            title="Loaded"
            value={isLoading ? "—" : displayStats.total}
            icon={<MessageSquare size={16} />}
          />
        </div>

        {/* ═══ FILTER BAR ═══ */}
        <SuperadminFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name, email, or ticket ID..."
        >
          {/* Date picker */}
          <div className="w-[180px] max-w-[180px] overflow-hidden relative">
            <NikhilTimeCalendar
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Select Date"
              popDirection="down"
              showTime={false}
              className="h-9 w-full pr-8"
            />
            {dateFrom && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent bg-background"
                title="Clear date"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status */}
          <div className="w-[150px]">
            <ResponsiveSelect
              className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} data-color={o.value ? statusColor(o.value) : undefined}>
                  {o.label}
                </option>
              ))}
            </ResponsiveSelect>
          </div>

          {/* Classgrid AI account */}
          <div className="w-[170px]">
            <ResponsiveSelect
              className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm"
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
            >
              <option value="">Users: All</option>
              <option value="user">Classgrid AI users</option>
              <option value="not_user">Not users</option>
            </ResponsiveSelect>
          </div>
        </SuperadminFilterBar>

        {/* Ticket List */}
        <div className="mt-4">
          {isError ? (
            <div className="p-8 text-center text-sm text-red-500 border border-border rounded-lg bg-card">
              Failed to load tickets.
            </div>
          ) : (
            <RecentActivityTable
              columns={ticketCols}
              isLoading={isLoading}
              skeletonLines={6}
              emptyMessage="No tickets found. Adjust your filters or check back later."
              rows={filteredTickets.map((ticket) => {
                const name =
                  ticket.submittedBy?.name ??
                  ticket.submitterName ??
                  ticket.name ??
                  "Unknown";

                const profilePicture = 
                  ticket.submittedBy?.profilePicture ??
                  (ticket as any).createdBy?.profilePicture ??
                  (ticket as any).requester?.profilePicture ??
                  null;

                const conversation = getConversation(ticket);
                let unreadCount = 0;
                for (let i = conversation.length - 1; i >= 0; i--) {
                  if (conversation[i].role === "admin") break;
                  if (conversation[i].role === "user") unreadCount++;
                }

                return {
                  requester: (
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-xs ${getAvatarColor(
                            name
                          )}`}
                        >
                          {profilePicture ? (
                            <img src={profilePicture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(name)
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-card" />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-foreground text-sm truncate" title={name}>
                          {name}
                        </span>
                        {(ticket as any).organization_id?.name && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {(ticket as any).organization_id.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                  subject: (
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-sm text-foreground font-medium truncate" title={ticket.subject}>
                        {ticket.subject}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          Created: {formatTicketDate(ticket.createdAt)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${isPlatformUser(ticket)
                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                            : "text-muted-foreground bg-muted"
                            }`}
                        >
                          {isPlatformUser(ticket) ? "Classgrid AI user" : "Not a user"}
                        </span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full w-fit ml-1">
                            {unreadCount} new message{unreadCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                  status: (
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${statusColor(
                          ticket.status
                        )}`}
                      />
                      <span
                        className={`text-xs font-medium ${ticket.status === "open"
                          ? "text-emerald-500"
                          : ticket.status === "waiting_on_user"
                            ? "text-red-500"
                            : "text-foreground"
                          }`}
                      >
                        {statusLabel(ticket.status)}
                      </span>
                    </div>
                  ),
                  priority: (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {ticket.priority}
                    </span>
                  ),
                  date: (
                    <div className="flex flex-col items-start gap-2">
                      <span className="text-xs text-muted-foreground">
                        {getRelativeTime(ticket.createdAt)}
                      </span>
                    </div>
                  ),
                  assigned: (
                    <div className="flex items-center">
                      {ticket.assignedTo ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-border bg-card text-xs font-medium text-foreground w-fit cursor-default hover:border-foreground/20 transition-colors">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-border">
                                  {ticket.assignedTo.profilePicture ? (
                                    <img src={ticket.assignedTo.profilePicture} alt="" className="w-full h-full object-cover" />
                                  ) : currentUser?.profilePicture && ticket.assignedTo._id === currentUser._id ? (
                                    <img src={currentUser.profilePicture} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-white font-bold text-[9px] ${getAvatarColor(ticket.assignedTo.name)}`}>
                                      {getInitials(ticket.assignedTo.name)}
                                    </div>
                                  )}
                                </div>
                                <span className="truncate max-w-[80px]">{ticket.assignedTo.name}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {(() => {
                                const adminReply =
                                  ticket.replies?.slice().reverse().find(r => r.authorName === ticket.assignedTo?.name) ||
                                  ticket.messages?.slice().reverse().find(m => m.author === ticket.assignedTo?.name);

                                if (adminReply) {
                                  return `Replied on ${fmtDateTime(adminReply.createdAt || adminReply.date)}`;
                                }
                                return `Assigned on ${fmtDateTime(ticket.updatedAt)}`;
                              })()}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        currentUser && (
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssigningTicketId(ticket._id);
                              updateTicket.mutate(
                                { id: ticket._id, assignedTo: currentUser._id },
                                {
                                  onSuccess: () => {
                                    toast.success("Assigned to you");
                                    setAssigningTicketId(null);
                                    refetch();
                                  },
                                  onError: () => {
                                    toast.error("Failed to assign");
                                    setAssigningTicketId(null);
                                  },
                                }
                              );
                            }}
                            disabled={assigningTicketId === ticket._id}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-colors disabled:opacity-50"
                          >
                            {assigningTicketId === ticket._id ? (
                              <><Spinner className="w-3 h-3" /> Assigning...</>
                            ) : (
                              "Assign me"
                            )}
                          </Button>
                        )
                      )}
                    </div>
                  ),
                  action: (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(ticket);
                        setPendingStatus(null);
                      }}
                    >
                      Read
                    </Button>
                  ),
                };
              })}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Ticket Detail View (2-column layout like marketing) ───────────────────
  const isClosed = selectedTicket.status === "closed";
  const orgName = (selectedTicket as any).organization_id?.name || (selectedTicket as any).institution || null;
  const SUPABASE_URL = "https://bumxgscngzjadyozdpce.supabase.co";

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

      {/* Title + Status Badge */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {selectedTicket.subject}
        </h1>
        <span
          className={`px-3 py-1 text-xs font-bold text-white rounded-full ${statusBadgeBg(selectedTicket.status)}`}
        >
          {statusLabel(selectedTicket.status)}
        </span>
        <span
          className={`px-3 py-1 text-xs font-bold rounded-full ${isPlatformUser(selectedTicket)
            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            : "text-muted-foreground bg-muted"
            }`}
        >
          {isPlatformUser(selectedTicket) ? "Classgrid AI user" : "Not a user"}
        </span>

      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px] gap-8">
        {/* Left: Message Thread */}
        <div className="space-y-0 min-w-0">
          {selectedMessages.map((msg, idx) => (
            <div key={(msg as any)._id || `msg-${idx}`}>
              {idx > 0 && <hr className="border-border my-0" />}
              <div className="flex gap-4 py-8">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${(msg as any).avatar
                      ? ""
                      : `${getAvatarColor(msg.author)} text-white font-bold text-sm`
                      }`}
                  >
                    {(msg as any).avatar ? (
                      <img src={(msg as any).avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(msg.author)}</span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="mb-3">
                    <div className="flex items-center flex-wrap gap-y-1 gap-x-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center">
                          <span className="font-bold text-sm text-foreground">
                            {msg.author}
                          </span>
                          {(msg as any).authorRole === "super_admin" && (
                            <span
                              className="ml-1.5 inline-flex items-center"
                              title="Verified Admin"
                            >
                              <BadgeCheck className="w-4 h-4 text-white fill-[#1DA1F2] dark:text-[#0f0f0f]" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {fmtDateTime(msg.date)}
                        </p>
                      </div>
                      
                      {msg.role === "admin" && msg.author === (currentUser?.name || currentUser?.email) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingReplyId((msg as any)._id)}
                          className="h-6 px-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    {(msg as any).orgName && (
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-xs font-medium text-muted-foreground">
                          {(msg as any).orgLogo && (
                            <img src={(msg as any).orgLogo} alt="" className="w-4 h-4 rounded-none object-contain" />
                          )}
                          {(msg as any).orgName}
                        </span>
                      </div>
                    )}
                  </div>
                  {editingReplyId === (msg as any)._id ? (
                    <div className="mt-2">
                      <RichReplyEditor
                        ref={editEditorRef}
                        initialHtml={msg.body}
                        onChange={() => {}}
                        minHeight={150}
                        placeholder="Edit your reply..."
                        hideAttachments
                        onSubmit={() => submitEditReply((msg as any)._id)}
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingReplyId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => submitEditReply((msg as any)._id)}
                          disabled={editTicketReply.isPending}
                        >
                          {editTicketReply.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="whitespace-pre-wrap break-words text-base text-foreground leading-relaxed [&_*]:!text-foreground [&>p]:mb-4 last:[&>p]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>li]:mb-1.5 [&>strong]:!font-bold [&>h1]:text-xl [&>h1]:!font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:!font-bold [&>h2]:mb-3 [&>h3]:text-base [&>h3]:!font-bold [&>h3]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-primary/50 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-3 [&_a]:!text-blue-500 [&_a]:!no-underline hover:[&_a]:!text-blue-400 [&_u]:!decoration-emerald-500 [&_u]:underline-offset-4 [&_u]:decoration-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-border [&_img]:my-4 [&_img]:max-h-[500px] [&_img]:object-contain overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: msg.body }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === "IMG") {
                          const src = (target as HTMLImageElement).src;
                          setPreviewFile({ name: "Image preview", src });
                        }
                      }}
                    />
                  )}

                  {/* Message Attachments */}
                  {(msg as any).attachments &&
                    (msg as any).attachments.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(msg as any).attachments.map(
                          (att: any, aIdx: number) => {
                            const path =
                              typeof att === "string"
                                ? att
                                : att.url || att.path || "";
                            if (!path || typeof path !== "string") return null;
                            const fullFileName =
                              typeof att !== "string" && att.filename
                                ? att.filename
                                : att.name ||
                                path.split("/").pop() ||
                                `File ${aIdx + 1}`;
                            const fileName = fullFileName.includes("_")
                              ? fullFileName.substring(
                                fullFileName.indexOf("_") + 1
                              )
                              : fullFileName;
                            const fileUrl = path.startsWith("http")
                              ? path
                              : `${SUPABASE_URL}/storage/v1/object/public/support-attachments/${path}`;

                            return (
                              <Button
                                key={`msg-att-${aIdx}`}
                                variant="outline"
                                onClick={() =>
                                  setPreviewFile({ name: fileName, src: fileUrl })
                                }
                                className="group flex items-center gap-2 px-3 py-1.5 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg text-xs transition-all shadow-sm"
                                title="View attachment"
                              >
                                <div className="w-6 h-6 rounded-md bg-muted group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <span className="font-medium text-foreground truncate max-w-[200px]">
                                  {fileName}
                                </span>
                              </Button>
                            );
                          }
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />

          {/* Reply Box */}
          {!isClosed ? (
            selectedTicket.assignedTo && (typeof selectedTicket.assignedTo === 'object' ? selectedTicket.assignedTo._id : selectedTicket.assignedTo) !== currentUser?._id ? (
              <div className="mt-8 pt-8 border-t border-border">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">
                    Ticket Locked
                  </h3>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 max-w-md mx-auto">
                    This ticket is currently assigned to <strong>{selectedTicket.assignedTo.name}</strong>. Only the assigned owner can reply to the user. You can click "Assign to me" in the sidebar if you wish to take over.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-8 pt-8 border-t border-border">
                <div className="space-y-3">
                  <AnimatePresence>
                    {replySent && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.1 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </motion.div>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          Reply sent
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <RichReplyEditor
                    ref={replyEditorRef}
                    onChange={(text) => {
                      if (isSendingRef.current) return;
                      setReplyBody(text);
                      if (text.trim() && replySent) {
                        setReplySent(false);
                        if (replySentTimerRef.current) clearTimeout(replySentTimerRef.current);
                      }
                    }}
                    placeholder={isDraftLoading ? "Loading draft..." : "Type your reply here..."}
                    minHeight={300}
                    onSubmit={submitReply}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <p>
                        Press Enter to send, Shift+Enter for new line.
                      </p>
                      {isAiDraft && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-medium">
                          ✨ AI Draft 
                          {draftData?.draft?.aiContext && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="cursor-help">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[300px]">
                                  <p><strong>AI Context:</strong> {draftData.draft.aiContext}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2" title="If checked, the user will receive an email about this reply.">
                        <label htmlFor="send-email-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                          Send Email
                        </label>
                        <Switch
                          id="send-email-toggle"
                          checked={sendEmailWithReply}
                          onCheckedChange={setSendEmailWithReply}
                        />
                      </div>
                      <Button
                        variant="primary"
                        onClick={submitReply}
                        disabled={!replyBody.trim() || replyToTicket.isPending}
                      >
                      {replyToTicket.isPending ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            )
          ) : (
            <div className="mt-8 pt-8 border-t border-border text-center py-6">
              <p className="text-sm text-muted-foreground">
                This ticket has been <strong>{selectedTicket.status}</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Right: Metadata Sidebar */}
        <div>
          <div className="bg-card border border-border rounded-lg p-5 lg:sticky lg:top-28">
            <dl className="space-y-4">
              <MetaRow
                label="Id"
                value={`#${selectedTicket._id?.substring(0, 8)}`}
                mono
                copyValue={`https://classgrid.in/support/requests/${selectedTicket._id}`}
              />
              <MetaRow
                label="Requester"
                value={selectedRequester?.name || "-"}
                avatar={selectedRequester?.profilePicture}
                showFallbackAvatar={true}
              />
              <MetaRow
                label="Email"
                value={selectedRequester?.email || "-"}
              />
              {selectedRequester?.role && (
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <dt className="font-semibold text-sm text-foreground shrink-0">
                    Role
                  </dt>
                  <dd className="text-right min-w-0 break-words text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {selectedRequester.role.replace(/_/g, " ")}
                    </span>
                  </dd>
                </div>
              )}
              {orgName && (
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <dt className="font-semibold text-sm text-foreground shrink-0 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Org
                  </dt>
                  <dd className="text-right text-muted-foreground min-w-0 break-words text-sm">
                    {orgName}
                  </dd>
                </div>
              )}
              <MetaRow
                label="Created"
                value={fmtDateTime(selectedTicket.createdAt)}
              />
              <div className="flex items-start justify-between gap-2 min-w-0">
                <dt className="font-semibold text-sm text-foreground shrink-0">
                  Assigned to
                </dt>
                <dd className="text-right text-muted-foreground min-w-0 break-words text-sm flex items-center justify-end gap-2 flex-wrap">
                  {selectedTicket.assignedTo?.name ? (
                    <div className="flex items-center gap-1.5">
                      {selectedTicket.assignedTo.profilePicture ? (
                        <img src={selectedTicket.assignedTo.profilePicture} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] ${getAvatarColor(selectedTicket.assignedTo.name)}`}>
                          {getInitials(selectedTicket.assignedTo.name)}
                        </div>
                      )}
                      <span className="text-foreground font-medium">{selectedTicket.assignedTo.name}</span>
                    </div>
                  ) : (
                    <>
                      <span>Unassigned</span>
                      {currentUser && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            updateTicket.mutate(
                              { id: selectedTicket._id, assignedTo: currentUser._id },
                              {
                                onSuccess: (res) => {
                                  toast.success("Ticket assigned to you");
                                  if (res.ticket) setSelectedTicket(res.ticket);
                                  refetch();
                                },
                                onError: () => toast.error("Failed to assign ticket"),
                              }
                            );
                          }}
                          disabled={updateTicket.isPending}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
                        >
                          {updateTicket.isPending && <Spinner className="w-3 h-3" />}
                          {updateTicket.isPending ? "Assigning..." : "Assign to me"}
                        </Button>
                      )}
                    </>
                  )}
                </dd>
              </div>

              <hr className="border-border" />

              <MetaRow
                label="Category"
                value={selectedTicket.category ? CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category : "-"}
              />
              <MetaRow
                label="Priority"
                value={selectedTicket.priority || "-"}
              />
              <MetaRow
                label="Last activity"
                value={fmtDateTime(
                  selectedTicket.lastComment || selectedTicket.updatedAt
                )}
              />

              <hr className="border-border" />

              {/* Status with change dropdown */}
              <div className="space-y-2">
                <dt className="font-semibold text-sm text-foreground">
                  Status
                </dt>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${statusColor(pendingStatus || selectedTicket.status)}`}
                  />
                  <ResponsiveSelect
                    value={pendingStatus || selectedTicket.status}
                    onChange={(e) =>
                      setPendingStatus(e.target.value as TicketStatus)
                    }
                    disabled={updateTicket.isPending}
                    className="flex-1 h-8 px-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-0"
                  >
                    {(pendingStatus || selectedTicket.status) === "reopened" && (
                      <option value="reopened" disabled>
                        Reopened
                      </option>
                    )}
                    {STATUS_CHANGE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </ResponsiveSelect>
                  {pendingStatus && pendingStatus !== selectedTicket.status && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={submitStatusChange}
                      disabled={updateTicket.isPending}
                      className="h-8 shrink-0 px-3 py-0 whitespace-nowrap"
                    >
                      Update
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground pt-2">
                {selectedMessages.length} message
                {selectedMessages.length !== 1 ? "s" : ""} in this thread
              </div>

              {selectedTicket.status !== "closed" && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs gap-1.5"
                    disabled={updateTicket.isPending}
                    onClick={() => {
                      updateTicket.mutate(
                        { id: selectedTicket._id, status: "closed" },
                        {
                          onSuccess: (res) => {
                            toast.success("Ticket closed");
                            if (res.ticket) setSelectedTicket(res.ticket);
                            refetch();
                          },
                          onError: () => toast.error("Failed to close ticket"),
                        }
                      );
                    }}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {updateTicket.isPending && updateTicket.variables?.status === "closed" ? "Closing..." : "Close Ticket"}
                  </Button>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="destructive"
                  className="w-full text-xs"
                  disabled={deleteTicketMutation.isPending}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {deleteTicketMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>

              {/* All Attachments (combined from ticket + messages) */}
              {(() => {
                const combinedAttachments = [
                  ...((selectedTicket as any).attachments || []),
                  ...selectedMessages.flatMap(
                    (m: any) => m.attachments || []
                  ),
                ].filter((v: any, i: number, a: any[]) => {
                  const getPath = (item: any) =>
                    typeof item === "string"
                      ? item
                      : item.url || item.path || "";
                  return (
                    a.findIndex(
                      (t: any) => getPath(t) === getPath(v)
                    ) === i
                  );
                });

                if (combinedAttachments.length === 0) return null;

                return (
                  <>
                    <hr className="border-border" />
                    <div>
                      <dt className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5" />
                        All Attachments ({combinedAttachments.length})
                      </dt>
                      <div className="space-y-2">
                        {combinedAttachments.map(
                          (attachmentItem: any, idx: number) => {
                            const path =
                              typeof attachmentItem === "string"
                                ? attachmentItem
                                : attachmentItem?.url ||
                                attachmentItem?.path ||
                                "";
                            if (!path || typeof path !== "string") return null;

                            const fullFileName =
                              typeof attachmentItem !== "string" &&
                                attachmentItem.filename
                                ? attachmentItem.filename
                                : attachmentItem.name ||
                                path.split("/").pop() ||
                                `File ${idx + 1}`;
                            const fileName = fullFileName.includes("_")
                              ? fullFileName.substring(
                                fullFileName.indexOf("_") + 1
                              )
                              : fullFileName;
                            const fileUrl = path.startsWith("http")
                              ? path
                              : `${SUPABASE_URL}/storage/v1/object/public/support-attachments/${path}`;

                            return (
                              <div
                                key={`sidebar-att-${idx}`}
                                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border text-xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span
                                  className="truncate flex-1 text-foreground"
                                  title={fileName}
                                >
                                  {fileName.length > 20
                                    ? fileName.slice(0, 8) +
                                    "..." +
                                    fileName.slice(-8)
                                    : fileName}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setPreviewFile({
                                      name: fileName,
                                      src: fileUrl,
                                    })
                                  }
                                  className="w-7 h-7 p-0 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                  title="View file"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </dl>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </AnimatePresence>

      <DangerConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Support Ticket"
        description={<>Permanently delete this support ticket for <strong>{selectedTicket?.userEmail || "Unknown"}</strong>.</>}
        warningMessage="This action is irreversible. All details associated with this ticket will be permanently lost."
        confirmationSteps={[
          {
            label: "To confirm, type",
            value: "delete",
          },
        ]}
        actionLabel="Delete Ticket"
        cancelLabel="Cancel"
        isLoading={deleteTicketMutation.isPending}
        onConfirm={() => {
          if (selectedTicket?._id) {
            deleteTicketMutation.mutate(selectedTicket._id, {
              onSuccess: () => {
                setSelectedTicket(null);
                setShowDeleteConfirm(false);
              },
              onError: () => {
                setShowDeleteConfirm(false);
              }
            });
          }
        }}
        variant="danger"
      />
    </div>
  );
}

// ─── Sidebar Row Helper ──────────────────────────────────────────────────────

function MetaRow({
  label,
  value,
  mono,
  copyValue,
  avatar,
  showFallbackAvatar,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyValue?: string;
  avatar?: string;
  showFallbackAvatar?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 min-w-0">
      <dt className="font-semibold text-sm text-foreground shrink-0">
        {label}
      </dt>
      <dd
        className={`text-right text-muted-foreground min-w-0 break-words ${mono ? "font-mono" : ""} text-sm flex items-center justify-end gap-1.5`}
      >
        {avatar && (
          <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
        )}
        {!avatar && showFallbackAvatar && value !== "-" && !value.startsWith("#") && (
           <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] ${getAvatarColor(value)}`}>
             {getInitials(value)}
           </div>
        )}
        <span>{value}</span>
        {copyValue && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(copyValue);
              toast.success("Merge URL copied to clipboard");
            }}
            className="w-6 h-6 p-0 rounded bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Copy Merge URL"
          >
            <Copy className="w-3 h-3" />
          </Button>
        )}
      </dd>
    </div>
  );
}
