// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import { ClassgridLogoIcon } from "@/components/layout/ClassgridLogoIcon";
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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

/**
 * ==============================================================================
 * 🛑 AI AGENT WARNING: DO NOT REMOVE "CLASSGRID TALK" OR "CHAT" 🛑
 * ==============================================================================
 * This sidebar configuration is carefully maintained.
 * DO NOT remove "Classgrid Talk" or "Chat" from any of the dashboards.
 * DO NOT consolidate or simplify these menus unless explicitly asked by the user.
 * ==============================================================================
 */
// 🛑 AI AGENT INSTRUCTION: DO NOT EDIT OR REFACTOR THIS FILE.
// The user explicitly requested that AI agents must NEVER modify the sidebar 
// layout, section headers, icons, or visual logic without extreme explicit permission.
//
// PAST AI MISTAKES TO NEVER REPEAT:
// - Disabled the Storage link: An agent accidentally ran a git checkout to a version of the sidebar from a month ago, completely breaking Storage.
// - Added colorful icons: An agent wrongly added bright green active states (text-emerald-500) to icons. DO NOT add colors to icons.
// - Added extra "Classgrid" text: An agent wrongly added the word "Classgrid" above the switcher causing an Icons is not defined crash.
// - Enabled/Disabled section labels: An agent messed around with <SidebarGroupLabel> hiding and showing it. Leave the labels alone.
//
// 🛑 STOP AND ASK BEFORE MAKING ANY CHANGES HERE.

import {
  AlertTriangle, Award, Bell, BookOpen, Bot, Briefcase, Building2, Bus,
  Calendar, CheckSquare, ClipboardList, CreditCard, Database, DoorOpen,
  Download, FileBarChart, FileText, Flag, Globe, GraduationCap, HelpCircle,
  Home, IndianRupee, LayoutDashboard, LogOut, Mail, MessageSquare, Megaphone,
  Plus, RotateCcw, Search, Settings, Shield, Sparkles, Target, Ticket, Trash2,
  User, UserPlus, Users, UtensilsCrossed, Activity, Zap, Power, Compass, Play
} from "lucide-react";

import type { DashboardConfig, DashboardMenuItem, DashboardRole, SidebarItem } from "@/layouts/types";

function buildScopedRoute(scope: string | undefined, segment: string) {
  return scope ? `${scope}${segment}` : segment;
}

function createDefaultMenuItems(scope?: string): DashboardMenuItem[] {
  return [
    { label: "Profile", to: buildScopedRoute(scope, "/profile"), icon: User },
    { label: "Settings", to: buildScopedRoute(scope, "/settings"), icon: Settings },
    {
      label: "Help & Support",
      to: buildScopedRoute(scope, "/support"),
      icon: HelpCircle,
      dividerBefore: true
    },
    { label: "Log out", icon: LogOut }
  ];
}

const superAdminMenuItems: DashboardMenuItem[] = [
  { label: "Profile", to: "/superadmin/profile", icon: User },
  { label: "System Config", to: "/superadmin/config", icon: Settings },
  { label: "Settings", to: "/superadmin/settings", icon: Settings },
  { label: "Log out", icon: LogOut, dividerBefore: true }
];

const orgAdminMenuItems: DashboardMenuItem[] = [
  { label: "Profile", to: "/org/profile", icon: User },
  { label: "Organization Details", to: "/org/details", icon: Building2 },
  { label: "Settings", to: "/org/settings", icon: Settings },
  { label: "Help & Support", to: "/org/support", icon: HelpCircle, dividerBefore: true },
  { label: "Log out", icon: LogOut }
];

