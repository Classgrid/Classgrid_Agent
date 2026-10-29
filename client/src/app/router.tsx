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

/**
 * ==============================================================================
 * 🛑 AI AGENT WARNING: DO NOT MODIFY THE 5 LOGIN PAGES ROUTING 🛑
 * ==============================================================================
 * This application intentionally uses 5 distinct login pages:
 * 1. SuperAdminLoginPage.tsx (Super Admin)
 * 2. ClassgridSubdomainUserLoginPage.tsx (Subdomain Users)
 * 3. ClassgridSubdomainAdminLoginPage.tsx (Subdomain Admins)
 * 4. CustomDomainUserLoginPage.tsx (Custom Domain Users)
 * 5. CustomDomainAdminLoginPage.tsx (Custom Domain Admins)
 * 
 * DO NOT attempt to "simplify" or consolidate these login routes.
 * DO NOT overwrite the dynamic subdomain routing logic.
 * ==============================================================================
 */
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

function NavigateWithQuery({ to, replace }: { to: string, replace?: boolean }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace={replace} />;
}

import { DashboardHomePage } from "@/features/superadmin/pages/DashboardHomePage";
import { ProjectModePage } from "@/features/superadmin/pages/ProjectModePage";
import { LeadsPage } from "@/features/superadmin/pages/LeadsPage";
import { LeadDetailsPage } from "@/features/superadmin/pages/LeadDetailsPage";
import { SupportTicketsPage } from "@/features/superadmin/pages/SupportTicketsPage";
import { ReviewsPage } from "@/features/superadmin/pages/ReviewsPage";
import { ChangelogPage } from "@/features/superadmin/pages/ChangelogPage";
import { ActivityLogPage } from "@/features/superadmin/pages/ActivityLogPage";
import { ConfigPage } from "@/features/superadmin/pages/ConfigPage";
import { UsersPage } from "@/features/superadmin/pages/UsersPage";
import { GlobalUsersPage } from "@/features/superadmin/pages/GlobalUsersPage";
import { UserDetailPage } from "@/features/superadmin/pages/UserDetailPage";
import { GdprPage } from "@/features/superadmin/pages/GdprPage";
import { BackupPage } from "@/features/superadmin/pages/BackupPage";
import { CustomDomainsPage } from "@/features/superadmin/pages/CustomDomainsPage";
import { AuditLogsPage } from "@/features/superadmin/pages/AuditLogsPage";
import { SuperadminChatAnalyticsPage } from "@/features/superadmin/pages/SuperadminChatAnalyticsPage";
import { TeamPage } from "@/features/superadmin/pages/TeamPage";
import { BillingPage } from "@/features/superadmin/pages/BillingPage"; // Original, may be repurposed
import PlansAndBillingPage from "@/features/superadmin/billing/pages/PlansAndBillingPage";
import RevenuePage from "@/features/superadmin/billing/pages/RevenuePage";
import { FeedbackPage } from "@/features/superadmin/pages/FeedbackPage";
import { SubscribersPage } from "@/features/superadmin/pages/SubscribersPage";
import { SubscriberDetailsPage } from "@/features/superadmin/pages/SubscriberDetailsPage";
import { ChatPage } from "@/features/chat/pages/ChatPage";
import { LogoutPage } from "@/features/auth/pages/LogoutPage";
import { SystemHealthPage } from "@/features/superadmin/pages/SystemHealthPage";
import { FeatureFlagsPage } from "@/features/superadmin/pages/FeatureFlagsPage";
import TransactionsPage from "@/features/superadmin/billing/pages/TransactionsPage";
import TransactionDetailsPage from "@/features/superadmin/billing/pages/TransactionDetailsPage";
import FailedPaymentsPage from "@/features/superadmin/billing/pages/FailedPaymentsPage";
import FraudLogsPage from "@/features/superadmin/billing/pages/FraudLogsPage";
import FailedPaymentDetailsPage from "@/features/superadmin/billing/pages/FailedPaymentDetailsPage";
import { BillingShell } from "@/features/superadmin/billing/components/shared/BillingShell";
import { RollbackPage } from "@/features/superadmin/pages/RollbackPage";
import { ContentModerationPage } from "@/features/superadmin/pages/ContentModerationPage";
import { NotificationEnginePage } from "@/features/superadmin/pages/NotificationEnginePage";
import { OrganizationsPage } from "@/features/superadmin/pages/OrganizationsPage";

