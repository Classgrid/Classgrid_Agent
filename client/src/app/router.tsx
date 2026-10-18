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
import { CandidatePortalPage } from "@/features/admission-portal/pages/CandidatePortalPage";
import { ParentTrackerPage } from "@/features/admission-portal/pages/ParentTrackerPage";

import { DashboardHomePage } from "@/features/superadmin/pages/DashboardHomePage";
import { ProjectModePage } from "@/features/superadmin/pages/ProjectModePage";
import { OrgAdminDashboard } from "@/features/org-admin/components/OrgAdminDashboard";
import { UsagePage } from "@/features/org-admin/pages/UsagePage";
import { BillingPage as OrgAdminBillingPage } from "@/features/org-admin/pages/BillingPage";
import { MembersPage } from "@/features/org-admin/pages/MembersPage";
import { AcademicSetupPage } from "@/features/org-admin/pages/AcademicSetupPage";
import { StudentImportPage } from "@/features/org-admin/pages/StudentImportPage";
import { FacultyImportPage } from "@/features/org-admin/pages/FacultyImportPage";
import { LeadsPage } from "@/features/superadmin/pages/LeadsPage";
import { LeadDetailsPage } from "@/features/superadmin/pages/LeadDetailsPage";
import { SupportTicketsPage } from "@/features/superadmin/pages/SupportTicketsPage";
import { ReviewsPage } from "@/features/superadmin/pages/ReviewsPage";
import { ChangelogPage } from "@/features/superadmin/pages/ChangelogPage";
import { AuditPage } from "@/features/superadmin/pages/AuditPage";
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
import { ClassgridTalkPage } from "@/features/superadmin/pages/ClassgridTalkPage";
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
import { ClassroomsPage } from "@/features/classrooms/pages/ClassroomsPage";
import ClassroomDetailPage from "@/features/classrooms/pages/ClassroomDetailPage";
import { DiscoverClassroomsPage } from "@/features/classrooms/pages/DiscoverClassroomsPage";
import { WebsiteCMSPage } from "@/features/website_cms/pages/WebsiteCMSPage";
import { JoinRequestPage } from "@/features/chat/pages/JoinRequestPage";
import { GroupAuditLogsPage } from "@/features/chat/pages/GroupAuditLogsPage";
import { ChatAnalyticsPage } from "@/features/chat/pages/ChatAnalyticsPage";
import { OnboardingWizardPage } from "@/features/auth/pages/OnboardingWizardPage";
import NewRoleWelcomePage from "@/features/auth/pages/NewRoleWelcomePage";
import { CheckoutPage } from "@/features/billing-portal/pages/CheckoutPage";
import { StudentBillingPortalPage } from "@/features/billing-portal/pages/StudentBillingPortalPage";
import { StudentHomePage } from "@/features/student/pages/StudentHomePage";
import { StudentWorkPage } from "@/features/student/pages/StudentWorkPage";
import { FacultyHomePage } from "@/features/faculty/pages/FacultyHomePage";
import { FacultyWorkPage } from "@/features/faculty/pages/FacultyWorkPage";
import { AdmissionDashboardRouter } from "@/features/admissions/pages/AdmissionDashboardRouter";
import { AllApplicationsPage } from "@/features/admissions/pages/AllApplicationsPage";
import { ApplicationDetailsPage } from "@/features/admissions/pages/ApplicationDetailsPage";
import { DocumentVerificationPage } from "@/features/admissions/pages/DocumentVerificationPage";
import { MeritListPage } from "@/features/admissions/pages/MeritListPage"; // Keep old placeholder if I didn't build it
import { EnrollmentPage } from "@/features/admissions/pages/EnrollmentPage";
import { AdmissionConfigPage } from "@/features/admissions/pages/AdmissionConfigPage";
import { NewApplicationPage } from "@/features/admissions/pages/NewApplicationPage";
import { AdmissionSchedulePage } from "@/features/admissions/pages/AdmissionSchedulePage";
import { FeeStructurePage } from "@/features/admissions/pages/FeeStructurePage";
import AdmissionAnalyticsPage from "@/features/admissions/pages/AdmissionAnalyticsPage";
import { ExportDataPage } from "@/features/admissions/pages/ExportDataPage";
import { CETReportsPage } from "@/features/admissions/pages/CETReportsPage";
import { FormBuilderPage } from "@/features/admissions/pages/FormBuilderPage";
import { CETImportPage } from "@/features/admissions/pages/CETImportPage";
import { RLAReportingPage } from "@/features/admissions/pages/RLAReportingPage";
import { CAPUpgradePage } from "@/features/admissions/pages/CAPUpgradePage";
import { VacancyTrackerPage } from "@/features/admissions/pages/VacancyTrackerPage";
import { LeadTrackingPage } from "@/features/admissions/pages/LeadTrackingPage";
import { CommunicationPage } from "@/features/admissions/pages/CommunicationPage";
import { BulkSmsPage } from "@/features/admissions/pages/BulkSmsPage";
import { FeesDashboardRouter } from "@/features/fees/pages/FeesDashboardRouter";
import { ExamsDashboardRouter } from "@/features/exams/pages/ExamsDashboardRouter";
import { ResultsProcessingPage } from "@/features/results/pages/ResultsProcessingPage";
import { ResultsPage } from "@/features/results/pages/ResultsPage";
import { ExamGradingPage } from "@/features/exams/pages/ExamGradingPage";
import { LibraryDashboardRouter } from "@/features/library/pages/LibraryDashboardRouter";
import { AttendanceDashboardRouter } from "@/features/attendance/pages/AttendanceDashboardRouter";
import { HRDashboardRouter } from "@/features/hr/pages/HRDashboardRouter";
import { HostelDashboardPage } from "@/features/hostel/pages/HostelDashboardPage";
import { SupportPage } from "@/features/support/pages/SupportPage";
import { GenericPage } from "@/features/system/pages/GenericPage";
import { GlobeDemoPage } from "@/features/system/pages/GlobeDemoPage";
import { NotFoundPage } from "@/features/system/pages/NotFoundPage";

