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

import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";

const now = new Date().toISOString();

const mockUser = {
  _id: "mock-user-super-admin",
  id: "mock-user-super-admin",
  name: "Mock Super Admin",
  email: "mock.superadmin@classgrid.local",
  role: "super_admin",
  organization_id: null,
};

const mockBranding = {
  authType: "platform",
  name: "Classgrid",
  shortName: "Classgrid",
  tagline: "Classgrid",
  logoUrl: "/logos/logo.png",
  campusImageUrl: "",
  leftVariant: "default",
  subdomain: "",
};

const mockOrganizations = [
  {
    _id: "mock-org-1",
    name: "Northstar Public School",
    domain: "northstar.edu",
    org_type: "school",
    ownerEmail: "owner@northstar.local",
    status: "active",
    createdAt: now,
  },
  {
    _id: "mock-org-2",
    name: "Riverside Junior College",
    domain: "riverside.edu",
    org_type: "jr_college",
    ownerEmail: "admin@riverside.local",
    status: "trial",
    createdAt: now,
  },
];

const mockUsers = [
  {
    _id: "mock-user-super-admin",
    name: "Mock Super Admin",
    email: "mock.superadmin@classgrid.local",
    role: "super_admin",
    isEmailVerified: true,
    status: "active",
    createdAt: now,
    lastLogin: now,
  },
  {
    _id: "mock-user-org-admin",
    name: "Mock Org Admin",
    email: "mock.admin@classgrid.local",
    role: "org_admin",
    organization: { _id: "mock-org-1", name: "Northstar Public School" },
    isEmailVerified: true,
    status: "active",
    createdAt: now,
    lastLogin: now,
  },
];

function getPathname(config: InternalAxiosRequestConfig) {
  const url = new URL(config.url || "/", "http://classgrid.local");
  return url.pathname.replace(/\/+$/, "") || "/";
}