import { OrgDetailsPage } from "@/features/superadmin/pages/OrgDetailsPage";
import { OrgHierarchyPage } from "@/features/superadmin/pages/OrgHierarchyPage";
import { OrgFacultyPage } from "@/features/superadmin/pages/OrgFacultyPage";
import { OrgStudentsPage } from "@/features/superadmin/pages/OrgStudentsPage";
import { OrgFeesPage } from "@/features/superadmin/pages/OrgFeesPage";
import { OrgAdmissionsPage } from "@/features/superadmin/pages/OrgAdmissionsPage";
import { PlatformAnnouncementsPage } from "@/features/superadmin/pages/PlatformAnnouncementsPage";
import { SharedChatPage } from "@/features/shared/pages/SharedChatPage";
import { GridJoinPage } from "@/components/ai/components/share-grid/GridJoinPage";
import { SharedProfilePage } from "@/features/shared/pages/SharedProfilePage";
import { AgentProfilePage } from "@/features/public-chat/pages/AgentProfilePage";


import SandboxProfilePage from "@/features/shared/pages/SandboxProfilePage";
import DateTimePickerSandbox from "@/features/sandbox/pages/DateTimePickerSandbox";
import { SandboxPage } from "@/features/superadmin/pages/SandboxPage";
import { AgentUISandboxPage } from "@/features/superadmin/pages/AgentUISandboxPage";
import { AgentUITestingPage } from "@/features/superadmin/pages/AgentUITestingPage";
import { SimulatedAgentDemoPage } from "@/features/superadmin/pages/SimulatedAgentDemoPage";
import { PublicChatLoginPage } from "@/features/public-chat/pages/PublicChatLoginPage";
import { StorageLayout } from "@/components/layout/StorageLayout";
import { StorageFilesPage } from "@/features/superadmin/pages/StorageFilesPage";
import { StorageAnalyticsPage } from "@/features/superadmin/pages/StorageAnalyticsPage";
import { StorageS3ConfigPage } from "@/features/superadmin/pages/StorageS3ConfigPage";
import { NotesPage } from "@/features/superadmin/pages/NotesPage";
import { SharedSettingsPage } from "@/features/shared/pages/SharedSettingsPage";
import { JoinRequestPage } from "@/features/chat/pages/JoinRequestPage";
import { GroupAuditLogsPage } from "@/features/chat/pages/GroupAuditLogsPage";
import { ChatAnalyticsPage } from "@/features/chat/pages/ChatAnalyticsPage";
import { CheckoutPage } from "@/features/billing-portal/pages/CheckoutPage";
import { StudentBillingPortalPage } from "@/features/billing-portal/pages/StudentBillingPortalPage";
import { GenericPage } from "@/features/system/pages/GenericPage";
import { GlobeDemoPage } from "@/features/system/pages/GlobeDemoPage";
import { NotFoundPage } from "@/features/system/pages/NotFoundPage";

import { SuperAdminLoginPage } from "@/features/auth/pages/SuperAdminLoginPage";
import { TestFullScreenLoginPage } from "@/features/auth/pages/TestFullScreenLoginPage";


import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { RequiredPasswordResetPage } from "@/features/auth/pages/RequiredPasswordResetPage";
import { OAuthConsentPage } from "@/features/oauth/pages/OAuthConsentPage";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { getRedirectPath } from "@/features/auth/auth-helpers";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";