import { AdminLoginRouter } from "@/features/auth/pages/AdminLoginRouter";
import { UserLoginRouter } from "@/features/auth/pages/UserLoginRouter";
import { SuperAdminLoginPage } from "@/features/auth/pages/SuperAdminLoginPage";
import { TestFullScreenLoginPage } from "@/features/auth/pages/TestFullScreenLoginPage";


import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { RequiredPasswordResetPage } from "@/features/auth/pages/RequiredPasswordResetPage";
import { EnterOrganizationCodePage } from "@/features/auth/pages/EnterOrganizationCodePage";
import { OAuthConsentPage } from "@/features/oauth/pages/OAuthConsentPage";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { getRedirectPath, isInstitutionAdminRole } from "@/features/auth/auth-helpers";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";

import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { OrgAdminLayout } from "@/components/layout/OrgAdminLayout";
import { DynamicRoleLayout } from "@/components/layout/DynamicRoleLayout";
import { ComingSoonPage } from "@/features/system/pages/ComingSoonPage";
import { AgentReviewsPage } from "@/features/superadmin/pages/AgentReviewsPage";
import { AiUsageDashboardPage } from "@/features/superadmin/pages/AiUsageDashboardPage";
import { PlaygroundPage } from "@/features/superadmin/pages/PlaygroundPage";
import { PlatformHubPage } from "@/features/system/pages/PlatformHubPage";



