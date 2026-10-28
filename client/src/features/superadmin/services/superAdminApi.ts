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

import { apiClient } from "@/lib/apiClient";
import axios from "axios";

// ─── Lead Types ───────────────────────────────────────────────────────────────

export type LeadStatus =
  | "new"
  | "contacted"
  | "closed"
  | "converted";

export type LeadLifecycle =
  | "lead_created"
  | "meeting_scheduled"
  | "approved"
  | "provisioned"
  | "activated"
  | "setup"
  | "live";

export type Lead = {
  _id: string;
  // Backend DemoRequest fields
  institutionName: string;
  orgType: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  city: string;
  state: string;
  district?: string;
  taluka?: string;
  cityVillage?: string;
  role?: string;
  website?: string;
  message: string;
  status: LeadStatus;
  lifecycleStage: LeadLifecycle;
  meetingStatus: "pending" | "scheduled" | "completed" | "cancelled";
  meetingProvider: string;
  scheduledAt?: string | null;
  meetingScheduledAt: string | null;
  meetingUrl: string;
  meetingNotes: string;
  assignedTo?: { _id: string; name: string; email: string };
  assignedAt?: string;
  demoReview?: string;
  conversionStatus: "not_started" | "in_progress" | "provisioned" | "failed";
  provisionedOrganizationId: string | null;
  isOrganizationVetted?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LeadsResponse = {
  success: boolean;
  leads: Lead[];
  total: number;
};

export interface BlogSubscriber {
  id: string;
  email: string;
  name?: string;
  is_active: boolean;
  receives_blog?: boolean;
  receives_changelog?: boolean;
  receives_legal?: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type SubscriberTrendPoint = {
  date: string;
  label: string;
  subscribed: number;
  unsubscribed: number;
};

export type SubscribersResponse = {
  success: boolean;
  data: BlogSubscriber[];
  total: number;
  stats: {
    total: number;
    active: number;
    inactive: number;
    newSubscribers14d: number;
    newUnsubscribes14d: number;
    netGrowth14d: number;
    activeRate: number;
    deliveryReady: number;
  };
  trend: SubscriberTrendPoint[];
  inactiveSubscribers: BlogSubscriber[];
  recentSubscribers: BlogSubscriber[];
  activity: {
    lastSubscribedAt: string | null;
    lastUnsubscribedAt: string | null;
  };
};

// ─── Support Ticket Types ─────────────────────────────────────────────────────

export type TicketStatus = "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed" | "reopened";
export type TicketPriority = "low" | "medium" | "high" | "urgent" | "critical";

export type SupportTicket = {
  _id: string;
  name?: string;
  email?: string;
  subject: string;
  message: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  submittedBy?: { _id: string; name: string; email: string; role: string };
  submitterEmail: string;
  submitterName: string;
  isPlatformUser?: boolean;
  organization_id?: { _id: string; name: string; slug: string };
  assignedTo?: { _id: string; name: string; email: string };
  lastComment?: string;
  messages?: Array<{
    _id?: string;
    author: string;
    role: "user" | "admin";
    body: string;
    date: string;
    footer?: string;
  }>;
  replies: Array<{
    _id: string;
    authorName: string;
    authorRole: string;
    message: string;
    createdAt: string;
  }>;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketsResponse = {
  success: boolean;
  tickets: SupportTicket[];
  total: number;
  stats: { open: number; inProgress: number; resolved: number };
};

export type CreateSupportTicketPayload = {
  subject: string;
  message: string;
  category?: string;
  priority?: TicketPriority;
};

// ─── Leads API ────────────────────────────────────────────────────────────────

export const leadsApi = {
  getAll: () =>
    apiClient
      .get<LeadsResponse>("/api/super-admin/leads")
      .then((r) => r.data),

  approve: (id: string, payload?: any) =>
    apiClient
      .post<{ success: boolean; message: string; organization?: any; admin?: any; activation?: any }>(`/api/super-admin/leads/${id}/approve`, payload)
      .then((r) => r.data),

  regenerateActivation: (id: string) =>
    apiClient
      .post<{ success: boolean; activation: { activationLink: string; activationCode: string; expiresAt: string } }>(`/api/super-admin/leads/${id}/regenerate-activation`)
      .then((r) => r.data),

  requestVettingApproval: (id: string) =>
    apiClient
      .post<{ success: boolean; message: string }>(`/api/super-admin/leads/${id}/request-vetting-approval`)
      .then((r) => r.data),

  updateAdminDetails: (id: string, payload: { adminName: string; adminEmail: string; adminPhone?: string; role?: string; designation?: string }) =>
    apiClient
      .patch<{ success: boolean; lead: Lead }>(`/api/super-admin/leads/${id}/admin-details`, payload)
      .then((r) => r.data),

  updateInstitutionDetails: (id: string, payload: any) =>
    apiClient
      .patch<{ success: boolean; lead: Lead }>(`/api/super-admin/leads/${id}/institution-details`, payload)
      .then((r) => r.data),

  allocateDashboards: (id: string, payload: { allocatedDashboards: string[] }) =>
    apiClient
      .patch<{ success: boolean; lead: Lead; allocatedCount?: number }>(`/api/super-admin/leads/${id}/allocate-dashboards`, payload)
      .then((r) => r.data),

  allocateModules: (id: string, payload: { allocatedModules: Record<string, boolean> }) =>
    apiClient
      .patch<{ success: boolean; lead: Lead }>(`/api/super-admin/leads/${id}/allocate-modules`, payload)
      .then((r) => r.data),

  
  updateMeetingNotes: (id: string, payload: any) =>
    apiClient.patch<{ success: boolean; lead: any }>(`/api/super-admin/leads/${id}/notes`, payload).then(res => res.data),
  scheduleMeeting: (id: string, payload: { scheduledAt: string; notes?: string }) =>
    apiClient
      .post<{ success: boolean }>(`/api/super-admin/leads/${id}/schedule-meeting`, payload)
      .then((r) => r.data),

  assign: (id: string) =>
    apiClient
      .patch<{ success: boolean }>(`/api/super-admin/leads/${id}/assign`)
      .then((r) => r.data),

  create: (payload: { institutionName: string; adminName: string; adminEmail: string; adminPhone?: string; city?: string; orgType?: string }) =>
    apiClient
      .post<{ success: boolean; message: string; lead: Lead }>("/api/super-admin/leads", payload)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient
      .delete<{ success: boolean; message: string }>(`/api/super-admin/leads/${id}`)
      .then((r) => r.data),
};

export const subscribersApi = {
  getBlogSubscribers: async (options?: { q?: string; status?: string; preference?: string }) => {
    let url = "/api/super-admin/subscribers";
    const params = new URLSearchParams();
    if (options?.q) params.append("q", options.q);
    if (options?.status) params.append("status", options.status);
    if (options?.preference) params.append("preference", options.preference);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return apiClient.get<SubscribersResponse>(url).then((r) => r.data);
  },

  pause: (email: string) =>
    apiClient
      .patch<{ success: boolean; message: string }>(
        `/api/super-admin/subscribers/${encodeURIComponent(email)}/pause`
      )
      .then((r) => r.data),

  resume: (email: string) =>
    apiClient
      .patch<{ success: boolean; message: string }>(
        `/api/super-admin/subscribers/${encodeURIComponent(email)}/resume`
      )
      .then((r) => r.data),

  updatePreferences: (email: string, preferences: { receives_blog?: boolean; receives_changelog?: boolean; receives_legal?: boolean }) =>
    apiClient
      .patch<{ success: boolean; message: string }>(
        `/api/super-admin/subscribers/${encodeURIComponent(email)}/preferences`,
        preferences
      )
      .then((r) => r.data),

  remove: (email: string) =>
    apiClient
      .delete<{ success: boolean; message: string }>(
        `/api/super-admin/subscribers/${encodeURIComponent(email)}`
      )
      .then((r) => r.data),
};

// ─── Support Tickets API ──────────────────────────────────────────────────────

export const supportApi = {
  getMyTickets: () =>
    apiClient
      .get<TicketsResponse>("/api/support/tickets")
      .then((r) => r.data),

  createTicket: (payload: CreateSupportTicketPayload) =>
    apiClient
      .post<{ success: boolean; message: string; ticket: SupportTicket }>("/api/support/tickets", payload)
      .then((r) => r.data),

  getAllTickets: (params?: { status?: string; priority?: string; page?: number; limit?: number; type?: "inquiry" | "support" }) =>
    apiClient
      .get<TicketsResponse>("/api/support/admin/tickets", { params })
      .then((r) => r.data),

  getTicket: (id: string) =>
    apiClient
      .get<{ success: boolean; ticket: SupportTicket }>(`/api/support/tickets/${id}`)
      .then((r) => r.data),

  updateTicket: (id: string, payload: { status?: TicketStatus; priority?: TicketPriority; assignedTo?: string }) =>
    apiClient
      .patch<{ success: boolean; ticket: SupportTicket }>(`/api/support/admin/tickets/${id}`, payload)
      .then((r) => r.data),

  replyToTicket: (id: string, message: string, files?: File[], sendEmail: boolean = true) => {
    const formData = new FormData();
    formData.append("message", message);
    formData.append("sendEmail", String(sendEmail));
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    }
    return apiClient
      .post<{ success: boolean; ticket: SupportTicket }>(`/api/support/tickets/${id}/reply`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((r) => r.data);
  },

  editTicketReply: (ticketId: string, replyId: string, message: string) =>
    apiClient
      .patch<{ success: boolean; ticket: SupportTicket }>(`/api/support/admin/tickets/${ticketId}/reply/${replyId}`, { message })
      .then((r) => r.data),

  getTicketDraft: (id: string) =>
    apiClient
      .get<{ success: boolean; draft: any }>(`/api/support/admin/tickets/${id}/draft`)
      .then((r) => r.data),

  saveTicketDraft: (id: string, draftContent: string) =>
    apiClient
      .put<{ success: boolean; draft: any }>(`/api/support/admin/tickets/${id}/draft`, { draftContent })
      .then((r) => r.data),

  deleteTicket: (id: string) =>
    apiClient
      .delete<{ success: boolean; message: string }>(`/api/super-admin/support-tickets/${id}`)
      .then((r) => r.data),
};

// ─── Reviews Types ────────────────────────────────────────────────────────────

export type Review = {
  _id: string;
  name: string;
  college: string;
  helped: string;
  rating: number;
  suggestion?: string;
  isPublic: boolean;
  createdAt: string;
};

// ─── Reviews API ──────────────────────────────────────────────────────────────

export const reviewsApi = {
  getAll: () =>
    apiClient
      .get<Review[]>("/api/reviews")
      .then((r) => r.data),
};

// ─── Feedback API ──────────────────────────────────────────────────────────────

export type PlatformFeedback = {
  _id: string;
  user: { name: string; email: string; role: string };
  organization?: { name: string };
  category: "bug" | "feature_request" | "general";
  message: string;
  status: "new" | "reviewed" | "archived";
  createdAt: string;
};

export const feedbackApi = {
  // Using a mock URL for now; assumes backend will map /api/super-admin/feedback
  getAll: () =>
    apiClient
      .get<{ success: boolean; data: PlatformFeedback[] }>("/api/super-admin/feedback")
      .then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    apiClient
      .patch<{ success: boolean }>(`/api/super-admin/feedback/${id}`, { status })
      .then((r) => r.data),
};

// ─── Announcements API ─────────────────────────────────────────────────────────

export type Announcement = {
  _id: string;
  title: string;
  body: string;
  target: string;
  scheduledAt: string;
  status: string;
  category: string;
};

export const announcementsApi = {
  list: () =>
    apiClient
      .get<{ success: boolean; notifications: Announcement[] }>("/api/super-admin/notifications")
      .then((r) => r.data),

  create: (payload: any) =>
    apiClient
      .post<{ success: boolean }>("/api/super-admin/notifications", payload)
      .then((r) => r.data),

  broadcastGlobal: (payload: { title: string; body: string; target: string }) =>
    apiClient
      .post<{ success: boolean; message: string; sent: number }>("/api/super-admin/broadcast-global", payload)
      .then((r) => r.data),
};

// ─── Changelog Types ──────────────────────────────────────────────────────────

export type ChangelogType = "feature" | "fix" | "improvement" | "security" | "announcement";

export type ChangelogEntry = {
  _id: string;
  version: string;
  title: string;
  body: string;
  type: ChangelogType;
  highlights: string[];
  isPublished: boolean;
  createdBy?: { _id: string; name: string };
  publishedAt: string;
  reactions: Record<string, number>;
};

export type ChangelogResponse = {
  success: boolean;
  entries: ChangelogEntry[];
};

export type CreateChangelogPayload = {
  version: string;
  title: string;
  body: string;
  type: ChangelogType;
  highlights?: string[];
  isPublished?: boolean;
};

// ─── Changelog API ────────────────────────────────────────────────────────────

export const changelogApi = {
  getAll: () =>
    apiClient
      .get<ChangelogResponse>("/api/changelog")
      .then((r) => r.data),

  create: (payload: CreateChangelogPayload) =>
    apiClient
      .post<{ success: boolean; entry: ChangelogEntry }>("/api/changelog/create", payload)
      .then((r) => r.data),

  update: (id: string, payload: Partial<CreateChangelogPayload>) =>
    apiClient
      .put<{ success: boolean; entry: ChangelogEntry }>(`/api/changelog/${id}`, payload)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient
      .delete<{ success: boolean }>(`/api/changelog/${id}`)
      .then((r) => r.data),
};

// ─── Audit API ────────────────────────────────────────────────────────────────

export type AuditDataResponse = {
  success: boolean;
  data: {
    generatedAt: string;
    enrollment: {
      totalStudents: number;
      totalFaculty: number;
      newEnrollments: number;
      studentFacultyRatio: number;
      totalClassrooms: number;
    };
    stats: {
      avgAttendance: number;
    };
    criterion2?: {
      academicPerformance: any[];
      subjectWiseFailure: any[];
    };
    criterion5?: {
      financialAudit: any;
    };
    criterion6?: {
      facultyWorkload: any[];
    };
  };
};

export const auditApi = {
  getAuditData: (startDate: string, endDate: string, criteria?: string) =>
    apiClient
      .get<AuditDataResponse>("/api/audit/data", { params: { startDate, endDate, criteria } })
      .then((r) => r.data),
};

// ─── Config & Feature Flags API ───────────────────────────────────────────────

export type FeatureFlag = {
  _id: string;
  key: string;
  description: string;
  isEnabled: boolean;
  module: string;
  updatedAt: string;
};

export const configApi = {
  getHealth: () =>
    apiClient
      .get<any>("/api/super-admin/health")
      .then((r) => {
        const raw = r.data;
        // Backend returns: { success, health: { overall, uptime, services: { mongodb, supabase, r2 }, osMetrics, warnings } }
        const h = raw?.health ?? raw;
        const mongoStatus = h?.services?.mongodb?.status ?? "UNKNOWN";
        return {
          status: h?.overall ?? "UNKNOWN",
          dbStatus: mongoStatus,
          uptime: h?.uptime ?? 0,
          services: h?.services ?? {},
          osMetrics: h?.osMetrics ?? null,
          warnings: h?.warnings ?? [],
          server: h?.server ?? null,
        };
      }),

  getFeatureFlags: () =>
    apiClient
      .get<any>("/api/super-admin/feature-flags")
      .then((r) => {
        const raw = r.data;
        // Backend returns: { success, flags: [...] }  (not data)
        const flags: FeatureFlag[] = raw?.flags ?? raw?.data ?? [];
        return { success: true, data: flags };
      }),

  toggleFeatureFlag: (key: string, isEnabled: boolean) =>
    apiClient
      .patch<{ success: boolean; data: FeatureFlag }>(`/api/super-admin/feature-flags/${key}/toggle`, { isEnabled })
      .then((r) => r.data),
};

// ─── Dashboard & Users API ────────────────────────────────────────────────────

export type DashboardOverview = {
  success: boolean;
  data: {
    totalUsers: number;
    totalOrganizations: number;
    activeUsers: number;
    revenue?: number;
    recentActivity: any[];
  };
};

export type SuperAdminUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  organization?: { _id: string; name: string };
  isEmailVerified: boolean;
  status?: string;
  createdAt: string;
  lastLogin?: string;
};

export type SuperAdminOrganization = {
  _id: string;
  name: string;
  orgType?: string;
  ownerName?: string;
  ownerEmail: string;
  status: "active" | "suspended" | "blocked" | string;
  plan?: string;
  city?: string;
  state?: string;
  userCount: number;
  totalUsers: number;
  maxStudents?: number | null;
  createdAt: string;
};

export const dashboardApi = {
  getOverview: () =>
    apiClient
      .get<any>("/api/admin/dashboard/overview")
      .then((r) => {
        const raw = r.data;
        // Backend returns flat: { totalUsers, totalOrgs, totalClassrooms, totalMemberships }
        // Mock returns nested: { success, data: { totalUsers, totalOrganizations, ... } }
        if (raw?.data) return raw as DashboardOverview; // mock shape
        // Normalize real backend shape
        return {
          success: true,
          data: {
            totalUsers: raw.totalUsers ?? 0,
            totalOrganizations: raw.totalOrgs ?? 0,
            activeUsers: raw.totalMemberships ?? 0,
            totalClassrooms: raw.totalClassrooms ?? 0,
            recentActivity: [],
          },
        } as DashboardOverview;
      }),

  getPlatformRevenue: () =>
    apiClient
      .get<{ success: boolean; data: any }>("/api/super-admin/revenue")
      .then((r) => r.data),

  getOrganizations: () =>
    apiClient
      .get<{ success: boolean; data: SuperAdminOrganization[]; total?: number }>("/api/super-admin/organizations")
      .then((r) => {
        const rows = Array.isArray(r.data?.data) ? r.data.data : null;

        if (!rows) {
          throw new Error("Organizations API returned an invalid response shape.");
        }

        return {
          success: r.data.success !== false,
          total: r.data.total ?? rows.length,
          data: rows.map((org) => ({
            ...org,
            name: org.name || "Untitled organization",
            ownerEmail: org.ownerEmail || "",
            userCount: Number(org.userCount ?? org.totalUsers ?? 0),
            totalUsers: Number(org.totalUsers ?? org.userCount ?? 0),
            status: org.status || "unknown",
          })),
        };
      }),
};

// ─── Direct Org Provisioning API (no demo required) ───────────────────────────
export type DirectProvisionPayload = {
  institutionName: string;
  orgType: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  city: string;
  state: string;
  plan?: "demo" | "active";
  maxStudents?: number;
};

export const directProvisionApi = {
  provision: (payload: DirectProvisionPayload) =>
    apiClient
      .post<{ success: boolean; message: string; admin: any; organization: any; activation?: any }>(
        "/api/super-admin/provision-direct",
        payload
      )
      .then((r) => r.data),
};

// ─── Helpdesk / Support Chat API ─────────────────────────────────────────────
export type HelpdeskThread = {
  id: string;
  subject: string;
  status: "open" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  orgName: string;
  userEmail: string;
  userName: string;
  lastMessage: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type HelpdeskMessage = {
  id: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
};

export const helpdeskApi = {
  listThreads: (params?: { status?: string; priority?: string }) =>
    apiClient
      .get<{ success: boolean; threads: HelpdeskThread[] }>("/api/super-admin/helpdesk/threads", { params })
      .then((r) => r.data),

  getThread: (threadId: string) =>
    apiClient
      .get<{ success: boolean; thread: HelpdeskThread; messages: HelpdeskMessage[] }>(
        `/api/super-admin/helpdesk/threads/${threadId}`
      )
      .then((r) => r.data),

  sendMessage: (threadId: string, body: string) =>
    apiClient
      .post<{ success: boolean }>(`/api/super-admin/helpdesk/threads/${threadId}/messages`, { body })
      .then((r) => r.data),

  updateThread: (threadId: string, payload: { status?: string; priority?: string }) =>
    apiClient
      .patch<{ success: boolean }>(`/api/super-admin/helpdesk/threads/${threadId}`, payload)
      .then((r) => r.data),

  markRead: (threadId: string) =>
    apiClient
      .patch<{ success: boolean }>(`/api/super-admin/helpdesk/threads/${threadId}/read`, {})
      .then((r) => r.data),
};

export const usersApi = {
  getAllUsers: () =>
    apiClient
      .get<{ success: boolean; users: SuperAdminUser[] }>("/api/admin/all-users")
      .then((r) => r.data),

  suspendUser: (id: string) =>
    apiClient
      .post<{ success: boolean }>(`/api/admin/suspend-user/${id}`)
      .then((r) => r.data),

  reactivateUser: (id: string) =>
    apiClient
      .post<{ success: boolean }>(`/api/admin/reactivate-user/${id}`)
      .then((r) => r.data),

  impersonateUser: (id: string) =>
    apiClient
      .post<{ success: boolean; token: string; user: any; message: string }>(`/api/super-admin/impersonate/${id}`)
      .then((r) => r.data),
};

// ─── Analytics API ────────────────────────────────────────────────────────────

export type DashboardAnalytics = {
  success: boolean;
  data: {
    userGrowth: Array<{ date: string; users: number }>;
    orgGrowth: Array<{ date: string; orgs: number }>;
    activeUsage: number;
    metrics: Record<string, any>;
  };
};

export const analyticsApi = {
  getDashboardAnalytics: () =>
    apiClient
      .get<DashboardAnalytics>("/api/admin/dashboard-analytics")
      .then((r) => r.data),
};

// ─── Alerts & Logs API ────────────────────────────────────────────────────────

export type ErrorLog = {
  _id: string;
  message: string;
  stack?: string;
  timestamp: string;
  level: string;
  context?: string;
  metadata?: any;
};

export type EmailLog = {
  _id: string;
  to: string;
  subject: string;
  status: "pending" | "sent" | "failed";
  error?: string;
  createdAt: string;
};

export const alertsApi = {
  getErrorLogs: async (params?: { search?: string; level?: string; category?: string; traceId?: string }) => {
    try {
      const r = await apiClient.get<any>("/api/super-admin/error-logs", { params });
      const raw = r.data;
      return { success: true, logs: raw?.errors ?? raw?.logs ?? [] };
    } catch (err: any) {
      if (!err.response || err.response.status >= 500) {
        try {
          const token = localStorage.getItem("rescue_token");
          if (!token) throw new Error("RESCUE_REQUIRED");
          const rescueClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "" });
          const r = await rescueClient.get("/api/rescue/error-logs", {
            headers: { Authorization: `Bearer ${token}` }
          });
          return { success: true, logs: r.data.logs ?? [], isRescue: true };
        } catch (rescueErr) {
          throw new Error("RESCUE_REQUIRED");
        }
      }
      throw err;
    }
  },

  getEmailLogs: () =>
    apiClient
      .get<{ docs: EmailLog[]; totalDocs: number; page: number; totalPages: number }>("/api/admin/email-logs")
      .then((r) => r.data),

  resendEmail: (jobId: string) =>
    apiClient
      .post<{ message: string }>(`/api/admin/email-resend/${jobId}`)
      .then((r) => r.data),
};

// ─── Onboarding & Organizations API ───────────────────────────────────────────

export type PendingOrganization = {
  _id: string;
  name: string;
  domain: string;
  type: string;
  email: string;
  ownerEmail?: string;
  ownerName?: string;
  status: string;
  createdAt: string;
};

export const onboardingApi = {
  getPendingOrganizations: () =>
    apiClient
      .get<{ success: boolean; data: PendingOrganization[] }>("/api/organization?status=pending")
      .then((r) => r.data),

  approveOrganization: (id: string) =>
    apiClient
      .patch<{ success: boolean; message: string; org: any }>(`/api/organization/${id}`, { status: "approved" })
      .then((r) => r.data),

  createOrganization: (payload: any) =>
    apiClient
      .post<{ success: boolean; message: string; organization: any }>("/api/super-admin/provision-direct", payload)
      .then((r) => r.data),
};

// ─── Billing API ─────────────────────────────────────────────────────────────

export type OrgSubscription = {
  _id?: string;
  organization_id: string;
  plan: string;
  expiresAt?: string;
  features?: Record<string, boolean>;
  metadata?: {
    max_students?: number;
    max_faculty?: number;
    storage_limit_gb?: number;
  };
};

export const billingApi = {
  getOrgSubscription: (orgId: string) =>
    apiClient
      .get<{ success: boolean; subscription: OrgSubscription }>(`/api/super-admin/subscription/${orgId}`)
      .then((r) => r.data),

  updateOrgSubscription: (orgId: string, payload: Partial<OrgSubscription>) =>
    apiClient
      .put<{ success: boolean; message: string; subscription: OrgSubscription }>(`/api/super-admin/subscription/${orgId}`, payload)
      .then((r) => r.data),
};

// ─── Org Detail Types ─────────────────────────────────────────────────────────

export type OrgUsage = {
  orgId: string;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalClasses: number;
  storageUsedGB: number;
  emailsSent: number;
  activeUsers: number;
  lastUpdated: string;
};

export type OrgBillingRates = {
  basePricePerMonth: number;
  pricePerGB: number;
  pricePerEmail: number;
  pricePerSms: number;
  pricePerApiRequest: number;
  pricePerAiToken: number;
  pricePerAgoraMinute: number;
};

export type OrgDetailSubscription = {
  _id?: string;
  plan: string;
  status?: string;
  isPaid?: boolean;
  expiresAt?: string;
  features?: Record<string, boolean>;
  billing?: OrgBillingRates;
  metadata?: {
    max_students?: number;
    max_faculty?: number;
    storage_limit_gb?: number;
  };
};

export type OrgDetail = {
  _id: string;
  name: string;
  org_type?: string;
  structure_type?: string;
  status: string;
  plan?: string;
  city?: string;
  state?: string;
  createdAt: string;
  owner_id?: string;
  ownerName?: string;
  owner?: { _id: string; name: string; email: string; phone?: string };
  usage: OrgUsage;
  subscription: OrgDetailSubscription;
};

// ─── Org Detail API ───────────────────────────────────────────────────────────

export const orgDetailApi = {
  /** Fetch full org detail: overview + live usage metrics + subscription/billing */
  getOrgDetail: (orgId: string) =>
    apiClient
      .get<{ success: boolean; data: OrgDetail }>(`/api/super-admin/organizations/${orgId}`)
      .then((r) => r.data),

  /** Update organization onboarding progress steps */
  updateOrganizationOnboarding: (orgId: string, payload: Record<string, boolean>) =>
    apiClient
      .put<{ success: boolean; message: string; data: Record<string, any> }>(
        `/api/super-admin/orgs/${orgId}/onboarding`,
        payload
      )
      .then((r) => r.data),

  /** Save billing rates for a specific org */
  saveBillingRates: (orgId: string, rates: Partial<OrgBillingRates> & { plan?: string }) =>
    apiClient
      .put<{ success: boolean; message: string; subscription: OrgDetailSubscription }>(
        `/api/super-admin/subscription/${orgId}`,
        rates
      )
      .then((r) => r.data),

  // RAZORPAY PLATFORM BILLING
  createRazorpayOrder: async (orgId: string, amount: number) => {
    const { data } = await apiClient.post(`/api/super-admin/subscription/${orgId}/razorpay-order`, { amount });
    return data;
  },

  verifyRazorpayPayment: async (orgId: string, payload: any) => {
    const { data } = await apiClient.post(`/api/super-admin/subscription/${orgId}/razorpay-verify`, payload);
    return data;
  }
};


// --- AI Agent Reviews API ----------------------------------------------------

export type AgentReview = {
  id: string;
  message_id: string;
  user_email: string;
  type: 'down';
  feedback_text: string | null;
  file_url: string | null;
  status: 'pending' | 'actioned' | 'acknowledged' | 'no_action';
  created_at: string;
  user_details: {
    id: string;
    name: string;
    profilePicture?: string;
    orgName: string;
    role: string;
  } | null;
};

export const aiAgentReviewsApi = {
  getAll: () =>
    apiClient
      .get<{ reviews: AgentReview[] }>('/api/ai/agent-reviews')
      .then((r) => r.data),
  updateStatus: (id: string, status: AgentReview['status']) =>
    apiClient
      .put<{ success: boolean; review: AgentReview }>(`/api/ai/agent-reviews/${id}/status`, { status })
      .then((r) => r.data),
  delete: (id: string) =>
    apiClient
      .delete<{ success: boolean; message: string }>(`/api/ai/agent-reviews/${id}`)
      .then((r) => r.data),
  bulkDelete: (ids: string[]) =>
    apiClient
      .post<{ success: boolean; message: string }>('/api/ai/agent-reviews/bulk-delete', { ids })
      .then((r) => r.data),
};