import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { DynamicRoleLayout } from "@/components/layout/DynamicRoleLayout";
import { AgentReviewsPage } from "@/features/superadmin/pages/AgentReviewsPage";
import { AiUsageDashboardPage } from "@/features/superadmin/pages/AiUsageDashboardPage";
import { PlaygroundPage } from "@/features/superadmin/pages/PlaygroundPage";



export function AppRouter() {
  // ── SUBDOMAIN DETECTION ──
  const hostname = window.location.hostname;
  const isCustomDomain =
    hostname !== "localhost" &&
    hostname !== "classgrid.in" &&
    !hostname.endsWith(".classgrid.in");
  const subdomain = hostname.split(".")[0];
  // "Ask Classgrid" links (chat.classgrid.in/?q=...) fill the message box: kept for the chat page, also across a login
  try {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) sessionStorage.setItem("classgrid:pendingPrompt", q);
  } catch { /* storage blocked: the link just opens the chat */ }
  // Only chat.classgrid.in (Classgrid AI) and the staff/billing addresses are live: every other *.classgrid.in
  // address (old school subdomains, typos) goes to chat.classgrid.in, same page
  const LIVE_SUBDOMAINS = ["chat", "superadmin", "billing", "studentbilling", "onboard", "onboarding"];
  if (hostname.endsWith(".classgrid.in") && !LIVE_SUBDOMAINS.includes(subdomain)) {
    window.location.replace(`https://chat.classgrid.in${window.location.pathname}${window.location.search}${window.location.hash}`);
    return null;
  }
  const isSuperAdmin = subdomain === "superadmin";
  const isOnboarding = subdomain === "onboard" || subdomain === "onboarding" || window.location.pathname.startsWith("/onboard");
  const isBilling = subdomain === "billing" || subdomain === "studentbilling" || window.location.pathname.startsWith("/checkout");

  if (isOnboarding) {
    return (
      <Routes>
        <Route path="/*" element={<NotFoundPage />} />
      </Routes>
    );
  }

  if (isBilling) {
    return (
      <Routes>
        <Route path="/" element={<NavigateWithQuery to="/checkout" replace />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="*" element={<NavigateWithQuery to="/checkout" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/test-full-login" element={<TestFullScreenLoginPage />} />
      <Route path="/sandbox-profile" element={<SandboxProfilePage />} />
      <Route path="/sandbox/datetime" element={<DateTimePickerSandbox />} />
      <Route path="/agent-sandbox" element={<AgentUISandboxPage />} />
      <Route path="/agent-sandbox-testing" element={<AgentUITestingPage />} />
      <Route path="/agent-simulation-demo" element={<SimulatedAgentDemoPage />} />
      <Route path="/public-chat-login" element={<PublicChatLoginPage />} />
      {/* Local dev only: look at the OAuth consent screen with sample data */}
      {import.meta.env.DEV && <Route path="/oauth/preview" element={<OAuthConsentPage preview />} />}

      <Route path="/logout" element={<LogoutPage />} />
      {/* ── DYNAMIC AUTH ROUTES (Based on Subdomain) ── */}
      <Route
        path="/login"
        element={
          isSuperAdmin ? <SuperAdminLoginPage /> : <PublicChatLoginPage />
        }
      />
      {/* ── Department-specific login portals ── */}
      <Route path="/superadmin" element={<SuperAdminLoginPage />} />
      <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />



      {/* TODO: Build ForgotPasswordPage */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/activate" element={<ResetPasswordPage />} />
      <Route path="/demo/globe" element={<GlobeDemoPage />} />

      {/* ── CANDIDATE PORTAL ROUTES ── */}

      {/* ── DASHBOARD ROUTES ── */}
      <Route element={<RequireAuth />}>
        <Route path="/required-password-reset" element={<RequiredPasswordResetPage />} />
        <Route path="/oauth/authorize" element={<OAuthConsentPage />} />


        {/* NEW SUPER ADMIN SHELL */}
        <Route element={<SuperAdminLayout />}>
          <Route path="/superadmin/dashboard" element={<NavigateWithQuery to="/superadmin/agent" replace />} />
          <Route path="/superadmin/agent" element={<DashboardHomePage />} />
          <Route path="/superadmin/project" element={<ProjectModePage />} />
          <Route path="/superadmin/project/:sessionId" element={<ProjectModePage />} />
          <Route path="/superadmin/agent/:sessionId" element={<DashboardHomePage />} />
          <Route path="/superadmin/agent/:sessionId/*" element={<DashboardHomePage />} />
          <Route path="/superadmin/agent-reviews" element={<AgentReviewsPage />} />
          <Route path="/superadmin/ai-usage" element={<AiUsageDashboardPage />} />
          <Route path="/superadmin/playground" element={<PlaygroundPage />} />
          <Route path="/superadmin/analytics" element={<SuperadminChatAnalyticsPage />} />
          <Route path="/superadmin/audit-logs" element={<AuditLogsPage />} />

          <Route path="/superadmin/orgs" element={<OrganizationsPage />} />
          <Route path="/superadmin/domains" element={<CustomDomainsPage />} />
          <Route path="/superadmin/detail/:orgId" element={<OrgDetailsPage />} />
          <Route path="/superadmin/detail/:id/hierarchy" element={<OrgHierarchyPage />} />
          <Route path="/superadmin/detail/:id/staff" element={<OrgFacultyPage />} />
          <Route path="/superadmin/detail/:id/students" element={<OrgStudentsPage />} />
          <Route path="/superadmin/detail/:id/fees" element={<OrgFeesPage />} />
          <Route path="/superadmin/detail/:id/admission" element={<OrgAdmissionsPage />} />
          <Route path="/superadmin/leads" element={<LeadsPage />} />
          <Route path="/superadmin/leads/:id" element={<LeadDetailsPage />} />
          {/* NEW BILLING ROUTES */}
          <Route path="/super-admin/billing" element={<BillingShell />}>
            <Route index element={<NavigateWithQuery to="/super-admin/billing/plans" replace />} />
            <Route path="plans" element={<PlansAndBillingPage />} />
            <Route path="revenue" element={<RevenuePage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="transactions/:id" element={<TransactionDetailsPage />} />
            <Route path="failed-payments" element={<FailedPaymentsPage />} />
            <Route path="failed-payments/:id" element={<FailedPaymentDetailsPage />} />
            <Route path="fraud-logs" element={<FraudLogsPage />} />
          </Route>
          <Route path="/superadmin/billing" element={<NavigateWithQuery to="/super-admin/billing/plans" replace />} />
          <Route path="/superadmin/billing/plans" element={<NavigateWithQuery to="/super-admin/billing/plans" replace />} />
          <Route path="/superadmin/billing/revenue" element={<NavigateWithQuery to="/super-admin/billing/revenue" replace />} />
          <Route path="/superadmin/billing/transactions" element={<NavigateWithQuery to="/super-admin/billing/transactions" replace />} />
          <Route path="/superadmin/billing/failed-payments" element={<NavigateWithQuery to="/super-admin/billing/failed-payments" replace />} />

          {/* LEGACY REDIRECTS (if users visit the old URLs) */}
          <Route path="/superadmin/revenue" element={<NavigateWithQuery to="/super-admin/billing/revenue" replace />} />
          <Route path="/superadmin/transactions" element={<NavigateWithQuery to="/super-admin/billing/transactions" replace />} />
          <Route path="/superadmin/failed-payments" element={<NavigateWithQuery to="/super-admin/billing/failed-payments" replace />} />
          <Route path="/superadmin/users" element={<UsersPage />} />
          <Route path="/superadmin/global-users" element={<GlobalUsersPage />} />
          <Route path="/superadmin/global-users/:userId" element={<UserDetailPage />} />
          <Route path="/superadmin/activity-log" element={<ActivityLogPage />} />
          <Route path="/superadmin/announcements" element={<PlatformAnnouncementsPage />} />
          <Route path="/superadmin/config" element={<ConfigPage />} />
          <Route path="/superadmin/support" element={<SupportTicketsPage />} />
          <Route path="/superadmin/support/:id" element={<SupportTicketsPage />} />
          {/* Support for email links so they auto-open the chat and assign */}
          <Route path="/superadmin/support/view/:id" element={<SupportTicketsPage />} />
          <Route path="/superadmin/feedback" element={<FeedbackPage />} />
          <Route path="/superadmin/reviews" element={<ReviewsPage />} />
          <Route path="/superadmin/talk" element={<NavigateWithQuery to="/superadmin/support" replace />} />
          <Route path="/superadmin/classgrid-talk" element={<NavigateWithQuery to="/superadmin/support" replace />} />
          <Route path="/superadmin/system-health" element={<SystemHealthPage />} />
          <Route path="/superadmin/feature-flags" element={<FeatureFlagsPage />} />
          <Route path="/superadmin/content-moderation" element={<ContentModerationPage />} />
          <Route path="/superadmin/notification-engine" element={<NotificationEnginePage />} />
          <Route path="/superadmin/sandbox" element={<SandboxPage />} />
          <Route path="/superadmin/team" element={<TeamPage />} />
          <Route path="/superadmin/gdpr" element={<GdprPage />} />
          <Route path="/superadmin/backup" element={<BackupPage />} />
          <Route path="/superadmin/profile" element={<SharedProfilePage />} />
          <Route path="/superadmin/settings" element={<SharedSettingsPage />} />
          <Route path="/superadmin/chat" element={<ChatPage />} />
          <Route path="/superadmin/subscribers" element={<SubscribersPage />} />
          <Route path="/superadmin/subscribers/:email" element={<SubscriberDetailsPage />} />


          <Route path="/superadmin/organizations" element={<NavigateWithQuery to="/superadmin/orgs" replace />} />
          <Route path="/superadmin/*" element={<NavigateWithQuery to="/superadmin/dashboard" replace />} />
        </Route>

        {/* VERCEL STYLE SUPER ADMIN STORAGE SHELL */}
        <Route path="/superadmin/storage" element={<StorageLayout />}>
          <Route index element={<NavigateWithQuery to="files" replace />} />
          <Route path="files" element={<StorageFilesPage />} />
          <Route path="analytics" element={<StorageAnalyticsPage />} />
          <Route path="s3" element={<StorageS3ConfigPage />} />
          <Route path="notes" element={<NotesPage />} />
        </Route>


        <Route path="/" element={<DefaultDashboardRedirect />} />

        {/* ── DYNAMIC ROLE LAYOUT (Wraps all 10 Dept Dashboards & Common Pages) ── */}
        <Route element={<DynamicRoleLayout />}>
          {/* PUBLIC CHAT DASHBOARD */}
          <Route path="/agent" element={<DashboardHomePage />} />
          <Route path="/agent/:sessionId" element={<DashboardHomePage />} />
          <Route path="/agent/:sessionId/*" element={<DashboardHomePage />} />
          <Route path="/c/agent" element={<DashboardHomePage />} />
          <Route path="/c/project" element={<ProjectModePage />} />
          <Route path="/c/project/:sessionId" element={<ProjectModePage />} />
          <Route path="/c/agent/:sessionId" element={<DashboardHomePage />} />
          <Route path="/c/agent/:sessionId/*" element={<DashboardHomePage />} />
          <Route path="/c" element={<DashboardHomePage />} />
          <Route path="/c/:sessionId" element={<DashboardHomePage />} />
          <Route path="/c/:sessionId/*" element={<DashboardHomePage />} />
          <Route path="/agent/chat" element={<ChatPage />} />
          <Route path="/requests" element={<JoinRequestPage />} />
          <Route path="/requests/:groupId" element={<JoinRequestPage />} />
          <Route path="/agent/profile" element={<SharedProfilePage />} />
          <Route path="/agent/settings" element={<SharedSettingsPage />} />
          {/* Website CMS */}

          {/* 3. Admissions Department Dashboard */}

          {/* 4. Fees Department Dashboard */}

          {/* 5. Examination Department Dashboard */}

          {/* 6. Library Department Dashboard */}

          {/* 7. Attendance Department Dashboard */}

          {/* 8. HR & Payroll Department Dashboard */}

          {/* 9. Hostel & Transport Dashboard */}

          {/* 10. Faculty Dashboard */}

          {/* 11. Student Dashboard */}

          {/* ── Common pages ── */}
          <Route path="/tools" element={<GenericPage title="Schedule" />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/notifications" element={<GenericPage title="Notifications" />} />
          <Route path="/forum" element={<GenericPage title="Forum" />} />
          <Route path="/classgrid-ai" element={<GenericPage title="Classgrid AI" />} />
          <Route path="/drive" element={<GenericPage title="Google Drive" />} />
          <Route path="/virtual-id" element={<GenericPage title="Virtual ID" />} />
          <Route path="/join-requests/:groupId" element={<JoinRequestPage />} />
          <Route path="/join-requests" element={<JoinRequestPage />} />
          <Route path="/whats-new" element={<GenericPage title="What's New" />} />
          <Route path="/organization" element={<GenericPage title="Organization" />} />
          <Route path="/platform-feedback" element={<GenericPage title="Platform Feedback" />} />
          <Route path="/marketplace" element={<GenericPage title="Marketplace" />} />
          <Route path="/my-requests" element={<JoinRequestPage />} />
            {/* chat.classgrid.in: group audit logs & analytics */}
            <Route path="/analytics" element={typeof window !== "undefined" && window.location.hostname.startsWith("chat.") ? <ChatAnalyticsPage /> : <Navigate to="/dashboard" />} />
            <Route path="/audit" element={typeof window !== "undefined" && window.location.hostname.startsWith("chat.") ? <GroupAuditLogsPage /> : <NotFoundPage />} />
          <Route path="profile" element={<SharedProfilePage />} />
          <Route path="settings" element={<SharedSettingsPage />} />

          {/* ── Wildcard sub-routes ── */}
          <Route path="/dept/admissions/*" element={<GenericPage title="Admissions Module" />} />
          <Route path="/dept/fees/*" element={<GenericPage title="Fees Module" />} />
          <Route path="/dept/exams/*" element={<GenericPage title="Examination Module" />} />
          <Route path="/dept/library/*" element={<GenericPage title="Library Module" />} />
          <Route path="/dept/attendance/*" element={<GenericPage title="Attendance Module" />} />
          <Route path="/dept/hr/*" element={<GenericPage title="HR & Payroll Module" />} />
          <Route path="/dept/hostel/*" element={<GenericPage title="Hostel & Transport Module" />} />
          <Route path="/dept/transport/*" element={<GenericPage title="Transport Module" />} />
          <Route path="/student/*" element={<GenericPage title="Student Module" />} />
        </Route>
      </Route>
      {/* Old /work links go to /agent */}
      <Route path="/work/*" element={<Navigate to="/agent" replace />} />
      <Route path="*" element={<NotFoundPage />} />

      {/* Public shared chat viewer (no auth required) */}
      <Route path="/shared/:shareId" element={<SharedChatPage />} />
      {/* Share Grid invite (checks login itself, so a signed-out visitor sees the invite first) */}
      <Route path="/grid/join/:token" element={<GridJoinPage />} />
    </Routes>
  );
}

function DefaultDashboardRedirect() {
  const { data: user } = useCurrentUser();

  // (Removed ERP Domain Guard to allow Admins to use the ERP domain)

  return <NavigateWithQuery to={getRedirectPath(user?.role)} replace />;
}