export function AppRouter() {
  // ── SUBDOMAIN DETECTION ──
  const hostname = window.location.hostname;
  const isCustomDomain =
    hostname !== "localhost" &&
    hostname !== "classgrid.in" &&
    !hostname.endsWith(".classgrid.in");
  const subdomain = hostname.split(".")[0];
  const isSuperAdmin = subdomain === "superadmin";
  const isOnboarding = subdomain === "onboard" || subdomain === "onboarding" || window.location.pathname.startsWith("/onboard");
  const isBilling = subdomain === "billing" || subdomain === "studentbilling" || window.location.pathname.startsWith("/checkout");

  if (isOnboarding) {
    return (
      <Routes>
        <Route path="/*" element={<OnboardingWizardPage />} />
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
          subdomain === "chat" ? <PublicChatLoginPage /> : subdomain === "app"
            ? <PlatformHubPage />
            : (isSuperAdmin ? <SuperAdminLoginPage /> : <UserLoginRouter />)
        }
      />
      <Route path="/auth/user" element={<UserLoginRouter />} />
      <Route path="/student/login" element={<UserLoginRouter preferredRole="student" />} />
      <Route path="/faculty/login" element={<UserLoginRouter preferredRole="teacher" />} />
      <Route path="/admin-login" element={<AdminLoginRouter />} />
      <Route path="/admin/login" element={<AdminLoginRouter />} />
      <Route path="/org/login" element={<AdminLoginRouter />} />
      <Route path="/auth/admin" element={<AdminLoginRouter />} />
      {/* ── Department-specific login portals ── */}
      <Route path="/dept/admissions/login" element={<AdminLoginRouter />} />
      <Route path="/dept/fees/login" element={<AdminLoginRouter />} />
      <Route path="/dept/exams/login" element={<AdminLoginRouter />} />
      <Route path="/dept/attendance/login" element={<AdminLoginRouter />} />
      <Route path="/dept/hr/login" element={<AdminLoginRouter />} />
      <Route path="/dept/hostel/login" element={<AdminLoginRouter />} />
      <Route path="/dept/library/login" element={<AdminLoginRouter />} />
      <Route path="/superadmin" element={<SuperAdminLoginPage />} />
      <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />



      {/* TODO: Build ForgotPasswordPage */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/activate" element={<ResetPasswordPage />} />
      <Route path="/welcome-new-role" element={<NewRoleWelcomePage />} />
      <Route path="/demo/globe" element={<GlobeDemoPage />} />

      {/* ── CANDIDATE PORTAL ROUTES ── */}
      <Route path="/apply/:orgId" element={<CandidatePortalPage />} />
      <Route path="/parent/:orgId" element={<ParentTrackerPage />} />

      {/* ── DASHBOARD ROUTES ── */}
      <Route element={<RequireAuth />}>
        <Route path="/required-password-reset" element={<RequiredPasswordResetPage />} />
        <Route path="/enter-org-code" element={<EnterOrganizationCodePage />} />
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
          <Route path="/superadmin/talk" element={<ClassgridTalkPage />} />
          <Route path="/superadmin/classgrid-talk" element={<ClassgridTalkPage />} />
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

        {/* NEW ORG ADMIN SHELL */}
        <Route element={<OrgAdminLayout />}>
          <Route path="/org/admin/settings" element={<SharedSettingsPage />} />
          <Route path="/org/admin/profile" element={<SharedProfilePage />} />
          <Route path="/org/admin/chat" element={<ChatPage />} />
          <Route path="/org/website" element={<WebsiteCMSPage />} />
          <Route path="/org/audit" element={<AuditPage />} />
          <Route path="/org/admin/dashboard" element={<NavigateWithQuery to="/org/admin/agent" replace />} />
          <Route path="/org/admin/agent" element={<OrgAdminDashboard />} />
          <Route path="/org/admin/agent/:sessionId" element={<OrgAdminDashboard />} />
          <Route path="/org/admin/agent/:sessionId/*" element={<OrgAdminDashboard />} />
          <Route path="/org/admin/usage" element={<UsagePage />} />
          <Route path="/org/admin/billing" element={<OrgAdminBillingPage />} />
          <Route path="/org/admin/members" element={<MembersPage />} />
          <Route path="/org/admin/academic-setup" element={<AcademicSetupPage />} />
          <Route path="/org/admin/academics" element={<AcademicSetupPage />} />
          <Route path="/org/students" element={<StudentImportPage />} />
          <Route path="/org/faculty" element={<FacultyImportPage />} />
          <Route path="/org/classrooms" element={<ClassroomsPage />} />
          <Route path="/org/admin/*" element={<ComingSoonPage />} />
          <Route path="/org/*" element={<ComingSoonPage />} />

          {/* Legacy redirects for compatibility */}
          <Route path="/org/settings" element={<NavigateWithQuery to="/org/admin/settings" replace />} />
          <Route path="/org/profile" element={<NavigateWithQuery to="/org/admin/profile" replace />} />
          <Route path="/org/chat" element={<NavigateWithQuery to="/org/admin/chat" replace />} />
          <Route path="/org/dashboard" element={<NavigateWithQuery to="/org/admin/dashboard" replace />} />
        </Route>

        <Route path="/" element={<DefaultDashboardRedirect />} />
        <Route path="/admin/dashboard" element={<NavigateWithQuery to="/org/admin/dashboard" replace />} />

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
          <Route path="/dept/admissions/website" element={<WebsiteCMSPage />} />
          <Route path="/dept/fees/website" element={<WebsiteCMSPage />} />
          <Route path="/dept/exams/website" element={<WebsiteCMSPage />} />
          <Route path="/dept/library/website" element={<WebsiteCMSPage />} />
          <Route path="/dept/attendance/website" element={<WebsiteCMSPage />} />
          <Route path="/dept/hr/website" element={<WebsiteCMSPage />} />
          <Route path="/dept/transport/website" element={<WebsiteCMSPage />} />
          <Route path="/faculty/website" element={<WebsiteCMSPage />} />

          {/* 3. Admissions Department Dashboard */}
          <Route path="/dept/admissions/dashboard" element={<NavigateWithQuery to="/dept/admissions/agent" replace />} />
          <Route path="/dept/admissions/agent" element={<AdmissionDashboardRouter />} />
          <Route path="/dept/admissions/agent/:sessionId" element={<AdmissionDashboardRouter />} />
          <Route path="/dept/admissions/agent/:sessionId/*" element={<AdmissionDashboardRouter />} />
          <Route path="/dept/admissions/applications" element={<AllApplicationsPage />} />
          <Route path="/dept/admissions/applications/:id" element={<ApplicationDetailsPage />} />
          <Route path="/dept/admissions/new" element={<NewApplicationPage />} />
          <Route path="/dept/admissions/documents" element={<DocumentVerificationPage />} />
          <Route path="/dept/admissions/merit" element={<MeritListPage />} />
          <Route path="/dept/admissions/enroll" element={<EnrollmentPage />} />
          <Route path="/dept/admissions/config" element={<AdmissionConfigPage />} />
          <Route path="/dept/admissions/fees" element={<FeeStructurePage />} />
          <Route path="/dept/admissions/schedule" element={<AdmissionSchedulePage />} />
          <Route path="/dept/admissions/analytics" element={<AdmissionAnalyticsPage />} />
          <Route path="/dept/admissions/export" element={<ExportDataPage />} />
          <Route path="/dept/admissions/cet-dte" element={<CETReportsPage />} />
          <Route path="/dept/admissions/cet-import" element={<CETImportPage />} />
          <Route path="/dept/admissions/rla-reporting" element={<RLAReportingPage />} />
          <Route path="/dept/admissions/cap-upgrade" element={<CAPUpgradePage />} />
          <Route path="/dept/admissions/vacancy-tracker" element={<VacancyTrackerPage />} />
          <Route path="/dept/admissions/form-builder" element={<FormBuilderPage />} />
          <Route path="/dept/admissions/crm" element={<LeadTrackingPage />} />
          <Route path="/dept/admissions/comm" element={<CommunicationPage />} />
          <Route path="/dept/admissions/bulk" element={<BulkSmsPage />} />

          {/* 4. Fees Department Dashboard */}
          <Route path="/dept/fees/dashboard" element={<NavigateWithQuery to="/dept/fees/agent" replace />} />
          <Route path="/dept/fees/agent" element={<FeesDashboardRouter />} />
          <Route path="/dept/fees/agent/:sessionId" element={<FeesDashboardRouter />} />
          <Route path="/dept/fees/agent/:sessionId/*" element={<FeesDashboardRouter />} />

          {/* 5. Examination Department Dashboard */}
          <Route path="/dept/exams/dashboard" element={<NavigateWithQuery to="/dept/exams/agent" replace />} />
          <Route path="/dept/exams/agent" element={<ExamsDashboardRouter />} />
          <Route path="/dept/exams/agent/:sessionId" element={<ExamsDashboardRouter />} />
          <Route path="/dept/exams/agent/:sessionId/*" element={<ExamsDashboardRouter />} />
          <Route path="/dept/exams/results" element={<ResultsProcessingPage />} />

          {/* 6. Library Department Dashboard */}
          <Route path="/dept/library/dashboard" element={<NavigateWithQuery to="/dept/library/agent" replace />} />
          <Route path="/dept/library/agent" element={<LibraryDashboardRouter />} />
          <Route path="/dept/library/agent/:sessionId" element={<LibraryDashboardRouter />} />
          <Route path="/dept/library/agent/:sessionId/*" element={<LibraryDashboardRouter />} />

          {/* 7. Attendance Department Dashboard */}
          <Route path="/dept/attendance/dashboard" element={<NavigateWithQuery to="/dept/attendance/agent" replace />} />
          <Route path="/dept/attendance/agent" element={<AttendanceDashboardRouter />} />
          <Route path="/dept/attendance/agent/:sessionId" element={<AttendanceDashboardRouter />} />
          <Route path="/dept/attendance/agent/:sessionId/*" element={<AttendanceDashboardRouter />} />

          {/* 8. HR & Payroll Department Dashboard */}
          <Route path="/dept/hr/dashboard" element={<NavigateWithQuery to="/dept/hr/agent" replace />} />
          <Route path="/dept/hr/agent" element={<HRDashboardRouter />} />
          <Route path="/dept/hr/agent/:sessionId" element={<HRDashboardRouter />} />
          <Route path="/dept/hr/agent/:sessionId/*" element={<HRDashboardRouter />} />

          {/* 9. Hostel & Transport Dashboard */}
          <Route path="/dept/hostel/dashboard" element={<NavigateWithQuery to="/dept/hostel/agent" replace />} />
          <Route path="/dept/hostel/agent" element={<HostelDashboardPage />} />
          <Route path="/dept/hostel/agent/:sessionId" element={<HostelDashboardPage />} />
          <Route path="/dept/hostel/agent/:sessionId/*" element={<HostelDashboardPage />} />

          {/* 10. Faculty Dashboard */}
          <Route path="/faculty/dashboard" element={<NavigateWithQuery to="/faculty/agent" replace />} />
          <Route path="/faculty/agent" element={<FacultyHomePage />} />
          <Route path="/faculty/agent/:sessionId" element={<FacultyHomePage />} />
          <Route path="/faculty/agent/:sessionId/*" element={<FacultyHomePage />} />
          <Route path="/faculty/work" element={<FacultyWorkPage />} />
          <Route path="/exam/grading" element={<ExamGradingPage />} />

          {/* 11. Student Dashboard */}
          <Route path="/student/dashboard" element={<NavigateWithQuery to="/student/agent" replace />} />
          <Route path="/student/agent" element={<StudentHomePage />} />
          <Route path="/student/agent/:sessionId" element={<StudentHomePage />} />
          <Route path="/student/agent/:sessionId/*" element={<StudentHomePage />} />
          <Route path="/student/work" element={<StudentWorkPage />} />

          {/* ── Common pages ── */}
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/classroom" element={<ClassroomsPage />} />
          <Route path="/classroom/:id" element={<ClassroomDetailPage />} />
          <Route path="/classrooms" element={<ClassroomsPage />} />
          <Route path="/discover" element={<DiscoverClassroomsPage />} />
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
            <Route path="/audit" element={typeof window !== "undefined" && window.location.hostname.startsWith("chat.") ? <GroupAuditLogsPage /> : <AuditPage />} />
          <Route path="profile" element={<SharedProfilePage />} />
          <Route path="settings" element={<SharedSettingsPage />} />
          <Route path="classrooms" element={<ClassroomsPage />} />
          <Route path="/support" element={<SupportPage />} />

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
      <Route path="*" element={<NotFoundPage />} />

      {/* Public shared chat viewer (no auth required) */}
      <Route path="/shared/:shareId" element={<SharedChatPage />} />
    </Routes>
  );
}

function DefaultDashboardRedirect() {
  const { data: user } = useCurrentUser();

  // (Removed ERP Domain Guard to allow Admins to use the ERP domain)

  return <NavigateWithQuery to={getRedirectPath(user?.role)} replace />;
}

