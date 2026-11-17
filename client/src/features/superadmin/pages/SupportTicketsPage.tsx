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

// Super admin > Support Tickets: everything people send to Classgrid support (from the app and from the website).
// The list (50 a page, newest first) and one ticket (/superadmin/support/:id, /superadmin/support/view/:id from a
// notification, or ?ticketId=). The address bar is what decides which ticket is open, so Back and the breadcrumb work.
// Opening a ticket from a link (not from this list) assigns it to you when nobody has it yet.
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  ShieldCheck,
  BadgeCheck,
  Paperclip,
  Eye,
  Copy,
  ArrowLeft,
  FileText,
  Search,
  X,
  Lock,
  Edit2,
} from "lucide-react";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Button } from "@/components/marketing_ui/button";
import { Switch } from "@/components/marketing_ui/switch";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
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
import { supportApi } from "../services/superAdminApi";
import type { SupportTicket, TicketStatus } from "../services/superAdminApi";
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";

// ── helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const LIST_PATH = "/superadmin/support";

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

function formatTicketDate(dateString: string | Date) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-IN", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

function getRequester(ticket: SupportTicket) {
  const t = ticket as any;
  return {
    name: ticket.submittedBy?.name ?? ticket.submitterName ?? ticket.name ?? t.createdBy?.name ?? t.requester?.name ?? t.author ?? "Unknown",
    email: ticket.submittedBy?.email ?? ticket.submitterEmail ?? ticket.email ?? t.createdBy?.email ?? t.requester?.email ?? "",
    profilePicture:
      ticket.submittedBy?.profilePicture ?? t.createdBy?.profilePicture ?? t.requester?.profilePicture ?? t.requesterProfilePicture ?? t.profilePicture ?? "",
  };
}

function isPlatformUser(ticket: SupportTicket) {
  return ticket.isPlatformUser ?? !!ticket.submittedBy;
}

type ConversationMessage = {
  _id?: string;
  author: string;
  role: "user" | "admin";
  authorRole?: string;
  body: string;
  date: string;
  attachments?: any[];
  avatar?: string;
};

function getConversation(ticket: SupportTicket): ConversationMessage[] {
  if (ticket.messages?.length) return ticket.messages as ConversationMessage[];

  return [
    {
      author: getRequester(ticket).name,
      role: "user" as const,
      body: ticket.message,
      date: ticket.createdAt,
      attachments: (ticket as any).attachments || [],
    },
    ...(ticket.replies ?? []).map((reply) => ({
      _id: reply._id,
      author: reply.authorName,
      authorRole: reply.authorRole,
      role: reply.authorRole === "super_admin" || reply.authorRole === "admin" ? ("admin" as const) : ("user" as const),
      body: reply.message,
      date: reply.createdAt,
      attachments: (reply as any).attachments || [],
    })),
  ].filter((message) => message.body);
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (parts.length <= 1) return first.substring(0, 2).toUpperCase() || "?";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

const avatarColors = ["bg-zinc-500", "bg-zinc-600", "bg-slate-500", "bg-slate-600", "bg-stone-500", "bg-neutral-600"];

function getAvatarColor(name: string) {
  if (!name) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function statusColor(status: string) {
  switch (status) {
    case "open":
      return "bg-blue-500";
    case "reopened":
      return "bg-indigo-500";
    case "in_progress":
      return "bg-amber-500";
    case "waiting_on_user":
      return "bg-red-500";
    default:
      return "bg-zinc-400";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "waiting_on_user":
      return "Waiting on the user";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "-";
  }
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground">
      <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor(status)}`} />
      {statusLabel(status)}
    </span>
  );
}

function UserKindPill({ ticket }: { ticket: SupportTicket }) {
  return isPlatformUser(ticket) ? (
    <span className="whitespace-nowrap rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground">Classgrid AI user</span>
  ) : (
    <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Not a user</span>
  );
}

function Avatar({ name, src, size = "h-9 w-9 text-xs" }: { name: string; src?: string | null; size?: string }) {
  return (
    <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${src ? "bg-muted" : getAvatarColor(name)}`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : getInitials(name)}
    </div>
  );
}

/** How many messages the user sent since the last answer from support */
function unreadFromUser(ticket: SupportTicket) {
  const conversation = getConversation(ticket);
  let count = 0;
  for (let i = conversation.length - 1; i >= 0; i--) {
    if (conversation[i]?.role === "admin") break;
    count++;
  }
  return count;
}