export const dashboardConfigs: DashboardConfig[] = [
  // ───────────────────────────────────────────────
  // 1. SUPER ADMIN
  // ───────────────────────────────────────────────
  {
    role: "super_admin",
    logo: "Classgrid",
    brandIcon: Zap,
    subtitle: "Super Admin",
    mobileMode: "desktop-only",
    sections: [
      {
        label: "OVERVIEW",
        items: [
          { label: "Agent", to: "/superadmin/dashboard", icon: Play },
          { label: "Analytics", to: "/superadmin/analytics", icon: FileBarChart }
        ]
      },
      {
        label: "ORGANIZATIONS",
        items: [
          { label: "All Organizations", to: "/superadmin/orgs", icon: Building2 },
          { label: "Demo Leads", to: "/superadmin/leads", icon: ClipboardList },
        ]
      },
      {
        label: "USERS",
        items: [
          { label: "Global Users", to: "/superadmin/global-users", icon: Users },
          { label: "Platform Team", to: "/superadmin/team", icon: User },
          { label: "GDPR & Privacy", to: "/superadmin/gdpr", icon: Shield },
          { label: "AI Usage & Credits", to: "/superadmin/ai-usage", icon: Bot },
        ]
      },
      {
        label: "FINANCE",
        items: [
          { label: "Revenue", to: "/super-admin/billing/revenue", icon: IndianRupee },
          { label: "Transactions", to: "/super-admin/billing/transactions", icon: CreditCard },
          { label: "Failed Payments", to: "/super-admin/billing/failed-payments", icon: AlertTriangle },
          { label: "Plans & Billing", to: "/super-admin/billing/plans", icon: CreditCard },
        ]
      },
      {
        label: "SYSTEM",
        items: [
          { label: "Feature Flags", to: "/superadmin/feature-flags", icon: Zap },
          { label: "Rollback Actions", to: "/superadmin/rollback", icon: RotateCcw },
          { label: "Audit Logs", to: "/superadmin/audit-logs", icon: Shield },
          { label: "Storage", to: "/superadmin/storage/files", icon: Database, hasNestedNav: true },
          { label: "System Config", to: "/superadmin/config", icon: Settings }
        ]
      },
      {
        label: "PLATFORM DOMAINS",
        items: [
          { label: "Custom Domains", to: "/superadmin/domains", icon: Globe }
        ]
      },
      {
        label: "PLATFORM",
        items: [
          { label: "Subscribers", to: "/superadmin/subscribers", icon: Mail, restrictedToEmail: "support@classgrid.in" },
          { label: "Grid", to: "/superadmin/chat", icon: ClassgridLogoIcon },
          { label: "Agent Reviews", to: "/superadmin/agent-reviews", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/join-requests", icon: Users },
          { label: "Classgrid Talk", to: "/superadmin/talk", icon: ClassgridLogoIcon },
          { label: "Support Tickets", to: "/superadmin/support", icon: Ticket }
        ]
      },

    ],
    identity: {
      name: "Classgrid Support",
      subtitle: "Owner",
      email: "support@classgrid.in",
      cardTitle: "Classgrid Support",
      cardSubtitle: "support@classgrid.in",
      menuItems: superAdminMenuItems
    }
  },

  // ───────────────────────────────────────────────
  // 2. ORG ADMIN
  // ───────────────────────────────────────────────
  {
    role: "org_admin",
    logo: "Classgrid",
    brandIcon: Building2,
    mobileMode: "desktop-only",
    sections: [
      {
        label: "OVERVIEW",
        items: [
          { label: "Agent", to: "/org/admin/dashboard", icon: Play },
          { label: "Usage", to: "/org/admin/usage", icon: Activity },
          { label: "Billing", to: "/org/admin/billing", icon: CreditCard },
          { label: "Announcements", to: "/org/announcements", icon: Megaphone }
        ]
      },
      {
        label: "ACADEMICS",
        items: [
          { label: "Students", to: "/org/students", icon: Users },
          { label: "Faculty", to: "/org/faculty", icon: Briefcase },
          { label: "Classrooms", to: "/org/classrooms", icon: Home },
          { label: "Timetable", to: "/org/timetable", icon: Calendar },
          { label: "Academic Calendar", to: "/org/calendar", icon: Calendar },
          { label: "Curriculum", to: "/org/curriculum", icon: BookOpen }
        ]
      },
      {
        label: "MANAGEMENT",
        items: [
          { label: "Admissions", to: "/org/admissions", icon: GraduationCap },
          { label: "Fees & Payments", to: "/org/fees", icon: CreditCard },
          { label: "Examinations", to: "/org/examinations", icon: FileText },
          { label: "Marks & Results", to: "/org/results", icon: FileBarChart },
          { label: "Attendance", to: "/org/attendance", icon: ClipboardList },
          { label: "Leave Management", to: "/org/leaves", icon: Calendar }
        ]
      },
      {
        label: "FACILITIES",
        items: [
          { label: "Library", to: "/org/library", icon: BookOpen },
          { label: "Hostel", to: "/org/hostel", icon: DoorOpen },
          { label: "Canteen", to: "/org/canteen", icon: UtensilsCrossed },
          { label: "Transport", to: "/org/transport", icon: Bus }
        ]
      },
      {
        label: "COMPLIANCE",
        items: [
          { label: "NBA / NAAC", to: "/org/compliance/nba-naac", icon: Shield },
          { label: "SARAL / DTE Reports", to: "/org/compliance/reports", icon: FileText },
          { label: "Audit", to: "/org/audit", icon: Shield }
        ]
      },
      {
        label: "ENGAGEMENT",
        items: [
          { label: "Events & Seminars", to: "/org/events", icon: Calendar },
          { label: "Alumni & Placements", to: "/org/alumni", icon: GraduationCap },
          { label: "Feedback", to: "/org/feedback", icon: ClassgridLogoIcon },
          { label: "Grid", to: "/org/chat", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/join-requests", icon: Users }
        ]
      },
      {
        label: "AI & TOOLS",
        items: [
          { label: "Analytics", to: "/org/analytics", icon: FileBarChart },
          { label: "College Website", to: "/org/website", icon: Globe },
          { label: "Certificates", to: "/org/certificates", icon: FileText }
        ]
      },
      {
        label: "SETTINGS & SETUP",
        items: [
          { label: "Members", to: "/org/admin/members", icon: Users },
          { label: "Academic Setup", to: "/org/admin/academic-setup", icon: Settings }
        ]
      }
    ],
    identity: {
      name: "Admin Name",
      subtitle: "Org Admin",
      cardTitle: "Admin Name",
      cardSubtitle: "Org Admin",
      menuItems: orgAdminMenuItems
    }
  },

  // ───────────────────────────────────────────────
  // 3. ADMISSION DEPARTMENT — FULL wireframe
  // ───────────────────────────────────────────────
  {
    role: "admission_dept",
    logo: "Classgrid",
    subtitle: "Admission Dept",
    mobileMode: "desktop-only",
    sections: [
      {
        label: "ADMISSIONS",
        items: [
          { label: "Agent", to: "/dept/admissions/dashboard", icon: Play },
          { label: "All Applications", to: "/dept/admissions/applications", icon: ClipboardList },
          { label: "New Application", to: "/dept/admissions/new", icon: Plus },
          { label: "Document Verification", to: "/dept/admissions/documents", icon: FileText },
          { label: "Merit Lists", to: "/dept/admissions/merit", icon: Award },
          { label: "Enrollment", to: "/dept/admissions/enroll", icon: CheckSquare }
        ]
      },
      {
        label: "CONFIGURATION",
        items: [
          { label: "Admission Config", to: "/dept/admissions/config", icon: Settings },
          { label: "Fee Structure", to: "/dept/admissions/fees", icon: CreditCard },
          { label: "Schedule & Rounds", to: "/dept/admissions/schedule", icon: Calendar },
          { label: "Form Builder", to: "/dept/admissions/form-builder", icon: FileText }
        ]
      },
      {
        label: "REPORTS",
        items: [
          { label: "Analytics", to: "/dept/admissions/analytics", icon: FileBarChart },
          { label: "Export Data", to: "/dept/admissions/export", icon: FileBarChart },
          { label: "CET / DTE Reports", to: "/dept/admissions/cet-dte", icon: Shield }
        ]
      },
      {
        label: "CRM",
        items: [
          { label: "Lead Tracking", to: "/dept/admissions/crm", icon: Target },
          { label: "Communication", to: "/dept/admissions/comm", icon: Mail },
          { label: "Bulk SMS / WhatsApp", to: "/dept/admissions/bulk", icon: Megaphone },
          { label: "Website CMS", to: "/dept/admissions/website", icon: Globe },
          { label: "Grid", to: "/chat", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/join-requests", icon: Users },
          { label: "Audit", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "Clerk Name",
      subtitle: "Admissions",
      menuItems: createDefaultMenuItems("/dept/admissions")
    }
  },

  // ───────────────────────────────────────────────
  // 4. FEES DEPARTMENT — FULL wireframe
  // ───────────────────────────────────────────────
  {
    role: "fees_dept",
    logo: "Classgrid",
    subtitle: "Fees & Accounts",
    mobileMode: "desktop-only",
    sections: [
      {
        label: "FEES",
        items: [
          { label: "Agent", to: "/dept/fees/dashboard", icon: Play },
          { label: "Collect Payment", to: "/dept/fees/collect", icon: CreditCard },
          { label: "All Transactions", to: "/dept/fees/transactions", icon: FileBarChart },
          { label: "Defaulters List", to: "/dept/fees/defaulters", icon: AlertTriangle },
          { label: "Receipts", to: "/dept/fees/receipts", icon: FileText }
        ]
      },
      {
        label: "CONFIGURATION",
        items: [
          { label: "Fee Structure", to: "/dept/fees/structure", icon: Settings },
          { label: "Installment Plans", to: "/dept/fees/installments", icon: Calendar },
          { label: "Scholarships & Waivers", to: "/dept/fees/scholarships", icon: Award },
          { label: "Late Fee Rules", to: "/dept/fees/late-rules", icon: AlertTriangle }
        ]
      },
      {
        label: "REPORTS",
        items: [
          { label: "Collection Analytics", to: "/dept/fees/analytics", icon: FileBarChart },
          { label: "Export Reports", to: "/dept/fees/export", icon: FileBarChart },
          { label: "Class-wise Summary", to: "/dept/fees/summary", icon: ClipboardList },
          { label: "Bank Reconciliation", to: "/dept/fees/reconciliation", icon: CreditCard },
          { label: "Website CMS", to: "/dept/fees/website", icon: Globe },
          { label: "Grid", to: "/chat", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/join-requests", icon: Users },
          { label: "Audit", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "Accountant",
      subtitle: "Fees Dept",
      menuItems: createDefaultMenuItems("/dept/fees")
    }
  },

  // ───────────────────────────────────────────────
  // 5. EXAMINATION DEPARTMENT — FULL wireframe
  // ───────────────────────────────────────────────
  {
    role: "exam_dept",
    logo: "Classgrid",
    subtitle: "Examination Cell",
    mobileMode: "desktop-only",
    sections: [
      {
        label: "EXAMS",
        items: [
          { label: "Agent", to: "/dept/exams/dashboard", icon: Play },
          { label: "Exam Schedule", to: "/dept/exams/schedule", icon: Calendar },
          { label: "Create Exam", to: "/dept/exams/create", icon: Plus },
          { label: "Online Exams", to: "/dept/exams/online", icon: Globe },
          { label: "Hall Tickets", to: "/dept/exams/hall-tickets", icon: Ticket }
        ]
      },
      {
        label: "RESULTS",
        items: [
          { label: "Marks Entry", to: "/dept/exams/marks", icon: ClipboardList },
          { label: "Results Processing", to: "/dept/exams/results", icon: FileBarChart },
          { label: "Grade Sheets", to: "/dept/exams/grades", icon: FileText },
          { label: "Internal Assessment", to: "/dept/exams/internal", icon: BookOpen }
        ]
      },
      {
        label: "QUESTION BANK",
        items: [
          { label: "Question Pool", to: "/dept/exams/questions", icon: BookOpen },
          { label: "AI Paper Generator", to: "/dept/exams/ai-paper", icon: Bot },
          { label: "Past Papers", to: "/dept/exams/past-papers", icon: FileText }
        ]
      },
      {
        label: "REPORTS",
        items: [
          { label: "Performance Analytics", to: "/dept/exams/analytics", icon: FileBarChart },
          { label: "Export", to: "/dept/exams/export", icon: FileBarChart },
          { label: "Toppers & Awards", to: "/dept/exams/toppers", icon: Award },
          { label: "Website CMS", to: "/dept/exams/website", icon: Globe },
          { label: "Grid", to: "/chat", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/join-requests", icon: Users },
          { label: "Audit", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "Exam Controller",
      subtitle: "Exams Dept",
      menuItems: createDefaultMenuItems("/dept/exams")
    }
  },

  // ───────────────────────────────────────────────
  // 6. LIBRARY DEPARTMENT — FULL wireframe
  // ───────────────────────────────────────────────
  {
    role: "library_dept",
    logo: "Classgrid",
    subtitle: "Library",
    mobileMode: "desktop-only",
    sections: [
      {
        label: "LIBRARY",
        items: [
          { label: "Agent", to: "/dept/library/dashboard", icon: Play },
          { label: "All Books", to: "/dept/library/books", icon: BookOpen },
          { label: "Add Book", to: "/dept/library/add", icon: Plus },
          { label: "Search Catalog", to: "/dept/library/search", icon: Search }
        ]
      },
      {
        label: "CIRCULATION",
        items: [
          { label: "Issue Book", to: "/dept/library/issue", icon: BookOpen },
          { label: "Return Book", to: "/dept/library/return", icon: DoorOpen },
          { label: "Overdue Books", to: "/dept/library/overdue", icon: AlertTriangle },
          { label: "Issue History", to: "/dept/library/history", icon: ClipboardList }
        ]
      },
      {
        label: "DIGITAL",
        items: [
          { label: "E-Books", to: "/dept/library/ebooks", icon: FileText },
          { label: "Journal Subscriptions", to: "/dept/library/journals", icon: BookOpen },
          { label: "Notes Marketplace", to: "/dept/library/notes", icon: FileText }
        ]
      },
      {
        label: "REPORTS",
        items: [
          { label: "Usage Analytics", to: "/dept/library/analytics", icon: FileBarChart },
          { label: "Stock Report", to: "/dept/library/stock", icon: ClipboardList },
          { label: "Website CMS", to: "/dept/library/website", icon: Globe },
          { label: "Grid", to: "/chat", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/join-requests", icon: Users },
          { label: "Audit", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "Librarian",
      subtitle: "Library Dept",
      menuItems: createDefaultMenuItems("/dept/library")
    }
  },

  // ───────────────────────────────────────────────
  // 7. ATTENDANCE DEPARTMENT — FULL wireframe
  // ───────────────────────────────────────────────
  {
    role: "attendance_dept",
    logo: "Classgrid",
    subtitle: "Attendance",
    mobileMode: "desktop-only",
    sections: [
      {
        label: "ATTENDANCE",
        items: [
          { label: "Agent", to: "/dept/attendance/dashboard", icon: Play },
          { label: "Mark Attendance", to: "/dept/attendance/mark", icon: CheckSquare },
          { label: "Daily Report", to: "/dept/attendance/daily", icon: FileText },
          { label: "Monthly Report", to: "/dept/attendance/monthly", icon: Calendar }
        ]
      },
      {
        label: "TRACKING",
        items: [
          { label: "Low Attendance (< 75%)", to: "/dept/attendance/low", icon: AlertTriangle },
          { label: "Parent Notifications", to: "/dept/attendance/notify", icon: Mail },
          { label: "Class-wise Summary", to: "/dept/attendance/classwise", icon: ClipboardList }
        ]
      },
      {
        label: "REPORTS",
        items: [
          { label: "Analytics", to: "/dept/attendance/analytics", icon: FileBarChart },
          { label: "Export", to: "/dept/attendance/export", icon: FileBarChart },
          { label: "SARAL Compliance", to: "/dept/attendance/saral", icon: Shield },
          { label: "Website CMS", to: "/dept/attendance/website", icon: Globe },
          { label: "Grid", to: "/chat", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/join-requests", icon: Users },
          { label: "Audit", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "Coordinator",
      subtitle: "Attendance Dept",
      menuItems: createDefaultMenuItems("/dept/attendance")
    }
  },

  // ───────────────────────────────────────────────
  // 8. HR & PAYROLL — FULL wireframe
  // ───────────────────────────────────────────────
  {
    role: "hr_dept",
    logo: "Classgrid",
    subtitle: "HR & Payroll",
    mobileMode: "desktop-only",
    sections: [
      {
        label: "STAFF",
        items: [
          { label: "Agent", to: "/dept/hr/dashboard", icon: Play },
          { label: "All Staff", to: "/dept/hr/staff", icon: Users },
          { label: "Add Staff", to: "/dept/hr/add-staff", icon: Plus },
          { label: "Departments", to: "/dept/hr/departments", icon: Building2 },
          { label: "Grid", to: "/chat", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/join-requests", icon: Users }
        ]
      },
      {
        label: "LEAVE",
        items: [
          { label: "Leave Requests", to: "/dept/hr/leave-requests", icon: Calendar },
          { label: "Leave Policy", to: "/dept/hr/leave-policy", icon: FileText },
          { label: "Leave Balance", to: "/dept/hr/leave-balance", icon: ClipboardList },
          { label: "Holiday Calendar", to: "/dept/hr/holidays", icon: Calendar }
        ]
      },
      {
        label: "PAYROLL",
        items: [
          { label: "Salary Processing", to: "/dept/hr/payroll", icon: CreditCard },
          { label: "Pay Slips", to: "/dept/hr/payslips", icon: FileText },
          { label: "Payroll Reports", to: "/dept/hr/payroll-reports", icon: FileBarChart },
          { label: "Website CMS", to: "/dept/hr/website", icon: Globe },
          { label: "Audit", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "HR Manager",
      subtitle: "HR Dept",
      menuItems: createDefaultMenuItems("/dept/hr")
    }
  },

  // ───────────────────────────────────────────────
  // 9. HOSTEL & TRANSPORT — FULL wireframe
  // ───────────────────────────────────────────────
  {
    role: "hostel_dept",
    logo: "Classgrid",
    subtitle: "Hostel & Transport",
    mobileMode: "desktop-only",
    sections: [
      {
        label: "HOSTEL",
        items: [
          { label: "Agent", to: "/dept/hostel/dashboard", icon: Play },
          { label: "Room Allocation", to: "/dept/hostel/rooms", icon: Home },
          { label: "Residents", to: "/dept/hostel/residents", icon: Users },
          { label: "Complaints", to: "/dept/hostel/complaints", icon: ClassgridLogoIcon },
          { label: "Mess Menu", to: "/dept/hostel/mess", icon: UtensilsCrossed },
          { label: "Grid", to: "/chat", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/join-requests", icon: Users }
        ]
      },
      {
        label: "TRANSPORT",
        items: [
          { label: "Routes & Buses", to: "/dept/transport/routes", icon: Bus },
          { label: "Passengers", to: "/dept/transport/passengers", icon: Users },
          { label: "Fee Collection", to: "/dept/transport/fees", icon: CreditCard },
          { label: "Website CMS", to: "/dept/transport/website", icon: Globe },
          { label: "Audit", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "Warden",
      subtitle: "Hostel Dept",
      menuItems: createDefaultMenuItems("/dept/hostel")
    }
  },

  // ───────────────────────────────────────────────
  // 10. FACULTY
  // ───────────────────────────────────────────────
  {
    role: "faculty",
    logo: "Classgrid",
    sections: [
      {
        label: "CORE",
        items: [
          { label: "Classrooms", to: "/classrooms", icon: Home },
          { label: "Discover", to: "/discover", icon: Compass },
          { label: "Work", to: "/work", icon: BookOpen },
          { label: "Schedule", to: "/tools", icon: Calendar }
        ]
      },
      {
        label: "CONNECT",
        items: [
          { label: "Messages", to: "/chat", icon: MessageSquare, badge: 2 },
          { label: "Notifications", to: "/notifications", icon: Bell, badge: 3 },
          { label: "Forum", to: "/forum", icon: Users }
        ]
      },
      {
        label: "TOOLS",
        items: [
          { label: "Google Drive", to: "/drive", icon: Briefcase },
          { label: "Virtual ID", to: "/virtual-id", icon: User },
          { label: "Website CMS", to: "/faculty/website", icon: Globe }
        ]
      },
      {
        items: [
          { label: "Requests", to: "/join-requests", icon: Users, badge: 5 },
          { label: "What's New", to: "/whats-new", icon: Sparkles },
          { label: "Organization", to: "/organization", icon: Building2 },
          { label: "Platform Feedback", to: "/platform-feedback", icon: ClassgridLogoIcon },
          { label: "Marketplace", to: "/marketplace", icon: CreditCard },
          { label: "Audit", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "Nikhil",
      subtitle: "Faculty",
      menuItems: createDefaultMenuItems()
    }
  },

  // ───────────────────────────────────────────────
  // 11. STUDENT
  // ───────────────────────────────────────────────
  {
    role: "student",
    logo: "Classgrid",
    sections: [
      {
        label: "CORE",
        items: [
          { label: "Classrooms", to: "/classrooms", icon: Home },
          { label: "Discover", to: "/discover", icon: Compass },
          { label: "Work", to: "/student/work", icon: BookOpen },
          { label: "Schedule", to: "/tools", icon: Calendar }
        ]
      },
      {
        label: "CONNECT",
        items: [
          { label: "Messages", to: "/chat", icon: MessageSquare, badge: 2 },
          { label: "Notifications", to: "/notifications", icon: Bell, badge: 3 },
          { label: "Forum", to: "/forum", icon: Users }
        ]
      },
      {
        label: "TOOLS",
        items: [
          { label: "Virtual ID", to: "/virtual-id", icon: User },
          { label: "Marketplace", to: "/marketplace", icon: CreditCard }
        ]
      },
      {
        items: [
          { label: "My Requests", to: "/my-requests", icon: ClipboardList },
          { label: "What's New", to: "/whats-new", icon: Sparkles },
          { label: "Organization", to: "/organization", icon: Building2 },
          { label: "Platform Feedback", to: "/platform-feedback", icon: ClassgridLogoIcon },
          { label: "Audit", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "Rahul",
      subtitle: "Student",
      menuItems: createDefaultMenuItems("/student")
    }
  },

  // ───────────────────────────────────────────────
  // 12. PUBLIC CHAT
  // ───────────────────────────────────────────────
  {
    role: "public_chat",
    logo: "Classgrid",
    sections: [
      {
        label: "AI Platform",
        items: [
          { label: "Agent", to: "/agent", icon: Play },
          { label: "Grids", to: "/agent/chat", icon: ClassgridLogoIcon },
          { label: "Requests", to: "/requests", icon: Users },
          { label: "Audit Logs", to: "/audit", icon: Shield }
        ]
      }
    ],
    identity: {
      name: "User",
      subtitle: "AI Member",
      menuItems: createDefaultMenuItems("/agent")
    }
  }
];

export const defaultTitlesByRole: Record<DashboardRole, string> = {
  super_admin: "Agent",
  org_admin: "Agent",
  admission_dept: "Agent",
  fees_dept: "Agent",
  exam_dept: "Agent",
  library_dept: "Agent",
  attendance_dept: "Agent",
  hr_dept: "Agent",
  hostel_dept: "Agent",
  faculty: "Agent",
  student: "Agent",
  public_chat: "Agent"
};

export function resolveDashboardConfig(pathname: string): DashboardConfig {
  const hostname = window.location.hostname;
  const subdomain = hostname.split(".")[0];
  if (subdomain === "chat") {
    return dashboardConfigs[11]!;
  }

  if (pathname.startsWith("/superadmin") || pathname.startsWith("/super-admin")) {
    return dashboardConfigs[0]!;
  }
  if (pathname.startsWith("/org")) {
    return dashboardConfigs[1]!;
  }
  if (pathname.startsWith("/dept/admissions")) {
    return dashboardConfigs[2]!;
  }
  if (pathname.startsWith("/dept/fees")) {
    return dashboardConfigs[3]!;
  }
  if (pathname.startsWith("/dept/exams")) {
    return dashboardConfigs[4]!;
  }
  if (pathname.startsWith("/dept/library")) {
    return dashboardConfigs[5]!;
  }
  if (pathname.startsWith("/dept/attendance")) {
    return dashboardConfigs[6]!;
  }
  if (pathname.startsWith("/dept/hr")) {
    return dashboardConfigs[7]!;
  }
  if (pathname.startsWith("/dept/hostel") || pathname.startsWith("/dept/transport")) {
    return dashboardConfigs[8]!;
  }
  if (pathname.startsWith("/student")) {
    return dashboardConfigs[10]!;
  }
  return dashboardConfigs[9]!;
}

export function resolveSidebarItem(pathname: string): SidebarItem | undefined {
  const config = resolveDashboardConfig(pathname);

  for (const section of config.sections) {
    const item = section.items.find((item) => {
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        return true;
      }
      if (item.hasNestedNav) {
        // Match up to the parent directory (e.g., /superadmin/storage for /superadmin/storage/files)
        const parentPath = item.to.substring(0, item.to.lastIndexOf('/'));
        if (pathname.startsWith(`${parentPath}/`)) {
          return true;
        }
      }
      return false;
    });

    if (item) {
      return item;
    }
  }

  return undefined;
}

export function resolveDashboardPageTitle(pathname: string): string {
  // Specific overrides requested for nested modules
  if (pathname.includes("/storage/notes")) return "Super Admin Notes";
  if (pathname.includes("/storage/s3")) return "S3 Configuration";

  const matchedItem = resolveSidebarItem(pathname);

  if (matchedItem) {
    if (matchedItem.hasNestedNav) {
      // Auto-format the last path segment (e.g., /storage/analytics -> "Analytics")
      const segments = pathname.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && lastSegment !== matchedItem.to.split('/').pop()) {
         return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, " ");
      }
    }
    return matchedItem.label;
  }
  // Fallbacks for global non-sidebar pages
  if (pathname.endsWith("/settings")) return "Settings";
  if (pathname.endsWith("/profile")) return "Profile";
  if (pathname.endsWith("/notifications")) return "Notifications";
  
  return defaultTitlesByRole[resolveDashboardConfig(pathname).role];
}