function getMockData(config: InternalAxiosRequestConfig): unknown {
  const pathname = getPathname(config);
  const method = (config.method || "get").toLowerCase();

  if (pathname === "/api/auth/me" && method === "get") {
    return { user: mockUser };
  }

  if (pathname === "/api/user/profile" && method === "get") {
    return { user: mockUser };
  }

  if (pathname === "/api/user/email-preferences" && method === "get") {
    return {
      emailNotifications: {
        digestMode: "instant",
        global: true,
        announcements: true,
        notes: true,
        quizzes: true,
        joinApproval: true,
        emailOnPost: true,
      }
    };
  }

  if (pathname === "/api/auth/check-email" && method === "post") {
    return { exists: true, hasPassword: true, role: "super_admin" };
  }

  if (pathname === "/api/auth/login" && method === "post") {
    return {
      message: "Mock login successful. No live database was contacted.",
      user: mockUser,
      organization: null,
    };
  }

  if (pathname === "/api/auth/logout" && method === "post") {
    return { message: "Mock logout successful." };
  }

  if (pathname === "/api/public/auth-branding" && method === "get") {
    return { success: true, branding: mockBranding };
  }

  if (pathname === "/api/admin/dashboard-summary" && method === "get") {
    return {
      totalOrganizations: 42,
      totalFaculty: 318,
      totalStudents: 4120,
    };
  }

  if (pathname === "/api/admin/dashboard/overview" && method === "get") {
    return {
      success: true,
      data: {
        totalUsers: 4438,
        totalOrganizations: 42,
        activeUsers: 1820,
        revenue: 0,
        recentActivity: [
          { title: "Mock organization onboarded", timestamp: now },
          { title: "Mock support ticket resolved", timestamp: now },
          { title: "Mock feature flag updated", timestamp: now },
        ],
      },
    };
  }

  if (pathname === "/api/admin/dashboard/organizations" && method === "get") {
    return { success: true, data: mockOrganizations };
  }

  if (pathname === "/api/admin/all-users" && method === "get") {
    return { success: true, users: mockUsers };
  }

  if (pathname === "/api/admin/dashboard-analytics" && method === "get") {
    return {
      success: true,
      data: {
        userGrowth: [
          { date: "2026-04-01", users: 1200 },
          { date: "2026-04-15", users: 1500 },
          { date: "2026-05-01", users: 1820 },
        ],
        orgGrowth: [
          { date: "2026-04-01", orgs: 28 },
          { date: "2026-04-15", orgs: 36 },
          { date: "2026-05-01", orgs: 42 },
        ],
        activeUsage: 72,
        metrics: {},
      },
    };
  }

  if (pathname === "/api/super-admin/health" && method === "get") {
    return { status: "mock", uptime: 0, dbStatus: "mocked-offline" };
  }

  if (pathname === "/api/super-admin/feature-flags" && method === "get") {
    return {
      success: true,
      data: [
        {
          _id: "mock-flag-1",
          key: "mock_api_mode",
          description: "Local mock API mode is active",
          isEnabled: true,
          module: "dev",
          updatedAt: now,
        },
      ],
    };
  }

  if (pathname.includes("/feature-flags/") && pathname.endsWith("/toggle") && method === "patch") {
    return { success: true, data: { _id: "mock-flag-1", key: "mock_api_mode", isEnabled: true, updatedAt: now } };
  }

  if (pathname === "/api/super-admin/leads" && method === "get") {
    return {
      success: true,
      leads: [
        {
          _id: "mock-lead-1",
          institution: "Northstar Public School",
          contactName: "Priya Mehta",
          contactEmail: "priya@example.local",
          contactPhone: "+91 90000 00000",
          city: "Pune",
          state: "Maharashtra",
          segment: "school",
          source: "demo",
          status: "demo_scheduled",
          notes: "Mock lead",
          createdAt: now,
          updatedAt: now,
        },
      ],
      total: 1,
    };
  }

  if (pathname === "/api/support/admin/tickets" && method === "get") {
    return {
      success: true,
      tickets: [
        {
          _id: "mock-ticket-1",
          subject: "Mock billing question",
          message: "This ticket is sample data.",
          category: "billing",
          status: "open",
          priority: "medium",
          submitterEmail: "admin@example.local",
          submitterName: "Mock Admin",
          replies: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
      total: 1,
      stats: { open: 1, inProgress: 0, resolved: 0 },
    };
  }

  if (pathname === "/api/reviews" && method === "get") {
    return [
      {
        _id: "mock-review-1",
        name: "Mock Reviewer",
        college: "Classgrid Demo Institute",
        helped: "Dashboard workflow",
        rating: 5,
        suggestion: "Sample review only.",
        isPublic: true,
        createdAt: now,
      },
    ];
  }

  if (pathname === "/api/super-admin/feedback" && method === "get") {
    return {
      success: true,
      data: [
        {
          _id: "mock-feedback-1",
          user: { name: "Mock User", email: "user@example.local", role: "org_admin" },
          organization: { name: "Northstar Public School" },
          category: "general",
          message: "Sample feedback in mock mode.",
          status: "new",
          createdAt: now,
        },
      ],
    };
  }

  if (pathname === "/api/super-admin/notifications" && method === "get") {
    return {
      success: true,
      notifications: [
        {
          _id: "mock-announcement-1",
          title: "Mock maintenance window",
          body: "Sample announcement.",
          target: "all",
          scheduledAt: now,
          status: "draft",
          category: "platform",
        },
      ],
    };
  }

  if (pathname === "/api/changelog" && method === "get") {
    return {
      success: true,
      entries: [
        {
          _id: "mock-changelog-1",
          version: "mock-2026.05",
          title: "Mock mode enabled",
          body: "Local browser session uses sample data.",
          type: "announcement",
          highlights: ["No MongoDB calls", "No Supabase calls"],
          isPublished: true,
          publishedAt: now,
          reactions: {},
        },
      ],
    };
  }

  if (pathname === "/api/audit/data" && method === "get") {
    return {
      success: true,
      data: {
        generatedAt: now,
        enrollment: {
          totalStudents: 4120,
          totalFaculty: 318,
          newEnrollments: 84,
          studentFacultyRatio: 13,
          totalClassrooms: 156,
        },
        stats: { avgAttendance: 86 },
      },
    };
  }

  if (pathname === "/api/super-admin/error-logs" && method === "get") {
    return { success: true, logs: [] };
  }

  if (pathname === "/api/admin/email-logs" && method === "get") {
    return { docs: [], totalDocs: 0, page: 1, totalPages: 1 };
  }

  if (pathname === "/api/admin/pending-organizations" && method === "get") {
    return { success: true, data: mockOrganizations };
  }

  if (pathname.includes("/api/super-admin/subscription/") && method === "get") {
    return {
      success: true,
      subscription: {
        _id: "mock-subscription-1",
        organization_id: pathname.split("/").pop() || "mock-org-1",
        plan: "pro",
        expiresAt: "2026-12-31T00:00:00.000Z",
        features: { mockMode: true },
        metadata: { storage_limit_gb: 100 },
      },
    };
  }

  return {
    success: true,
    data: [],
    message: `Mock response for ${method.toUpperCase()} ${pathname}`,
  };
}

export const mockApiAdapter: AxiosAdapter = async (config) => {
  const response: AxiosResponse = {
    data: getMockData(config),
    status: 200,
    statusText: "OK",
    headers: { "x-classgrid-mock-api": "true" },
    config,
  };

  return response;
};