function fileOf(att: any, idx: number) {
  const path = typeof att === "string" ? att : att?.url || att?.path || "";
  if (!path || typeof path !== "string") return null;
  const fullFileName = (typeof att !== "string" && (att.filename || att.name)) || path.split("/").pop() || `File ${idx + 1}`;
  const name = fullFileName.includes("_") ? fullFileName.substring(fullFileName.indexOf("_") + 1) : fullFileName;
  const src = path.startsWith("http") ? path : `${SUPABASE_URL}/storage/v1/object/public/support-attachments/${path}`;
  return { path, name, src };
}

const SUPABASE_URL = "https://bumxgscngzjadyozdpce.supabase.co";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_on_user", label: "Waiting on the user" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "reopened", label: "Reopened" },
];

const STATUS_CHANGE_OPTIONS: TicketStatus[] = ["open", "in_progress", "waiting_on_user", "resolved", "closed"];

// The categories tickets were sent with. Old tickets from the app that was shut down keep their category, shown in
// plain words.
const CATEGORY_LABELS: Record<string, string> = {
  login: "Sign-in",
  account_security: "Account and security",
  profile: "Profile and settings",
  dashboard: "Page not loading",
  ai: "Classgrid AI",
  chat: "Chat and notifications",
  documents: "Files and uploads",
  billing: "Plans and billing",
  bug: "Bug report",
  feature: "Feature request",
  getting_started: "Getting started",
  technical: "Technical support",
  general: "General question",
  other: "Other",
  // From the old app that was shut down
  erp: "Old app",
  attendance: "Old app: attendance",
  fee: "Old app: fees",
  examination: "Old app: exams",
  exams: "Old app: exams",
  timetable: "Old app: timetable",
  assignments: "Old app: assignments",
  "live-classes": "Old app: live classes",
  admission: "Old app: admissions",
  library: "Old app: library",
  academics: "Old app: academics",
  communication: "Old app: messages and scheduling",
  finance: "Old app: payroll and finance",
};

const selectCls = "flex h-9 w-full items-center rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground";

// ── page ─────────────────────────────────────────────────────────────────────

export function SupportTicketsPage() {
  const { id: urlTicketIdParam } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlTicketId = urlTicketIdParam || searchParams.get("ticketId") || undefined;
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const replyEditorRef = useRef<RichReplyEditorRef>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [previewFile, setPreviewFile] = useState<FilePreviewSource | null>(null);
  const [replySent, setReplySent] = useState(false);
  const replySentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const editEditorRef = useRef<RichReplyEditorRef>(null);
  const [sendEmailWithReply, setSendEmailWithReply] = useState(true);
  const [loadingTicket, setLoadingTicket] = useState(false);

  const { data: currentUser } = useCurrentUser();

  const { data: draftData, isLoading: isDraftLoading } = useTicketDraft(selectedTicket?._id || null);
  const saveDraftMutation = useSaveTicketDraft();
  const isSendingRef = useRef(false);
  const [isAiDraft, setIsAiDraft] = useState(false);
  const draftLoadedForTicketId = useRef<string | null>(null);

  // Load the saved draft into the editor when a ticket opens
  useEffect(() => {
    if (!selectedTicket || isDraftLoading) return;
    if (draftLoadedForTicketId.current === selectedTicket._id) return;

    if (draftData?.draft?.draftContent !== undefined) {
      const draftContent = draftData.draft.draftContent || "";
      let parsed = draftContent;
      try {
        const p = JSON.parse(draftContent);
        if (p.text || p.content) parsed = p.content || p.text;
      } catch {
        // a plain-text draft
      }
      // The AI's draft signs as "[ADMIN_NAME]": the signed-in admin's own name goes there (2026-11-13)
      if (typeof parsed === "string" && parsed.includes("[ADMIN_NAME]")) parsed = parsed.replace(/\[ADMIN_NAME\]/g, currentUser?.name || "Classgrid Support Team");

      setReplyBody(parsed);
      replyEditorRef.current?.setHTML(parsed);
      setIsAiDraft(draftData.draft.source === "ai_generated");
    } else {
      setReplyBody("");
      replyEditorRef.current?.clear();
      setIsAiDraft(false);
    }
    draftLoadedForTicketId.current = selectedTicket._id;
  }, [selectedTicket?._id, draftData?.draft?.draftContent, isDraftLoading, currentUser?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the draft 1.5 s after typing stops
  useEffect(() => {
    if (!selectedTicket || replyBody === undefined) return;
    let parsedDraft = draftData?.draft?.draftContent || "";
    try {
      const p = JSON.parse(parsedDraft);
      if (p.text || p.content) parsedDraft = p.content || p.text;
    } catch {
      // a plain-text draft
    }
    if (replyBody === parsedDraft) return;

    const timer = setTimeout(() => {
      if (isSendingRef.current) return;
      saveDraftMutation.mutate({ id: selectedTicket._id, draftContent: replyBody });
      if (isAiDraft) setIsAiDraft(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [replyBody, selectedTicket?._id, draftData?.draft?.draftContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError, refetch } = useSupportTickets({
    status: statusFilter || undefined,
    page,
    limit: PAGE_SIZE,
    type: "support",
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    // Own handler, so only this page's listeners are removed when it closes
    const onChange = () => { refetch(); };
    socket.on("support_ticket_created", onChange);
    socket.on("support_ticket_updated", onChange);
    return () => {
      socket.off("support_ticket_created", onChange);
      socket.off("support_ticket_updated", onChange);
    };
  }, [refetch]);

  const updateTicket = useUpdateTicket();
  const replyToTicket = useReplyToTicket();
  const deleteTicketMutation = useDeleteTicket();
  const editTicketReply = useEditTicketReply();

  const tickets = useMemo(() => data?.tickets ?? [], [data]);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Search, account kind and day work on the tickets of this page
  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (userTypeFilter) {
      result = result.filter((t) => (userTypeFilter === "user" ? isPlatformUser(t) : !isPlatformUser(t)));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/^#/, "");
      result = result.filter((t) => {
        const req = getRequester(t);
        return (
          (t._id || "").toLowerCase().includes(cleanQ) ||
          req.name.toLowerCase().includes(q) ||
          req.email.toLowerCase().includes(q) ||
          (t.subject || "").toLowerCase().includes(q)
        );
      });
    }

    if (dateFrom) {
      // Tickets created, changed or answered on that day
      const startOfDay = new Date(dateFrom);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFrom);
      endOfDay.setHours(23, 59, 59, 999);
      const onDay = (d: Date) => d >= startOfDay && d <= endOfDay;
      result = result.filter((t) => {
        const cDate = new Date(t.createdAt);
        const uDate = t.updatedAt ? new Date(t.updatedAt) : cDate;
        if (onDay(cDate) || onDay(uDate)) return true;
        return Array.isArray(t.replies) && t.replies.some((r: any) => onDay(new Date(r.createdAt)));
      });
    }

    return result;
  }, [tickets, searchQuery, dateFrom, userTypeFilter]);

  const selectedRequester = selectedTicket ? getRequester(selectedTicket) : null;
  const selectedMessages = selectedTicket ? getConversation(selectedTicket) : [];

  // ── Which ticket is open: the address bar decides ──────────────────────────

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setPendingStatus(null);
    setEditingReplyId(null);
    navigate(`${LIST_PATH}/${ticket._id}`, { state: { fromList: true } });
  };

  const closeTicket = useCallback(() => {
    setSelectedTicket(null);
    setPendingStatus(null);
    setEditingReplyId(null);
    navigate(LIST_PATH);
  }, [navigate]);

  const autoAssign = useCallback((ticket: SupportTicket) => {
    if (!currentUser?._id) return;
    const assigneeId = typeof ticket.assignedTo === "object" ? (ticket.assignedTo as any)?._id : ticket.assignedTo;
    const askedFor = searchParams.get("autoAssign") === "true";
    // Asked for in the link, or nobody has the ticket yet
    if ((askedFor && assigneeId !== currentUser._id) || !ticket.assignedTo) {
      updateTicket.mutate(
        { id: ticket._id, assignedTo: currentUser._id },
        {
          onSuccess: (res) => {
            if (res?.ticket) setSelectedTicket(res.ticket);
            toast.success("The ticket is assigned to you.");
          },
        }
      );
    }
    if (askedFor) {
      searchParams.delete("autoAssign");
      setSearchParams(searchParams, { replace: true });
    }
  }, [currentUser?._id, searchParams, setSearchParams, updateTicket]);

  useEffect(() => {
    if (!urlTicketId) {
      // Back to the list (the Back button, or the list link)
      if (selectedTicket) setSelectedTicket(null);
      return;
    }
    if (selectedTicket?._id === urlTicketId || isLoading || loadingTicket) return;
    const fromList = !!(location.state as any)?.fromList;
    const inList = tickets.find((t) => t._id === urlTicketId);
    if (inList) {
      setSelectedTicket(inList);
      if (!fromList) autoAssign(inList);
      return;
    }
    // Not on this page of the list (an older ticket): load it on its own
    let cancelled = false;
    setLoadingTicket(true);
    supportApi
      .getTicket(urlTicketId)
      .then((res) => {
        if (cancelled) return;
        if (!res?.ticket) throw new Error("not found");
        setSelectedTicket(res.ticket);
        if (!fromList) autoAssign(res.ticket);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("This ticket was not found. It may have been deleted.");
        navigate(LIST_PATH, { replace: true });
      })
      .finally(() => { if (!cancelled) setLoadingTicket(false); });
    return () => { cancelled = true; setLoadingTicket(false); };
  }, [urlTicketId, tickets, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the open ticket fresh when the list reloads
  useEffect(() => {
    if (!selectedTicket || tickets.length === 0) return;
    const freshTicket = tickets.find((t) => t._id === selectedTicket._id);
    if (freshTicket && freshTicket.updatedAt !== selectedTicket.updatedAt) setSelectedTicket(freshTicket);
  }, [tickets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Jump to the newest message when a ticket opens or a message comes in
  useEffect(() => {
    if (!selectedMessages.length) return;
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 50);
    return () => clearTimeout(t);
  }, [selectedTicket?._id, selectedMessages.length]);

  useEffect(() => () => { if (replySentTimerRef.current) clearTimeout(replySentTimerRef.current); }, []);

  const { setBreadcrumbs } = useBreadcrumbStore();
  useEffect(() => {
    if (selectedTicket) {
      setBreadcrumbs([
        { label: "Support Tickets", onClick: closeTicket },
        { label: getRequester(selectedTicket).name || "Unknown" },
      ]);
    } else {
      setBreadcrumbs([]);
    }
    return () => setBreadcrumbs([]);
  }, [selectedTicket, setBreadcrumbs, closeTicket]);

  const assignToMe = (ticket: SupportTicket, fromDetail: boolean) => {
    if (!currentUser?._id) return;
    setAssigningTicketId(ticket._id);
    updateTicket.mutate(
      { id: ticket._id, assignedTo: currentUser._id },
      {
        onSuccess: (res) => {
          toast.success("Assigned to you.");
          if (fromDetail && res?.ticket) setSelectedTicket(res.ticket);
          refetch();
        },
        onError: (err: any) => toast.error(err?.message || "Couldn't assign the ticket."),
        onSettled: () => setAssigningTicketId(null),
      }
    );
  };

  const submitStatusChange = async () => {
    if (!selectedTicket || !pendingStatus) return;
    try {
      const result = await updateTicket.mutateAsync({ id: selectedTicket._id, status: pendingStatus });
      if (result?.ticket) setSelectedTicket(result.ticket);
      setPendingStatus(null);
      refetch();
      toast.success(`Status changed to ${statusLabel(pendingStatus)}.`);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't change the status.");
    }
  };

  const submitReply = async () => {
    const currentHTML = replyEditorRef.current?.getHTML() || "";
    const cleanText = currentHTML.replace(/<[^>]+>/g, "").trim();
    const files = replyEditorRef.current?.getFiles() || [];

    // A reply needs text or a file
    if (!selectedTicket || (!cleanText && files.length === 0) || isSendingRef.current) return;

    isSendingRef.current = true;
    try {
      const result = await replyToTicket.mutateAsync({
        id: selectedTicket._id,
        message: currentHTML,
        files: files.length > 0 ? files : undefined,
        sendEmail: sendEmailWithReply,
      });
      // The draft is cleared once the reply is sent
      saveDraftMutation.mutate({ id: selectedTicket._id, draftContent: "" });
      if (result?.ticket) setSelectedTicket(result.ticket);
      setReplyBody("");
      replyEditorRef.current?.clear();
      setIsAiDraft(false);
      setReplySent(true);
      if (replySentTimerRef.current) clearTimeout(replySentTimerRef.current);
      replySentTimerRef.current = setTimeout(() => setReplySent(false), 4000);
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Couldn't send the reply.");
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
      const result = await editTicketReply.mutateAsync({ ticketId: selectedTicket._id, replyId, message: currentHTML });
      if (result?.ticket) setSelectedTicket(result.ticket);
      setEditingReplyId(null);
      refetch();
      toast.success("Reply updated.");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't update the reply.");
    } finally {
      isSendingRef.current = false;
    }
  };

  // ── Ticket list ────────────────────────────────────────────────────────────
  if (!selectedTicket) {
    if (urlTicketId) {
      // A ticket from a link is being loaded
      return (
        <div className="flex h-full flex-col bg-background px-4 py-6 sm:px-6">
          <Skeleton className="mb-4 h-7 w-64 max-w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }
    const filtersOn = !!(searchQuery.trim() || dateFrom || userTypeFilter || statusFilter);
    return (
      <div className="flex h-full flex-col bg-background text-foreground">
        <div className="border-b border-border bg-card px-4 py-5 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Support Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What people send to Classgrid support, from the app and the website. Open a ticket to reply, take it on or change its status.
          </p>
        </div>

        <div className="flex flex-col gap-6 px-4 py-6 sm:px-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard title="Open" value={isLoading ? "-" : data?.stats?.open ?? 0} icon={<AlertCircle size={16} />} />
            <StatCard title="In progress" value={isLoading ? "-" : data?.stats?.inProgress ?? 0} icon={<Clock size={16} />} />
            <StatCard title="Resolved" value={isLoading ? "-" : data?.stats?.resolved ?? 0} icon={<CheckCircle2 size={16} />} />
            <StatCard title={statusFilter ? "With this status" : "All tickets"} value={isLoading ? "-" : total} icon={<MessageSquare size={16} />} />
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative w-full lg:w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, subject or ticket id"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" title="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
              <div className="relative lg:w-[180px]">
                <NikhilTimeCalendar value={dateFrom} onChange={setDateFrom} placeholder="Any day" popDirection="down" showTime={false} className="h-9 w-full pr-8" />
                {dateFrom && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Clear the day"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="lg:w-[190px]">
                <ResponsiveSelect className={selectCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} data-color={o.value ? statusColor(o.value) : undefined}>{o.label}</option>
                  ))}
                </ResponsiveSelect>
              </div>
              <div className="lg:w-[190px]">
                <ResponsiveSelect className={selectCls} value={userTypeFilter} onChange={(e) => setUserTypeFilter(e.target.value)}>
                  <option value="">Everyone</option>
                  <option value="user">Classgrid AI users</option>
                  <option value="not_user">Not users</option>
                </ResponsiveSelect>
              </div>
            </div>
          </div>

          {isError ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Couldn't load the tickets.{" "}
              <button type="button" className="font-medium text-foreground underline underline-offset-2" onClick={() => refetch()}>Try again</button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 rounded-xl border border-border bg-card p-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {filtersOn ? "No ticket matches these filters." : "No tickets yet."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left text-muted-foreground">
                    <th className="p-3 font-medium">Requester</th>
                    <th className="p-3 font-medium">Subject</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Priority</th>
                    <th className="p-3 font-medium">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const req = getRequester(ticket);
                    const unread = unreadFromUser(ticket);
                    const assignee = ticket.assignedTo;
                    return (
                      <tr key={ticket._id} onClick={() => openTicket(ticket)} className="cursor-pointer border-t border-border/60 hover:bg-muted/20">
                        <td className="p-3 align-top">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative">
                              <Avatar name={req.name} src={req.profilePicture} />
                              {unread > 0 && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-blue-500" />}
                            </div>
                            <div className="min-w-0">
                              <div className="max-w-[180px] truncate font-medium text-foreground" title={req.name}>{req.name}</div>
                              {req.email && <div className="max-w-[180px] truncate text-xs text-muted-foreground" title={req.email}>{req.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="max-w-[320px] truncate font-medium text-foreground" title={ticket.subject}>{ticket.subject}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatTicketDate(ticket.createdAt)}</span>
                            <UserKindPill ticket={ticket} />
                            {unread > 0 && (
                              <span className="whitespace-nowrap rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                                {unread} new message{unread > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 align-top"><StatusPill status={ticket.status} /></td>
                        <td className="p-3 align-top capitalize text-muted-foreground">{ticket.priority || "-"}</td>
                        <td className="p-3 align-top">
                          {assignee ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex w-fit items-center gap-2 rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-foreground">
                                    <Avatar name={assignee.name} src={assignee.profilePicture || (currentUser?._id === assignee._id ? currentUser?.profilePicture : "")} size="h-5 w-5 text-[9px]" />
                                    <span className="max-w-[100px] truncate">{assignee.name}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">Last change {fmtDateTime(ticket.updatedAt)}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : currentUser ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); assignToMe(ticket, false); }}
                              disabled={assigningTicketId === ticket._id}
                              className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-3 text-xs font-medium text-foreground hover:bg-muted/70 disabled:opacity-50"
                            >
                              {assigningTicketId === ticket._id && <Spinner className="h-3 w-3" />}
                              Assign to me
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nobody</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !isError && pages > 1 && (
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-muted-foreground">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── One ticket ─────────────────────────────────────────────────────────────
  const isClosed = selectedTicket.status === "closed";
  const assigneeId = selectedTicket.assignedTo
    ? typeof selectedTicket.assignedTo === "object" ? selectedTicket.assignedTo._id : (selectedTicket.assignedTo as unknown as string)
    : null;
  const lockedForMe = !!assigneeId && assigneeId !== currentUser?._id;
  const combinedAttachments = [
    ...((selectedTicket as any).attachments || []),
    ...selectedMessages.flatMap((m) => m.attachments || []),
  ]
    .map((att, idx) => fileOf(att, idx))
    .filter((f, i, all): f is NonNullable<ReturnType<typeof fileOf>> => !!f && all.findIndex((x) => x?.path === f.path) === i);

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <button type="button" onClick={closeTicket} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All tickets
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-xl font-semibold text-foreground sm:text-2xl">{selectedTicket.subject}</h1>
          <StatusPill status={selectedTicket.status} />
          <UserKindPill ticket={selectedTicket} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Messages */}
        <div className="min-w-0">
          {selectedMessages.map((msg, idx) => (
            <div key={msg._id || `msg-${idx}`}>
              {idx > 0 && <hr className="my-0 border-border" />}
              <div className="flex gap-3 py-6 sm:gap-4 sm:py-8">
                <Avatar name={msg.author} src={msg.avatar} size="h-10 w-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center text-sm font-semibold text-foreground">
                      {msg.author}
                      {msg.role === "admin" && (
                        <span className="ml-1.5 inline-flex items-center" title="Classgrid support">
                          <BadgeCheck className="h-4 w-4 text-foreground" />
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDateTime(msg.date)}</span>
                    {msg.role === "admin" && msg._id && msg.author === (currentUser?.name || currentUser?.email) && editingReplyId !== msg._id && (
                      <button
                        type="button"
                        onClick={() => setEditingReplyId(msg._id!)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                    )}
                  </div>
                  {editingReplyId && editingReplyId === msg._id ? (
                    <div className="mt-2">
                      <RichReplyEditor
                        ref={editEditorRef}
                        initialHtml={msg.body}
                        onChange={() => {}}
                        minHeight={150}
                        placeholder="Edit your reply"
                        hideAttachments
                        onSubmit={() => submitEditReply(msg._id!)}
                      />
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingReplyId(null)}>Cancel</Button>
                        <Button variant="primary" size="sm" onClick={() => submitEditReply(msg._id!)} isLoading={editTicketReply.isPending}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground [&_*]:!text-foreground [&>p]:mb-4 last:[&>p]:mb-0 [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1.5 [&>strong]:!font-bold [&>h1]:mb-3 [&>h1]:text-xl [&>h1]:!font-bold [&>h2]:mb-3 [&>h2]:text-lg [&>h2]:!font-bold [&>h3]:mb-2 [&>h3]:text-base [&>h3]:!font-bold [&>blockquote]:my-3 [&>blockquote]:border-l-4 [&>blockquote]:border-border [&>blockquote]:pl-4 [&>blockquote]:italic [&_a]:!text-blue-500 [&_a]:underline [&_u]:underline-offset-4 [&_img]:my-4 [&_img]:h-auto [&_img]:max-h-[500px] [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-border [&_img]:object-contain overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: msg.body }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === "IMG") setPreviewFile({ name: "Image preview", src: (target as HTMLImageElement).src });
                      }}
                    />
                  )}

                  {!!msg.attachments?.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {msg.attachments.map((att: any, aIdx: number) => {
                        const f = fileOf(att, aIdx);
                        if (!f) return null;
                        return (
                          <button
                            key={`msg-att-${aIdx}`}
                            type="button"
                            onClick={() => setPreviewFile({ name: f.name, src: f.src })}
                            className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted"
                            title="View the file"
                          >
                            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="max-w-[200px] truncate font-medium text-foreground">{f.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />

          {/* Reply */}
          {isClosed ? (
            <div className="mt-6 border-t border-border py-6 text-center text-sm text-muted-foreground">
              This ticket is closed. Change its status to reply again.
            </div>
          ) : lockedForMe ? (
            <div className="mt-6 border-t border-border pt-6">
              <div className="rounded-xl border border-border bg-muted/40 p-6 text-center">
                <ShieldCheck className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                <h3 className="mb-1 text-sm font-semibold text-foreground">{selectedTicket.assignedTo?.name || "Someone else"} has this ticket</h3>
                <p className="mx-auto max-w-md text-xs text-muted-foreground">
                  Only the person a ticket is assigned to replies to it. To take it over, use Assign to me on the right.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <AnimatePresence>
                {replySent && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      Reply sent{sendEmailWithReply ? ", and emailed to them" : ""}.
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
                placeholder={isDraftLoading ? "Loading the draft" : "Write your reply"}
                minHeight={240}
                onSubmit={submitReply}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <p className="hidden sm:block">Enter sends, Shift+Enter starts a new line.</p>
                  {isAiDraft && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                      Draft written by AI
                      {draftData?.draft?.aiContext && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">
                              <AlertCircle className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p><strong>What the AI used:</strong> {draftData.draft.aiContext}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2" title="When on, they also get your reply by email.">
                    <label htmlFor="send-email-toggle" className="cursor-pointer text-xs font-medium text-foreground">
                      Email it to them
                    </label>
                    <Switch id="send-email-toggle" checked={sendEmailWithReply} onCheckedChange={setSendEmailWithReply} />
                  </div>
                  <Button variant="primary" size="sm" onClick={submitReply} disabled={replyToTicket.isPending}>
                    {replyToTicket.isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                    Send reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0">
          <div className="rounded-xl border border-border bg-card p-5 lg:sticky lg:top-28">
            <dl className="space-y-4">
              <MetaRow
                label="Id"
                value={`#${selectedTicket._id?.substring(0, 8)}`}
                mono
                copyValue={`https://classgrid.in/support/requests/${selectedTicket._id}`}
              />
              <MetaRow label="Requester" value={selectedRequester?.name || "-"} avatar={selectedRequester?.profilePicture} showFallbackAvatar />
              <MetaRow label="Email" value={selectedRequester?.email || "-"} />
              <MetaRow label="Sent" value={fmtDateTime(selectedTicket.createdAt)} />
              <div className="flex min-w-0 items-start justify-between gap-2">
                <dt className="shrink-0 text-sm font-semibold text-foreground">Assigned to</dt>
                <dd className="flex min-w-0 flex-wrap items-center justify-end gap-2 break-words text-right text-sm text-muted-foreground">
                  {selectedTicket.assignedTo?.name ? (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={selectedTicket.assignedTo.name} src={selectedTicket.assignedTo.profilePicture} size="h-5 w-5 text-[9px]" />
                      <span className="font-medium text-foreground">{selectedTicket.assignedTo.name}</span>
                    </span>
                  ) : (
                    <span>Nobody</span>
                  )}
                  {currentUser && assigneeId !== currentUser._id && (
                    <button
                      type="button"
                      onClick={() => assignToMe(selectedTicket, true)}
                      disabled={assigningTicketId === selectedTicket._id}
                      className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-foreground hover:bg-muted/70 disabled:opacity-50"
                    >
                      {assigningTicketId === selectedTicket._id && <Spinner className="h-3 w-3" />}
                      Assign to me
                    </button>
                  )}
                </dd>
              </div>

              <hr className="border-border" />

              <MetaRow label="Category" value={selectedTicket.category ? CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category : "-"} />
              <MetaRow label="Priority" value={selectedTicket.priority ? selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1) : "-"} />
              <MetaRow label="Last activity" value={fmtDateTime(selectedTicket.lastComment || selectedTicket.updatedAt)} />

              <hr className="border-border" />

              <div className="space-y-2">
                <dt className="text-sm font-semibold text-foreground">Status</dt>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${statusColor(pendingStatus || selectedTicket.status)}`} />
                  <ResponsiveSelect
                    value={pendingStatus || selectedTicket.status}
                    onChange={(e) => setPendingStatus(e.target.value as TicketStatus)}
                    disabled={updateTicket.isPending}
                    className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                  >
                    {(pendingStatus || selectedTicket.status) === "reopened" && (
                      <option value="reopened" disabled>Reopened</option>
                    )}
                    {STATUS_CHANGE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{statusLabel(s)}</option>
                    ))}
                  </ResponsiveSelect>
                  {pendingStatus && pendingStatus !== selectedTicket.status && (
                    <Button variant="primary" size="sm" onClick={submitStatusChange} disabled={updateTicket.isPending} className="h-8 shrink-0 whitespace-nowrap px-3 py-0">
                      Save
                    </Button>
                  )}
                </div>
              </div>

              <div className="pt-1 text-xs text-muted-foreground">
                {selectedMessages.length} message{selectedMessages.length !== 1 ? "s" : ""} in this ticket
              </div>

              {!isClosed && (
                <Button
                  variant="outline"
                  className="h-9 w-full gap-1.5 text-xs"
                  disabled={updateTicket.isPending}
                  onClick={() => {
                    updateTicket.mutate(
                      { id: selectedTicket._id, status: "closed" },
                      {
                        onSuccess: (res) => {
                          toast.success("Ticket closed.");
                          if (res?.ticket) setSelectedTicket(res.ticket);
                          refetch();
                        },
                        onError: (err: any) => toast.error(err?.message || "Couldn't close the ticket."),
                      }
                    );
                  }}
                >
                  {updateTicket.isPending && updateTicket.variables?.status === "closed" ? <Spinner className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  Close ticket
                </Button>
              )}

              <Button
                variant="ghost"
                className="h-9 w-full text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                disabled={deleteTicketMutation.isPending}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete ticket
              </Button>

              {combinedAttachments.length > 0 && (
                <>
                  <hr className="border-border" />
                  <div>
                    <dt className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      All files ({combinedAttachments.length})
                    </dt>
                    <div className="space-y-2">
                      {combinedAttachments.map((f, idx) => (
                        <div key={`sidebar-att-${idx}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 text-xs">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-foreground" title={f.name}>{f.name}</span>
                          <button
                            type="button"
                            onClick={() => setPreviewFile({ name: f.name, src: f.src })}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="View the file"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      </AnimatePresence>

      <DangerConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this ticket"
        description={<>The ticket from <strong className="text-foreground">{selectedRequester?.email || selectedRequester?.name || "this person"}</strong>, with every message and file in it, is deleted for good.</>}
        warningMessage="This can't be undone."
        confirmationSteps={[{ label: "To confirm, type", value: "delete" }]}
        actionLabel="Delete ticket"
        cancelLabel="Cancel"
        isLoading={deleteTicketMutation.isPending}
        onConfirm={() => {
          if (!selectedTicket?._id) return;
          deleteTicketMutation.mutate(selectedTicket._id, {
            onSuccess: () => {
              setShowDeleteConfirm(false);
              closeTicket();
            },
            onError: () => setShowDeleteConfirm(false),
          });
        }}
        variant="danger"
      />
    </div>
  );
}

// ─── Details row ─────────────────────────────────────────────────────────────

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
    <div className="flex min-w-0 items-start justify-between gap-2">
      <dt className="shrink-0 text-sm font-semibold text-foreground">{label}</dt>
      <dd className={`flex min-w-0 items-center justify-end gap-1.5 break-words text-right text-sm text-muted-foreground ${mono ? "font-mono" : ""}`}>
        {avatar ? (
          <img src={avatar} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
        ) : showFallbackAvatar && value !== "-" ? (
          <Avatar name={value} size="h-5 w-5 text-[9px]" />
        ) : null}
        <span className="min-w-0 break-all">{value}</span>
        {copyValue && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(copyValue).then(
                () => toast.success("The requester's link to this ticket is copied."),
                () => toast.error("Couldn't copy the link.")
              );
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Copy the requester's link to this ticket"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </dd>
    </div>
  );
}
